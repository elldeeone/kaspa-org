import type { StablePathname } from "@/i18n/site";

type InternalNavLink = {
  label: string;
  href: StablePathname;
  external?: false;
  disabled?: boolean;
};

type ExternalNavLink = {
  label: string;
  href: string;
  external: true;
  disabled?: boolean;
};

export type NavLink = InternalNavLink | ExternalNavLink;

export const navLinks: readonly NavLink[] = [
  { label: "LORE", href: "/lore" },
  { label: "HODL", href: "/hodl" },
  { label: "BUIDL", href: "/build" },
  { label: "THINK", href: "https://research.kas.pa/", external: true },
  { label: "DAGVIZ", href: "https://kgi.kaspad.net/", external: true },
] as const;
