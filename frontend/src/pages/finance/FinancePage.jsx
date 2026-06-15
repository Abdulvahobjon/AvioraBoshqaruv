import { useState } from 'react';
import { Search, Filter, Send, Check, Clock, X } from 'lucide-react';
import { PageHeader } from '@/components/shared/PageHeader';
import { DataTable } from '@/components/shared/DataTable';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { cn } from '@/lib/utils/cn';
import { formatMoney, formatDate } from '@/lib/utils/format';
import { FINANCE_TYPE } from '@/lib/constants';
import { useCan } from '@/lib/permissions';
import { useAuthStore } from '@/store/authStore';
import { useDebounce } from '@/hooks/useDebounce';
import { useRequests } from '@/features/finance/financeApi';
import { RequestDialog } from '@/features/finance/RequestDialog';
import { RequestReviewDialog } from '@/features/finance/RequestReviewDialog';
import { RequestFilterDialog } from '@/features/finance/RequestFilterDialog';

const STATUS_CELL = {
  closed: { Icon: Check, cls: 'bg-success-strong text-text-white' },
  paid: { Icon: Check, cls: 'bg-success-strong text-text-white' },
  pending: { Icon: Clock, cls: 'bg-warning-soft text-warning-strong' },
  rejected: { Icon: X, cls: 'bg-error-strong text-text-white' },
};

function StatusCell({ status }) {
  const m = STATUS_CELL[status] || STATUS_CELL.pending;
  return <span className={cn('inline-flex h-6 w-6 items-center justify-center rounded-md', m.cls)}><m.Icon className="h-4 w-4" /></span>;
}

export function FinancePage() {
  const can = useCan();
  const canRequest = can('finance.request');
  const canProcess = can('finance.process');
  const myId = useAuthStore((s) => s.user?.id);

  const [search, setSearch] = useState('');
  const debounced = useDebounce(search);
  const [filters, setFilters] = useState({});
  const [filterOpen, setFilterOpen] = useState(false);
  const [createOpen, setCreateOpen] = useState(false);
  const [selected, setSelected] = useState(null); // ko'rib chiqilayotgan so'rov

  const activeFilters = Object.fromEntries(Object.entries(filters).filter(([, v]) => v));
  const hasFilters = Object.keys(activeFilters).length > 0;

  const { data, isLoading } = useRequests({ search: debounced || undefined, ...activeFilters });
  const rows = data || [];

  const columns = [
    { key: 'idx', header: '№', render: (_r, i) => <span className="text-text-soft">{i + 1}</span> },
    { key: 'user', header: 'Ism Sharifi', render: (r) => <span className="font-medium text-text-strong">{r.user?.fullName || '—'}</span> },
    { key: 'type', header: 'Xarajat turi', render: (r) => <span className="text-text-sub">{FINANCE_TYPE[r.type] || '—'}</span> },
    { key: 'category', header: 'Toifa', render: (r) => <span className="text-text-sub">{r.category?.name || '—'}</span> },
    { key: 'project', header: 'Loyiha', render: (r) => <span className="text-text-sub">{r.project?.name || '—'}</span> },
    { key: 'amount', header: 'Summa (UZS)', render: (r) => <span className="font-semibold text-text-strong">{formatMoney(r.amount, r.currency)}</span> },
    { key: 'createdAt', header: 'Yaratilgan vaqt', render: (r) => <span className="whitespace-nowrap text-text-sub">{formatDate(r.createdAt)}</span> },
    { key: 'paidAt', header: "To'langan vaqt", render: (r) => <span className="whitespace-nowrap text-text-sub">{r.paidAt ? formatDate(r.paidAt) : '—'}</span> },
    { key: 'confirmedAt', header: 'Tasdiqlangan vaqt', render: (r) => <span className="whitespace-nowrap text-text-sub">{r.confirmedAt ? formatDate(r.confirmedAt) : '—'}</span> },
    { key: 'status', header: 'Xolat', render: (r) => <StatusCell status={r.status} /> },
  ];

  return (
    <div className="flex h-[calc(100vh-6rem)] flex-col sm:h-[calc(100vh-7rem)]">
      <PageHeader
        title="Xarajat so'rovlari"
        actions={canRequest && <Button onClick={() => setCreateOpen(true)}><Send className="h-4 w-4" /> So'rov</Button>}
      />

      <div className="mb-4 flex flex-col gap-2 sm:flex-row sm:items-center">
        <div className="relative w-full sm:w-72">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-icon-soft" />
          <Input placeholder="Ism Sharifi bo'yicha izlash" className="pl-9" value={search} onChange={(e) => setSearch(e.target.value)} />
        </div>
        <Button variant="outline" onClick={() => setFilterOpen(true)} className={cn('relative', hasFilters && 'border-stroke-accent text-text-accent')}>
          <Filter className="h-4 w-4" /> Filtrlash
          {hasFilters && <span className="absolute -right-1 -top-1 h-2.5 w-2.5 rounded-full bg-accent-strong" />}
        </Button>
      </div>

      <div className="min-h-0 flex-1">
        <DataTable
          columns={columns}
          data={rows}
          loading={isLoading}
          onRowClick={(r) => setSelected(r)}
          emptyTitle="So'rovlar yo'q"
          emptyDescription={canRequest ? "Yangi so'rov yuborish uchun yuqoridagi tugmani bosing." : "Xarajat so'rovlari bu yerda ko'rinadi."}
          transparent
          fill
        />
      </div>

      <RequestDialog open={createOpen} onClose={() => setCreateOpen(false)} />
      <RequestReviewDialog
        open={!!selected}
        onClose={() => setSelected(null)}
        request={selected}
        canProcess={canProcess}
        isOwner={selected?.userId === myId}
      />
      <RequestFilterDialog
        open={filterOpen}
        onClose={() => setFilterOpen(false)}
        value={filters}
        onApply={setFilters}
        showMine={canProcess}
      />
    </div>
  );
}
