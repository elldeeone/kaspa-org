import { createNavigation } from "next-intl/navigation";

import { routing } from "./routing.ts";

export const {
  Link,
  redirect,
  permanentRedirect,
  usePathname,
  useRouter,
  getPathname,
} = createNavigation(routing);
