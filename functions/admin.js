import { requireAccessEmail } from './_lib/access.js';

export async function onRequestGet({ request, env }) {
  const access = requireAccessEmail(request, env);
  if (!access.ok) {
    return new Response(`Hozzáférés megtagadva: ${access.reason}`, { status: 403, headers: { 'content-type': 'text/plain; charset=utf-8' } });
  }
  return new Response(renderAdminPage(access.email, access.warning), {
    headers: { 'content-type': 'text/html; charset=utf-8' },
  });
}

export function renderAdminPage(email, warning) {
  return `<!DOCTYPE html>
<html lang="hu">
<head>
<meta charset="utf-8" />
<meta name="viewport" content="width=device-width, initial-scale=1" />
<meta name="robots" content="noindex, nofollow" />
<title>Admin - Új epizód - Védelmi Horizont</title>
<style>
:root{
  --bg:#0b0f16; --surface:#11161f; --surface-2:#161d2a; --text:#e7edf5; --muted:#8c99ab;
  --line:#232c3c; --accent:#5b93c9; --ok:#4caf7d; --err:#e06464;
  --sans:'Segoe UI',Raleway,system-ui,-apple-system,Roboto,Arial,sans-serif;
  --mono:ui-monospace,'JetBrains Mono',Consolas,monospace;
}
*{box-sizing:border-box}
body{margin:0;background:var(--bg);color:var(--text);font-family:var(--sans);font-size:15px;line-height:1.55}
.wrap{max-width:780px;margin:0 auto;padding:28px 20px 80px}
h1{font-size:1.3rem;margin:0 0 4px}
.sub{color:var(--muted);font-size:.85rem;margin:0 0 24px}
.card{background:var(--surface);border:1px solid var(--line);border-radius:8px;padding:18px 20px;margin-bottom:18px}
.card h2{font-size:.95rem;margin:0 0 12px;color:var(--accent)}
label{display:block;font-size:.82rem;color:var(--muted);margin:14px 0 4px}
label:first-child{margin-top:0}
input[type=text],input[type=date],input[type=url],textarea{
  width:100%;background:var(--surface-2);border:1px solid var(--line);border-radius:5px;color:var(--text);
  font:inherit;font-size:.92rem;padding:9px 10px
}
textarea{resize:vertical;font-family:var(--mono);font-size:.82rem}
input[type=file]{display:block;margin-top:4px;font-size:.85rem;color:var(--muted)}
.hint{font-size:.76rem;color:var(--muted);margin-top:3px}
.row2{display:grid;grid-template-columns:1fr 1fr;gap:14px}
button{font:inherit;font-weight:700;font-size:.85rem;padding:11px 20px;border-radius:5px;border:1px solid var(--line);
  background:var(--surface-2);color:var(--text);cursor:pointer}
button.primary{background:var(--accent);border-color:var(--accent);color:#06101c}
button:disabled{opacity:.5;cursor:not-allowed}
.actions{display:flex;gap:10px;margin-top:18px}
#latestInfo{font-size:.85rem;color:var(--muted)}
#latestInfo b{color:var(--text)}
#msg{margin:16px 0;padding:12px 14px;border-radius:6px;font-size:.88rem;display:none}
#msg.err{display:block;background:#2a1414;border:1px solid var(--err);color:#ffb3b3}
#msg.ok{display:block;background:#102418;border:1px solid var(--ok);color:#b7f3d3}
#preview{display:none}
#preview ul{margin:8px 0 0;padding-left:20px;font-family:var(--mono);font-size:.8rem}
.badge{display:inline-block;font-family:var(--mono);font-size:.72rem;padding:2px 8px;border:1px solid var(--line);border-radius:4px;color:var(--muted)}
#charCount{float:right}
.spinner{display:inline-block}
</style>
</head>
<body>
<div class="wrap">
  <h1>Új epizód közzététele</h1>
  <p class="sub">Bejelentkezve: <b>${email || 'ismeretlen (Access nincs beállítva)'}</b> &middot; <span class="badge">vedelmihorizont.hu</span></p>
  ${warning ? `<div id="msg" class="err" style="display:block">${warning}</div>` : ''}

  <div class="card">
    <h2>Jelenlegi állapot</h2>
    <p id="latestInfo">Betöltés…</p>
  </div>

  <form id="epForm">
    <div class="card">
      <h2>Alapadatok</h2>
      <div class="row2">
        <div>
          <label for="episodeNumber">Epizódszám</label>
          <input type="text" id="episodeNumber" name="episodeNumber" />
        </div>
        <div>
          <label for="isoDate">Dátum</label>
          <input type="date" id="isoDate" name="isoDate" />
        </div>
      </div>
      <label for="title">Cím (teljes, nem csonkolt)</label>
      <input type="text" id="title" name="title" placeholder="VÉDELMI HORIZONT #021 – ..." />
      <label for="slug">URL-azonosító (slug) <span class="hint">- automatikusan a címből, felülírható</span></label>
      <input type="text" id="slug" name="slug" />
      <p class="hint" id="slugHint"></p>
      <div class="row2">
        <div>
          <label for="duration">Hossz <span class="hint">(mm:ss vagy h:mm:ss)</span></label>
          <input type="text" id="duration" name="duration" placeholder="1:04:12" />
        </div>
        <div>
          <label for="participants">Résztvevők</label>
          <input type="text" id="participants" name="participants" placeholder="Zsebeházy Bálint, Pásztor Ákos" />
        </div>
      </div>
      <label for="youtubeUrl">YouTube URL</label>
      <input type="url" id="youtubeUrl" name="youtubeUrl" placeholder="https://www.youtube.com/watch?v=..." />
      <label for="spotifyUrl">Spotify epizód URL</label>
      <input type="url" id="spotifyUrl" name="spotifyUrl" placeholder="https://open.spotify.com/episode/..." />
    </div>

    <div class="card">
      <h2>Leírás</h2>
      <label for="shortDescription">Rövid leírás <span id="charCount" class="hint">0 / 160</span></label>
      <textarea id="shortDescription" name="shortDescription" rows="2"></textarea>
      <p class="hint">Ha üresen hagyod, a teljes leírás elejéből vágja a rendszer.</p>
      <label for="fullDescription">Teljes leírás <span class="hint">- bekezdéseket üres sorral válaszd el</span></label>
      <textarea id="fullDescription" name="fullDescription" rows="6"></textarea>
    </div>

    <div class="card">
      <h2>Leirat</h2>
      <label for="speakerMap">Beszélők <span class="hint">- egy sor / beszélő, forma: SPEAKER_00 = Név</span></label>
      <textarea id="speakerMap" name="speakerMap" rows="3" placeholder="SPEAKER_00 = Zsebeházy Bálint&#10;SPEAKER_01 = Pásztor Ákos"></textarea>
      <label for="transcriptFile">Leirat fájl <span class="hint">(a *_final.json, HU+EN együtt)</span></label>
      <input type="file" id="transcriptFile" name="transcriptFile" accept="application/json,.json" />
    </div>

    <div class="card">
      <h2>Borítókép</h2>
      <label for="coverImage">Kép (JPEG, webre már optimalizált méretben)</label>
      <input type="file" id="coverImage" name="coverImage" accept="image/jpeg" />
    </div>

    <input type="hidden" name="mode" id="mode" value="preview" />
    <div id="msg"></div>

    <div id="preview" class="card">
      <h2>Előnézet</h2>
      <div id="previewBody"></div>
      <div class="actions">
        <button type="button" id="publishBtn" class="primary">Közzététel most</button>
        <button type="button" id="backBtn">Vissza a szerkesztéshez</button>
      </div>
    </div>

    <div class="actions" id="formActions">
      <button type="submit" id="previewBtn" class="primary">Előnézet</button>
    </div>
  </form>
</div>

<script>
(function () {
  var $ = function (id) { return document.getElementById(id); };
  var form = $('epForm');
  var msg = $('msg');
  var previewBox = $('preview');
  var previewBody = $('previewBody');
  var formActions = $('formActions');
  var existingSlugs = [];
  var lastSummary = null;

  function showMsg(text, kind) {
    msg.textContent = text;
    msg.className = kind;
    msg.style.display = text ? 'block' : 'none';
  }

  function slugify(title) {
    var map = {á:'a',é:'e',í:'i',ó:'o',ö:'o',ő:'o',ú:'u',ü:'u',ű:'u',Á:'a',É:'e',Í:'i',Ó:'o',Ö:'o',Ő:'o',Ú:'u',Ü:'u',Ű:'u'};
    return String(title || '').replace(/[áéíóöőúüűÁÉÍÓÖŐÚÜŰ]/g, function (c) { return map[c] || c; })
      .toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '').replace(/-{2,}/g, '-');
  }

  $('title').addEventListener('input', function () {
    if (!$('slug').dataset.manual) {
      $('slug').value = slugify($('title').value);
      checkSlug();
    }
  });
  $('slug').addEventListener('input', function () {
    $('slug').dataset.manual = '1';
    checkSlug();
  });
  function checkSlug() {
    var s = $('slug').value.trim();
    var taken = existingSlugs.indexOf(s) !== -1;
    $('slugHint').textContent = !s ? '' : (taken ? '⚠ Ez a slug már foglalt!' : 'OK, egyedi.');
  }

  $('shortDescription').addEventListener('input', function () {
    $('charCount').textContent = this.value.length + ' / 160';
  });

  fetch('/api/episode-defaults').then(function (r) { return r.json(); }).then(function (data) {
    if (data.error) { $('latestInfo').textContent = 'Hiba: ' + data.error; return; }
    existingSlugs = data.existingSlugs || [];
    $('latestInfo').innerHTML = 'Jelenlegi legfrissebb: <b>' + data.currentLatest.title + '</b> (' + data.currentLatest.isoDate + ', ' + data.currentLatest.durationDisplay + ')';
    $('episodeNumber').value = data.suggestedNumber;
    $('isoDate').valueAsDate = new Date();
  }).catch(function (e) {
    $('latestInfo').textContent = 'Nem sikerült betölteni: ' + e.message;
  });

  function renderPreviewSummary(summary) {
    var html = '<p>Új epizód: <b>' + summary.title + '</b> (<code>' + summary.slug + '</code>)</p>';
    html += '<p>' + summary.isoDate + ' &middot; ' + summary.durationDisplay + ' &middot; ' + summary.turnsCount + ' leirat-blokk &middot; beszélők: ' + summary.speakerNames.join(', ') + '</p>';
    html += '<p>Az eddigi legfrissebb (<b>' + summary.replacesLatest.title + '</b>) átkerül a rendes epizódrácsba.</p>';
    html += '<p>Módosuló/új fájlok:</p><ul>' + summary.filesChanged.map(function (f) { return '<li>' + f + '</li>'; }).join('') + '</ul>';
    previewBody.innerHTML = html;
  }

  form.addEventListener('submit', function (e) {
    e.preventDefault();
    $('mode').value = 'preview';
    showMsg('', '');
    $('previewBtn').disabled = true;
    $('previewBtn').textContent = 'Ellenőrzés…';
    var fd = new FormData(form);
    fetch('/api/episode', { method: 'POST', body: fd }).then(function (r) { return r.json().then(function (d) { return { ok: r.ok, data: d }; }); })
      .then(function (res) {
        $('previewBtn').disabled = false;
        $('previewBtn').textContent = 'Előnézet';
        if (!res.ok) { showMsg(res.data.error || 'Ismeretlen hiba.', 'err'); return; }
        lastSummary = res.data.summary;
        renderPreviewSummary(lastSummary);
        previewBox.style.display = 'block';
        formActions.style.display = 'none';
        previewBox.scrollIntoView({ behavior: 'smooth' });
      }).catch(function (e2) {
        $('previewBtn').disabled = false;
        $('previewBtn').textContent = 'Előnézet';
        showMsg('Hálózati hiba: ' + e2.message, 'err');
      });
  });

  $('backBtn').addEventListener('click', function () {
    previewBox.style.display = 'none';
    formActions.style.display = 'flex';
  });

  $('publishBtn').addEventListener('click', function () {
    $('mode').value = 'publish';
    $('publishBtn').disabled = true;
    $('publishBtn').textContent = 'Közzététel…';
    var fd = new FormData(form);
    fetch('/api/episode', { method: 'POST', body: fd }).then(function (r) { return r.json().then(function (d) { return { ok: r.ok, data: d }; }); })
      .then(function (res) {
        if (!res.ok) {
          $('publishBtn').disabled = false;
          $('publishBtn').textContent = 'Közzététel most';
          showMsg(res.data.error || 'Ismeretlen hiba.', 'err');
          return;
        }
        previewBox.style.display = 'none';
        showMsg('Közzétéve: ' + res.data.summary.url + ' - a Cloudflare Pages kb. 1 percen belül kiteszi élesben. Commit: ' + res.data.commitUrl, 'ok');
      }).catch(function (e2) {
        $('publishBtn').disabled = false;
        $('publishBtn').textContent = 'Közzététel most';
        showMsg('Hálózati hiba: ' + e2.message, 'err');
      });
  });
})();
</script>
</body>
</html>
`;
}
