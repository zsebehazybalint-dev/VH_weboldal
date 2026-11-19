// Megosztott logika: űrlap -> validált, tisztán JSON-szerializálható "epInput" objektum,
// illetve epInput -> (friss GitHub-állapothoz illesztett render+patch) -> commit.
// Azért van szétválasztva, mert az ütemezett közzététel (SCHEDULE_KV) a beküldéskor
// csak az epInput-ot menti el, a tényleges GitHub-állapothoz illesztést és a commit-ot
// pedig a cron-handler végzi el a lejáráskor - így a patch mindig a KOMMITÁLÁS
// pillanatában aktuális index.html/sitemap.xml/"legfrissebb epizód" állapothoz igazodik,
// nem az ütemezéskori (esetleg azóta elavult) állapothoz.

import { GitHubClient } from './github.js';
import { extractCurrentLatestSlug, parseEpisodeSummary, patchIndexHtml, patchPrevEpisodePager, patchSitemap } from './patch.js';
import { renderEpisodePage } from './template.js';
import { buildTurns } from './transcript.js';
import {
  slugify, parseDuration, extractYouTubeId, truncateForMeta,
  splitParagraphs, uint8ToBase64, ValidationError,
} from './util.js';

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

// Form -> plain, JSON-szerializálható objektum (nincs benne File/FormData).
// Minden validáció itt történik meg EGYSZER, mind a "most közzététel", mind az
// "ütemezés" útnak ugyanez ad bemenetet.
export async function parseEpisodeInput(form) {
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
  const descriptionParagraphsHu = splitParagraphs(fullDescriptionRaw);
  if (descriptionParagraphsHu.length === 0) throw new ValidationError('A teljes leírás nem lehet üres.');

  const fullDescriptionEnRaw = requiredField(form, 'fullDescriptionEn', 'Teljes leírás (angol)');
  const descriptionParagraphsEn = splitParagraphs(fullDescriptionEnRaw);
  if (descriptionParagraphsEn.length === 0) throw new ValidationError('A teljes leírás (angol) nem lehet üres.');
  if (descriptionParagraphsEn.length !== descriptionParagraphsHu.length) {
    throw new ValidationError(
      `A magyar leírás ${descriptionParagraphsHu.length}, az angol ${descriptionParagraphsEn.length} bekezdésből áll - ` +
      'a kettőnek bekezdésenként egy-az-egyben meg kell felelnie (ugyanott legyen üres sor mindkét szövegben).'
    );
  }
  const descriptionPairs = descriptionParagraphsHu.map((hu, i) => ({ hu, en: descriptionParagraphsEn[i] }));

  const shortDescriptionRaw = (form.get('shortDescription') || '').toString().trim();
  const metaDescription = truncateForMeta(shortDescriptionRaw || descriptionParagraphsHu.join(' '));

  const slugOverride = (form.get('slug') || '').toString().trim();
  const slug = slugify(slugOverride || title);
  if (!slug) throw new ValidationError('A címből nem sikerült egyedi URL-azonosítót (slugot) képezni.');

  const speakerMap = parseSpeakerMap(form.get('speakerMap'));

  const coverImageFile = await readRequiredFile(form, 'coverImage', MAX_IMAGE_BYTES, 'Borítókép');
  if (!/^image\/jpe?g$/.test(coverImageFile.type)) {
    throw new ValidationError(`A borítókép JPEG kell legyen (kapott típus: "${coverImageFile.type}"). Méretezd/konvertáld webre készre, mint a korábbi epizódoknál.`);
  }
  const transcriptFile = await readRequiredFile(form, 'transcriptFile', MAX_TRANSCRIPT_BYTES, 'Leirat fájl (*_final.json)');
  const transcriptText = await transcriptFile.text();
  const turns = buildTurns(transcriptText, speakerMap);

  const participantsLine = `Résztvevők: ${participants}`;
  const participantsLineEn = `Participants: ${participants}`;
  // FONTOS: ez a mezőnév (coverFile) KELL hogy pontosan megegyezzen azzal, amit
  // a template.js render* függvényei (ep.coverFile) várnak - különben a kép
  // src-je "undefined" lesz, ahogy a 2026-11-19-i hibánál történt.
  const coverFile = `${episodeNumber}eps.jpg`;

  const imageBytes = new Uint8Array(await coverImageFile.arrayBuffer());
  const imageBase64 = uint8ToBase64(imageBytes);

  return {
    slug, title, isoDate, durationDisplay, durationIso,
    youtubeUrl, youtubeId, spotifyUrl, coverFile, imageBase64,
    metaDescription, descriptionPairs, participantsLine, participantsLineEn,
    turns,
  };
}

function makeGitHubClient(env) {
  return new GitHubClient({
    token: env.GITHUB_TOKEN,
    owner: env.GITHUB_OWNER,
    repo: env.GITHUB_REPO,
    branch: env.GITHUB_BRANCH,
  });
}

// epInput -> a JELENLEGI (hívás pillanatabeli) GitHub-állapothoz illesztett
// render+patch, commit NÉLKÜL. Ezt preview-hoz és a tényleges commit előtti
// lépésként is használjuk (mind azonnali publikálásnál, mind az ütemezett
// job lejáratakor) - így a patch mindig a legfrissebb állapotra épül.
export async function resolveAgainstCurrentState(env, epInput) {
  const gh = makeGitHubClient(env);

  const [indexHtml, sitemapXml] = await Promise.all([gh.getFileText('index.html'), gh.getFileText('sitemap.xml')]);
  if (!indexHtml) throw new Error('index.html nem olvasható a repóból.');
  if (!sitemapXml) throw new Error('sitemap.xml nem olvasható a repóból.');

  const oldLatestSlug = extractCurrentLatestSlug(indexHtml);
  if (oldLatestSlug === epInput.slug) {
    throw new ValidationError(`A megadott slug ("${epInput.slug}") megegyezik a jelenlegi legfrissebb epizóddal - ez biztos nem egy új epizód?`);
  }
  const existingFiles = await gh.listDir('epizodok');
  if (existingFiles.includes(`${epInput.slug}.html`)) {
    throw new ValidationError(`Már létezik epizódoldal ezzel a slug-gal: "epizodok/${epInput.slug}.html". Adj meg egyedi címet vagy slugot.`);
  }

  const oldLatestHtml = await gh.getFileText(`epizodok/${oldLatestSlug}.html`);
  if (!oldLatestHtml) throw new Error(`epizodok/${oldLatestSlug}.html nem olvasható.`);
  const oldLatest = parseEpisodeSummary(oldLatestHtml, oldLatestSlug);

  const newEp = { ...epInput, prev: { slug: oldLatest.slug, title: oldLatest.title }, next: null };

  const newEpisodeHtml = renderEpisodePage(newEp);
  const patchedIndexHtml = patchIndexHtml(indexHtml, { newEp, oldLatest });
  const patchedOldLatestHtml = patchPrevEpisodePager(oldLatestHtml, newEp);
  const patchedSitemap = patchSitemap(sitemapXml, newEp);

  const summary = {
    slug: epInput.slug,
    title: epInput.title,
    url: `https://vedelmihorizont.hu/epizodok/${epInput.slug}.html`,
    isoDate: epInput.isoDate,
    durationDisplay: epInput.durationDisplay,
    durationIso: epInput.durationIso,
    youtubeUrl: epInput.youtubeUrl,
    spotifyUrl: epInput.spotifyUrl,
    coverFile: epInput.coverFile,
    turnsCount: epInput.turns.length,
    speakerNames: [...new Set(epInput.turns.map((t) => t.speakerName))],
    replacesLatest: { slug: oldLatest.slug, title: oldLatest.title },
    filesChanged: [
      `epizodok/${epInput.slug}.html (új)`,
      'index.html',
      `epizodok/${oldLatest.slug}.html (next link)`,
      'sitemap.xml',
      `kepek/epizod_kepek/web/${epInput.coverFile} (új)`,
    ],
  };

  return { newEpisodeHtml, patchedIndexHtml, patchedOldLatestHtml, patchedSitemap, oldLatest, summary };
}

export async function commitEpisode(env, epInput, resolved) {
  const gh = makeGitHubClient(env);
  const { commitSha, commitUrl } = await gh.commitFiles(
    [
      { path: `epizodok/${epInput.slug}.html`, content: resolved.newEpisodeHtml, encoding: 'utf-8' },
      { path: 'index.html', content: resolved.patchedIndexHtml, encoding: 'utf-8' },
      { path: `epizodok/${resolved.oldLatest.slug}.html`, content: resolved.patchedOldLatestHtml, encoding: 'utf-8' },
      { path: 'sitemap.xml', content: resolved.patchedSitemap, encoding: 'utf-8' },
      { path: `kepek/epizod_kepek/web/${epInput.coverFile}`, content: epInput.imageBase64, encoding: 'base64' },
    ],
    `Epizód hozzáadása: ${epInput.title}`
  );
  return { commitSha, commitUrl };
}

// Azonnali közzététel: a jelenlegi állapothoz illesztés + commit egy menetben.
export async function publishEpisodeNow(env, epInput) {
  const resolved = await resolveAgainstCurrentState(env, epInput);
  const { commitSha, commitUrl } = await commitEpisode(env, epInput, resolved);
  return { summary: resolved.summary, commitSha, commitUrl };
}
