import { useState } from 'react';
import { toast } from 'sonner';
import { Plus, Trash2, Wallet, Banknote } from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { Dialog } from '@/components/ui/Dialog';
import { Select } from '@/components/ui/Input';
import { MoneyInput } from '@/components/ui/MoneyInput';
import { FormField } from '@/components/ui/FormField';
import { EmptyState } from '@/components/shared/EmptyState';
import { ConfirmDialog } from '@/components/shared/ConfirmDialog';
import { formatMoney, formatDate, toTiyin } from '@/lib/utils/format';
import { apiError } from '@/lib/api/axios';
import { useAddClientPayment, useDeleteClientPayment } from './clientsApi';

export function ClientPaymentsTab({ clientId, payments = [], projects = [], totalPaid, canAdd, canDelete }) {
  const [adding, setAdding] = useState(false);
  const [deleting, setDeleting] = useState(null);
  const del = useDeleteClientPayment();

  const confirmDelete = () =>
    del.mutate(
      { clientId, paymentId: deleting.id },
      { onSuccess: () => { toast.success('To\'lov o\'chirildi'); setDeleting(null); }, onError: (e) => toast.error(apiError(e)) },
    );

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between gap-2 rounded-lg border border-stroke-soft bg-bg-1-alt px-4 py-3">
        <span className="flex items-center gap-2 text-sm text-text-sub"><Wallet className="h-4 w-4 text-icon-accent" /> Jami qabul qilingan to'lovlar</span>
        <span className="text-lg font-semibold text-text-strong">{formatMoney(totalPaid)}</span>
      </div>

      {canAdd && (
        <div className="flex justify-end">
          <Button size="sm" onClick={() => setAdding(true)}><Plus className="h-4 w-4" /> To'lov qo'shish</Button>
        </div>
      )}

      {payments.length === 0 ? (
        <EmptyState title="To'lovlar yo'q" description="Bu mijozdan hali to'lov qayd etilmagan." />
      ) : (
        <div className="space-y-2">
          {payments.map((p) => (
            <div key={p.id} className="flex items-center justify-between gap-3 rounded-lg border border-stroke-soft p-3">
              <div className="flex min-w-0 items-center gap-3">
                <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-success-soft text-success-strong">
                  <Banknote className="h-4 w-4" />
                </span>
                <div className="min-w-0">
                  <p className="font-medium text-text-strong">{formatMoney(p.amount, p.currency)}</p>
                  <p className="truncate text-xs text-text-soft">
                    {formatDate(p.date)}{p.project ? ` · ${p.project.name}` : ''}
                  </p>
                </div>
              </div>
              {canDelete && (
                <button className="rounded p-1.5 text-error-strong hover:bg-error-soft" onClick={() => setDeleting(p)}>
                  <Trash2 className="h-4 w-4" />
                </button>
              )}
            </div>
          ))}
        </div>
      )}

      {adding && <PaymentDialog clientId={clientId} projects={projects} onClose={() => setAdding(false)} />}
      <ConfirmDialog
        open={!!deleting}
        onClose={() => setDeleting(null)}
        onConfirm={confirmDelete}
        loading={del.isPending}
        message={`${deleting ? formatMoney(deleting.amount, deleting.currency) : ''} to'lovni o'chirmoqchimisiz?`}
      />
    </div>
  );
}

function PaymentDialog({ clientId, projects, onClose }) {
  const [amount, setAmount] = useState('');
  const [currency, setCurrency] = useState('UZS');
  const [projectId, setProjectId] = useState('');
  const add = useAddClientPayment();

  const submit = () => {
    const tiyin = toTiyin(amount);
    if (!tiyin || tiyin < 1) { toast.error('Summani kiriting'); return; }
    add.mutate(
      { clientId, amount: tiyin, currency, projectId: projectId ? Number(projectId) : undefined },
      { onSuccess: () => { toast.success('To\'lov qo\'shildi'); onClose(); }, onError: (e) => toast.error(apiError(e)) },
    );
  };

  return (
    <Dialog
      open
      onClose={onClose}
      title="Yangi to'lov"
      subtitle="Mijozdan kelgan to'lovni qayd eting"
      footer={<><Button variant="outline" onClick={onClose}>Bekor qilish</Button><Button onClick={submit} loading={add.isPending}>Saqlash</Button></>}
    >
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <FormField label="Summa" required>
          <MoneyInput value={amount} onChange={setAmount} placeholder="0" />
        </FormField>
        <FormField label="Valyuta">
          <Select value={currency} onChange={(e) => setCurrency(e.target.value)}>
            <option value="UZS">so'm (UZS)</option>
            <option value="USD">dollar (USD)</option>
          </Select>
        </FormField>
        <FormField label="Bog'liq loyiha (ixtiyoriy)" className="sm:col-span-2">
          <Select value={projectId} onChange={(e) => setProjectId(e.target.value)}>
            <option value="">— Tanlanmagan —</option>
            {projects.map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}
          </Select>
        </FormField>
      </div>
    </Dialog>
  );
}
