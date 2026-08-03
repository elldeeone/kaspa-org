import { useTranslations } from "next-intl";

import { SUPPLY_TEAL } from "../supplyVisuals";

export function SupplyIntro(): React.JSX.Element {
  const t = useTranslations("home.proof.supply.intro");

  return (
    <div className="mb-5 max-w-2xl">
      <div
        className="text-[11px] font-semibold tracking-[0.18em] uppercase"
        style={{ color: SUPPLY_TEAL }}
      >
        {t("eyebrow")}
      </div>
      <h2 className="text-primary mt-2 text-[24px] leading-[1.1] font-semibold tracking-[-0.02em] md:text-[30px]">
        {t("title")}
      </h2>
      <p className="text-muted mt-3 text-sm leading-[1.7]">{t("body")}</p>
    </div>
  );
}
