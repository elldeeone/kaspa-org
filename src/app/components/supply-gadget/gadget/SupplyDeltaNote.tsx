import { useTranslations } from "next-intl";

type SupplyDeltaNoteProps = {
  isConnected: boolean;
};

export function SupplyDeltaNote({
  isConnected,
}: SupplyDeltaNoteProps): React.JSX.Element | null {
  const t = useTranslations("home.proof.supply.anchor");

  if (!isConnected) {
    return null;
  }

  return (
    <div
      className="pt-4"
      style={{ borderTop: "1px solid var(--border-subtle)" }}
    >
      <div className="flex items-baseline gap-2">
        <span className="text-muted text-xs tracking-wider uppercase">
          {t("label")}
        </span>
        <span className="font-mono text-sm">{t("title")}</span>
      </div>
      <p className="text-muted mt-1.5 text-xs leading-relaxed">{t("body")}</p>
    </div>
  );
}
