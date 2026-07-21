import { useEffect } from "react";

const EDGE_SIZE = 176;
const MIN_SPEED = 8;
const MAX_SPEED = 72;

type ScrollTarget = HTMLElement | Window;
type RestorableStyle = {
  element: HTMLElement;
  contentVisibility: string;
  containIntrinsicSize: string;
  willChange: string;
};

function findScrollTarget(element: HTMLElement): ScrollTarget {
  let current = element.parentElement;
  while (current) {
    const style = window.getComputedStyle(current);
    const canScroll = /(auto|scroll)/.test(style.overflowY) && current.scrollHeight > current.clientHeight;
    if (canScroll) return current;
    current = current.parentElement;
  }
  return window;
}

function targetBounds(target: ScrollTarget) {
  if (target === window) return { top: 0, bottom: window.innerHeight };
  const rect = (target as HTMLElement).getBoundingClientRect();
  return { top: Math.max(0, rect.top), bottom: Math.min(window.innerHeight, rect.bottom) };
}

function scrollTarget(target: ScrollTarget, amount: number) {
  if (target === window) window.scrollBy({ top: amount, behavior: "auto" });
  else (target as HTMLElement).scrollTop += amount;
}

function optimizeRows(activeRow: HTMLElement): RestorableStyle[] {
  const list = activeRow.parentElement;
  if (!list) return [];

  return Array.from(list.children)
    .filter((child): child is HTMLElement => child instanceof HTMLElement)
    .map(element => {
      const previous = {
        element,
        contentVisibility: element.style.contentVisibility,
        containIntrinsicSize: element.style.containIntrinsicSize,
        willChange: element.style.willChange,
      };

      element.style.contentVisibility = element === activeRow ? "visible" : "auto";
      element.style.containIntrinsicSize = "72px";
      element.style.willChange = element === activeRow ? "transform" : "auto";
      return previous;
    });
}

function restoreRows(rows: RestorableStyle[]) {
  rows.forEach(({ element, contentVisibility, containIntrinsicSize, willChange }) => {
    element.style.contentVisibility = contentVisibility;
    element.style.containIntrinsicSize = containIntrinsicSize;
    element.style.willChange = willChange;
  });
}

export function DragEdgeAutoScroll() {
  useEffect(() => {
    let active = false;
    let pointerY = 0;
    let target: ScrollTarget = window;
    let frame = 0;
    let optimizedRows: RestorableStyle[] = [];

    const tick = () => {
      if (!active) return;
      const { top, bottom } = targetBounds(target);
      let speed = 0;

      if (pointerY < top + EDGE_SIZE) {
        const strength = Math.min(1, Math.max(0, (top + EDGE_SIZE - pointerY) / EDGE_SIZE));
        speed = -Math.max(MIN_SPEED, strength * strength * MAX_SPEED);
      } else if (pointerY > bottom - EDGE_SIZE) {
        const strength = Math.min(1, Math.max(0, (pointerY - (bottom - EDGE_SIZE)) / EDGE_SIZE));
        speed = Math.max(MIN_SPEED, strength * strength * MAX_SPEED);
      }

      if (speed) scrollTarget(target, speed);
      frame = window.requestAnimationFrame(tick);
    };

    const onPointerDown = (event: PointerEvent) => {
      const element = event.target instanceof HTMLElement ? event.target.closest<HTMLElement>(".cursor-grab") : null;
      if (!element) return;

      restoreRows(optimizedRows);
      optimizedRows = optimizeRows(element);
      active = true;
      pointerY = event.clientY;
      target = findScrollTarget(element);
      window.cancelAnimationFrame(frame);
      frame = window.requestAnimationFrame(tick);
    };

    const onPointerMove = (event: PointerEvent) => {
      if (active) pointerY = event.clientY;
    };

    const stop = () => {
      active = false;
      window.cancelAnimationFrame(frame);
      restoreRows(optimizedRows);
      optimizedRows = [];
    };

    window.addEventListener("pointerdown", onPointerDown, true);
    window.addEventListener("pointermove", onPointerMove, true);
    window.addEventListener("pointerup", stop, true);
    window.addEventListener("pointercancel", stop, true);

    return () => {
      stop();
      window.removeEventListener("pointerdown", onPointerDown, true);
      window.removeEventListener("pointermove", onPointerMove, true);
      window.removeEventListener("pointerup", stop, true);
      window.removeEventListener("pointercancel", stop, true);
    };
  }, []);

  return null;
}
