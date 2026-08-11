"use client";

import { useTranslations } from "next-intl";

import SupplyTimeline from "./SupplyTimeline";
import { SupplyComparisonGrid } from "./gadget/SupplyComparisonGrid";
import { SupplyConnectionStatus } from "./gadget/SupplyConnectionStatus";
import { SupplyDeltaNote } from "./gadget/SupplyDeltaNote";
import { SupplyIntro } from "./gadget/SupplyIntro";
import { SupplyStatsRow } from "./gadget/SupplyStatsRow";
import { getSupplyMetrics } from "./supplyMetrics";
import { useKaspaNode } from "./useKaspaNode";

type SupplyGadgetProps = {
  showIntro?: boolean;
};

export default function SupplyGadget({
  showIntro = true,
}: SupplyGadgetProps): React.JSX.Element {
  const t = useTranslations("home.proof.supply");
  const node = useKaspaNode();
  const { blockReward, expectedSompi, pctEmitted } = getSupplyMetrics(node);

  return (
    <div>
      <div
        className="mt-4 rounded-xl border p-5 sm:p-6"
        style={{ borderColor: "var(--border-subtle)" }}
      >
        <SupplyConnectionStatus node={node} />
        {showIntro ? <SupplyIntro /> : null}

        <div className="space-y-4">
          <SupplyComparisonGrid
            circulatingSompi={node.circulatingSompi}
            expectedSompi={expectedSompi}
          />
          <SupplyDeltaNote isConnected={node.isConnected} />
        </div>
      </div>

      <div className="mt-8">
        <div className="text-muted mb-4 text-xs tracking-wider uppercase">
          {t("emissionHistory")}
        </div>
        <SupplyTimeline
          circulatingSompi={node.circulatingSompi}
          expectedSompi={expectedSompi}
          isConnected={node.isConnected}
        />
      </div>

      <SupplyStatsRow
        blockCount={node.blockCount}
        blockReward={blockReward}
        daaScore={node.daaScore}
        pctEmitted={pctEmitted}
      />
    </div>
  );
}
