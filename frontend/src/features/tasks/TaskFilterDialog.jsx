import { useState, useEffect } from 'react';
import { Search } from 'lucide-react';
import { Dialog } from '@/components/ui/Dialog';
import { Button } from '@/components/ui/Button';
import { Select } from '@/components/ui/Input';
import { DateTimeBox } from '@/components/ui/DateTimeBox';
import { FormField } from '@/components/ui/FormField';
import { Switch } from '@/components/ui/Switch';
import { TASK_STATUS, TASK_PRIORITY, TASK_TYPE } from '@/lib/constants';
import { useProjects } from '@/features/projects/projectsApi';
import { useUsersList } from '@/features/users/usersApi';

const EMPTY = { projectId: '', createdBy: '', assigneeId: '', status: '', priority: '', type: '', from: '', to: '', mine: false };

export function TaskFilterDialog({ open, onClose, value, onApply }) {
  const { data: projectList } = useProjects({ limit: 100 });
  const { data: userList } = useUsersList();
  const [f, setF] = useState(EMPTY);

  useEffect(() => { if (open) setF({ ...EMPTY, ...value }); }, [open]); // eslint-disable-line

  const set = (k, v) => setF((s) => ({ ...s, [k]: v }));
  const users = userList?.items || [];

  return (
    <Dialog
      open={open}
      onClose={onClose}
      onBack={onClose}
      title="Filtrlash"
      size="lg"
      footer={
        <div className="flex w-full items-center justify-between">
          <label className="flex items-center gap-2 text-sm font-medium text-text-sub">
            <Switch checked={f.mine} onChange={(v) => set('mine', v)} /> Mening vazifalarim
          </label>
          <div className="flex gap-2">
            <Button variant="ghost" onClick={() => { setF(EMPTY); onApply(EMPTY); onClose(); }}>Tozalash</Button>
            <Button onClick={() => { onApply(f); onClose(); }}><Search className="h-4 w-4" /> Qidirish</Button>
          </div>
        </div>
      }
    >
      <p className="-mt-2 mb-4 text-sm text-text-sub">Kerakli filtrlarni tanlang, natijalar shunga qarab saralanadi</p>
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        <FormField label="Loyiha" className="sm:col-span-3">
          <Select value={f.projectId} onChange={(e) => set('projectId', e.target.value)}>
            <option value="">Loyiha tanlang</option>
            {(projectList?.items || []).map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}
          </Select>
        </FormField>
        <FormField label="Muallif" className="sm:col-span-1">
          <Select value={f.createdBy} onChange={(e) => set('createdBy', e.target.value)}>
            <option value="">Muallif tanlang</option>
            {users.map((u) => <option key={u.id} value={u.id}>{u.fullName}</option>)}
          </Select>
        </FormField>
        <FormField label="Xodim" className="sm:col-span-2">
          <Select value={f.assigneeId} onChange={(e) => set('assigneeId', e.target.value)}>
            <option value="">Xodim tanlang</option>
            {users.map((u) => <option key={u.id} value={u.id}>{u.fullName}</option>)}
          </Select>
        </FormField>
        <FormField label="Holati">
          <Select value={f.status} onChange={(e) => set('status', e.target.value)}>
            <option value="">Holati tanlang</option>
            {Object.entries(TASK_STATUS).map(([k, v]) => <option key={k} value={k}>{v.label}</option>)}
          </Select>
        </FormField>
        <FormField label="Darajasi">
          <Select value={f.priority} onChange={(e) => set('priority', e.target.value)}>
            <option value="">Daraja tanlang</option>
            {Object.entries(TASK_PRIORITY).map(([k, v]) => <option key={k} value={k}>{v.label}</option>)}
          </Select>
        </FormField>
        <FormField label="Turi">
          <Select value={f.type} onChange={(e) => set('type', e.target.value)}>
            <option value="">Turi tanlang</option>
            {Object.entries(TASK_TYPE).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
          </Select>
        </FormField>
        <FormField label="Muddat (dan)">
          <DateTimeBox type="date" value={f.from} onChange={(v) => set('from', v)} />
        </FormField>
        <FormField label="Muddat (gacha)">
          <DateTimeBox type="date" value={f.to} onChange={(v) => set('to', v)} />
        </FormField>
      </div>
    </Dialog>
  );
}
