import { useEffect, useState } from 'react';
import { Search, X } from 'lucide-react';
import { Dialog } from '@/components/ui/Dialog';
import { Button } from '@/components/ui/Button';
import { Select } from '@/components/ui/Input';
import { MoneyInput } from '@/components/ui/MoneyInput';
import { FormField } from '@/components/ui/FormField';
import { AntDate } from '@/components/ui/AntDate';
import { Switch } from '@/components/ui/Switch';
import { FINANCE_TYPE } from '@/lib/constants';
import { toTiyin, fromTiyin } from '@/lib/utils/format';
import { useReference } from '@/features/settings/settingsApi';
import { useProjects } from '@/features/projects/projectsApi';

const EMPTY = {
  type: '', categoryId: '', projectId: '', amountMin: '', amountMax: '',
  createdFrom: '', createdTo: '', paidFrom: '', paidTo: '', confirmedFrom: '', confirmedTo: '', mine: false,
};

/** Xarajat so'rovlari filtri (Figma): tur, toifa, loyiha, summa, 3 ta sana oralig'i, "Mening so'rovlarim". */
export function RequestFilterDialog({ open, onClose, value, onApply, showMine }) {
  const { data: categories } = useReference('expenseCategory');
  const { data: projects } = useProjects({ limit: 200 });
  const [f, setF] = useState(EMPTY);
  const set = (k, v) => setF((s) => ({ ...s, [k]: v }));

  // Tashqi qiymat (tiyin/ISO) → ko'rinish (UZS) ga aylantirib yuklaymiz.
  useEffect(() => {
    if (!open) return;
    const v = value || {};
    setF({
      ...EMPTY, ...v,
      amountMin: v.amountMin ? String(fromTiyin(v.amountMin)) : '',
      amountMax: v.amountMax ? String(fromTiyin(v.amountMax)) : '',
    });
  }, [open]); // eslint-disable-line react-hooks/exhaustive-deps

  const apply = () => {
    onApply({
      type: f.type, categoryId: f.categoryId, projectId: f.projectId,
      amountMin: f.amountMin !== '' ? String(toTiyin(f.amountMin)) : '',
      amountMax: f.amountMax !== '' ? String(toTiyin(f.amountMax)) : '',
      createdFrom: f.createdFrom, createdTo: f.createdTo,
      paidFrom: f.paidFrom, paidTo: f.paidTo,
      confirmedFrom: f.confirmedFrom, confirmedTo: f.confirmedTo,
      mine: f.mine ? '1' : '',
    });
    onClose();
  };
  const clear = () => { setF(EMPTY); onApply({}); onClose(); };

  const Range = ({ label, fromK, toK }) => (
    <FormField label={label} className="sm:col-span-2">
      <div className="flex flex-col gap-2 sm:flex-row">
        <div className="flex-1"><AntDate value={f[fromK]} onChange={(v) => set(fromK, v)} placeholder="dan:" /></div>
        <div className="flex-1"><AntDate value={f[toK]} onChange={(v) => set(toK, v)} placeholder="gacha:" /></div>
      </div>
    </FormField>
  );

  return (
    <Dialog
      open={open}
      onClose={onClose}
      onBack={onClose}
      title="Filtrlash"
      subtitle="Kerakli filtrlarni tanlang, natijalar shunga qarab saralanadi"
      size="lg"
      footer={
        <div className="flex w-full items-center justify-between gap-2">
          {showMine ? (
            <label className="flex items-center gap-2 text-sm text-text-sub">
              <Switch checked={f.mine} onChange={(v) => set('mine', v)} /> Mening so'rovlarim
            </label>
          ) : <span />}
          <div className="flex items-center gap-2">
            <Button variant="ghost" onClick={clear}><X className="h-4 w-4" /> Tozalash</Button>
            <Button onClick={apply}><Search className="h-4 w-4" /> Qidirish</Button>
          </div>
        </div>
      }
    >
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <FormField label="Xarajat turi">
          <Select value={f.type} onChange={(e) => set('type', e.target.value)} placeholder="Xarajat turini tanlang">
            <option value="">Xarajat turini tanlang</option>
            {Object.entries(FINANCE_TYPE).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
          </Select>
        </FormField>
        <FormField label="Toifa">
          <Select value={f.categoryId} onChange={(e) => set('categoryId', e.target.value)} placeholder="Toifani tanlang">
            <option value="">Toifani tanlang</option>
            {(categories || []).map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
          </Select>
        </FormField>
        <FormField label="Loyiha">
          <Select value={f.projectId} onChange={(e) => set('projectId', e.target.value)} placeholder="Loyiha tanlang">
            <option value="">Loyiha tanlang</option>
            {(projects?.items || []).map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}
          </Select>
        </FormField>
        <FormField label="Summa (UZS)">
          <div className="flex gap-2">
            <MoneyInput value={f.amountMin} onChange={(v) => set('amountMin', v)} placeholder="dan: 0" />
            <MoneyInput value={f.amountMax} onChange={(v) => set('amountMax', v)} placeholder="gacha: 0" />
          </div>
        </FormField>

        <Range label="Yaratilgan vaqti oralig'i" fromK="createdFrom" toK="createdTo" />
        <Range label="To'langan vaqti oralig'i" fromK="paidFrom" toK="paidTo" />
        <Range label="Tasdiqlangan vaqti oralig'i" fromK="confirmedFrom" toK="confirmedTo" />
      </div>
    </Dialog>
  );
}
