import { useEffect, useState } from 'react';
import { Search, X } from 'lucide-react';
import { Dialog } from '@/components/ui/Dialog';
import { Button } from '@/components/ui/Button';
import { MoneyInput } from '@/components/ui/MoneyInput';
import { FormField } from '@/components/ui/FormField';
import { AntDate } from '@/components/ui/AntDate';
import { Switch } from '@/components/ui/Switch';
import { toTiyin, fromTiyin } from '@/lib/utils/format';

const EMPTY = { month: '', createdFrom: '', createdTo: '', totalMin: '', totalMax: '', hasPenalty: false };

/** Ish haqi filtri (Figma): Oy, Yaratilgan vaqti oralig'i, Jami miqdori, Jarima miqdori (toggle). */
export function PayrollFilterDialog({ open, onClose, value, onApply }) {
  const [f, setF] = useState(EMPTY);
  const set = (k, v) => setF((s) => ({ ...s, [k]: v }));

  useEffect(() => {
    if (!open) return;
    const v = value || {};
    setF({
      ...EMPTY, ...v,
      totalMin: v.totalMin ? String(fromTiyin(v.totalMin)) : '',
      totalMax: v.totalMax ? String(fromTiyin(v.totalMax)) : '',
      hasPenalty: v.hasPenalty === '1',
    });
  }, [open]); // eslint-disable-line react-hooks/exhaustive-deps

  const apply = () => {
    onApply({
      month: f.month,
      createdFrom: f.createdFrom, createdTo: f.createdTo,
      totalMin: f.totalMin !== '' ? String(toTiyin(f.totalMin)) : '',
      totalMax: f.totalMax !== '' ? String(toTiyin(f.totalMax)) : '',
      hasPenalty: f.hasPenalty ? '1' : '',
    });
    onClose();
  };
  const clear = () => { setF(EMPTY); onApply({}); onClose(); };

  return (
    <Dialog
      open={open}
      onClose={onClose}
      onBack={onClose}
      title="Filtrlash"
      subtitle="Kerakli filtrlarni tanlang, natijalar shunga qarab saralanadi"
      size="lg"
      footer={
        <div className="flex w-full items-center justify-end gap-2">
          <Button variant="ghost" onClick={clear}><X className="h-4 w-4" /> Tozalash</Button>
          <Button onClick={apply}><Search className="h-4 w-4" /> Qidirish</Button>
        </div>
      }
    >
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <FormField label="Oy" className="sm:col-span-2">
          <AntDate value={f.month} onChange={(v) => set('month', v)} picker="month" placeholder="Oyni tanlang" />
        </FormField>

        <FormField label="Yaratilgan vaqti oralig'i" className="sm:col-span-2">
          <div className="flex flex-col gap-2 sm:flex-row">
            <div className="flex-1"><AntDate value={f.createdFrom} onChange={(v) => set('createdFrom', v)} placeholder="dan:" /></div>
            <div className="flex-1"><AntDate value={f.createdTo} onChange={(v) => set('createdTo', v)} placeholder="gacha:" /></div>
          </div>
        </FormField>

        <FormField label="Jami miqdori (UZS)">
          <div className="flex gap-2">
            <MoneyInput value={f.totalMin} onChange={(v) => set('totalMin', v)} placeholder="dan: 0" />
            <MoneyInput value={f.totalMax} onChange={(v) => set('totalMax', v)} placeholder="gacha: 0" />
          </div>
        </FormField>

        <FormField label="Jarima miqdori">
          <div className="flex h-10 items-center gap-2">
            <Switch checked={f.hasPenalty} onChange={(v) => set('hasPenalty', v)} />
            <span className="text-sm text-text-sub">Faqat jarimasi borlar</span>
          </div>
        </FormField>
      </div>
    </Dialog>
  );
}
