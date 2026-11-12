// Védelmi vonal a Cloudflare Access MÖGÖTT, kódszinten is (defense-in-depth).
// A Cloudflare Access, ha be van kapcsolva az /admin* és /api/* útvonalakra,
// sikeres bejelentkezés után mindig beállítja a Cf-Access-Authenticated-User-Email
// fejlécet - ezt a kliens nem tudja meghamisítani, amíg az Access tényleg
// érvényben van a route-on. Ha az ADMIN_ALLOWED_EMAIL env var nincs beállítva,
// ez a réteg kikapcsolt állapotban marad (pl. helyi fejlesztéskor).
//
// FONTOS: a fejlécet MINDIG kiolvassuk, az allowlist állapotától függetlenül.
// Korábban az ADMIN_ALLOWED_EMAIL hiánya esetén a függvény azonnal visszatért
// `email: null`-lal, amitől az admin oldal "Access nincs beállítva"-t írt ki
// olyankor is, amikor a Cloudflare Access valójában rendben működött - ez
// órákra félrevitte a hibakeresést. A két állapot (van-e Access / van-e
// allowlist) külön kérdés, és külön is kell jelenteni őket.
export function requireAccessEmail(request, env) {
  const email = (request.headers.get('Cf-Access-Authenticated-User-Email') || '').trim().toLowerCase();
  const allowed = (env.ADMIN_ALLOWED_EMAIL || '').trim().toLowerCase();

  if (!allowed) {
    return {
      ok: true,
      email: email || null,
      warning: email
        ? `ADMIN_ALLOWED_EMAIL nincs beállítva - a kódszintű ellenőrzés ki van kapcsolva. (A Cloudflare Access érvényben van, bejelentkezve: ${email}.)`
        : 'ADMIN_ALLOWED_EMAIL nincs beállítva ÉS nem érkezett Cloudflare Access fejléc - ez az útvonal jelenleg SEMMILYEN ellenőrzés mögött nincs.',
    };
  }

  if (!email) return { ok: false, email: null, reason: 'Hiányzik a Cloudflare Access azonosítási fejléc - az /admin* útvonal nincs Access policy mögött?' };
  if (email !== allowed) return { ok: false, email, reason: `A bejelentkezett felhasználó (${email}) nem egyezik az engedélyezett admin e-mail-lel.` };
  return { ok: true, email };
}
