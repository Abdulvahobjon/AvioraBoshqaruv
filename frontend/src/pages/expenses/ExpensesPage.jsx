import { useState, useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { Plus, Pencil, Trash2, Receipt } from 'lucide-react';
import { toast } from 'sonner';
import { PageHeader } from '@/components/shared/PageHeader';
import { DataTable } from '@/components/shared/DataTable';
import { StatCard } from '@/components/shared/StatCard';
import { Dialog } from '@/components/ui/Dialog';
import { Button } from '@/components/ui/Button';
import { Input, Textarea, Select } from '@/components/ui/Input';
import { FormField } from '@/components/ui/FormField';
import { ConfirmDialog } from '@/components/shared/ConfirmDialog';
import { formatMoney, formatDate, toTiyin, fromTiyin } from '@/lib/utils/format';
import { apiError } from '@/lib/api/axios';
import { useReference } from '@/features/settings/settingsApi';
import { useExpenses, useSaveExpense, useDeleteExpense } from '@/features/expenses/expensesApi';

export function ExpensesPage() {
  const { data, isLoading } = useExpenses();
  const [formOpen, setFormOpen] = useState(false);
  const [editing, setEditing] = useState(null);
  const [deleting, setDeleting] = useState(null);
  const del = useDeleteExpense();

  const columns = [
    { key: 'date', header: 'Sana', render: (r) => formatDate(r.date) },
    { key: 'category', header: 'Kategoriya', render: (r) => r.category?.name || '—' },
    { key: 'amount', header: 'Miqdor', render: (r) => formatMoney(r.amount, r.currency) },
    { key: 'amountUzs', header: "So'mda", render: (r) => formatMoney(r.amountUzs) },
    { key: 'note', header: 'Izoh', render: (r) => <span className="text-text-sub">{r.note || '—'}</span> },
    {
      key: 'actions', header: '',
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
        title="Xarajatlar"
        subtitle="Kompaniya xarajatlari"
        actions={<Button onClick={() => { setEditing(null); setFormOpen(true); }}><Plus className="h-4 w-4" /> Yangi xarajat</Button>}
      />
      <div className="mb-6 grid grid-cols-1 sm:max-w-xs">
        <StatCard icon={Receipt} label="Jami xarajat (so'm)" value={formatMoney(data?.totalUzs)} tone="error" />
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
  const save = useSaveExpense();
  const { register, handleSubmit, reset, formState: { errors } } = useForm();

  useEffect(() => {
    if (!open) return;
    reset(
      expense
        ? { categoryId: expense.categoryId || '', amount: fromTiyin(expense.amount), currency: expense.currency, date: expense.date?.slice(0, 10), note: expense.note || '' }
        : { categoryId: '', amount: '', currency: 'UZS', date: new Date().toISOString().slice(0, 10), note: '' },
    );
  }, [open, expense, reset]);

  const onSubmit = (v) => {
    save.mutate(
      {
        id: expense?.id,
        categoryId: v.categoryId ? Number(v.categoryId) : undefined,
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
      footer={<><Button variant="outline" onClick={onClose}>Bekor</Button><Button onClick={handleSubmit(onSubmit)} loading={save.isPending}>Saqlash</Button></>}
    >
      <form onSubmit={handleSubmit(onSubmit)} className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <FormField label="Kategoriya">
          <Select {...register('categoryId')}>
            <option value="">— Tanlang —</option>
            {(categories || []).map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
          </Select>
        </FormField>
        <FormField label="Sana">
          <Input type="date" {...register('date')} />
        </FormField>
        <FormField label="Miqdor" required error={errors.amount && 'Kiriting'}>
          <Input type="number" min="0" step="any" {...register('amount', { required: true })} error={errors.amount} />
        </FormField>
        <FormField label="Valuta">
          <Select {...register('currency')}>
            <option value="UZS">so'm (UZS)</option>
            <option value="USD">dollar (USD)</option>
          </Select>
        </FormField>
        <FormField label="Izoh" className="sm:col-span-2">
          <Textarea {...register('note')} />
        </FormField>
      </form>
    </Dialog>
  );
}
