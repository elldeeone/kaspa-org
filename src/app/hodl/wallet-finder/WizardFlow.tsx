"use client";

import { useEffect, useRef } from "react";
import { useTranslations } from "next-intl";
import { ACCENT, accentAlpha } from "../content";
import { OS_GUIDANCE_GROUPS, WIZARD_STEP_IDS } from "./constants";
import { getVisibleFeatures } from "./filterState";
import { getOsIcon } from "./icons";
import type {
  WalletCriterion,
  WalletFeature,
  WalletFilters,
  WalletOs,
  WalletUserType,
} from "./types";
import { walletCriteria } from "./walletMetadata";

export type WizardPanelProps = {
  step: number;
  filters: WalletFilters;
  onSetOs: (os: WalletOs | undefined) => void;
  onSetUser: (user: WalletUserType | undefined) => void;
  onToggleCriterion: (criterion: WalletCriterion) => void;
  onToggleFeature: (feature: WalletFeature) => void;
  onNext: () => void;
  onBack: () => void;
  onDone: () => void;
  onSkip: () => void;
  isCriterionDisabled: (criterion: WalletCriterion) => boolean;
  isFeatureDisabled: (feature: WalletFeature) => boolean;
};

function ActiveCheck({ active }: { active: boolean }) {
  return (
    <span
      className="mt-0.5 flex h-4 w-4 shrink-0 items-center justify-center rounded-[4px] border-[1.5px] transition-colors"
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
        <svg className="h-2.5 w-2.5 text-white" viewBox="0 0 10 10" fill="none">
          <path
            d="M2 5l2.5 2.5 3.5-4"
            stroke="currentColor"
            strokeWidth="1.6"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </svg>
      )}
    </span>
  );
}

export default function WizardFlow({
  step,
  filters,
  onSetOs,
  onSetUser,
  onToggleCriterion,
  onToggleFeature,
  onNext,
  onBack,
  onDone,
  onSkip,
  isCriterionDisabled,
  isFeatureDisabled,
}: WizardPanelProps) {
  const t = useTranslations("hodl");
  const stepId = WIZARD_STEP_IDS[step - 1] ?? "os";
  const activeStyle = (active: boolean) =>
    active
      ? {
          borderColor: "transparent",
          background: accentAlpha(0.08),
          boxShadow: `0 0 0 2px ${accentAlpha(0.5)}`,
        }
      : { borderColor: "var(--border-subtle)" };

  const rootRef = useRef<HTMLDivElement>(null);
  const isFirstRender = useRef(true);

  useEffect(() => {
    if (isFirstRender.current) {
      isFirstRender.current = false;
      return;
    }
    const node = rootRef.current;
    if (!node) return;
    const card = node.closest("[data-wallet-finder-root]") ?? node;
    card.scrollIntoView({ behavior: "smooth", block: "start" });
  }, [step]);

  return (
    <div ref={rootRef} className="mx-auto max-w-3xl py-2 md:py-8">
      <div className="mb-7 md:mb-8">
        <div className="md:hidden">
          <div className="mb-4 flex items-center justify-between">
            <p className="text-muted text-[11px] font-semibold tracking-[0.1em] uppercase">
              {t("walletFinder.wizard.progress", { step, total: 4 })}
            </p>
            <button
              type="button"
              onClick={onSkip}
              className="text-tertiary hover:text-primary text-[12px] font-medium underline-offset-2 transition-colors hover:underline"
            >
              {t("walletFinder.wizard.skip")}
            </button>
          </div>
          <div className="flex gap-1.5">
            {[1, 2, 3, 4].map((stepNumber) => (
              <div
                key={stepNumber}
                className="h-[3px] flex-1 rounded-full transition-all"
                style={{
                  background: stepNumber <= step ? ACCENT : "var(--track-bg)",
                }}
              />
            ))}
          </div>
        </div>

        <div className="mb-5 hidden items-center gap-2 md:flex">
          {[1, 2, 3, 4].map((stepNumber) => (
            <div key={stepNumber} className="flex items-center gap-2">
              <div
                className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full text-[12px] font-semibold transition-all"
                style={
                  stepNumber === step
                    ? { background: ACCENT, color: "white" }
                    : stepNumber < step
                      ? {
                          background: accentAlpha(0.15),
                          color: ACCENT,
                        }
                      : {
                          background: "var(--chip-bg)",
                          color: "var(--text-tertiary)",
                        }
                }
              >
                {stepNumber < step ? (
                  <svg className="h-3.5 w-3.5" viewBox="0 0 14 14" fill="none">
                    <path
                      d="M2.5 7l3 3 6-6"
                      stroke="currentColor"
                      strokeWidth="2"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    />
                  </svg>
                ) : (
                  stepNumber
                )}
              </div>
              {stepNumber < 4 && (
                <div
                  className="h-[2px] w-10 rounded-full transition-colors md:w-16"
                  style={{
                    background: stepNumber < step ? ACCENT : "var(--track-bg)",
                  }}
                />
              )}
            </div>
          ))}
          <button
            type="button"
            onClick={onSkip}
            className="text-tertiary hover:text-primary ml-auto text-[13px] font-medium underline-offset-2 transition-colors hover:underline"
          >
            {t("walletFinder.wizard.skipAll")}
          </button>
        </div>

        <h3 className="mt-5 text-[22px] leading-snug font-semibold tracking-[-0.02em] md:mt-0 md:text-[28px]">
          {t(`walletFinder.wizard.steps.${stepId}.title`)}
        </h3>
        {stepId === "criteria" || stepId === "features" ? (
          <p className="text-muted mt-2 text-[13px] italic">
            {t("walletFinder.common.optional")}
          </p>
        ) : (
          <p className="text-tertiary mt-2 text-[14px] leading-relaxed md:text-[15px]">
            {t(`walletFinder.wizard.steps.${stepId}.subtitle`)}
          </p>
        )}
      </div>

      {step === 1 && (
        <div className="grid gap-8 lg:grid-cols-2">
          {OS_GUIDANCE_GROUPS.map((group) => {
            const prosConsList = (
              <div className="flex flex-col gap-1.5">
                {group.pros.map((pro) => (
                  <div key={pro} className="flex items-start gap-2">
                    <span
                      className="mt-px shrink-0 text-[13px] leading-none font-bold"
                      style={{ color: ACCENT }}
                    >
                      +
                    </span>
                    <span className="text-secondary text-[12.5px] leading-snug">
                      {t(pro)}
                    </span>
                  </div>
                ))}
                {group.cons.map((con) => (
                  <div key={con} className="flex items-start gap-2">
                    <span className="text-muted mt-px shrink-0 text-[13px] leading-none font-bold">
                      -
                    </span>
                    <span className="text-tertiary text-[12.5px] leading-snug">
                      {t(con)}
                    </span>
                  </div>
                ))}
              </div>
            );
            return (
              <div key={group.id}>
                <p className="mb-3 text-[16px] font-semibold">
                  {t(`walletFinder.guidance.${group.id}.title`)}
                </p>
                <div
                  className="mb-4 grid gap-2"
                  style={{
                    gridTemplateColumns: `repeat(${group.os.length}, minmax(0, 5rem))`,
                  }}
                >
                  {group.os.map((osOption) => {
                    const selected = filters.os === osOption;
                    return (
                      <button
                        key={osOption}
                        type="button"
                        onClick={() => onSetOs(selected ? undefined : osOption)}
                        className="flex w-full flex-col items-center gap-1.5 rounded-[14px] border py-3 transition-all hover:bg-black/[0.03] dark:hover:bg-white/[0.04]"
                        style={activeStyle(selected)}
                      >
                        <span
                          style={{
                            color: selected ? ACCENT : "var(--text-secondary)",
                          }}
                        >
                          {getOsIcon(osOption, "h-7 w-7")}
                        </span>
                        <span
                          className="text-[11.5px] font-medium"
                          style={{
                            color: selected ? ACCENT : "var(--text-secondary)",
                          }}
                        >
                          {t(`walletFinder.operatingSystems.${osOption}`)}
                        </span>
                      </button>
                    );
                  })}
                </div>

                <div className="hidden lg:block">{prosConsList}</div>
                <details className="group lg:hidden">
                  <summary className="text-tertiary hover:text-primary flex cursor-pointer list-none items-center gap-1.5 text-[12.5px] font-medium transition-colors [&::-webkit-details-marker]:hidden">
                    <span>{t("walletFinder.wizard.prosAndCons")}</span>
                    <svg
                      className="h-3.5 w-3.5 transition-transform group-open:rotate-180"
                      viewBox="0 0 12 12"
                      fill="none"
                    >
                      <path
                        d="M3 4.5l3 3 3-3"
                        stroke="currentColor"
                        strokeWidth="1.6"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                      />
                    </svg>
                  </summary>
                  <div className="mt-3">{prosConsList}</div>
                </details>
              </div>
            );
          })}
        </div>
      )}

      {step === 2 && (
        <div className="grid gap-3 sm:grid-cols-2">
          {(["beginner", "experienced"] as const).map((user) => {
            const active = filters.user === user;
            return (
              <button
                key={user}
                type="button"
                onClick={() => onSetUser(user)}
                className="rounded-[18px] border p-6 text-left transition-all"
                style={activeStyle(active)}
              >
                <span className="block text-[16px] font-semibold">
                  {user === "beginner"
                    ? t("walletFinder.common.newUser")
                    : t("walletFinder.common.experiencedUser")}
                </span>
                <span className="text-tertiary mt-2 block text-[14px] leading-[1.55]">
                  {user === "beginner"
                    ? t("walletFinder.wizard.experience.newDescription")
                    : t(
                        "walletFinder.wizard.experience.experiencedDescription",
                      )}
                </span>
              </button>
            );
          })}
        </div>
      )}

      {step === 3 && (
        <div className="grid gap-2.5 sm:grid-cols-2">
          {walletCriteria.map((criterion) => {
            const active = filters.important.includes(criterion.id);
            const disabled = !active && isCriterionDisabled(criterion.id);
            return (
              <button
                key={criterion.id}
                type="button"
                disabled={disabled}
                onClick={() => onToggleCriterion(criterion.id)}
                className={`flex items-start gap-3.5 rounded-[14px] border p-4 text-left transition-all ${
                  disabled ? "cursor-not-allowed opacity-35" : ""
                }`}
                style={activeStyle(active)}
              >
                <ActiveCheck active={active} />
                <div className="min-w-0">
                  <p className="text-[14px] leading-tight font-semibold">
                    {t(`walletFinder.criteria.${criterion.id}.label`)}
                  </p>
                  <p className="text-tertiary mt-1 text-[12.5px] leading-[1.5]">
                    {disabled
                      ? t("walletFinder.common.notAvailableSentence")
                      : t(`walletFinder.criteria.${criterion.id}.description`)}
                  </p>
                </div>
              </button>
            );
          })}
        </div>
      )}

      {step === 4 && (
        <div className="grid gap-2.5 sm:grid-cols-2">
          {getVisibleFeatures(filters.user).map((feature) => {
            const active = filters.features.includes(feature.id);
            const disabled = !active && isFeatureDisabled(feature.id);
            return (
              <button
                key={feature.id}
                type="button"
                disabled={disabled}
                onClick={() => onToggleFeature(feature.id)}
                className={`flex items-start gap-3.5 rounded-[14px] border p-4 text-left transition-all ${
                  disabled ? "cursor-not-allowed opacity-35" : ""
                }`}
                style={activeStyle(active)}
              >
                <ActiveCheck active={active} />
                <div className="min-w-0">
                  <p className="text-[14px] leading-tight font-semibold">
                    {t(`walletFinder.features.${feature.id}.label`)}
                  </p>
                  <p className="text-tertiary mt-1 text-[12.5px] leading-[1.5]">
                    {disabled
                      ? t("walletFinder.common.notAvailableSentence")
                      : t(`walletFinder.features.${feature.id}.description`)}
                  </p>
                </div>
              </button>
            );
          })}
        </div>
      )}

      <div className="mt-8 flex items-center gap-3">
        {step > 1 ? (
          <button
            type="button"
            onClick={onBack}
            className="border-subtle flex-1 rounded-[10px] border px-6 py-3 text-[15px] font-medium transition-colors hover:bg-black/[0.03] md:flex-none dark:hover:bg-white/[0.04]"
          >
            {t("walletFinder.wizard.back")}
          </button>
        ) : (
          <span className="flex-1 md:flex-none" />
        )}
        {step < 4 ? (
          <button
            type="button"
            onClick={onNext}
            className="btn-primary flex-1 justify-center md:ml-auto md:flex-none"
          >
            {t("walletFinder.wizard.next")}
          </button>
        ) : (
          <button
            type="button"
            onClick={onDone}
            className="btn-primary flex-1 justify-center whitespace-nowrap md:ml-auto md:flex-none"
          >
            <span className="md:hidden">
              {t("walletFinder.wizard.showWallets")}
            </span>
            <span className="hidden md:inline">
              {t("walletFinder.wizard.showMatchingWallets")}
            </span>
          </button>
        )}
      </div>
    </div>
  );
}
