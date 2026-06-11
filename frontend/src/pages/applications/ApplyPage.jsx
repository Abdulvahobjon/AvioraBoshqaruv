import { useState, useMemo } from 'react';
import { useForm } from 'react-hook-form';
import { CheckCircle2, Upload, Loader2 } from 'lucide-react';
import { toast } from 'sonner';
import { Input, Select, Textarea } from '@/components/ui/Input';
import { FormField } from '@/components/ui/FormField';
import { Button } from '@/components/ui/Button';
import { Switch } from '@/components/ui/Switch';
import { apiError } from '@/lib/api/axios';
import { useApplicationMeta, useSubmitApplication } from '@/features/applications/applicationsApi';

export function ApplyPage() {
  const { data: meta, isLoading } = useApplicationMeta();
  const submit = useSubmitApplication();
  const { register, handleSubmit, watch, setValue, formState: { errors } } = useForm({
    defaultValues: { isStudent: false, regionId: '' },
  });
  const [resume, setResume] = useState(null);
  const [done, setDone] = useState(false);

  const isStudent = watch('isStudent');
  const regionId = watch('regionId');
  const districts = useMemo(
    () => (meta?.districts || []).filter((d) => !regionId || String(d.regionId) === String(regionId)),
    [meta, regionId],
  );

  const onFile = (e) => {
    const f = e.target.files?.[0];
    if (!f) return setResume(null);
    if (f.type !== 'application/pdf') { toast.error('Rezyume faqat PDF bo\'lishi kerak'); e.target.value = ''; return; }
    if (f.size > 10 * 1024 * 1024) { toast.error('Fayl hajmi 10MB dan oshmasin'); e.target.value = ''; return; }
    setResume(f);
  };

  const onSubmit = (v) => {
    const fd = new FormData();
    fd.append('fullName', v.fullName);
    if (v.birthDate) fd.append('birthDate', v.birthDate);
    fd.append('phone', v.phone);
    if (v.telegram) fd.append('telegram', v.telegram);
    fd.append('isStudent', v.isStudent ? 'true' : 'false');
    if (v.isStudent && v.university) fd.append('university', v.university);
    if (v.regionId) fd.append('regionId', v.regionId);
    if (v.districtId) fd.append('districtId', v.districtId);
    if (v.positionId) fd.append('positionId', v.positionId);
    if (v.portfolio) fd.append('portfolio', v.portfolio);
    if (v.extraInfo) fd.append('extraInfo', v.extraInfo);
    if (resume) fd.append('resume', resume);

    submit.mutate(fd, {
      onSuccess: () => setDone(true),
      onError: (e) => toast.error(apiError(e)),
    });
  };

  if (done) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-bg-0 p-4">
        <div className="w-full max-w-md rounded-2xl border border-stroke-sub bg-bg-1 p-8 text-center">
          <CheckCircle2 className="mx-auto mb-4 h-14 w-14 text-success-strong" />
          <h1 className="text-xl font-semibold text-text-strong">Arizangiz qabul qilindi!</h1>
          <p className="mt-2 text-sm text-text-sub">Rahmat. Tez orada siz bilan bog'lanamiz.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-bg-0 px-4 py-10">
      <div className="mx-auto w-full max-w-2xl">
        <div className="mb-6 text-center">
          <h1 className="text-2xl font-bold text-text-strong">Aviora — Nomzod anketasi</h1>
          <p className="mt-1 text-sm text-text-sub">Bo'sh ish o'rinlariga ariza topshirish</p>
        </div>

        {isLoading ? (
          <div className="flex justify-center py-20"><Loader2 className="h-6 w-6 animate-spin text-icon-soft" /></div>
        ) : (
          <form onSubmit={handleSubmit(onSubmit)} className="grid grid-cols-1 gap-4 rounded-2xl border border-stroke-sub bg-bg-1 p-6 sm:grid-cols-2">
            <FormField label="F.I.O" required error={errors.fullName && 'Ism-sharif kiriting'} className="sm:col-span-2">
              <Input {...register('fullName', { required: true })} error={errors.fullName} placeholder="Ismsharif Familiya" />
            </FormField>

            <FormField label="Tug'ilgan sana">
              <Input type="date" {...register('birthDate')} />
            </FormField>
            <FormField label="Telefon raqami" required error={errors.phone && '+998XXXXXXXXX formatida'}>
              <Input {...register('phone', { required: true, pattern: /^\+998\d{9}$/ })} error={errors.phone} placeholder="+998901234567" />
            </FormField>

            <FormField label="Telegram profili" className="sm:col-span-2">
              <Input {...register('telegram')} placeholder="https://t.me/username" />
            </FormField>

            <div className="flex items-center gap-3 sm:col-span-2">
              <Switch checked={isStudent} onChange={(v) => setValue('isStudent', v)} />
              <span className="text-sm text-text-strong">Talabaman</span>
            </div>
            {isStudent && (
              <FormField label="O'qish joyi" required error={errors.university && 'O\'qish joyini kiriting'} className="sm:col-span-2">
                <Input {...register('university', { required: isStudent })} error={errors.university} placeholder="Universitet nomi" />
              </FormField>
            )}

            <FormField label="Viloyat/Shahar">
              <Select {...register('regionId')} onChange={(e) => { setValue('regionId', e.target.value); setValue('districtId', ''); }}>
                <option value="">— Tanlang —</option>
                {(meta?.regions || []).map((r) => <option key={r.id} value={r.id}>{r.name}</option>)}
              </Select>
            </FormField>
            <FormField label="Tuman">
              <Select {...register('districtId')} disabled={!regionId}>
                <option value="">— Tanlang —</option>
                {districts.map((d) => <option key={d.id} value={d.id}>{d.name}</option>)}
              </Select>
            </FormField>

            <FormField label="Yo'nalish (lavozim)" className="sm:col-span-2">
              <Select {...register('positionId')}>
                <option value="">— Tanlang —</option>
                {(meta?.positions || []).map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}
              </Select>
            </FormField>

            <FormField label="Rezyume (PDF, max 10MB)" className="sm:col-span-2">
              <label className="flex cursor-pointer items-center gap-3 rounded-lg border border-dashed border-stroke-sub bg-bg-1-alt px-4 py-3 hover:border-accent-strong">
                <Upload className="h-5 w-5 text-icon-soft" />
                <span className="text-sm text-text-sub">{resume ? resume.name : 'PDF fayl tanlang'}</span>
                <input type="file" accept="application/pdf" className="hidden" onChange={onFile} />
              </label>
            </FormField>

            <FormField label="Portfolio (havola)" className="sm:col-span-2">
              <Input {...register('portfolio')} placeholder="https://github.com/..." />
            </FormField>

            <FormField label="Qo'shimcha ma'lumot" className="sm:col-span-2">
              <Textarea rows={3} {...register('extraInfo')} placeholder="O'zingiz haqingizda qisqacha..." />
            </FormField>

            <div className="sm:col-span-2">
              <Button type="submit" className="w-full" loading={submit.isPending}>Arizani yuborish</Button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
}
