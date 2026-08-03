import { getTranslations } from "next-intl/server";

import type { Locale } from "@/i18n/config";

export async function LoreClosingSection({
  locale,
}: {
  locale: Locale;
}): Promise<React.JSX.Element> {
  const t = await getTranslations({
    locale,
    namespace: "lore.article.closing",
  });

  return (
    <>
      <div className="my-14">
        <hr className="border-primary w-20 border-t-[3px]" />
      </div>

      <p className="text-secondary text-[15px] leading-[1.72]">{t("origin")}</p>
      <p className="text-secondary mt-3 text-[15px] leading-[1.72]">
        {t("summary")}
      </p>
      <p className="text-secondary mt-3 text-[15px] leading-[1.72]">
        {t("early")}
      </p>
    </>
  );
}
