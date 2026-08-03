"use client";

import { useLocale, useTranslations } from "next-intl";
import { useMemo } from "react";

import { CheckIcon } from "../icons";
import { SOMPI_PER_KAS } from "./emissionConstants";
import {
  getHistoricalMilestones,
  type HistoricalMilestone,
} from "./supplyTimelineData";
import { LiveDot } from "./supplyVisuals";

const GREEN = "#5a9e82";
const TEAL = "rgb(118, 167, 158)";
function CheckCircle() {
  return (
    <div
      className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full"
      style={{ backgroundColor: GREEN }}
    >
      <span className="text-white">
        <CheckIcon size={12} />
      </span>
    </div>
  );
}

interface SupplyTimelineProps {
  circulatingSompi: bigint | null;
  expectedSompi: bigint | null;
  isConnected: boolean;
}

export default function SupplyTimeline({
  circulatingSompi,
  expectedSompi,
  isConnected,
}: SupplyTimelineProps) {
  const locale = useLocale();
  const t = useTranslations("home.proof.supply");
  const milestoneData = useMemo(() => getHistoricalMilestones(), []);
  const integerFormat = useMemo(() => new Intl.NumberFormat(locale), [locale]);

  const formatKas = (sompi: bigint) =>
    integerFormat.format(sompi / SOMPI_PER_KAS);

  const formatMilestoneDate = (milestone: HistoricalMilestone) => {
    const startDate = new Date(milestone.date.start);
    if (milestone.id === "preDeflationary") {
      const endDate = new Date(milestone.date.end ?? milestone.date.start);
      return t("timeline.preDeflationary.date", { startDate, endDate });
    }

    switch (milestone.id) {
      case "genesis":
        return t("timeline.genesis.date", { date: startDate });
      case "checkpoint":
        return t("timeline.checkpoint.date", { date: startDate });
      case "chromatic":
        return t("timeline.chromatic.date", { date: startDate });
      case "crescendo":
        return t("timeline.crescendo.date", { date: startDate });
    }
  };

  return (
    <div className="relative">
      {/* Vertical connector line */}
      <div
        className="absolute top-3 bottom-3 left-3 w-px"
        style={{ backgroundColor: "var(--border-subtle)" }}
      />

      <div className="space-y-0">
        {/* Historical milestones */}
        {milestoneData.map((m) => (
          <div key={m.id} className="relative flex gap-4 pb-6">
            <CheckCircle />
            <div className="min-w-0 pt-0.5">
              <div className="flex flex-wrap items-baseline gap-x-3 gap-y-0.5">
                <span className="text-sm font-medium">
                  {t(`timeline.${m.id}.label`)}
                </span>
                <span className="text-muted text-xs">
                  {formatMilestoneDate(m)}
                </span>
              </div>
              <div className="mt-1 font-mono text-sm tracking-tight">
                {formatKas(m.expectedSompi)}{" "}
                <span className="text-muted text-xs">
                  {t("comparison.unit")}
                </span>
              </div>
              <p className="text-muted mt-0.5 text-xs leading-relaxed">
                {t(`timeline.${m.id}.description`)}
              </p>
            </div>
          </div>
        ))}

        {/* NOW — live milestone */}
        <div className="relative flex gap-4">
          <div className="flex h-6 w-6 shrink-0 items-center justify-center">
            <LiveDot size={3} />
          </div>
          <div className="min-w-0 pt-0.5">
            <div className="flex flex-wrap items-baseline gap-x-3 gap-y-0.5">
              <span className="text-sm font-medium" style={{ color: TEAL }}>
                {t("timeline.now")}
              </span>
              <span className="text-muted text-xs">{t("timeline.live")}</span>
            </div>
            {isConnected && circulatingSompi !== null ? (
              <>
                <div className="mt-1 font-mono text-sm tracking-tight">
                  {formatKas(circulatingSompi)}{" "}
                  <span className="text-muted text-xs">
                    {t("timeline.circulating")}
                  </span>
                </div>
                {expectedSompi !== null && (
                  <div className="mt-1 font-mono text-sm tracking-tight">
                    {formatKas(expectedSompi)}{" "}
                    <span className="text-muted text-xs">
                      {t("timeline.expected")}
                    </span>
                  </div>
                )}
              </>
            ) : (
              <div className="text-muted mt-1 text-xs">
                {isConnected ? t("timeline.loading") : t("timeline.connecting")}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
