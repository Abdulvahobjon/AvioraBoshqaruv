import { useState } from 'react';
import { Plus, Search, Filter, List, LayoutGrid, Flag } from 'lucide-react';
import { PageHeader } from '@/components/shared/PageHeader';
import { DataTable } from '@/components/shared/DataTable';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Badge } from '@/components/ui/Badge';
import { Skeleton } from '@/components/ui/Skeleton';
import { cn } from '@/lib/utils/cn';
import { useAuthStore } from '@/store/authStore';
import { useDebounce } from '@/hooks/useDebounce';
import { TASK_STATUS, TASK_PRIORITY, TASK_TYPE } from '@/lib/constants';
import { formatDate } from '@/lib/utils/format';
import { useTasks, useBoard } from '@/features/tasks/tasksApi';
import { TaskFormDialog } from '@/features/tasks/TaskFormDialog';
import { TaskDetailDialog } from '@/features/tasks/TaskDetailDialog';
import { TaskFilterDialog } from '@/features/tasks/TaskFilterDialog';
import { KanbanBoard } from '@/features/tasks/KanbanBoard';

const countActiveFilters = (f) => Object.entries(f).filter(([k, v]) => v && k !== 'mine').length + (f.mine ? 1 : 0);

export function TasksPage() {
  const role = useAuthStore((s) => s.user?.role);
  const canCreate = ['superadmin', 'admin', 'manager'].includes(role);

  const [view, setView] = useState('table'); // 'table' | 'kanban'
  const [search, setSearch] = useState('');
  const debounced = useDebounce(search);
  const [filters, setFilters] = useState({});
  const [filterOpen, setFilterOpen] = useState(false);
  const [formOpen, setFormOpen] = useState(false);
  const [editing, setEditing] = useState(null);
  const [detailId, setDetailId] = useState(null);

  const query = { search: debounced || undefined, ...cleanFilters(filters) };
  const activeCount = countActiveFilters(filters);

  const openCreate = () => { setEditing(null); setFormOpen(true); };
  const openEdit = (t) => { setDetailId(null); setEditing(t); setFormOpen(true); };

  return (
    <div>
      <PageHeader
        title="Vazifalar"
        subtitle="Barcha vazifalar — jadval yoki Kanban ko'rinishida"
        actions={
          <div className="flex items-center gap-2">
            <div className="flex overflow-hidden rounded-md border border-stroke-sub">
              <button onClick={() => setView('table')} className={cn('p-2', view === 'table' ? 'bg-accent-strong text-text-white' : 'text-icon-sub hover:bg-bg-1-alt')} title="Jadval"><List className="h-4 w-4" /></button>
              <button onClick={() => setView('kanban')} className={cn('p-2', view === 'kanban' ? 'bg-accent-strong text-text-white' : 'text-icon-sub hover:bg-bg-1-alt')} title="Kanban"><LayoutGrid className="h-4 w-4" /></button>
            </div>
            {canCreate && <Button onClick={openCreate}><Plus className="h-4 w-4" /> Vazifa qo'shish</Button>}
          </div>
        }
      />

      <div className="mb-4 flex flex-col gap-2 sm:flex-row">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-icon-soft" />
          <Input placeholder="UID yoki nomi bo'yicha izlash..." className="pl-9" value={search} onChange={(e) => setSearch(e.target.value)} />
        </div>
        <Button variant="outline" onClick={() => setFilterOpen(true)} className="relative">
          <Filter className="h-4 w-4" /> Filtrlash
          {activeCount > 0 && <span className="absolute -right-1 -top-1 flex h-4 min-w-4 items-center justify-center rounded-full bg-accent-strong px-1 text-[10px] text-text-white">{activeCount}</span>}
        </Button>
      </div>

      {view === 'table' ? <TableView query={query} onRowClick={(t) => setDetailId(t.id)} /> : <BoardView query={query} onCardClick={(t) => setDetailId(t.id)} />}

      <TaskFormDialog open={formOpen} onClose={() => setFormOpen(false)} task={editing} />
      {detailId && <TaskDetailDialog taskId={detailId} open={!!detailId} onClose={() => setDetailId(null)} onEdit={openEdit} />}
      <TaskFilterDialog open={filterOpen} onClose={() => setFilterOpen(false)} value={filters} onApply={setFilters} />
    </div>
  );
}

function cleanFilters(f) {
  const out = {};
  for (const [k, v] of Object.entries(f)) {
    if (k === 'mine') { if (v) out.mine = true; continue; }
    if (v) out[k] = v;
  }
  return out;
}

function TableView({ query, onRowClick }) {
  const [page, setPage] = useState(1);
  const { data, isLoading } = useTasks({ ...query, page, limit: 20 });
  const columns = [
    { key: 'idx', header: '№', className: 'w-12', render: (_r, i) => i + 1 },
    { key: 'uid', header: 'UID', render: (r) => <span className="inline-flex items-center gap-1 font-mono text-xs text-text-sub"><Flag className="h-3 w-3" />{r.uid || '—'}</span> },
    { key: 'title', header: 'Nomi', render: (r) => <span className="font-medium text-text-strong">{r.title}</span> },
    { key: 'project', header: 'Loyiha', render: (r) => r.project?.name || '—' },
    { key: 'creator', header: 'Yaratuvchi', render: (r) => r.creator?.fullName || '—' },
    { key: 'assignee', header: 'Topshiruvchi', render: (r) => r.assignee?.fullName || '—' },
    { key: 'type', header: 'Turi', render: (r) => TASK_TYPE[r.type] },
    { key: 'priority', header: 'Darajasi', render: (r) => <Badge tone={TASK_PRIORITY[r.priority]?.tone}>{TASK_PRIORITY[r.priority]?.label}</Badge> },
    { key: 'status', header: 'Holati', render: (r) => <Badge tone={TASK_STATUS[r.status]?.tone}>{TASK_STATUS[r.status]?.label}</Badge> },
    { key: 'deadline', header: 'Muddati', render: (r) => formatDate(r.deadline, true) },
  ];
  return (
    <DataTable
      columns={columns}
      data={data?.items}
      loading={isLoading}
      onRowClick={onRowClick}
      page={page}
      totalPages={data?.totalPages || 1}
      total={data?.total || 0}
      onPageChange={setPage}
      emptyTitle="Vazifalar yo'q"
      emptyDescription="Yangi vazifa qo'shish uchun yuqoridagi tugmani bosing."
    />
  );
}

function BoardView({ query, onCardClick }) {
  const { data: tasks, isLoading } = useBoard(query);
  if (isLoading) {
    return <div className="flex gap-3">{Array.from({ length: 5 }).map((_, i) => <Skeleton key={i} className="h-[60vh] flex-1" />)}</div>;
  }
  return <KanbanBoard tasks={tasks || []} onCardClick={onCardClick} />;
}
