import { useLocale, useTranslations } from "next-intl";
import { useMemo } from "react";

import { SOMPI_PER_KAS } from "../emissionConstants";
import { Placeholder } from "../supplyVisuals";

type SupplyComparisonGridProps = {
  circulatingSompi: bigint | null;
  expectedSompi: bigint | null;
};

export function SupplyComparisonGrid({
  circulatingSompi,
  expectedSompi,
}: SupplyComparisonGridProps): React.JSX.Element {
  const locale = useLocale();
  const t = useTranslations("home.proof.supply.comparison");
  const integerFormat = useMemo(() => new Intl.NumberFormat(locale), [locale]);

  const formatKas = (sompi: bigint) =>
    integerFormat.format(sompi / SOMPI_PER_KAS);

  return (
    <div className="grid gap-6 sm:grid-cols-2">
      <div>
        <div className="text-muted mb-1.5 text-xs tracking-wider uppercase">
          {t("nodeReported")}
        </div>
        <div className="font-mono text-lg tracking-tight sm:text-xl">
          {circulatingSompi !== null ? (
            <>
              {formatKas(circulatingSompi)}{" "}
              <span className="text-muted text-sm">{t("unit")}</span>
            </>
          ) : (
            <Placeholder />
          )}
        </div>
        <div className="text-muted mt-1 font-mono text-[10px]">
          {t("rpcSource")}
        </div>
      </div>

      <div>
        <div className="text-muted mb-1.5 text-xs tracking-wider uppercase">
          {t("expected")}
        </div>
        <div className="font-mono text-lg tracking-tight sm:text-xl">
          {expectedSompi !== null ? (
            <>
              {formatKas(expectedSompi)}{" "}
              <span className="text-muted text-sm">{t("unit")}</span>
            </>
          ) : (
            <Placeholder />
          )}
        </div>
        <div className="text-muted mt-1 font-mono text-[10px]">
          {t("expectedBasis")}
        </div>
      </div>
    </div>
  );
}
