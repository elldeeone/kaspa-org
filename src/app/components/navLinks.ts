import type { StablePathname } from "@/i18n/manifest";
import { localizedDestinationInventory } from "@/i18n/manifest";

type InternalNavLink = {
  id: "lore" | "hodl" | "build";
  href: StablePathname;
  external?: false;
  disabled?: boolean;
};

type ExternalNavLink = {
  id: "think" | "dagviz";
  href: string;
  external: true;
  disabled?: boolean;
};

export type NavLink = InternalNavLink | ExternalNavLink;

export const navLinks: readonly NavLink[] = [
  { id: "lore", href: localizedDestinationInventory.navigationLore.pathname },
  { id: "hodl", href: localizedDestinationInventory.navigationHodl.pathname },
  {
    id: "build",
    href: localizedDestinationInventory.navigationBuild.pathname,
  },
  { id: "think", href: "https://research.kas.pa/", external: true },
  { id: "dagviz", href: "https://kgi.kaspad.net/", external: true },
] as const;
