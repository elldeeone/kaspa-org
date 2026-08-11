"use client";

import { useTranslations } from "next-intl";

import { ACCENT, accentAlpha } from "../content";
import { OS_GUIDANCE_GROUPS } from "./constants";
import { getVisibleFeatures } from "./filterState";
import InfoTooltip from "./InfoTooltip";
import { getOsIcon } from "./icons";
import type {
  WalletCriterion,
  WalletFeature,
  WalletFilters,
  WalletOs,
  WalletUserType,
} from "./types";
import { walletCriteria } from "./walletMetadata";

export type FilterPanelProps = {
  filters: WalletFilters;
  onSetOs: (os: WalletOs | undefined) => void;
  onSetUser: (user: WalletUserType | undefined) => void;
  onToggleCriterion: (criterion: WalletCriterion) => void;
  onToggleFeature: (feature: WalletFeature) => void;
  onReset: () => void;
  isCriterionDisabled: (criterion: WalletCriterion) => boolean;
  isFeatureDisabled: (feature: WalletFeature) => boolean;
};

function CheckGlyph({ active }: { active: boolean }) {
  return (
    <span
      className="flex h-3.5 w-3.5 shrink-0 items-center justify-center rounded-[4px] border-[1.5px] transition-colors"
      style={
        active
          ? {
              borderColor: ACCENT,
              background: ACCENT,
            }
          : { borderColor: "var(--border-subtle)" }
      }
    >
      {active && (
        <svg className="h-2 w-2 text-white" viewBox="0 0 8 8" fill="none">
          <path
            d="M1.5 4l2 2 3-3"
            stroke="currentColor"
            strokeWidth="1.5"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </svg>
      )}
    </span>
  );
}

function GroupTooltip({
  group,
}: {
  group: (typeof OS_GUIDANCE_GROUPS)[number];
}) {
  const t = useTranslations("hodl");

  return (
    <div>
      <p className="text-primary mb-2 text-[11px] font-semibold">
        {t(`walletFinder.guidance.${group.id}.title`)}
      </p>
      <div className="space-y-2">
        <div>
          <p className="mb-1 text-[10px] font-semibold tracking-[0.08em] text-[var(--text-muted)] uppercase">
            {t("walletFinder.common.pros")}
          </p>
          <ul className="space-y-1">
            {group.pros.map((pro) => (
              <li key={pro} className="flex gap-1.5">
                <span style={{ color: ACCENT }}>+</span>
                <span>{t(pro)}</span>
              </li>
            ))}
          </ul>
        </div>
        <div>
          <p className="mb-1 text-[10px] font-semibold tracking-[0.08em] text-[var(--text-muted)] uppercase">
            {t("walletFinder.common.cons")}
          </p>
          <ul className="space-y-1">
            {group.cons.map((con) => (
              <li key={con} className="flex gap-1.5">
                <span className="text-muted">-</span>
                <span>{t(con)}</span>
              </li>
            ))}
          </ul>
        </div>
      </div>
    </div>
  );
}

export default function FilterPanel({
  filters,
  onSetOs,
  onSetUser,
  onToggleCriterion,
  onToggleFeature,
  onReset,
  isCriterionDisabled,
  isFeatureDisabled,
}: FilterPanelProps) {
  const t = useTranslations("hodl");
  const sectionHeader =
    "text-[11px] font-semibold tracking-[0.1em] uppercase text-[var(--text-muted)] mb-3";
  const divider = "border-subtle my-5 border-t";

  return (
    <div className="border-subtle rounded-[24px] border bg-[var(--bg)] p-5 dark:bg-[rgba(255,255,255,0.02)]">
      <div className="mb-5 flex items-center justify-between">
        <p className="text-[14px] font-semibold">
          {t("walletFinder.filters.heading")}
        </p>
        <button
          type="button"
          className="text-tertiary hover:text-primary text-[12px] font-medium underline-offset-2 transition-colors hover:underline"
          onClick={onReset}
        >
          {t("walletFinder.filters.clearAll")}
        </button>
      </div>

      <div>
        <p className={sectionHeader}>
          {t("walletFinder.filters.operatingSystem")}
        </p>
        <div className="grid grid-cols-2 gap-x-4 gap-y-5">
          {OS_GUIDANCE_GROUPS.map((group) => (
            <div
              key={group.id}
              className={group.os.length === 1 ? "col-span-2" : undefined}
            >
              <div className="mb-2 flex items-center gap-1.5">
                <p className="text-muted text-[10px] font-semibold tracking-[0.1em] uppercase">
                  {t(`walletFinder.guidance.${group.id}.shortTitle`)}
                </p>
                <InfoTooltip>
                  <GroupTooltip group={group} />
                </InfoTooltip>
              </div>
              <div className="flex flex-wrap gap-1.5">
                {group.os.map((osOption) => {
                  const active = filters.os === osOption;
                  const osLabel = t(
                    `walletFinder.operatingSystems.${osOption}`,
                  );
                  return (
                    <button
                      key={osOption}
                      type="button"
                      title={osLabel}
                      aria-label={osLabel}
                      onClick={() => onSetOs(active ? undefined : osOption)}
                      className="flex h-11 w-11 items-center justify-center rounded-[10px] border transition-all hover:bg-black/[0.03] dark:hover:bg-white/[0.04]"
                      style={
                        active
                          ? {
                              borderColor: "transparent",
                              background: accentAlpha(0.08),
                              boxShadow: `0 0 0 1.5px ${accentAlpha(0.5)}`,
                            }
                          : { borderColor: "var(--border-subtle)" }
                      }
                    >
                      <span
                        style={{
                          color: active ? ACCENT : "var(--text-secondary)",
                        }}
                      >
                        {getOsIcon(osOption, "h-5 w-5")}
                      </span>
                    </button>
                  );
                })}
              </div>
            </div>
          ))}
        </div>
      </div>

      <div className={divider} />

      <div>
        <p className={sectionHeader}>{t("walletFinder.filters.userType")}</p>
        <div className="flex flex-col gap-1">
          {(["beginner", "experienced"] as const).map((user) => {
            const active = filters.user === user;
            return (
              <button
                key={user}
                type="button"
                className={`flex items-center justify-between rounded-[11px] px-3 py-2.5 text-left transition-colors ${
                  active
                    ? "text-primary"
                    : "text-secondary hover:bg-black/[0.03] dark:hover:bg-white/[0.04]"
                }`}
                style={active ? { background: accentAlpha(0.08) } : undefined}
                onClick={() => onSetUser(user)}
              >
                <span className="flex items-center gap-3">
                  <span
                    className="flex h-4 w-4 shrink-0 items-center justify-center rounded-full border-[1.5px] transition-colors"
                    style={
                      active
                        ? {
                            borderColor: ACCENT,
                            background: ACCENT,
                          }
                        : { borderColor: "var(--border-subtle)" }
                    }
                  >
                    {active && (
                      <span className="h-1.5 w-1.5 rounded-full bg-white" />
                    )}
                  </span>
                  <span className="text-[13.5px] font-medium">
                    {user === "beginner"
                      ? t("walletFinder.common.newUser")
                      : t("walletFinder.common.experiencedUser")}
                  </span>
                </span>
                <InfoTooltip
                  text={
                    user === "beginner"
                      ? t("walletFinder.filters.showNewUsers")
                      : t("walletFinder.filters.showExperiencedUsers")
                  }
                />
              </button>
            );
          })}
        </div>
      </div>

      <div className={divider} />

      <div>
        <p className={sectionHeader}>{t("walletFinder.filters.criteria")}</p>
        <div className="flex flex-col gap-0.5">
          {walletCriteria.map((criterion) => {
            const active = filters.important.includes(criterion.id);
            const disabled = !active && isCriterionDisabled(criterion.id);
            return (
              <button
                key={criterion.id}
                type="button"
                disabled={disabled}
                className={`flex items-center justify-between rounded-[11px] px-3 py-2 text-left transition-colors ${
                  active
                    ? "text-primary"
                    : disabled
                      ? "cursor-not-allowed opacity-35"
                      : "text-secondary hover:bg-black/[0.03] dark:hover:bg-white/[0.04]"
                }`}
                onClick={() => onToggleCriterion(criterion.id)}
              >
                <span className="flex items-center gap-2.5">
                  <CheckGlyph active={active} />
                  <span className="text-[13.5px] font-medium">
                    {t(`walletFinder.criteria.${criterion.id}.label`)}
                  </span>
                </span>
                {disabled ? (
                  <span className="text-[11px] text-[var(--text-muted)]">
                    {t("walletFinder.common.notAvailable")}
                  </span>
                ) : (
                  <InfoTooltip
                    text={t(
                      `walletFinder.criteria.${criterion.id}.description`,
                    )}
                  />
                )}
              </button>
            );
          })}
        </div>
      </div>

      <div className={divider} />

      <div>
        <p className={sectionHeader}>{t("walletFinder.filters.features")}</p>
        <div className="flex flex-col gap-0.5">
          {getVisibleFeatures(filters.user).map((feature) => {
            const active = filters.features.includes(feature.id);
            const disabled = !active && isFeatureDisabled(feature.id);
            return (
              <button
                key={feature.id}
                type="button"
                disabled={disabled}
                className={`flex items-center justify-between rounded-[11px] px-3 py-2 text-left transition-colors ${
                  active
                    ? "text-primary"
                    : disabled
                      ? "cursor-not-allowed opacity-35"
                      : "text-secondary hover:bg-black/[0.03] dark:hover:bg-white/[0.04]"
                }`}
                onClick={() => onToggleFeature(feature.id)}
              >
                <span className="flex items-center gap-2.5">
                  <CheckGlyph active={active} />
                  <span className="text-[13.5px] font-medium">
                    {t(`walletFinder.features.${feature.id}.label`)}
                  </span>
                </span>
                {disabled ? (
                  <span className="text-[11px] text-[var(--text-muted)]">
                    {t("walletFinder.common.notAvailable")}
                  </span>
                ) : (
                  <InfoTooltip
                    text={t(`walletFinder.features.${feature.id}.description`)}
                  />
                )}
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
}
