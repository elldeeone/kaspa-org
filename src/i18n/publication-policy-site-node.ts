import { authorizedI18nFixturePolicyMarker } from "./publication-policy-node.ts";
import {
  i18nFixturePublicationPolicy,
  supportedLocaleCodes,
} from "./config.ts";
import { routeIds } from "./manifest.ts";
import { assertI18nFixturePolicyReferences } from "./publication-policy-validation.ts";

assertI18nFixturePolicyReferences(
  i18nFixturePublicationPolicy,
  supportedLocaleCodes,
  routeIds,
);

export { authorizedI18nFixturePolicyMarker };
