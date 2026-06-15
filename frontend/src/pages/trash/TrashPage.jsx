import { useMemo, useState } from 'react';
import { Search, RotateCcw, Trash2, Briefcase, KanbanSquare, X } from 'lucide-react';
import { toast } from 'sonner';
import { PageHeader } from '@/components/shared/PageHeader';
import { DataTable } from '@/components/shared/DataTable';
import { Tabs } from '@/components/ui/Tabs';
import { Input } from '@/components/ui/Input';
import { Button } from '@/components/ui/Button';
import { Dialog } from '@/components/ui/Dialog';
import { DropdownMenu } from '@/components/ui/DropdownMenu';
import { formatDate } from '@/lib/utils/format';
import { apiError } from '@/lib/api/axios';
import { TASK_PRIORITY } from '@/lib/constants';
import { useDebounce } from '@/hooks/useDebounce';
import {
  useTrashProjects, useTrashTasks,
  useRestoreProject, useRestoreTask,
  useHardDeleteProject, useHardDeleteTask,
} from '@/features/trash/trashApi';

const TYPE_LABEL = { bug: 'Xatolik', extra: "Qo'shimcha", research: 'Tadqiqot', feature: 'Yangi funksiya' };
const dt = (d) => (d ? formatDate(d, true) : '—');

/** "O'chirilgan" holat pill'i (chiqindidagi barcha yozuvlar). */
function DeletedBadge() {
  return <span className="inline-flex items-center rounded-full border border-error-soft px-2.5 py-0.5 text-xs font-medium text-error-strong">O'chirilgan</span>;
}

/** Yashil nuqtali ustun sarlavhasi. */
function DotHeader({ children }) {
  return <span className="inline-flex items-center gap-1.5"><span className="h-1.5 w-1.5 rounded-full bg-success-strong" />{children}</span>;
}

export function TrashPage() {
  const [tab, setTab] = useState('projects');
  const tabs = [
    { value: 'projects', label: 'Loyihalar', icon: Briefcase },
    { value: 'tasks', label: 'Vazifalar', icon: KanbanSquare },
  ];

  return (
    <div>
      <PageHeader title="Chiqindi qutisi" subtitle="O'chirilgan yozuvlar — tiklash yoki butunlay o'chirish mumkin" />
      <Tabs tabs={tabs} value={tab} onChange={setTab} className="mb-5" />
      {tab === 'projects' ? <ProjectsTrash /> : <TasksTrash />}
    </div>
  );
}

/** Butunlay o'chirish tasdig'i — umumiy dialog. */
function ConfirmDeleteDialog({ open, onClose, onConfirm, loading }) {
  return (
    <Dialog
      open={open}
      onClose={onClose}
      onBack={onClose}
      title="Butunlay o'chirmoqchimisiz?"
      subtitle="Bu amalni bekor qilib bo'lmaydi. Ma'lumotlar butunlay o'chiriladi"
      size="sm"
      footer={
        <div className="flex w-full items-center justify-end gap-2">
          <Button variant="ghost" onClick={onClose}><X className="h-4 w-4" /> Bekor qilish</Button>
          <Button className="bg-error-strong hover:bg-error-sub" onClick={onConfirm} loading={loading}><Trash2 className="h-4 w-4" /> O'chirish</Button>
        </div>
      }
    ><div /></Dialog>
  );
}

/** Qator tanlanganda pastda chiqadigan suzuvchi amal paneli. */
function SelectionBar({ onRestore, onDelete }) {
  return (
    <div className="pointer-events-none fixed inset-x-0 bottom-6 z-40 flex justify-center lg:pl-64">
      <div className="pointer-events-auto inline-flex items-center gap-1 rounded-full border border-stroke-sub bg-bg-base p-1.5 shadow-elevated">
        <button onClick={onRestore} className="inline-flex items-center gap-2 rounded-full px-5 py-2 text-sm font-semibold text-text-accent transition-colors hover:bg-bg-1-alt">
          <RotateCcw className="h-4 w-4" /> Tiklash
        </button>
        <span className="h-5 w-px bg-stroke-sub" />
        <button onClick={onDelete} className="inline-flex items-center gap-2 rounded-full px-5 py-2 text-sm font-semibold text-error-strong transition-colors hover:bg-error-soft">
          <Trash2 className="h-4 w-4" /> Butunlay o'chirish
        </button>
      </div>
    </div>
  );
}

function SearchBar({ value, onChange, placeholder }) {
  return (
    <div className="relative mb-4 w-full sm:w-80">
      <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-icon-soft" />
      <Input placeholder={placeholder} className="pl-9" value={value} onChange={(e) => onChange(e.target.value)} />
    </div>
  );
}

function rowMenu(onRestore, onDelete) {
  return [
    { label: 'Tiklash', icon: RotateCcw, tone: 'success', onClick: onRestore },
    { label: "Butunlay o'chirish", icon: Trash2, tone: 'danger', onClick: onDelete },
  ];
}

function ProjectsTrash() {
  const { data, isLoading } = useTrashProjects();
  const restore = useRestoreProject();
  const hardDelete = useHardDeleteProject();
  const [search, setSearch] = useState('');
  const debounced = useDebounce(search);
  const [selected, setSelected] = useState(null);
  const [toDelete, setToDelete] = useState(null);

  const rows = useMemo(() => {
    const all = data || [];
    if (!debounced) return all;
    const q = debounced.toLowerCase();
    return all.filter((r) => r.name?.toLowerCase().includes(q) || r.manager?.toLowerCase().includes(q));
  }, [data, debounced]);

  const onRestore = (id) => restore.mutate(id, {
    onSuccess: () => { toast.success('Tiklandi', { description: "Loyiha tiklandi va ro'yxatga qaytdi" }); setSelected(null); },
    onError: (e) => toast.error(apiError(e)),
  });
  const doHardDelete = () => hardDelete.mutate(toDelete.id, {
    onSuccess: () => { toast.success("Muvaffaqiyatli o'chirildi", { description: "Tanlangan ma'lumot butunlay o'chirildi" }); setToDelete(null); setSelected(null); },
    onError: (e) => toast.error(apiError(e)),
  });

  const columns = [
    { key: 'idx', header: '№', render: (_r, i) => <span className="text-text-soft">{i + 1}</span> },
    { key: 'name', header: 'Nomi', render: (r) => <span className="font-medium text-text-strong">{r.name}</span> },
    { key: 'manager', header: <DotHeader>Menejer</DotHeader>, render: (r) => <span className="text-text-sub">{r.manager}</span> },
    { key: 'status', header: 'Holati', render: () => <DeletedBadge /> },
    { key: 'startDate', header: 'Boshlanish sanasi', render: (r) => <span className="whitespace-nowrap text-text-sub">{dt(r.startDate)}</span> },
    { key: 'deadline', header: 'Muddati', render: (r) => <span className="whitespace-nowrap text-text-sub">{dt(r.deadline)}</span> },
    {
      key: 'actions', header: '', className: 'w-12',
      render: (r) => (
        <div className="flex justify-end" onClick={(e) => e.stopPropagation()}>
          <DropdownMenu items={rowMenu(() => onRestore(r.id), () => setToDelete(r))} />
        </div>
      ),
    },
  ];

  return (
    <>
      <SearchBar value={search} onChange={setSearch} placeholder="Loyihani izlash" />
      <DataTable
        columns={columns} data={rows} loading={isLoading} accentHeader
        onRowClick={(r) => setSelected((s) => (s?.id === r.id ? null : r))} selectedId={selected?.id}
        emptyTitle="Chiqindi bo'sh" emptyDescription="O'chirilgan loyiha yo'q."
      />
      {selected && <SelectionBar onRestore={() => onRestore(selected.id)} onDelete={() => setToDelete(selected)} />}
      <ConfirmDeleteDialog open={!!toDelete} onClose={() => setToDelete(null)} onConfirm={doHardDelete} loading={hardDelete.isPending} />
    </>
  );
}

function TasksTrash() {
  const { data, isLoading } = useTrashTasks();
  const restore = useRestoreTask();
  const hardDelete = useHardDeleteTask();
  const [search, setSearch] = useState('');
  const debounced = useDebounce(search);
  const [selected, setSelected] = useState(null);
  const [toDelete, setToDelete] = useState(null);

  const rows = useMemo(() => {
    const all = data || [];
    if (!debounced) return all;
    const q = debounced.toLowerCase();
    return all.filter((r) => r.title?.toLowerCase().includes(q) || r.project?.name?.toLowerCase().includes(q));
  }, [data, debounced]);

  const onRestore = (id) => restore.mutate(id, {
    onSuccess: () => { toast.success('Tiklandi', { description: "Vazifa tiklandi va ro'yxatga qaytdi" }); setSelected(null); },
    onError: (e) => toast.error(apiError(e)),
  });
  const doHardDelete = () => hardDelete.mutate(toDelete.id, {
    onSuccess: () => { toast.success("Muvaffaqiyatli o'chirildi", { description: "Tanlangan ma'lumot butunlay o'chirildi" }); setToDelete(null); setSelected(null); },
    onError: (e) => toast.error(apiError(e)),
  });

  const columns = [
    { key: 'idx', header: '№', render: (_r, i) => <span className="text-text-soft">{i + 1}</span> },
    { key: 'title', header: 'Nomi', render: (r) => <span className="font-medium text-text-strong">{r.title}</span> },
    { key: 'project', header: 'Loyiha', render: (r) => <span className="text-text-sub">{r.project?.name || '—'}</span> },
    { key: 'creator', header: 'Yaratuvchi', render: (r) => <span className="text-text-sub">{r.creator?.fullName || '—'}</span> },
    { key: 'assignee', header: <DotHeader>Topshiruvchi</DotHeader>, render: (r) => <span className="text-text-sub">{r.assignee?.fullName || '—'}</span> },
    { key: 'type', header: 'Turi', render: (r) => <span className="text-text-sub">{TYPE_LABEL[r.type] || r.type}</span> },
    { key: 'priority', header: 'Darajasi', render: (r) => <span className="text-text-sub">{TASK_PRIORITY[r.priority]?.label || r.priority}</span> },
    { key: 'status', header: 'Holati', render: () => <DeletedBadge /> },
    { key: 'deadline', header: 'Muddati', render: (r) => <span className="whitespace-nowrap text-text-sub">{dt(r.deadline)}</span> },
    {
      key: 'actions', header: '', className: 'w-12',
      render: (r) => (
        <div className="flex justify-end" onClick={(e) => e.stopPropagation()}>
          <DropdownMenu items={rowMenu(() => onRestore(r.id), () => setToDelete(r))} />
        </div>
      ),
    },
  ];

  return (
    <>
      <SearchBar value={search} onChange={setSearch} placeholder="Vazifani izlash" />
      <DataTable
        columns={columns} data={rows} loading={isLoading} accentHeader
        onRowClick={(r) => setSelected((s) => (s?.id === r.id ? null : r))} selectedId={selected?.id}
        emptyTitle="Chiqindi bo'sh" emptyDescription="O'chirilgan vazifa yo'q."
      />
      {selected && <SelectionBar onRestore={() => onRestore(selected.id)} onDelete={() => setToDelete(selected)} />}
      <ConfirmDeleteDialog open={!!toDelete} onClose={() => setToDelete(null)} onConfirm={doHardDelete} loading={hardDelete.isPending} />
    </>
  );
}
