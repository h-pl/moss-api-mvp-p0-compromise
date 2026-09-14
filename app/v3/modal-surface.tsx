"use client";

import { ReactNode, useEffect, useRef } from "react";

/** App-owned modal surface using the browser's top layer for inertness and focus containment. */
export function ModalSurface({ children, titleId, descriptionId, close, className = "", role = "dialog" }: {
  children: ReactNode; titleId: string; descriptionId?: string; close: () => void;
  className?: string; role?: "dialog" | "alertdialog";
}) {
  const ref = useRef<HTMLDialogElement>(null);
  useEffect(() => {
    const dialog = ref.current;
    if (!dialog) return;
    const previous = document.activeElement as HTMLElement | null;
    const overflow = document.body.style.overflow;
    const padding = document.body.style.paddingRight;
    const gutter = window.innerWidth - document.documentElement.clientWidth;
    if (gutter > 0) document.body.style.paddingRight = `${gutter}px`;
    document.body.style.overflow = "hidden";
    dialog.showModal();
    dialog.querySelector<HTMLElement>("[data-autofocus]")?.focus();
    return () => {
      dialog.close();
      document.body.style.overflow = overflow;
      document.body.style.paddingRight = padding;
      if (previous?.isConnected) previous.focus();
    };
  }, []);
  return <dialog ref={ref} className={`dialog modal-surface ${className}`} role={role} aria-modal="true"
    aria-labelledby={titleId} aria-describedby={descriptionId} onCancel={e => { e.preventDefault(); close(); }}>
    {children}
  </dialog>;
}
