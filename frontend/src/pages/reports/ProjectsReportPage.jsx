import { useMemo, useState } from 'react';
import { toast } from 'sonner';
import {
  BarChart, Bar, LineChart, Line, XAxis, YAxis, ResponsiveContainer, Tooltip, CartesianGrid, Legend,
} from 'recharts';
import { PageHeader } from '@/components/shared/PageHeader';
import { Card } from '@/components/ui/Card';
import { AntDate } from '@/components/ui/AntDate';
import { formatMoney } from '@/lib/utils/format';
import { useProjectsReport, useProjectBudget } from '@/features/reports/reportsApi';
import { useProjects } from '@/features/projects/projectsApi';
import { ReportExportActions, ReportToolbar } from '@/features/reports/ReportShell';
import { FilterField, FilterSelect } from '@/features/reports/ReportFilters';
import { ReportTable } from '@/features/reports/ReportTable';

const money = (v) => formatMoney(Math.round((v || 0) * 100)); // unit -> tiyin

const STATUS = [
  { value: 'planning', label: 'Rejalashtirilgan' },
  { value: 'active', label: 'Faol' },
  { value: 'overdue', label: "Muddati o'tgan" },
  { value: 'completed', label: 'Tugatilgan' },
  { value: 'cancelled', label: 'Bekor qilingan' },
];
const statusLabel = (s) => STATUS.find((x) => x.value === s)?.label || s;

const EMPTY = { search: '', from: '', to: '', status: '', projectId: '' };

function buildParams(f) {
  const p = {};
  if (f.from) p.from = f.from;
  if (f.to) p.to = f.to;
  if (f.status) p.status = f.status;
  return p;
}

export function ProjectsReportPage() {
  const [filters, setFilters] = useState(EMPTY);
  const [filtersOpen, setFiltersOpen] = useState(true);
  const [applied, setApplied] = useState({});
  const [generated, setGenerated] = useState(false);

  const { data, isFetching } = useProjectsReport(applied, generated);
  const { data: projects } = useProjects({ limit: 200 });
  const { data: budget } = useProjectBudget(filters.projectId, generated && !!filters.projectId);
  const set = (k, v) => setFilters((s) => ({ ...s, [k]: v }));
  const hasFilters = useMemo(() => JSON.stringify(buildParams(filters)) !== '{}' || !!filters.search, [filters]);

  const projectOptions = (projects?.items || []).map((p) => ({ value: p.id, label: p.name }));

  const generate = () => { setApplied(buildParams(filters)); setGenerated(true); setFiltersOpen(false); toast.success("Ma'lumotlar shakllantirildi"); };
  const clear = () => { setFilters(EMPTY); setApplied({}); setGenerated(false); setFiltersOpen(true); };

  const rows = useMemo(() => {
    if (!generated) return [];
    let all = data?.rows || [];
    if (filters.projectId) all = all.filter((r) => String(r.id) === String(filters.projectId));
    if (!filters.search) return all;
    const q = filters.search.toLowerCase();
    return all.filter((r) => r.name?.toLowerCase().includes(q) || r.client?.toLowerCase().includes(q));
  }, [generated, data, filters.search, filters.projectId]);

  const totals = generated ? data?.totals : null;

  // Loyiha bo'yicha byudjet vs sarflangan (top 8)
  const budgetChart = useMemo(
    () => rows.slice(0, 8).map((r) => ({ name: r.name.length > 14 ? r.name.slice(0, 14) + '…' : r.name, Byudjet: r.price, Sarflangan: r.spent })),
    [rows],
  );

  const columns = [
    { key: 'name', header: 'Loyiha' },
    { key: 'client', header: 'Mijoz' },
    { key: 'status', header: 'Holat', align: 'center', render: (r) => statusLabel(r.status) },
    { key: 'price', header: 'Byudjet (UZS)', align: 'right', mono: true, render: (r) => money(r.price) },
    { key: 'shares', header: 'Ulushlar (UZS)', align: 'right', mono: true, render: (r) => money(r.shares) },
    { key: 'expenses', header: 'Xarajatlar (UZS)', align: 'right', mono: true, render: (r) => money(r.expenses) },
    { key: 'variance', header: 'Farq (UZS)', align: 'right', mono: true, render: (r) => <span className={r.variance < 0 ? 'text-error-strong' : 'text-success-strong'}>{money(r.variance)}</span> },
    { key: 'profit', header: 'Foyda (UZS)', align: 'right', mono: true, render: (r) => money(r.profit) },
  ];

  return (
    <div className="flex min-h-[calc(100vh-7rem)] flex-col">
      <div className="shrink-0">
        <PageHeader
          title="Loyiha bo'yicha hisobot"
          subtitle="Byudjet vs real xarajatlar (variance) va foyda"
          actions={<ReportExportActions type="projects" params={applied} />}
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
              <FilterField label="Loyiha (burn-down uchun)">
                <FilterSelect value={filters.projectId} onChange={(v) => set('projectId', v)} options={projectOptions} placeholder="Barcha loyihalar" />
              </FilterField>
              <FilterField label="Holati">
                <FilterSelect value={filters.status} onChange={(v) => set('status', v)} options={STATUS} placeholder="Holat tanlang" />
              </FilterField>
              <FilterField label="Sana (yaratilgan)" className="sm:col-span-2">
                <div className="flex gap-2">
                  <AntDate value={filters.from} onChange={(v) => set('from', v)} placeholder="dan" />
                  <AntDate value={filters.to} onChange={(v) => set('to', v)} placeholder="gacha" />
                </div>
              </FilterField>
            </div>
          </Card>
        )}

        {totals && (
          <div className="mt-3 grid grid-cols-2 gap-3 sm:grid-cols-5">
            <Card className="p-4"><p className="text-sm text-text-sub">Jami byudjet</p><p className="mt-1 text-lg font-semibold text-text-strong tabular-nums">{money(totals.price)}</p></Card>
            <Card className="p-4"><p className="text-sm text-text-sub">Ulushlar</p><p className="mt-1 text-lg font-semibold text-text-strong tabular-nums">{money(totals.shares)}</p></Card>
            <Card className="p-4"><p className="text-sm text-text-sub">Xarajatlar</p><p className="mt-1 text-lg font-semibold text-text-strong tabular-nums">{money(totals.expenses)}</p></Card>
            <Card className="p-4"><p className="text-sm text-text-sub">Jami sarflangan</p><p className="mt-1 text-lg font-semibold text-text-strong tabular-nums">{money(totals.spent)}</p></Card>
            <Card className="p-4"><p className="text-sm text-text-sub">Jami foyda</p><p className="mt-1 text-lg font-semibold text-success-strong tabular-nums">{money(totals.profit)}</p></Card>
          </div>
        )}

        {generated && (budgetChart.length > 0 || budget) && (
          <div className="mt-3 grid grid-cols-1 gap-3 lg:grid-cols-2">
            {budgetChart.length > 0 && (
              <Card className="p-4">
                <p className="mb-2 text-sm font-medium text-text-strong">Byudjet vs Sarflangan (loyihalar)</p>
                <ResponsiveContainer width="100%" height={260}>
                  <BarChart data={budgetChart} margin={{ top: 8, right: 8, bottom: 0, left: -8 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="var(--stroke-soft)" vertical={false} />
                    <XAxis dataKey="name" tick={{ fontSize: 10, fill: 'var(--text-soft)' }} interval={0} angle={-20} textAnchor="end" height={50} />
                    <YAxis tick={{ fontSize: 10, fill: 'var(--text-soft)' }} tickFormatter={(v) => Intl.NumberFormat('uz', { notation: 'compact' }).format(v)} />
                    <Tooltip cursor={{ fill: 'var(--bg-1-alt)' }} formatter={(v) => money(v)} />
                    <Legend />
                    <Bar dataKey="Byudjet" radius={[4, 4, 0, 0]} maxBarSize={28} fill="var(--accent-sub)" />
                    <Bar dataKey="Sarflangan" radius={[4, 4, 0, 0]} maxBarSize={28} fill="var(--accent-strong)" />
                  </BarChart>
                </ResponsiveContainer>
              </Card>
            )}
            {budget && (
              <Card className="p-4">
                <p className="mb-1 text-sm font-medium text-text-strong">Burn-down: {budget.name}</p>
                <p className="mb-2 text-xs text-text-sub">Byudjet: {money(budget.budget)} · Sarflangan: {money(budget.totalSpent)} · Qoldiq: <span className={budget.remaining < 0 ? 'text-error-strong' : 'text-success-strong'}>{money(budget.remaining)}</span></p>
                <ResponsiveContainer width="100%" height={230}>
                  <LineChart data={budget.series} margin={{ top: 8, right: 8, bottom: 0, left: -8 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="var(--stroke-soft)" vertical={false} />
                    <XAxis dataKey="date" tickFormatter={(d) => new Date(d).toLocaleDateString('uz-UZ', { month: 'short', day: 'numeric' })} tick={{ fontSize: 10, fill: 'var(--text-soft)' }} />
                    <YAxis tick={{ fontSize: 10, fill: 'var(--text-soft)' }} tickFormatter={(v) => Intl.NumberFormat('uz', { notation: 'compact' }).format(v)} />
                    <Tooltip formatter={(v) => money(v)} labelFormatter={(d) => new Date(d).toLocaleDateString('uz-UZ')} />
                    <Line type="monotone" dataKey="remaining" name="Qolgan byudjet" stroke="var(--accent-strong)" strokeWidth={2.5} dot={{ r: 3 }} />
                  </LineChart>
                </ResponsiveContainer>
                {!budget.series?.length && <p className="text-center text-sm text-text-soft">Bu loyihada xarajatlar yo'q</p>}
              </Card>
            )}
          </div>
        )}
      </div>

      <div className="mt-4 min-h-0 flex-1">
        <ReportTable columns={columns} rows={rows} loading={isFetching} emptyTitle={generated ? 'Loyihalar topilmadi' : 'Hisobot shakllantirilmagan'} emptyDescription={generated ? "Filtrlarni o'zgartiring yoki tozalang." : "Filtrlarni tanlab \"Shakllantirish\" tugmasini bosing."} />
      </div>
    </div>
  );
}
