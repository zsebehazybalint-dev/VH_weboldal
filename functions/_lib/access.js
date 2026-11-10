// Védelmi vonal a Cloudflare Access MÖGÖTT, kódszinten is (defense-in-depth).
// A Cloudflare Access, ha be van kapcsolva az /admin* és /api/* útvonalakra,
// sikeres bejelentkezés után mindig beállítja a Cf-Access-Authenticated-User-Email
// fejlécet - ezt a kliens nem tudja meghamisítani, amíg az Access tényleg
// érvényben van a route-on. Ha az ADMIN_ALLOWED_EMAIL env var nincs beállítva,
// ez a réteg kikapcsolt állapotban marad (pl. helyi fejlesztéskor).
export function requireAccessEmail(request, env) {
  const allowed = (env.ADMIN_ALLOWED_EMAIL || '').trim().toLowerCase();
  if (!allowed) return { ok: true, email: null, warning: 'ADMIN_ALLOWED_EMAIL nincs beállítva - a kódszintű ellenőrzés ki van kapcsolva.' };
  const email = (request.headers.get('Cf-Access-Authenticated-User-Email') || '').trim().toLowerCase();
  if (!email) return { ok: false, email: null, reason: 'Hiányzik a Cloudflare Access azonosítási fejléc - az /admin* útvonal nincs Access policy mögött?' };
  if (email !== allowed) return { ok: false, email, reason: `A bejelentkezett felhasználó (${email}) nem egyezik az engedélyezett admin e-mail-lel.` };
  return { ok: true, email };
}
