import { useState } from 'react';
import { RotateCcw, Trash2, Briefcase, KanbanSquare } from 'lucide-react';
import { toast } from 'sonner';
import { PageHeader } from '@/components/shared/PageHeader';
import { DataTable } from '@/components/shared/DataTable';
import { Tabs } from '@/components/ui/Tabs';
import { Button } from '@/components/ui/Button';
import { Badge } from '@/components/ui/Badge';
import { formatDate } from '@/lib/utils/format';
import { apiError } from '@/lib/api/axios';
import { PROJECT_STATUS, TASK_STATUS } from '@/lib/constants';
import {
  useTrashProjects, useTrashTasks, useRestoreProject, useRestoreTask,
} from '@/features/trash/trashApi';

export function TrashPage() {
  const [tab, setTab] = useState('projects');
  const tabs = [
    { value: 'projects', label: 'Loyihalar', icon: Briefcase },
    { value: 'tasks', label: 'Vazifalar', icon: KanbanSquare },
  ];

  return (
    <div>
      <PageHeader title="Chiqindi (Trash)" subtitle="O'chirilgan yozuvlar — tiklash mumkin" />
      <Tabs tabs={tabs} value={tab} onChange={setTab} className="mb-6" />
      {tab === 'projects' && <ProjectsTrash />}
      {tab === 'tasks' && <TasksTrash />}
    </div>
  );
}

function ProjectsTrash() {
  const { data, isLoading } = useTrashProjects();
  const restore = useRestoreProject();
  const onRestore = (id) => restore.mutate(id, { onSuccess: () => toast.success('Tiklandi'), onError: (e) => toast.error(apiError(e)) });

  const columns = [
    { key: 'name', header: 'Loyiha', render: (r) => <span className="font-medium text-text-strong">{r.name}</span> },
    { key: 'client', header: 'Mijoz', render: (r) => r.client?.name || '—' },
    { key: 'status', header: 'Holat', render: (r) => <Badge tone={PROJECT_STATUS[r.status]?.tone}>{PROJECT_STATUS[r.status]?.label || r.status}</Badge> },
    { key: 'tasks', header: 'Vazifalar', render: (r) => r._count?.tasks ?? 0 },
    { key: 'updatedAt', header: "O'chirilgan", render: (r) => formatDate(r.updatedAt) },
    {
      key: 'actions', header: '',
      render: (r) => (
        <div className="flex justify-end" onClick={(e) => e.stopPropagation()}>
          <Button size="sm" variant="outline" onClick={() => onRestore(r.id)}><RotateCcw className="h-3.5 w-3.5" /> Tiklash</Button>
        </div>
      ),
    },
  ];
  return <DataTable columns={columns} data={data} loading={isLoading} emptyTitle="Chiqindi bo'sh" emptyDescription="O'chirilgan loyiha yo'q." />;
}

function TasksTrash() {
  const { data, isLoading } = useTrashTasks();
  const restore = useRestoreTask();
  const onRestore = (id) => restore.mutate(id, { onSuccess: () => toast.success('Tiklandi'), onError: (e) => toast.error(apiError(e)) });

  const columns = [
    { key: 'title', header: 'Vazifa', render: (r) => <span className="font-medium text-text-strong">{r.title}</span> },
    { key: 'project', header: 'Loyiha', render: (r) => r.project?.name || '—' },
    { key: 'assignee', header: 'Mas\'ul', render: (r) => r.assignee?.fullName || '—' },
    { key: 'status', header: 'Holat', render: (r) => <Badge tone={TASK_STATUS[r.status]?.tone}>{TASK_STATUS[r.status]?.label || r.status}</Badge> },
    { key: 'updatedAt', header: "O'chirilgan", render: (r) => formatDate(r.updatedAt) },
    {
      key: 'actions', header: '',
      render: (r) => (
        <div className="flex justify-end" onClick={(e) => e.stopPropagation()}>
          <Button size="sm" variant="outline" onClick={() => onRestore(r.id)}><RotateCcw className="h-3.5 w-3.5" /> Tiklash</Button>
        </div>
      ),
    },
  ];
  return <DataTable columns={columns} data={data} loading={isLoading} emptyTitle="Chiqindi bo'sh" emptyDescription="O'chirilgan vazifa yo'q." />;
}
