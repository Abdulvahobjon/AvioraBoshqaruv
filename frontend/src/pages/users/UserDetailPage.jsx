import { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Trash2, RefreshCw } from 'lucide-react';
import { toast } from 'sonner';
import { PageHeader } from '@/components/shared/PageHeader';
import { PageLoader } from '@/components/shared/PageLoader';
import { Button } from '@/components/ui/Button';
import { cn } from '@/lib/utils/cn';
import { Input, Select } from '@/components/ui/Input';
import { PhoneInput } from '@/components/ui/PhoneInput';
import { MoneyInput } from '@/components/ui/MoneyInput';
import { FormField } from '@/components/ui/FormField';
import { ConfirmDialog } from '@/components/shared/ConfirmDialog';
import { ROLE_LABELS } from '@/lib/constants';
import { toTiyin, fromTiyin } from '@/lib/utils/format';
import { apiError } from '@/lib/api/axios';
import { useAuthStore } from '@/store/authStore';
import { useReference } from '@/features/settings/settingsApi';
import { useUser, useSaveUser, useDeleteUser } from '@/features/users/usersApi';
import { CardInput, RegionDistrict, FileUpload, AvatarUpload, RolesField, moneyUZS, formatCard } from '@/features/users/userFields';

export function UserDetailPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { data: user, isLoading, refetch, isFetching } = useUser(id);
  const { data: positions } = useReference('position');
  const save = useSaveUser();
  const del = useDeleteUser();
  const userRole = useAuthStore((s) => s.user?.role);
  const canAssignRoles = ['superadmin', 'admin'].includes(userRole);
  // superadmin yangidan berilmaydi (yagona); faqat allaqachon superadmin bo'lgan xodim tahrirlansagina chip ko'rinadi.
  const roleKeys = Object.keys(ROLE_LABELS).filter((k) => k !== 'superadmin' || user?.role === 'superadmin');
  const [f, setF] = useState(null);
  const [deleting, setDeleting] = useState(false);
  const set = (k, v) => setF((s) => ({ ...s, [k]: v }));

  useEffect(() => {
    if (!user) return;
    setF({
      fullName: user.fullName || '',
      role: user.role || 'employee', roles: user.roles || [], positionId: user.positionId || '',
      fixedSalary: fromTiyin(user.fixedSalary),
      phone: user.phone || '', phone2: user.phone2 || '',
      card: formatCard(user.card), card2: formatCard(user.card2),
      region: user.region || '', district: user.district || '',
      passportSeries: user.passportSeries || '', passportNumber: user.passportNumber || '',
      passportImage: user.passportImage || '', avatar: user.avatar || '',
      link1: user.link1 || '', link2: user.link2 || '',
    });
  }, [user]);

  if (isLoading || !f) return <PageLoader />;

  const onSave = () => {
    if (!f.fullName.trim()) { toast.error('Ism Sharifini kiriting'); return; }
    if (!f.role) { toast.error('Kamida bitta rol tanlang'); return; }
    save.mutate(
      {
        id: Number(id),
        fullName: f.fullName.trim(),
        role: f.role,
        roles: canAssignRoles ? f.roles : undefined,
        positionId: f.positionId ? Number(f.positionId) : undefined,
        fixedSalary: toTiyin(f.fixedSalary || 0),
        phone: f.phone, card: f.card,
        region: f.region, district: f.district,
        passportSeries: f.passportSeries, passportNumber: f.passportNumber,
        passportImage: f.passportImage, avatar: f.avatar, link1: f.link1, link2: f.link2,
      },
      { onSuccess: () => toast.success('Saqlandi'), onError: (e) => toast.error(apiError(e)) },
    );
  };

  const onDelete = () =>
    del.mutate(Number(id), {
      onSuccess: () => { toast.success("O'chirildi"); navigate('/users'); },
      onError: (e) => toast.error(apiError(e)),
    });

  const allRoles = [...new Set([f.role, ...(f.roles || [])].filter(Boolean))];

  return (
    <div className="pb-24">
      <PageHeader
        title="Foydalanuvchining ma'lumotlari"
        actions={<Button variant="outline" className="border-error-strong text-error-strong hover:bg-error-soft" onClick={() => setDeleting(true)}><Trash2 className="h-4 w-4" /> O'chirish</Button>}
      />

      {/* Identity */}
      <div className="mb-6 flex items-center justify-between">
        <div className="flex items-center gap-4">
          <AvatarUpload value={f.avatar} onChange={(v) => set('avatar', v)} size="h-20 w-20" />
          <h2 className="text-2xl font-bold text-text-strong">{f.fullName || user.fullName}</h2>
        </div>
        <button onClick={() => refetch()} title="Yangilash" className="rounded-md p-2 text-icon-sub hover:bg-bg-1-alt">
          <RefreshCw className={cn('h-5 w-5', isFetching && 'animate-spin')} />
        </button>
      </div>

      <div className="grid grid-cols-1 gap-x-6 gap-y-5 sm:grid-cols-2">
        <FormField label="Oylik maosh (UZS)">
          <MoneyInput value={f.fixedSalary} onChange={(v) => set('fixedSalary', v)} />
        </FormField>
        <FormField label="Balansi (UZS)">
          <Input value={moneyUZS(user.balance)} disabled className="text-right" />
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
          <FileUpload value={f.passportImage} onChange={(v) => set('passportImage', v)} accept="image/*,application/pdf" />
        </FormField>

        <FormField label="1.Havola">
          <Input placeholder="Github havola" value={f.link1} onChange={(e) => set('link1', e.target.value)} />
        </FormField>
        <div className="flex items-center gap-3 self-end">
          <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-bg-1-alt">
            <span className={cn('h-2.5 w-2.5 rounded-full', f.positionId ? 'bg-success-strong' : 'bg-error-strong')} />
          </span>
          <span className="text-sm font-semibold text-text-strong">Lavozimi</span>
          <Select className="ml-auto w-1/2" value={f.positionId} onChange={(e) => set('positionId', e.target.value)} placeholder="Tanlash">
            <option value="">Tanlash</option>
            {(positions || []).map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}
          </Select>
        </div>

        <FormField label="2.Havola">
          <Input placeholder="Github havola" value={f.link2} onChange={(e) => set('link2', e.target.value)} />
        </FormField>
        <div className="flex items-center gap-3 self-end">
          <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-bg-1-alt">
            <span className={cn('h-2.5 w-2.5 rounded-full', allRoles.length ? 'bg-success-strong' : 'bg-error-strong')} />
          </span>
          <span className="text-sm font-semibold text-text-strong">Roli</span>
          <div className="ml-auto w-1/2">
            <RolesField
              roleKeys={roleKeys}
              value={allRoles}
              onChange={(arr) => setF((s) => ({ ...s, role: arr[0] || '', roles: arr.slice(1) }))}
            />
          </div>
        </div>
      </div>

      {/* Sticky save bar */}
      <div className="fixed bottom-0 left-0 right-0 z-10 border-t border-stroke-sub bg-bg-base/90 px-6 py-3 backdrop-blur lg:left-64">
        <div className="flex justify-end">
          <Button onClick={onSave} loading={save.isPending}>Saqlash</Button>
        </div>
      </div>

      <ConfirmDialog
        open={deleting}
        onClose={() => setDeleting(false)}
        onConfirm={onDelete}
        loading={del.isPending}
        title="Foydalanuvchini o'chirmoqchimisiz?"
        message="Bu foydalanuvchi tizimdan o'chiriladi va unga tegishli ma'lumotlar o'chishi mumkin."
        confirmText="O'chirish"
      />
    </div>
  );
}
