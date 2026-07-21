import { ReactNode, useMemo, useState } from "react";
import {
  DndContext,
  DragEndEvent,
  DragOverlay,
  DragStartEvent,
  KeyboardSensor,
  PointerSensor,
  closestCenter,
  useSensor,
  useSensors,
} from "@dnd-kit/core";
import {
  SortableContext,
  arrayMove,
  sortableKeyboardCoordinates,
  useSortable,
  verticalListSortingStrategy,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";

export type SortableEntity = { id: string };

type Props<T extends SortableEntity> = {
  items: T[];
  onChange: (items: T[]) => void;
  renderItem: (item: T, index: number, overlay: boolean) => ReactNode;
  className?: string;
};

function SortableRow<T extends SortableEntity>({ item, index, renderItem }: { item: T; index: number; renderItem: Props<T>["renderItem"] }) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id: item.id });
  return <div
    ref={setNodeRef}
    {...attributes}
    {...listeners}
    style={{
      transform: CSS.Transform.toString(transform),
      transition,
      opacity: isDragging ? 0.22 : 1,
      touchAction: "none",
      contentVisibility: "auto",
      containIntrinsicSize: "0 76px",
    }}
    className="list-none cursor-grab select-none will-change-transform active:cursor-grabbing"
  >{renderItem(item, index, false)}</div>;
}

export function SortableCardList<T extends SortableEntity>({ items, onChange, renderItem, className = "" }: Props<T>) {
  const [activeId, setActiveId] = useState<string | null>(null);
  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 4 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates }),
  );
  const ids = useMemo(() => items.map(item => item.id), [items]);
  const activeIndex = activeId ? items.findIndex(item => item.id === activeId) : -1;
  const activeItem = activeIndex >= 0 ? items[activeIndex] : null;

  const handleStart = ({ active }: DragStartEvent) => setActiveId(String(active.id));
  const handleEnd = ({ active, over }: DragEndEvent) => {
    setActiveId(null);
    if (!over || active.id === over.id) return;
    const oldIndex = items.findIndex(item => item.id === active.id);
    const newIndex = items.findIndex(item => item.id === over.id);
    if (oldIndex < 0 || newIndex < 0) return;
    onChange(arrayMove(items, oldIndex, newIndex));
  };

  return <DndContext
    sensors={sensors}
    collisionDetection={closestCenter}
    autoScroll={{ threshold: { x: 0, y: 0.18 }, acceleration: 18, interval: 5 }}
    onDragStart={handleStart}
    onDragCancel={() => setActiveId(null)}
    onDragEnd={handleEnd}
  >
    <SortableContext items={ids} strategy={verticalListSortingStrategy}>
      <div className={`flex max-h-[72vh] flex-col gap-3 overflow-y-auto overscroll-contain px-1 py-3 ${className}`}>
        {items.map((item, index) => <SortableRow key={item.id} item={item} index={index} renderItem={renderItem} />)}
      </div>
    </SortableContext>
    <DragOverlay dropAnimation={{ duration: 180, easing: "cubic-bezier(0.4, 0, 0.2, 1)" }}>
      {activeItem ? <div className="scale-[1.025] cursor-grabbing rounded-3xl shadow-2xl">{renderItem(activeItem, activeIndex, true)}</div> : null}
    </DragOverlay>
  </DndContext>;
}
