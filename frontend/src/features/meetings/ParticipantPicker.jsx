import { useState, useEffect, useMemo } from 'react';
import { Search, ListChecks, Check } from 'lucide-react';
import { Dialog } from '@/components/ui/Dialog';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Avatar } from '@/components/ui/Avatar';
import { cn } from '@/lib/utils/cn';

/**
 * Participant selection modal (step 2 of meeting creation).
 * users: [{ id, fullName, avatar, position }]; value: selected id array; onConfirm(ids).
 */
export function ParticipantPicker({ open, onClose, users = [], value = [], onConfirm, title = "Yig'ilishga qatnashchilar" }) {
  const [selected, setSelected] = useState([]);
  const [search, setSearch] = useState('');

  useEffect(() => {
    if (open) { setSelected(value); setSearch(''); }
  }, [open]); // eslint-disable-line react-hooks/exhaustive-deps

  const filtered = useMemo(
    () => users.filter((u) => u.fullName?.toLowerCase().includes(search.toLowerCase())),
    [users, search],
  );

  const allSelected = filtered.length > 0 && filtered.every((u) => selected.includes(u.id));

  const toggle = (id) => setSelected((s) => (s.includes(id) ? s.filter((x) => x !== id) : [...s, id]));
  const toggleAll = () => {
    if (allSelected) setSelected((s) => s.filter((id) => !filtered.some((u) => u.id === id)));
    else setSelected((s) => [...new Set([...s, ...filtered.map((u) => u.id)])]);
  };

  return (
    <Dialog
      open={open}
      onClose={onClose}
      onBack={onClose}
      title={title}
      size="md"
      footer={
        <div className="flex w-full items-center justify-between">
          <span className="text-sm text-text-sub">{selected.length} ta tanlangan</span>
          <div className="flex gap-2">
            <Button variant="ghost" onClick={() => setSelected([])}>Tozalash</Button>
            <Button onClick={() => { onConfirm?.(selected); onClose(); }}>
              <Check className="h-4 w-4" /> Qo'shish
            </Button>
          </div>
        </div>
      }
    >
      <div className="mb-3 flex gap-2">
        <Button variant="outline" size="sm" onClick={toggleAll}>
          <ListChecks className="h-4 w-4" /> {allSelected ? 'Bekor qilish' : 'Barchasini tanlash'}
        </Button>
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-icon-soft" />
          <Input placeholder="Ism bo'yicha izlash" className="pl-9" value={search} onChange={(e) => setSearch(e.target.value)} />
        </div>
      </div>

      <div className="max-h-[50vh] space-y-1.5 overflow-y-auto pr-1">
        {filtered.map((u) => {
          const checked = selected.includes(u.id);
          return (
            <button
              key={u.id}
              type="button"
              onClick={() => toggle(u.id)}
              className={cn(
                'flex w-full items-center gap-3 rounded-lg border px-3 py-2.5 text-left transition-colors',
                checked ? 'border-stroke-accent bg-accent-disabled/40' : 'border-stroke-soft hover:bg-bg-1-alt',
              )}
            >
              <span
                className={cn(
                  'flex h-5 w-5 shrink-0 items-center justify-center rounded-full border-2 transition-colors',
                  checked ? 'border-accent-strong bg-accent-strong text-text-white' : 'border-stroke-strong',
                )}
              >
                {checked && <Check className="h-3 w-3" />}
              </span>
              <Avatar name={u.fullName} src={u.avatar} size="sm" />
              <div className="min-w-0">
                <p className="truncate text-sm font-medium text-text-strong">{u.fullName}</p>
                <p className="truncate text-xs text-text-soft">{u.position?.name || '—'}</p>
              </div>
            </button>
          );
        })}
        {filtered.length === 0 && <p className="py-6 text-center text-sm text-text-soft">Xodim topilmadi</p>}
      </div>
    </Dialog>
  );
}
