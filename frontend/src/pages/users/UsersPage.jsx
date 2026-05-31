import { useState, useEffect } from 'react';
import { useForm, Controller } from 'react-hook-form';
import { Plus, Pencil, Trash2, Search, CreditCard, Wallet, Banknote, Briefcase, Calendar, ShieldCheck } from 'lucide-react';
import { toast } from 'sonner';
import { PageHeader } from '@/components/shared/PageHeader';
import { DataTable } from '@/components/shared/DataTable';
import { Dialog } from '@/components/ui/Dialog';
import { Button } from '@/components/ui/Button';
import { Input, Select } from '@/components/ui/Input';
import { MoneyInput } from '@/components/ui/MoneyInput';
import { PasswordInput } from '@/components/ui/PasswordInput';
import { FormField } from '@/components/ui/FormField';
import { Badge } from '@/components/ui/Badge';
import { Avatar } from '@/components/ui/Avatar';
import { ConfirmDialog } from '@/components/shared/ConfirmDialog';
import { ROLE_LABELS } from '@/lib/constants';
import { formatMoney, formatDate, toTiyin, fromTiyin } from '@/lib/utils/format';
import { apiError } from '@/lib/api/axios';
import { useDebounce } from '@/hooks/useDebounce';
import { useReference } from '@/features/settings/settingsApi';
import { useUsersList, useSaveUser, useDeleteUser } from '@/features/users/usersApi';

export function UsersPage() {
  const [search, setSearch] = useState('');
  const debounced = useDebounce(search);
  const { data, isLoading } = useUsersList({ search: debounced });
  const [formOpen, setFormOpen] = useState(false);
  const [editing, setEditing] = useState(null);
  const [deleting, setDeleting] = useState(null);
  const [detail, setDetail] = useState(null);
  const del = useDeleteUser();

  const columns = [
    { key: 'idx', header: '№', className: 'w-12', render: (_r, i) => i + 1 },
    {
      key: 'fullName', header: 'Ism Sharifi',
      render: (r) => (
        <div className="flex items-center gap-2.5">
          <Avatar name={r.fullName} src={r.avatar} size="sm" />
          <div>
            <p className="font-medium text-text-strong">{r.fullName}</p>
            <p className="text-xs text-text-soft">{r.position?.name || '—'}</p>
          </div>
        </div>
      ),
    },
    { key: 'role', header: 'Rol', render: (r) => <Badge tone="info">{ROLE_LABELS[r.role]}</Badge> },
    { key: 'fixedSalary', header: 'Oylik maosh', render: (r) => <span className="font-medium">{formatMoney(r.fixedSalary)}</span> },
    { key: 'balance', header: 'Balans', render: (r) => formatMoney(r.balance) },
    { key: 'status', header: 'Status', render: (r) => <Badge tone={r.status === 'active' ? 'success' : 'muted'}>{r.status === 'active' ? 'Faol' : 'Nofaol'}</Badge> },
    {
      key: 'actions', header: '', className: 'w-20',
      render: (r) => (
        <div className="flex justify-end gap-1" onClick={(e) => e.stopPropagation()}>
          <button className="rounded p-1.5 text-icon-sub hover:bg-bg-2" onClick={() => { setEditing(r); setFormOpen(true); }}><Pencil className="h-4 w-4" /></button>
          <button className="rounded p-1.5 text-error-strong hover:bg-error-soft" onClick={() => setDeleting(r)}><Trash2 className="h-4 w-4" /></button>
        </div>
      ),
    },
  ];

  return (
    <div>
      <PageHeader
        title="Foydalanuvchilar"
        subtitle="Xodimlar va rollar boshqaruvi"
        actions={<Button onClick={() => { setEditing(null); setFormOpen(true); }}><Plus className="h-4 w-4" /> Yangi xodim</Button>}
      />
      <div className="relative mb-4 max-w-md">
        <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-icon-soft" />
        <Input placeholder="Ism bo'yicha qidirish..." className="pl-9" value={search} onChange={(e) => setSearch(e.target.value)} />
      </div>
      <DataTable
        columns={columns}
        data={data?.items}
        loading={isLoading}
        onRowClick={(r) => setDetail(r)}
        emptyTitle="Foydalanuvchilar yo'q"
      />

      <UserDialog open={formOpen} onClose={() => setFormOpen(false)} user={editing} />
      {detail && (
        <UserDetailDialog
          user={detail}
          open={!!detail}
          onClose={() => setDetail(null)}
          onEdit={(u) => { setDetail(null); setEditing(u); setFormOpen(true); }}
        />
      )}
      <ConfirmDialog
        open={!!deleting}
        onClose={() => setDeleting(null)}
        onConfirm={() => del.mutate(deleting.id, { onSuccess: () => { toast.success("O'chirildi"); setDeleting(null); }, onError: (e) => toast.error(apiError(e)) })}
        loading={del.isPending}
        message={`"${deleting?.fullName}" ni o'chirmoqchimisiz?`}
      />
    </div>
  );
}

function UserDialog({ open, onClose, user }) {
  const isEdit = !!user;
  const { data: positions } = useReference('position');
  const save = useSaveUser();
  const { register, control, handleSubmit, reset, formState: { errors } } = useForm();

  useEffect(() => {
    if (!open) return;
    reset(
      user
        ? { fullName: user.fullName, role: user.role, positionId: user.positionId || '', fixedSalary: fromTiyin(user.fixedSalary), card: user.card || '', status: user.status, password: '' }
        : { fullName: '', role: 'employee', positionId: '', fixedSalary: '', card: '', status: 'active', password: '' },
    );
  }, [open, user, reset]);

  const onSubmit = (v) => {
    const payload = {
      fullName: v.fullName,
      role: v.role,
      positionId: v.positionId ? Number(v.positionId) : undefined,
      fixedSalary: toTiyin(v.fixedSalary || 0),
      card: v.card || undefined,
      ...(isEdit ? { status: v.status } : {}),
      ...(v.password ? { password: v.password } : {}),
    };
    save.mutate(
      { id: user?.id, ...payload },
      { onSuccess: () => { toast.success(isEdit ? 'Yangilandi' : "Qo'shildi"); onClose(); }, onError: (e) => toast.error(apiError(e)) },
    );
  };

  return (
    <Dialog
      open={open}
      onClose={onClose}
      title={isEdit ? 'Xodimni tahrirlash' : 'Yangi xodim'}
      footer={<><Button variant="outline" onClick={onClose}>Bekor</Button><Button onClick={handleSubmit(onSubmit)} loading={save.isPending}>Saqlash</Button></>}
    >
      <form onSubmit={handleSubmit(onSubmit)} className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <FormField label="Ism Familiya (login)" required className="sm:col-span-2" error={errors.fullName && 'Kiriting'}>
          <Input {...register('fullName', { required: true })} error={errors.fullName} />
        </FormField>
        <FormField label="Rol">
          <Select {...register('role')}>
            {Object.entries(ROLE_LABELS).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
          </Select>
        </FormField>
        <FormField label="Lavozim">
          <Select {...register('positionId')}>
            <option value="">— Tanlang —</option>
            {(positions || []).map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}
          </Select>
        </FormField>
        <FormField label="Fiks oylik (so'm)">
          <Controller
            name="fixedSalary"
            control={control}
            render={({ field }) => <MoneyInput value={field.value} onChange={field.onChange} placeholder="0" />}
          />
        </FormField>
        <FormField label="Karta raqami">
          <Input placeholder="8600 0000 0000 0000" {...register('card')} />
        </FormField>
        {isEdit && (
          <FormField label="Status">
            <Select {...register('status')}>
              <option value="active">Faol</option>
              <option value="inactive">Nofaol</option>
            </Select>
          </FormField>
        )}
        <FormField label={isEdit ? "Yangi parol (ixtiyoriy)" : 'Parol'} required={!isEdit} className={isEdit ? '' : 'sm:col-span-2'} error={!isEdit && errors.password && 'Kiriting'}>
          <PasswordInput placeholder="••••••••" {...register('password', { required: !isEdit })} error={errors.password} />
        </FormField>
      </form>
    </Dialog>
  );
}

function UserDetailDialog({ user, open, onClose, onEdit }) {
  return (
    <Dialog
      open={open}
      onClose={onClose}
      title="Xodim ma'lumotlari"
      size="md"
      footer={<><Button variant="outline" onClick={onClose}>Yopish</Button><Button onClick={() => onEdit(user)}><Pencil className="h-4 w-4" /> Tahrirlash</Button></>}
    >
      <div className="mb-5 flex items-center gap-4">
        <Avatar name={user.fullName} src={user.avatar} size="lg" />
        <div>
          <p className="text-lg font-semibold text-text-strong">{user.fullName}</p>
          <div className="mt-1 flex items-center gap-2">
            <Badge tone="info">{ROLE_LABELS[user.role]}</Badge>
            <Badge tone={user.status === 'active' ? 'success' : 'muted'}>{user.status === 'active' ? 'Faol' : 'Nofaol'}</Badge>
          </div>
        </div>
      </div>

      <div className="space-y-1">
        <DetailRow icon={Briefcase} label="Lavozim" value={user.position?.name} />
        <DetailRow icon={Banknote} label="Fiks oylik" value={formatMoney(user.fixedSalary)} />
        <DetailRow icon={Wallet} label="Balans" value={formatMoney(user.balance)} />
        <DetailRow icon={CreditCard} label="Karta raqami" value={user.card} mono />
        <DetailRow icon={ShieldCheck} label="Rol" value={ROLE_LABELS[user.role]} />
        <DetailRow icon={Calendar} label="Qo'shilgan sana" value={formatDate(user.createdAt)} />
      </div>
    </Dialog>
  );
}

function DetailRow({ icon: Icon, label, value, mono }) {
  return (
    <div className="flex items-center gap-3 rounded-lg px-1 py-2.5">
      <Icon className="h-4 w-4 shrink-0 text-icon-soft" />
      <span className="w-32 shrink-0 text-sm text-text-soft">{label}</span>
      <span className={`text-sm text-text-strong ${mono ? 'font-mono' : ''}`}>{value || '—'}</span>
    </div>
  );
}
