import type { PageSectionLink } from "../components/page-sections/types";
import type { SectionId, StartRoute } from "./types";

export const startRoutes: StartRoute[] = [
  { title: "Read chain data", href: "#try-live" },
  { title: "Pick your stack", href: "#paths" },
  { title: "Run a node", href: "#run-a-node" },
];

export const sectionLinks: PageSectionLink<SectionId>[] = [
  {
    id: "try-live",
    label: "Try live",
    compactLabel: "Live",
    href: "#try-live",
    description: "Upstream browser examples and live demos.",
  },
  {
    id: "paths",
    label: "Choose path",
    compactLabel: "Paths",
    href: "#paths",
    description: "WASM SDK, native Rust, or full-node setup.",
  },
  {
    id: "run-a-node",
    label: "Run node",
    compactLabel: "Node",
    href: "#run-a-node",
    description: "Docker one-liner to run Rusty Kaspa locally.",
  },
  {
    id: "tooling",
    label: "Tooling",
    compactLabel: "Tools",
    href: "#tooling",
    description: "Upstream libraries, infrastructure, and ecosystem projects.",
  },
  {
    id: "access",
    label: "Access",
    compactLabel: "Access",
    href: "#access",
    description: "Docs, query surfaces, node references, and test flows.",
  },
  {
    id: "developments",
    label: "Developments",
    compactLabel: "Dev",
    href: "#developments",
    description: "Follow active work and public R&D discussions.",
  },
  {
    id: "help",
    label: "Help",
    compactLabel: "Help",
    href: "#help",
    description: "Docs and community channels when you get stuck.",
  },
];

export const mobileSectionLinks: PageSectionLink<SectionId>[] = [
  {
    id: "start",
    label: "Start",
    compactLabel: "Start",
    href: "#start",
    description: "Overview and the fastest way into the stack.",
  },
  ...sectionLinks,
];
