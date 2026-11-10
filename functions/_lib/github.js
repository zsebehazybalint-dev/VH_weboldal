// Vékony GitHub REST / Git Data API kliens.
// Minden írás a Git Data API-n megy (blob -> tree -> commit -> ref frissítés),
// így egy beküldés = PONTOSAN EGY atomi commit, és a `updateRef` hívásig
// semmi nem látható a repóban - részleges hiba esetén a main branch érintetlen marad.

const API = 'https://api.github.com';

export class GitHubError extends Error {
  constructor(message, status, body) {
    super(message);
    this.status = status;
    this.body = body;
  }
}

export class GitHubClient {
  constructor({ token, owner, repo, branch }) {
    if (!token) throw new Error('GITHUB_TOKEN hiányzik a környezeti változókból.');
    if (!owner || !repo) throw new Error('GITHUB_OWNER / GITHUB_REPO hiányzik a környezeti változókból.');
    this.token = token;
    this.owner = owner;
    this.repo = repo;
    this.branch = branch || 'main';
  }

  async _req(path, options = {}) {
    const res = await fetch(`${API}${path}`, {
      ...options,
      headers: {
        Authorization: `Bearer ${this.token}`,
        Accept: 'application/vnd.github+json',
        'X-GitHub-Api-Version': '2022-11-28',
        'User-Agent': 'vedelmihorizont-admin',
        ...(options.body ? { 'content-type': 'application/json' } : {}),
        ...(options.headers || {}),
      },
    });
    if (!res.ok) {
      let body;
      try { body = await res.json(); } catch { body = await res.text().catch(() => ''); }
      throw new GitHubError(
        `GitHub API hiba (${res.status}) ${path}: ${body && body.message ? body.message : JSON.stringify(body)}`,
        res.status,
        body
      );
    }
    return res.json();
  }

  // Egy fájl jelenlegi szöveges tartalma a megadott branchen (vagy null, ha nem létezik).
  async getFileText(path) {
    try {
      const data = await this._req(
        `/repos/${this.owner}/${this.repo}/contents/${encodeURI(path)}?ref=${encodeURIComponent(this.branch)}`
      );
      if (Array.isArray(data)) throw new Error(`${path} egy könyvtár, nem fájl.`);
      const bin = Uint8Array.from(atob(data.content.replace(/\n/g, '')), (c) => c.charCodeAt(0));
      return new TextDecoder('utf-8').decode(bin);
    } catch (e) {
      if (e instanceof GitHubError && e.status === 404) return null;
      throw e;
    }
  }

  // Egy könyvtár tartalmának fájlnevei (nem rekurzív).
  async listDir(path) {
    try {
      const data = await this._req(
        `/repos/${this.owner}/${this.repo}/contents/${encodeURI(path)}?ref=${encodeURIComponent(this.branch)}`
      );
      if (!Array.isArray(data)) return [];
      return data.map((it) => it.name);
    } catch (e) {
      if (e instanceof GitHubError && e.status === 404) return [];
      throw e;
    }
  }

  async getBranchRef() {
    return this._req(`/repos/${this.owner}/${this.repo}/git/ref/heads/${encodeURIComponent(this.branch)}`);
  }

  async getCommit(sha) {
    return this._req(`/repos/${this.owner}/${this.repo}/git/commits/${sha}`);
  }

  async createBlob(content, encoding) {
    return this._req(`/repos/${this.owner}/${this.repo}/git/blobs`, {
      method: 'POST',
      body: JSON.stringify({ content, encoding }),
    });
  }

  async createTree(baseTreeSha, entries) {
    return this._req(`/repos/${this.owner}/${this.repo}/git/trees`, {
      method: 'POST',
      body: JSON.stringify({ base_tree: baseTreeSha, tree: entries }),
    });
  }

  async createCommit(message, treeSha, parentSha) {
    return this._req(`/repos/${this.owner}/${this.repo}/git/commits`, {
      method: 'POST',
      body: JSON.stringify({ message, tree: treeSha, parents: [parentSha] }),
    });
  }

  async updateRef(sha) {
    return this._req(`/repos/${this.owner}/${this.repo}/git/refs/heads/${encodeURIComponent(this.branch)}`, {
      method: 'PATCH',
      body: JSON.stringify({ sha, force: false }),
    });
  }

  // files: [{ path, content: string|Uint8Array, encoding: 'utf-8' | 'base64' }]
  // Egyetlen atomi commit-ot csinál a megadott fájlokból (új és módosított fájlok egyaránt).
  async commitFiles(files, message) {
    const ref = await this.getBranchRef();
    const parentSha = ref.object.sha;
    const parentCommit = await this.getCommit(parentSha);
    const baseTreeSha = parentCommit.tree.sha;

    const entries = [];
    for (const f of files) {
      let blobContent, blobEncoding;
      if (f.encoding === 'base64') {
        blobContent = f.content; // már base64 string
        blobEncoding = 'base64';
      } else {
        blobContent = typeof f.content === 'string' ? f.content : new TextDecoder('utf-8').decode(f.content);
        blobEncoding = 'utf-8';
      }
      const blob = await this.createBlob(blobContent, blobEncoding);
      entries.push({ path: f.path, mode: '100644', type: 'blob', sha: blob.sha });
    }

    const newTree = await this.createTree(baseTreeSha, entries);
    const newCommit = await this.createCommit(message, newTree.sha, parentSha);
    await this.updateRef(newCommit.sha);

    return {
      commitSha: newCommit.sha,
      commitUrl: `https://github.com/${this.owner}/${this.repo}/commit/${newCommit.sha}`,
    };
  }
}
