import { GitHubClient } from '../_lib/github.js';
import { extractCurrentLatestSlug, parseEpisodeSummary, patchIndexHtml, patchPrevEpisodePager, patchSitemap } from '../_lib/patch.js';
import { renderEpisodePage } from '../_lib/template.js';
import { buildTurns } from '../_lib/transcript.js';
import {
  slugify, parseDuration, extractYouTubeId, truncateForMeta,
  splitParagraphs, uint8ToBase64, jsonResponse, ValidationError,
} from '../_lib/util.js';
import { requireAccessEmail } from '../_lib/access.js';

const MAX_IMAGE_BYTES = 8 * 1024 * 1024;
const MAX_TRANSCRIPT_BYTES = 15 * 1024 * 1024;

function parseSpeakerMap(text) {
  const map = {};
  for (const rawLine of String(text || '').split(/\r?\n/)) {
    const line = rawLine.trim();
    if (!line) continue;
    const eq = line.indexOf('=');
    if (eq === -1) throw new ValidationError(`A "Beszélők" mezőben érvénytelen sor: "${line}" (várt forma: SPEAKER_00 = Név).`);
    const label = line.slice(0, eq).trim();
    const name = line.slice(eq + 1).trim();
    if (!label || !name) throw new ValidationError(`A "Beszélők" mezőben hiányos sor: "${line}".`);
    map[label] = name;
  }
  if (Object.keys(map).length === 0) {
    throw new ValidationError('Add meg legalább egy beszélő-megfeleltetést (pl. SPEAKER_00 = Zsebeházy Bálint).');
  }
  return map;
}

async function readRequiredFile(form, field, maxBytes, label) {
  const file = form.get(field);
  if (!(file instanceof File) || file.size === 0) {
    throw new ValidationError(`Hiányzik a feltöltött fájl: "${label}".`);
  }
  if (file.size > maxBytes) {
    throw new ValidationError(`A "${label}" fájl túl nagy (${(file.size / 1024 / 1024).toFixed(1)} MB, max ${(maxBytes / 1024 / 1024).toFixed(0)} MB).`);
  }
  return file;
}

function requiredField(form, field, label) {
  const v = (form.get(field) || '').toString().trim();
  if (!v) throw new ValidationError(`Hiányzik a kötelező mező: "${label}".`);
  return v;
}

export async function onRequestPost({ request, env }) {
  const access = requireAccessEmail(request, env);
  if (!access.ok) return jsonResponse({ error: access.reason }, { status: 403 });

  try {
    const form = await request.formData();
    const mode = (form.get('mode') || 'preview').toString();
    if (mode !== 'preview' && mode !== 'publish') throw new ValidationError('Érvénytelen "mode" (preview vagy publish lehet).');

    // --- mezők beolvasása + validálás ---
    const episodeNumber = requiredField(form, 'episodeNumber', 'Epizódszám');
    const title = requiredField(form, 'title', 'Cím');
    const isoDate = requiredField(form, 'isoDate', 'Dátum');
    if (!/^\d{4}-\d{2}-\d{2}$/.test(isoDate)) throw new ValidationError(`A dátum formátuma nem YYYY-MM-DD: "${isoDate}".`);
    const durationInput = requiredField(form, 'duration', 'Hossz');
    const { display: durationDisplay, iso: durationIso } = parseDuration(durationInput);
    const youtubeUrlRaw = requiredField(form, 'youtubeUrl', 'YouTube URL');
    const youtubeId = extractYouTubeId(youtubeUrlRaw);
    const youtubeUrl = `https://www.youtube.com/watch?v=${youtubeId}`;
    const spotifyUrl = requiredField(form, 'spotifyUrl', 'Spotify URL');
    const participants = requiredField(form, 'participants', 'Résztvevők');
    const fullDescriptionRaw = requiredField(form, 'fullDescription', 'Teljes leírás');
    const descriptionParagraphs = splitParagraphs(fullDescriptionRaw);
    if (descriptionParagraphs.length === 0) throw new ValidationError('A teljes leírás nem lehet üres.');
    const shortDescriptionRaw = (form.get('shortDescription') || '').toString().trim();
    const metaDescription = truncateForMeta(shortDescriptionRaw || descriptionParagraphs.join(' '));
    const slugOverride = (form.get('slug') || '').toString().trim();
    const slug = slugify(slugOverride || title);
    if (!slug) throw new ValidationError('A címből nem sikerült egyedi URL-azonosítót (slugot) képezni.');

    const speakerMap = parseSpeakerMap(form.get('speakerMap'));

    const coverFile = await readRequiredFile(form, 'coverImage', MAX_IMAGE_BYTES, 'Borítókép');
    if (!/^image\/jpe?g$/.test(coverFile.type)) {
      throw new ValidationError(`A borítókép JPEG kell legyen (kapott típus: "${coverFile.type}"). Méretezd/konvertáld webre készre, mint a korábbi epizódoknál.`);
    }
    const transcriptFile = await readRequiredFile(form, 'transcriptFile', MAX_TRANSCRIPT_BYTES, 'Leirat fájl (*_final.json)');
    const transcriptText = await transcriptFile.text();
    const turns = buildTurns(transcriptText, speakerMap);

    const participantsLine = `Résztvevők: ${participants}`;
    const participantsLineEn = `Participants: ${participants}`;
    const coverFileName = `${episodeNumber}eps.jpg`;

    // --- a jelenlegi állapot beolvasása GitHubról ---
    const gh = new GitHubClient({
      token: env.GITHUB_TOKEN,
      owner: env.GITHUB_OWNER,
      repo: env.GITHUB_REPO,
      branch: env.GITHUB_BRANCH,
    });

    const [indexHtml, sitemapXml] = await Promise.all([gh.getFileText('index.html'), gh.getFileText('sitemap.xml')]);
    if (!indexHtml) throw new Error('index.html nem olvasható a repóból.');
    if (!sitemapXml) throw new Error('sitemap.xml nem olvasható a repóból.');

    const oldLatestSlug = extractCurrentLatestSlug(indexHtml);
    if (oldLatestSlug === slug) {
      throw new ValidationError(`A megadott slug ("${slug}") megegyezik a jelenlegi legfrissebb epizóddal - ez biztos nem egy új epizód?`);
    }
    const existingFiles = await gh.listDir('epizodok');
    if (existingFiles.includes(`${slug}.html`)) {
      throw new ValidationError(`Már létezik epizódoldal ezzel a slug-gal: "epizodok/${slug}.html". Adj meg egyedi címet vagy slugot.`);
    }

    const oldLatestHtml = await gh.getFileText(`epizodok/${oldLatestSlug}.html`);
    if (!oldLatestHtml) throw new Error(`epizodok/${oldLatestSlug}.html nem olvasható.`);
    const oldLatest = parseEpisodeSummary(oldLatestHtml, oldLatestSlug);

    const newEp = {
      slug, title, isoDate, durationDisplay, durationIso,
      youtubeUrl, youtubeId, spotifyUrl, coverFile: coverFileName,
      metaDescription, descriptionParagraphs, participantsLine, participantsLineEn,
      turns, prev: { slug: oldLatest.slug, title: oldLatest.title }, next: null,
    };

    const newEpisodeHtml = renderEpisodePage(newEp);
    const patchedIndexHtml = patchIndexHtml(indexHtml, { newEp, oldLatest });
    const patchedOldLatestHtml = patchPrevEpisodePager(oldLatestHtml, newEp);
    const patchedSitemap = patchSitemap(sitemapXml, newEp);

    const summary = {
      slug,
      title,
      url: `https://vedelmihorizont.hu/epizodok/${slug}.html`,
      isoDate,
      durationDisplay,
      durationIso,
      youtubeUrl,
      spotifyUrl,
      coverFileName,
      turnsCount: turns.length,
      speakerNames: [...new Set(turns.map((t) => t.speakerName))],
      replacesLatest: { slug: oldLatest.slug, title: oldLatest.title },
      filesChanged: [
        `epizodok/${slug}.html (új)`,
        'index.html',
        `epizodok/${oldLatest.slug}.html (next link)`,
        'sitemap.xml',
        `kepek/epizod_kepek/web/${coverFileName} (új)`,
      ],
    };

    if (mode === 'preview') {
      return jsonResponse({ preview: true, summary });
    }

    // --- publish: egy atomi commit ---
    const imageBytes = new Uint8Array(await coverFile.arrayBuffer());
    const imageBase64 = uint8ToBase64(imageBytes);

    const { commitSha, commitUrl } = await gh.commitFiles(
      [
        { path: `epizodok/${slug}.html`, content: newEpisodeHtml, encoding: 'utf-8' },
        { path: 'index.html', content: patchedIndexHtml, encoding: 'utf-8' },
        { path: `epizodok/${oldLatest.slug}.html`, content: patchedOldLatestHtml, encoding: 'utf-8' },
        { path: 'sitemap.xml', content: patchedSitemap, encoding: 'utf-8' },
        { path: `kepek/epizod_kepek/web/${coverFileName}`, content: imageBase64, encoding: 'base64' },
      ],
      `Epizód hozzáadása: ${title}`
    );

    return jsonResponse({ published: true, summary, commitSha, commitUrl });
  } catch (e) {
    const status = e instanceof ValidationError ? 400 : 500;
    return jsonResponse({ error: e.message }, { status });
  }
}
