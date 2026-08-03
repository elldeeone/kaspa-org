export type SectionId =
  | "start"
  | "try-live"
  | "paths"
  | "run-a-node"
  | "tooling"
  | "access"
  | "developments"
  | "help";

export type LinkItem = {
  label: string;
  href: string;
};

export type StartRoute = {
  title: string;
  href: `#${SectionId}`;
};

export type BrowserExample = {
  id: string;
  title: string;
  shortLabel: string;
  mobileTabLabel: string;
  desc: string;
  runtime: string;
  path: string;
  source: string;
};

export type PathCard = {
  tier: string;
  title: string;
  desc: string;
  links: LinkItem[];
};

export type ToolCard = {
  eyebrow: string;
  title: string;
  desc: string;
  tags: string[];
  actionLabel: string;
  href: string;
};

export type EmergingTool = {
  status: string;
  title: string;
  desc: string;
  actionLabel: string;
  href: string;
};

export type LinkGroup = {
  title: string;
  desc: string;
  links: LinkItem[];
};

export type DevelopmentCard = {
  id:
    | "channel"
    | "research"
    | "toccata"
    | "silverscript"
    | "vprogs"
    | "python"
    | "kips";
  label: string;
  title: string;
  desc: string;
  href: string;
};

export type CommunityTool = {
  type: string;
  title: string;
  desc: string;
  href: string;
};
