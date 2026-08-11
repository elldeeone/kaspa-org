import { useTranslations } from "next-intl";

import type { KaspaNodeState } from "../kaspaWorkerMessages";
import { LiveDot, LoadingDot } from "../supplyVisuals";

type SupplyConnectionStatusProps = {
  node: KaspaNodeState;
};

export function SupplyConnectionStatus({
  node,
}: SupplyConnectionStatusProps): React.JSX.Element {
  const t = useTranslations("home.proof.supply.connection");

  return (
    <div className="text-muted mb-5 flex items-center gap-2 font-mono text-xs">
      {node.isConnected ? (
        <>
          <LiveDot />
          <span>{t("connectedTo", { nodeUrl: node.nodeUrl ?? "" })}</span>
        </>
      ) : node.error ? (
        <span className="text-red-400">{t("error")}</span>
      ) : (
        <>
          <LoadingDot />
          <span>{t("connecting")}</span>
        </>
      )}
    </div>
  );
}
