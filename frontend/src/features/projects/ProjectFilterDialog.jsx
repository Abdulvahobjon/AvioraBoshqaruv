import { useEffect, useState } from 'react';
import { Search, X } from 'lucide-react';
import { Dialog } from '@/components/ui/Dialog';
import { Button } from '@/components/ui/Button';
import { Select } from '@/components/ui/Input';
import { FormField } from '@/components/ui/FormField';
import { AntDate } from '@/components/ui/AntDate';
import { PROJECT_STATUS } from '@/lib/constants';
import { useUsersList } from '@/features/users/usersApi';

const EMPTY = { managerId: '', status: '', employeeId: '', startFrom: '', startTo: '', deadlineFrom: '', deadlineTo: '' };

/** Loyihalar filtri (Figma: Menejer, Holati, Xodim, sana oralig'i). onApply(filters) — bo'sh maydonlar tashlab yuboriladi. */
export function ProjectFilterDialog({ open, onClose, value, onApply }) {
  const { data: users } = useUsersList();
  const userOptions = users?.items || [];
  const [f, setF] = useState(EMPTY);
  const set = (k, v) => setF((s) => ({ ...s, [k]: v }));

  useEffect(() => {
    if (open) setF({ ...EMPTY, ...(value || {}) });
  }, [open]); // eslint-disable-line react-hooks/exhaustive-deps

  const apply = () => { onApply(f); onClose(); };
  const clear = () => { setF(EMPTY); onApply(EMPTY); onClose(); };

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
        <FormField label="Menejer">
          <Select value={f.managerId} onChange={(e) => set('managerId', e.target.value)} placeholder="Menejer tanlang">
            <option value="">Menejer tanlang</option>
            {userOptions.map((u) => <option key={u.id} value={u.id}>{u.fullName}</option>)}
          </Select>
        </FormField>
        <FormField label="Holati">
          <Select value={f.status} onChange={(e) => set('status', e.target.value)} placeholder="Holatini tanlang">
            <option value="">Holatini tanlang</option>
            {Object.entries(PROJECT_STATUS).map(([k, v]) => <option key={k} value={k}>{v.label}</option>)}
          </Select>
        </FormField>
        <FormField label="Xodim" className="sm:col-span-2">
          <Select value={f.employeeId} onChange={(e) => set('employeeId', e.target.value)} placeholder="Xodim tanlang">
            <option value="">Xodim tanlang</option>
            {userOptions.map((u) => <option key={u.id} value={u.id}>{u.fullName}</option>)}
          </Select>
        </FormField>

        <FormField label="Boshlanish sanasi oralig'i" className="sm:col-span-2">
          <div className="flex flex-col gap-2 sm:flex-row">
            <div className="flex-1"><AntDate value={f.startFrom} onChange={(v) => set('startFrom', v)} placeholder="dan:" /></div>
            <div className="flex-1"><AntDate value={f.startTo} onChange={(v) => set('startTo', v)} placeholder="gacha:" /></div>
          </div>
        </FormField>
        <FormField label="Muddat oralig'i" className="sm:col-span-2">
          <div className="flex flex-col gap-2 sm:flex-row">
            <div className="flex-1"><AntDate value={f.deadlineFrom} onChange={(v) => set('deadlineFrom', v)} placeholder="dan:" /></div>
            <div className="flex-1"><AntDate value={f.deadlineTo} onChange={(v) => set('deadlineTo', v)} placeholder="gacha:" /></div>
          </div>
        </FormField>
      </div>
    </Dialog>
  );
}
