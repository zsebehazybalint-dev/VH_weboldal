// Epizódoldal és index.html-fragmentumok renderelése.
// A fix fejléc/lábléc/CSS/script blokkokat a legutóbbi kézzel írt epizódfájlból
// (epizodok/amerikai-felidos-valasztasok.html) másoltuk ide 1:1 - ha a design
// bármelyik ponton változik, itt KELL frissíteni, mert innentől minden új
// epizódoldal ebből a sablonból generálódik.

import { escapeHtml } from './util.js';

function renderTranscriptHtml(turns) {
  return turns
    .map(
      (t) => `    <div class="t-turn">
      <div class="t-speaker">${escapeHtml(t.speakerName)}<span class="t-time">${t.timeDisplay}</span></div>
      <div class="t-text"><p data-hu="${escapeHtml(t.hu)}" data-en="${escapeHtml(t.en)}">${escapeHtml(t.hu)}</p></div>
    </div>`
    )
    .join('\n');
}

function renderParagraphsHtml(paragraphs) {
  return paragraphs.map((p) => `  <p>${escapeHtml(p)}</p>`).join('\n');
}

function renderPagerHtml(prev, next) {
  const prevHtml = prev
    ? `<a class="prev" href="${prev.slug}.html"><span class="dir" data-hu="&#8592; Előző epizód" data-en="&#8592; Previous episode">&#8592; Előző epizód</span><span class="ttl">${escapeHtml(prev.title)}</span></a>`
    : '<span></span>';
  const nextHtml = next
    ? `<a class="next" href="${next.slug}.html"><span class="dir" data-hu="Következő epizód &#8594;" data-en="Next episode &#8594;">Következő epizód &#8594;</span><span class="ttl">${escapeHtml(next.title)}</span></a>`
    : '<span></span>';
  return `  <nav class="ep-pager" aria-label="Epizódok közötti navigáció">\n    ${prevHtml}\n    ${nextHtml}\n  </nav>`;
}

// ep: {
//   title, slug, isoDate, durationDisplay, durationIso, youtubeUrl, youtubeId,
//   spotifyUrl, coverFile, metaDescription, descriptionParagraphs, participantsLine,
//   turns, prev: {slug,title}|null, next: {slug,title}|null
// }
export function renderEpisodePage(ep) {
  const titleEsc = escapeHtml(ep.title);
  const metaDescEsc = escapeHtml(ep.metaDescription);
  const canonical = `https://vedelmihorizont.hu/epizodok/${ep.slug}.html`;
  const coverUrl = `https://vedelmihorizont.hu/kepek/epizod_kepek/web/${ep.coverFile}`;

  const jsonLd = {
    '@context': 'https://schema.org',
    '@type': 'PodcastEpisode',
    name: ep.title,
    url: canonical,
    datePublished: ep.isoDate,
    duration: ep.durationIso,
    description: ep.descriptionParagraphs.join(' '),
    partOfSeries: { '@type': 'PodcastSeries', name: 'Védelmi Horizont', url: 'https://vedelmihorizont.hu/' },
    associatedMedia: { '@type': 'MediaObject', contentUrl: ep.youtubeUrl },
    image: coverUrl,
  };

  return `<!DOCTYPE html>
<html lang="hu">
<head>
<meta charset="utf-8" />
<meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover" />
<title>${titleEsc} - Védelmi Horizont</title>
<meta name="description" content="${metaDescEsc}" />
<link rel="icon" type="image/svg+xml" href="../kepek/logo_svg.svg" />
<link rel="apple-touch-icon" href="../kepek/logo1440x1440.png" />
<meta name="theme-color" content="#0b0f16" />
<link rel="canonical" href="${canonical}" />
<meta property="og:type" content="website" />
<meta property="og:url" content="${canonical}" />
<meta property="og:site_name" content="Védelmi Horizont" />
<meta property="og:locale" content="hu_HU" />
<meta property="og:title" content="${titleEsc} - Védelmi Horizont" />
<meta property="og:description" content="${metaDescEsc}" />
<meta property="og:image" content="${coverUrl}" />
<meta name="twitter:card" content="summary_large_image" />
<meta name="twitter:title" content="${titleEsc} - Védelmi Horizont" />
<meta name="twitter:description" content="${metaDescEsc}" />
<meta name="twitter:image" content="${coverUrl}" />
<link rel="preconnect" href="https://fonts.googleapis.com" />
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin />
<link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Raleway:wght@400;500;600;700;800&family=Merriweather:ital,wght@0,300;0,400;0,700;1,300&family=JetBrains+Mono:wght@400;500&display=swap" media="print" onload="this.media='all'" />
<noscript><link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Raleway:wght@400;500;600;700;800&family=Merriweather:ital,wght@0,300;0,400;0,700;1,300&family=JetBrains+Mono:wght@400;500&display=swap" /></noscript>
<style>
:root{
  box-sizing:border-box;
  color-scheme:light;
  --bg:#f6f7f9;
  --surface:#ffffff;
  --surface-2:#eef1f5;
  --text:#11161f;
  --muted:#5b6472;
  --line:#dde2ea;
  --accent:#2f5d85;
  --accent-text:#2f5d85;
  --serif:'Merriweather',Georgia,'Times New Roman',serif;
  --sans:'Raleway',system-ui,-apple-system,'Segoe UI',Roboto,Arial,sans-serif;
  --mono:'JetBrains Mono',ui-monospace,Consolas,monospace;
  --maxw:860px;
}
@media (prefers-color-scheme:dark){
  :root:not([data-theme="light"]){
    color-scheme:dark;
    --bg:#0b0f16; --surface:#11161f; --surface-2:#161d2a; --text:#e7edf5; --muted:#8c99ab; --line:#232c3c; --accent:#5b93c9; --accent-text:#5b93c9;
  }
}
:root[data-theme="dark"]{
  color-scheme:dark;
  --bg:#0b0f16; --surface:#11161f; --surface-2:#161d2a; --text:#e7edf5; --muted:#8c99ab; --line:#232c3c; --accent:#5b93c9; --accent-text:#5b93c9;
}
*{box-sizing:border-box}
html{scroll-behavior:smooth}
body,.site-header,.theme-toggle,.video-block,a{transition:background-color .4s ease,color .4s ease,border-color .4s ease,fill .4s ease}
@media (prefers-reduced-motion:reduce){body,.site-header,.theme-toggle,.video-block,a{transition:none}}
body{margin:0;background:var(--bg);color:var(--text);font-family:var(--sans);font-size:16px;line-height:1.65;-webkit-font-smoothing:antialiased}
a{color:var(--accent-text);text-underline-offset:3px}
a:focus-visible,button:focus-visible{outline:2px solid var(--accent);outline-offset:2px}
img{max-width:100%;display:block}
p{margin:0 0 1rem}

.site-header{background:var(--surface);border-bottom:1px solid var(--line)}
.header-inner{max-width:var(--maxw);margin:0 auto;padding:22px 20px;display:flex;align-items:center;gap:18px;flex-wrap:wrap}
.logo-mark{position:relative;display:inline-block;height:56px;width:56px;flex-shrink:0}
.logo-mark img{position:absolute;inset:0;width:100%;height:100%;object-fit:contain}
.logo-mark .logo-dark{display:none}
@media (prefers-color-scheme:dark){
  :root:not([data-theme="light"]) .logo-mark .logo-light{display:none}
  :root:not([data-theme="light"]) .logo-mark .logo-dark{display:block}
}
:root[data-theme="dark"] .logo-mark .logo-light{display:none}
:root[data-theme="dark"] .logo-mark .logo-dark{display:block}
:root[data-theme="light"] .logo-mark .logo-light{display:block}
:root[data-theme="light"] .logo-mark .logo-dark{display:none}
.brand-link{display:flex;align-items:center;gap:18px;text-decoration:none;color:inherit;border-radius:4px}
.brand-link:hover .logo-mark{opacity:.85}
.header-text{display:block}
.header-text .brand-title{font-family:var(--serif);font-weight:700;font-size:1.15rem;margin:0 0 2px;letter-spacing:-.01em}
.header-text p{margin:0;color:var(--muted);font-size:.8rem}
.header-actions{margin-left:auto;display:flex;align-items:center;gap:10px;flex-shrink:0}
.lang{display:flex;width:118px;height:36px;box-sizing:border-box;font-family:var(--mono);border:1px solid var(--line);overflow:hidden;flex-shrink:0}
.lang button{flex:1;display:flex;align-items:center;justify-content:center;background:none;border:0;color:var(--muted);padding:0 11px;cursor:pointer;font-family:inherit;font-size:.78rem;font-weight:700;text-align:center;box-sizing:border-box}
.lang button.on{background:var(--text);color:var(--bg)}
.lang button:hover:not(.on){color:var(--text)}
.theme-toggle{width:106px;height:36px;display:inline-flex;align-items:center;justify-content:flex-start;gap:8px;
  font:inherit;font-size:.8rem;font-weight:600;color:var(--text);background:transparent;border:1px solid var(--line);
  padding:0 12px;cursor:pointer;flex-shrink:0;box-sizing:border-box}
.theme-toggle:hover{border-color:var(--text)}
.theme-toggle .label{flex:1 1 auto;text-align:left}
.theme-icon{position:relative;display:inline-block;width:16px;height:16px;flex-shrink:0}
.theme-icon .icon-sun,.theme-icon .icon-moon{position:absolute;inset:0;width:100%;height:100%;transition:opacity .4s ease,transform .4s ease}
.theme-icon .icon-sun{opacity:1;transform:rotate(0deg) scale(1)}
.theme-icon .icon-moon{opacity:0;transform:scale(.5)}
.theme-icon.is-dark .icon-sun{opacity:0;transform:rotate(90deg) scale(.5)}
.theme-icon.is-dark .icon-moon{opacity:1;transform:scale(1)}

main{max-width:var(--maxw);margin:0 auto;padding:36px 20px 80px}
.back-link{display:inline-flex;align-items:center;gap:6px;font-family:var(--sans);font-weight:700;font-size:.78rem;text-transform:uppercase;letter-spacing:.06em;color:var(--muted);text-decoration:none;margin-bottom:24px}
.back-link:hover{color:var(--accent-text)}
.article-meta{font-family:var(--mono);font-size:.8rem;color:var(--accent-text);margin:0 0 10px;letter-spacing:.03em}
.article-title{font-family:var(--serif);font-weight:700;font-size:clamp(1.6rem,4vw,2.3rem);line-height:1.22;margin:0 0 26px}

.video-block{border:1px solid var(--line);background:var(--surface);margin:0 0 18px;overflow:hidden}
.ep-thumb{position:relative;display:block;width:100%;aspect-ratio:16/9;background:var(--surface-2);padding:0;border:0;cursor:pointer;overflow:hidden}
.ep-thumb img{width:100%;height:100%;object-fit:cover;display:block;opacity:.92;transition:transform .4s ease,opacity .3s ease}
.ep-thumb:hover img{transform:scale(1.04);opacity:1}
.ep-thumb iframe{position:absolute;inset:0;width:100%;height:100%;border:0}
.ep-fallback{position:absolute;inset:0;display:flex;flex-direction:column;align-items:center;justify-content:center;gap:14px;padding:24px;text-align:center;cursor:auto}
.ep-fallback p{margin:0;max-width:42ch;color:var(--muted);font-size:.86rem}
.ep-fallback a{display:inline-flex;align-items:center;font-family:var(--sans);font-weight:700;text-transform:uppercase;letter-spacing:.06em;font-size:.78rem;padding:10px 18px;border:1px solid var(--line);color:var(--text);text-decoration:none;background:var(--surface)}
.ep-fallback a:hover{border-color:var(--text)}
.video-actions{display:flex;gap:10px;flex-wrap:wrap;margin:0 0 12px}
.note{font-size:.82rem;color:var(--muted);border-left:2px solid var(--line);padding:2px 0 2px 12px;margin:0 0 40px}
.btn-pill{display:inline-flex;align-items:center;gap:9px;font-family:var(--sans);font-weight:700;text-transform:uppercase;
  letter-spacing:.07em;font-size:.76rem;padding:10px 18px;border:1px solid var(--line);color:var(--text);text-decoration:none;
  background:transparent;cursor:pointer}
.btn-pill:hover{border-color:var(--text)}
.btn-pill .ic{width:15px;height:15px;fill:currentColor;flex:none}

.section-h{font-family:var(--serif);font-weight:700;font-size:1.25rem;margin:40px 0 14px;padding-top:26px;border-top:1px solid var(--line)}
.section-h:first-of-type{margin-top:0}
.placeholder-note{font-size:.85rem;color:var(--muted);border-left:2px solid var(--line);padding:4px 0 4px 14px;margin:16px 0 0;font-style:italic}

.transcript{margin:4px 0 0}
.t-turn{display:flex;gap:18px;padding:16px 0;border-bottom:1px solid var(--line)}
.t-turn:last-child{border-bottom:0}
.t-speaker{flex:0 0 150px;font-family:var(--mono);font-size:.76rem;font-weight:700;text-transform:uppercase;letter-spacing:.04em;color:var(--accent-text)}
.t-speaker .t-time{display:block;font-weight:400;color:var(--muted);font-size:.68rem;margin-top:3px;text-transform:none;letter-spacing:0}
.t-text{flex:1;font-size:.93rem;color:var(--text)}
.t-text p{margin:0}
@media (max-width:600px){.t-turn{flex-direction:column;gap:4px}.t-speaker{flex:none}}

footer{border-top:1px solid var(--line);background:var(--surface);padding:34px 20px 26px;text-align:center;margin-top:30px}
footer .social{display:flex;gap:16px;justify-content:center;margin:0 0 14px;padding:0;list-style:none}
footer .social a{color:var(--muted)}
footer .social a:hover{color:var(--accent-text)}
footer .social .ic{width:19px;height:19px;fill:currentColor;display:block}
footer p.copy{font-family:var(--mono);font-size:.74rem;color:var(--muted);margin:0}

.ep-pager{display:flex;justify-content:space-between;gap:16px;margin:36px 0 0;padding-top:24px;border-top:1px solid var(--line)}
.ep-pager a{flex:1 1 0;min-width:0;font-family:var(--sans);font-size:.82rem;color:var(--text);text-decoration:none;border:1px solid var(--line);padding:12px 16px}
.ep-pager a:hover{border-color:var(--accent)}
.ep-pager a.next{text-align:right}
.ep-pager .dir{display:block;font-family:var(--mono);font-size:.68rem;text-transform:uppercase;letter-spacing:.06em;color:var(--muted);margin-bottom:4px}
.ep-pager .ttl{display:block;font-weight:700;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}
</style>
<script type="application/ld+json">
${JSON.stringify(jsonLd, null, 2)}
</script>
</head>
<body>

<svg width="0" height="0" style="position:absolute" aria-hidden="true">
  <symbol id="i-youtube" viewBox="0 0 24 24"><path d="M23 7.5a3 3 0 0 0-2.1-2.1C19 4.9 12 4.9 12 4.9s-7 0-8.9.5A3 3 0 0 0 1 7.5 31 31 0 0 0 .5 12 31 31 0 0 0 1 16.5a3 3 0 0 0 2.1 2.1C5 19 12 19 12 19s7 0 8.9-.5a3 3 0 0 0 2.1-2.1A31 31 0 0 0 23.5 12 31 31 0 0 0 23 7.5zM9.75 15.5v-7l6 3.5z"/></symbol>
  <symbol id="i-spotify" viewBox="0 0 24 24"><path d="M12 2a10 10 0 1 0 0 20 10 10 0 0 0 0-20zm4.6 14.45a.62.62 0 0 1-.86.21c-2.35-1.44-5.3-1.76-8.79-.97a.62.62 0 1 1-.28-1.2c3.82-.88 7.09-.5 9.73 1.1a.62.62 0 0 1 .2.86zm1.23-2.74a.78.78 0 0 1-1.07.26c-2.69-1.66-6.79-2.14-9.97-1.18a.78.78 0 0 1-.45-1.5c3.63-1.1 8.15-.56 11.24 1.33a.78.78 0 0 1 .25 1.09zm.1-2.85C14.28 8.99 8.96 8.82 5.88 9.75a.94.94 0 1 1-.54-1.8c3.53-1.06 9.4-.86 13.11 1.35a.94.94 0 0 1-.95 1.61z"/></symbol>
  <symbol id="i-instagram" viewBox="0 0 24 24"><rect x="2" y="2" width="20" height="20" rx="5.5" fill="none" stroke="currentColor" stroke-width="2"/><circle cx="12" cy="12" r="4.2" fill="none" stroke="currentColor" stroke-width="2"/><circle cx="17.6" cy="6.4" r="1.4"/></symbol>
  <symbol id="i-facebook" viewBox="0 0 24 24"><path d="M22 12A10 10 0 1 0 10.4 21.9V14.9H7.9V12h2.5V9.85c0-2.47 1.47-3.84 3.72-3.84 1.08 0 2.2.19 2.2.19v2.42h-1.24c-1.22 0-1.6.76-1.6 1.54V12h2.72l-.44 2.9h-2.28v7A10 10 0 0 0 22 12z"/></symbol>
  <symbol id="i-tiktok" viewBox="0 0 24 24"><path d="M16.6 5.82c-.9-.6-1.5-1.5-1.71-2.63a4.2 4.2 0 0 1-.07-.69h-2.79v11.44c-.05 1.28-1.1 2.31-2.39 2.31a2.4 2.4 0 0 1-2.4-2.4 2.4 2.4 0 0 1 3.15-2.28V8.72a5.16 5.16 0 0 0-5.94 5.11 5.16 5.16 0 0 0 10.32 0V8.53a6.83 6.83 0 0 0 4.01 1.29V7.03a4.06 4.06 0 0 1-2.19-1.21z"/></symbol>
  <symbol id="i-linkedin" viewBox="0 0 24 24"><path d="M6.94 5a2 2 0 1 1-4 0 2 2 0 0 1 4 0zM3.2 8.75h3.5V21H3.2zM9.3 8.75h3.35v1.68h.05c.47-.88 1.6-1.8 3.3-1.8 3.53 0 4.18 2.32 4.18 5.35V21h-3.5v-5.4c0-1.29-.02-2.95-1.8-2.95-1.8 0-2.08 1.4-2.08 2.85V21H9.3z"/></symbol>
  <symbol id="i-sun" viewBox="0 0 24 24"><circle cx="12" cy="12" r="4.2" fill="none" stroke="currentColor" stroke-width="2"/><g stroke="currentColor" stroke-width="2" stroke-linecap="round"><line x1="12" y1="2.5" x2="12" y2="5"/><line x1="12" y1="19" x2="12" y2="21.5"/><line x1="2.5" y1="12" x2="5" y2="12"/><line x1="19" y1="12" x2="21.5" y2="12"/><line x1="5.1" y1="5.1" x2="6.9" y2="6.9"/><line x1="17.1" y1="17.1" x2="18.9" y2="18.9"/><line x1="5.1" y1="18.9" x2="6.9" y2="17.1"/><line x1="17.1" y1="6.9" x2="18.9" y2="5.1"/></g></symbol>
  <symbol id="i-moon" viewBox="0 0 24 24"><path d="M20.5 14.7A8.5 8.5 0 1 1 9.3 3.5a7 7 0 0 0 11.2 11.2z" fill="currentColor"/></symbol>
</svg>

<header class="site-header">
  <div class="header-inner">
    <a class="brand-link" href="../index.html" aria-label="Védelmi Horizont - kezdőlap">
      <span class="logo-mark" aria-hidden="true">
        <img class="logo-light" src="../kepek/logo_white.png" alt="" />
        <img class="logo-dark" src="../kepek/logo_black.png" alt="" />
      </span>
      <span class="header-text">
        <p class="brand-title">Védelmi Horizont</p>
        <p data-hu="Epizód oldal" data-en="Episode page">Epizód oldal</p>
      </span>
    </a>
    <div class="header-actions">
      <div class="lang" role="group" aria-label="Nyelvváltó / Language switcher">
        <button type="button" data-lang="hu" class="on">HU</button>
        <button type="button" data-lang="en">EN</button>
      </div>
      <button class="theme-toggle" id="themeToggle" type="button" aria-label="Téma váltása">
        <span class="theme-icon" aria-hidden="true">
          <svg class="icon-sun" viewBox="0 0 24 24" aria-hidden="true"><use href="#i-sun"/></svg>
          <svg class="icon-moon" viewBox="0 0 24 24" aria-hidden="true"><use href="#i-moon"/></svg>
        </span>
        <span class="label">Világos</span>
      </button>
    </div>
  </div>
</header>

<main>
  <a class="back-link" href="../index.html#panel-episodes">&#8592; <span data-hu="Összes epizód" data-en="All episodes">Összes epizód</span></a>

  <p class="article-meta">${ep.isoDate} &#183; ${ep.durationDisplay}</p>
  <h1 class="article-title">${titleEsc}</h1>

  <div class="video-block">
    <div class="ep-thumb" id="videoThumb" role="button" tabindex="0" aria-label="Lejátszás">
      <img src="../kepek/epizod_kepek/web/${ep.coverFile}" alt="${titleEsc} (Védelmi Horizont podcast borítókép)" loading="lazy" />
    </div>
  </div>
  <div class="video-actions">
    <a class="btn-pill" href="${ep.youtubeUrl}" target="_blank" rel="noopener"><svg class="ic"><use href="#i-youtube"/></svg> <span data-hu="Megnyitás a YouTube-on" data-en="Open on YouTube">Megnyitás a YouTube-on</span></a>
    <a class="btn-pill" href="${ep.spotifyUrl}" target="_blank" rel="noopener"><svg class="ic"><use href="#i-spotify"/></svg> <span data-hu="Meghallgatás Spotify-on" data-en="Listen on Spotify">Meghallgatás Spotify-on</span></a>
  </div>

  <h2 class="section-h" data-hu="Leírás" data-en="Description">Leírás</h2>
  <p class="note" style="margin:0 0 18px" data-hu="${escapeHtml(ep.participantsLine)}" data-en="${escapeHtml(ep.participantsLineEn)}">${escapeHtml(ep.participantsLine)}</p>
${renderParagraphsHtml(ep.descriptionParagraphs)}

  <h2 class="section-h" data-hu="Leirat beszélőnként" data-en="Transcript by speaker">Leirat beszélőnként</h2>
  <div class="transcript">
${renderTranscriptHtml(ep.turns)}
  </div>
  <p class="placeholder-note" data-hu="A leirat gépi hangfelismeréssel készült, ezért tartalmazhat apró pontatlanságokat." data-en="This transcript was generated automatically with speech recognition and machine translation, and may contain minor inaccuracies.">A leirat gépi hangfelismeréssel készült, ezért tartalmazhat apró pontatlanságokat.</p>
${renderPagerHtml(ep.prev, ep.next)}
</main>

<footer>
  <ul class="social">
    <li><a href="https://www.youtube.com/@VedelmiHorizont" target="_blank" rel="noopener" aria-label="YouTube"><svg class="ic"><use href="#i-youtube"/></svg></a></li>
    <li><a href="https://open.spotify.com/show/033pDLxKwYGx5RxlXy5y75?si=47af6341f9104a2c" target="_blank" rel="noopener" aria-label="Spotify"><svg class="ic"><use href="#i-spotify"/></svg></a></li>
    <li><a href="https://www.instagram.com/vedelmi.horizont?igsh=MXJ2c2h4anF5d3RkbQ%3D%3D" target="_blank" rel="noopener" aria-label="Instagram"><svg class="ic"><use href="#i-instagram"/></svg></a></li>
    <li><a href="https://www.facebook.com/people/V%C3%A9delmi-Horizont/61592563494757/" target="_blank" rel="noopener" aria-label="Facebook"><svg class="ic"><use href="#i-facebook"/></svg></a></li>
    <li><a href="https://www.linkedin.com/company/v%C3%A9delmi-horizont/posts/" target="_blank" rel="noopener" aria-label="LinkedIn"><svg class="ic"><use href="#i-linkedin"/></svg></a></li>
    <li><a href="https://www.tiktok.com/@vedelmi.horizont?is_from_webapp=1&amp;sender_device=pc" target="_blank" rel="noopener" aria-label="TikTok"><svg class="ic"><use href="#i-tiktok"/></svg></a></li>
  </ul>
  <p class="copy">© 2026 Védelmi Horizont</p>
  <p class="legal" style="font-family:var(--mono);font-size:.72rem;color:var(--muted);margin:6px 0 0"><a href="../adatvedelem.html" style="color:var(--muted)" data-hu="Adatvédelem" data-en="Privacy">Adatvédelem</a></p>
</footer>

<script>
(function () {
  var langBtns = document.querySelectorAll('.lang button');
  var lang = 'hu';
  try { var savedLang = localStorage.getItem('vh-lang'); if (savedLang === 'hu' || savedLang === 'en') lang = savedLang; } catch (e) {}

  function applyLang() {
    document.documentElement.lang = lang;
    document.querySelectorAll('[data-hu]').forEach(function (el) {
      var v = el.getAttribute('data-' + lang);
      if (v != null) el.innerHTML = v;
    });
    langBtns.forEach(function (b) { b.classList.toggle('on', b.getAttribute('data-lang') === lang); });
    applyThemeUI(currentTheme());
  }
  langBtns.forEach(function (b) {
    b.addEventListener('click', function () {
      lang = b.getAttribute('data-lang');
      try { localStorage.setItem('vh-lang', lang); } catch (e) {}
      applyLang();
    });
  });

  var root = document.documentElement;
  var themeBtn = document.getElementById('themeToggle');
  var themeIcon = themeBtn.querySelector('.theme-icon');
  var themeLabel = themeBtn.querySelector('.label');

  function systemPrefersDark() { return window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches; }
  function currentTheme() {
    var attr = root.getAttribute('data-theme');
    if (attr === 'dark' || attr === 'light') return attr;
    return systemPrefersDark() ? 'dark' : 'light';
  }
  function applyThemeUI(theme) {
    var strings = { hu: { dark: 'Sötét', light: 'Világos' }, en: { dark: 'Dark', light: 'Light' } };
    if (theme === 'dark') { themeIcon.classList.add('is-dark'); themeLabel.textContent = strings[lang].dark; }
    else { themeIcon.classList.remove('is-dark'); themeLabel.textContent = strings[lang].light; }
  }
  var savedTheme = null;
  try { savedTheme = localStorage.getItem('vh-theme'); } catch (e) {}
  var userChosen = savedTheme === 'dark' || savedTheme === 'light';
  if (userChosen) root.setAttribute('data-theme', savedTheme);
  applyThemeUI(currentTheme());
  themeBtn.addEventListener('click', function () {
    var next = currentTheme() === 'dark' ? 'light' : 'dark';
    userChosen = true;
    root.setAttribute('data-theme', next);
    try { localStorage.setItem('vh-theme', next); } catch (e) {}
    applyThemeUI(next);
  });
  if (window.matchMedia) {
    var mq = window.matchMedia('(prefers-color-scheme: dark)');
    var onSystemThemeChange = function () { if (!userChosen) applyThemeUI(currentTheme()); };
    if (mq.addEventListener) mq.addEventListener('change', onSystemThemeChange);
    else if (mq.addListener) mq.addListener(onSystemThemeChange);
  }

  // ---- Inline video facade ----
  var thumb = document.getElementById('videoThumb');
  var VIDEO_ID = '${ep.youtubeId}';
  function playVideo() {
    thumb.removeAttribute('role');
    thumb.removeAttribute('tabindex');
    thumb.removeAttribute('aria-label');
    if (location.protocol === 'file:') {
      thumb.innerHTML = '<div class="ep-fallback">' +
        '<p data-hu="A beágyazott lejátszás csak a weboldal élesben futó, szerverre feltöltött verziójában működik." data-en="Inline playback only works on the live, server-hosted version of the site.">A beágyazott lejátszás csak a weboldal élesben futó, szerverre feltöltött verziójában működik.</p>' +
        '<a href="https://www.youtube.com/watch?v=' + VIDEO_ID + '" target="_blank" rel="noopener" data-hu="Megnézem a YouTube-on" data-en="Watch on YouTube">Megnézem a YouTube-on</a>' +
        '</div>';
      applyLang();
      return;
    }
    var f = document.createElement('iframe');
    f.src = 'https://www.youtube-nocookie.com/embed/' + VIDEO_ID + '?autoplay=1&rel=0';
    f.title = 'YouTube';
    f.setAttribute('allow', 'accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share');
    f.setAttribute('allowfullscreen', '');
    thumb.innerHTML = '';
    thumb.appendChild(f);
  }
  thumb.addEventListener('click', playVideo);
  thumb.addEventListener('keydown', function (e) {
    if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); playVideo(); }
  });

  applyLang();
})();
</script>
</body>
</html>
`;
}

// Kis grid-kártya (episode-grid) - az eddigi "legfrissebb" epizód ide kerül,
// amikor egy újabb veszi át a helyét a feature-blokkban.
export function renderEpisodeCard(ep) {
  const titleEsc = escapeHtml(ep.title);
  return `      <div class="episode-card" data-ep-item data-ep-title="${escapeHtml(ep.title.toLowerCase())}">
        <a class="ep-thumb" href="epizodok/${ep.slug}.html" aria-label="Epizód oldala: ${titleEsc}">
          <img src="kepek/epizod_kepek/web/${ep.coverFile}" alt="${titleEsc} (Védelmi Horizont podcast borítókép)" loading="lazy" />
        </a>
        <div class="ep-body">
          <p class="ep-meta">${ep.isoDate} &#183; ${ep.durationDisplay}</p>
          <h3><a href="epizodok/${ep.slug}.html" style="color:inherit">${titleEsc}</a></h3>
          <a class="ep-link" href="epizodok/${ep.slug}.html" data-hu="Epizód oldala &#8594;" data-en="Episode page &#8594;">Epizód oldala &#8594;</a>
        </div>
      </div>`;
}

// A "legfrissebb epizód" feature-blokk (ugyanaz a forma a Kezdőlap és az
// Epizódok panelen, csak az utóbbin van data-ep-item/data-ep-title).
export function renderEpisodeFeature(ep, { withDataAttrs }) {
  const titleEsc = escapeHtml(ep.title);
  const attrs = withDataAttrs
    ? ` data-ep-item data-ep-title="${escapeHtml(ep.title.toLowerCase())}"`
    : ' style="margin-top:36px"';
  const titleHtml = withDataAttrs
    ? `<a href="epizodok/${ep.slug}.html" style="color:inherit">${titleEsc}</a>`
    : titleEsc;
  return `<div class="episode-feature"${attrs}>
      <div class="ep-info">
        <p class="ep-meta">${ep.isoDate} &#183; ${ep.durationDisplay} &#183; <span data-hu="LEGFRISSEBB" data-en="LATEST">LEGFRISSEBB</span></p>
        <h2>${titleHtml}</h2>
        <p data-hu="A legfrissebb teljes adás - kattints a lejátszáshoz, vagy nyisd meg az epizód oldalát a leirattal." data-en="The latest full episode - click to play, or open the episode page with the transcript.">A legfrissebb teljes adás - kattints a lejátszáshoz, vagy nyisd meg az epizód oldalát a leirattal.</p>
      </div>
      <a class="ep-thumb" href="epizodok/${ep.slug}.html" aria-label="Epizód oldala: ${titleEsc}">
        <img src="kepek/epizod_kepek/web/${ep.coverFile}" alt="${titleEsc} (Védelmi Horizont podcast borítókép)" loading="lazy" />
      </a>
    </div>`;
}

export function renderActionsRow(ep, { withMarginStyle }) {
  const style = withMarginStyle ? ' style="margin:20px 0 10px"' : '';
  return `<div class="btn-row"${style}>
      <a class="btn-pill" href="${ep.youtubeUrl}" target="_blank" rel="noopener"><svg class="ic"><use href="#i-youtube"/></svg> <span data-hu="Megnyitás a YouTube-on" data-en="Open on YouTube">Megnyitás a YouTube-on</span></a>
      <a class="btn-pill" href="${ep.spotifyUrl}" target="_blank" rel="noopener"><svg class="ic"><use href="#i-spotify"/></svg> <span data-hu="Meghallgatás Spotify-on" data-en="Listen on Spotify">Meghallgatás Spotify-on</span></a>
    </div>`;
}

export function renderEpLink(ep) {
  return `<a class="ep-link" href="epizodok/${ep.slug}.html" data-hu="Epizód oldala és leirat &#8594;" data-en="Episode page &amp; transcript &#8594;">Epizód oldala és leirat &#8594;</a>`;
}

export function renderSitemapEntry(ep) {
  return `  <url>
    <loc>https://vedelmihorizont.hu/epizodok/${ep.slug}.html</loc>
    <lastmod>${ep.isoDate}</lastmod>
    <changefreq>monthly</changefreq>
    <priority>0.8</priority>
  </url>`;
}
