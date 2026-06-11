import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { toast } from 'sonner';
import { User, KeyRound, ListTree, DollarSign, Plus, Pencil, Trash2, Check, X } from 'lucide-react';
import { PageHeader } from '@/components/shared/PageHeader';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/Card';
import { Tabs } from '@/components/ui/Tabs';
import { Button } from '@/components/ui/Button';
import { Input, Select } from '@/components/ui/Input';
import { Switch } from '@/components/ui/Switch';
import { Badge } from '@/components/ui/Badge';
import { PasswordInput } from '@/components/ui/PasswordInput';
import { FormField } from '@/components/ui/FormField';
import { Avatar } from '@/components/ui/Avatar';
import { ConfirmDialog } from '@/components/shared/ConfirmDialog';
import { useAuthStore } from '@/store/authStore';
import { ROLE_LABELS } from '@/lib/constants';
import { formatDate, fromTiyin } from '@/lib/utils/format';
import { apiError } from '@/lib/api/axios';
import { useChangePassword } from '@/features/auth/authApi';
import { useReference, useSaveReference, useDeleteReference, useCurrencies, useUpdateRate } from '@/features/settings/settingsApi';

const passSchema = z
  .object({
    oldPassword: z.string().min(1, 'Joriy parolni kiriting'),
    newPassword: z.string().min(6, 'Kamida 6 belgi'),
    confirm: z.string(),
  })
  .refine((d) => d.newPassword === d.confirm, { message: 'Parollar mos emas', path: ['confirm'] });

export function SettingsPage() {
  const user = useAuthStore((s) => s.user);
  const isAdmin = ['superadmin', 'admin'].includes(user?.role);
  const canRefs = ['superadmin', 'admin', 'manager'].includes(user?.role); // TZ 8.1/8.3
  const [tab, setTab] = useState('profile');

  const tabs = [
    { value: 'profile', label: 'Profil', icon: User },
    ...(canRefs ? [{ value: 'refs', label: "Ma'lumotnomalar", icon: ListTree }] : []),
    ...(isAdmin ? [{ value: 'currency', label: 'Valuta', icon: DollarSign }] : []),
  ];

  return (
    <div>
      <PageHeader title="Sozlamalar" subtitle="Profil, xavfsizlik va tizim sozlamalari" />
      <Tabs tabs={tabs} value={tab} onChange={setTab} className="mb-6" />
      {tab === 'profile' && <ProfileTab user={user} />}
      {tab === 'refs' && canRefs && <ReferencesTab />}
      {tab === 'currency' && isAdmin && <CurrencyTab />}
    </div>
  );
}

function ProfileTab({ user }) {
  const change = useChangePassword();
  const { register, handleSubmit, reset, formState: { errors } } = useForm({ resolver: zodResolver(passSchema) });

  const onSubmit = (v) => {
    change.mutate({ oldPassword: v.oldPassword, newPassword: v.newPassword }, {
      onSuccess: () => { toast.success("Parol o'zgartirildi"); reset(); },
      onError: (e) => toast.error(apiError(e)),
    });
  };

  return (
    <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
      <Card>
        <CardHeader><CardTitle>Profil</CardTitle></CardHeader>
        <CardContent className="flex items-center gap-4">
          <Avatar name={user?.fullName} src={user?.avatar} size="lg" />
          <div>
            <p className="font-medium text-text-strong">{user?.fullName}</p>
            <p className="text-sm text-text-sub">{ROLE_LABELS[user?.role]}</p>
            <p className="mt-1 text-xs text-text-soft">Login o'zgartirilmaydi</p>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader><CardTitle className="flex items-center gap-2"><KeyRound className="h-4 w-4" /> Parolni o'zgartirish</CardTitle></CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit(onSubmit)} className="space-y-3">
            <FormField label="Joriy parol" error={errors.oldPassword?.message} required>
              <PasswordInput {...register('oldPassword')} error={errors.oldPassword} />
            </FormField>
            <FormField label="Yangi parol" error={errors.newPassword?.message} required>
              <PasswordInput {...register('newPassword')} error={errors.newPassword} />
            </FormField>
            <FormField label="Tasdiqlang" error={errors.confirm?.message} required>
              <PasswordInput {...register('confirm')} error={errors.confirm} />
            </FormField>
            <Button type="submit" loading={change.isPending}>Saqlash</Button>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}

function ReferencesTab() {
  return (
    <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
      <RegionManager />
      <DistrictManager />
      <ReferenceManager model="position" title="Lavozimlar" />
      <ReferenceManager model="projectType" title="Loyiha turlari" />
      <ReferenceManager model="expenseCategory" title="Xarajat kategoriyalari" />
    </div>
  );
}

/** Simple name-only reference (position / projectType / expenseCategory). */
function ReferenceManager({ model, title }) {
  const { data: items } = useReference(model);
  const save = useSaveReference(model);
  const del = useDeleteReference(model);
  const [newName, setNewName] = useState('');
  const [editId, setEditId] = useState(null);
  const [editName, setEditName] = useState('');
  const [deleting, setDeleting] = useState(null);

  const add = () => {
    if (!newName.trim()) return;
    save.mutate({ name: newName.trim() }, { onSuccess: () => setNewName(''), onError: (e) => toast.error(apiError(e)) });
  };
  const saveEdit = () => {
    save.mutate({ id: editId, name: editName.trim() }, { onSuccess: () => setEditId(null), onError: (e) => toast.error(apiError(e)) });
  };

  return (
    <Card>
      <CardHeader><CardTitle>{title}</CardTitle></CardHeader>
      <CardContent>
        <div className="mb-3 flex gap-2">
          <Input placeholder="Yangi nom..." value={newName} onChange={(e) => setNewName(e.target.value)} onKeyDown={(e) => e.key === 'Enter' && add()} />
          <Button size="icon" onClick={add} loading={save.isPending}><Plus className="h-4 w-4" /></Button>
        </div>
        <div className="space-y-1">
          {(items || []).map((it) => (
            <div key={it.id} className="flex items-center gap-2 rounded-md border border-stroke-soft px-3 py-2">
              {editId === it.id ? (
                <>
                  <Input value={editName} onChange={(e) => setEditName(e.target.value)} className="h-8" />
                  <button onClick={saveEdit} className="text-text-accent"><Check className="h-4 w-4" /></button>
                  <button onClick={() => setEditId(null)} className="text-icon-soft"><X className="h-4 w-4" /></button>
                </>
              ) : (
                <>
                  <span className="flex-1 text-sm text-text-strong">{it.name}</span>
                  <button onClick={() => { setEditId(it.id); setEditName(it.name); }} className="text-icon-soft hover:text-text-accent"><Pencil className="h-3.5 w-3.5" /></button>
                  <button onClick={() => setDeleting(it)} className="text-icon-soft hover:text-error-strong"><Trash2 className="h-3.5 w-3.5" /></button>
                </>
              )}
            </div>
          ))}
          {!items?.length && <p className="text-sm text-text-soft">Bo'sh</p>}
        </div>
      </CardContent>
      <ConfirmDialog
        open={!!deleting}
        onClose={() => setDeleting(null)}
        onConfirm={() => del.mutate(deleting.id, { onSuccess: () => { toast.success("O'chirildi"); setDeleting(null); }, onError: (e) => toast.error(apiError(e)) })}
        loading={del.isPending}
        message={`"${deleting?.name}" ni o'chirmoqchimisiz?`}
      />
    </Card>
  );
}

/** Hududlar (Region) — nom + "arizalar uchun" (isApplication) bayrog'i. */
function RegionManager() {
  const { data: items } = useReference('region');
  const save = useSaveReference('region');
  const del = useDeleteReference('region');
  const [newName, setNewName] = useState('');
  const [newIsApp, setNewIsApp] = useState(false);
  const [deleting, setDeleting] = useState(null);

  const add = () => {
    if (!newName.trim()) return;
    save.mutate({ name: newName.trim(), isApplication: newIsApp }, {
      onSuccess: () => { setNewName(''); setNewIsApp(false); },
      onError: (e) => toast.error(apiError(e)),
    });
  };
  const toggleApp = (it) => save.mutate({ id: it.id, isApplication: !it.isApplication }, { onError: (e) => toast.error(apiError(e)) });

  return (
    <Card>
      <CardHeader><CardTitle>Hududlar (Viloyatlar)</CardTitle></CardHeader>
      <CardContent>
        <div className="mb-2 flex gap-2">
          <Input placeholder="Yangi viloyat..." value={newName} onChange={(e) => setNewName(e.target.value)} onKeyDown={(e) => e.key === 'Enter' && add()} />
          <Button size="icon" onClick={add} loading={save.isPending}><Plus className="h-4 w-4" /></Button>
        </div>
        <label className="mb-3 flex items-center gap-2 text-xs text-text-sub">
          <Switch checked={newIsApp} onChange={setNewIsApp} /> Arizalar uchun
        </label>
        <div className="space-y-1">
          {(items || []).map((it) => (
            <div key={it.id} className="flex items-center gap-2 rounded-md border border-stroke-soft px-3 py-2">
              <span className="flex-1 text-sm text-text-strong">{it.name}</span>
              <button title="Arizalar uchun" onClick={() => toggleApp(it)}>
                {it.isApplication ? <Badge tone="success">Ariza</Badge> : <Badge tone="muted">—</Badge>}
              </button>
              <button onClick={() => setDeleting(it)} className="text-icon-soft hover:text-error-strong"><Trash2 className="h-3.5 w-3.5" /></button>
            </div>
          ))}
          {!items?.length && <p className="text-sm text-text-soft">Bo'sh</p>}
        </div>
      </CardContent>
      <ConfirmDialog
        open={!!deleting}
        onClose={() => setDeleting(null)}
        onConfirm={() => del.mutate(deleting.id, { onSuccess: () => { toast.success("O'chirildi"); setDeleting(null); }, onError: (e) => toast.error(apiError(e)) })}
        loading={del.isPending}
        message={`"${deleting?.name}" ni o'chirmoqchimisiz?`}
      />
    </Card>
  );
}

/** Tumanlar (District) — nom + viloyat + "arizalar uchun" bayrog'i. */
function DistrictManager() {
  const { data: regions } = useReference('region');
  const { data: items } = useReference('district');
  const save = useSaveReference('district');
  const del = useDeleteReference('district');
  const [newName, setNewName] = useState('');
  const [newRegion, setNewRegion] = useState('');
  const [newIsApp, setNewIsApp] = useState(false);
  const [deleting, setDeleting] = useState(null);

  const add = () => {
    if (!newName.trim()) return;
    save.mutate(
      { name: newName.trim(), regionId: newRegion ? Number(newRegion) : null, isApplication: newIsApp },
      { onSuccess: () => { setNewName(''); setNewIsApp(false); }, onError: (e) => toast.error(apiError(e)) },
    );
  };
  const toggleApp = (it) => save.mutate({ id: it.id, isApplication: !it.isApplication }, { onError: (e) => toast.error(apiError(e)) });

  return (
    <Card>
      <CardHeader><CardTitle>Tumanlar</CardTitle></CardHeader>
      <CardContent>
        <div className="mb-2 grid grid-cols-1 gap-2">
          <Input placeholder="Yangi tuman..." value={newName} onChange={(e) => setNewName(e.target.value)} onKeyDown={(e) => e.key === 'Enter' && add()} />
          <div className="flex gap-2">
            <Select value={newRegion} onChange={(e) => setNewRegion(e.target.value)} className="flex-1">
              <option value="">— Viloyat —</option>
              {(regions || []).map((r) => <option key={r.id} value={r.id}>{r.name}</option>)}
            </Select>
            <Button size="icon" onClick={add} loading={save.isPending}><Plus className="h-4 w-4" /></Button>
          </div>
        </div>
        <label className="mb-3 flex items-center gap-2 text-xs text-text-sub">
          <Switch checked={newIsApp} onChange={setNewIsApp} /> Arizalar uchun
        </label>
        <div className="max-h-72 space-y-1 overflow-y-auto">
          {(items || []).map((it) => (
            <div key={it.id} className="flex items-center gap-2 rounded-md border border-stroke-soft px-3 py-2">
              <span className="flex-1 text-sm text-text-strong">{it.name}</span>
              <span className="text-xs text-text-soft">{it.region?.name || '—'}</span>
              <button title="Arizalar uchun" onClick={() => toggleApp(it)}>
                {it.isApplication ? <Badge tone="success">Ariza</Badge> : <Badge tone="muted">—</Badge>}
              </button>
              <button onClick={() => setDeleting(it)} className="text-icon-soft hover:text-error-strong"><Trash2 className="h-3.5 w-3.5" /></button>
            </div>
          ))}
          {!items?.length && <p className="text-sm text-text-soft">Bo'sh</p>}
        </div>
      </CardContent>
      <ConfirmDialog
        open={!!deleting}
        onClose={() => setDeleting(null)}
        onConfirm={() => del.mutate(deleting.id, { onSuccess: () => { toast.success("O'chirildi"); setDeleting(null); }, onError: (e) => toast.error(apiError(e)) })}
        loading={del.isPending}
        message={`"${deleting?.name}" ni o'chirmoqchimisiz?`}
      />
    </Card>
  );
}

function CurrencyTab() {
  const { data: currencies } = useCurrencies();
  const update = useUpdateRate();
  const [rates, setRates] = useState({});

  const onSave = (code) => {
    const val = rates[code];
    if (!val) return;
    update.mutate({ code, rateToUzs: Number(val) }, {
      onSuccess: () => toast.success('Kurs yangilandi'),
      onError: (e) => toast.error(apiError(e)),
    });
  };

  return (
    <Card className="max-w-xl">
      <CardHeader><CardTitle>Valuta kurslari</CardTitle></CardHeader>
      <CardContent className="space-y-3">
        {(currencies || []).map((c) => (
          <div key={c.id} className="flex items-center gap-3 rounded-lg border border-stroke-soft p-3">
            <div className="flex-1">
              <p className="font-medium text-text-strong">{c.code} — {c.name}</p>
              <p className="text-xs text-text-soft">Yangilangan: {formatDate(c.updatedAt, true)}</p>
            </div>
            {c.code === 'UZS' ? (
              <span className="text-sm text-text-soft">Bazaviy (1)</span>
            ) : (
              <>
                <Input
                  type="number"
                  className="w-32"
                  defaultValue={c.rateToUzs}
                  onChange={(e) => setRates((r) => ({ ...r, [c.code]: e.target.value }))}
                />
                <span className="text-sm text-text-soft">so'm</span>
                <Button size="sm" onClick={() => onSave(c.code)} loading={update.isPending}>Saqlash</Button>
              </>
            )}
          </div>
        ))}
      </CardContent>
    </Card>
  );
}
