// Kis, függőségmentes segédfüggvények az admin API-hoz.
// Minden itt lévő logika determinisztikus - nincs LLM-hívás.

const ACCENT_MAP = {
  á: 'a', é: 'e', í: 'i', ó: 'o', ö: 'o', ő: 'o', ú: 'u', ü: 'u', ű: 'u',
  Á: 'a', É: 'e', Í: 'i', Ó: 'o', Ö: 'o', Ő: 'o', Ú: 'u', Ü: 'u', Ű: 'u',
};

export function slugify(title) {
  let s = String(title || '');
  s = s.replace(/[áéíóöőúüűÁÉÍÓÖŐÚÜŰ]/g, (ch) => ACCENT_MAP[ch] || ch);
  s = s.toLowerCase();
  s = s.replace(/[^a-z0-9]+/g, '-');
  s = s.replace(/^-+|-+$/g, '');
  s = s.replace(/-{2,}/g, '-');
  return s;
}

export function unescapeHtml(str) {
  return String(str == null ? '' : str)
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'");
}

export function escapeHtml(str) {
  return String(str == null ? '' : str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

// "1:33:02" / "39:40" / "9:05" -> { totalSeconds, display, iso }
export function parseDuration(input) {
  const raw = String(input || '').trim();
  const parts = raw.split(':').map((p) => p.trim());
  if (parts.length < 2 || parts.length > 3 || parts.some((p) => !/^\d+$/.test(p))) {
    throw new Error(`Érvénytelen időtartam-formátum: "${raw}" (várt forma: mm:ss vagy h:mm:ss)`);
  }
  let h = 0, m = 0, s = 0;
  if (parts.length === 3) {
    [h, m, s] = parts.map(Number);
  } else {
    [m, s] = parts.map(Number);
  }
  if (m >= 60 || s >= 60) {
    throw new Error(`Érvénytelen időtartam: "${raw}" (a perc/másodperc nem lehet >= 60)`);
  }
  const totalSeconds = h * 3600 + m * 60 + s;
  return { totalSeconds, display: formatSeconds(totalSeconds), iso: isoDuration(totalSeconds) };
}

// seconds -> "39:40" vagy "1:33:02" (a vezető egység nincs nullával kipótolva, a többi igen)
export function formatSeconds(totalSeconds) {
  const sec = Math.max(0, Math.round(totalSeconds));
  const h = Math.floor(sec / 3600);
  const m = Math.floor((sec % 3600) / 60);
  const s = sec % 60;
  const pad = (n) => String(n).padStart(2, '0');
  if (h > 0) return `${h}:${pad(m)}:${pad(s)}`;
  return `${m}:${pad(s)}`;
}

// seconds -> "PT1H33M2S" (ISO 8601 duration, nincs nullával kipótolás)
export function isoDuration(totalSeconds) {
  const sec = Math.max(0, Math.round(totalSeconds));
  const h = Math.floor(sec / 3600);
  const m = Math.floor((sec % 3600) / 60);
  const s = sec % 60;
  let out = 'PT';
  if (h) out += `${h}H`;
  if (m) out += `${m}M`;
  if (s || (!h && !m)) out += `${s}S`;
  return out;
}

export function extractYouTubeId(url) {
  const s = String(url || '');
  let m = s.match(/(?:youtube\.com\/watch\?v=|youtube\.com\/shorts\/|youtu\.be\/)([A-Za-z0-9_-]{6,})/);
  if (m) return m[1];
  m = s.match(/youtube-nocookie\.com\/embed\/([A-Za-z0-9_-]{6,})/);
  if (m) return m[1];
  throw new Error(`Nem sikerült YouTube videó ID-t kinyerni ebből: "${s}"`);
}

export function truncateForMeta(text, max = 158) {
  const t = String(text || '').trim().replace(/\s+/g, ' ');
  if (t.length <= max) return t;
  const cut = t.slice(0, max);
  const lastSpace = cut.lastIndexOf(' ');
  return (lastSpace > max * 0.6 ? cut.slice(0, lastSpace) : cut) + '…';
}

// Üres sorral elválasztott bekezdések -> tömb (whitespace trim, üres bekezdések kiszűrve)
export function splitParagraphs(text) {
  return String(text || '')
    .split(/\r?\n\s*\r?\n/)
    .map((p) => p.replace(/\s+/g, ' ').trim())
    .filter(Boolean);
}

// Uint8Array -> base64, darabokban (elkerüli a "Maximum call stack size exceeded"-et nagy fájloknál)
export function uint8ToBase64(bytes) {
  const CHUNK = 0x8000;
  let result = '';
  for (let i = 0; i < bytes.length; i += CHUNK) {
    const chunk = bytes.subarray(i, i + CHUNK);
    result += String.fromCharCode.apply(null, chunk);
  }
  return btoa(result);
}

export function utf8ToBase64(str) {
  return uint8ToBase64(new TextEncoder().encode(str));
}

export function jsonResponse(data, init = {}) {
  return new Response(JSON.stringify(data, null, 2), {
    ...init,
    headers: { 'content-type': 'application/json; charset=utf-8', ...(init.headers || {}) },
  });
}

export class ValidationError extends Error {}
