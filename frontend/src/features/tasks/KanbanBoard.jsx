import { useMemo, useState } from 'react';
import {
  DndContext,
  DragOverlay,
  PointerSensor,
  closestCorners,
  useSensor,
  useSensors,
} from '@dnd-kit/core';
import { toast } from 'sonner';
import { KanbanColumn } from './KanbanColumn';
import { TaskCard } from './TaskCard';
import { useChangeStatus } from './tasksApi';
import { apiError } from '@/lib/api/axios';

// Kanban ustunlari tartibi (spec)
const COLUMNS = ['todo', 'in_progress', 'overdue', 'done', 'checked', 'production', 'rejected'];

export function KanbanBoard({ projectId, tasks, onCardClick }) {
  const [activeTask, setActiveTask] = useState(null);
  const changeStatus = useChangeStatus(projectId);
  const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 6 } }));

  // Group tasks by status
  const grouped = useMemo(() => {
    const g = Object.fromEntries(COLUMNS.map((c) => [c, []]));
    for (const t of tasks) (g[t.status] || (g[t.status] = [])).push(t);
    return g;
  }, [tasks]);

  const findColumn = (id) => {
    if (typeof id === 'string' && id.startsWith('col:')) return id.slice(4);
    const task = tasks.find((t) => t.id === id);
    return task?.status;
  };

  const onDragStart = (e) => setActiveTask(tasks.find((t) => t.id === e.active.id) || null);

  const onDragEnd = (e) => {
    setActiveTask(null);
    const { active, over } = e;
    if (!over) return;
    const from = findColumn(active.id);
    const to = findColumn(over.id);
    if (!to || from === to) return;

    changeStatus.mutate(
      { id: active.id, status: to },
      { onError: (err) => toast.error(apiError(err, 'Statusni o\'zgartirib bo\'lmadi')) },
    );
  };

  return (
    <DndContext sensors={sensors} collisionDetection={closestCorners} onDragStart={onDragStart} onDragEnd={onDragEnd}>
      <div className="flex gap-3 overflow-x-auto pb-4">
        {COLUMNS.map((status) => (
          <KanbanColumn key={status} status={status} tasks={grouped[status] || []} onCardClick={onCardClick} />
        ))}
      </div>
      <DragOverlay>{activeTask && <TaskCard task={activeTask} />}</DragOverlay>
    </DndContext>
  );
}
