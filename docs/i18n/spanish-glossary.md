# Kaspa Spanish glossary (draft)

> Status: **draft — pending fluent Spanish and Kaspa technical review**.
> These choices are implementation guidance for the private Phase 4 preview, not
> approval to publish Spanish in Production.

## Scope

This glossary targets neutral international Spanish (`es`). It favors clear,
widely understood blockchain terminology over region-specific slang. Kaspa
protocol names, code identifiers, ICU arguments, rich-text tags, URLs, commands,
addresses, and public slugs are never translated.

The sources were checked on 3 August 2026. No publicly accessible, live,
first-party Kaspa Spanish glossary was available. An archived first-party
Spanish Kaspa battle card is therefore used only as evidence of prior
terminology, never as a source for current network facts. Current Kaspa pages
remain authoritative for product meaning and naming.

## Protected names and identifiers

Keep the following exactly as written in the English source, including case:

- `Kaspa`, `KAS`, `blockDAG`, `GHOSTDAG`, `PHANTOM`, `SPECTRE`, `DAGKnight`,
  `Toccata`, `Crescendo`, `rusty-kaspa`, `Silverscript`, `OP_CAT`, and `TN12`;
- `BPS`, `RTD`, `BFT`, `ZK`, `UTXO`, `HODL`, and `BUIDL`;
- the technical community term `cypherpunk` (plural `cypherpunks`);
- product, institution, repository, language, and service names such as
  `Bitcoin`, `Ethereum`, `GitHub`, `CoinDesk`, `Golang`, and `Rust`;
- ICU arguments such as `{count}` and `{format}`, and rich-text tags such as
  `<paper>`, `<code>`, and `<github>`.

## Approved draft terminology

| English source term           | Spanish draft                              | Usage decision                                                                                                                 | Evidence                                                                                                               |
| ----------------------------- | ------------------------------------------ | ------------------------------------------------------------------------------------------------------------------------------ | ---------------------------------------------------------------------------------------------------------------------- |
| proof of work / proof-of-work | prueba de trabajo                          | Use `prueba de trabajo (PoW)` when introducing the acronym; `PoW` may then stand alone.                                        | [S2], [S3]                                                                                                             |
| fair launch / fair-launched   | lanzamiento justo / lanzado de forma justa | Translate the concept; do not leave `Fair Launch` in running copy.                                                             | [S2] records prior Kaspa usage but retains the English label; this Spanish rendering remains subject to fluent review. |
| premine                       | preminado                                  | Use the noun `preminado`; avoid a descriptive paraphrase unless grammar requires it.                                           | [S2] supports Kaspa's mining vocabulary; reviewer decision required for this compound.                                 |
| insider allocation            | asignación privilegiada                    | Means an allocation reserved for insiders, not insider trading.                                                                | Editorial clarification of [S1].                                                                                       |
| pre-sale                      | preventa                                   | Write as one word.                                                                                                             | Editorial rendering of [S1].                                                                                           |
| mainnet                       | red principal                              | Use in reader-facing prose. Preserve `mainnet` only inside code, commands, paths, or a quoted external identifier.             | [S4]                                                                                                                   |
| testnet                       | red de pruebas                             | `TN12` remains unchanged.                                                                                                      | [S4]                                                                                                                   |
| block / blocks per second     | bloque / bloques por segundo               | Preserve `BPS` when the English source uses the acronym.                                                                       | [S1], [S2], [S3]                                                                                                       |
| node                          | nodo                                       | Do not translate a node software or repository name.                                                                           | [S2], [S3], [S6]                                                                                                       |
| miner / mining                | minero / minería                           | Use `minar` as the verb.                                                                                                       | [S2], [S3]                                                                                                             |
| hashrate                      | tasa de hash                               | Prefer the expanded Spanish term in prose.                                                                                     | [S5]                                                                                                                   |
| consensus                     | consenso                                   | Use `ronda de consenso` for “consensus round”.                                                                                 | [S2], [S3], [S6]                                                                                                       |
| real-time decentralization    | descentralización en tiempo real           | Preserve `RTD` after the concept has been introduced.                                                                          | Meaning fixed by [S1].                                                                                                 |
| permissionless                | sin permisos                               | Prefer `consenso sin permisos`, `acceso sin permisos`, or the relevant noun phrase.                                            | [S6]                                                                                                                   |
| censorship resistance         | resistencia a la censura                   | Stable security term.                                                                                                          | [S6]                                                                                                                   |
| settlement                    | liquidación                                | Use for transaction/economic settlement, not for generic completion.                                                           | [S6], [S7]                                                                                                             |
| finality                      | finalidad                                  | A confirmed transaction that remains irreversible `conserva su finalidad`.                                                     | [S3], [S7]                                                                                                             |
| hard fork / hardfork          | bifurcación dura                           | Translate in reader-facing headings and prose. Preserve external identifiers and literal quoted names.                         | [S5]                                                                                                                   |
| network split / netsplit      | partición de red                           | Use `resiliente a particiones de red` for “netsplit-resilient”.                                                                | Technical rendering of [S1], pending Kaspa reviewer approval.                                                          |
| partially synchronous         | con sincronía parcial                      | Use `protocolo BFT con sincronía parcial`.                                                                                     | Technical rendering of [S1], pending Kaspa reviewer approval.                                                          |
| oblivious setup               | configuración `oblivious`                  | Keep `oblivious` as a technical loanword until a Kaspa protocol reviewer approves an exact Spanish equivalent.                 | Meaning fixed by [S1].                                                                                                 |
| covenant / covenants          | `covenant` / `covenants`                   | Keep the established technical loanword. At first use, define it as a recursive spending rule; do not use the literal `pacto`. | Meaning fixed by [S1]; no authoritative Kaspa Spanish equivalent was available.                                        |
| opcode                        | código de operación                        | Identifiers such as `OP_CAT` remain unchanged.                                                                                 | [S1], [S5] supports translating protocol category names while retaining identifiers.                                   |
| base layer                    | capa base                                  | Use for the protocol layer.                                                                                                    | [S6]                                                                                                                   |
| on-chain / off-chain          | en cadena / fuera de la cadena             | Translate in reader-facing prose; keep English only in code or official identifiers.                                           | [S7]                                                                                                                   |
| payment channel               | canal de pago                              | Use `canales de pago en cadena` when the source explicitly says on-chain.                                                      | [S7]                                                                                                                   |
| wallet                        | billetera                                  | Use consistently across navigation, CTAs, metadata, and body copy. Preserve official product names.                            | [S6] uses `billetera`; a fluent reviewer must confirm that it meets the neutral-Spanish target.                        |
| smart wallet                  | billetera inteligente                      | Do not translate a branded wallet name.                                                                                        | [S6] supports `billetera`; meaning fixed by [S1].                                                                      |
| vault                         | bóveda                                     | In Toccata copy this means a covenant-based security construction, not a generic storage folder.                               | Meaning fixed by [S1].                                                                                                 |
| native asset                  | activo nativo                              | Financial `asset` is `activo`; brand `asset` is translated separately below.                                                   | [S6] supports `activo` in blockchain contexts.                                                                         |
| open source                   | código abierto                             | Use without a hyphen.                                                                                                          | [S2]                                                                                                                   |
| contributor                   | colaborador / colaboradores                | Use ICU plural branches where a count is displayed.                                                                            | Standard UI rendering; interface fixed by the English catalog.                                                         |
| brand assets / logo assets    | recursos de marca / recursos del logotipo  | Avoid `activos` on the logo page so it cannot be confused with financial assets.                                               | Current branding context in [S8]; editorial disambiguation.                                                            |
| horizontal lockup             | composición horizontal                     | The visible group label may be shortened to `Horizontal`.                                                                      | Meaning fixed by [S8].                                                                                                 |
| stacked lockup                | composición apilada                        | The visible group label may be shortened to `Apilado`.                                                                         | Meaning fixed by [S8].                                                                                                 |
| reverse logo                  | logotipo en negativo                       | Use `En negativo` as the short variant label.                                                                                  | Branding terminology, pending fluent brand review.                                                                     |
| outline logo                  | logotipo de contorno                       | Use `Contorno` as the short variant label.                                                                                     | Branding terminology, pending fluent brand review.                                                                     |
| alt text                      | texto alternativo                          | Keep descriptions concise and describe the meaningful image variant.                                                           | [S9]                                                                                                                   |

## Style rules

1. Preserve the English catalog's complete sentence boundaries; do not build
   Spanish sentences by concatenating fragments.
2. Use sentence case, neutral vocabulary, and direct reader-facing language.
3. Use Spanish spacing around percentages (`49 %`) and natural Spanish date and
   number formatting, unless a value is a protected identifier or quoted data.
4. Preserve every ICU argument, argument type, plural/select branch, and
   rich-text tag exactly; only translate human-readable text inside branches or
   tags.
5. Keep public slugs unchanged: `/es/lore`, `/es/assets`, `/es/build`, and
   `/es/hodl`.

## Required review before approval

- A fluent reviewer must approve meaning, neutral tone, grammar, metadata, and
  accessibility copy in context on desktop and mobile.
- A Kaspa technical reviewer must approve `covenant`, `oblivious`, RTD wording,
  DAGKnight's BFT claim, `partición de red`, and `finalidad` in the LORE copy.
- A brand reviewer should confirm `En negativo`, `Contorno`, and `Apilado`
  against the actual logo files.
- Any approved change must be applied consistently across every Spanish catalog
  before Spanish can become Production-ready.

## Sources

- **S1 — Kaspa:** [LORE](https://kaspa.org/lore), current first-party source for
  Kaspa claims, protocol meanings, and protected names (accessed 3 August 2026).
- **S2 — Kaspa:** [Kaspa de un vistazo, Spanish battle card (archived first-party PDF)](https://web.archive.org/web/20240319101522/https://kaspa.org/wp-content/uploads/2024/02/Kaspa-BattleCard-2024-SP-1.pdf),
  evidence for prior Spanish use of `blockDAG`, `prueba de trabajo`, `consenso`,
  `nodo`, `minería`, `transacciones`, and `código abierto`; terminology only,
  not current network facts.
- **S3 — Ethereum:** [Prueba de trabajo (PoW)](https://ethereum.org/es/developers/docs/consensus-mechanisms/pow/),
  current first-party Spanish documentation for PoW, nodes, mining, consensus,
  blocks, transactions, and finality.
- **S4 — Ethereum:** [Redes](https://ethereum.org/es/developers/docs/networks/),
  current first-party Spanish documentation for the terms red principal and red
  de pruebas.
- **S5 — Ethereum:** [Glosario](https://ethereum.org/es/glossary/), current
  first-party Spanish definitions for `bifurcación dura` and `tasa de hash`.
- **S6 — Ethereum:** [Por qué construir en Ethereum](https://ethereum.org/es/latest/why-build-on-ethereum/),
  current first-party Spanish usage for decentralization, nodes, consensus,
  permissionless access, censorship resistance, settlement, base layer,
  wallets, and assets.
- **S7 — Ethereum:** [Canales de estado](https://ethereum.org/es/developers/docs/scaling/state-channels/),
  current first-party Spanish usage for payment channels, on-chain/off-chain,
  mainnet, settlement, and finality.
- **S8 — Kaspa:** [Kaspa logo assets](https://kaspa.org/assets), current
  first-party source for the exact logo variants and their meaning.
- **S9 — MDN:** [Cómo añadir imágenes, medios y recursos](https://developer.mozilla.org/es/docs/MDN/Writing_guidelines/Howto/Images_media),
  current primary Spanish web documentation for concise, contextual alternative
  text.
