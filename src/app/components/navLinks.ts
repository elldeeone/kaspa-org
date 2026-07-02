export type NavLink = {
  label: string;
  href: string;
  external?: boolean;
  disabled?: boolean;
};

export const navLinks: readonly NavLink[] = [
  { label: "LORE", href: "/lore" },
  { label: "HODL", href: "/hodl" },
  { label: "BUIDL", href: "/build" },
  { label: "THINK", href: "https://research.kas.pa/", external: true },
  { label: "DAGVIZ", href: "https://kgi.kaspad.net/", external: true },
] as const;
