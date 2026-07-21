import { useEffect } from "react";

const EDGE_SIZE = 112;
const MAX_SPEED = 24;

type ScrollTarget = HTMLElement | Window;
type RestorableContainer = {
  element: HTMLElement;
  maxHeight: string;
  overflowY: string;
  overscrollBehavior: string;
};

function findInnerScrollContainer(element: HTMLElement): HTMLElement | null {
  let current = element.parentElement;
  while (current) {
    const style = window.getComputedStyle(current);
    if (/(auto|scroll)/.test(style.overflowY) && current.scrollHeight > current.clientHeight) return current;
    current = current.parentElement;
  }
  return null;
}

function findPageScrollTarget(element: HTMLElement, excluded: HTMLElement | null): ScrollTarget {
  let current = element.parentElement;
  while (current) {
    if (current !== excluded) {
      const style = window.getComputedStyle(current);
      const canScroll = /(auto|scroll)/.test(style.overflowY) && current.scrollHeight > current.clientHeight;
      if (canScroll) return current;
    }
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

export function DragEdgeAutoScroll() {
  useEffect(() => {
    let active = false;
    let pointerY = 0;
    let target: ScrollTarget = window;
    let expanded: RestorableContainer | null = null;
    let frame = 0;
    let restoreFrame = 0;

    const restoreContainer = () => {
      if (!expanded) return;
      expanded.element.style.maxHeight = expanded.maxHeight;
      expanded.element.style.overflowY = expanded.overflowY;
      expanded.element.style.overscrollBehavior = expanded.overscrollBehavior;
      expanded = null;
    };

    const tick = () => {
      if (!active) return;
      const { top, bottom } = targetBounds(target);
      let speed = 0;

      if (pointerY < top + EDGE_SIZE) {
        const strength = Math.min(1, Math.max(0, (top + EDGE_SIZE - pointerY) / EDGE_SIZE));
        speed = -Math.max(5, strength * MAX_SPEED);
      } else if (pointerY > bottom - EDGE_SIZE) {
        const strength = Math.min(1, Math.max(0, (pointerY - (bottom - EDGE_SIZE)) / EDGE_SIZE));
        speed = Math.max(5, strength * MAX_SPEED);
      }

      if (speed) scrollTarget(target, speed);
      frame = window.requestAnimationFrame(tick);
    };

    const onPointerDown = (event: PointerEvent) => {
      const element = event.target instanceof HTMLElement ? event.target.closest<HTMLElement>(".cursor-grab") : null;
      if (!element) return;

      window.cancelAnimationFrame(restoreFrame);
      restoreContainer();

      const inner = findInnerScrollContainer(element);
      if (inner) {
        expanded = {
          element: inner,
          maxHeight: inner.style.maxHeight,
          overflowY: inner.style.overflowY,
          overscrollBehavior: inner.style.overscrollBehavior,
        };
        inner.style.maxHeight = "none";
        inner.style.overflowY = "visible";
        inner.style.overscrollBehavior = "auto";
      }

      active = true;
      pointerY = event.clientY;
      target = findPageScrollTarget(element, inner);
      window.cancelAnimationFrame(frame);
      frame = window.requestAnimationFrame(tick);
    };

    const onPointerMove = (event: PointerEvent) => {
      if (active) pointerY = event.clientY;
    };

    const stop = () => {
      active = false;
      window.cancelAnimationFrame(frame);
      restoreFrame = window.requestAnimationFrame(restoreContainer);
    };

    window.addEventListener("pointerdown", onPointerDown, true);
    window.addEventListener("pointermove", onPointerMove, true);
    window.addEventListener("pointerup", stop, true);
    window.addEventListener("pointercancel", stop, true);

    return () => {
      active = false;
      window.cancelAnimationFrame(frame);
      window.cancelAnimationFrame(restoreFrame);
      restoreContainer();
      window.removeEventListener("pointerdown", onPointerDown, true);
      window.removeEventListener("pointermove", onPointerMove, true);
      window.removeEventListener("pointerup", stop, true);
      window.removeEventListener("pointercancel", stop, true);
    };
  }, []);

  return null;
}
