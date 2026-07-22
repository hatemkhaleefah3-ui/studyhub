import { useEffect, useRef } from "react";
import { format, parseISO } from "date-fns";
import { useLocation } from "wouter";
import { useStudyData, type ChecklistItem } from "@/hooks/useStudyData";

const SWIPE_THRESHOLD = 62;
const MAX_DRAG = 112;

function agendaDateLabel(task: ChecklistItem) {
  if (!task.dueDate) return null;
  try {
    const date = parseISO(task.dueDate);
    const today = format(new Date(), "yyyy-MM-dd");
    return task.dueDate === today ? "Today's Agenda" : format(date, "EEEE, MMMM d");
  } catch {
    return null;
  }
}

function findTaskCard(textNode: HTMLElement) {
  let current: HTMLElement | null = textNode;
  for (let depth = 0; current && depth < 6; depth += 1) {
    if (
      current.className.includes("border-border") &&
      current.className.includes("flex") &&
      current.className.includes("gap")
    ) {
      return current;
    }
    current = current.parentElement;
  }
  return null;
}

export function ScheduleTaskGestureBridge() {
  const { checklist, setCascadeChecklistStatus, deleteChecklistItem } = useStudyData();
  const [location, navigate] = useLocation();
  const checklistRef = useRef(checklist);
  checklistRef.current = checklist;

  useEffect(() => {
    if (location !== "/schedule") return;

    const enhanced = new WeakSet<HTMLElement>();
    const cleanup = new Set<() => void>();

    const enhanceCard = (card: HTMLElement, taskId: string) => {
      if (enhanced.has(card)) return;
      enhanced.add(card);
      card.dataset.studyhubTaskId = taskId;
      card.style.touchAction = "pan-y";
      card.style.willChange = "transform";
      card.style.transition = "transform 180ms cubic-bezier(0.4, 0, 0.2, 1), box-shadow 180ms cubic-bezier(0.4, 0, 0.2, 1)";

      let pointerId: number | null = null;
      let startX = 0;
      let startY = 0;
      let moved = false;
      let suppressClick = false;

      const currentTask = () => checklistRef.current.find((item) => item.id === taskId);

      const reset = () => {
        card.style.transition = "transform 180ms cubic-bezier(0.4, 0, 0.2, 1), box-shadow 180ms cubic-bezier(0.4, 0, 0.2, 1)";
        card.style.transform = "translateX(0px)";
        card.style.boxShadow = "";
        pointerId = null;
        moved = false;
      };

      const onPointerDown = (event: PointerEvent) => {
        if (event.button !== 0 && event.pointerType === "mouse") return;
        pointerId = event.pointerId;
        startX = event.clientX;
        startY = event.clientY;
        moved = false;
        suppressClick = false;
        card.style.transition = "none";
        card.setPointerCapture?.(event.pointerId);
      };

      const onPointerMove = (event: PointerEvent) => {
        if (pointerId !== event.pointerId) return;
        const dx = event.clientX - startX;
        const dy = event.clientY - startY;
        if (!moved && Math.abs(dy) > Math.abs(dx) && Math.abs(dy) > 8) {
          reset();
          return;
        }
        if (Math.abs(dx) < 7) return;
        moved = true;
        suppressClick = true;
        event.preventDefault();
        const translated = Math.max(-MAX_DRAG, Math.min(MAX_DRAG, dx));
        card.style.transform = `translateX(${translated}px)`;
        card.style.boxShadow = "0 14px 34px hsl(var(--foreground) / 0.12)";
      };

      const onPointerEnd = (event: PointerEvent) => {
        if (pointerId !== event.pointerId) return;
        const dx = event.clientX - startX;
        const task = currentTask();
        if (task && Math.abs(dx) >= SWIPE_THRESHOLD) {
          event.preventDefault();
          event.stopPropagation();
          suppressClick = true;
          if (dx < 0) {
            if (task.done) deleteChecklistItem(task.id);
            else setCascadeChecklistStatus(task.id, true, false);
          } else {
            if (task.didNotDo) deleteChecklistItem(task.id);
            else setCascadeChecklistStatus(task.id, false, true);
          }
        }
        reset();
      };

      const onClick = (event: MouseEvent) => {
        if (suppressClick) {
          event.preventDefault();
          event.stopPropagation();
          suppressClick = false;
          return;
        }
        event.preventDefault();
        event.stopPropagation();
        navigate(`/checklist?edit=${encodeURIComponent(taskId)}`);
      };

      card.addEventListener("pointerdown", onPointerDown, true);
      card.addEventListener("pointermove", onPointerMove, { capture: true, passive: false });
      card.addEventListener("pointerup", onPointerEnd, true);
      card.addEventListener("pointercancel", onPointerEnd, true);
      card.addEventListener("click", onClick, true);

      cleanup.add(() => {
        card.removeEventListener("pointerdown", onPointerDown, true);
        card.removeEventListener("pointermove", onPointerMove, true);
        card.removeEventListener("pointerup", onPointerEnd, true);
        card.removeEventListener("pointercancel", onPointerEnd, true);
        card.removeEventListener("click", onClick, true);
      });
    };

    const apply = () => {
      const agendaHeading = Array.from(document.querySelectorAll<HTMLElement>("h3")).find((heading) =>
        heading.textContent?.trim() === "Today's Agenda" || /^\w+, \w+ \d+$/.test(heading.textContent?.trim() ?? ""),
      );
      const agenda = agendaHeading?.parentElement;
      if (!agenda || !agendaHeading) return;
      const label = agendaHeading.textContent?.trim();
      const available = checklistRef.current.filter((task) => agendaDateLabel(task) === label);
      const used = new Set<string>();

      Array.from(agenda.querySelectorAll<HTMLElement>("p")).forEach((textNode) => {
        const text = textNode.textContent?.trim();
        if (!text) return;
        const task = available.find((candidate) => candidate.text === text && !used.has(candidate.id));
        if (!task) return;
        const card = findTaskCard(textNode);
        if (!card) return;
        used.add(task.id);
        enhanceCard(card, task.id);
      });
    };

    apply();
    const frame = requestAnimationFrame(apply);
    const observer = new MutationObserver(apply);
    observer.observe(document.body, { childList: true, subtree: true });

    return () => {
      cancelAnimationFrame(frame);
      observer.disconnect();
      cleanup.forEach((dispose) => dispose());
    };
  }, [location, navigate, deleteChecklistItem, setCascadeChecklistStatus]);

  return null;
}
