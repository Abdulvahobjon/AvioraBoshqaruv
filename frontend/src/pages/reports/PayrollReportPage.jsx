import { useMemo, useState } from 'react';
import { toast } from 'sonner';
import { PageHeader } from '@/components/shared/PageHeader';
import { Card } from '@/components/ui/Card';
import { Input } from '@/components/ui/Input';
import { formatMoney } from '@/lib/utils/format';
import { usePayrollReport } from '@/features/reports/reportsApi';
import { ReportExportActions, ReportToolbar } from '@/features/reports/ReportShell';
import { FilterField, FilterSelect } from '@/features/reports/ReportFilters';
import { ReportTable } from '@/features/reports/ReportTable';

const money = (v) => formatMoney(Math.round((v || 0) * 100)); // unit -> tiyin

const STATUS = [
  { value: 'draft', label: 'Hisoblangan' },
  { value: 'ready', label: 'To\'lovga tayyor' },
  { value: 'paid', label: 'To\'langan' },
  { value: 'closed', label: 'Tasdiqlangan' },
];
const statusLabel = (s) => STATUS.find((x) => x.value === s)?.label || s;

const EMPTY = { search: '', month: '', status: '' };

function buildParams(f) {
  const p = {};
  if (f.month) p.month = f.month;
  if (f.status) p.status = f.status;
  return p;
}

export function PayrollReportPage() {
  const [filters, setFilters] = useState(EMPTY);
  const [filtersOpen, setFiltersOpen] = useState(true);
  const [applied, setApplied] = useState({});
  const [generated, setGenerated] = useState(false);

  const { data, isFetching } = usePayrollReport(applied, generated);
  const set = (k, v) => setFilters((s) => ({ ...s, [k]: v }));
  const hasFilters = useMemo(() => JSON.stringify(buildParams(filters)) !== '{}' || !!filters.search, [filters]);

  const generate = () => { setApplied(buildParams(filters)); setGenerated(true); setFiltersOpen(false); toast.success("Ma'lumotlar shakllantirildi"); };
  const clear = () => { setFilters(EMPTY); setApplied({}); setGenerated(false); setFiltersOpen(true); };

  const rows = useMemo(() => {
    if (!generated) return [];
    const all = data?.rows || [];
    if (!filters.search) return all;
    const q = filters.search.toLowerCase();
    return all.filter((r) => r.fullName?.toLowerCase().includes(q) || r.position?.toLowerCase().includes(q));
  }, [generated, data, filters.search]);

  const totals = generated ? data?.totals : null;

  const columns = [
    { key: 'fullName', header: 'F.I.O' },
    { key: 'position', header: 'Lavozim' },
    { key: 'month', header: 'Oy', align: 'center' },
    { key: 'fixedAmount', header: 'Oylik (UZS)', align: 'right', mono: true, render: (r) => money(r.fixedAmount) },
    { key: 'projectShareTotal', header: 'Ulushlar (UZS)', align: 'right', mono: true, render: (r) => money(r.projectShareTotal) },
    { key: 'total', header: 'Jami (UZS)', align: 'right', mono: true, render: (r) => money(r.total) },
    { key: 'status', header: 'Holat', align: 'center', render: (r) => statusLabel(r.status) },
  ];

  return (
    <div className="flex h-[calc(100vh-7rem)] flex-col">
      <div className="shrink-0">
        <PageHeader
          title="Ish haqi bo'yicha hisobot"
          subtitle="Xodimlar kesimida oylik, ulushlar va to'lov holati"
          actions={<ReportExportActions type="payroll" params={applied} />}
        />
        <ReportToolbar
          search={filters.search}
          onSearch={(v) => set('search', v)}
          filtersOpen={filtersOpen}
          onToggleFilters={() => setFiltersOpen((o) => !o)}
          onClear={clear}
          hasFilters={hasFilters}
          onGenerate={generate}
          generating={isFetching}
        />
        {filtersOpen && (
          <Card className="mt-3 p-4">
            <div className="grid grid-cols-1 gap-x-4 gap-y-3 sm:grid-cols-2 lg:grid-cols-4">
              <FilterField label="Oy (YYYY-MM)">
                <Input type="month" value={filters.month} onChange={(e) => set('month', e.target.value)} />
              </FilterField>
              <FilterField label="Holati">
                <FilterSelect value={filters.status} onChange={(v) => set('status', v)} options={STATUS} placeholder="Holat tanlang" />
              </FilterField>
            </div>
          </Card>
        )}

        {totals && (
          <div className="mt-3 grid grid-cols-2 gap-3 sm:grid-cols-4">
            <Card className="p-4"><p className="text-sm text-text-sub">Yozuvlar</p><p className="mt-1 text-lg font-semibold text-text-strong tabular-nums">{totals.count}</p></Card>
            <Card className="p-4"><p className="text-sm text-text-sub">Jami oylik</p><p className="mt-1 text-lg font-semibold text-text-strong tabular-nums">{money(totals.fixedAmount)}</p></Card>
            <Card className="p-4"><p className="text-sm text-text-sub">Jami ulushlar</p><p className="mt-1 text-lg font-semibold text-text-strong tabular-nums">{money(totals.projectShareTotal)}</p></Card>
            <Card className="p-4"><p className="text-sm text-text-sub">To'langan oylik</p><p className="mt-1 text-lg font-semibold text-success-strong tabular-nums">{money(totals.paid)}</p></Card>
          </div>
        )}
      </div>

      <div className="mt-4 min-h-0 flex-1">
        <ReportTable columns={columns} rows={rows} loading={isFetching} emptyTitle={generated ? 'Oyliklar topilmadi' : 'Hisobot shakllantirilmagan'} emptyDescription={generated ? "Filtrlarni o'zgartiring yoki tozalang." : "Filtrlarni tanlab \"Shakllantirish\" tugmasini bosing."} />
      </div>
    </div>
  );
}
