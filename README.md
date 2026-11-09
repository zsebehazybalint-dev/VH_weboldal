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

## Telepítés Cloudflare Pages-re

1. Told fel ezt a mappát egy GitHub repository gyökerébe (ne almappába).
2. Cloudflare dashboard → **Workers & Pages** → **Create** → **Pages** → **Connect to Git**, válaszd ki a repót.
3. Build beállítások:
   - **Framework preset:** None
   - **Build command:** *(üresen hagyva)*
   - **Build output directory:** `/`
4. Deploy után rendeld hozzá a `vedelmihorizont.hu` egyedi domaint (Cloudflare Pages → Custom domains) — a `robots.txt`, `sitemap.xml` és minden oldal `canonical`/Open Graph tagje ezt a domaint feltételezi.

## Megjegyzés a tartalomról

Ez a mappa szándékosan **nem** tartalmazza a projekt nyers munkafájljait (nyers leiratok, YouTube-leírás exportok, eredeti nagyfelbontású epizódképek, csapattagok egyéb dokumentumai, nem a Védelmi Horizonthoz tartozó jogi sablonok) — csak azt, amit a böngészőnek ténylegesen ki kell szolgálnia.
