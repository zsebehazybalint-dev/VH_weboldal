import { GitHubClient } from '../_lib/github.js';
import { extractCurrentLatestSlug, parseEpisodeSummary } from '../_lib/patch.js';
import { jsonResponse } from '../_lib/util.js';
import { requireAccessEmail } from '../_lib/access.js';

export async function onRequestGet({ request, env }) {
  const access = requireAccessEmail(request, env);
  if (!access.ok) return jsonResponse({ error: access.reason }, { status: 403 });

  try {
    const gh = new GitHubClient({
      token: env.GITHUB_TOKEN,
      owner: env.GITHUB_OWNER,
      repo: env.GITHUB_REPO,
      branch: env.GITHUB_BRANCH,
    });

    const indexHtml = await gh.getFileText('index.html');
    if (!indexHtml) throw new Error('index.html nem található a repóban.');
    const latestSlug = extractCurrentLatestSlug(indexHtml);

    const latestHtml = await gh.getFileText(`epizodok/${latestSlug}.html`);
    if (!latestHtml) throw new Error(`epizodok/${latestSlug}.html nem található.`);
    const latest = parseEpisodeSummary(latestHtml, latestSlug);

    const existingFiles = await gh.listDir('epizodok');
    const existingSlugs = existingFiles.filter((f) => f.endsWith('.html')).map((f) => f.replace(/\.html$/, ''));

    const numM = latest.title.match(/#0*(\d+)/);
    const suggestedNumber = numM ? Number(numM[1]) + 1 : existingSlugs.length + 1;

    return jsonResponse({
      currentLatest: latest,
      existingSlugs,
      suggestedNumber,
      accessEmail: access.email,
    });
  } catch (e) {
    return jsonResponse({ error: e.message, stack: env.DEBUG ? e.stack : undefined }, { status: 500 });
  }
}
