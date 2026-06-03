import { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Trash2, RefreshCw, FileText, ExternalLink } from 'lucide-react';
import { toast } from 'sonner';
import { PageHeader } from '@/components/shared/PageHeader';
import { PageLoader } from '@/components/shared/PageLoader';
import { Button } from '@/components/ui/Button';
import { Input, Select } from '@/components/ui/Input';
import { MoneyInput } from '@/components/ui/MoneyInput';
import { FormField } from '@/components/ui/FormField';
import { ConfirmDialog } from '@/components/shared/ConfirmDialog';
import { ROLE_LABELS } from '@/lib/constants';
import { toTiyin, fromTiyin } from '@/lib/utils/format';
import { apiError } from '@/lib/api/axios';
import { useReference } from '@/features/settings/settingsApi';
import { useUser, useSaveUser, useDeleteUser } from '@/features/users/usersApi';
import { CardInput, RegionDistrict, FileUpload, AvatarUpload, moneyUZS, fileUrl, formatCard } from '@/features/users/userFields';

export function UserDetailPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { data: user, isLoading, refetch, isFetching } = useUser(id);
  const { data: positions } = useReference('position');
  const save = useSaveUser();
  const del = useDeleteUser();
  const [f, setF] = useState(null);
  const [deleting, setDeleting] = useState(false);
  const set = (k, v) => setF((s) => ({ ...s, [k]: v }));

  useEffect(() => {
    if (!user) return;
    setF({
      fullName: user.fullName || '', password: '',
      role: user.role || 'employee', positionId: user.positionId || '',
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
    save.mutate(
      {
        id: Number(id),
        fullName: f.fullName.trim(),
        role: f.role,
        positionId: f.positionId ? Number(f.positionId) : undefined,
        fixedSalary: toTiyin(f.fixedSalary || 0),
        phone: f.phone, phone2: f.phone2, card: f.card, card2: f.card2,
        region: f.region, district: f.district,
        passportSeries: f.passportSeries, passportNumber: f.passportNumber,
        passportImage: f.passportImage, avatar: f.avatar, link1: f.link1, link2: f.link2,
        ...(f.password ? { password: f.password } : {}),
      },
      { onSuccess: () => toast.success('Saqlandi'), onError: (e) => toast.error(apiError(e)) },
    );
  };

  const onDelete = () =>
    del.mutate(Number(id), {
      onSuccess: () => { toast.success("O'chirildi"); navigate('/users'); },
      onError: (e) => toast.error(apiError(e)),
    });

  return (
    <div className="pb-24">
      <PageHeader
        title="Foydalanuvchining ma'lumotlari"
        actions={<Button variant="outline" className="border-error-strong text-error-strong hover:bg-error-soft" onClick={() => setDeleting(true)}><Trash2 className="h-4 w-4" /> O'chirish</Button>}
      />

      {/* Identity */}
      <div className="mb-6 flex items-center justify-between">
        <div className="flex items-center gap-4">
          <AvatarUpload value={f.avatar} onChange={(v) => set('avatar', v)} size="h-24 w-24" />
          <h2 className="text-2xl font-bold text-text-strong">{f.fullName || user.fullName}</h2>
        </div>
        <button onClick={() => refetch()} title="Yangilash" className="rounded-md p-2 text-icon-sub hover:bg-bg-1-alt">
          <RefreshCw className={`h-5 w-5 ${isFetching ? 'animate-spin' : ''}`} />
        </button>
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
        <FormField label="Ism Sharifi (login)">
          <Input value={f.fullName} onChange={(e) => set('fullName', e.target.value)} />
        </FormField>
        <FormField label="Parol (yangi, ixtiyoriy)">
          <Input placeholder="O'zgartirish uchun kiriting" value={f.password} onChange={(e) => set('password', e.target.value)} />
        </FormField>
        <FormField label="Oylik maosh (UZS)">
          <MoneyInput value={f.fixedSalary} onChange={(v) => set('fixedSalary', v)} />
        </FormField>

        <FormField label="Telefon raqami">
          <Input placeholder="+998" value={f.phone} onChange={(e) => set('phone', e.target.value)} />
        </FormField>
        <FormField label="Qo'shimcha raqam">
          <Input value={f.phone2} onChange={(e) => set('phone2', e.target.value)} />
        </FormField>
        <FormField label="Balans (UZS)">
          <Input value={moneyUZS(user.balance)} disabled className="text-right" />
        </FormField>

        <FormField label="Karta raqami">
          <CardInput value={f.card} onChange={(v) => set('card', v)} />
        </FormField>
        <FormField label="Ikkinchi karta">
          <CardInput value={f.card2} onChange={(v) => set('card2', v)} />
        </FormField>
        <div className="hidden lg:block" />

        <RegionDistrict region={f.region} district={f.district} onRegion={(v) => set('region', v)} onDistrict={(v) => set('district', v)} />
        <div className="hidden lg:block" />

        <FormField label="Passport ma'lumotlari" className="sm:col-span-1">
          <div className="flex gap-2">
            <Input className="w-20 uppercase" maxLength={2} placeholder="AA" value={f.passportSeries} onChange={(e) => set('passportSeries', e.target.value.toUpperCase())} />
            <Input className="flex-1" placeholder="Raqami" value={f.passportNumber} onChange={(e) => set('passportNumber', e.target.value)} />
          </div>
        </FormField>
        <FormField label="Passport rasmi" className="sm:col-span-2">
          {f.passportImage ? (
            <div className="flex items-center gap-2">
              <a href={fileUrl(f.passportImage)} target="_blank" rel="noreferrer" className="flex h-10 flex-1 items-center gap-2 rounded-md border border-stroke-strong px-3 text-sm text-text-strong hover:bg-bg-1-alt">
                <FileText className="h-4 w-4 text-icon-accent" /> Faylni ochish <ExternalLink className="ml-auto h-3.5 w-3.5 text-icon-soft" />
              </a>
              <Button variant="outline" onClick={() => set('passportImage', '')}>O'chirish</Button>
            </div>
          ) : (
            <FileUpload value={f.passportImage} onChange={(v) => set('passportImage', v)} accept="image/*,application/pdf" />
          )}
        </FormField>

      </div>

      <div className="mt-4 grid grid-cols-1 gap-4 lg:grid-cols-2">
        <FormField label="1.Havola">
          <Input placeholder="Github havola" value={f.link1} onChange={(e) => set('link1', e.target.value)} />
        </FormField>
        <FormField label={<span className="inline-flex items-center gap-2"><span className="h-2.5 w-2.5 rounded-full bg-[#22C55E]" /> Lavozimi</span>}>
          <Select value={f.positionId} onChange={(e) => set('positionId', e.target.value)}>
            <option value="">Tanlang</option>
            {(positions || []).map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}
          </Select>
        </FormField>
        <FormField label="2.Havola">
          <Input placeholder="Github havola" value={f.link2} onChange={(e) => set('link2', e.target.value)} />
        </FormField>
        <FormField label={<span className="inline-flex items-center gap-2"><span className="h-2.5 w-2.5 rounded-full bg-error-strong" /> Roli</span>}>
          <Select value={f.role} onChange={(e) => set('role', e.target.value)}>
            {Object.entries(ROLE_LABELS).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
          </Select>
        </FormField>
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
