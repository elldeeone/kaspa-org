import type { StablePathname } from "@/i18n/site";

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
  { id: "lore", href: "/lore" },
  { id: "hodl", href: "/hodl" },
  { id: "build", href: "/build" },
  { id: "think", href: "https://research.kas.pa/", external: true },
  { id: "dagviz", href: "https://kgi.kaspad.net/", external: true },
] as const;
