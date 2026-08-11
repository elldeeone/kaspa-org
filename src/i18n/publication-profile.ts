import { resolveI18nBuildTarget } from "./locale-registry.ts";
import {
  createI18nPublicationProfile,
  type I18nPublicationProfile,
} from "./publication-profile-contract.ts";

function loadI18nPublicationProfile(): I18nPublicationProfile {
  const serializedProfile =
    process.env.NEXT_PUBLIC_KASPA_I18N_PUBLICATION_PROFILE;
  if (serializedProfile) {
    return JSON.parse(serializedProfile) as I18nPublicationProfile;
  }
  return createI18nPublicationProfile(
    resolveI18nBuildTarget(process.env.NEXT_PUBLIC_KASPA_I18N_BUILD_TARGET),
  );
}

export const i18nPublicationProfile = loadI18nPublicationProfile();
