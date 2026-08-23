# Wallet Submission

### Wallet name

### Official wallet page

### Wallet icon

- [ ] I added the icon at `public/hodl/wallets/<wallet-id>/icon.<ext>`
- [ ] The icon is square and does not include a baked-in rounded square background

### Change type

- [ ] Add new wallet
- [ ] Update existing wallet

### Acceptance evidence

Provide official public links that help maintainers verify the wallet and decide whether it is mature enough to list.

Source repository, or reason source is not public:

Release page or app listing:

Documentation or support page:

Evidence of community usage or maturity:

Active maintenance evidence:

### Supported platforms

List every OS the wallet runs on. Normal wallets put these in `platforms`.
Hardware wallets that require companion apps put the working combinations in
`paths`; check both `Hardware` and every supported companion app OS below.

- [ ] Windows
- [ ] macOS
- [ ] Linux
- [ ] iOS
- [ ] Android
- [ ] Hardware

### User type

- [ ] New
- [ ] Experienced

### Wallet summary

Add a short, neutral English `summary` to the same wallet object in
`src/data/wallets.ts`.
Maintainers will arrange translations for every language currently published
on the site before the wallet is published.

Summary:

#### Optional translations

If you are fluent in a language currently published on the site, you may
provide a translation for review. This is entirely optional. Translations for
languages not currently supported cannot be included through a wallet
submission; adding a new language starts with the
[site-wide language request process](https://github.com/kaspamedia/kaspa-org/blob/main/docs/translations.md).

Language:

Translation:

### Criteria ratings and evidence

Use the rating rubric in `docs/wallet-submissions.md` and provide evidence for each default in `check`. Use `platformOverrides.<os>.check` only for genuine platform differences.

For hardware-only wallets, set `check.validation` to `"not_applicable"`. If companion apps are required, set that value in `platformOverrides.hardware.check.validation` instead, then explain whether each app runs a Kaspa node, lets users choose one, or uses wallet-controlled nodes.

For transparency, the `hardware` rating describes device firmware and app OS ratings describe their companion applications. Record differences with `platformOverrides` like any other criterion.

`mixed` is calculated for display when applicable platform ratings differ and cannot be stored. `not_applicable` is ignored during that calculation and does not make a rating mixed.

| Criterion    | Proposed rating | Evidence |
| ------------ | --------------- | -------- |
| control      |                 |          |
| validation   |                 |          |
| transparency |                 |          |
| fees         |                 |          |

If any platform overrides one of these criteria, list it here:

For a hardware wallet with companion apps, list every usable path (for example, `hardware + android` and `hardware + ios`):

| Required platforms together |
| --------------------------- |
|                             |

### Features

The `features` array provides defaults. Use `platformOverrides.<os>.features` only for genuine platform differences.

2FA:

Hardware wallet support:

Multisig:

If any platform overrides the feature list, list it here:

### Acquisition actions

List every way a user can install or open the wallet. Each acquisition path is one entry in the wallet's `actions` array.

- An action without `platforms` applies to every platform the wallet supports.
- Use platform scopes when install, web, or source links differ by OS.
- App Store actions must be scoped `platforms: ["ios"]`. Google Play actions must be scoped `platforms: ["android"]`. Other actions can be scoped to any subset of `platforms` when the link genuinely differs per OS.
- Add more than one `view_source` row when different platforms use different public source repositories.

| Action      | Link | Platforms scope (omit if applies to all) |
| ----------- | ---- | ---------------------------------------- |
| app_store   |      | ios                                      |
| google_play |      | android                                  |
| download    |      |                                          |
| open        |      |                                          |
| view_source |      |                                          |

### Confirmation

- [ ] I added or updated only one wallet entry in `src/data/wallets.ts`
- [ ] The wallet entry includes its short, neutral English `summary`
- [ ] If I included an optional translation above, it is for a language currently published on the site
- [ ] I used `platforms` for independently usable OSs or `paths` for components that must be used together, never both
- [ ] This is one wallet product; independently named products or models use separate records
- [ ] `features` and `check` describe the wallet's defaults; per-OS variation lives in `platformOverrides`
- [ ] `actions` covers every acquisition path; platform-specific links use `platforms`
- [ ] Links point to official wallet pages
- [ ] I provided official links and evidence that maintainers can verify
- [ ] I ran `npm run wallets:check`
- [ ] I understand maintainers may ask for clarification, adjust unsupported claims, or decline the submission
