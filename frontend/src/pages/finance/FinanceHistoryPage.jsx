import { useEffect, useRef, useState } from 'react';
import { Search, Filter, Download, ChevronDown, Check, FileSpreadsheet, FileText, FileType } from 'lucide-react';
import { toast } from 'sonner';
import { PageHeader } from '@/components/shared/PageHeader';
import { DataTable } from '@/components/shared/DataTable';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Badge } from '@/components/ui/Badge';
import { cn } from '@/lib/utils/cn';
import { apiError } from '@/lib/api/axios';
import { formatMoney, formatDate } from '@/lib/utils/format';
import { useDebounce } from '@/hooks/useDebounce';
import { useLedger } from '@/features/finance/financeApi';
import { exportReport } from '@/features/reports/reportsApi';
import { HistoryDetailDialog } from '@/features/finance/HistoryDetailDialog';
import { HistoryFilterDialog } from '@/features/finance/HistoryFilterDialog';

const LEDGER_TYPE = { salary: 'Oylik', company: 'Kompaniya', other: 'Boshqa', project_share: 'Loyiha ulushi', withdrawal: 'Yechib olish', reversal: 'Teskari yozuv' };

/** "Yuklab olish" — Excel / PDF / CSV (ledger eksporti). */
function ExportMenu({ params }) {
  const ref = useRef(null);
  const [open, setOpen] = useState(false);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (!open) return;
    const onDoc = (e) => { if (!ref.current?.contains(e.target)) setOpen(false); };
    document.addEventListener('mousedown', onDoc);
    return () => document.removeEventListener('mousedown', onDoc);
  }, [open]);

  const run = async (format) => {
    setOpen(false); setBusy(true);
    try { await exportReport({ type: 'ledger', format, params }); }
    catch (e) { toast.error(apiError(e, 'Yuklab olishda xatolik')); }
    finally { setBusy(false); }
  };

  const formats = [
    { key: 'xlsx', label: 'Excel', icon: FileSpreadsheet },
    { key: 'pdf', label: 'PDF', icon: FileText },
    { key: 'csv', label: 'CSV', icon: FileType },
  ];

  return (
    <div ref={ref} className="relative">
      <Button onClick={() => setOpen((o) => !o)} loading={busy}>
        <Download className="h-4 w-4" /> Yuklab olish <ChevronDown className={cn('h-4 w-4 transition-transform', open && 'rotate-180')} />
      </Button>
      {open && (
        <div className="absolute right-0 z-40 mt-1 w-44 overflow-hidden rounded-lg border border-stroke-sub bg-bg-base py-1 shadow-elevated">
          {formats.map((f) => (
            <button key={f.key} onClick={() => run(f.key)} className="flex w-full items-center gap-2.5 px-4 py-2.5 text-sm text-text-sub transition-colors hover:bg-bg-1-alt hover:text-text-strong">
              <f.icon className="h-4 w-4" /> {f.label}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

export function FinanceHistoryPage() {
  const [search, setSearch] = useState('');
  const debounced = useDebounce(search);
  const [filters, setFilters] = useState({});
  const [filterOpen, setFilterOpen] = useState(false);
  const [detail, setDetail] = useState(null);

  const activeFilters = Object.fromEntries(Object.entries(filters).filter(([, v]) => v));
  const hasFilters = Object.keys(activeFilters).length > 0;

  const { data, isLoading } = useLedger({ search: debounced || undefined, ...activeFilters });
  const rows = data || [];

  const columns = [
    { key: 'idx', header: '№', render: (_r, i) => <span className="text-text-soft">{i + 1}</span> },
    { key: 'user', header: 'Ism sharifi', render: (r) => <span className="font-medium text-text-strong">{r.user?.fullName || '—'}</span> },
    { key: 'xarajat', header: 'Xarajat', render: (r) => <span className="text-text-sub">{r.request?.category?.name || LEDGER_TYPE[r.type] || r.type}</span> },
    { key: 'salary', header: 'Oylik maosh (UZS)', render: (r) => <span className="font-semibold text-text-strong">{formatMoney(r.user?.fixedSalary)}</span> },
    { key: 'amount', header: 'Miqdor (UZS)', render: (r) => <span className="font-semibold text-text-strong">{formatMoney(r.amount)}</span> },
    { key: 'dir', header: 'Turi', render: (r) => <Badge tone={r.direction === 'credit' ? 'success' : 'warning'}>{r.direction === 'credit' ? 'Kirim' : 'Chiqim'}</Badge> },
    { key: 'date', header: 'Sana', render: (r) => <span className="whitespace-nowrap text-text-sub">{formatDate(r.createdAt, true)}</span> },
    { key: 'ok', header: 'Tasdiqlash', render: () => <span className="inline-flex h-6 w-6 items-center justify-center rounded-md bg-success-strong text-text-white"><Check className="h-4 w-4" /></span> },
  ];

  return (
    <div className="flex h-[calc(100vh-6rem)] flex-col sm:h-[calc(100vh-7rem)]">
      <PageHeader title="Tarix" actions={<ExportMenu params={activeFilters} />} />

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
          onRowClick={(r) => setDetail(r)}
          emptyTitle="Tarix bo'sh"
          emptyDescription="Moliyaviy yozuvlar (kirim/chiqim) bu yerda ko'rinadi."
          transparent
          fill
        />
      </div>

      <HistoryDetailDialog open={!!detail} onClose={() => setDetail(null)} entry={detail} />
      <HistoryFilterDialog open={filterOpen} onClose={() => setFilterOpen(false)} value={filters} onApply={setFilters} />
    </div>
  );
}
