"use client";

import { useEffect, useRef, type ReactNode } from "react";

/** Route-local scroll/gesture lock; removing the page restores normal browsing. */
export function DwarfViewport({ children }: { children: ReactNode }) {
  const root = useRef<HTMLElement>(null);
  useEffect(() => {
    const surface = root.current;
    if (!surface) return;
    const elements = [document.documentElement, document.body];
    const added = elements.filter(element => !element.classList.contains("dwarf-viewport-active"));
    added.forEach(element => element.classList.add("dwarf-viewport-active"));
    const preventGesture = (event: Event) => event.preventDefault();
    const preventPinch = (event: TouchEvent) => {
      if (event.touches.length > 1) event.preventDefault();
    };
    // Safari fallback. Single-pointer input and all existing button handlers survive.
    surface.addEventListener("gesturestart", preventGesture, { passive: false });
    surface.addEventListener("gesturechange", preventGesture, { passive: false });
    surface.addEventListener("touchmove", preventPinch, { passive: false });
    return () => {
      added.forEach(element => element.classList.remove("dwarf-viewport-active"));
      surface.removeEventListener("gesturestart", preventGesture);
      surface.removeEventListener("gesturechange", preventGesture);
      surface.removeEventListener("touchmove", preventPinch);
    };
  }, []);
  return <main ref={root} className="game-shell dwarf-game-shell">{children}</main>;
}

/** Fit menus as a last resort on very short screens, without cutting off controls. */
export function DwarfViewportPanel({ children }: { children: ReactNode }) {
  const slot = useRef<HTMLDivElement>(null);
  const content = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const host = slot.current, panel = content.current;
    if (!host || !panel) return;
    let frame = 0;
    const fit = () => {
      const scale = Math.min(1, host.clientWidth / Math.max(1, panel.offsetWidth),
        host.clientHeight / Math.max(1, panel.offsetHeight));
      panel.style.setProperty("--dwarf-panel-scale", String(scale));
    };
    const observer = new ResizeObserver(() => {
      cancelAnimationFrame(frame);
      frame = requestAnimationFrame(fit);
    });
    observer.observe(host); observer.observe(panel); fit();
    return () => { observer.disconnect(); cancelAnimationFrame(frame); };
  }, []);
  return <div ref={slot} className="dwarf-viewport-panel">
    <div ref={content} className="dwarf-viewport-panel-content">{children}</div>
  </div>;
}
