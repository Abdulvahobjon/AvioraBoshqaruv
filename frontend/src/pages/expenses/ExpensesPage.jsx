import { useState, useEffect } from 'react';
import { useForm, Controller } from 'react-hook-form';
import { Plus, Pencil, Trash2, Receipt } from 'lucide-react';
import { toast } from 'sonner';
import { PageHeader } from '@/components/shared/PageHeader';
import { DataTable } from '@/components/shared/DataTable';
import { StatCard } from '@/components/shared/StatCard';
import { Dialog } from '@/components/ui/Dialog';
import { Button } from '@/components/ui/Button';
import { Input, Textarea } from '@/components/ui/Input';
import { MoneyInput } from '@/components/ui/MoneyInput';
import { RHFSelect } from '@/components/ui/RHFSelect';
import { FormField } from '@/components/ui/FormField';
import { DateTimeBox } from '@/components/ui/DateTimeBox';
import { ConfirmDialog } from '@/components/shared/ConfirmDialog';
import { formatMoney, formatDate, toTiyin, fromTiyin } from '@/lib/utils/format';
import { apiError } from '@/lib/api/axios';
import { useAuthStore } from '@/store/authStore';
import { can } from '@/lib/permissions';
import { useReference } from '@/features/settings/settingsApi';
import { useProjects } from '@/features/projects/projectsApi';
import { useExpenses, useSaveExpense, useDeleteExpense } from '@/features/expenses/expensesApi';

export function ExpensesPage() {
  const { data, isLoading } = useExpenses();
  const [formOpen, setFormOpen] = useState(false);
  const [editing, setEditing] = useState(null);
  const [deleting, setDeleting] = useState(null);
  const del = useDeleteExpense();
  // Auditor — faqat o'qiy oladi (backend ham bloklaydi); yozuv tugmalarini ko'rsatmaymiz.
  const canWrite = can(useAuthStore((s) => s.user?.role), 'expenses.write');

  const columns = [
    { key: 'date', header: 'Sana', render: (r) => formatDate(r.date) },
    { key: 'category', header: 'Kategoriya', render: (r) => r.category?.name || '—' },
    { key: 'project', header: 'Loyiha', render: (r) => r.project?.name || '—' },
    { key: 'amount', header: 'Miqdor', render: (r) => formatMoney(r.amount, r.currency) },
    { key: 'amountUzs', header: "So'mda", render: (r) => formatMoney(r.amountUzs) },
    { key: 'note', header: 'Izoh', render: (r) => <span className="text-text-sub">{r.note || '—'}</span> },
    ...(canWrite ? [{
      key: 'actions', header: '',
      render: (r) => (
        <div className="flex justify-end gap-1" onClick={(e) => e.stopPropagation()}>
          <button className="rounded p-1.5 text-icon-sub hover:bg-bg-2" onClick={() => { setEditing(r); setFormOpen(true); }}><Pencil className="h-4 w-4" /></button>
          <button className="rounded p-1.5 text-error-strong hover:bg-error-soft" onClick={() => setDeleting(r)}><Trash2 className="h-4 w-4" /></button>
        </div>
      ),
    }] : []),
  ];

  return (
    <div>
      <PageHeader
        title="Xarajatlar"
        subtitle="Kompaniya xarajatlari"
        actions={canWrite && <Button onClick={() => { setEditing(null); setFormOpen(true); }}><Plus className="h-4 w-4" /> Yangi xarajat</Button>}
      />
      <div className="mb-6 grid grid-cols-1 sm:max-w-xs">
        <StatCard icon={Receipt} label="Jami xarajat (so'm)" value={formatMoney(data?.totalUzs)} tone="error" loading={isLoading} />
      </div>
      <DataTable columns={columns} data={data?.items} loading={isLoading} emptyTitle="Xarajatlar yo'q" emptyDescription="Birinchi xarajatni qo'shing." />

      <ExpenseDialog open={formOpen} onClose={() => setFormOpen(false)} expense={editing} />
      <ConfirmDialog
        open={!!deleting}
        onClose={() => setDeleting(null)}
        onConfirm={() => del.mutate(deleting.id, { onSuccess: () => { toast.success("O'chirildi"); setDeleting(null); }, onError: (e) => toast.error(apiError(e)) })}
        loading={del.isPending}
        message="Bu xarajatni o'chirmoqchimisiz?"
      />
    </div>
  );
}

function ExpenseDialog({ open, onClose, expense }) {
  const { data: categories } = useReference('expenseCategory');
  const { data: projects } = useProjects({ limit: 200 });
  const save = useSaveExpense();
  const { register, control, handleSubmit, reset, formState: { errors } } = useForm();

  useEffect(() => {
    if (!open) return;
    reset(
      expense
        ? { categoryId: expense.categoryId || '', projectId: expense.projectId || '', amount: fromTiyin(expense.amount), currency: expense.currency, date: expense.date?.slice(0, 10), note: expense.note || '' }
        : { categoryId: '', projectId: '', amount: '', currency: 'UZS', date: new Date().toISOString().slice(0, 10), note: '' },
    );
  }, [open, expense, reset]);

  const onSubmit = (v) => {
    save.mutate(
      {
        id: expense?.id,
        categoryId: v.categoryId ? Number(v.categoryId) : undefined,
        projectId: v.projectId ? Number(v.projectId) : null,
        amount: toTiyin(v.amount),
        currency: v.currency,
        date: v.date,
        note: v.note || undefined,
      },
      { onSuccess: () => { toast.success(expense ? 'Yangilandi' : "Qo'shildi"); onClose(); }, onError: (e) => toast.error(apiError(e)) },
    );
  };

  return (
    <Dialog
      open={open}
      onClose={onClose}
      title={expense ? 'Xarajatni tahrirlash' : 'Yangi xarajat'}
      subtitle={expense ? "Xarajat ma'lumotlarini yangilang" : "Yangi xarajat ma'lumotlarini kiriting"}
      footer={<><Button variant="outline" onClick={onClose}>Bekor</Button><Button onClick={handleSubmit(onSubmit)} loading={save.isPending}>Saqlash</Button></>}
    >
      <form onSubmit={handleSubmit(onSubmit)} className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <FormField label="Kategoriya">
          <RHFSelect control={control} name="categoryId">
            <option value="">— Tanlang —</option>
            {(categories || []).map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
          </RHFSelect>
        </FormField>
        <FormField label="Loyiha (ixtiyoriy)">
          <RHFSelect control={control} name="projectId">
            <option value="">— Loyihasiz —</option>
            {(projects?.items || []).map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}
          </RHFSelect>
        </FormField>
        <FormField label="Sana">
          <Controller name="date" control={control} render={({ field }) => <DateTimeBox type="date" value={field.value} onChange={field.onChange} />} />
        </FormField>
        <FormField label="Miqdor" required error={errors.amount && 'Kiriting'}>
          <Controller name="amount" control={control} rules={{ required: true }} render={({ field }) => (
            <MoneyInput value={field.value} onChange={field.onChange} placeholder="0" error={errors.amount} />
          )} />
        </FormField>
        <FormField label="Valuta">
          <RHFSelect control={control} name="currency">
            <option value="UZS">so'm (UZS)</option>
            <option value="USD">dollar (USD)</option>
          </RHFSelect>
        </FormField>
        <FormField label="Izoh" className="sm:col-span-2">
          <Textarea {...register('note')} />
        </FormField>
      </form>
    </Dialog>
  );
}
