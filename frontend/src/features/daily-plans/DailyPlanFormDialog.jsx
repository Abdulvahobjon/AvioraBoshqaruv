import { useEffect } from 'react';
import { useForm, Controller } from 'react-hook-form';
import { toast } from 'sonner';
import { Dialog } from '@/components/ui/Dialog';
import { Button } from '@/components/ui/Button';
import { Input, Textarea, Select } from '@/components/ui/Input';
import { DateTimeBox } from '@/components/ui/DateTimeBox';
import { FormField } from '@/components/ui/FormField';
import { apiError } from '@/lib/api/axios';
import { DAILY_PLAN_PRIORITY } from '@/lib/constants';
import { useSaveDailyPlan } from './dailyPlansApi';

/** Reja sanasini (ISO) yangilash dialogi. `defaultDate` — tanlangan kun. */
export function DailyPlanFormDialog({ open, onClose, plan, defaultDate }) {
  const isEdit = !!plan;
  const save = useSaveDailyPlan();
  const { register, control, handleSubmit, reset, formState: { errors } } = useForm();

  useEffect(() => {
    if (!open) return;
    reset(
      plan
        ? {
            title: plan.title,
            description: plan.description || '',
            date: plan.date ? plan.date.slice(0, 10) : defaultDate,
            time: plan.time || '',
            priority: plan.priority || 'medium',
          }
        : { title: '', description: '', date: defaultDate, time: '', priority: 'medium' },
    );
  }, [open, plan, defaultDate, reset]);

  const onSubmit = async (v) => {
    const payload = {
      title: v.title.trim(),
      description: v.description?.trim() || undefined,
      date: v.date,
      time: v.time || undefined,
      priority: v.priority,
    };
    try {
      await save.mutateAsync({ id: plan?.id, ...payload });
      toast.success(isEdit ? 'Reja yangilandi' : 'Reja qo\'shildi');
      onClose();
    } catch (e) {
      toast.error(apiError(e));
    }
  };

  const req = '*Bu maydon majburiy';

  return (
    <Dialog
      open={open}
      onClose={onClose}
      title={isEdit ? 'Rejani tahrirlash' : 'Yangi reja'}
      subtitle={isEdit ? 'Reja ma\'lumotlarini yangilang' : 'Bugun yoki boshqa kun uchun reja qo\'shing'}
      size="md"
      footer={
        <>
          <Button variant="ghost" onClick={onClose}>Yopish</Button>
          <Button onClick={handleSubmit(onSubmit)} loading={save.isPending}>{isEdit ? 'Saqlash' : 'Qo\'shish'}</Button>
        </>
      }
    >
      <form onSubmit={handleSubmit(onSubmit)} className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <FormField label="Nomi" required className="sm:col-span-2" error={errors.title && req}>
          <Input placeholder="Masalan: Hisobotni tayyorlash" {...register('title', { required: true })} error={errors.title} />
        </FormField>

        <FormField label="Izoh" className="sm:col-span-2">
          <Textarea placeholder="Qo'shimcha tafsilotlar (ixtiyoriy)" {...register('description')} />
        </FormField>

        <FormField label="Sana" required error={errors.date && req}>
          <Controller
            name="date"
            control={control}
            rules={{ required: true }}
            render={({ field }) => <DateTimeBox type="date" value={field.value} onChange={field.onChange} error={errors.date} />}
          />
        </FormField>

        <FormField label="Vaqt (ixtiyoriy)">
          <Controller
            name="time"
            control={control}
            render={({ field }) => <DateTimeBox type="time" value={field.value} onChange={field.onChange} />}
          />
        </FormField>

        <FormField label="Muhimligi" className="sm:col-span-2">
          <Select {...register('priority')}>
            {Object.entries(DAILY_PLAN_PRIORITY).map(([k, v]) => <option key={k} value={k}>{v.label}</option>)}
          </Select>
        </FormField>
      </form>
    </Dialog>
  );
}
