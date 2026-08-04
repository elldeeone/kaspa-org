"use client";

import dynamic from "next/dynamic";
import { useCallback, useEffect, useRef, useState } from "react";

const ProofOverlay = dynamic(() => import("./ProofOverlayEntry"), {
  ssr: false,
});

const PROOF_PARAM = "proof";
const PROOF_PARAM_VALUE = "1";
const PROOF_PARAM_EVENT = "proof-param-change";

type HistoryMode = "push" | "replace";

export type ProofShellLabels = {
  back: string;
  error: string;
  loading: string;
  retry: string;
  title: string;
  trigger: string;
};

function readProofParam(): boolean {
  try {
    return (
      new URLSearchParams(window.location.search).get(PROOF_PARAM) ===
      PROOF_PARAM_VALUE
    );
  } catch {
    return false;
  }
}

function updateProofParam(
  nextOpen: boolean,
  historyMode: HistoryMode,
): boolean {
  try {
    const params = new URLSearchParams(window.location.search);
    if (nextOpen) {
      params.set(PROOF_PARAM, PROOF_PARAM_VALUE);
    } else {
      params.delete(PROOF_PARAM);
    }

    const query = params.toString();
    const next = `${window.location.pathname}${query ? `?${query}` : ""}${window.location.hash}`;

    if (historyMode === "push") {
      window.history.pushState({}, "", next);
    } else {
      window.history.replaceState({}, "", next);
    }

    window.dispatchEvent(new Event(PROOF_PARAM_EVENT));
    return true;
  } catch {
    return false;
  }
}

function useProofParamState(): {
  open: boolean;
  openOverlay: () => void;
  closeOverlay: () => void;
} {
  const [urlOpen, setUrlOpen] = useState<boolean>(() => readProofParam());
  const [fallbackOpen, setFallbackOpen] = useState<boolean | null>(null);

  const syncProofParam = useCallback(() => {
    setUrlOpen(readProofParam());
    setFallbackOpen(null);
  }, []);

  useEffect(() => {
    window.addEventListener("popstate", syncProofParam);
    window.addEventListener(PROOF_PARAM_EVENT, syncProofParam);

    return () => {
      window.removeEventListener("popstate", syncProofParam);
      window.removeEventListener(PROOF_PARAM_EVENT, syncProofParam);
    };
  }, [syncProofParam]);

  const setOpenState = useCallback(
    (nextOpen: boolean, historyMode: HistoryMode) => {
      if (updateProofParam(nextOpen, historyMode)) {
        setUrlOpen(nextOpen);
        setFallbackOpen(null);
        return;
      }

      setFallbackOpen(nextOpen);
    },
    [],
  );

  return {
    open: fallbackOpen ?? urlOpen,
    openOverlay: () => setOpenState(true, "push"),
    closeOverlay: () => setOpenState(false, "replace"),
  };
}

export default function ProofTrigger({
  className = "",
  labels,
}: {
  className?: string;
  labels: ProofShellLabels;
}): React.JSX.Element {
  const { open, openOverlay, closeOverlay } = useProofParamState();
  const triggerRef = useRef<HTMLButtonElement>(null);
  const closeAndRestoreFocus = useCallback(() => {
    closeOverlay();
    window.requestAnimationFrame(() => triggerRef.current?.focus());
  }, [closeOverlay]);

  return (
    <>
      <button
        ref={triggerRef}
        type="button"
        onClick={openOverlay}
        className={`btn-primary ${className}`}
      >
        {labels.trigger}
      </button>
      {open ? (
        <ProofOverlay labels={labels} onClose={closeAndRestoreFocus} />
      ) : null}
    </>
  );
}
