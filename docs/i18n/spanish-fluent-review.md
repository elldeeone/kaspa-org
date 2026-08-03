# Spanish fluent-review gate

Status: **pending**. Spanish is available only in a private Preview build and
must remain disabled in Production until this review is approved and the
separate Phase 5 launch gate is completed.

## Review build

- Commit: `________________________________________`
- Immutable Preview URL: `________________________________________`
- Review date: `____________________`
- Reviewer: `____________________`

Review the exact commit and immutable Preview deployment recorded above. A later
commit or deployment requires a new review of every changed Spanish surface.

## Required route review

Open every route on desktop and at a 320–390 px mobile width:

| Page   | Fixed Spanish URL |
| ------ | ----------------- |
| Home   | `/es`             |
| LORE   | `/es/lore`        |
| Assets | `/es/assets`      |
| Build  | `/es/build`       |
| HODL   | `/es/hodl`        |

For each route, approve:

- meaning, factual accuracy, grammar, neutral international-Spanish tone, and
  consistent terminology;
- headings, navigation, buttons, links, form guidance, validation and error
  messages, accessibility labels, image alternative text, and interaction copy;
- metadata title and description, Open Graph copy and image alternative text,
  and any structured-data copy represented on the page;
- desktop and mobile wrapping, truncation, spacing, modal/sheet behavior, and
  keyboard-readable control labels;
- every ordinary internal link and CTA staying in Spanish with the fixed English
  slugs (`/es/lore`, `/es/assets`, `/es/build`, and `/es/hodl`).

## Required metadata and Open Graph review

Private Preview pages intentionally suppress public canonical, `hreflang`, Open
Graph, and Twitter tags. Those hidden surfaces cannot be approved by inspecting
the rendered page alone.

1. Open `/es/opengraph-image` directly and approve every visible Spanish string,
   layout, wrapping, and contrast in the generated image.
2. Compare `metadata.title`, `metadata.description`, `openGraph.imageAlt`, and any
   other `openGraph` message in each `messages/es/{home,lore,assets,build,hodl}.json`
   catalog with the matching English source.
3. Compare the Spanish `errors.metadata` group with its English source and verify
   `/es/missing` renders the approved Spanish title and error copy.
4. Compare `shared.structuredData` in `messages/es/shared.json` with its English
   source. Approve the organization description and all translated structured-data
   values.

Do not approve these surfaces from memory or infer them from visible body copy.

## Required standalone-artifact review

From `/es/build#try-live`, open and run all five examples. Also inspect their
shared `resources/utils.es.js` controls:

- `get-server-info.es.html`
- `get-block-dag-info.es.html`
- `subscribe-block-added.es.html`
- `subscribe-daa-changed.es.html`
- `utxo-context.es.html`

Approve the initial instructions, status/error text, representative runtime
output, network label, and **Volver** control. Each Back link must return to
`/es/build#try-live`.

## Required technical decisions

Review the full [draft Spanish glossary](spanish-glossary.md). A Kaspa technical
reviewer must explicitly approve or replace the draft wording for `covenant`,
`oblivious`, RTD, DAGKnight's BFT description, `partición de red`, and
`finalidad`. A brand reviewer should confirm `En negativo`, `Contorno`, and
`Apilado` against the rendered logo variants.

Record every requested change before approval. Apply an approved terminology
change consistently across all catalogs, metadata, accessibility copy, and
standalone artifacts, then review the replacement Preview deployment.

## Decision

- [ ] **Approved for the Phase 4 fluent-review gate.** No Spanish copy or layout
      changes are required on the recorded commit and deployment.
- [ ] **Changes required.** Spanish remains private; requested changes are listed
      below.

Requested changes:

1. `__________________________________________________________________________`
2. `__________________________________________________________________________`
3. `__________________________________________________________________________`

Fluent reviewer signature: `____________________` Date: `____________________`

Kaspa technical reviewer: `____________________` Date: `____________________`

This sign-off completes only the Phase 4 human-review gate. It does not enable,
publish, or authorize Spanish in Production.
