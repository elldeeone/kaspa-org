import type { NextConfig } from "next";
import createNextIntlPlugin from "next-intl/plugin";

import { defaultLocale } from "./src/i18n/locale-registry";
import { installI18nPublicationProfile } from "./src/i18n/publication-profile-node";
import {
  I18N_PUBLICATION_PROFILE_ENV,
  serializeI18nPublicationProfile,
} from "./src/i18n/publication-profile-contract";

const legacyRedirects = [
  { source: "/.well-known/llms.txt", destination: "/llms.txt" },
  { source: "/.well-known/llms-full.txt", destination: "/llms-full.txt" },
  { source: "/about-kaspa", destination: "/lore" },
  { source: "/kaspa-overview", destination: "/lore" },
  { source: "/vision", destination: "/lore" },
  { source: "/developer", destination: "/build" },
  { source: "/developers-resources", destination: "/build" },
  { source: "/developers-resourses", destination: "/build" },
  { source: "/developments", destination: "/build#developments" },
  { source: "/swaps", destination: "/hodl#buy" },
  {
    source: "/where-to-buy-kaspa-cryptocurrency-exchanges-for-trading-kas",
    destination: "/hodl#buy",
  },
  {
    source: "/kaspa-wallets-non-custodial-wallet-options-for-kas",
    destination: "/hodl#wallet",
  },
  {
    source: "/resources/block-explorer",
    destination: "https://explorer.kaspa.org/",
  },
  { source: "/about-kaspa/contact-us", destination: "/lore" },
  { source: "/about-kaspa/press-room", destination: "/lore" },
  { source: "/features", destination: "/lore" },
  { source: "/publications", destination: "/lore" },
  { source: "/whitepapers", destination: "/lore" },
  { source: "/resources/white-papers", destination: "/lore" },
  { source: "/kaspa-faq", destination: "/lore" },
] as const;

const allowedDevOrigins = Array.from(
  new Set([
    "127.0.0.1",
    "::1",
    ...(process.env.NEXT_DEV_ALLOWED_ORIGINS?.split(",")
      .map((origin) => origin.trim())
      .filter(Boolean) ?? []),
  ]),
);

const withNextIntl = createNextIntlPlugin({
  requestConfig: "./src/i18n/request.ts",
});

export default async function createNextConfig(): Promise<NextConfig> {
  const { marker, profile } = installI18nPublicationProfile();
  const serializedProfile = serializeI18nPublicationProfile(profile);
  const [buildExamples, manifest, config, siteValidation] = await Promise.all([
    import("./src/i18n/build-example-contract.ts"),
    import("./src/i18n/manifest.ts"),
    import("./src/i18n/config.ts"),
    import("./src/i18n/site-validation.ts"),
  ]);
  delete process.env[I18N_PUBLICATION_PROFILE_ENV];
  const localizedArtifactUrls = profile.enabledLocales.flatMap((locale) =>
    locale === defaultLocale
      ? []
      : buildExamples.buildExampleContract.artifactManifest.urlsByLocale[
          locale
        ],
  );

  const isProductionDeployment =
    process.env.VERCEL_ENV === "production" ||
    process.env.AWS_BRANCH?.trim().toLowerCase() === "main";

  if (config.isPseudoLocaleEnabled && isProductionDeployment) {
    throw new Error(
      "The private en-XA pseudo-locale cannot be enabled in a production deployment.",
    );
  }

  for (const locale of siteValidation.listProductionLocales()) {
    if (locale === defaultLocale) continue;
    siteValidation.assertProductionLocaleComplete(locale);
  }

  const nextConfig: NextConfig = {
    env: {
      [I18N_PUBLICATION_PROFILE_ENV]: serializedProfile,
    },
    ...(marker
      ? {
          outputFileTracingRoot: marker.repositoryRoot,
          turbopack: { root: marker.repositoryRoot },
        }
      : {}),
    allowedDevOrigins,
    // Use the request's original production-server origin for proxy rewrites.
    // Otherwise Next can emit default-locale rewrites against localhost even
    // when `next start` is bound to another host, turning them into redirects.
    skipProxyUrlNormalize: true,
    experimental: {
      globalNotFound: true,
    },
    images: {
      remotePatterns: [
        {
          protocol: "https",
          hostname: "avatars.githubusercontent.com",
        },
      ],
      dangerouslyAllowSVG: true,
      contentSecurityPolicy: "default-src 'self'; script-src 'none'; sandbox;",
    },
    async redirects() {
      return legacyRedirects.map(({ source, destination }) => ({
        source,
        destination,
        permanent: true,
      }));
    },
    async headers() {
      return localizedArtifactUrls.map((source) => ({
        source,
        headers: [{ key: "X-Robots-Tag", value: "noindex, nofollow" }],
      }));
    },
    async rewrites() {
      return {
        beforeFiles: [],
        afterFiles: [
          {
            source: "/:path*",
            has: [
              {
                type: "header",
                key: manifest.ROUTE_MISS_HEADER,
                value: "1",
              },
            ],
            destination: manifest.RESERVED_NOT_FOUND_PATHNAME,
          },
        ],
        fallback: [],
      };
    },
  };

  return withNextIntl(nextConfig);
}
