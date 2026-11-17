import { parseEpisodeInput, resolveAgainstCurrentState, publishEpisodeNow } from '../_lib/publish.js';
import { scheduleEpisode } from '../_lib/schedule.js';
import { jsonResponse, ValidationError } from '../_lib/util.js';
import { requireAccessEmail } from '../_lib/access.js';

export async function onRequestPost({ request, env }) {
  const access = requireAccessEmail(request, env);
  if (!access.ok) return jsonResponse({ error: access.reason }, { status: 403 });

  try {
    const form = await request.formData();
    const mode = (form.get('mode') || 'preview').toString();
    if (mode !== 'preview' && mode !== 'publish' && mode !== 'schedule') {
      throw new ValidationError('Érvénytelen "mode" (preview, publish vagy schedule lehet).');
    }

    const epInput = await parseEpisodeInput(form);

    if (mode === 'preview') {
      const { summary } = await resolveAgainstCurrentState(env, epInput);
      return jsonResponse({ preview: true, summary });
    }

    if (mode === 'schedule') {
      const publishAtRaw = (form.get('publishAt') || '').toString().trim();
      if (!publishAtRaw) throw new ValidationError('Ütemezett közzétételhez add meg a közzététel időpontját.');
      const publishAt = new Date(publishAtRaw);
      if (Number.isNaN(publishAt.getTime())) throw new ValidationError(`Érvénytelen közzétételi időpont: "${publishAtRaw}".`);
      if (publishAt.getTime() <= Date.now()) throw new ValidationError('A közzétételi időpontnak a jövőben kell lennie - ha most szeretnéd kiküldeni, használd a "Közzététel most" gombot.');

      // korai, informatív ellenőrzés a jelenlegi állapothoz képest (pl. slug-ütközés) -
      // a VÉGLEGES, mérvadó ellenőrzés a tényleges lejáratkor fut le újra, lásd schedule.js.
      const { summary } = await resolveAgainstCurrentState(env, epInput);

      await scheduleEpisode(env, epInput, publishAt.toISOString(), access.email);
      return jsonResponse({ scheduled: true, summary, publishAt: publishAt.toISOString() });
    }

    // mode === 'publish'
    const { summary, commitSha, commitUrl } = await publishEpisodeNow(env, epInput);
    return jsonResponse({ published: true, summary, commitSha, commitUrl });
  } catch (e) {
    const status = e instanceof ValidationError ? 400 : 500;
    return jsonResponse({ error: e.message }, { status });
  }
}
