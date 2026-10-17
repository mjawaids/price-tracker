// The drag-to-another-aisle hooks for list rows and aisle cards (used inside
// `AisleDnd`, listDrag.tsx).
import { useDraggable, useDroppable } from '@dnd-kit/core';

/** What a row needs to be dragged: its element, the sensors' listeners, and whether it's the one lifted. */
export interface RowDrag {
  ref: (el: HTMLElement | null) => void;
  listeners?: Record<string, unknown>;
  dragging: boolean;
}

/** What an aisle card needs to take a drop: its element and whether an item is over it. */
export interface GroupDrop {
  ref: (el: HTMLElement | null) => void;
  over: boolean;
}

/** Make a list row draggable (inside `AisleDnd`). */
export function useRowDrag(id: string): RowDrag {
  const { setNodeRef, listeners, isDragging } = useDraggable({ id });
  return { ref: setNodeRef, listeners: listeners as Record<string, unknown> | undefined, dragging: isDragging };
}

/** Make an aisle card a drop target (inside `AisleDnd`). */
export function useGroupDrop(categoryId: string): GroupDrop {
  const { setNodeRef, isOver } = useDroppable({ id: categoryId });
  return { ref: setNodeRef, over: isOver };
}
