import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { toast } from 'sonner';
import {
  Plus, Search, List, LayoutGrid, Pencil, Info, Trash2, Filter, ChevronsRight, FolderKanban,
} from 'lucide-react';
import { PageHeader } from '@/components/shared/PageHeader';
import { DataTable } from '@/components/shared/DataTable';
import { ConfirmDialog } from '@/components/shared/ConfirmDialog';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Badge } from '@/components/ui/Badge';
import { Card } from '@/components/ui/Card';
import { Avatar } from '@/components/ui/Avatar';
import { Skeleton } from '@/components/ui/Skeleton';
import { DropdownMenu } from '@/components/ui/DropdownMenu';
import { cn } from '@/lib/utils/cn';
import { apiError } from '@/lib/api/axios';
import { PROJECT_STATUS } from '@/lib/constants';
import { useAuthStore } from '@/store/authStore';
import { can } from '@/lib/permissions';
import { useDebounce } from '@/hooks/useDebounce';
import { useProjects, useDeleteProject } from '@/features/projects/projectsApi';
import { ProjectFormDialog } from '@/features/projects/ProjectFormDialog';
import { ProjectFilterDialog } from '@/features/projects/ProjectFilterDialog';

const VIEW_KEY = 'aviora-projects-view';
const LIMIT = 15;
const EMPTY_FILTERS = { managerId: '', status: '', employeeId: '', startFrom: '', startTo: '', deadlineFrom: '', deadlineTo: '' };

/** "01.01.2026 20:00" ko'rinishidagi sana-vaqt. */
function dt(v) {
  if (!v) return '—';
  const d = new Date(v);
  const p = (n) => String(n).padStart(2, '0');
  return `${p(d.getDate())}.${p(d.getMonth() + 1)}.${d.getFullYear()} ${p(d.getHours())}:${p(d.getMinutes())}`;
}

const managerOf = (p) => p.members?.[0]?.user;

export function ProjectsPage() {
  const navigate = useNavigate();
  const role = useAuthStore((s) => s.user?.role);
  const canManage = can(role, 'projects.manage');

  const [page, setPage] = useState(1);
  const [search, setSearch] = useState('');
  const debounced = useDebounce(search);
  const [filters, setFilters] = useState(EMPTY_FILTERS);
  const [filterOpen, setFilterOpen] = useState(false);
  const [formOpen, setFormOpen] = useState(false);
  const [editing, setEditing] = useState(null);
  const [deleting, setDeleting] = useState(null);
  const [view, setView] = useState(() => localStorage.getItem(VIEW_KEY) || 'list');
  const setViewMode = (v) => { setView(v); localStorage.setItem(VIEW_KEY, v); };

  const activeFilters = Object.fromEntries(Object.entries(filters).filter(([, v]) => v));
  const hasFilters = Object.keys(activeFilters).length > 0;

  const { data, isLoading } = useProjects({ page, limit: LIMIT, search: debounced || undefined, ...activeFilters });
  const del = useDeleteProject();

  const openCreate = () => { setEditing(null); setFormOpen(true); };
  const openEdit = (p) => { setEditing(p); setFormOpen(true); };

  // Figma tartibi: Tahrirlash · Batafsil · O'chirish (RBAC bilan).
  const rowActions = (p) => [
    ...(canManage ? [{ label: 'Tahrirlash', icon: Pencil, onClick: () => openEdit(p) }] : []),
    { label: 'Batafsil', icon: Info, onClick: () => navigate(`/projects/${p.id}`) },
    // O'chirish faqat rejalashtirilgan loyiha uchun — faolga o'tgach o'chirilmaydi.
    ...(canManage && p.status === 'planning' ? [{ label: "O'chirish", icon: Trash2, tone: 'danger', onClick: () => setDeleting(p) }] : []),
  ];

  const columns = [
    { key: 'idx', header: '№', render: (_r, i) => <span className="text-text-soft">{(page - 1) * LIMIT + i + 1}</span> },
    { key: 'code', header: 'Titul', render: (r) => <span className="text-text-sub">{r.code || '—'}</span> },
    { key: 'name', header: 'Nomi', render: (r) => <span className="font-medium text-text-strong">{r.name}</span> },
    {
      key: 'manager',
      header: <span className="inline-flex items-center gap-2"><span className="h-2 w-2 rounded-full bg-success-strong" /> Menejer</span>,
      render: (r) => managerOf(r)?.fullName || '—',
    },
    { key: 'status', header: 'Holati', render: (r) => <Badge tone={PROJECT_STATUS[r.status]?.tone}>{PROJECT_STATUS[r.status]?.label}</Badge> },
    { key: 'start', header: 'Boshlanish sanasi', render: (r) => <span className="whitespace-nowrap text-text-sub">{dt(r.createdAt)}</span> },
    { key: 'deadline', header: 'Muddati', render: (r) => <span className="whitespace-nowrap text-text-sub">{dt(r.deadline)}</span> },
    {
      key: 'actions', header: '',
      render: (r) => <div className="flex justify-end" onClick={(e) => e.stopPropagation()}><DropdownMenu items={rowActions(r)} /></div>,
    },
  ];

  const items = data?.items || [];

  return (
    <div className="flex h-[calc(100vh-6rem)] flex-col sm:h-[calc(100vh-7rem)]">
      <PageHeader
        title="Loyihalar"
        actions={canManage && <Button onClick={openCreate}><Plus className="h-4 w-4" /> Loyiha qo'shish</Button>}
      />

      <div className="mb-4 flex flex-col gap-2 sm:flex-row sm:items-center">
        <div className="relative w-full sm:w-72">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-icon-soft" />
          <Input placeholder="Loyiha nomi bo'yicha izlash" className="pl-9" value={search} onChange={(e) => { setSearch(e.target.value); setPage(1); }} />
        </div>
        <Button variant="outline" onClick={() => setFilterOpen(true)} className={cn(hasFilters && 'border-stroke-accent text-text-accent')}>
          <Filter className="h-4 w-4" /> Filtrlash{hasFilters ? ` (${Object.keys(activeFilters).length})` : ''}
        </Button>
        <ViewToggle view={view} onChange={setViewMode} />
      </div>

      <div className="min-h-0 flex-1">
        {view === 'list' ? (
          <DataTable
            columns={columns}
            data={items}
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
        ) : (
          <CardGrid
            items={items}
            loading={isLoading}
            actions={rowActions}
            onOpen={(p) => navigate(`/projects/${p.id}`)}
            page={page}
            totalPages={data?.totalPages || 1}
            onPageChange={setPage}
          />
        )}
      </div>

      <ProjectFormDialog open={formOpen} onClose={() => { setFormOpen(false); setEditing(null); }} project={editing} />
      <ProjectFilterDialog open={filterOpen} onClose={() => setFilterOpen(false)} value={filters} onApply={(f) => { setFilters(f); setPage(1); }} />
      <ConfirmDialog
        open={!!deleting}
        onClose={() => setDeleting(null)}
        title="Loyihani o'chirish"
        message={`"${deleting?.name}" loyihasini o'chirmoqchimisiz? O'chirilgan loyihani chiqindi qutisidan tiklash mumkin.`}
        loading={del.isPending}
        onConfirm={() => del.mutate(deleting.id, {
          onSuccess: () => { toast.success("Loyiha o'chirildi"); setDeleting(null); },
          onError: (e) => toast.error(apiError(e)),
        })}
      />
    </div>
  );
}

/** Ro'yxat / kartalar almashtirgich. */
function ViewToggle({ view, onChange }) {
  const Btn = ({ mode, icon: Icon, label }) => (
    <button
      type="button"
      onClick={() => onChange(mode)}
      aria-label={label}
      aria-pressed={view === mode}
      className={cn(
        'flex h-9 w-9 items-center justify-center rounded-md transition-colors',
        view === mode ? 'bg-bg-1 text-text-strong shadow-card' : 'text-icon-sub hover:text-text-strong',
      )}
    >
      <Icon className="h-4 w-4" />
    </button>
  );
  return (
    <div className="flex shrink-0 items-center gap-0.5 rounded-lg border border-stroke-sub bg-bg-2 p-0.5 sm:ml-auto">
      <Btn mode="list" icon={List} label="Ro'yxat ko'rinishi" />
      <Btn mode="card" icon={LayoutGrid} label="Kartalar ko'rinishi" />
    </div>
  );
}

function CardGrid({ items, loading, actions, onOpen, page, totalPages, onPageChange }) {
  if (loading) {
    return (
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-3">
        {Array.from({ length: 6 }).map((_, i) => <Skeleton key={i} className="h-36 rounded-lg" />)}
      </div>
    );
  }
  if (!items.length) {
    return (
      <div className="flex h-full flex-col items-center justify-center rounded-lg border border-dashed border-stroke-sub py-16 text-center">
        <FolderKanban className="mb-3 h-10 w-10 text-icon-soft" />
        <p className="font-medium text-text-strong">Loyihalar yo'q</p>
        <p className="mt-1 text-sm text-text-soft">Sizga biriktirilgan yoki yaratilgan loyihalar bu yerda ko'rinadi.</p>
      </div>
    );
  }
  return (
    <div className="flex h-full flex-col">
      <div className="min-h-0 flex-1 overflow-y-auto pb-2">
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-3">
          {items.map((p) => <ProjectCard key={p.id} p={p} actions={actions(p)} onOpen={() => onOpen(p)} />)}
        </div>
      </div>
      {totalPages > 1 && (
        <div className="flex items-center justify-end gap-2 pt-3">
          <Button variant="outline" size="sm" disabled={page <= 1} onClick={() => onPageChange(page - 1)}>Oldingi</Button>
          <span className="text-sm text-text-soft">{page} / {totalPages}</span>
          <Button variant="outline" size="sm" disabled={page >= totalPages} onClick={() => onPageChange(page + 1)}>Keyingi</Button>
        </div>
      )}
    </div>
  );
}

function ProjectCard({ p, actions, onOpen }) {
  const mgr = managerOf(p);
  return (
    <Card onClick={onOpen} className="flex cursor-pointer flex-col gap-3 p-4 transition-shadow hover:shadow-elevated">
      <div className="flex items-start justify-between gap-2">
        <p className="min-w-0 truncate font-semibold text-text-strong">{p.name}</p>
        <Badge tone={PROJECT_STATUS[p.status]?.tone}>{PROJECT_STATUS[p.status]?.label}</Badge>
      </div>

      <div className="flex items-center gap-1.5 text-xs text-text-soft">
        <span className="whitespace-nowrap">{dt(p.createdAt)}</span>
        <ChevronsRight className="h-3.5 w-3.5 text-icon-accent" />
        <span className="whitespace-nowrap">{dt(p.deadline)}</span>
      </div>

      <div className="mt-auto flex items-center justify-between">
        <div className="flex min-w-0 items-center gap-2">
          <Avatar name={mgr?.fullName} src={mgr?.avatar} size="sm" />
          <div className="min-w-0">
            <p className="truncate text-sm font-medium text-text-strong">{mgr?.fullName || '—'}</p>
            <p className="text-xs text-text-soft">Menejer</p>
          </div>
        </div>
        <div onClick={(e) => e.stopPropagation()}><DropdownMenu items={actions} /></div>
      </div>
    </Card>
  );
}
