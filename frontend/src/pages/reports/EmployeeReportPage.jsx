import { useMemo, useState } from 'react';
import { toast } from 'sonner';
import { PageHeader } from '@/components/shared/PageHeader';
import { Card } from '@/components/ui/Card';
import { AntDate } from '@/components/ui/AntDate';
import { formatMoney } from '@/lib/utils/format';
import { UZ_REGIONS } from '@/lib/uzRegions';
import { useReference } from '@/features/settings/settingsApi';
import { useUsersList } from '@/features/users/usersApi';
import { useEmployeeReport } from '@/features/reports/reportsApi';
import { ReportExportActions, ReportToolbar } from '@/features/reports/ReportShell';
import { FilterField, FilterSelect, NumberRange, UserPickerField } from '@/features/reports/ReportFilters';
import { ReportTable } from '@/features/reports/ReportTable';

const money = (v) => formatMoney(Math.round((v || 0) * 100)); // unit -> tiyin

const EMPTY = {
  search: '', joinedFrom: '', joinedTo: '', positionId: '', region: '',
  salaryFrom: '', salaryTo: '', balanceFrom: '', balanceTo: '',
  projectsFrom: '', projectsTo: '', tasksFrom: '', tasksTo: '',
  meetingsFrom: '', meetingsTo: '', requestsFrom: '', requestsTo: '',
  userIds: [],
};

const RANGE_KEYS = ['salaryFrom', 'salaryTo', 'balanceFrom', 'balanceTo', 'projectsFrom', 'projectsTo', 'tasksFrom', 'tasksTo', 'meetingsFrom', 'meetingsTo', 'requestsFrom', 'requestsTo'];

function buildParams(f) {
  const p = {};
  if (f.search) p.search = f.search;
  if (f.joinedFrom) p.joinedFrom = f.joinedFrom;
  if (f.joinedTo) p.joinedTo = f.joinedTo;
  if (f.positionId) p.positionId = f.positionId;
  if (f.region) p.region = f.region;
  RANGE_KEYS.forEach((k) => { if (f[k] !== '' && f[k] != null) p[k] = f[k]; });
  if (f.userIds?.length) p.userIds = f.userIds.join(',');
  return p;
}

export function EmployeeReportPage() {
  const [filters, setFilters] = useState(EMPTY);
  const [filtersOpen, setFiltersOpen] = useState(true);
  const [applied, setApplied] = useState({}); // mount'da bo'sh -> hamma xodimlar

  const { data: positions } = useReference('position');
  const { data: usersData } = useUsersList();
  const users = usersData?.items || [];

  const { data, isFetching } = useEmployeeReport(applied, true);

  const set = (k, v) => setFilters((s) => ({ ...s, [k]: v }));
  const hasFilters = useMemo(() => JSON.stringify(buildParams(filters)) !== '{}', [filters]);

  const generate = () => {
    setApplied(buildParams(filters));
    toast.success("Ma'lumotlar shakllantirildi");
  };
  const clear = () => { setFilters(EMPTY); setApplied({}); };

  const positionOpts = (positions || []).map((p) => ({ value: p.id, label: p.name }));
  const regionOpts = UZ_REGIONS.map((r) => ({ value: r.name, label: r.name }));

  const columns = [
    { key: 'fullName', header: 'Ism Sharifi' },
    { key: 'position', header: 'Lavozim' },
    { key: 'region', header: 'Viloyat' },
    { key: 'district', header: 'Tuman' },
    { key: 'phone', header: 'Telefon' },
    { key: 'fixedSalary', header: 'Oylik maoshi (UZS)', align: 'right', mono: true, render: (r) => money(r.fixedSalary) },
    { key: 'balance', header: 'Balans (UZS)', align: 'right', mono: true, render: (r) => money(r.balance) },
    { key: 'projectsCount', header: 'Loyihalar', align: 'center' },
    {
      group: 'Vazifalar',
      children: [
        { key: 'tasksTotal', header: 'Jami', align: 'center' },
        { key: 't_todo', header: 'Qilish kerak', align: 'center', render: (r) => r.tasks.todo },
        { key: 't_in_progress', header: 'Jarayonda', align: 'center', render: (r) => r.tasks.in_progress },
        { key: 't_overdue', header: "Muddati o'tgan", align: 'center', render: (r) => r.tasks.overdue },
        { key: 't_done', header: 'Bajarilgan', align: 'center', render: (r) => r.tasks.done },
        { key: 't_production', header: 'Ishga tushirilgan', align: 'center', render: (r) => r.tasks.production },
        { key: 't_checked', header: 'Tekshirilgan', align: 'center', render: (r) => r.tasks.checked },
        { key: 't_rejected', header: 'Rad etilgan', align: 'center', render: (r) => r.tasks.rejected },
      ],
    },
    {
      group: "Yig'ilishlar",
      children: [
        { key: 'meetingsTotal', header: 'Jami', align: 'center' },
        { key: 'meetingsAttended', header: 'Qatnashgan', align: 'center' },
        { key: 'meetingsExcused', header: 'Qatnashmagan (sababli)', align: 'center' },
        { key: 'meetingsUnexcused', header: 'Qatnashmagan (sababsiz)', align: 'center' },
      ],
    },
    {
      group: "Xarajat so'rovi",
      children: [
        { key: 'requestsCount', header: 'Soni', align: 'center' },
        { key: 'requestsTotal', header: 'Summasi (UZS)', align: 'right', mono: true, render: (r) => money(r.requestsTotal) },
      ],
    },
    { key: 'payrollTotal', header: 'Ish haqi (UZS)', align: 'right', mono: true, render: (r) => money(r.payrollTotal) },
  ];

  return (
    <div className="flex h-[calc(100vh-7rem)] flex-col">
      <div className="shrink-0">
        <PageHeader
          title="Xodim bo'yicha hisobot"
          subtitle="Xodimlar kesimida vazifa, yig'ilish, moliya ko'rsatkichlari"
          actions={<ReportExportActions type="employee-report" params={buildParams(filters)} />}
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
              <FilterField label="Ishga kirgan vaqti" className="sm:col-span-2">
                <div className="flex gap-2">
                  <AntDate value={filters.joinedFrom} onChange={(v) => set('joinedFrom', v)} placeholder="dan" />
                  <AntDate value={filters.joinedTo} onChange={(v) => set('joinedTo', v)} placeholder="gacha" />
                </div>
              </FilterField>
              <FilterField label="Lavozimi">
                <FilterSelect value={filters.positionId} onChange={(v) => set('positionId', v)} options={positionOpts} placeholder="Lavozim tanlang" />
              </FilterField>
              <FilterField label="Viloyat">
                <FilterSelect value={filters.region} onChange={(v) => set('region', v)} options={regionOpts} placeholder="Viloyat tanlang" />
              </FilterField>

              <FilterField label="Oylik maoshi (UZS)">
                <NumberRange from={filters.salaryFrom} to={filters.salaryTo} onFrom={(v) => set('salaryFrom', v)} onTo={(v) => set('salaryTo', v)} />
              </FilterField>
              <FilterField label="Balansi (UZS)">
                <NumberRange from={filters.balanceFrom} to={filters.balanceTo} onFrom={(v) => set('balanceFrom', v)} onTo={(v) => set('balanceTo', v)} />
              </FilterField>
              <FilterField label="Loyihalar (soni)">
                <NumberRange from={filters.projectsFrom} to={filters.projectsTo} onFrom={(v) => set('projectsFrom', v)} onTo={(v) => set('projectsTo', v)} />
              </FilterField>
              <FilterField label="Vazifalar (soni)">
                <NumberRange from={filters.tasksFrom} to={filters.tasksTo} onFrom={(v) => set('tasksFrom', v)} onTo={(v) => set('tasksTo', v)} />
              </FilterField>

              <FilterField label="Yig'ilishlar (soni)">
                <NumberRange from={filters.meetingsFrom} to={filters.meetingsTo} onFrom={(v) => set('meetingsFrom', v)} onTo={(v) => set('meetingsTo', v)} />
              </FilterField>
              <FilterField label="Xarajat so'rovi (soni)">
                <NumberRange from={filters.requestsFrom} to={filters.requestsTo} onFrom={(v) => set('requestsFrom', v)} onTo={(v) => set('requestsTo', v)} />
              </FilterField>
              <FilterField label="Xodimlar" className="sm:col-span-2">
                <UserPickerField value={filters.userIds} onChange={(v) => set('userIds', v)} users={users} placeholder="Xodim tanlang" title="Xodim tanlang" />
              </FilterField>
            </div>
          </Card>
        )}
      </div>

      <div className="mt-4 min-h-0 flex-1">
        <ReportTable
          columns={columns}
          rows={data?.rows}
          loading={isFetching}
          emptyTitle="Xodimlar topilmadi"
          emptyDescription="Filtrlarni o'zgartiring yoki tozalang."
        />
      </div>
    </div>
  );
}
