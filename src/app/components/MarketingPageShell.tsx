import type { ReactNode } from "react";

import Footer from "./Footer";
import Nav from "./Nav";

export default function MarketingPageShell({
  children,
  afterFooter,
}: {
  children: ReactNode;
  afterFooter?: ReactNode;
}) {
  const hasAfterFooter = Boolean(afterFooter);

  return (
    <div className="relative flex min-h-screen flex-col">
      <Nav />
      <main className="relative z-10 flex-1">{children}</main>
      <Footer reserveLauncherSpace={hasAfterFooter} />
      {afterFooter}
    </div>
  );
}
