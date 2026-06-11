import { useMemo, useState } from 'react';
import { toast } from 'sonner';
import {
  BarChart, Bar, XAxis, YAxis, ResponsiveContainer, Tooltip, CartesianGrid, Cell,
} from 'recharts';
import { PageHeader } from '@/components/shared/PageHeader';
import { Card } from '@/components/ui/Card';
import { AntDate } from '@/components/ui/AntDate';
import { Input } from '@/components/ui/Input';
import { useTasksReport } from '@/features/reports/reportsApi';
import { useProjects } from '@/features/projects/projectsApi';
import { useUsersList } from '@/features/users/usersApi';
import { ReportExportActions, ReportToolbar } from '@/features/reports/ReportShell';
import { FilterField, FilterSelect } from '@/features/reports/ReportFilters';
import { ReportTable } from '@/features/reports/ReportTable';
import { TASK_STATUS, TASK_TYPE } from '@/lib/constants';

const STATUS_LABELS = {
  todo: 'Qilish kerak',
  in_progress: 'Jarayonda',
  overdue: "Muddati o'tgan",
  done: 'Bajarilgan',
  checked: 'Tekshirilgan',
  production: 'Ishga tushirilgan',
  rejected: 'Rad etilgan',
};
const STATUS_COLORS = {
  todo: '#F59E0B', in_progress: '#3B82F6', overdue: '#6B7280',
  done: '#8B5CF6', checked: '#06B6D4', production: '#22C55E', rejected: '#EF4444',
};
const TYPE_OPTIONS = Object.entries(TASK_TYPE).map(([value, label]) => ({ value, label }));
const STATUS_OPTIONS = Object.keys(STATUS_LABELS).map((value) => ({ value, label: STATUS_LABELS[value] }));

const EMPTY = { search: '', from: '', to: '', projectId: '', assigneeId: '', status: '', type: '', sprint: '' };

function buildParams(f) {
  const p = {};
  if (f.from) p.from = f.from;
  if (f.to) p.to = f.to;
  if (f.projectId) p.projectId = f.projectId;
  if (f.assigneeId) p.assigneeId = f.assigneeId;
  if (f.status) p.status = f.status;
  if (f.type) p.type = f.type;
  if (f.sprint) p.sprint = f.sprint;
  return p;
}

export function TasksReportPage() {
  const [filters, setFilters] = useState(EMPTY);
  const [filtersOpen, setFiltersOpen] = useState(true);
  const [applied, setApplied] = useState({});
  const [generated, setGenerated] = useState(false);

  const { data, isFetching } = useTasksReport(applied, generated);
  const { data: projects } = useProjects({ limit: 200 });
  const { data: users } = useUsersList({ limit: 200 });
  const set = (k, v) => setFilters((s) => ({ ...s, [k]: v }));
  const hasFilters = useMemo(() => JSON.stringify(buildParams(filters)) !== '{}' || !!filters.search, [filters]);

  const projectOptions = (projects?.items || []).map((p) => ({ value: p.id, label: p.name }));
  const userOptions = (users?.items || []).map((u) => ({ value: u.id, label: u.fullName }));

  const generate = () => { setApplied(buildParams(filters)); setGenerated(true); setFiltersOpen(false); toast.success("Ma'lumotlar shakllantirildi"); };
  const clear = () => { setFilters(EMPTY); setApplied({}); setGenerated(false); setFiltersOpen(true); };

  const rows = useMemo(() => {
    if (!generated) return [];
    const all = data?.byAssignee || [];
    if (!filters.search) return all;
    const q = filters.search.toLowerCase();
    return all.filter((r) => r.fullName?.toLowerCase().includes(q));
  }, [generated, data, filters.search]);

  const byStatus = generated ? (data?.byStatus || {}) : {};
  const totals = generated ? data?.totals : null;

  const statusChart = useMemo(
    () => Object.keys(STATUS_LABELS).map((k) => ({ key: k, label: STATUS_LABELS[k], count: byStatus[k] || 0 })),
    [byStatus],
  );
  const sprintChart = useMemo(
    () => (generated ? (data?.bySprint || []) : []).map((s) => ({ label: s.sprint ? `Sprint ${s.sprint}` : '—', count: s.total })),
    [generated, data],
  );

  const columns = [
    { key: 'fullName', header: 'Xodim' },
    { key: 'total', header: 'Jami', align: 'center' },
    { key: 'todo', header: STATUS_LABELS.todo, align: 'center' },
    { key: 'in_progress', header: STATUS_LABELS.in_progress, align: 'center' },
    { key: 'overdue', header: STATUS_LABELS.overdue, align: 'center' },
    { key: 'done', header: STATUS_LABELS.done, align: 'center' },
    { key: 'checked', header: STATUS_LABELS.checked, align: 'center' },
    { key: 'production', header: STATUS_LABELS.production, align: 'center' },
    { key: 'rejected', header: STATUS_LABELS.rejected, align: 'center' },
  ];

  return (
    <div className="flex min-h-[calc(100vh-7rem)] flex-col">
      <div className="shrink-0">
        <PageHeader
          title="Vazifalar bo'yicha hisobot"
          subtitle="Status, tur va sprint kesimida taqsimot"
          actions={<ReportExportActions type="tasks" params={applied} />}
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
              <FilterField label="Loyiha">
                <FilterSelect value={filters.projectId} onChange={(v) => set('projectId', v)} options={projectOptions} placeholder="Barcha loyihalar" />
              </FilterField>
              <FilterField label="Xodim">
                <FilterSelect value={filters.assigneeId} onChange={(v) => set('assigneeId', v)} options={userOptions} placeholder="Barcha xodimlar" />
              </FilterField>
              <FilterField label="Status">
                <FilterSelect value={filters.status} onChange={(v) => set('status', v)} options={STATUS_OPTIONS} placeholder="Barcha statuslar" />
              </FilterField>
              <FilterField label="Turi">
                <FilterSelect value={filters.type} onChange={(v) => set('type', v)} options={TYPE_OPTIONS} placeholder="Barcha turlar" />
              </FilterField>
              <FilterField label="Sprint">
                <Input type="number" min="0" placeholder="Sprint №" value={filters.sprint} onChange={(e) => set('sprint', e.target.value)} />
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
          <div className="mt-3 grid grid-cols-2 gap-3 sm:grid-cols-4 lg:grid-cols-5">
            <Card className="p-3"><p className="text-xs text-text-sub">Jami vazifalar</p><p className="mt-1 text-lg font-semibold text-text-strong tabular-nums">{totals.count}</p></Card>
            {Object.entries(STATUS_LABELS).map(([key, label]) => (
              <Card key={key} className="p-3">
                <p className="text-xs text-text-sub">{label}</p>
                <p className="mt-1 text-lg font-semibold text-text-strong tabular-nums">{byStatus[key] ?? 0}</p>
              </Card>
            ))}
          </div>
        )}

        {generated && totals?.count > 0 && (
          <div className="mt-3 grid grid-cols-1 gap-3 lg:grid-cols-2">
            <Card className="p-4">
              <p className="mb-2 text-sm font-medium text-text-strong">Status bo'yicha taqsimot</p>
              <ResponsiveContainer width="100%" height={240}>
                <BarChart data={statusChart} margin={{ top: 8, right: 8, bottom: 0, left: -16 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="var(--stroke-soft)" vertical={false} />
                  <XAxis dataKey="label" tick={{ fontSize: 11, fill: 'var(--text-soft)' }} interval={0} angle={-20} textAnchor="end" height={50} />
                  <YAxis allowDecimals={false} tick={{ fontSize: 11, fill: 'var(--text-soft)' }} />
                  <Tooltip cursor={{ fill: 'var(--bg-1-alt)' }} />
                  <Bar dataKey="count" radius={[6, 6, 0, 0]} maxBarSize={48}>
                    {statusChart.map((e) => <Cell key={e.key} fill={STATUS_COLORS[e.key]} />)}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </Card>
            <Card className="p-4">
              <p className="mb-2 text-sm font-medium text-text-strong">Sprint bo'yicha taqsimot</p>
              <ResponsiveContainer width="100%" height={240}>
                <BarChart data={sprintChart} margin={{ top: 8, right: 8, bottom: 0, left: -16 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="var(--stroke-soft)" vertical={false} />
                  <XAxis dataKey="label" tick={{ fontSize: 11, fill: 'var(--text-soft)' }} />
                  <YAxis allowDecimals={false} tick={{ fontSize: 11, fill: 'var(--text-soft)' }} />
                  <Tooltip cursor={{ fill: 'var(--bg-1-alt)' }} />
                  <Bar dataKey="count" radius={[6, 6, 0, 0]} maxBarSize={48} fill="var(--accent-strong)" />
                </BarChart>
              </ResponsiveContainer>
            </Card>
          </div>
        )}
      </div>

      <div className="mt-4 min-h-0 flex-1">
        <ReportTable columns={columns} rows={rows} loading={isFetching} emptyTitle={generated ? 'Vazifalar topilmadi' : 'Hisobot shakllantirilmagan'} emptyDescription={generated ? "Filtrlarni o'zgartiring yoki tozalang." : "Filtrlarni tanlab \"Shakllantirish\" tugmasini bosing."} />
      </div>
    </div>
  );
}
