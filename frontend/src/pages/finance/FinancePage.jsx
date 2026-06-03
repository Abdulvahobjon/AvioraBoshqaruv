import { useState } from 'react';
import { Plus, Wallet, Clock, CheckCircle2, XCircle, Send, RotateCcw } from 'lucide-react';
import { toast } from 'sonner';
import { PageHeader } from '@/components/shared/PageHeader';
import { StatCard } from '@/components/shared/StatCard';
import { DataTable } from '@/components/shared/DataTable';
import { Tabs } from '@/components/ui/Tabs';
import { Button } from '@/components/ui/Button';
import { Badge } from '@/components/ui/Badge';
import { formatMoney, formatDate } from '@/lib/utils/format';
import { FINANCE_STATUS, FINANCE_TYPE } from '@/lib/constants';
import { apiError } from '@/lib/api/axios';
import { useAuthStore } from '@/store/authStore';
import { useBalance, useRequests, useRequestAction, useLedger, useReverseLedger } from '@/features/finance/financeApi';
import { RequestDialog } from '@/features/finance/RequestDialog';

export function FinancePage() {
  const role = useAuthStore((s) => s.user?.role);
  const isAccountant = ['accountant', 'admin', 'superadmin'].includes(role);
  const [tab, setTab] = useState(isAccountant ? 'manage' : 'mine');
  const [dialogOpen, setDialogOpen] = useState(false);

  const { data: balance, isLoading: balanceLoading } = useBalance();
  const action = useRequestAction();
  const [pending, setPending] = useState(null); // { id, action } — amaldagi so'rov (dubl-bosishdan himoya)

  const doAction = (id, act, okMsg) => {
    if (action.isPending) return; // bir vaqtda faqat bitta amal
    setPending({ id, action: act });
    action.mutate({ id, action: act }, {
      onSuccess: () => toast.success(okMsg),
      onError: (e) => toast.error(apiError(e)),
      onSettled: () => setPending(null),
    });
  };

  const tabs = [
    { value: 'mine', label: "Mening so'rovlarim" },
    ...(isAccountant ? [{ value: 'manage', label: "So'rovlarni boshqarish" }, { value: 'ledger', label: 'Ledger' }] : []),
  ];

  return (
    <div>
      <PageHeader
        title="Moliya"
        subtitle="Balans, so'rovlar va ledger registri"
        actions={<Button onClick={() => setDialogOpen(true)}><Plus className="h-4 w-4" /> So'rov yuborish</Button>}
      />

      <div className="mb-6 grid grid-cols-1 gap-4 sm:grid-cols-2">
        <StatCard icon={Wallet} label="Mavjud balans" value={formatMoney(balance?.balance)} tone="accent" loading={balanceLoading} />
        <StatCard icon={Clock} label="Pending (tasdiqlanmagan)" value={formatMoney(balance?.pending)} tone="neutral" hint="To'langan, tasdiq kutilmoqda" loading={balanceLoading} />
      </div>

      <Tabs tabs={tabs} value={tab} onChange={setTab} className="mb-4" />

      {tab === 'mine' && <MyRequests doAction={doAction} pending={pending} busy={action.isPending} />}
      {tab === 'manage' && isAccountant && <ManageRequests doAction={doAction} pending={pending} busy={action.isPending} />}
      {tab === 'ledger' && isAccountant && <LedgerTab />}

      <RequestDialog open={dialogOpen} onClose={() => setDialogOpen(false)} />
    </div>
  );
}

function StatusBadge({ status }) {
  return <Badge tone={FINANCE_STATUS[status]?.tone}>{FINANCE_STATUS[status]?.label}</Badge>;
}

function MyRequests({ doAction, pending, busy }) {
  const { data, isLoading } = useRequests();
  const columns = [
    { key: 'createdAt', header: 'Sana', render: (r) => formatDate(r.createdAt) },
    { key: 'type', header: 'Turi', render: (r) => FINANCE_TYPE[r.type] },
    { key: 'amount', header: 'Summa', render: (r) => formatMoney(r.amount, r.currency) },
    { key: 'reason', header: 'Sabab', render: (r) => <span className="text-text-sub">{r.reason}</span> },
    { key: 'status', header: 'Status', render: (r) => <StatusBadge status={r.status} /> },
    {
      key: 'actions', header: '',
      render: (r) => r.status === 'paid' ? (
        <Button size="sm" onClick={() => doAction(r.id, 'confirm', 'Tasdiqlandi')}
          loading={pending?.id === r.id && pending?.action === 'confirm'} disabled={busy}>
          <CheckCircle2 className="h-4 w-4" /> Tasdiqlash
        </Button>
      ) : null,
    },
  ];
  return <DataTable columns={columns} data={data} loading={isLoading} emptyTitle="So'rovlar yo'q" emptyDescription="Yangi so'rov yuborish uchun yuqoridagi tugmani bosing." />;
}

function ManageRequests({ doAction, pending, busy }) {
  const { data, isLoading } = useRequests();
  const columns = [
    { key: 'user', header: 'Xodim', render: (r) => r.user?.fullName },
    { key: 'type', header: 'Turi', render: (r) => FINANCE_TYPE[r.type] },
    { key: 'amount', header: 'Summa', render: (r) => formatMoney(r.amount, r.currency) },
    { key: 'card', header: 'Karta', render: (r) => r.card || '—' },
    { key: 'reason', header: 'Sabab', render: (r) => <span className="text-text-sub">{r.reason}</span> },
    { key: 'status', header: 'Status', render: (r) => <StatusBadge status={r.status} /> },
    {
      key: 'actions', header: '',
      render: (r) => r.status === 'pending' ? (
        <div className="flex gap-1" onClick={(e) => e.stopPropagation()}>
          <Button size="sm" onClick={() => doAction(r.id, 'pay', "To'landi")}
            loading={pending?.id === r.id && pending?.action === 'pay'} disabled={busy}><Send className="h-4 w-4" /> To'lash</Button>
          <Button size="sm" variant="ghost" className="text-error-strong" onClick={() => doAction(r.id, 'reject', 'Rad etildi')}
            loading={pending?.id === r.id && pending?.action === 'reject'} disabled={busy}><XCircle className="h-4 w-4" /></Button>
        </div>
      ) : null,
    },
  ];
  return <DataTable columns={columns} data={data} loading={isLoading} emptyTitle="So'rovlar yo'q" />;
}

function LedgerTab() {
  const { data, isLoading } = useLedger();
  const reverse = useReverseLedger();
  const [reversingId, setReversingId] = useState(null);

  const doReverse = (id) => {
    if (reverse.isPending) return; // dubl-bosishdan himoya
    setReversingId(id);
    reverse.mutate({ id }, {
      onSuccess: () => toast.success('Teskari yozuv qo\'shildi'),
      onError: (e) => toast.error(apiError(e)),
      onSettled: () => setReversingId(null),
    });
  };

  const columns = [
    { key: 'createdAt', header: 'Sana', render: (r) => formatDate(r.createdAt, true) },
    { key: 'user', header: 'Xodim', render: (r) => r.user?.fullName || '—' },
    { key: 'type', header: 'Turi', render: (r) => r.type },
    {
      key: 'direction', header: "Yo'nalish",
      render: (r) => <Badge tone={r.direction === 'credit' ? 'success' : 'warning'}>{r.direction === 'credit' ? 'Kirim' : 'Chiqim'}</Badge>,
    },
    { key: 'amount', header: 'Summa', render: (r) => formatMoney(r.amount) },
    { key: 'note', header: 'Izoh', render: (r) => <span className="text-text-sub">{r.note}</span> },
    {
      key: 'actions', header: '',
      render: (r) => !r.isReversal ? (
        <Button size="sm" variant="ghost" onClick={() => doReverse(r.id)} loading={reversingId === r.id} disabled={reverse.isPending}>
          <RotateCcw className="h-4 w-4" /> Teskari
        </Button>
      ) : <Badge tone="muted">Teskari</Badge>,
    },
  ];
  return <DataTable columns={columns} data={data} loading={isLoading} emptyTitle="Ledger bo'sh" emptyDescription="Moliyaviy yozuvlar bu yerda ko'rinadi." />;
}
