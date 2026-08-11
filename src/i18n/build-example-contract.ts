import {
  defaultLocale,
  supportedLocaleCodes,
  type Locale,
} from "./locale-registry.ts";

const sdkVersion = "2.0.0";
const sdkPublicBasePath = `/vendor/kaspa-wasm/${sdkVersion}`;
const examplesPublicBasePath = `${sdkPublicBasePath}/examples/web`;
const sourceBaseUrl = `https://github.com/kaspanet/rusty-kaspa/blob/v${sdkVersion}/wasm/examples/web`;

const examples = [
  {
    id: "server-info",
    messageKey: "serverInfo",
    name: "get-server-info",
  },
  {
    id: "dag-info",
    messageKey: "dagInfo",
    name: "get-block-dag-info",
  },
  {
    id: "block-added",
    messageKey: "blockAdded",
    name: "subscribe-block-added",
  },
  {
    id: "daa-changed",
    messageKey: "daaChanged",
    name: "subscribe-daa-changed",
  },
  {
    id: "utxo-context",
    messageKey: "utxoContext",
    name: "utxo-context",
  },
] as const;

export type BuildExample = (typeof examples)[number];
export type BuildExampleId = BuildExample["id"];
export type BuildExampleName = BuildExample["name"];
export type BuildArtifactLocale = Exclude<Locale, typeof defaultLocale>;

const artifactLocales = supportedLocaleCodes.filter(
  (locale): locale is BuildArtifactLocale => locale !== defaultLocale,
);

function pathsForLocale(locale: BuildArtifactLocale): readonly string[] {
  return Object.freeze([
    ...examples.map(({ name }) => `${name}.${locale}.html`),
    `resources/utils.${locale}.js`,
  ]);
}

const pathsByLocale = Object.freeze(
  Object.fromEntries(
    artifactLocales.map((locale) => [locale, pathsForLocale(locale)]),
  ) as Record<BuildArtifactLocale, readonly string[]>,
);
const localizedPaths = Object.freeze(
  artifactLocales.flatMap((locale) => pathsByLocale[locale]),
);
const urlsByLocale = Object.freeze(
  Object.fromEntries(
    artifactLocales.map((locale) => [
      locale,
      Object.freeze(
        pathsByLocale[locale].map(
          (pathname) => `${examplesPublicBasePath}/${pathname}`,
        ),
      ),
    ]),
  ) as Record<BuildArtifactLocale, readonly string[]>,
);

export const buildExampleContract = Object.freeze({
  sdkVersion,
  sdkLabel: `Rusty Kaspa v${sdkVersion}`,
  sdkPublicBasePath,
  examplesPublicBasePath,
  examplesRelativeDirectory: `public${examplesPublicBasePath}`,
  sourceBaseUrl,
  sourceTreeUrl: `https://github.com/kaspanet/rusty-kaspa/tree/v${sdkVersion}/wasm/examples`,
  runtimeModulePaths: Object.freeze({
    core: `${sdkPublicBasePath}/web/kaspa-core/kaspa.js`,
    rpc: `${sdkPublicBasePath}/web/kaspa-rpc/kaspa.js`,
  }),
  examples: Object.freeze([...examples]),
  artifactManifest: Object.freeze({
    locales: Object.freeze([...artifactLocales]),
    pathsByLocale,
    localizedPaths,
    urlsByLocale,
    localizedUrls: Object.freeze(
      artifactLocales.flatMap((locale) => urlsByLocale[locale]),
    ),
  }),
});

export function getBuildExampleHref(
  example: BuildExample,
  locale: Locale,
): string {
  const suffix = locale === defaultLocale ? "" : `.${locale}`;
  const returnTo =
    locale === defaultLocale ? "/build#try-live" : `/${locale}/build#try-live`;
  return `${buildExampleContract.examplesPublicBasePath}/${example.name}${suffix}.html?returnTo=${encodeURIComponent(returnTo)}`;
}

export function getBuildExampleSourceUrl(example: BuildExample): string {
  return `${buildExampleContract.sourceBaseUrl}/${example.name}.html`;
}
