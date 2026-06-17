import type { Metadata } from "next";
import { createPageMetadata } from "../seo";

const title = "Kaspa Logos & Assets | Kaspa";
const description =
  "Download the official Kaspa logo set — horizontal and stacked lockups, the icon, and brand colors. SVG and high-resolution PNG.";

export const metadata: Metadata = createPageMetadata({
  title,
  description,
  canonical: "/assets",
});

export default function AssetsLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return children;
}
