import { useMemo, useState } from 'react';
import { toast } from 'sonner';
import { PageHeader } from '@/components/shared/PageHeader';
import { Card } from '@/components/ui/Card';
import { AntDate } from '@/components/ui/AntDate';
import { formatMoney, formatDate } from '@/lib/utils/format';
import { useReference } from '@/features/settings/settingsApi';
import { useExpensesReport } from '@/features/reports/reportsApi';
import { ReportExportActions, ReportToolbar } from '@/features/reports/ReportShell';
import { FilterField, FilterSelect } from '@/features/reports/ReportFilters';
import { ReportTable } from '@/features/reports/ReportTable';

const money = (v) => formatMoney(Math.round((v || 0) * 100)); // unit -> tiyin

const EMPTY = { search: '', from: '', to: '', categoryId: '' };

function buildParams(f) {
  const p = {};
  if (f.from) p.from = f.from;
  if (f.to) p.to = f.to;
  if (f.categoryId) p.categoryId = f.categoryId;
  return p;
}

export function ExpensesReportPage() {
  const [filters, setFilters] = useState(EMPTY);
  const [filtersOpen, setFiltersOpen] = useState(true);
  const [applied, setApplied] = useState({});
  const [generated, setGenerated] = useState(false);

  const { data: categories } = useReference('expenseCategory');
  const { data, isFetching } = useExpensesReport(applied, generated);

  const set = (k, v) => setFilters((s) => ({ ...s, [k]: v }));
  const hasFilters = useMemo(() => JSON.stringify(buildParams(filters)) !== '{}' || !!filters.search, [filters]);

  const generate = () => { setApplied(buildParams(filters)); setGenerated(true); setFiltersOpen(false); toast.success("Ma'lumotlar shakllantirildi"); };
  const clear = () => { setFilters(EMPTY); setApplied({}); setGenerated(false); setFiltersOpen(true); };

  const categoryOpts = (categories || []).map((c) => ({ value: c.id, label: c.name }));

  const rows = useMemo(() => {
    if (!generated) return [];
    const all = data?.rows || [];
    if (!filters.search) return all;
    const q = filters.search.toLowerCase();
    return all.filter((r) => r.note?.toLowerCase().includes(q) || r.category?.toLowerCase().includes(q));
  }, [generated, data, filters.search]);

  const totals = generated ? data?.totals : null;
  const byCategory = generated ? (data?.byCategory || []) : [];

  const columns = [
    { key: 'date', header: 'Sana', render: (r) => formatDate(r.date) },
    { key: 'category', header: 'Kategoriya' },
    { key: 'amount', header: 'Summa', align: 'right', mono: true, render: (r) => money(r.amount) + (r.currency === 'USD' ? ' (USD)' : '') },
    { key: 'amountUzs', header: 'UZS ekvivalent', align: 'right', mono: true, render: (r) => money(r.amountUzs) },
    { key: 'note', header: 'Izoh' },
  ];

  return (
    <div className="flex h-[calc(100vh-7rem)] flex-col">
      <div className="shrink-0">
        <PageHeader
          title="Xarajatlar bo'yicha hisobot"
          subtitle="Sana va kategoriya kesimida xarajatlar"
          actions={<ReportExportActions type="expenses" params={applied} />}
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
              <FilterField label="Sana" className="sm:col-span-2">
                <div className="flex gap-2">
                  <AntDate value={filters.from} onChange={(v) => set('from', v)} placeholder="dan" />
                  <AntDate value={filters.to} onChange={(v) => set('to', v)} placeholder="gacha" />
                </div>
              </FilterField>
              <FilterField label="Kategoriya">
                <FilterSelect value={filters.categoryId} onChange={(v) => set('categoryId', v)} options={categoryOpts} placeholder="Kategoriya tanlang" />
              </FilterField>
            </div>
          </Card>
        )}

        {totals && (
          <div className="mt-3 grid grid-cols-1 gap-3 sm:grid-cols-2">
            <Card className="p-4"><p className="text-sm text-text-sub">Xarajatlar soni</p><p className="mt-1 text-lg font-semibold text-text-strong tabular-nums">{totals.count}</p></Card>
            <Card className="p-4"><p className="text-sm text-text-sub">Jami (UZS)</p><p className="mt-1 text-lg font-semibold text-error-strong tabular-nums">{money(totals.total)}</p></Card>
          </div>
        )}
        {byCategory.length > 0 && (
          <Card className="mt-3 p-4">
            <p className="mb-2 text-sm font-medium text-text-sub">Kategoriya kesimi</p>
            <div className="flex flex-wrap gap-2">
              {byCategory.map((c) => (
                <span key={c.category} className="inline-flex items-center gap-2 rounded-md border border-stroke-sub bg-bg-1 px-3 py-1.5 text-sm">
                  <span className="text-text-sub">{c.category}:</span>
                  <span className="font-medium tabular-nums text-text-strong">{money(c.total)}</span>
                </span>
              ))}
            </div>
          </Card>
        )}
      </div>

      <div className="mt-4 min-h-0 flex-1">
        <ReportTable columns={columns} rows={rows} loading={isFetching} emptyTitle={generated ? 'Xarajatlar topilmadi' : 'Hisobot shakllantirilmagan'} emptyDescription={generated ? "Filtrlarni o'zgartiring yoki tozalang." : "Filtrlarni tanlab \"Shakllantirish\" tugmasini bosing."} />
      </div>
    </div>
  );
}
