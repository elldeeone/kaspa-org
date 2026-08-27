import type { Metadata } from "next";

import { siteViewport } from "@/i18n/document";
import { getSharedClientMessages } from "@/i18n/messages";

import "../globals.css";
import {
  SiteDocumentContent,
  siteDocumentBodyClassName,
} from "../document-shell";

export const metadata: Metadata = {
  title: "WTH is Kaspa? | Local mockup",
  description:
    "A plain-English introduction to Kaspa, its blockDAG, Toccata programmability, and evolving vProgs architecture.",
};

export const viewport = siteViewport;

export default function MockupLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en" dir="ltr" suppressHydrationWarning>
      <body className={siteDocumentBodyClassName}>
        <SiteDocumentContent
          locale="en"
          messages={getSharedClientMessages("en")}
        >
          {children}
        </SiteDocumentContent>
      </body>
    </html>
  );
}
