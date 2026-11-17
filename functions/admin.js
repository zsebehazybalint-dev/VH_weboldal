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
.radio-row{display:flex;gap:18px;margin-top:4px}
.radio-row label{display:flex;align-items:center;gap:6px;font-size:.85rem;color:var(--text);margin:0}
.radio-row input{margin:0}
#scheduleAt{margin-top:10px;max-width:280px}
#scheduleAt[hidden]{display:none}
.pending-list{list-style:none;margin:0;padding:0}
.pending-list li{display:flex;align-items:center;justify-content:space-between;gap:10px;padding:8px 0;border-top:1px solid var(--line);font-size:.85rem}
.pending-list li:first-child{border-top:0}
.pending-list .meta{color:var(--muted);font-size:.78rem}
.pending-list .failed{color:var(--err)}
.pending-list button{padding:5px 12px;font-size:.76rem}
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

  <div class="card" id="pendingCard" style="display:none">
    <h2>Ütemezett közzétételek</h2>
    <ul class="pending-list" id="pendingList"></ul>
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
      <h2>Leírás (magyar)</h2>
      <label for="shortDescription">Rövid leírás <span id="charCount" class="hint">0 / 160</span></label>
      <textarea id="shortDescription" name="shortDescription" rows="2"></textarea>
      <p class="hint">Ha üresen hagyod, a teljes leírás elejéből vágja a rendszer. (Ez csak a meta leírás/OG-tagekhez kell, az oldalon látható szöveg mindig a teljes leírás.)</p>
      <label for="fullDescription">Teljes leírás <span class="hint">- bekezdéseket üres sorral válaszd el</span></label>
      <textarea id="fullDescription" name="fullDescription" rows="6"></textarea>
    </div>

    <div class="card">
      <h2>Leírás (angol)</h2>
      <p class="hint">Az epizódoldal EN/HU nyelvváltója ezt jeleníti meg angol nézetben - a bekezdéseknek egy-az-egyben meg kell felelniük a magyar verziónak (ugyanannyi bekezdés, ugyanott üres sor). A meta leírás/OG-tagek mindig a magyar rövid leírásból készülnek, ehhez nem kell külön angol verzió.</p>
      <label for="fullDescriptionEn">Teljes leírás (angol)</label>
      <textarea id="fullDescriptionEn" name="fullDescriptionEn" rows="6"></textarea>
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
      <label style="margin-top:18px">Közzététel időpontja</label>
      <div class="radio-row">
        <label><input type="radio" name="publishTiming" value="now" id="timingNow" checked /> Most</label>
        <label><input type="radio" name="publishTiming" value="later" id="timingLater" /> Ütemezve</label>
      </div>
      <input type="datetime-local" id="scheduleAt" step="3600" hidden />
      <p class="hint" id="scheduleHint" hidden>A commit (és így az élesedés) automatikusan megtörténik a megadott időpontban, legfeljebb ~5 perc csúszással - ezután már nincs újabb megerősítés, úgyhogy az Előnézetet még ütemezés előtt alaposan nézd át.</p>
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

  function updateTimingUI() {
    var later = $('timingLater').checked;
    $('scheduleAt').hidden = !later;
    $('scheduleHint').hidden = !later;
    $('publishBtn').textContent = later ? 'Ütemezés' : 'Közzététel most';
  }
  $('timingNow').addEventListener('change', updateTimingUI);
  $('timingLater').addEventListener('change', updateTimingUI);
  (function initScheduleDefault() {
    var d = new Date(Date.now() + 60 * 60 * 1000); // alapértelmezett: 1 óra múlva
    d.setMinutes(0, 0, 0); // óra pontosság: kerek órára igazítva
    d.setMinutes(d.getMinutes() - d.getTimezoneOffset());
    $('scheduleAt').value = d.toISOString().slice(0, 16);
  })();

  $('publishBtn').addEventListener('click', function () {
    var later = $('timingLater').checked;
    var publishAtIso = null;
    if (later) {
      if (!$('scheduleAt').value) { showMsg('Add meg az ütemezett közzététel időpontját.', 'err'); return; }
      var picked = new Date($('scheduleAt').value);
      picked.setMinutes(0, 0, 0); // óra pontosság kikényszerítése akkor is, ha a böngésző mégis engedne percet
      publishAtIso = picked.toISOString();
      if (picked.getTime() <= Date.now()) { showMsg('Az ütemezett időpontnak a jövőben kell lennie.', 'err'); return; }
    }
    $('mode').value = later ? 'schedule' : 'publish';
    $('publishBtn').disabled = true;
    $('publishBtn').textContent = later ? 'Ütemezés…' : 'Közzététel…';
    var fd = new FormData(form);
    if (publishAtIso) fd.set('publishAt', publishAtIso);
    fetch('/api/episode', { method: 'POST', body: fd }).then(function (r) { return r.json().then(function (d) { return { ok: r.ok, data: d }; }); })
      .then(function (res) {
        if (!res.ok) {
          $('publishBtn').disabled = false;
          updateTimingUI();
          showMsg(res.data.error || 'Ismeretlen hiba.', 'err');
          return;
        }
        previewBox.style.display = 'none';
        if (res.data.scheduled) {
          showMsg('Ütemezve: ' + res.data.summary.url + ' - a rendszer automatikusan közzéteszi ' + new Date(res.data.publishAt).toLocaleString('hu-HU') + '-kor.', 'ok');
          loadPending();
        } else {
          showMsg('Közzétéve: ' + res.data.summary.url + ' - a Cloudflare kb. 1 percen belül kiteszi élesben. Commit: ' + res.data.commitUrl, 'ok');
        }
      }).catch(function (e2) {
        $('publishBtn').disabled = false;
        updateTimingUI();
        showMsg('Hálózati hiba: ' + e2.message, 'err');
      });
  });

  // ---- Ütemezett közzétételek listája ----
  var pendingCard = $('pendingCard');
  var pendingList = $('pendingList');

  function renderPending(items) {
    if (!items.length) { pendingCard.style.display = 'none'; pendingList.innerHTML = ''; return; }
    pendingCard.style.display = 'block';
    pendingList.innerHTML = items.map(function (it) {
      var when = new Date(it.publishAt).toLocaleString('hu-HU');
      var statusLine = it.failed
        ? '<span class="failed">Sikertelen (' + it.attempts + ' próbálkozás) - ' + (it.lastError || '') + '</span>'
        : (it.attempts > 0 ? '<span class="meta">' + it.attempts + '. újrapróbálkozás folyamatban - ' + (it.lastError || '') + '</span>' : '');
      return '<li>' +
        '<span><b>' + it.title + '</b><br><span class="meta">Közzététel: ' + when + '</span>' + (statusLine ? '<br>' + statusLine : '') + '</span>' +
        '<button type="button" data-cancel-slug="' + it.slug + '">Mégsem</button>' +
        '</li>';
    }).join('');
  }

  function loadPending() {
    fetch('/api/schedule').then(function (r) { return r.json(); }).then(function (data) {
      if (data.error) return;
      renderPending(data.items || []);
    }).catch(function () {});
  }
  loadPending();

  pendingList.addEventListener('click', function (e) {
    var btn = e.target.closest('[data-cancel-slug]');
    if (!btn) return;
    var slug = btn.getAttribute('data-cancel-slug');
    if (!confirm('Biztosan visszavonod ezt az ütemezett közzétételt?')) return;
    btn.disabled = true;
    fetch('/api/schedule', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ action: 'cancel', slug: slug }),
    }).then(function (r) { return r.json(); }).then(function (data) {
      if (data.error) { showMsg(data.error, 'err'); btn.disabled = false; return; }
      loadPending();
    }).catch(function (e2) {
      showMsg('Hálózati hiba: ' + e2.message, 'err');
      btn.disabled = false;
    });
  });
})();
</script>
</body>
</html>
`;
}
