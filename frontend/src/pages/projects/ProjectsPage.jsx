import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Plus, Search } from 'lucide-react';
import { PageHeader } from '@/components/shared/PageHeader';
import { DataTable } from '@/components/shared/DataTable';
import { Button } from '@/components/ui/Button';
import { Input, Select } from '@/components/ui/Input';
import { Badge } from '@/components/ui/Badge';
import { formatMoney, formatDate } from '@/lib/utils/format';
import { PROJECT_STATUS, PAYMENT_STATUS } from '@/lib/constants';
import { useAuthStore } from '@/store/authStore';
import { useDebounce } from '@/hooks/useDebounce';
import { useProjects } from '@/features/projects/projectsApi';
import { ProjectFormDialog } from '@/features/projects/ProjectFormDialog';

export function ProjectsPage() {
  const navigate = useNavigate();
  const role = useAuthStore((s) => s.user?.role);
  const canCreate = ['superadmin', 'admin'].includes(role);

  const [page, setPage] = useState(1);
  const [search, setSearch] = useState('');
  const [status, setStatus] = useState('');
  const debounced = useDebounce(search);
  const [formOpen, setFormOpen] = useState(false);

  const { data, isLoading } = useProjects({ page, limit: 15, search: debounced, status: status || undefined });

  const columns = [
    {
      key: 'name', header: 'Loyiha',
      render: (r) => (
        <div>
          <p className="font-medium text-text-strong">{r.name}</p>
          <p className="text-xs text-text-soft">{r.type?.name || '—'} · {r.client?.name || 'Mijozsiz'}</p>
        </div>
      ),
    },
    {
      key: 'progress', header: 'Bajarilish',
      render: (r) => (
        <div className="flex items-center gap-2">
          <div className="h-1.5 w-20 overflow-hidden rounded-full bg-bg-2">
            <div className="h-full rounded-full bg-accent-strong" style={{ width: `${r.progressPercent}%` }} />
          </div>
          <span className="text-xs text-text-sub">{r.progressPercent}%</span>
        </div>
      ),
    },
    { key: 'price', header: 'Summa', render: (r) => formatMoney(r.price, r.currency) },
    { key: 'deadline', header: 'Deadline', render: (r) => formatDate(r.deadline) },
    { key: 'payment', header: "To'lov", render: (r) => <Badge tone={PAYMENT_STATUS[r.paymentStatus]?.tone}>{PAYMENT_STATUS[r.paymentStatus]?.label}</Badge> },
    { key: 'status', header: 'Status', render: (r) => <Badge tone={PROJECT_STATUS[r.status]?.tone}>{PROJECT_STATUS[r.status]?.label}</Badge> },
  ];

  return (
    <div className="flex h-[calc(100vh-6rem)] flex-col sm:h-[calc(100vh-7rem)]">
      <PageHeader
        title="Loyihalar"
        subtitle="Barcha loyihalar va ularning holati"
        actions={canCreate && <Button onClick={() => setFormOpen(true)}><Plus className="h-4 w-4" /> Yangi loyiha</Button>}
      />

      <div className="mb-4 flex flex-col gap-2 sm:flex-row">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-icon-soft" />
          <Input placeholder="Loyiha nomi bo'yicha qidirish..." className="pl-9" value={search} onChange={(e) => { setSearch(e.target.value); setPage(1); }} />
        </div>
        <Select className="sm:w-48" value={status} onChange={(e) => { setStatus(e.target.value); setPage(1); }}>
          <option value="">Barcha statuslar</option>
          {Object.entries(PROJECT_STATUS).map(([k, v]) => <option key={k} value={k}>{v.label}</option>)}
        </Select>
      </div>

      <div className="min-h-0 flex-1">
        <DataTable
          columns={columns}
          data={data?.items}
          loading={isLoading}
          onRowClick={(r) => navigate(`/projects/${r.id}`)}
          page={page}
          totalPages={data?.totalPages || 1}
          total={data?.total || 0}
          onPageChange={setPage}
          emptyTitle="Loyihalar yo'q"
          emptyDescription="Sizga biriktirilgan yoki yaratilgan loyihalar bu yerda ko'rinadi."
          transparent
          fill
        />
      </div>

      <ProjectFormDialog open={formOpen} onClose={() => setFormOpen(false)} />
    </div>
  );
}
