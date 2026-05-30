import { useState, useEffect } from 'react';
import { useSearchParams } from 'react-router-dom';
import { Plus } from 'lucide-react';
import { PageHeader } from '@/components/shared/PageHeader';
import { Button } from '@/components/ui/Button';
import { Select } from '@/components/ui/Input';
import { Skeleton } from '@/components/ui/Skeleton';
import { EmptyState } from '@/components/shared/EmptyState';
import { useAuthStore } from '@/store/authStore';
import { useProjects, useProject } from '@/features/projects/projectsApi';
import { useBoard } from '@/features/tasks/tasksApi';
import { KanbanBoard } from '@/features/tasks/KanbanBoard';
import { TaskFormDialog } from '@/features/tasks/TaskFormDialog';
import { TaskDetailDialog } from '@/features/tasks/TaskDetailDialog';

export function TasksPage() {
  const role = useAuthStore((s) => s.user?.role);
  const canCreate = ['superadmin', 'admin', 'manager'].includes(role);
  const [params, setParams] = useSearchParams();

  const { data: projectList, isLoading: loadingProjects } = useProjects({ limit: 100 });
  const projects = projectList?.items || [];

  const projectId = params.get('project') ? Number(params.get('project')) : null;

  // Default to first project
  useEffect(() => {
    if (!projectId && projects.length) {
      setParams({ project: String(projects[0].id) }, { replace: true });
    }
  }, [projectId, projects, setParams]);

  const { data: project } = useProject(projectId);
  const { data: tasks, isLoading } = useBoard(projectId);

  const [formOpen, setFormOpen] = useState(false);
  const [editingTask, setEditingTask] = useState(null);
  const [detailId, setDetailId] = useState(null);

  const members = project?.members || [];

  const openCreate = () => { setEditingTask(null); setFormOpen(true); };
  const openEdit = (task) => { setDetailId(null); setEditingTask(task); setFormOpen(true); };

  return (
    <div>
      <PageHeader
        title="Vazifalar (Kanban)"
        subtitle="Drag & drop bilan vazifa statusini boshqaring"
        actions={
          <div className="flex items-center gap-2">
            <Select value={projectId || ''} onChange={(e) => setParams({ project: e.target.value })} className="w-56">
              <option value="" disabled>Loyihani tanlang</option>
              {projects.map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}
            </Select>
            {canCreate && projectId && <Button onClick={openCreate}><Plus className="h-4 w-4" /> Vazifa</Button>}
          </div>
        }
      />

      {loadingProjects ? (
        <Skeleton className="h-96" />
      ) : !projects.length ? (
        <EmptyState title="Loyihalar yo'q" description="Avval loyiha yarating, keyin vazifa qo'shing." />
      ) : isLoading ? (
        <div className="flex gap-3">{Array.from({ length: 4 }).map((_, i) => <Skeleton key={i} className="h-96 w-72 shrink-0" />)}</div>
      ) : (
        <KanbanBoard projectId={projectId} tasks={tasks || []} onCardClick={(t) => setDetailId(t.id)} />
      )}

      <TaskFormDialog open={formOpen} onClose={() => setFormOpen(false)} projectId={projectId} members={members} task={editingTask} />
      {detailId && (
        <TaskDetailDialog
          taskId={detailId}
          projectId={projectId}
          open={!!detailId}
          onClose={() => setDetailId(null)}
          onEdit={openEdit}
        />
      )}
    </div>
  );
}
