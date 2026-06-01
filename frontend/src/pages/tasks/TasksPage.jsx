import { useState, useEffect, useRef } from 'react';
import { createPortal } from 'react-dom';
import { Plus, Search, Filter, List, LayoutGrid, Flag, Printer, Download } from 'lucide-react';
import { DataTable } from '@/components/shared/DataTable';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Badge } from '@/components/ui/Badge';
import { Skeleton } from '@/components/ui/Skeleton';
import { cn } from '@/lib/utils/cn';
import { useAuthStore } from '@/store/authStore';
import { useUiStore } from '@/store/uiStore';
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
  const [rows, setRows] = useState([]); // currently loaded tasks (for print/export)

  // Kanban needs the sidebar collapsed; expanding the sidebar switches back to the table view.
  const collapsed = useUiStore((s) => s.sidebarCollapsed);
  const setCollapsed = useUiStore((s) => s.setSidebarCollapsed);
  useEffect(() => {
    if (view === 'kanban') setCollapsed(true);
  }, [view, setCollapsed]);
  const prevCollapsed = useRef(collapsed);
  useEffect(() => {
    const was = prevCollapsed.current;
    prevCollapsed.current = collapsed;
    if (view === 'kanban' && was && !collapsed) setView('table'); // user opened the sidebar → table
  }, [collapsed, view]);

  const query = { search: debounced || undefined, ...cleanFilters(filters) };
  const activeCount = countActiveFilters(filters);

  const openCreate = () => { setEditing(null); setFormOpen(true); };
  const openEdit = (t) => { setDetailId(null); setEditing(t); setFormOpen(true); };
  const onPrint = () => window.print();
  const onDownload = () => exportTasksCsv(rows);

  return (
    <div>
      {/* Action buttons live in the top navbar (portalled into Topbar's #page-actions slot). */}
      <TopbarActions>
        <Button variant="outline" size="sm" onClick={onPrint} title="Chop etish"><Printer className="h-4 w-4" /> Chop etish</Button>
        <Button variant="outline" size="sm" onClick={onDownload} disabled={!rows.length} title="Excel (CSV) yuklab olish"><Download className="h-4 w-4" /> Yuklab olish</Button>
        {canCreate && <Button size="sm" onClick={openCreate}><Plus className="h-4 w-4" /> Vazifa qo'shish</Button>}
      </TopbarActions>

      {/* Page name lives in the navbar now; here only a compact toolbar. */}
      <div className="mb-3 flex flex-col gap-2 sm:flex-row sm:items-center">
        <div className="relative w-full sm:w-64">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-icon-soft" />
          <Input placeholder="UID yoki nomi bo'yicha izlash..." className="h-9 pl-9" value={search} onChange={(e) => setSearch(e.target.value)} />
        </div>

        <div className="flex flex-wrap items-center gap-2 sm:ml-auto">
          <Button variant="outline" onClick={() => setFilterOpen(true)} className="relative">
            <Filter className="h-4 w-4" /> Filtrlash
            {activeCount > 0 && <span className="absolute -right-1 -top-1 flex h-4 min-w-4 items-center justify-center rounded-full bg-accent-strong px-1 text-[10px] text-text-white">{activeCount}</span>}
          </Button>

          {/* Jadval / Kanban ko'rinishini almashtirish */}
          <div className="flex shrink-0 overflow-hidden rounded-md border border-stroke-sub">
            <button onClick={() => setView('table')} className={cn('px-3 py-2', view === 'table' ? 'bg-accent-strong text-text-white' : 'text-icon-sub hover:bg-bg-1-alt')} title="Jadval"><List className="h-4 w-4" /></button>
            <button onClick={() => setView('kanban')} className={cn('px-3 py-2', view === 'kanban' ? 'bg-accent-strong text-text-white' : 'text-icon-sub hover:bg-bg-1-alt')} title="Kanban"><LayoutGrid className="h-4 w-4" /></button>
          </div>
        </div>
      </div>

      {view === 'table'
        ? <TableView query={query} onRowClick={(t) => setDetailId(t.id)} onData={setRows} />
        : <BoardView query={query} onCardClick={(t) => setDetailId(t.id)} onData={setRows} onAddCard={openCreate} canAdd={canCreate} />}

      <TaskFormDialog open={formOpen} onClose={() => setFormOpen(false)} task={editing} />
      {detailId && <TaskDetailDialog taskId={detailId} open={!!detailId} onClose={() => setDetailId(null)} onEdit={openEdit} />}
      <TaskFilterDialog open={filterOpen} onClose={() => setFilterOpen(false)} value={filters} onApply={setFilters} />
    </div>
  );
}

/** Portals its children into the Topbar's #page-actions slot (renders nothing inline). */
function TopbarActions({ children }) {
  const [el, setEl] = useState(null);
  useEffect(() => { setEl(document.getElementById('page-actions')); }, []);
  return el ? createPortal(children, el) : null;
}

function cleanFilters(f) {
  const out = {};
  for (const [k, v] of Object.entries(f)) {
    if (k === 'mine') { if (v) out.mine = true; continue; }
    if (v) out[k] = v;
  }
  return out;
}

/** Download the given tasks as a UTF-8 CSV (Excel-friendly: BOM + ';' separator). */
function exportTasksCsv(rows) {
  if (!rows?.length) return;
  const headers = ['№', 'UID', 'Nomi', 'Loyiha', 'Topshiruvchi', 'Turi', 'Darajasi', 'Holati', 'Muddati'];
  const esc = (v) => {
    const s = String(v ?? '');
    return /[",;\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
  };
  const body = rows.map((r, i) => [
    i + 1,
    r.uid || '',
    r.title || '',
    r.project?.name || '',
    r.assignee?.fullName || '',
    TASK_TYPE[r.type] || r.type || '',
    TASK_PRIORITY[r.priority]?.label || '',
    TASK_STATUS[r.status]?.label || '',
    r.deadline ? formatDate(r.deadline, true) : '',
  ]);
  const csv = [headers, ...body].map((row) => row.map(esc).join(';')).join('\r\n');
  const blob = new Blob(['﻿' + csv], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `vazifalar-${new Date().toISOString().slice(0, 10)}.csv`;
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
}

function TableView({ query, onRowClick, onData }) {
  const [page, setPage] = useState(1);
  const { data, isLoading } = useTasks({ ...query, page, limit: 20 });
  useEffect(() => { if (data?.items) onData?.(data.items); }, [data, onData]);
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

function BoardView({ query, onCardClick, onData, onAddCard, canAdd }) {
  const { data: tasks, isLoading } = useBoard(query);
  useEffect(() => { if (tasks) onData?.(tasks); }, [tasks, onData]);
  if (isLoading) {
    return (
      <div className="flex h-[calc(100vh-150px)] gap-2 rounded-xl bg-bg-1 p-2.5">
        {Array.from({ length: 7 }).map((_, i) => <Skeleton key={i} className="h-full flex-1 rounded-xl" />)}
      </div>
    );
  }
  return <KanbanBoard tasks={tasks || []} onCardClick={onCardClick} onAddCard={onAddCard} canAdd={canAdd} />;
}
