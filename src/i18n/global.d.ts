import type { Locale } from "./config.ts";
import type { AppMessages } from "./messages.ts";

declare module "next-intl" {
  interface AppConfig {
    Locale: Locale;
    Messages: AppMessages;
  }
}
