# Admin oldal - új epizód közzététele - beüzemelési útmutató

Ez az oldal (`/admin`) a Cloudflare **Workers** platformján fut (a `vh-weboldal`
projekt a dashboardon a "Workers & Pages" alatt van, de ténylegesen Workers,
nem klasszikus Pages - a build parancsa `npx wrangler deploy`). Ezért van a
repó gyökerében egy `wrangler.toml` + `worker/index.js`: ez egyetlen Worker
belépési pont, ami a `functions/` mappában lévő kódot route-olja kézzel a
`/admin` és `/api/*` útvonalakra, a többi kérést pedig a statikus fájlokra
(assets binding) engedi át. Ha ezt elfelejtenéd és visszaállítanád a sima
Pages Functions feltételezést, a build ugyanazzal a hibával fog elállni,
mint amivel ez a migráció született.

A kódot sem én, sem a form nem tudja magától élesbe tenni - ehhez a lenti
lépéseket **neked** kell egyszer, kézzel elvégezned a GitHub és a Cloudflare
felületén. Utána minden további epizód már csak a form kitöltése.

## 1. GitHub Personal Access Token (fine-grained)

1. GitHub → Settings → Developer settings → **Personal access tokens → Fine-grained tokens** → Generate new token.
2. **Repository access**: "Only select repositories" → válaszd ki ezt az egy repót (`VH_weboldal`).
3. **Permissions** → Repository permissions → **Contents: Read and write**. Minden mást hagyj "No access"-en.
4. Lejárat: állíts be egy dátumot (pl. 1 év), és naptáridőzítsd magadnak a megújítást - ha lejár, az admin oldal hibát fog dobni publikáláskor, amíg nem cseréled.
5. Mentsd el a tokent valahova biztonságosan (jelszókezelő) - ez kerül majd a Cloudflare Worker titkos környezeti változójába.

## 2. Cloudflare Worker environment variable-ök

Cloudflare dashboard → Workers & Pages → **vh-weboldal** → **Settings → Variables and Secrets**:

| Név | Érték | Típus |
|---|---|---|
| `GITHUB_TOKEN` | az 1. lépésben létrehozott token | **Secret (encrypted)** |
| `GITHUB_OWNER` | `zsebehazybalint-dev` (vagy a repó tulajdonosa) | sima változó |
| `GITHUB_REPO` | `VH_weboldal` | sima változó |
| `GITHUB_BRANCH` | `main` | sima változó |
| `ADMIN_ALLOWED_EMAIL` | a saját Google/Cloudflare Access emailed (pl. `zsebehazybalint@gmail.com`) | sima változó |

Mentés után **újra kell deploy-olni** (vagy egy üres commit push-ával, vagy a dashboardon "Retry deployment"), hogy a Functions megkapják az új env var-okat.

## 3. Cloudflare Access - az `/admin` és `/api/*` védelme

Ez a legfontosabb lépés - enélkül BÁRKI, aki ismeri az URL-t, tudna epizódot
közzétenni a nevedben.

1. Cloudflare dashboard → **Zero Trust** → Access → Applications → **Add an application** → **Self-hosted**.
2. Domain: `vedelmihorizont.hu`, Path: `/admin*` - majd adj hozzá egy **második** alkalmazást ugyanígy `/api/*` path-dal is (vagy egy policy-t, ami mindkettőt lefedi, pl. két külön "Application" bejegyzéssel, mert a path-matching alkalmazásonként egy mintát enged).
3. **Policy**: Action = Allow, Include = "Emails" → add meg a saját email címedet (ugyanazt, amit az `ADMIN_ALLOWED_EMAIL`-be írtál).
4. Identity provider: elég a "One-time PIN" (email-re küldött kód) is, de ha van Google-fiókod társítva a Cloudflare Access-hez, az kényelmesebb.
5. Mentés után teszteld: nyisd meg `https://vedelmihorizont.hu/admin`-t privát ablakban - egy Cloudflare Access bejelentkező képernyőt kell látnod, csak a megadott emaillel engedi tovább.

## 4. Első kipróbálás

1. Jelentkezz be az `/admin`-ra.
2. A "Jelenlegi állapot" doboznak be kell töltenie a jelenlegi legfrissebb epizódot (`GET /api/episode-defaults` hívás a háttérben) - ha hibát ír ki, az env var-ok vagy a token hibás.
3. Tölts ki egy **teszt** epizódot (nyugodtan kitalált adatokkal, de érvényes leirat-JSON-nal), nyomj "Előnézet"-et, nézd át a listát, majd ha minden stimmel, "Közzététel most".
4. Ellenőrizd a GitHub repóban, hogy a commit megjelent (`https://github.com/<owner>/<repo>/commits/main`), és kb. 1 percen belül a Cloudflare dashboard **Deployments** fülén is (vh-weboldal projekt).
5. Nézd meg élesben az új epizód oldalát és az index.html-t - ha valami nem stimmel, egy `git revert` a commit-on azonnal visszaállítja az előző állapotot.

## Mit NEM old meg ez a rendszer

- A nyers hangfelismerés, beszélő-elkülönítés (diarizáció) és a HU/EN
  LLM-es tisztítás/fordítás továbbra is a te meglévő munkafolyamatod
  (whisperX → `*_llm_cleaned.json` → `*_final.json`). A form csak a
  **`*_final.json`**-t várja bemenetként.
- A borítókép **nem kerül automatikusan átméretezésre** - webre már kész
  méretben (JPEG) kell feltölteni, ahogy eddig is.
