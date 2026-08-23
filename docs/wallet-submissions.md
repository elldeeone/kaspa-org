# Wallet Submissions

Wallet submissions are handled through pull requests. Each pull request should
add or update exactly one complete English wallet record in
[`src/data/wallets.ts`](../src/data/wallets.ts).

## Steps

1. Add or update one wallet record, including its English `summary`, in
   [`src/data/wallets.ts`](../src/data/wallets.ts).
2. Add the wallet icon at
   [`public/hodl/wallets/<wallet-id>/icon.<ext>`](../public/hodl/wallets).
3. Use the record template below.
4. Run `npm ci` if dependencies are not installed, then run
   `npm run wallets:check`.
5. Open a pull request using the
   [wallet submission template](https://github.com/kaspamedia/kaspa-org/compare/main...?quick_pull=1&template=wallet-submission.md).

## Acceptance Criteria

A valid wallet record is not automatically accepted for listing. Maintainers may
decline submissions that are too new, unverifiable, inactive, promotional, or
unsafe.

Wallets should meet these expectations:

- Supports Kaspa mainnet.
- Has official public links for the wallet website, releases, app listings,
  documentation, or source code.
- Provides enough public evidence for maintainers to verify custody,
  validation, transparency, fees, supported platforms, and features.
- Shows signs of real community usage or maturity, such as public releases,
  active maintenance, user documentation, issue history, app store presence, or
  known use in the Kaspa community.
- Is open source, or has a clear reason for being listed despite closed-source
  code.

Open-source software wallets are preferred. Closed-source wallets may still be
listed when there is strong evidence of maturity or community usage, but they
must use `check.transparency: "caution"`.

## Submission Rules

- Add or update exactly one wallet record per pull request.
- Use one record for one wallet product. Keep OS variants together; use separate
  records for independently named products or models with their own setup and
  security characteristics.
- Use a stable lowercase, hyphen-separated `id`, for example `example-wallet`.
- Add the wallet icon at `public/hodl/wallets/<wallet-id>/icon.<ext>`.
- Set `icon` to `/hodl/wallets/<wallet-id>/icon.<ext>`.
- Use `platforms` for independently usable OSs or `paths` for components that
  must be used together, never both.
- Set wallet-level `features` and `check` defaults using the rubric below. Use
  `platformOverrides` only for genuine platform differences.
- List every acquisition path in `actions`. Use `platforms` on an action only
  when the link is OS-specific (App Store, Google Play, OS-specific downloads).
- Use official wallet links.

> **Note:** Maintainers may ask for clarification or additional evidence during
> review. If the submitted information is incomplete, unverifiable, or does not
> support the proposed wallet record, maintainers may adjust ratings, wording,
> links, OS support, feature claims, or assets, or decline the submission.

## Translations

Wallet submitters are required to provide only a short, neutral English
summary in the wallet record. Maintainers arrange translations for every
language currently published on the site before the wallet is published.
Submitters do not edit the site's locale catalogs.

If a submitter is fluent in a language currently published on the site, they
may optionally provide a translation in the pull request for review. Optional
translations are reviewed before publication. Translations for languages not
currently supported cannot be added through a wallet submission; adding a new
language starts with the
[site-wide language request process](translations.md).

A new wallet pull request may initially report a missing translation through
the localization checks. This is a maintainer publication step and does not
mean the submitter is expected to provide translations.

## Wallet Record Template

```ts
{
  id: "example-wallet",
  title: "Example Wallet",
  icon: "/hodl/wallets/example-wallet/icon.svg",
  user: "beginner",
  summary: "A short plain-English description of the wallet.",
  platforms: ["windows", "mac", "linux"],
  features: [],
  check: {
    control: "good",
    validation: "acceptable",
    transparency: "good",
    fees: "good",
  },
  actions: [
    { action: "download", link: "https://example.com/download" },
  ],
}
```

## Schema

| Field               | Required    | Notes                                                                                                            |
| ------------------- | ----------- | ---------------------------------------------------------------------------------------------------------------- |
| `id`                | yes         | Stable kebab-case identifier. Must match the icon folder name.                                                   |
| `title`             | yes         | Wallet name shown in the list. Wallets are displayed alphabetically by this value.                               |
| `icon`              | yes         | `/hodl/wallets/<id>/icon.<ext>`.                                                                                 |
| `user`              | yes         | `beginner` (approachable) or `experienced` (technical familiarity assumed).                                      |
| `summary`           | yes         | Short, neutral English description. Maintainers own translated versions.                                         |
| `platforms`         | conditional | Non-empty list of independently usable OSs. Use this or `paths`, never both.                                     |
| `paths`             | conditional | Non-empty list of platform combinations that must be used together. Use this or `platforms`, never both.         |
| `features`          | yes         | Default features inherited by each platform. Use `[]` if none.                                                   |
| `check`             | yes         | Default rating per criterion (`control`, `validation`, `transparency`, `fees`).                                  |
| `platformOverrides` | no          | Per-OS overrides for `features` and/or specific criteria in `check`. Use only when a platform genuinely differs. |
| `actions`           | yes         | Non-empty list of acquisition paths. Each has `action`, `link`, optional `platforms` to scope to specific OSs.   |

### Rating rubric

Use these values in `check` and provide evidence in the pull request. Evidence
can be official docs, source repositories, app store listings, release notes, or
screenshots.

| Criterion      | `good`                                 | `acceptable`                       | `caution`                              | `not_applicable`                                                             |
| -------------- | -------------------------------------- | ---------------------------------- | -------------------------------------- | ---------------------------------------------------------------------------- |
| `control`      | User controls the private keys.        | Do not use.                        | A custodian or third party holds keys. | Do not use.                                                                  |
| `validation`   | Runs a Kaspa node by default.          | Lets users choose a Kaspa node.    | Uses fixed wallet-controlled nodes.    | Signing-only hardware device; companion software handles network validation. |
| `transparency` | Open source with reproducible builds.  | Open source, but not reproducible. | Closed source.                         | Do not use.                                                                  |
| `fees`         | User can set a custom transaction fee. | User can choose from preset fees.  | Fees are hidden or forced.             | Do not use.                                                                  |

If you are unsure, choose the cautious rating and explain why.

### Calculated display ratings

Wallet records store only the rubric values above. The wallet finder calculates
each rating across complete usable paths. An OS filter selects paths containing
that OS; selecting `hardware` can include several companion paths. `mixed`
appears when the applicable platform ratings differ across the selected paths.
`not_applicable` ratings are excluded, so hardware `not_applicable`
plus companion-app `caution` displays as `caution`, not `mixed`.

### Action types

`action` controls the button label and store icon. Use one of:

- `app_store`: must scope `platforms: ["ios"]`.
- `google_play`: must scope `platforms: ["android"]`.
- `download`: scope `platforms` only if the installer is OS-specific. A single download URL that works for several OSs is one unscoped action.
- `open`: a web URL. Usually unscoped because the browser link is OS-agnostic.
- `view_source`: source code or release source. Leave unscoped only when the
  same source link applies to every supported platform; otherwise add one
  `view_source` action per platform-specific source link.

### Per-platform variation

If a wallet's defaults are uniform across every platform (the common case), do
not write `platformOverrides`. Use it only to express genuine differences, for
example a self-custodial wallet whose iOS build is custodial:

```ts
check: {
  control: "good",
  validation: "acceptable",
  transparency: "good",
  fees: "good",
},
platformOverrides: {
  ios: {
    check: { control: "caution" },
  },
},
```

The override merges into `check`. Unspecified criteria fall through to the
wallet-level value.

If a wallet's source repo or web URL is OS-specific, express it as multiple
`actions` with their own `platforms` scope rather than putting the links on
overrides.

### Hardware platforms

If a wallet supports `hardware`, the effective `validation` rating for the
hardware platform must be `not_applicable`. Set `check.validation` to
`not_applicable` for hardware-only wallets, or override on
`platformOverrides.hardware.check.validation` for wallets with companion apps.

For hardware wallets that require Android, iOS, Windows, macOS, or Linux
companion apps, use the companion app's validation behavior as the wallet-level
value. Declare each combination that can actually be used, then override only
the hardware platform:

```ts
check: {
  control: "good",
  validation: "caution",
  transparency: "acceptable",
  fees: "acceptable",
},
paths: [
  { platforms: ["hardware", "android"] },
  { platforms: ["hardware", "ios"] },
],
platformOverrides: {
  hardware: {
    check: {
      validation: "not_applicable",
      transparency: "caution",
    },
  },
},
```

For transparency, the `hardware` rating describes device firmware; Android,
iOS, Windows, macOS, and Linux ratings describe the corresponding companion
application. The tooltip labels those parts automatically.

Each entry in `platforms` is independently usable. Each entry in `paths` is a
combination whose components must be used together.

If the companion app lets users choose a Kaspa node, `validation: "acceptable"`
may fit. If it uses fixed wallet-controlled nodes, use `validation: "caution"`.

## Field Notes

The wallet `summary` should be neutral and concise:

- 140 characters or fewer
- single line
- no URLs

`icon` must be a local public asset:

- Preferred format: SVG.
- Raster fallback: PNG, JPG, or JPEG.
- Required path: `public/hodl/wallets/<wallet-id>/icon.<ext>`.
- Required wallet value: `/hodl/wallets/<wallet-id>/icon.<ext>`.
- SVG icons must be 100KB or smaller.
- Raster icons must be square, 512px or smaller, and 150KB or smaller.
- Do not bake a rounded square background into the icon.
- Do not use remote icon URLs.

CI validates both the wallet data and exact translation coverage with
`npm run wallets:check`. A missing English summary or a missing published
translation fails the check. Maintainers may adjust ratings, wording, links, OS
support, feature claims, translations, or assets before merge.
