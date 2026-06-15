import { useMemo, useState } from 'react';
import { Search, RotateCcw, Trash2, Briefcase, KanbanSquare } from 'lucide-react';
import { toast } from 'sonner';
import { PageHeader } from '@/components/shared/PageHeader';
import { DataTable } from '@/components/shared/DataTable';
import { Tabs } from '@/components/ui/Tabs';
import { Input } from '@/components/ui/Input';
import { Button } from '@/components/ui/Button';
import { Dialog } from '@/components/ui/Dialog';
import { DropdownMenu } from '@/components/ui/DropdownMenu';
import { X } from 'lucide-react';
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

function ProjectsTrash() {
  const { data, isLoading } = useTrashProjects();
  const restore = useRestoreProject();
  const hardDelete = useHardDeleteProject();
  const [search, setSearch] = useState('');
  const debounced = useDebounce(search);
  const [toDelete, setToDelete] = useState(null);

  const rows = useMemo(() => {
    const all = data || [];
    if (!debounced) return all;
    const q = debounced.toLowerCase();
    return all.filter((r) => r.name?.toLowerCase().includes(q) || r.manager?.toLowerCase().includes(q));
  }, [data, debounced]);

  const onRestore = (id) => restore.mutate(id, {
    onSuccess: () => toast.success('Tiklandi', { description: "Loyiha tiklandi va ro'yxatga qaytdi" }),
    onError: (e) => toast.error(apiError(e)),
  });
  const doHardDelete = () => hardDelete.mutate(toDelete.id, {
    onSuccess: () => { toast.success("Muvaffaqiyatli o'chirildi", { description: "Tanlangan ma'lumot butunlay o'chirildi" }); setToDelete(null); },
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
          <DropdownMenu items={[
            { label: 'Tiklash', icon: RotateCcw, tone: 'success', onClick: () => onRestore(r.id) },
            { label: "Butunlay o'chirish", icon: Trash2, tone: 'danger', onClick: () => setToDelete(r) },
          ]} />
        </div>
      ),
    },
  ];

  return (
    <>
      <SearchBar value={search} onChange={setSearch} placeholder="Loyihani izlash" />
      <DataTable columns={columns} data={rows} loading={isLoading} emptyTitle="Chiqindi bo'sh" emptyDescription="O'chirilgan loyiha yo'q." />
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
  const [toDelete, setToDelete] = useState(null);

  const rows = useMemo(() => {
    const all = data || [];
    if (!debounced) return all;
    const q = debounced.toLowerCase();
    return all.filter((r) => r.title?.toLowerCase().includes(q) || r.project?.name?.toLowerCase().includes(q));
  }, [data, debounced]);

  const onRestore = (id) => restore.mutate(id, {
    onSuccess: () => toast.success('Tiklandi', { description: "Vazifa tiklandi va ro'yxatga qaytdi" }),
    onError: (e) => toast.error(apiError(e)),
  });
  const doHardDelete = () => hardDelete.mutate(toDelete.id, {
    onSuccess: () => { toast.success("Muvaffaqiyatli o'chirildi", { description: "Tanlangan ma'lumot butunlay o'chirildi" }); setToDelete(null); },
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
          <DropdownMenu items={[
            { label: 'Tiklash', icon: RotateCcw, tone: 'success', onClick: () => onRestore(r.id) },
            { label: "Butunlay o'chirish", icon: Trash2, tone: 'danger', onClick: () => setToDelete(r) },
          ]} />
        </div>
      ),
    },
  ];

  return (
    <>
      <SearchBar value={search} onChange={setSearch} placeholder="Vazifani izlash" />
      <DataTable columns={columns} data={rows} loading={isLoading} emptyTitle="Chiqindi bo'sh" emptyDescription="O'chirilgan vazifa yo'q." />
      <ConfirmDeleteDialog open={!!toDelete} onClose={() => setToDelete(null)} onConfirm={doHardDelete} loading={hardDelete.isPending} />
    </>
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
