import { useMemo, useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { useNavigate } from 'react-router-dom';
import { Plus, Trash2, Check, Minus, CheckSquare, Square, X } from 'lucide-react';
import { toast } from 'sonner';
import { PageHeader } from '@/components/shared/PageHeader';
import { Dialog } from '@/components/ui/Dialog';
import { Button } from '@/components/ui/Button';
import { Input, Select } from '@/components/ui/Input';
import { AntDate } from '@/components/ui/AntDate';
import { PhoneInput } from '@/components/ui/PhoneInput';
import { MoneyInput } from '@/components/ui/MoneyInput';
import { PasswordInput } from '@/components/ui/PasswordInput';
import { FormField } from '@/components/ui/FormField';
import { Avatar } from '@/components/ui/Avatar';
import { DataTable } from '@/components/shared/DataTable';
import { ConfirmDialog } from '@/components/shared/ConfirmDialog';
import { cn } from '@/lib/utils/cn';
import { ROLE_LABELS } from '@/lib/constants';
import { toTiyin } from '@/lib/utils/format';
import { apiError } from '@/lib/api/axios';
import { useAuthStore } from '@/store/authStore';
import { useDebounce } from '@/hooks/useDebounce';
import { useReference } from '@/features/settings/settingsApi';
import { useUsersList, useSaveUser, useDeleteUser } from '@/features/users/usersApi';
import { CardInput, RegionDistrict, FileUpload, AvatarUpload, RolesField, moneyUZS, fileUrl } from '@/features/users/userFields';

const SORTS = [
  { value: 'az', label: 'A dan Z gacha' },
  { value: 'za', label: 'Z dan A gacha' },
  { value: 'new', label: 'Yangi → Eski' },
  { value: 'old', label: 'Eski → Yangi' },
];

export function UsersPage() {
  const navigate = useNavigate();
  const [search, setSearch] = useState('');
  const debounced = useDebounce(search);
  const { data, isLoading } = useUsersList({ search: debounced });
  const { data: positions } = useReference('position');
  const save = useSaveUser();
  const del = useDeleteUser();

  const [fPos, setFPos] = useState('');
  const [fRole, setFRole] = useState('');
  const [sort, setSort] = useState('az');
  const [formOpen, setFormOpen] = useState(false);
  const [selectMode, setSelectMode] = useState(false);
  const [selected, setSelected] = useState([]);
  const [deleting, setDeleting] = useState(null); // user | 'bulk'

  const rows = useMemo(() => {
    let arr = [...(data?.items || [])];
    if (fPos) arr = arr.filter((u) => String(u.positionId) === fPos);
    if (fRole) arr = arr.filter((u) => u.role === fRole);
    arr.sort((a, b) => {
      if (sort === 'az') return a.fullName.localeCompare(b.fullName);
      if (sort === 'za') return b.fullName.localeCompare(a.fullName);
      if (sort === 'new') return new Date(b.createdAt) - new Date(a.createdAt);
      if (sort === 'old') return new Date(a.createdAt) - new Date(b.createdAt);
      return 0;
    });
    return arr;
  }, [data, fPos, fRole, sort]);

  const toggleActive = (u) =>
    save.mutate({ id: u.id, status: u.status === 'active' ? 'inactive' : 'active' }, { onError: (e) => toast.error(apiError(e)) });

  const toggleSelect = (id) => setSelected((s) => (s.includes(id) ? s.filter((x) => x !== id) : [...s, id]));
  const allSelected = rows.length > 0 && selected.length === rows.length;
  const toggleAll = () => setSelected(allSelected ? [] : rows.map((u) => u.id));

  const confirmDelete = async () => {
    const ids = deleting === 'bulk' ? selected : [deleting.id];
    try {
      for (const id of ids) await del.mutateAsync(id);
      toast.success("O'chirildi");
      setSelected([]);
      setDeleting(null);
    } catch (e) {
      toast.error(apiError(e));
    }
  };

  const pill = 'h-10 rounded-full px-4';

  const columns = [
    ...(selectMode ? [{
      key: 'select', className: 'w-10',
      header: (
        <button onClick={toggleAll} aria-label="Barchasini tanlash" className="text-icon-sub">
          {allSelected ? <CheckSquare className="h-4 w-4 text-icon-accent" /> : <Square className="h-4 w-4" />}
        </button>
      ),
      render: (u) => (
        <button onClick={(e) => { e.stopPropagation(); toggleSelect(u.id); }} aria-label="Tanlash">
          {selected.includes(u.id) ? <CheckSquare className="h-4 w-4 text-icon-accent" /> : <Square className="h-4 w-4 text-icon-sub" />}
        </button>
      ),
    }] : []),
    { key: 'idx', header: '№', className: 'w-12', render: (_u, i) => <span className="text-text-soft">{i + 1}</span> },
    {
      key: 'name', header: 'Ism Sharifi',
      render: (u) => (
        <div className="flex items-center gap-2.5">
          <Avatar name={u.fullName} src={fileUrl(u.avatar)} size="sm" />
          <span className="font-medium text-text-strong">{u.fullName}</span>
        </div>
      ),
    },
    { key: 'position', header: 'Lavozim', render: (u) => <span className="text-text-sub">{u.position?.name || '—'}</span> },
    { key: 'role', header: 'Rol', render: (u) => <span className="text-text-sub">{ROLE_LABELS[u.role]}</span> },
    { key: 'salary', header: 'Oylik maosh (UZS)', className: 'text-right', cellClassName: 'text-right', render: (u) => <span className="font-semibold text-text-strong">{moneyUZS(u.fixedSalary)}</span> },
    { key: 'balance', header: 'Balans (UZS)', className: 'text-right', cellClassName: 'text-right', render: (u) => <span className="text-text-sub">{moneyUZS(u.balance)}</span> },
    {
      key: 'status', header: 'Active', className: 'w-20 text-center', cellClassName: 'text-center',
      render: (u) => (
        <button
          onClick={(e) => { e.stopPropagation(); toggleActive(u); }}
          aria-label={u.status === 'active' ? 'Faolsizlantirish' : 'Faollashtirish'}
          className={cn(
            'inline-flex h-7 w-7 items-center justify-center rounded-md text-text-white transition-colors',
            u.status === 'active' ? 'bg-success-strong' : 'bg-error-strong',
          )}
        >
          {u.status === 'active' ? <Check className="h-4 w-4" /> : <Minus className="h-4 w-4" />}
        </button>
      ),
    },
  ];

  return (
    <div className="flex h-[calc(100vh-6rem)] flex-col sm:h-[calc(100vh-7rem)]">
      {/* "Yangi xodim" lives in the top navbar; "Tanlash" stays here. */}
      <TopbarActions>
        <Button size="sm" onClick={() => setFormOpen(true)}><Plus className="h-4 w-4" /> Yangi xodim</Button>
      </TopbarActions>

      <PageHeader
        title="Foydalanuvchilar"
        subtitle="Xodimlar va rollar boshqaruvi"
        actions={
          <Button variant={selectMode ? 'secondary' : 'outline'} onClick={() => { setSelectMode((v) => !v); setSelected([]); }}>
            <Check className="h-4 w-4" /> Tanlash
          </Button>
        }
      />

      {/* Filters */}
      <div className="mb-4 flex flex-wrap items-center gap-2">
        <div className="relative w-full sm:w-72">
          <Input placeholder="Ism Sharifi bo'yicha izlash..." className="rounded-full" value={search} onChange={(e) => setSearch(e.target.value)} />
        </div>
        <Select value={fPos} onChange={(e) => setFPos(e.target.value)} className={cn(pill, 'w-auto min-w-[180px]')}>
          <option value="">Barcha lavozimlar</option>
          {(positions || []).map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}
        </Select>
        <Select value={fRole} onChange={(e) => setFRole(e.target.value)} className={cn(pill, 'w-auto min-w-[160px]')}>
          <option value="">Barcha rollar</option>
          {Object.entries(ROLE_LABELS).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
        </Select>
        <Select value={sort} onChange={(e) => setSort(e.target.value)} className={cn(pill, 'w-auto min-w-[160px]')}>
          {SORTS.map((s) => <option key={s.value} value={s.value}>{s.label}</option>)}
        </Select>
      </div>

      {/* Bulk action bar */}
      {selectMode && selected.length > 0 && (
        <div className="mb-3 flex items-center justify-between rounded-lg border border-stroke-sub bg-bg-1 px-4 py-2.5">
          <span className="text-sm text-text-sub">{selected.length} ta tanlandi</span>
          <Button variant="danger" size="sm" onClick={() => setDeleting('bulk')}><Trash2 className="h-4 w-4" /> O'chirish</Button>
        </div>
      )}

      <div className="min-h-0 flex-1">
        <DataTable
          columns={columns}
          data={rows}
          loading={isLoading}
          onRowClick={(u) => navigate(`/users/${u.id}`)}
          emptyTitle="Foydalanuvchilar yo'q"
          emptyDescription="Yangi xodim qo'shing yoki filtrlarni o'zgartiring."
          transparent
          fill
        />
      </div>

      <UserDialog open={formOpen} onClose={() => setFormOpen(false)} />
      <ConfirmDialog
        open={!!deleting}
        onClose={() => setDeleting(null)}
        onConfirm={confirmDelete}
        loading={del.isPending}
        title="Foydalanuvchini o'chirmoqchimisiz?"
        message={deleting === 'bulk' ? `${selected.length} ta foydalanuvchi o'chiriladi.` : 'Bu foydalanuvchi tizimdan o\'chiriladi va unga tegishli ma\'lumotlar o\'chishi mumkin.'}
        confirmText="O'chirish"
      />
    </div>
  );
}

/** Portals its children into the Topbar's #page-actions slot (navbar). */
function TopbarActions({ children }) {
  const [el, setEl] = useState(null);
  useEffect(() => { setEl(document.getElementById('page-actions')); }, []);
  return el ? createPortal(children, el) : null;
}

const EMPTY = {
  fullName: '', password: '', role: 'employee', roles: [], positionId: '', fixedSalary: '',
  phone: '', card: '', region: '', district: '',
  passportSeries: '', passportNumber: '', passportImage: '', avatar: '', link1: '', link2: '',
  hireDate: '',
};

function UserDialog({ open, onClose }) {
  const { data: positions } = useReference('position');
  const save = useSaveUser();
  const userRole = useAuthStore((s) => s.user?.role);
  const canAssignRoles = ['superadmin', 'admin'].includes(userRole);
  // superadmin yagona (seed'dan) — yangi xodimga hech qachon berilmaydi, tanlovda ko'rsatilmaydi.
  const roleKeys = Object.keys(ROLE_LABELS).filter((k) => k !== 'superadmin');
  const [f, setF] = useState(EMPTY);
  const set = (k, v) => setF((s) => ({ ...s, [k]: v }));

  // Reset when opened
  const [wasOpen, setWasOpen] = useState(false);
  if (open && !wasOpen) { setF(EMPTY); setWasOpen(true); }
  if (!open && wasOpen) setWasOpen(false);

  const submit = () => {
    if (!f.fullName.trim()) { toast.error('Ism Sharifini kiriting'); return; }
    if (!f.password.trim() || f.password.length < 6) { toast.error('Parol kamida 6 ta belgi'); return; }
    if (!f.role) { toast.error('Kamida bitta rol tanlang'); return; }
    save.mutate(
      {
        fullName: f.fullName.trim(),
        password: f.password,
        role: f.role,
        roles: canAssignRoles ? f.roles : undefined,
        positionId: f.positionId ? Number(f.positionId) : undefined,
        fixedSalary: toTiyin(f.fixedSalary || 0),
        phone: f.phone || undefined,
        card: f.card || undefined,
        region: f.region || undefined, district: f.district || undefined,
        passportSeries: f.passportSeries || undefined, passportNumber: f.passportNumber || undefined,
        passportImage: f.passportImage || undefined, avatar: f.avatar || undefined,
        link1: f.link1 || undefined, link2: f.link2 || undefined,
        hireDate: f.hireDate || undefined,
      },
      { onSuccess: () => { toast.success("Qo'shildi"); onClose(); }, onError: (e) => toast.error(apiError(e)) },
    );
  };

  return (
    <Dialog
      open={open}
      onClose={onClose}
      onBack={onClose}
      title="Yangi xodim qo'shish"
      subtitle="Yangi xodimni tizimga qo'shing va unga tegishli rol hamda maoshni belgilang"
      size="lg"
      footer={<><Button variant="ghost" onClick={onClose}><X className="h-4 w-4" /> Yopish</Button><Button onClick={submit} loading={save.isPending}><Check className="h-4 w-4" /> Qo'shish</Button></>}
    >
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <FormField label="Ism Sharifi (login)" required>
          <Input placeholder="Ism Familiya" value={f.fullName} onChange={(e) => set('fullName', e.target.value)} />
        </FormField>
        <FormField label="Parol" required>
          <PasswordInput placeholder="••••••••" value={f.password} onChange={(e) => set('password', e.target.value)} />
        </FormField>

        <FormField label="Telefon raqami">
          <PhoneInput value={f.phone} onChange={(v) => set('phone', v)} />
        </FormField>
        <FormField label="Karta raqami">
          <CardInput value={f.card} onChange={(v) => set('card', v)} />
        </FormField>

        <RegionDistrict region={f.region} district={f.district} onRegion={(v) => set('region', v)} onDistrict={(v) => set('district', v)} />

        <FormField label="Passport ma'lumotlari">
          <div className="flex gap-2">
            <Input className="w-20 uppercase" maxLength={2} placeholder="AA" value={f.passportSeries} onChange={(e) => set('passportSeries', e.target.value.replace(/[^a-zA-Z]/g, '').toUpperCase())} />
            <Input className="flex-1" inputMode="numeric" maxLength={7} placeholder="Raqami" value={f.passportNumber} onChange={(e) => set('passportNumber', e.target.value.replace(/\D/g, ''))} />
          </div>
        </FormField>
        <FormField label="Passport rasmi">
          <FileUpload value={f.passportImage} onChange={(v) => set('passportImage', v)} accept="image/*,application/pdf" label="Rasm yuklash" />
        </FormField>

        <div className="grid grid-cols-1 gap-4 sm:col-span-2 sm:grid-cols-[auto_1fr_1fr] sm:items-start">
          <div>
            <p className="mb-1.5 text-sm font-medium text-text-sub">Avatar</p>
            <AvatarUpload value={f.avatar} onChange={(v) => set('avatar', v)} />
          </div>

          <FormField label="Lavozimi">
            <Select value={f.positionId} onChange={(e) => set('positionId', e.target.value)}>
              <option value="">Tanlang</option>
              {(positions || []).map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}
            </Select>
          </FormField>
          <FormField label="Rollar">
            <RolesField
              roleKeys={roleKeys}
              value={[...new Set([f.role, ...(f.roles || [])].filter(Boolean))]}
              onChange={(arr) => setF((s) => ({ ...s, role: arr[0] || '', roles: arr.slice(1) }))}
            />
          </FormField>
        </div>

        <FormField label="Oylik maosh (UZS)">
          <MoneyInput value={f.fixedSalary} onChange={(v) => set('fixedSalary', v)} placeholder="0" />
        </FormField>
        <FormField label="Ishga kirgan sana">
          <AntDate value={f.hireDate} onChange={(v) => set('hireDate', v)} placeholder="Sanani tanlang" />
        </FormField>

        <FormField label="1.Havola">
          <Input placeholder="Havola yuklang" value={f.link1} onChange={(e) => set('link1', e.target.value)} />
        </FormField>
        <FormField label="2.Havola">
          <Input placeholder="Havola yuklang" value={f.link2} onChange={(e) => set('link2', e.target.value)} />
        </FormField>
      </div>
    </Dialog>
  );
}

