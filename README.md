# kaspa.org

## Stack

- Next.js App Router
- React 19
- Tailwind CSS 4
- PixiJS + CreateJS for the DAG visualization
- Playwright for smoke testing

## Routes

- `/` landing page with the live DAG hero
- `/lore` protocol overview and positioning
- `/hodl` wallets, exchanges, and on-ramp links
- `/build` developer resources and API/SDK entry points

## Local Development

Install dependencies and start the dev server:

```bash
nvm use
npm install
npm run dev
```

Open `http://localhost:3000`.

For LAN device testing, use:

```bash
npm run dev:lan
```

That starts `next dev` on the detected LAN IP and prints the device-reachable
URL. If auto-detection picks the wrong host, override it with
`NEXT_DEV_HOST=192.168.1.50 npm run dev:lan`.

The AI launcher is disabled by default. Leave
`NEXT_PUBLIC_KASPA_AI_ENABLED=false` while the ASK backend is unavailable. When a
replacement backend is ready, set it to `true`, set the ASK server key before
using chat locally or on web hosting, and set the public site origin used by
external AI links. A simple starting point is:

```bash
cp .env.example .env.local
```

Then fill in the real values:

```bash
NEXT_PUBLIC_KASPA_AI_ENABLED=false
KASPA_NEWS_ASK_API_KEY=your_kaspa_news_partner_key
NEXT_PUBLIC_PUBLIC_SITE_ORIGIN=https://kaspa.org
```

When `NEXT_PUBLIC_KASPA_AI_ENABLED` is not set to `true`, the bottom launcher,
page-level AI buttons, suggested question pills, and ASK entry points are hidden.
The `/api/ask` route returns `503` without calling the upstream service.

`KASPA_NEWS_ASK_API_KEY` is a private server-side key for
`https://kaspa.news/api/ask`. Do not expose it through browser JavaScript,
`NEXT_PUBLIC_*` variables, or static frontend bundles.

`NEXT_PUBLIC_PUBLIC_SITE_ORIGIN` should point at a public site URL whose
`/llms.txt` file external AI tools can actually fetch.

`NEXT_DEV_ALLOWED_ORIGINS` remains available if you need to allow extra custom
development origins beyond the defaults used by `npm run dev:lan`.

The `/api/ask` route follows the current Kaspa.news partner API contract. It
posts server-side to `https://kaspa.news/api/ask` with `op: "query"`,
`question`, `stream: false`, and `mode: "knowledge"`, then returns the
non-streaming `answer` JSON to the browser. The upstream answer can include raw
HTML anchor tags in its source list; `src/app/api/ask/answer.ts` normalizes
http/https anchors into Markdown links before the client renders the response.
The route uses the Node runtime plus `node:https` for the upstream request
because Node/Next `fetch` adds browser-style fetch metadata that Kaspa.news
currently rejects on the private partner-key endpoint.

## Quality Checks

Run the repo checks locally before shipping changes:

```bash
npm run verify
```

Tracked Git hooks now provide a lighter local safety net:

- `pre-commit` runs `lint-staged` on staged files
- `pre-push` runs `npm run verify`

If you want to mirror CI more closely before a larger push, run:

```bash
npm run verify:full
```

The smoke suite uses Playwright. Install Chromium once on a machine, then run:

```bash
npx playwright install chromium
npm run test:e2e
```

Helpful Playwright commands:

```bash
npm run test:e2e:headed
npm run test:e2e:ui
```

Phase 4 keeps both the complete `en-XA` pseudo-site and the complete Spanish
site private. Run their full preview-build browser gates with:

```bash
npm run i18n:pseudo:generate
npm run test:e2e:i18n:pseudo
npm run test:e2e:i18n:spanish
```

For a manual local preview, build and start with the preview target, then inspect
all five routes beginning at `http://localhost:3000/en-XA` and
`http://localhost:3000/es`:

```bash
NEXT_PUBLIC_KASPA_I18N_BUILD_TARGET=preview npm run build
NEXT_PUBLIC_KASPA_I18N_BUILD_TARGET=preview npm start
```

The Preview build generates ignored `en-XA` and `es` Build-example siblings
under `public/vendor/kaspa-wasm` and keeps them available for `npm start`. After
stopping the server, remove those private derived files with:

```bash
npm run -s i18n:artifacts -- --clean
```

A Production build performs that cleanup before compiling. Preview fixtures
generate the same files only inside their isolated disposable copies.

Set `NEXT_PUBLIC_KASPA_I18N_BUILD_TARGET=preview` only in Vercel Preview. Leave
it unset or set it to `production` in Vercel Production; the production build
fails closed if either private locale is enabled there. Spanish remains pending
fluent and Kaspa technical review; terminology decisions are recorded in the
[draft Spanish glossary](docs/i18n/spanish-glossary.md).

## CI

GitHub Actions lives at `.github/workflows/ci.yml` and runs:

- `npm run lint`
- `npm run wallets:check`
- `npm run i18n:check`
- `npm run format:check`
- `npm run types:check`
- `npm run build`
- `npm run test:e2e`
- `npm run test:e2e:i18n:pseudo`
- `npm run test:e2e:i18n:spanish`

The Playwright job uploads `playwright-report/` and `test-results/` as artifacts
when either browser suite fails.

## Project Notes

- Localized route metadata and namespaces live in `src/i18n/site.ts`; route
  publication lives in `src/i18n/manifest.ts`. Guarded `[locale]` page adapters
  expose metadata through `generateMetadata`.
- The home page DAG experience is implemented from `src/dag-viz/` and mounted through the app components.
- The AI launcher requires both `NEXT_PUBLIC_KASPA_AI_ENABLED` and the route-locale
  capability in `src/i18n/site.ts`; keep the deployment flag false until a working
  ASK backend is available.
- When enabled, the AI launcher sends questions through `src/app/api/ask/route.ts`, so the browser never sees the private Kaspa.news ASK key.
- ASK source-link formatting is normalized server-side in `src/app/api/ask/answer.ts`; do not enable raw HTML rendering in the chat UI to handle upstream links.
- Keep the ASK route on the Node runtime; using server-side `fetch` for the private Kaspa.news endpoint can be rejected as browser-style traffic.

## Content Checklist

When editing content, verify:

- homepage hero copy still fits small mobile widths
- theme toggle and mobile nav still work
- home CTAs still land on the correct pages and anchors
- `/lore`, `/hodl`, and `/build` still render their primary H1 cleanly
