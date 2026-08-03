"use client";

import SupplyGadgetLoader from "./supply-gadget/SupplyGadgetLoader";
import { useTranslations } from "next-intl";
import { createPortal } from "react-dom";
import {
  type ReactNode,
  useCallback,
  useEffect,
  useRef,
  useState,
} from "react";
import { useBodyScrollLock } from "./useBodyScrollLock";
import { useDialogFocusTrap } from "./useDialogFocusTrap";

const GREEN = "#5a9e82";
const TEAL = "rgb(118, 167, 158)";

const ARAMAIC_BEFORE = "ומה די עליך ועל אחיך ייטב בשאר ";
const ARAMAIC_HIGHLIGHT = "כספא";
const ARAMAIC_AFTER = " ודהבה למעבד כרעות אלהכם תעבדון";

const SECTION_IDS = ["live", "origin", "runIt"] as const;

function SurfaceCard({
  children,
  className = "",
}: {
  children: ReactNode;
  className?: string;
}) {
  return (
    <div
      className={`border-subtle rounded-2xl border p-5 md:p-6 ${className}`}
      style={{ background: "var(--surface)" }}
    >
      {children}
    </div>
  );
}

export default function ProofOverlay({
  onClose,
}: {
  onClose: () => void;
}): React.JSX.Element | null {
  const t = useTranslations("home.proof");
  const [visible, setVisible] = useState(false);
  const dialogRef = useRef<HTMLDivElement>(null);
  const scrollRef = useRef<HTMLDivElement>(null);
  const sectionRefs = useRef<(HTMLDivElement | null)[]>([]);
  const [activeSection, setActiveSection] = useState(0);
  const timeoutRefs = useRef<number[]>([]);

  const clearAllTimers = useCallback(() => {
    timeoutRefs.current.forEach((id) => window.clearTimeout(id));
    timeoutRefs.current = [];
  }, []);

  const handleClose = useCallback(() => {
    clearAllTimers();
    setVisible(false);
    const id = window.setTimeout(onClose, 280);
    timeoutRefs.current.push(id);
  }, [clearAllTimers, onClose]);

  useEffect(() => {
    const rafId = window.requestAnimationFrame(() => setVisible(true));
    return () => window.cancelAnimationFrame(rafId);
  }, []);

  useBodyScrollLock(true);
  useDialogFocusTrap(dialogRef);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") handleClose();
    };
    window.addEventListener("keydown", onKey);

    return () => {
      window.removeEventListener("keydown", onKey);
      clearAllTimers();
    };
  }, [clearAllTimers, handleClose]);

  useEffect(() => {
    const container = scrollRef.current;
    if (!container) return;

    const onScroll = () => {
      const refs = sectionRefs.current;
      const containerTop = container.getBoundingClientRect().top;
      let closest = 0;
      let closestDist = Infinity;
      for (let i = 0; i < refs.length; i++) {
        const el = refs[i];
        if (!el) continue;
        const dist = Math.abs(
          el.getBoundingClientRect().top - containerTop - 80,
        );
        if (dist < closestDist) {
          closestDist = dist;
          closest = i;
        }
      }
      setActiveSection(closest);
    };

    container.addEventListener("scroll", onScroll, { passive: true });
    return () => container.removeEventListener("scroll", onScroll);
  }, []);

  const jumpToSection = useCallback((index: number) => {
    const container = scrollRef.current;
    const el = sectionRefs.current[index];
    if (!container || !el) return;
    const top =
      el.getBoundingClientRect().top -
      container.getBoundingClientRect().top +
      container.scrollTop -
      24;
    container.scrollTo({ top, behavior: "smooth" });
  }, []);

  const setSectionRef = (index: number) => (el: HTMLDivElement | null) => {
    sectionRefs.current[index] = el;
  };

  const overlay = (
    <div
      ref={dialogRef}
      className="fixed inset-0 z-[120] overflow-hidden"
      role="dialog"
      aria-modal="true"
      aria-label={t("chrome.title")}
      tabIndex={-1}
      style={{
        opacity: visible ? 1 : 0,
        transform: visible ? "translateY(0)" : "translateY(12px)",
        transition:
          "opacity 280ms cubic-bezier(0.16, 1, 0.3, 1), transform 280ms cubic-bezier(0.16, 1, 0.3, 1)",
      }}
    >
      <div className="absolute inset-0 bg-[var(--bg)]" />
      <div className="absolute inset-0 bg-[var(--overlay-bg)] backdrop-blur-[16px]" />

      {/* ── Sticky top bar ── */}
      <div
        className="border-subtle sticky top-0 z-[130] flex items-center border-b px-4 py-3 md:px-6"
        style={{ background: "var(--bg)" }}
      >
        <button
          onClick={handleClose}
          autoFocus
          className="text-secondary hover:text-primary flex items-center gap-2 text-[14px] transition-colors"
        >
          <svg width={14} height={14} viewBox="0 0 14 14" fill="none">
            <path
              d="M10 2L5 7l5 5"
              stroke="currentColor"
              strokeWidth="1.5"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </svg>
          {t("chrome.back")}
        </button>
        <span className="text-muted ml-auto text-[12px] font-semibold tracking-[0.14em] uppercase">
          {t("chrome.title")}
        </span>
      </div>

      {/* ── Section dots ── */}
      <nav
        className="fixed top-1/2 right-4 z-[130] hidden -translate-y-1/2 flex-col items-end gap-3 md:flex"
        aria-label={t("chrome.sectionsAria")}
      >
        {SECTION_IDS.map((sectionId, i) => {
          const sectionName = t(`sections.${sectionId}`);
          return (
            <button
              key={sectionId}
              onClick={() => jumpToSection(i)}
              className="group flex items-center gap-2"
              aria-label={t("chrome.jumpToSection", { section: sectionName })}
            >
              <span
                className="text-[10px] tracking-[0.12em] uppercase opacity-0 transition-opacity group-hover:opacity-100"
                style={{
                  color: i === activeSection ? TEAL : "var(--text-muted)",
                }}
              >
                {sectionName}
              </span>
              <span
                className="block rounded-full transition-all"
                style={{
                  width: i === activeSection ? 8 : 5,
                  height: i === activeSection ? 8 : 5,
                  background: i === activeSection ? TEAL : "var(--text-muted)",
                  opacity: i === activeSection ? 1 : 0.4,
                }}
              />
            </button>
          );
        })}
      </nav>

      <div
        ref={scrollRef}
        className="relative z-10 h-[calc(100%-51px)] overflow-y-auto"
      >
        <div className="mx-auto max-w-[700px] px-6 pt-10 pb-20 md:px-10">
          {/* ── 1: Live ── */}
          <section ref={setSectionRef(0)} className="pt-4">
            <p
              className="text-[11px] font-semibold tracking-[0.18em] uppercase"
              style={{ color: GREEN }}
            >
              {t("live.eyebrow")}
            </p>
            <h2 className="text-primary mt-2 text-[24px] leading-[1.1] font-semibold tracking-[-0.02em] md:text-[30px]">
              {t("live.title")}
            </h2>
            <p className="text-secondary mt-4 text-[15px] leading-[1.75]">
              {t("live.body")}
            </p>
            <div className="mt-6 mb-4">
              <SupplyGadgetLoader showIntro={false} />
            </div>
          </section>

          {/* ── 2: Origin ── */}
          <section
            ref={setSectionRef(1)}
            className="border-subtle mt-20 border-t pt-20"
          >
            <p
              className="text-[11px] font-semibold tracking-[0.18em] uppercase"
              style={{ color: TEAL }}
            >
              {t("origin.eyebrow")}
            </p>
            <h2 className="text-primary mt-2 text-[24px] leading-[1.1] font-semibold tracking-[-0.02em] md:text-[30px]">
              {t("origin.title")}
            </h2>

            <p className="text-secondary mt-6 text-[15px] leading-[1.75]">
              {t.rich("origin.supplyBody", {
                strong: (chunks) => (
                  <strong className="text-primary">{chunks}</strong>
                ),
              })}
            </p>

            <p className="text-secondary mt-5 text-[15px] leading-[1.75]">
              {t.rich("origin.verseBody", {
                reference: (chunks) => (
                  <strong className="text-primary">{chunks}</strong>
                ),
              })}
            </p>

            <SurfaceCard className="mt-6 text-center">
              <p className="text-primary text-[15px] leading-[1.75] italic">
                {t("origin.translatedQuotation")}
              </p>
              <p
                className="mt-3 text-[9px] leading-[1.7] opacity-50 md:text-[10px]"
                dir="rtl"
                lang="arc"
                style={{ color: "var(--text-muted, #9aa3a8)" }}
              >
                {ARAMAIC_BEFORE}
                <span className="rounded-sm px-1">{ARAMAIC_HIGHLIGHT}</span>
                {ARAMAIC_AFTER}
              </p>
              <p className="text-muted mt-1.5 text-[12px]">
                {t("origin.quotationAttribution")}
              </p>
            </SurfaceCard>

            <p className="text-secondary mt-6 text-[15px] leading-[1.75]">
              {t.rich("origin.timestampBody", {
                bitcoinBlock: (chunks) => (
                  <strong className="text-primary">{chunks}</strong>
                ),
              })}
            </p>
          </section>

          {/* ── 3: Run it ── */}
          <section
            ref={setSectionRef(2)}
            className="border-subtle mt-20 border-t pt-20"
          >
            <p
              className="text-[11px] font-semibold tracking-[0.18em] uppercase"
              style={{ color: GREEN }}
            >
              {t("run.eyebrow")}
            </p>
            <h2 className="text-primary mt-2 text-[24px] leading-[1.1] font-semibold tracking-[-0.02em] md:text-[30px]">
              {t("run.title")}
            </h2>
            <p className="text-secondary mt-6 text-[15px] leading-[1.75]">
              {t("run.intro")}
            </p>
            <SurfaceCard className="mt-6">
              <h3 className="text-primary text-[17px] font-semibold tracking-[-0.01em]">
                {t("run.notebookTitle")}
              </h3>
              <p className="text-secondary mt-2 text-[15px] leading-[1.75]">
                {t("run.notebookBody")}
              </p>
              <a
                href="https://github.com/kaspagang/kaspad-py-explorer/blob/main/src/genesis_proof.ipynb"
                target="_blank"
                rel="noopener noreferrer"
                className="btn-primary mt-5 inline-flex"
              >
                {t("run.notebookAction")}
              </a>
            </SurfaceCard>

            <SurfaceCard className="mt-6">
              <h3 className="text-primary text-[17px] font-semibold tracking-[-0.01em]">
                {t("run.checkpointTitle")}
              </h3>
              <ol className="text-secondary mt-4 list-decimal space-y-3 pl-5 text-[14px] leading-[1.75]">
                <li>{t("run.checkpointStep1")}</li>
                <li>
                  {t.rich("run.checkpointStep2", {
                    kaspad: (chunks) => (
                      <a
                        href="https://github.com/kaspanet/kaspad/tree/v0.11.5-2"
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-primary underline decoration-[rgba(118,167,158,0.45)] underline-offset-4"
                      >
                        {chunks}
                      </a>
                    ),
                    processor: (chunks) => (
                      <a
                        href="https://github.com/kaspanet/kaspad/blob/v0.11.5-2/domain/consensus/processes/blockprocessor/validate_and_insert_block.go"
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-primary underline decoration-[rgba(118,167,158,0.45)] underline-offset-4"
                      >
                        {chunks}
                      </a>
                    ),
                    code: (chunks) => (
                      <code className="rounded bg-[rgba(118,167,158,0.08)] px-1.5 py-0.5 text-[12px]">
                        {chunks}
                      </code>
                    ),
                  })}
                </li>
                <li>
                  {t.rich("run.checkpointStep3", {
                    utxos: (chunks) => (
                      <a
                        href="https://github.com/kaspanet/kaspad/blob/v0.11.5-2/domain/consensus/processes/blockprocessor/resources/utxos.gz"
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-primary underline decoration-[rgba(118,167,158,0.45)] underline-offset-4"
                      >
                        {chunks}
                      </a>
                    ),
                    serialization: (chunks) => (
                      <a
                        href="https://github.com/kaspanet/kaspad/blob/v0.11.5-2/domain/consensus/utils/utxo/serialization.go"
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-primary underline decoration-[rgba(118,167,158,0.45)] underline-offset-4"
                      >
                        {chunks}
                      </a>
                    ),
                  })}
                </li>
                <li>
                  {t.rich("run.checkpointStep4", {
                    daa: (chunks) => (
                      <code className="rounded bg-[rgba(118,167,158,0.08)] px-1.5 py-0.5 text-[12px]">
                        {chunks}
                      </code>
                    ),
                    supply: (chunks) => (
                      <code className="ml-1 rounded bg-[rgba(118,167,158,0.08)] px-1.5 py-0.5 text-[12px]">
                        {chunks}
                      </code>
                    ),
                  })}
                </li>
              </ol>
              <p className="text-muted mt-4 text-[12px] leading-[1.7]">
                {t("run.checkpointNote")}
              </p>
            </SurfaceCard>
          </section>
        </div>
      </div>
    </div>
  );

  if (typeof document === "undefined") {
    return null;
  }

  return createPortal(overlay, document.body);
}
