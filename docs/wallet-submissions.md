# Wallet Submissions

Wallet submissions are handled through pull requests. Each pull request should
add or update exactly one wallet record in
[`src/data/wallets.ts`](../src/data/wallets.ts).

## Steps

1. Add or update one wallet record in
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
must use `transparency: "caution"`.

## Submission Rules

- Add or update exactly one wallet record per pull request.
- Use a stable lowercase, hyphen-separated `id`, for example `example-wallet`.
- Add the wallet icon at `public/hodl/wallets/<wallet-id>/icon.<ext>`.
- Set `icon` to `/hodl/wallets/<wallet-id>/icon.<ext>`.
- List every supported OS in `platforms`.
- Set wallet-level `features` and `check` to the values that apply to every
  platform. Use the rating rubric below and provide evidence in the pull
  request. Use `platformOverrides` only when one platform genuinely differs.
- For hardware wallets that require companion apps, list both `hardware` and
  the supported companion app OSs. Use wallet-level ratings for the app-platform
  defaults, then add hardware-specific overrides where needed.
- List every acquisition path in `actions`. Use `platforms` on an action only
  when the link is OS-specific (App Store, Google Play, OS-specific downloads).
- Use official wallet links.

> **Note:** Maintainers may ask for clarification or additional evidence during
> review. If the submitted information is incomplete, unverifiable, or does not
> support the proposed wallet record, maintainers may adjust ratings, wording,
> links, OS support, feature claims, or assets, or decline the submission.

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

| Field               | Required | Notes                                                                                                            |
| ------------------- | -------- | ---------------------------------------------------------------------------------------------------------------- |
| `id`                | yes      | Stable kebab-case identifier. Must match the icon folder name.                                                   |
| `title`             | yes      | Wallet name shown in the list. Wallets are displayed alphabetically by this value.                               |
| `icon`              | yes      | `/hodl/wallets/<id>/icon.<ext>`.                                                                                 |
| `user`              | yes      | `beginner` (approachable) or `experienced` (technical familiarity assumed).                                      |
| `summary`           | yes      | Plain-English summary, 140 chars or fewer, single line, no URLs.                                                 |
| `platforms`         | yes      | Non-empty list of supported OSs from `windows`, `mac`, `linux`, `ios`, `android`, `hardware`.                    |
| `features`          | yes      | Default features that apply to every platform. Use `[]` if none.                                                 |
| `check`             | yes      | Default rating per criterion (`control`, `validation`, `transparency`, `fees`). Applies to every platform.       |
| `platformOverrides` | no       | Per-OS overrides for `features` and/or specific criteria in `check`. Use only when a platform genuinely differs. |
| `actions`           | yes      | Non-empty list of acquisition paths. Each has `action`, `link`, optional `platforms` to scope to specific OSs.   |

### Rating rubric

Use these values in `check` and provide evidence in the pull request. Evidence
can be official docs, source repositories, app store listings, release notes, or
screenshots.

| Criterion      | `good`                                 | `acceptable`                       | `caution`                              | `not_applicable`      |
| -------------- | -------------------------------------- | ---------------------------------- | -------------------------------------- | --------------------- |
| `control`      | User controls the private keys.        | Do not use.                        | A custodian or third party holds keys. | Do not use.           |
| `validation`   | Runs a Kaspa node by default.          | Lets users choose a Kaspa node.    | Uses fixed wallet-controlled nodes.    | Hardware device only. |
| `transparency` | Open source with reproducible builds.  | Open source, but not reproducible. | Closed source.                         | Do not use.           |
| `fees`         | User can set a custom transaction fee. | User can choose from preset fees.  | Fees are hidden or forced.             | Do not use.           |

If you are unsure, choose the cautious rating and explain why.

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

If `platforms` includes `hardware`, the effective `validation` rating for the
hardware platform must be `not_applicable`. Set `check.validation` to
`not_applicable` for hardware-only wallets, or override on
`platformOverrides.hardware.check.validation` for mixed wallets.

For hardware wallets that require Android, iOS, Windows, macOS, or Linux
companion apps, use the companion app's validation behavior as the wallet-level
value. Then override only the hardware platform:

```ts
check: {
  control: "good",
  validation: "caution",
  transparency: "acceptable",
  fees: "acceptable",
},
platformOverrides: {
  hardware: {
    check: { validation: "not_applicable" },
  },
},
```

If the companion app lets users choose a Kaspa node, `validation: "acceptable"`
may fit. If it uses fixed wallet-controlled nodes, use `validation: "caution"`.

## Field Notes

`summary` should be neutral and concise:

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

CI validates the data shape with `npm run wallets:check`. Maintainers may adjust
ratings, wording, links, OS support, feature claims, or assets before merge.
