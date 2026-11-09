# Védelmi Horizont — weboldal

Statikus weboldal (nincs build lépés, nincs framework) a Védelmi Horizont magyar nyelvű biztonságpolitikai/OSINT podcast számára. Sima HTML + inline CSS + inline vanilla JS, oldalanként egy fájl.

## Domain és hosting

- Végleges domain: **vedelmihorizont.hu** — minden `canonical`, Open Graph `og:url`, JSON-LD `url` és a `sitemap.xml`/`robots.txt` ezt feltételezi. Ha a domain változik, ezt mindenhol át kell vezetni (egyszerű find&replace, konzisztensen volt eddig is alkalmazva).
- Hosting: Cloudflare Pages, ebből a GitHub repóból (lásd a repo gyökerének `README.md`-jét a pontos build-beállításokhoz: Framework preset None, build command üres, output directory `/`).
- `_redirects`: Cloudflare Pages / Netlify-stílusú redirect fájl, jelenleg csak a régi `vedelmi_horizont.html` → `/` 301-et tartalmazza.

## Fájlstruktúra

```
index.html              kezdőlap — Kezdőlap/Rólunk/Epizódok/Kapcsolat fülek EGY oldalon,
                         JS-sel váltva (hash-alapú deep link: #panel-episodes stb.)
adatvedelem.html         adatkezelési tájékoztató (teljes, HTML-ben)
epizodok/*.html          epizódonkénti aloldal: leírás + beszélőnkénti leirat + prev/next nav
kepek/                   logók (svg + 3 png variáns), csapattag-fotó, epizód-borítóképek
                         (kepek/epizod_kepek/web/{N}eps.jpg — ez a webre optimalizált,
                         ténylegesen használt verzió; csak ez kerül a repóba)
jog/                     letölthető adatkezelési tájékoztató (.docx) — csak a saját, semmi más
robots.txt, sitemap.xml  domain: vedelmihorizont.hu
```

**Amit szándékosan NEM teszünk be ebbe a repóba**: nyers leiratok/YouTube-leírás exportok, eredeti nagyfelbontású (nem webre optimalizált) epizódképek, a csapattagok személyes dokumentumai, bármilyen harmadik félre vonatkozó jogi sablon. Ha egy új epizód vagy kép kerül be, csak a webre kész, végleges verzióját tegyük a repóba.

## Design rendszer

- CSS változók (`:root`) minden oldalon: `--bg`, `--surface`, `--text`, `--muted`, `--line`, `--accent`, betűtípusok (`--serif`=Merriweather, `--sans`=Raleway, `--mono`=JetBrains Mono). Sötét téma: `prefers-color-scheme` + kézi `data-theme="dark/light"` felülírás, `localStorage` alapon (`vh-theme` kulcs).
- Nyelv: HU/EN kapcsoló, `data-hu`/`data-en` attribútumok + JS csere (`localStorage` kulcs: `vh-lang`). **Fontos**: a hosszú jogi szövegeket (pl. adatvedelem.html törzse) szándékosan NEM fordítottuk angolra — jogi szöveg gépi/felszínes fordítása félrevezető lehet, ez marad csak magyarul.
- Minden oldal önálló, egymástól független `<style>` blokkal — nincs közös CSS fájl. Ha valamit mindenhol módosítani kell (pl. színséma), azt minden érintett fájlban külön kell átvezetni.

## SEO-konvenciók (2026-11-09-i auditból, ezeket kell követni új tartalomnál is)

- **`<title>`**: mindig a TELJES, nem csonkolt epizódcím + `" - Védelmi Horizont"` utótag. Soha ne vágjuk mesterségesen karakterszámra — a kereső úgyis levágja a SERP-en, ha kell, de a tag maga legyen teljes.
- **meta description / og:description / twitter:description**: epizódonként EGYEDI, a tényleges tartalomra épülő szöveg (nem sablon "Üdvözöljük a X. adásban!"), kb. 150–160 karakterre vágva szóhatáron, végén "…".
- **JSON-LD `description`**: a TELJES, nem csonkolt leírás (nincs hossz-limit a structured datában).
- Minden oldalon pontosan **egy `<h1>`** legyen. A fejléc-logó "Védelmi Horizont" szövege `<p class="brand-title">`, NEM `<h1>` — csak a cikk/oldal saját címe `<h1>`.
- `og:image`/`twitter:image` mindig abszolút URL, és mindig saját tárhelyről (`https://vedelmihorizont.hu/kepek/...`), SOHA ne hotlinkoljunk YouTube CDN-t (`i.ytimg.com`) — töltsük le és tegyük `kepek/epizod_kepek/web/`-be.
- Minden epizódoldalon legyen `PodcastEpisode` JSON-LD (dátum, ISO 8601 időtartam pl. `PT1H2M41S`, `partOfSeries`, `associatedMedia`, kép).
- Minden epizódoldal lábléce tartalmazzon linket az `adatvedelem.html`-re.
- Minden epizódoldalon legyen prev/next navigáció (`.ep-pager`) a kronológiai (epizódszám) sorrend szerint.
- Új epizód felvételekor: add hozzá a `sitemap.xml`-hez, és ellenőrizd, hogy a kezdőlap "Legfrissebb epizód" gyorsgombja (`index.html`, a hero `btn-row`-ban) a ténylegesen legújabb epizódra mutat.

## robots.txt

Jelenleg letiltva: `/jog/`, `/raw_leiratok/`, `/leiratok/`, `/vh_videok/`, `/Csapat/`, minden `.txt` és `.docx`. Ezek közül csak a `/jog/` és a benne lévő docx létezik ebben a repóban (a többi a fejlesztői munkamappában maradt) — a szabályokat attól függetlenül érdemes megtartani, ha a jövőben bármelyik mappa visszakerülne.

## Jogi / adatkezelési háttér

- Üzemeltető: **Zsebeházy Bálint**, magánszemélyként (nem bejegyzett cég/egyéni vállalkozás), 1106 Budapest, Gyakorló u. 36.
- Kapcsolati űrlap: Formspree (`https://formspree.io/f/mdeevabw`) — USA-beli adatfeldolgozó, GDPR 44–49. cikk szerinti adattovábbítási kérdés NYITOTT, ellenőrizendő a Formspree mindenkori adatvédelmi tájékoztatója alapján.
- Jelenleg **nincs** cookie/analitika a honlapon. Ha bevezetünk bármilyen látogatottságmérést (akár cookie-mentes, akár GA4-szerű), az `adatvedelem.html`-t frissíteni KELL, és ha sütialapú, cookie banner is szükséges lehet.
- Az `adatvedelem.html` a hiteles, olvasható verzió; a `jog/Adatkezelesi_tajekoztato_Vedelmi_Horizont.docx` csak letölthető másolat — ha az egyiket módosítod, a másikat is vezesd át.

## Amikor tartalmat szerkesztesz

- Epizódoldal létrehozásakor használd a legutóbbi epizódfájlt sablonként (fejléc/lábléc/CSS struktúra azonos mindegyiken) — ne írj újra mindent nulláról.
- `index.html` epizód-rácsába új kártya felvételekor: `data-ep-item` + `data-ep-title` (kisbetűs, keresőmezőhöz kell), `alt` szöveg a borítóképen (sose maradjon üres), és a kezdőlap teteji "Legfrissebb epizód" gomb frissítése.
