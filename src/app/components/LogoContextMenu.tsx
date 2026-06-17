"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";

export type LogoMenuPosition = { x: number; y: number };

const MENU_WIDTH = 200;
const EDGE_GAP = 8;

export default function LogoContextMenu({
  position,
  onClose,
}: {
  position: LogoMenuPosition;
  onClose: () => void;
}): React.JSX.Element {
  const [shown, setShown] = useState(false);
  const menuItemRef = useRef<HTMLAnchorElement>(null);

  useEffect(() => {
    const raf = window.requestAnimationFrame(() => {
      setShown(true);
      menuItemRef.current?.focus({ preventScroll: true });
    });
    return () => window.cancelAnimationFrame(raf);
  }, []);

  useEffect(() => {
    const onPointerDown = (event: PointerEvent) => {
      const target = event.target as HTMLElement | null;
      if (!target?.closest("[data-logo-menu]")) {
        onClose();
      }
    };
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") onClose();
    };

    window.addEventListener("pointerdown", onPointerDown);
    window.addEventListener("keydown", onKeyDown);
    window.addEventListener("scroll", onClose, true);
    window.addEventListener("resize", onClose);
    return () => {
      window.removeEventListener("pointerdown", onPointerDown);
      window.removeEventListener("keydown", onKeyDown);
      window.removeEventListener("scroll", onClose, true);
      window.removeEventListener("resize", onClose);
    };
  }, [onClose]);

  const viewportWidth =
    typeof window === "undefined"
      ? MENU_WIDTH + EDGE_GAP * 2
      : window.innerWidth;
  const left = Math.max(
    EDGE_GAP,
    Math.min(position.x, viewportWidth - MENU_WIDTH - EDGE_GAP),
  );
  const top = position.y;

  return (
    <div
      data-logo-menu
      role="menu"
      aria-label="Kaspa logo"
      onKeyDown={(event) => {
        if (
          event.key === "ArrowDown" ||
          event.key === "ArrowUp" ||
          event.key === "Home" ||
          event.key === "End"
        ) {
          event.preventDefault();
          menuItemRef.current?.focus({ preventScroll: true });
        }
      }}
      className={`border-subtle fixed z-[90] min-w-[190px] origin-top-left overflow-hidden rounded-xl border p-1 shadow-xl backdrop-blur-xl transition duration-150 ease-out ${
        shown ? "scale-100 opacity-100" : "scale-95 opacity-0"
      }`}
      style={{ left, top, backgroundColor: "var(--overlay-bg)" }}
    >
      <Link
        ref={menuItemRef}
        role="menuitem"
        href="/assets"
        onClick={onClose}
        className="text-secondary hover:text-primary flex items-center justify-between gap-6 rounded-lg px-3 py-2 text-[14px] transition-colors hover:bg-[var(--surface)]"
      >
        View logo assets
        <span aria-hidden="true" className="text-tertiary">
          →
        </span>
      </Link>
    </div>
  );
}
