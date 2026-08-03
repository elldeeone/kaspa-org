"use client";

import { type RefObject, useEffect } from "react";

const FOCUSABLE_ELEMENT_SELECTOR = [
  "a[href]",
  "button:not([disabled])",
  "input:not([disabled]):not([type='hidden'])",
  "select:not([disabled])",
  "textarea:not([disabled])",
  "[contenteditable='true']",
  "[tabindex]",
].join(",");

function getFocusableElements(dialog: HTMLElement): HTMLElement[] {
  return Array.from(
    dialog.querySelectorAll<HTMLElement>(FOCUSABLE_ELEMENT_SELECTOR),
  ).filter(
    (element) =>
      element.tabIndex >= 0 &&
      element.getAttribute("aria-hidden") !== "true" &&
      element.getClientRects().length > 0,
  );
}

export function useDialogFocusTrap(
  dialogRef: RefObject<HTMLElement | null>,
): void {
  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key !== "Tab") return;

      const dialog = dialogRef.current;
      if (!dialog) return;

      const focusableElements = getFocusableElements(dialog);
      const firstFocusable = focusableElements[0];
      const lastFocusable = focusableElements.at(-1);
      const activeElement = document.activeElement;

      if (!firstFocusable || !lastFocusable) {
        event.preventDefault();
        dialog.focus();
        return;
      }

      const focusIsInsideCycle =
        activeElement instanceof HTMLElement &&
        focusableElements.includes(activeElement);

      if (
        event.shiftKey &&
        (activeElement === firstFocusable || !focusIsInsideCycle)
      ) {
        event.preventDefault();
        lastFocusable.focus();
        return;
      }

      if (
        !event.shiftKey &&
        (activeElement === lastFocusable || !focusIsInsideCycle)
      ) {
        event.preventDefault();
        firstFocusable.focus();
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [dialogRef]);
}
