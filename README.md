# Védelmi Horizont — weboldal

Statikus weboldal (sima HTML/CSS/JS, build lépés nélkül) a Védelmi Horizont biztonságpolitikai/OSINT podcast számára.

## Szerkezet

```
index.html              kezdőlap (Kezdőlap / Rólunk / Epizódok / Kapcsolat fülek)
adatvedelem.html         adatkezelési tájékoztató
epizodok/*.html          epizódonkénti aloldalak (leírás + leirat)
kepek/                   logók, csapattag-fotó, epizód-borítóképek
jog/                     letölthető adatkezelési tájékoztató (.docx)
robots.txt, sitemap.xml  keresőmotor-konfiguráció (domain: vedelmihorizont.hu)
_redirects                Cloudflare Pages / Netlify-stílusú redirect szabályok
```

Nincs csomagkezelő, build eszköz vagy függőség — a mappa tartalma 1:1 megegyezik azzal, amit a böngészőnek ki kell szolgálni.

## Telepítés Cloudflare Workers-re

Figyelem: ez a projekt a Cloudflare **Workers** platformon fut, **nem** a klasszikus Pages-en — az `/admin` oldal és az `/api/*` végpontok enélkül nem működnek (lásd [ADMIN_SETUP.md](ADMIN_SETUP.md)).

1. Told fel ezt a mappát egy GitHub repository gyökerébe (ne almappába).
2. Cloudflare dashboard → **Workers & Pages** → **Create** → **Workers** → **Connect to Git**, válaszd ki a repót.
3. Build beállítások:
   - **Build command:** `npx wrangler deploy`
   - Minden egyéb a repó gyökerében lévő `wrangler.toml`-ból jön (Worker név, entry point, statikus asset-ek, env var-ok).
4. A `GITHUB_TOKEN`-t Secret-ként kell felvenni (Settings → Variables and Secrets) — a nem-titkos változók a `wrangler.toml` `[vars]` blokkjában vannak, mert a dashboardon felvett sima változókat a `wrangler deploy` minden deploykor törli.
5. Deploy után rendeld hozzá a `vedelmihorizont.hu` egyedi domaint (Settings → Domains & Routes) — a `robots.txt`, `sitemap.xml` és minden oldal `canonical`/Open Graph tagje ezt a domaint feltételezi.

## Megjegyzés a tartalomról

Ez a mappa szándékosan **nem** tartalmazza a projekt nyers munkafájljait (nyers leiratok, YouTube-leírás exportok, eredeti nagyfelbontású epizódképek, csapattagok egyéb dokumentumai, nem a Védelmi Horizonthoz tartozó jogi sablonok) — csak azt, amit a böngészőnek ténylegesen ki kell szolgálnia.
