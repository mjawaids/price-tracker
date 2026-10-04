import { useEffect, useState } from 'react';
import { ListItem } from '../../types';
import { useLists } from '../../contexts/ListsContext';
import { UNIT_CHOICES } from '../../utils/quickAdd';
import { Btn, Icon, Sheet } from '../ui';
import { CATEGORY_ORDER, categoryMeta } from './listHelpers';

const fieldLabel = 'font-mono text-[11px] font-bold tracking-[0.12em] uppercase text-ink-soft';
const inputCls =
  'w-full bg-paper border-0 outline-none rounded-[14px] text-ink shadow-[inset_0_0_0_1.5px_var(--line)] focus:shadow-[inset_0_0_0_2px_var(--accent)]';

// ── Item details ─────────────────────────────────────────────────────────────
export function ItemSheet({
  item,
  onClose,
  onDelete,
  onCompare,
}: {
  item: ListItem | null;
  onClose: () => void;
  onDelete: (item: ListItem) => void;
  onCompare: () => void;
}) {
  const lists = useLists();
  const [name, setName] = useState('');
  const [note, setNote] = useState('');

  useEffect(() => {
    setName(item?.name ?? '');
    setNote(item?.note ?? '');
    // Only reset the drafts when a different item is opened.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [item?.id]);

  if (!item) return null;

  const saveText = () => {
    const n = name.trim();
    const patch: Partial<ListItem> = {};
    if (n && n !== item.name) patch.name = n;
    const nt = note.trim() || null;
    if (nt !== item.note) patch.note = nt;
    if (Object.keys(patch).length) lists.updateItem(item.id, patch);
  };
  const close = () => {
    saveText();
    onClose();
  };
  const qty = item.quantity ?? 1;

  return (
    <Sheet open onClose={close} title="Item details">
      <div className="flex flex-col gap-[18px]">
        <div className="flex flex-col gap-1.5">
          <label htmlFor="item-name" className={fieldLabel}>
            Item
          </label>
          <input
            id="item-name"
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            onBlur={saveText}
            maxLength={120}
            className={`${inputCls} font-display font-extrabold text-[20px]`}
            style={{ height: 52, padding: '0 14px' }}
          />
        </div>

        <div className="flex flex-col gap-2">
          <span className={fieldLabel}>How many</span>
          <div className="flex items-center gap-3">
            <button
              type="button"
              aria-label="Decrease quantity"
              onClick={() => lists.updateItem(item.id, { quantity: qty > 1 ? qty - 1 : null })}
              className="grid place-items-center rounded-full bg-surface text-ink shadow-[inset_0_0_0_1.5px_var(--line)] active:scale-95"
              style={{ width: 44, height: 44 }}
            >
              <Icon name="minus" size={18} stroke={2.8} />
            </button>
            <span className="font-mono text-[18px] font-bold text-center" style={{ minWidth: 28 }} aria-live="polite">
              {qty}
            </span>
            <button
              type="button"
              aria-label="Increase quantity"
              onClick={() => lists.updateItem(item.id, { quantity: qty + 1 })}
              className="grid place-items-center rounded-full bg-surface text-ink shadow-[inset_0_0_0_1.5px_var(--line)] active:scale-95"
              style={{ width: 44, height: 44 }}
            >
              <Icon name="plus" size={18} stroke={2.8} />
            </button>
          </div>
          <div className="flex flex-wrap gap-1.5" role="group" aria-label="Unit">
            {UNIT_CHOICES.map((u) => {
              const on = (item.unit || '') === u;
              return (
                <button
                  key={u || 'pcs'}
                  type="button"
                  aria-pressed={on}
                  onClick={() => lists.updateItem(item.id, { unit: u || null })}
                  className={`rounded-full text-sm ${on ? 'bg-ink text-paper font-bold' : 'bg-surface text-ink-soft font-semibold shadow-[inset_0_0_0_1px_var(--line)]'}`}
                  style={{ minHeight: 40, padding: '0 14px' }}
                >
                  {u || 'pcs'}
                </button>
              );
            })}
          </div>
        </div>

        <div className="flex flex-col gap-2">
          <span className={fieldLabel}>Aisle</span>
          <div
            className="flex gap-1.5 overflow-x-auto no-scrollbar -mx-5 px-5"
            role="group"
            aria-label="Aisle"
            ref={(el) => el?.querySelector<HTMLElement>('[aria-pressed="true"]')?.scrollIntoView({ block: 'nearest', inline: 'center' })}
          >
            {CATEGORY_ORDER.map((id) => {
              const c = categoryMeta(id);
              const on = (item.category || 'other') === id;
              return (
                <button
                  key={id}
                  type="button"
                  aria-pressed={on}
                  onClick={() => lists.updateItem(item.id, { category: id })}
                  className={`shrink-0 inline-flex items-center gap-1.5 rounded-full text-sm ${on ? 'font-bold' : 'font-semibold bg-surface text-ink-soft shadow-[inset_0_0_0_1px_var(--line)]'}`}
                  style={{
                    minHeight: 40,
                    padding: '0 14px',
                    ...(on ? { background: c.tint, color: c.ink, boxShadow: `inset 0 0 0 1.5px ${c.dot}` } : {}),
                  }}
                >
                  <span aria-hidden className="rounded-full" style={{ width: 8, height: 8, background: c.dot }} />
                  {c.name}
                </button>
              );
            })}
          </div>
        </div>

        <div className="flex flex-col gap-1.5">
          <label htmlFor="item-note" className={fieldLabel}>
            Note
          </label>
          <input
            id="item-note"
            type="text"
            value={note}
            onChange={(e) => setNote(e.target.value)}
            onBlur={saveText}
            maxLength={500}
            placeholder="Optional — brand, size, “the big pack”"
            className={`${inputCls} text-[16px] placeholder:text-ink-soft`}
            style={{ height: 48, padding: '0 14px' }}
          />
        </div>

        <button
          type="button"
          onClick={() => {
            saveText();
            onCompare();
          }}
          className="flex items-center gap-3 rounded-btn bg-[var(--backdrop)] text-left text-ink"
          style={{ padding: '12px 14px' }}
        >
          <span className="shrink-0 grid place-items-center rounded-[11px] bg-accent-wash text-accent-ink" style={{ width: 36, height: 36 }}>
            <Icon name="tag" size={18} stroke={2.2} />
          </span>
          <span className="flex-1 flex flex-col gap-px">
            <span className="font-bold text-[15px]">Compare prices</span>
            <span className="text-[13px] text-ink-soft">Optional — track prices at your stores</span>
          </span>
          <Icon name="chevR" size={18} stroke={2.4} color="var(--ink-soft)" />
        </button>

        <div className="flex gap-2.5">
          <button
            type="button"
            onClick={() => onDelete(item)}
            className="inline-flex items-center gap-2 rounded-btn bg-transparent text-danger font-bold text-[15.5px] shadow-[inset_0_0_0_1.5px_var(--line)]"
            style={{ minHeight: 52, padding: '0 18px' }}
          >
            <Icon name="trash" size={18} stroke={2.2} />
            Delete
          </button>
          <Btn size="lg" full onClick={close} className="flex-1">
            Done
          </Btn>
        </div>
      </div>
    </Sheet>
  );
}

// ── Switch / create / manage lists ───────────────────────────────────────────
export function ListSwitcherSheet({ open, onClose, startCreating = false }: { open: boolean; onClose: () => void; startCreating?: boolean }) {
  const lists = useLists();
  const [creating, setCreating] = useState(startCreating);
  const [newName, setNewName] = useState('');
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editName, setEditName] = useState('');
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);

  useEffect(() => {
    if (!open) {
      setCreating(false);
      setNewName('');
      setEditingId(null);
      setConfirmDeleteId(null);
    }
  }, [open]);

  const create = () => {
    const n = newName.trim();
    if (!n) return;
    const list = lists.createList(n);
    lists.setActiveList(list.id);
    onClose();
  };

  return (
    <Sheet open={open} onClose={onClose} title="Your lists">
      <ul className="list-none m-0 p-0 flex flex-col gap-1.5">
        {lists.lists.map((l) => {
          const on = l.id === lists.activeList?.id;
          const count = lists.todoCountByList[l.id] || 0;
          if (editingId === l.id) {
            return (
              <li key={l.id}>
                <form
                  className="flex gap-2"
                  onSubmit={(e) => {
                    e.preventDefault();
                    lists.renameList(l.id, editName);
                    setEditingId(null);
                  }}
                >
                  <label htmlFor={`rename-${l.id}`} className="sr-only">
                    List name
                  </label>
                  <input
                    id={`rename-${l.id}`}
                    autoFocus
                    value={editName}
                    onChange={(e) => setEditName(e.target.value)}
                    maxLength={60}
                    className={`${inputCls} flex-1 text-[16px] font-semibold`}
                    style={{ height: 52, padding: '0 14px' }}
                  />
                  <Btn type="submit">Save</Btn>
                </form>
              </li>
            );
          }
          return (
            <li key={l.id} className="flex items-center gap-1.5">
              <button
                type="button"
                aria-current={on ? 'true' : undefined}
                onClick={() => {
                  lists.setActiveList(l.id);
                  onClose();
                }}
                className={`flex-1 min-w-0 flex items-center gap-3 rounded-btn text-left text-ink ${on ? 'bg-accent-wash' : 'bg-transparent shadow-[inset_0_0_0_1px_var(--line)]'}`}
                style={{ minHeight: 60, padding: '0 14px' }}
              >
                <span
                  className={`shrink-0 grid place-items-center rounded-[11px] ${on ? 'bg-accent text-accent-on' : 'bg-[var(--backdrop)] text-ink-soft'}`}
                  style={{ width: 36, height: 36 }}
                >
                  <Icon name="lists" size={18} stroke={2.3} />
                </span>
                <span className={`flex-1 truncate text-[16.5px] ${on ? 'font-bold' : 'font-semibold'}`}>{l.name}</span>
                <span className={`font-mono text-[12.5px] ${on ? 'font-bold text-accent-ink' : 'text-ink-soft'}`}>
                  {count ? `${count} to buy` : 'Empty'}
                </span>
              </button>
              <button
                type="button"
                aria-label={`Rename ${l.name}`}
                onClick={() => {
                  setEditingId(l.id);
                  setEditName(l.name);
                }}
                className="shrink-0 grid place-items-center rounded-[14px] bg-transparent text-ink-soft"
                style={{ width: 44, height: 44 }}
              >
                <Icon name="edit" size={17} stroke={2.2} />
              </button>
              {confirmDeleteId === l.id ? (
                <button
                  type="button"
                  onClick={() => {
                    lists.deleteList(l.id);
                    setConfirmDeleteId(null);
                  }}
                  className="shrink-0 rounded-[14px] bg-danger-wash text-danger font-bold text-[13.5px]"
                  style={{ minHeight: 44, padding: '0 12px' }}
                >
                  Delete?
                </button>
              ) : (
                <button
                  type="button"
                  aria-label={`Delete ${l.name}`}
                  onClick={() => setConfirmDeleteId(l.id)}
                  className="shrink-0 grid place-items-center rounded-[14px] bg-transparent text-ink-soft"
                  style={{ width: 44, height: 44 }}
                >
                  <Icon name="trash" size={17} stroke={2.2} />
                </button>
              )}
            </li>
          );
        })}
      </ul>

      <div className="mt-3">
        {creating ? (
          <form
            className="flex gap-2"
            onSubmit={(e) => {
              e.preventDefault();
              create();
            }}
          >
            <label htmlFor="new-list" className="sr-only">
              New list name
            </label>
            <input
              id="new-list"
              autoFocus
              value={newName}
              onChange={(e) => setNewName(e.target.value)}
              maxLength={60}
              placeholder="e.g. Pharmacy, Hardware store"
              className={`${inputCls} flex-1 text-[16px] font-semibold placeholder:text-ink-soft placeholder:font-medium`}
              style={{ height: 52, padding: '0 14px' }}
            />
            <Btn type="submit" disabled={!newName.trim()}>
              Create
            </Btn>
          </form>
        ) : (
          <Btn variant="dark" size="lg" full icon="plus" onClick={() => setCreating(true)}>
            New list
          </Btn>
        )}
      </div>
    </Sheet>
  );
}
