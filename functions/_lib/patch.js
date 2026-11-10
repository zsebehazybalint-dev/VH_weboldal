// index.html, sitemap.xml és az "előző legfrissebb" epizódoldal célzott,
// stabil (nem a tartalomtól függő) horgokra épülő patch-elése.
// Minden horog egy olyan literál részlet, amit a sablon (template.js) is
// pontosan ugyanúgy generál - így a kimenet a KÖVETKEZŐ futásnál is patch-elhető.

import { ValidationError, unescapeHtml, escapeHtml } from './util.js';
import { renderEpisodeCard, renderEpisodeFeature, renderActionsRow, renderEpLink, renderSitemapEntry } from './template.js';

const HERO_RE = /<a class="btn-pill primary" href="epizodok\/([^"]+)\.html">/;

export function extractCurrentLatestSlug(indexHtml) {
  const m = indexHtml.match(HERO_RE);
  if (!m) throw new ValidationError('Nem találom a "Legfrissebb epizód" hero gombot az index.html-ben - a patch-elő horog elromlott vagy a layout megváltozott.');
  return m[1];
}

export function parseEpisodeSummary(html, slug) {
  const titleM = html.match(/<h1 class="article-title">([\s\S]*?)<\/h1>/);
  const metaM = html.match(/<p class="article-meta">([^<]+)<\/p>/);
  const videoActionsM = html.match(/<div class="video-actions">([\s\S]*?)<\/div>/);
  const coverM = html.match(/id="videoThumb"[\s\S]*?<img src="\.\.\/kepek\/epizod_kepek\/web\/([^"]+)"/);
  if (!titleM || !metaM || !videoActionsM || !coverM) {
    throw new ValidationError(`Nem sikerült beolvasni a jelenlegi legfrissebb epizód (${slug}) adatait - a lap szerkezete eltér a vártól.`);
  }
  const hrefs = [...videoActionsM[1].matchAll(/<a class="btn-pill" href="([^"]+)"/g)].map((m) => m[1]);
  if (hrefs.length < 2) throw new ValidationError(`A jelenlegi legfrissebb epizód (${slug}) oldalán nem találom a YouTube/Spotify linkeket.`);
  const [isoDate, durationDisplay] = metaM[1].split(' &#183; ');
  if (!isoDate || !durationDisplay) {
    throw new ValidationError(`A jelenlegi legfrissebb epizód (${slug}) dátum/hossz mezője nem a várt formátumú: "${metaM[1]}".`);
  }
  return {
    slug,
    title: unescapeHtml(titleM[1]),
    isoDate,
    durationDisplay,
    youtubeUrl: hrefs[0],
    spotifyUrl: hrefs[1],
    coverFile: coverM[1],
  };
}

function replaceOnce(html, regex, replacement, label) {
  const matches = html.match(new RegExp(regex.source, regex.flags.includes('g') ? regex.flags : regex.flags + 'g'));
  if (!matches || matches.length !== 1) {
    throw new ValidationError(`index.html patch hiba: "${label}" horog nem egyedi vagy nem található (${matches ? matches.length : 0} találat).`);
  }
  return html.replace(regex, replacement);
}

function sliceBetween(html, startMarker, endMarker, label) {
  const start = html.indexOf(startMarker);
  if (start === -1) throw new ValidationError(`index.html patch hiba: "${label}" kezdő horog nem található ("${startMarker.slice(0, 50)}…").`);
  const end = html.indexOf(endMarker, start);
  if (end === -1) throw new ValidationError(`index.html patch hiba: "${label}" záró horog nem található ("${endMarker.slice(0, 50)}…").`);
  return { start, end };
}

export function patchIndexHtml(indexHtml, { newEp, oldLatest }) {
  let html = indexHtml;

  // 1) hero "Legfrissebb epizód" gomb href-je
  html = replaceOnce(
    html,
    HERO_RE,
    `<a class="btn-pill primary" href="epizodok/${newEp.slug}.html">`,
    'hero gomb'
  );

  // 2) Kezdőlap panel: episode-feature blokk + alatta a YT/Spotify gombsor,
  //    a két stabil horog ("margin-top:36px" ill. az About szekció kommentje) között.
  {
    const startMarker = '<div class="episode-feature" style="margin-top:36px">';
    const endMarker = '<!-- ============ ABOUT ============ -->';
    const { start, end } = sliceBetween(html, startMarker, endMarker, 'Kezdőlap episode-feature');
    const feature = renderEpisodeFeature(newEp, { withDataAttrs: false });
    const actions = renderActionsRow(newEp, { withMarginStyle: true });
    const epLink = renderEpLink(newEp);
    const replacement = `${feature}\n    ${actions}\n    ${epLink}\n  </section>\n\n  `;
    html = html.slice(0, start) + replacement + html.slice(end);
  }

  // 3) Epizódok panel: episode-feature blokk + ep-link, az episode-grid elejéig;
  //    az eddigi legfrissebb epizód ide kerül be ÚJ kártyaként (episode-grid elejére).
  {
    const startMarker = '<div class="episode-feature" data-ep-item data-ep-title="';
    const endMarker = '<div class="episode-grid">';
    const { start, end } = sliceBetween(html, startMarker, endMarker, 'Epizódok panel episode-feature');
    const feature = renderEpisodeFeature(newEp, { withDataAttrs: true });
    const epLink = renderEpLink(newEp);
    const newCard = renderEpisodeCard(oldLatest);
    const replacement = `${feature}\n    ${epLink}\n\n    ${endMarker}\n${newCard}\n`;
    html = html.slice(0, start) + replacement + html.slice(end + endMarker.length);
  }

  return html;
}

export function patchPrevEpisodePager(oldLatestHtml, newEp) {
  const sentinel = '<span></span>\n  </nav>';
  if (!oldLatestHtml.includes(sentinel)) {
    throw new ValidationError(
      'Az eddigi legfrissebb epizód oldalán nem találom az üres "next" pager-helyet - lehet, hogy ennek az oldalnak már van next linkje (nem ez volt a legfrissebb?).'
    );
  }
  const nextLink = `<a class="next" href="${newEp.slug}.html"><span class="dir" data-hu="Következő epizód &#8594;" data-en="Next episode &#8594;">Következő epizód &#8594;</span><span class="ttl">${escapeHtml(newEp.title)}</span></a>`;
  return oldLatestHtml.replace(sentinel, `${nextLink}\n  </nav>`);
}

export function patchSitemap(sitemapXml, newEp) {
  let xml = sitemapXml;

  // homepage lastmod frissítése
  {
    const homeLoc = '<loc>https://vedelmihorizont.hu/</loc>';
    const homeStart = xml.indexOf(homeLoc);
    if (homeStart !== -1) {
      const lastmodM = xml.slice(homeStart).match(/<lastmod>([^<]*)<\/lastmod>/);
      if (lastmodM) {
        xml = xml.slice(0, homeStart) + xml.slice(homeStart).replace(lastmodM[0], `<lastmod>${newEp.isoDate}</lastmod>`);
      }
    }
  }

  // új epizód bejegyzés beszúrása az adatvedelem.html utáni első </url> után
  const anchorLoc = '<loc>https://vedelmihorizont.hu/adatvedelem.html</loc>';
  const anchorIdx = xml.indexOf(anchorLoc);
  if (anchorIdx === -1) throw new ValidationError('sitemap.xml patch hiba: nem találom az adatvedelem.html bejegyzést.');
  const closeIdx = xml.indexOf('</url>', anchorIdx);
  if (closeIdx === -1) throw new ValidationError('sitemap.xml patch hiba: nem találom az adatvedelem.html bejegyzés lezárását.');
  const insertAt = closeIdx + '</url>'.length;
  const entry = renderSitemapEntry(newEp);
  xml = xml.slice(0, insertAt) + '\n' + entry + xml.slice(insertAt);

  return xml;
}
