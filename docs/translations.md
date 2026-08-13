# Translation Contributions

Kaspa.org accepts corrections to published translations, translator or reviewer
volunteers, and requests for new site languages. English, Spanish, German,
French, Simplified Chinese, Russian, Bahasa Indonesia, Brazilian Portuguese,
Japanese, and Korean are published.
`en-XA` is a test-only, no-index pseudo-locale used for quality assurance.

## Visitor Language Selection

On an unprefixed URL, the site selects the closest published language from the
visitor's saved language choice and browser preferences. A choice made in the
language selector is saved for the browser session and takes priority over the
browser setting. Explicit locale URLs such as `/fr/build` always win.

Traditional Chinese browser preferences do not fall back to the Simplified
Chinese (`zh-CN`) translation. They continue to English unless the visitor has
also requested another published language. Test-only and unpublished locales
never participate in automatic selection.

## Make a Request

Open the repository's **New issue** page and choose **Language request**. Provide:

- the request type and a plain-language explanation;
- the language, its endonym, and the locale code when known;
- your fluency and any translator or reviewer availability.

For a correction, also include the affected page, the existing text, and the
proposed wording. Requesters do not need to edit locale catalogs or generated
localized files unless a maintainer asks them to.

## Review and Publication

Maintainers decide where approved wording belongs in the repository and keep
the repository catalogs as the source of truth. New languages are not added
through wallet submissions or partial-page translation pull requests.

Before publication, a locale must be complete and reviewed across the full site,
including supporting content such as metadata and error pages. Maintainers
publish the approved locale atomically so visitors never receive a partially
translated site.
