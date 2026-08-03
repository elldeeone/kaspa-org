import type errors from "../../messages/en/errors.json";
import type home from "../../messages/en/home.json";
import type shared from "../../messages/en/shared.json";
import type { Locale } from "./config.ts";

declare module "next-intl" {
  interface AppConfig {
    Locale: Locale;
    Messages: {
      errors: typeof errors;
      home: typeof home;
      shared: typeof shared;
    };
  }
}
