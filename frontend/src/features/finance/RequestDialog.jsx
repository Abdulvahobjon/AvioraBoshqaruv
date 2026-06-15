import { useEffect } from 'react';
import { useForm, Controller } from 'react-hook-form';
import { X, Send } from 'lucide-react';
import { toast } from 'sonner';
import { Dialog } from '@/components/ui/Dialog';
import { Button } from '@/components/ui/Button';
import { Textarea, Select } from '@/components/ui/Input';
import { MoneyInput } from '@/components/ui/MoneyInput';
import { CardNumberInput } from '@/components/ui/CardNumberInput';
import { FormField } from '@/components/ui/FormField';
import { apiError } from '@/lib/api/axios';
import { toTiyin } from '@/lib/utils/format';
import { FINANCE_TYPE, PAYMENT_METHOD } from '@/lib/constants';
import { useAuthStore } from '@/store/authStore';
import { useReference } from '@/features/settings/settingsApi';
import { useProjects } from '@/features/projects/projectsApi';
import { useCreateRequest } from './financeApi';

const REQUIRED = '*Bu maydon majburiy';
const Optional = () => <span className="font-normal text-text-soft"> (ixtiyoriy)</span>;
const DEFAULTS = { type: '', categoryId: '', projectId: '', amount: '', reason: '', paymentMethod: '', card: '' };

/**
 * "So'rov yuborish" — Xarajat turiga bog'liq maydonlar:
 *  • Mablag' chiqarish (salary) → Toifa YO'Q, Loyiha YO'Q
 *  • Kompaniya xarajatlari (company) → Toifa YO'Q, Loyiha MAJBURIY
 *  • Boshqa xarajatlar (other) → Toifa MAJBURIY, Loyiha YO'Q
 */
export function RequestDialog({ open, onClose }) {
  const { data: categories } = useReference('expenseCategory');
  const { data: projects } = useProjects({ limit: 200 });
  const create = useCreateRequest();
  const me = useAuthStore((s) => s.user);
  const savedCards = [me?.card, me?.card2].filter(Boolean);

  const { control, handleSubmit, watch, reset, setValue, formState: { errors } } = useForm({ defaultValues: DEFAULTS });
  useEffect(() => { if (open) reset(DEFAULTS); }, [open, reset]);

  const type = watch('type');
  const method = watch('paymentMethod');
  const needCategory = type === 'other';
  const needProject = type === 'company';

  // Tur o'zgarsa — tegishli bo'lmagan maydonlarni tozalaymiz.
  useEffect(() => {
    if (!needCategory) setValue('categoryId', '');
    if (!needProject) setValue('projectId', '');
  }, [type, needCategory, needProject, setValue]);

  const onSubmit = (v) => {
    create.mutate(
      {
        type: v.type,
        categoryId: needCategory && v.categoryId ? Number(v.categoryId) : undefined,
        projectId: needProject && v.projectId ? Number(v.projectId) : undefined,
        amount: toTiyin(v.amount),
        currency: 'UZS',
        reason: v.reason || undefined,
        paymentMethod: v.paymentMethod || undefined,
        card: v.paymentMethod === 'card' ? (v.card || undefined) : undefined,
      },
      {
        onSuccess: () => {
          toast.success("So'rov yuborildi", { description: "So'rovingiz muvaffaqiyatli yuborildi va ko'rib chiqish uchun qabul qilindi" });
          reset();
          onClose();
        },
        onError: (e) => toast.error(apiError(e)),
      },
    );
  };

  return (
    <Dialog
      open={open}
      onClose={onClose}
      onBack={onClose}
      title="So'rov yuborish"
      subtitle="So'rov uchun kerakli ma'lumotlarni kiriting"
      size="lg"
      footer={
        <div className="flex w-full items-center justify-end gap-2">
          <Button variant="ghost" onClick={onClose}><X className="h-4 w-4" /> Yopish</Button>
          <Button onClick={handleSubmit(onSubmit)} loading={create.isPending}><Send className="h-4 w-4" /> So'rov yuborish</Button>
        </div>
      }
    >
      <div className="space-y-4">
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <FormField label="Xarajat turi" required error={errors.type && REQUIRED}>
            <Controller name="type" control={control} rules={{ required: true }} render={({ field }) => (
              <Select value={field.value} onChange={(e) => field.onChange(e.target.value)} placeholder="Xarajat turini tanlang" error={errors.type}>
                <option value="">Xarajat turini tanlang</option>
                {Object.entries(FINANCE_TYPE).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
              </Select>
            )} />
          </FormField>
          <FormField label={needCategory ? 'Toifa' : <>Toifa<Optional /></>} required={needCategory} error={needCategory && errors.categoryId && REQUIRED}>
            <Controller name="categoryId" control={control} rules={{ required: needCategory }} render={({ field }) => (
              <Select value={field.value} onChange={(e) => field.onChange(e.target.value)} placeholder="Toifani tanlang" disabled={!needCategory} error={errors.categoryId}>
                <option value="">Toifani tanlang</option>
                {(categories || []).map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
              </Select>
            )} />
          </FormField>
        </div>

        <FormField label={needProject ? 'Loyiha' : <>Loyiha<Optional /></>} required={needProject} error={needProject && errors.projectId && REQUIRED}>
          <Controller name="projectId" control={control} rules={{ required: needProject }} render={({ field }) => (
            <Select value={field.value} onChange={(e) => field.onChange(e.target.value)} placeholder="Loyiha tanlang" disabled={!needProject} error={errors.projectId}>
              <option value="">Loyiha tanlang</option>
              {(projects?.items || []).map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}
            </Select>
          )} />
        </FormField>

        <FormField label="Miqdor (UZS)" required error={errors.amount && REQUIRED}>
          <Controller name="amount" control={control} rules={{ required: true, validate: (v) => Number(v) > 0 }} render={({ field }) => (
            <MoneyInput value={field.value} onChange={field.onChange} placeholder="0.00" error={errors.amount} />
          )} />
        </FormField>

        <FormField label={<>Sabab<Optional /></>}>
          <Controller name="reason" control={control} render={({ field }) => (
            <Textarea value={field.value} onChange={field.onChange} placeholder="Sababni yozing..." />
          )} />
        </FormField>

        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <FormField label="To'lov turi" className={method === 'card' ? '' : 'sm:col-span-2'}>
            <Controller name="paymentMethod" control={control} render={({ field }) => (
              <Select value={field.value} onChange={(e) => field.onChange(e.target.value)} placeholder="To'lov turini tanlang">
                <option value="">To'lov turini tanlang</option>
                {Object.entries(PAYMENT_METHOD).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
              </Select>
            )} />
          </FormField>
          {method === 'card' && (
            <FormField label="Karta raqami">
              <Controller name="card" control={control} render={({ field }) => (
                <CardNumberInput value={field.value} onChange={field.onChange} savedCards={savedCards} />
              )} />
            </FormField>
          )}
        </div>
      </div>
    </Dialog>
  );
}
