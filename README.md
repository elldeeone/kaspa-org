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

Production publishes each reviewed locale atomically. The `en-XA` pseudo-locale
is test-only. Run all three full browser gates with:

```bash
npm run i18n:pseudo:generate
npm run test:e2e:i18n:pseudo
npm run test:e2e:i18n:preview
npm run test:e2e:i18n:production-locales
```

For a manual reviewer build, use the preview target to include any complete
preview locales without the synthetic pseudo-locale:

```bash
NEXT_PUBLIC_KASPA_I18N_BUILD_TARGET=preview npm run build
NEXT_PUBLIC_KASPA_I18N_BUILD_TARGET=preview npm start
```

Use the test target when full-site pseudo-locale QA is required:

```bash
NEXT_PUBLIC_KASPA_I18N_BUILD_TARGET=test npm run build
NEXT_PUBLIC_KASPA_I18N_BUILD_TARGET=test npm start
```

Production generates ignored `es`, `de`, `fr`, `zh-CN`, `ru`, `id-ID`, `pt-BR`,
`ja`, and `ko` Build-example siblings under `public/vendor/kaspa-wasm`. Test also
generates `en-XA`. After stopping the server, remove those derived files with:

```bash
npm run -s i18n:artifacts -- --clean
```

Browser-test fixtures generate the same files only inside their isolated
disposable copies.

`NEXT_PUBLIC_KASPA_I18N_BUILD_TARGET` selects which locales exist in a build; it
cannot change an already-built site. Use `preview` for a dedicated reviewer
deployment, including its Vercel Production environment when that project is
not the public site. Never use `test` in Vercel Production: the build fails
closed if the test-only pseudo-locale is enabled there. Locale launch state
lives in `src/i18n/locale-registry.ts`: a real locale becomes public across
every route only when its lifecycle changes to `production`.

## Language Contributions

To suggest a translation correction, volunteer as a translator or reviewer, or
request a new site language, follow the
[translation contribution process](docs/translations.md). Requesters provide
plain-language information, the locale and language endonym when known, and
their fluency or reviewer availability. Maintainers own repository placement
and publish each approved locale atomically across the complete site.

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
- `npm run test:e2e:i18n:preview`
- `npm run test:e2e:i18n:production-locales`
- `npm run test:e2e:ai`

The Playwright jobs upload `playwright-report/` and `test-results/` as artifacts
when a browser suite fails.

## Project Notes

- Route topology, namespaces, and sitemap settings live in
  `src/i18n/manifest.ts`; locale lifecycle lives in
  `src/i18n/locale-registry.ts`, and localized metadata is created in
  `src/i18n/site.ts`. Guarded `[locale]` page adapters in
  `src/i18n/page-route.ts` expose metadata through `generateMetadata`.
- `src/i18n/publication-profile-node.ts` is the only marker-backed fixture
  adapter. It installs the normalized `publication-profile-contract.ts` shape,
  `publication-profile.ts` reads it, and browser-safe runtime queries live in
  `src/i18n/publication.ts`.
- Build-example SDK versions, names, paths, source URLs, and localized artifact
  inventory live in `src/i18n/build-example-contract.ts`; Bash reads that
  contract through `scripts/i18n/print-build-example-contract.mts`.
- Shared font/provider/analytics document primitives live in
  `src/app/document-shell.tsx`; JSON-LD serialization lives in
  `src/i18n/document.ts`. Next layout and global-not-found files keep ownership
  of their explicit `html`, `head`, and `body` elements.
- Language-selector options and eligibility live in
  `src/app/components/language-selector-model.ts`; `src/i18n/navigation.ts`
  uses `next-intl` for known-route locale switches, while
  `src/i18n/pathname.ts` preserves unknown-path encoding safely.
- The home page DAG experience is implemented from `src/dag-viz/` and mounted through the app components.
- The AI launcher requires both `NEXT_PUBLIC_KASPA_AI_ENABLED` and the
  route-locale capability in `src/i18n/site-capabilities.ts`; keep the deployment
  flag false until a working ASK backend is available.
- When enabled, the AI launcher sends questions through `src/app/api/ask/route.ts`, so the browser never sees the private Kaspa.news ASK key.
- ASK source-link formatting is normalized server-side in `src/app/api/ask/answer.ts`; do not enable raw HTML rendering in the chat UI to handle upstream links.
- Keep the ASK route on the Node runtime; using server-side `fetch` for the private Kaspa.news endpoint can be rejected as browser-style traffic.

## Content Checklist

When editing content, verify:

- homepage hero copy still fits small mobile widths
- theme toggle and mobile nav still work
- home CTAs still land on the correct pages and anchors
- `/lore`, `/hodl`, and `/build` still render their primary H1 cleanly
