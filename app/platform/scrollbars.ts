'use client';

import { useEffect } from 'react';

const IDLE_MS = 800;
const FADE_MS = 180;
const OPACITY = '--p-scrollbar-opacity';

type Activity = { timer?: number; frame?: number; held: boolean };

/** One capture listener also covers Reka portals and dynamically mounted scrollers. */
export function useAutoHideScrollbars() {
  useEffect(() => {
    const activity = new Map<HTMLElement, Activity>();
    const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)');
    const cancel = (state: Activity) => {
      window.clearTimeout(state.timer);
      if (state.frame !== undefined) cancelAnimationFrame(state.frame);
    };
    const hide = (element: HTMLElement, state: Activity) => {
      const finish = () => { element.style.removeProperty(OPACITY); activity.delete(element); };
      if (!element.isConnected || reducedMotion.matches) { finish(); return; }
      const start = performance.now();
      const fade = (now: number) => {
        const opacity = Math.max(0, 1 - (now - start) / FADE_MS);
        element.style.setProperty(OPACITY, String(opacity));
        if (opacity > 0 && element.isConnected) state.frame = requestAnimationFrame(fade);
        else finish();
      };
      state.frame = requestAnimationFrame(fade);
    };
    const show = (element: HTMLElement, held = false) => {
      const state = activity.get(element) ?? { held: false };
      cancel(state);
      state.held ||= held;
      element.style.setProperty(OPACITY, '1');
      activity.set(element, state);
      if (!state.held) state.timer = window.setTimeout(() => hide(element, state), IDLE_MS);
    };
    const scroll = (event: Event) => {
      const target = event.target === document ? document.scrollingElement : event.target;
      if (target instanceof HTMLElement) show(target.closest<HTMLElement>('.p-menu-scroll-area') ?? target);
    };
    // Native scrollbar dragging can suppress DOM pointer events in Chromium/WebKit;
    // thumb :active handles that case. These listeners cover browsers that deliver them.
    const pointerDown = (event: PointerEvent) => {
      if (!(event.target instanceof HTMLElement)) return;
      const element = event.target;
      const overlay = element.closest<HTMLElement>('.p-menu-scrollbar');
      if (overlay?.parentElement) { show(overlay.parentElement, true); return; }
      const rect = element.getBoundingClientRect();
      const x = event.clientX - rect.left - element.clientLeft;
      const y = event.clientY - rect.top - element.clientTop;
      if ((element.scrollHeight > element.clientHeight && x >= element.clientWidth) ||
          (element.scrollWidth > element.clientWidth && y >= element.clientHeight)) show(element, true);
    };
    const release = () => {
      for (const [element, state] of activity) {
        if (state.held) { state.held = false; show(element); }
      }
    };
    document.addEventListener('scroll', scroll, { capture: true, passive: true });
    document.addEventListener('pointerdown', pointerDown, { capture: true, passive: true });
    window.addEventListener('pointerup', release, true);
    window.addEventListener('pointercancel', release, true);
    window.addEventListener('blur', release);
    return () => {
      document.removeEventListener('scroll', scroll, true);
      document.removeEventListener('pointerdown', pointerDown, true);
      window.removeEventListener('pointerup', release, true);
      window.removeEventListener('pointercancel', release, true);
      window.removeEventListener('blur', release);
      for (const [element, state] of activity) { cancel(state); element.style.removeProperty(OPACITY); }
      activity.clear();
    };
  }, []);
}
