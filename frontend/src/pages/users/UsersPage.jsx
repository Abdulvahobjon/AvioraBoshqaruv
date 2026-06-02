import { useMemo, useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { useNavigate } from 'react-router-dom';
import { Plus, Trash2, Check, Minus, CheckSquare, Square, X } from 'lucide-react';
import { toast } from 'sonner';
import { PageHeader } from '@/components/shared/PageHeader';
import { Dialog } from '@/components/ui/Dialog';
import { Button } from '@/components/ui/Button';
import { Input, Select } from '@/components/ui/Input';
import { MoneyInput } from '@/components/ui/MoneyInput';
import { PasswordInput } from '@/components/ui/PasswordInput';
import { FormField } from '@/components/ui/FormField';
import { Avatar } from '@/components/ui/Avatar';
import { Skeleton } from '@/components/ui/Skeleton';
import { ConfirmDialog } from '@/components/shared/ConfirmDialog';
import { EmptyState } from '@/components/shared/EmptyState';
import { cn } from '@/lib/utils/cn';
import { ROLE_LABELS } from '@/lib/constants';
import { toTiyin } from '@/lib/utils/format';
import { apiError } from '@/lib/api/axios';
import { useDebounce } from '@/hooks/useDebounce';
import { useReference } from '@/features/settings/settingsApi';
import { useUsersList, useSaveUser, useDeleteUser } from '@/features/users/usersApi';
import { CardInput, RegionDistrict, FileUpload, AvatarUpload, moneyUZS, fileUrl } from '@/features/users/userFields';

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

  return (
    <div>
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
        <div className="mb-3 flex items-center justify-between rounded-lg border border-stroke-sub bg-bg-elevation-1 px-4 py-2.5">
          <span className="text-sm text-text-sub">{selected.length} ta tanlandi</span>
          <Button variant="danger" size="sm" onClick={() => setDeleting('bulk')}><Trash2 className="h-4 w-4" /> O'chirish</Button>
        </div>
      )}

      {isLoading ? (
        <UsersSkeleton />
      ) : rows.length === 0 ? (
        <EmptyState title="Foydalanuvchilar yo'q" description="Yangi xodim qo'shing yoki filtrlarni o'zgartiring." />
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full min-w-[820px] text-sm">
            <thead>
              <tr className="border-b border-stroke-sub text-left text-text-sub">
                {selectMode && (
                  <th className="w-10 py-3 pl-1">
                    <button onClick={toggleAll} className="text-icon-sub">{allSelected ? <CheckSquare className="h-4 w-4 text-icon-accent" /> : <Square className="h-4 w-4" />}</button>
                  </th>
                )}
                <th className="w-12 py-3 font-medium">№</th>
                <th className="py-3 font-medium">Ism Sharifi</th>
                <th className="py-3 font-medium"><span className="inline-flex items-center gap-1.5"><span className="h-2 w-2 rounded-full bg-[#22C55E]" /> Lavozim</span></th>
                <th className="py-3 font-medium">Rol</th>
                <th className="py-3 text-right font-medium">Oylik maosh (UZS)</th>
                <th className="py-3 text-right font-medium">Balans (UZS)</th>
                <th className="w-20 py-3 text-center font-medium">Active</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((u, i) => (
                <tr
                  key={u.id}
                  onClick={() => navigate(`/users/${u.id}`)}
                  className="cursor-pointer border-b border-stroke-soft transition-colors hover:bg-bg-elevation-1-alt"
                >
                  {selectMode && (
                    <td className="py-3 pl-1" onClick={(e) => { e.stopPropagation(); toggleSelect(u.id); }}>
                      {selected.includes(u.id) ? <CheckSquare className="h-4 w-4 text-icon-accent" /> : <Square className="h-4 w-4 text-icon-sub" />}
                    </td>
                  )}
                  <td className="py-3 text-text-soft">{i + 1}</td>
                  <td className="py-3">
                    <div className="flex items-center gap-2.5">
                      <Avatar name={u.fullName} src={fileUrl(u.avatar)} size="sm" />
                      <span className="font-medium text-text-strong">{u.fullName}</span>
                    </div>
                  </td>
                  <td className="py-3 text-text-sub">{u.position?.name || '—'}</td>
                  <td className="py-3 text-text-sub">{ROLE_LABELS[u.role]}</td>
                  <td className="py-3 text-right font-semibold text-text-strong">{moneyUZS(u.fixedSalary)}</td>
                  <td className="py-3 text-right text-text-sub">{moneyUZS(u.balance)}</td>
                  <td className="py-3 text-center" onClick={(e) => { e.stopPropagation(); toggleActive(u); }}>
                    <span className={cn(
                      'inline-flex h-7 w-7 items-center justify-center rounded-md text-text-white transition-colors',
                      u.status === 'active' ? 'bg-[#22C55E]' : 'bg-error-strong',
                    )}>
                      {u.status === 'active' ? <Check className="h-4 w-4" /> : <Minus className="h-4 w-4" />}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

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
  fullName: '', password: '', role: 'employee', positionId: '', fixedSalary: '',
  phone: '', phone2: '', card: '', card2: '', region: '', district: '',
  passportSeries: '', passportNumber: '', passportImage: '', avatar: '', link1: '', link2: '',
};

function UserDialog({ open, onClose }) {
  const { data: positions } = useReference('position');
  const save = useSaveUser();
  const [f, setF] = useState(EMPTY);
  const set = (k, v) => setF((s) => ({ ...s, [k]: v }));

  // Reset when opened
  const [wasOpen, setWasOpen] = useState(false);
  if (open && !wasOpen) { setF(EMPTY); setWasOpen(true); }
  if (!open && wasOpen) setWasOpen(false);

  const submit = () => {
    if (!f.fullName.trim()) { toast.error('Ism Sharifini kiriting'); return; }
    if (!f.password.trim() || f.password.length < 6) { toast.error('Parol kamida 6 ta belgi'); return; }
    save.mutate(
      {
        fullName: f.fullName.trim(),
        password: f.password,
        role: f.role,
        positionId: f.positionId ? Number(f.positionId) : undefined,
        fixedSalary: toTiyin(f.fixedSalary || 0),
        phone: f.phone || undefined, phone2: f.phone2 || undefined,
        card: f.card || undefined, card2: f.card2 || undefined,
        region: f.region || undefined, district: f.district || undefined,
        passportSeries: f.passportSeries || undefined, passportNumber: f.passportNumber || undefined,
        passportImage: f.passportImage || undefined, avatar: f.avatar || undefined,
        link1: f.link1 || undefined, link2: f.link2 || undefined,
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
      size="lg"
      footer={<><Button variant="ghost" onClick={onClose}><X className="h-4 w-4" /> Yopish</Button><Button onClick={submit} loading={save.isPending}><Check className="h-4 w-4" /> Qo'shish</Button></>}
    >
      <p className="-mt-2 mb-4 text-sm text-text-sub">Yangi xodimni tizimga qo'shing va unga tegishli rol hamda maoshni belgilang</p>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <FormField label="Ism Sharifi (login)" required>
          <Input placeholder="Ism Familiya" value={f.fullName} onChange={(e) => set('fullName', e.target.value)} />
        </FormField>
        <FormField label="Parol" required>
          <PasswordInput placeholder="••••••••" value={f.password} onChange={(e) => set('password', e.target.value)} />
        </FormField>

        <FormField label="Telefon raqami">
          <Input placeholder="+998" value={f.phone} onChange={(e) => set('phone', e.target.value)} />
        </FormField>
        <FormField label="Qo'shimcha raqam">
          <Input placeholder="Qoshimcha raqam" value={f.phone2} onChange={(e) => set('phone2', e.target.value)} />
        </FormField>

        <FormField label="Karta raqami">
          <CardInput value={f.card} onChange={(v) => set('card', v)} />
        </FormField>
        <FormField label="Ikkinchi karta">
          <CardInput value={f.card2} onChange={(v) => set('card2', v)} />
        </FormField>

        <RegionDistrict region={f.region} district={f.district} onRegion={(v) => set('region', v)} onDistrict={(v) => set('district', v)} />

        <FormField label="Passport ma'lumotlari">
          <div className="flex gap-2">
            <Input className="w-20 uppercase" maxLength={2} placeholder="AA" value={f.passportSeries} onChange={(e) => set('passportSeries', e.target.value.toUpperCase())} />
            <Input className="flex-1" placeholder="Raqami" value={f.passportNumber} onChange={(e) => set('passportNumber', e.target.value)} />
          </div>
        </FormField>
        <FormField label="Passport rasmi">
          <FileUpload value={f.passportImage} onChange={(v) => set('passportImage', v)} accept="image/*,application/pdf" label="Rasm yuklash" />
        </FormField>

        <div className="flex items-end gap-4 sm:col-span-2">
          <div>
            <p className="mb-1.5 text-sm font-medium text-text-sub">Avatar</p>
            <AvatarUpload value={f.avatar} onChange={(v) => set('avatar', v)} />
          </div>
          <FormField label="Lavozimi" className="flex-1">
            <Select value={f.positionId} onChange={(e) => set('positionId', e.target.value)}>
              <option value="">Tanlang</option>
              {(positions || []).map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}
            </Select>
          </FormField>
          <FormField label="Roli" className="flex-1">
            <Select value={f.role} onChange={(e) => set('role', e.target.value)}>
              {Object.entries(ROLE_LABELS).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
            </Select>
          </FormField>
        </div>

        <FormField label="Oylik maosh (UZS)" className="sm:col-span-2">
          <MoneyInput value={f.fixedSalary} onChange={(v) => set('fixedSalary', v)} placeholder="0" />
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

function UsersSkeleton() {
  return (
    <div className="space-y-1">
      <div className="flex items-center gap-4 border-b border-stroke-sub py-3">
        {['w-6', 'flex-1', 'w-24', 'w-20', 'w-28', 'w-28', 'w-12'].map((w, i) => <Skeleton key={i} className={cn('h-3.5', w)} />)}
      </div>
      {Array.from({ length: 8 }).map((_, r) => (
        <div key={r} className="flex items-center gap-4 border-b border-stroke-soft py-3.5">
          <Skeleton className="h-4 w-6 shrink-0" />
          <div className="flex flex-1 items-center gap-2.5"><Skeleton className="h-7 w-7 shrink-0 rounded-full" /><Skeleton className="h-3.5 w-40" /></div>
          <Skeleton className="h-3.5 w-24 shrink-0" />
          <Skeleton className="h-3.5 w-20 shrink-0" />
          <Skeleton className="h-3.5 w-28 shrink-0" />
          <Skeleton className="h-3.5 w-28 shrink-0" />
          <Skeleton className="h-7 w-7 shrink-0 rounded-md" />
        </div>
      ))}
    </div>
  );
}
