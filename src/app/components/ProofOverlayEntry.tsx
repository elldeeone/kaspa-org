"use client";

import {
  NextIntlClientProvider,
  useLocale,
  type AbstractIntlMessages,
} from "next-intl";
import { createPortal } from "react-dom";
import { useCallback, useEffect, useRef, useState } from "react";

import ProofOverlay from "./ProofOverlay";
import type { ProofShellLabels } from "./ProofTrigger";
import { useBodyScrollLock } from "./useBodyScrollLock";
import { useDialogFocusTrap } from "./useDialogFocusTrap";

type ProofCatalogResult = {
  failed: boolean;
  messages: AbstractIntlMessages | null;
  requestKey: string;
};

const proofCatalogCache = new Map<string, AbstractIntlMessages>();
const proofCatalogRequests = new Map<string, Promise<AbstractIntlMessages>>();

function isMessageCatalog(value: unknown): value is AbstractIntlMessages {
  if (!value || typeof value !== "object" || Array.isArray(value)) return false;
  const children = Object.values(value);
  return (
    children.length > 0 &&
    children.every(
      (child) => typeof child === "string" || isMessageCatalog(child),
    )
  );
}

function isProofCatalogPayload(value: unknown): value is AbstractIntlMessages {
  if (!isMessageCatalog(value)) return false;
  const root = value as Record<string, unknown>;
  if (Object.keys(root).length !== 1 || !isMessageCatalog(root.home)) {
    return false;
  }
  const home = root.home as Record<string, unknown>;
  if (Object.keys(home).length !== 1 || !isMessageCatalog(home.proof)) {
    return false;
  }
  const proof = home.proof as Record<string, unknown>;
  return ["chrome", "live", "origin", "run", "sections", "supply"].every(
    (key) => Object.hasOwn(proof, key),
  );
}

function loadProofCatalog(locale: string): Promise<AbstractIntlMessages> {
  const cached = proofCatalogCache.get(locale);
  if (cached) return Promise.resolve(cached);

  const pending = proofCatalogRequests.get(locale);
  if (pending) return pending;

  const request = fetch(`/api/i18n/home-proof/${encodeURIComponent(locale)}`, {
    headers: { accept: "application/json" },
  })
    .then(async (response) => {
      if (!response.ok) throw new Error(`proof catalog ${response.status}`);
      const payload: unknown = await response.json();
      if (!isProofCatalogPayload(payload)) {
        throw new Error("proof catalog has an invalid shape");
      }
      proofCatalogCache.set(locale, payload);
      return payload;
    })
    .finally(() => proofCatalogRequests.delete(locale));

  proofCatalogRequests.set(locale, request);
  return request;
}

function ProofLoadingOverlay({
  error,
  labels,
  onClose,
  onRetry,
}: {
  error: boolean;
  labels: ProofShellLabels;
  onClose: () => void;
  onRetry: () => void;
}) {
  const dialogRef = useRef<HTMLDivElement>(null);
  const backButtonRef = useRef<HTMLButtonElement>(null);
  useBodyScrollLock(true);
  useDialogFocusTrap(dialogRef);

  useEffect(() => {
    if (!error) backButtonRef.current?.focus();
  }, [error]);

  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") onClose();
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [onClose]);

  if (typeof document === "undefined") return null;

  return createPortal(
    <div
      ref={dialogRef}
      className="fixed inset-0 z-[120] flex flex-col bg-[var(--bg)]"
      role="dialog"
      aria-modal="true"
      aria-label={labels.title}
      tabIndex={-1}
    >
      <div className="border-subtle flex items-center border-b px-4 py-3 md:px-6">
        <button
          ref={backButtonRef}
          type="button"
          onClick={onClose}
          autoFocus
          className="text-secondary hover:text-primary text-[14px] transition-colors"
        >
          {labels.back}
        </button>
      </div>
      <div className="flex flex-1 flex-col items-center justify-center gap-4 px-6 text-center">
        <p className="text-secondary" role={error ? "alert" : "status"}>
          {error ? labels.error : labels.loading}
        </p>
        {error ? (
          <button type="button" className="btn-primary" onClick={onRetry}>
            {labels.retry}
          </button>
        ) : null}
      </div>
    </div>,
    document.body,
  );
}

export default function ProofOverlayEntry({
  labels,
  onClose,
}: {
  labels: ProofShellLabels;
  onClose: () => void;
}) {
  const locale = useLocale();
  const [attempt, setAttempt] = useState(0);
  const requestKey = `${locale}:${attempt}`;
  const [result, setResult] = useState<ProofCatalogResult>({
    failed: false,
    messages: proofCatalogCache.get(locale) ?? null,
    requestKey: proofCatalogCache.has(locale) ? requestKey : "",
  });

  useEffect(() => {
    let active = true;
    void loadProofCatalog(locale)
      .then((messages) => {
        if (active) {
          setResult({ failed: false, messages, requestKey });
        }
      })
      .catch(() => {
        if (active) {
          setResult({ failed: true, messages: null, requestKey });
        }
      });

    return () => {
      active = false;
    };
  }, [locale, requestKey]);

  const retry = useCallback(() => setAttempt((value) => value + 1), []);
  const messages = result.requestKey === requestKey ? result.messages : null;
  const failed = result.requestKey === requestKey && result.failed;

  if (!messages) {
    return (
      <ProofLoadingOverlay
        error={failed}
        labels={labels}
        onClose={onClose}
        onRetry={retry}
      />
    );
  }

  return (
    <NextIntlClientProvider locale={locale} messages={messages}>
      <ProofOverlay onClose={onClose} />
    </NextIntlClientProvider>
  );
}
