import { useFormatter, useLocale, useTranslations } from "next-intl";
import { useMemo } from "react";

import { SUPPLY_TEAL } from "../supplyVisuals";

type SupplyStatsRowProps = {
  blockCount: bigint | null;
  blockReward: number | null;
  daaScore: bigint | null;
  pctEmitted: number | null;
};

export function SupplyStatsRow({
  blockCount,
  blockReward,
  daaScore,
  pctEmitted,
}: SupplyStatsRowProps): React.JSX.Element {
  const format = useFormatter();
  const locale = useLocale();
  const t = useTranslations("home.proof.supply");
  const integerFormat = useMemo(() => new Intl.NumberFormat(locale), [locale]);
  const formattedBlockCount =
    blockCount === null ? null : integerFormat.format(blockCount);

  return (
    <div className="mt-6 grid grid-cols-2 gap-4 sm:grid-cols-4">
      <div>
        <div className="text-muted mb-1 text-xs tracking-wider uppercase">
          {t("stats.mined")}
        </div>
        <div className="font-mono text-sm">
          {pctEmitted !== null
            ? format.number(pctEmitted / 100, {
                style: "percent",
                minimumFractionDigits: 2,
                maximumFractionDigits: 2,
              })
            : "--"}
        </div>
        {pctEmitted !== null ? (
          <div
            className="mt-1.5 h-1 overflow-hidden rounded-full"
            style={{ backgroundColor: "var(--border-subtle)" }}
          >
            <div
              className="h-full rounded-full transition-all duration-500"
              style={{
                width: `${pctEmitted}%`,
                backgroundColor: SUPPLY_TEAL,
              }}
            />
          </div>
        ) : null}
      </div>

      <div>
        <div className="text-muted mb-1 text-xs tracking-wider uppercase">
          {t("stats.blockReward")}
        </div>
        <div className="font-mono text-sm">
          {blockReward !== null
            ? `${format.number(blockReward, {
                minimumFractionDigits: 2,
                maximumFractionDigits: 2,
              })} ${t("comparison.unit")}`
            : "--"}
        </div>
      </div>

      <div>
        <div className="text-muted mb-1 text-xs tracking-wider uppercase">
          {t("stats.nodeDagBlocks")}
        </div>
        <div
          className="font-mono text-sm"
          aria-label={
            formattedBlockCount !== null
              ? t("stats.blockCountAccessible", {
                  count: formattedBlockCount,
                })
              : undefined
          }
        >
          {formattedBlockCount ?? "--"}
        </div>
      </div>

      <div>
        <div className="text-muted mb-1 text-xs tracking-wider uppercase">
          {t("stats.daaScore")}
        </div>
        <div className="font-mono text-sm">
          {daaScore !== null ? integerFormat.format(daaScore) : "--"}
        </div>
      </div>
    </div>
  );
}
