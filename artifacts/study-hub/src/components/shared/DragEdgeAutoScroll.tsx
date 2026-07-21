import { useEffect } from "react";

const EDGE_SIZE = 96;
const MAX_SPEED = 20;

type ScrollTarget = HTMLElement | Window;

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
  return { top: rect.top, bottom: rect.bottom };
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
    let frame = 0;

    const tick = () => {
      if (!active) return;
      const { top, bottom } = targetBounds(target);
      let speed = 0;

      if (pointerY < top + EDGE_SIZE) {
        const strength = Math.min(1, Math.max(0, (top + EDGE_SIZE - pointerY) / EDGE_SIZE));
        speed = -Math.max(4, strength * MAX_SPEED);
      } else if (pointerY > bottom - EDGE_SIZE) {
        const strength = Math.min(1, Math.max(0, (pointerY - (bottom - EDGE_SIZE)) / EDGE_SIZE));
        speed = Math.max(4, strength * MAX_SPEED);
      }

      if (speed) scrollTarget(target, speed);
      frame = window.requestAnimationFrame(tick);
    };

    const onPointerDown = (event: PointerEvent) => {
      const element = event.target instanceof HTMLElement ? event.target.closest<HTMLElement>(".cursor-grab") : null;
      if (!element) return;
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
