import { useForm } from 'react-hook-form';
import { toast } from 'sonner';
import { Dialog } from '@/components/ui/Dialog';
import { Button } from '@/components/ui/Button';
import { Input, Textarea, Select } from '@/components/ui/Input';
import { FormField } from '@/components/ui/FormField';
import { apiError } from '@/lib/api/axios';
import { toTiyin } from '@/lib/utils/format';
import { useReference } from '@/features/settings/settingsApi';
import { useCreateRequest } from './financeApi';

export function RequestDialog({ open, onClose }) {
  const { data: categories } = useReference('expenseCategory');
  const create = useCreateRequest();
  const { register, handleSubmit, watch, reset, formState: { errors } } = useForm({
    defaultValues: { type: 'salary', currency: 'UZS' },
  });
  const type = watch('type');

  const onSubmit = (v) => {
    const payload = {
      amount: toTiyin(v.amount),
      currency: v.currency,
      type: v.type,
      reason: v.reason,
      card: v.card || undefined,
      categoryId: v.type === 'other' && v.categoryId ? Number(v.categoryId) : undefined,
    };
    create.mutate(payload, {
      onSuccess: () => { toast.success("So'rov yuborildi"); reset(); onClose(); },
      onError: (e) => toast.error(apiError(e)),
    });
  };

  return (
    <Dialog
      open={open}
      onClose={onClose}
      title="Yangi so'rov"
      footer={
        <>
          <Button variant="outline" onClick={onClose}>Bekor</Button>
          <Button onClick={handleSubmit(onSubmit)} loading={create.isPending}>Yuborish</Button>
        </>
      }
    >
      <form onSubmit={handleSubmit(onSubmit)} className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <FormField label="Turi" required>
          <Select {...register('type')}>
            <option value="salary">Oylik / yechib olish</option>
            <option value="company">Kompaniya</option>
            <option value="other">Boshqa</option>
          </Select>
        </FormField>
        {type === 'other' && (
          <FormField label="Kategoriya">
            <Select {...register('categoryId')}>
              <option value="">— Tanlang —</option>
              {(categories || []).map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
            </Select>
          </FormField>
        )}
        <FormField label="Summa" required error={errors.amount && 'Summa kiriting'}>
          <Input type="number" min="0" step="any" {...register('amount', { required: true })} error={errors.amount} />
        </FormField>
        <FormField label="Valuta">
          <Select {...register('currency')}>
            <option value="UZS">so'm (UZS)</option>
            <option value="USD">dollar (USD)</option>
          </Select>
        </FormField>
        <FormField label="Karta raqami" className="sm:col-span-2">
          <Input placeholder="8600 **** **** ****" {...register('card')} />
        </FormField>
        <FormField label="Sabab" required className="sm:col-span-2" error={errors.reason && 'Sabab kiriting'}>
          <Textarea {...register('reason', { required: true })} error={errors.reason} />
        </FormField>
      </form>
    </Dialog>
  );
}
