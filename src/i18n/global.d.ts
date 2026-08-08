import type { Locale } from "./locale-registry.ts";
import type { AppMessages } from "./messages.ts";

declare module "next-intl" {
  interface AppConfig {
    Locale: Locale;
    Messages: AppMessages;
  }
}
