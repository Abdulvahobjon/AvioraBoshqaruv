import { useEffect, useState } from 'react';
import { Search, X } from 'lucide-react';
import { Dialog } from '@/components/ui/Dialog';
import { Button } from '@/components/ui/Button';
import { Select } from '@/components/ui/Input';
import { MoneyInput } from '@/components/ui/MoneyInput';
import { FormField } from '@/components/ui/FormField';
import { AntDate } from '@/components/ui/AntDate';
import { toTiyin, fromTiyin } from '@/lib/utils/format';

const LEDGER_TYPES = [
  ['salary', 'Oylik'], ['company', 'Kompaniya'], ['other', 'Boshqa'],
  ['project_share', 'Loyiha ulushi'], ['withdrawal', 'Yechib olish'], ['reversal', 'Teskari yozuv'],
];

const EMPTY = { expenseType: '', direction: '', dateFrom: '', dateTo: '', amountMin: '', amountMax: '' };

/** Tarix (ledger) filtri: Xarajat turi, Turi (Kirim/Chiqim), sana oralig'i, miqdor. */
export function HistoryFilterDialog({ open, onClose, value, onApply }) {
  const [f, setF] = useState(EMPTY);
  const set = (k, v) => setF((s) => ({ ...s, [k]: v }));

  useEffect(() => {
    if (!open) return;
    const v = value || {};
    setF({ ...EMPTY, ...v, amountMin: v.amountMin ? String(fromTiyin(v.amountMin)) : '', amountMax: v.amountMax ? String(fromTiyin(v.amountMax)) : '' });
  }, [open]); // eslint-disable-line react-hooks/exhaustive-deps

  const apply = () => {
    onApply({
      expenseType: f.expenseType, direction: f.direction,
      dateFrom: f.dateFrom, dateTo: f.dateTo,
      amountMin: f.amountMin !== '' ? String(toTiyin(f.amountMin)) : '',
      amountMax: f.amountMax !== '' ? String(toTiyin(f.amountMax)) : '',
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
        <FormField label="Xarajat turi">
          <Select value={f.expenseType} onChange={(e) => set('expenseType', e.target.value)} placeholder="Xarajat turini tanlang">
            <option value="">Xarajat turini tanlang</option>
            {LEDGER_TYPES.map(([k, v]) => <option key={k} value={k}>{v}</option>)}
          </Select>
        </FormField>
        <FormField label="Turi">
          <Select value={f.direction} onChange={(e) => set('direction', e.target.value)} placeholder="Turini tanlang">
            <option value="">Turini tanlang</option>
            <option value="credit">Kirim</option>
            <option value="debit">Chiqim</option>
          </Select>
        </FormField>

        <FormField label="Sana oralig'i" className="sm:col-span-2">
          <div className="flex flex-col gap-2 sm:flex-row">
            <div className="flex-1"><AntDate value={f.dateFrom} onChange={(v) => set('dateFrom', v)} placeholder="dan:" /></div>
            <div className="flex-1"><AntDate value={f.dateTo} onChange={(v) => set('dateTo', v)} placeholder="gacha:" /></div>
          </div>
        </FormField>

        <FormField label="Miqdor (UZS)" className="sm:col-span-2">
          <div className="flex gap-2">
            <MoneyInput value={f.amountMin} onChange={(v) => set('amountMin', v)} placeholder="dan: 0" />
            <MoneyInput value={f.amountMax} onChange={(v) => set('amountMax', v)} placeholder="gacha: 0" />
          </div>
        </FormField>
      </div>
    </Dialog>
  );
}
