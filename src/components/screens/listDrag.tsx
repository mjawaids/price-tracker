// Drag an item to another aisle (Lists, grouped by aisle): hold it, drag it onto
// another aisle's card, let go. The item's aisle changes, and because the aisle of a
// name is read from its latest item (ListsContext `categoryFor`), the next "brown
// bread" lands there too. Touch needs a long press, so swiping a row to tick or delete
// still works; a mouse drags after a few pixels. Keyboard and screen-reader users have
// the same move in the item's sheet (its Aisle chips).
import React, { useState } from 'react';
import {
  DndContext,
  DragOverlay,
  MouseSensor,
  TouchSensor,
  useSensor,
  useSensors,
  type DragEndEvent,
  type DragStartEvent,
} from '@dnd-kit/core';
import { ListItem } from '../../types';
import { Icon } from '../ui';

const reducedMotion = () => window.matchMedia?.('(prefers-reduced-motion: reduce)').matches ?? false;

export function AisleDnd({
  items,
  onMove,
  children,
}: {
  items: ListItem[];
  /** The item was dropped on another aisle (`categoryId`). */
  onMove: (item: ListItem, categoryId: string) => void;
  children: React.ReactNode;
}) {
  const sensors = useSensors(
    useSensor(MouseSensor, { activationConstraint: { distance: 6 } }),
    useSensor(TouchSensor, { activationConstraint: { delay: 350, tolerance: 8 } }),
  );
  const [active, setActive] = useState<ListItem | null>(null);

  const onDragStart = (e: DragStartEvent) => {
    setActive(items.find((i) => i.id === e.active.id) ?? null);
    try {
      navigator.vibrate?.(12);
    } catch {
      /* no vibration */
    }
  };
  const onDragEnd = (e: DragEndEvent) => {
    const item = items.find((i) => i.id === e.active.id);
    setActive(null);
    const to = e.over?.id;
    if (item && typeof to === 'string' && to !== (item.category || 'other')) onMove(item, to);
  };

  return (
    <DndContext sensors={sensors} onDragStart={onDragStart} onDragEnd={onDragEnd} onDragCancel={() => setActive(null)}>
      {children}
      <DragOverlay dropAnimation={reducedMotion() ? null : undefined}>
        {active && (
          <div
            className="flex items-center gap-3 rounded-[16px] bg-surface"
            style={{
              minHeight: 56,
              padding: '0 16px',
              boxShadow: '0 14px 34px rgba(41,33,24,0.22), 0 0 0 1.5px var(--accent)',
              transform: reducedMotion() ? undefined : 'rotate(-1.5deg)',
              cursor: 'grabbing',
            }}
          >
            <span aria-hidden className="block shrink-0 rounded-full shadow-[inset_0_0_0_2px_var(--ink-faint)]" style={{ width: 24, height: 24 }} />
            <span className="flex-1 min-w-0 font-bold text-[16.5px] line-clamp-2 break-words">{active.name}</span>
            <Icon name="grip" size={20} color="var(--ink-faint)" />
          </div>
        )}
      </DragOverlay>
    </DndContext>
  );
}
