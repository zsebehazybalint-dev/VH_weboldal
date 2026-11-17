// Ütemezett epizód-közzétételek: a KOMMITÁLÁS (GitHub push) elhalasztva egy
// megadott időpontra. A beküldéskor csak az epInput (lásd publish.js) és az
// ütemezés ideje kerül a SCHEDULE_KV-ba - a tényleges render+patch+commit a
// cron-handler (worker/index.js `scheduled`) feladata, a LEJÁRAT
// PILLANATÁBAN aktuális GitHub-állapothoz illesztve (lásd publish.js
// resolveAgainstCurrentState kommentje).

import { resolveAgainstCurrentState, commitEpisode } from './publish.js';
import { ValidationError } from './util.js';

const PREFIX = 'pending:';
const MAX_ATTEMPTS = 5;

function key(slug) {
  return `${PREFIX}${slug}`;
}

export async function scheduleEpisode(env, epInput, publishAtIso, scheduledBy) {
  const record = {
    epInput,
    publishAt: publishAtIso,
    scheduledAt: new Date().toISOString(),
    scheduledBy: scheduledBy || null,
    attempts: 0,
    lastError: null,
    failed: false,
  };
  await env.SCHEDULE_KV.put(key(epInput.slug), JSON.stringify(record));
  return record;
}

export async function listScheduled(env) {
  const out = [];
  let cursor;
  do {
    const page = await env.SCHEDULE_KV.list({ prefix: PREFIX, cursor });
    for (const k of page.keys) {
      const raw = await env.SCHEDULE_KV.get(k.name);
      if (!raw) continue;
      const record = JSON.parse(raw);
      out.push({
        slug: record.epInput.slug,
        title: record.epInput.title,
        isoDate: record.epInput.isoDate,
        publishAt: record.publishAt,
        scheduledAt: record.scheduledAt,
        scheduledBy: record.scheduledBy,
        attempts: record.attempts,
        lastError: record.lastError,
        failed: !!record.failed,
      });
    }
    cursor = page.list_complete ? undefined : page.cursor;
  } while (cursor);
  out.sort((a, b) => a.publishAt.localeCompare(b.publishAt));
  return out;
}

export async function cancelScheduled(env, slug) {
  const k = key(slug);
  const existing = await env.SCHEDULE_KV.get(k);
  if (!existing) throw new ValidationError(`Nincs ilyen ütemezett közzététel: "${slug}".`);
  await env.SCHEDULE_KV.delete(k);
}

// A cron-handler (worker/index.js `scheduled`) ezt hívja 5 percenként.
// Minden lejárt (publishAt <= most), még nem sikertelennek jelölt tételt
// megpróbál commitolni a JELENLEGI GitHub-állapothoz illesztve. Egy tétel
// hibája nem állítja meg a többit. Siker után a KV-kulcs törlődik; hiba után
// az attempts nő és a hiba elmentődik, MAX_ATTEMPTS után a tétel "failed"
// jelzést kap, de a KV-ban marad (az admin felületen látszik, kézzel törölhető
// / Mégsem gombbal visszavonható - semmi nem vész el csendben).
export async function runDueSchedules(env) {
  const now = new Date();
  const results = [];
  let cursor;
  do {
    const page = await env.SCHEDULE_KV.list({ prefix: PREFIX, cursor });
    for (const k of page.keys) {
      const raw = await env.SCHEDULE_KV.get(k.name);
      if (!raw) continue;
      const record = JSON.parse(raw);
      if (record.failed) continue;
      if (new Date(record.publishAt) > now) continue;

      try {
        const resolved = await resolveAgainstCurrentState(env, record.epInput);
        const { commitSha, commitUrl } = await commitEpisode(env, record.epInput, resolved);
        await env.SCHEDULE_KV.delete(k.name);
        results.push({ slug: record.epInput.slug, ok: true, commitSha, commitUrl });
      } catch (e) {
        record.attempts += 1;
        record.lastError = e.message;
        if (record.attempts >= MAX_ATTEMPTS) record.failed = true;
        await env.SCHEDULE_KV.put(k.name, JSON.stringify(record));
        results.push({ slug: record.epInput.slug, ok: false, error: e.message, attempts: record.attempts, failed: record.failed });
      }
    }
    cursor = page.list_complete ? undefined : page.cursor;
  } while (cursor);
  return results;
}
