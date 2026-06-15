import { useMemo, useState } from 'react';
import { toast } from 'sonner';
import { PageHeader } from '@/components/shared/PageHeader';
import { Card } from '@/components/ui/Card';
import { formatMoney, formatDate } from '@/lib/utils/format';
import { useReference } from '@/features/settings/settingsApi';
import { useProjects } from '@/features/projects/projectsApi';
import { useUsersList } from '@/features/users/usersApi';
import { useTasksDetailReport } from '@/features/reports/reportsApi';
import { ReportExportActions, ReportToolbar } from '@/features/reports/ReportShell';
import { FilterField, FilterSelect, FilterMultiSelect, MoneyRange, NumberRange, UserPickerField, DateRange } from '@/features/reports/ReportFilters';
import { ReportTable } from '@/features/reports/ReportTable';

const money = (v) => formatMoney(Math.round((v || 0) * 100)); // unit -> tiyin

// Darajasi (bitta)
const PRIORITY = [
  { value: 'low', label: 'Past', dot: '#6B7280' },
  { value: 'medium', label: "O'rta", dot: '#3B82F6' },
  { value: 'high', label: 'Yuqori', dot: '#F59E0B' },
  { value: 'critical', label: 'Kritik', dot: '#EF4444' },
];
// Holati (bitta)
const STATUS = [
  { value: 'todo', label: 'Qilish kerak', dot: '#F59E0B' },
  { value: 'in_progress', label: 'Jarayonda', dot: '#3B82F6' },
  { value: 'done', label: 'Bajarilgan', dot: '#8B5CF6' },
  { value: 'production', label: 'Ishga tushurilgan', dot: '#22C55E' },
  { value: 'checked', label: 'Tekshirilgan', dot: '#06B6D4' },
  { value: 'rejected', label: 'Rad etilgan', dot: '#EF4444' },
  { value: 'overdue', label: "Muddati o'tgan", dot: '#6B7280' },
];
// Turi (ko'p)
const TYPE = [
  { value: 'bug', label: 'Xatolik' },
  { value: 'extra', label: "Qo'shimcha" },
  { value: 'research', label: 'Tadqiqot' },
  { value: 'feature', label: 'Yangi funksiya' },
];
// Sprint (ko'p) — 1..10
const SPRINTS = Array.from({ length: 10 }, (_, i) => ({ value: i + 1, label: `${i + 1}-sprint` }));

const labelOf = (opts, v) => opts.find((o) => o.value === v)?.label || v || '—';

const EMPTY = {
  search: '', from: '', to: '',
  projectIds: [], assigneeIds: [], authorIds: [],
  priority: '', status: '', types: [], sprints: [], positionIds: [],
  priceFrom: '', priceTo: '', penaltyFrom: '', penaltyTo: '', reopenFrom: '', reopenTo: '',
};

function buildParams(f) {
  const p = {};
  const add = (k) => { if (f[k] !== '' && f[k] != null) p[k] = f[k]; };
  ['from', 'to', 'priority', 'status', 'priceFrom', 'priceTo', 'penaltyFrom', 'penaltyTo', 'reopenFrom', 'reopenTo'].forEach(add);
  if (f.projectIds?.length) p.projectIds = f.projectIds.join(',');
  if (f.assigneeIds?.length) p.assigneeIds = f.assigneeIds.join(',');
  if (f.authorIds?.length) p.authorIds = f.authorIds.join(',');
  if (f.positionIds?.length) p.positionIds = f.positionIds.join(',');
  if (f.types?.length) p.types = f.types.join(',');
  if (f.sprints?.length) p.sprints = f.sprints.join(',');
  return p;
}

export function TasksReportPage() {
  const [filters, setFilters] = useState(EMPTY);
  const [filtersOpen, setFiltersOpen] = useState(true);
  const [applied, setApplied] = useState({});
  const [generated, setGenerated] = useState(false);

  const { data, isFetching } = useTasksDetailReport(applied, generated);
  const { data: projects } = useProjects({ limit: 500 });
  const { data: usersData } = useUsersList({ limit: 500 });
  const { data: positions } = useReference('position');

  const projectUsers = useMemo(() => (projects?.items || []).map((p) => ({ id: p.id, fullName: p.name, position: { name: p.uid || p.code || '' } })), [projects]);
  const users = usersData?.items || [];
  const positionOpts = useMemo(() => (positions || []).map((p) => ({ value: p.id, label: p.name })), [positions]);

  const set = (k, v) => setFilters((s) => ({ ...s, [k]: v }));
  const hasFilters = useMemo(() => JSON.stringify(buildParams(filters)) !== '{}' || !!filters.search, [filters]);

  const generate = () => { setApplied(buildParams(filters)); setGenerated(true); setFiltersOpen(false); toast.success("Ma'lumotlar shakllantirildi"); };
  const clear = () => { setFilters(EMPTY); setApplied({}); setGenerated(false); setFiltersOpen(true); };

  const rows = useMemo(() => {
    if (!generated) return [];
    const all = data?.rows || [];
    if (!filters.search) return all;
    const q = filters.search.toLowerCase();
    return all.filter((r) =>
      r.title?.toLowerCase().includes(q) || r.uid?.toLowerCase().includes(q) ||
      r.projectName?.toLowerCase().includes(q) || r.assignee?.toLowerCase().includes(q) || r.author?.toLowerCase().includes(q),
    );
  }, [generated, data, filters.search]);

  const columns = [
    { key: 'uid', header: 'Titul' },
    { key: 'projectName', header: 'Loyiha nomi' },
    { key: 'title', header: 'Vazifa nomi' },
    { key: 'assignee', header: 'Topshiruvchi' },
    { key: 'author', header: 'Muallif' },
    { key: 'priority', header: 'Darajasi', align: 'center', render: (r) => labelOf(PRIORITY, r.priority) },
    { key: 'status', header: 'Holati', align: 'center', render: (r) => labelOf(STATUS, r.status) },
    { key: 'type', header: 'Turi', align: 'center', render: (r) => labelOf(TYPE, r.type) },
    { key: 'price', header: 'Vazifa narxi (UZS)', align: 'right', mono: true, render: (r) => money(r.price) },
    { key: 'penaltyPercent', header: 'Jarima foizi (%)', align: 'center', render: (r) => `${r.penaltyPercent ?? 0}%` },
    { key: 'deadline', header: 'Muddati', align: 'center', render: (r) => formatDate(r.deadline, true) },
    { key: 'createdAt', header: 'Yaratilgan vaqti', align: 'center', render: (r) => formatDate(r.createdAt, true) },
    { key: 'sprint', header: 'Sprint raqami', align: 'center', render: (r) => (r.sprint ? `${r.sprint}-sprint` : '—') },
    { key: 'position', header: 'Kim uchun', align: 'center' },
    { key: 'reopenedCount', header: 'Qaytishlar soni', align: 'center' },
    { key: 'rejectReason', header: 'Bekor qilish sababi' },
  ];

  return (
    <div className="flex h-[calc(100vh-7rem)] flex-col">
      <div className="shrink-0">
        <PageHeader
          title="Vazifalar bo'yicha hisobot"
          subtitle="Har bir vazifa kesimida to'liq ma'lumot"
          actions={<ReportExportActions type="tasks-detail" params={applied} />}
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
              <FilterField label="Yaratilgan vaqti">
                <DateRange from={filters.from} to={filters.to} onFrom={(v) => set('from', v)} onTo={(v) => set('to', v)} />
              </FilterField>
              <FilterField label="Loyihalar">
                <UserPickerField value={filters.projectIds} onChange={(v) => set('projectIds', v)} users={projectUsers} placeholder="Loyiha tanlang" title="Loyiha tanlang" />
              </FilterField>
              <FilterField label="Topshiruvchi">
                <UserPickerField value={filters.assigneeIds} onChange={(v) => set('assigneeIds', v)} users={users} placeholder="Topshiruvchi tanlang" title="Topshiruvchi tanlang" />
              </FilterField>

              <FilterField label="Mualliflar">
                <UserPickerField value={filters.authorIds} onChange={(v) => set('authorIds', v)} users={users} placeholder="Mualliflar tanlang" title="Muallif tanlang" />
              </FilterField>
              <FilterField label="Darajasi">
                <FilterSelect value={filters.priority} onChange={(v) => set('priority', v)} options={PRIORITY} placeholder="Darajasini tanlang" />
              </FilterField>
              <FilterField label="Holati">
                <FilterSelect value={filters.status} onChange={(v) => set('status', v)} options={STATUS} placeholder="Holatini tanlang" />
              </FilterField>
              <FilterField label="Turi">
                <FilterMultiSelect value={filters.types} onChange={(v) => set('types', v)} options={TYPE} placeholder="Turini tanlang" />
              </FilterField>

              <FilterField label="Sprint">
                <FilterMultiSelect value={filters.sprints} onChange={(v) => set('sprints', v)} options={SPRINTS} placeholder="Sprint tanlang" />
              </FilterField>
              <FilterField label="Kim uchun">
                <FilterMultiSelect value={filters.positionIds} onChange={(v) => set('positionIds', v)} options={positionOpts} placeholder="Kim uchun tanlang" />
              </FilterField>
              <FilterField label="Vazifasi narxi (UZS)">
                <MoneyRange from={filters.priceFrom} to={filters.priceTo} onFrom={(v) => set('priceFrom', v)} onTo={(v) => set('priceTo', v)} />
              </FilterField>
              <FilterField label="Jarima foizi (%)">
                <NumberRange from={filters.penaltyFrom} to={filters.penaltyTo} onFrom={(v) => set('penaltyFrom', v)} onTo={(v) => set('penaltyTo', v)} />
              </FilterField>

              <FilterField label="Qaytishlar soni">
                <NumberRange from={filters.reopenFrom} to={filters.reopenTo} onFrom={(v) => set('reopenFrom', v)} onTo={(v) => set('reopenTo', v)} />
              </FilterField>
            </div>
          </Card>
        )}
      </div>

      <div className="mt-4 min-h-0 flex-1">
        <ReportTable columns={columns} rows={rows} loading={isFetching} emptyTitle={generated ? 'Vazifalar topilmadi' : 'Hisobot shakllantirilmagan'} emptyDescription={generated ? "Filtrlarni o'zgartiring yoki tozalang." : "Filtrlarni tanlab \"Shakllantirish\" tugmasini bosing."} />
      </div>
    </div>
  );
}
