import type errors from "../../messages/en/errors.json";
import type { Locale } from "./config.ts";

declare module "next-intl" {
  interface AppConfig {
    Locale: Locale;
    Messages: {
      errors: typeof errors;
    };
  }
}
