import { listScheduled, cancelScheduled } from '../_lib/schedule.js';
import { jsonResponse, ValidationError } from '../_lib/util.js';
import { requireAccessEmail } from '../_lib/access.js';

export async function onRequestGet({ request, env }) {
  const access = requireAccessEmail(request, env);
  if (!access.ok) return jsonResponse({ error: access.reason }, { status: 403 });
  try {
    const items = await listScheduled(env);
    return jsonResponse({ items });
  } catch (e) {
    return jsonResponse({ error: e.message }, { status: 500 });
  }
}

export async function onRequestPost({ request, env }) {
  const access = requireAccessEmail(request, env);
  if (!access.ok) return jsonResponse({ error: access.reason }, { status: 403 });
  try {
    const body = await request.json();
    if (body.action !== 'cancel') throw new ValidationError('Érvénytelen "action" (csak "cancel" támogatott).');
    if (!body.slug) throw new ValidationError('Hiányzik a "slug".');
    await cancelScheduled(env, body.slug);
    return jsonResponse({ cancelled: true, slug: body.slug });
  } catch (e) {
    const status = e instanceof ValidationError ? 400 : 500;
    return jsonResponse({ error: e.message }, { status });
  }
}
