import { useMemo, useState } from 'react';
import { DndContext, DragOverlay, PointerSensor, closestCorners, useSensor, useSensors } from '@dnd-kit/core';
import { toast } from 'sonner';
import { KANBAN_COLUMNS } from '@/lib/constants';
import { KanbanColumn } from './KanbanColumn';
import { TaskCard } from './TaskCard';
import { useChangeStatus } from './tasksApi';
import { apiError } from '@/lib/api/axios';

export function KanbanBoard({ tasks, onCardClick }) {
  const [activeTask, setActiveTask] = useState(null);
  const changeStatus = useChangeStatus();
  const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 6 } }));

  const grouped = useMemo(() => {
    const g = Object.fromEntries(KANBAN_COLUMNS.map((c) => [c.status, []]));
    for (const t of tasks) (g[t.status] || (g[t.status] = [])).push(t);
    return g;
  }, [tasks]);

  const findColumn = (id) => {
    if (typeof id === 'string' && id.startsWith('col:')) return id.slice(4);
    return tasks.find((t) => t.id === id)?.status;
  };

  const onDragEnd = (e) => {
    setActiveTask(null);
    const { active, over } = e;
    if (!over) return;
    const from = findColumn(active.id);
    const to = findColumn(over.id);
    if (!to || from === to) return;
    changeStatus.mutate({ id: active.id, status: to }, { onError: (err) => toast.error(apiError(err, 'Statusni o\'zgartirib bo\'lmadi')) });
  };

  return (
    <DndContext
      sensors={sensors}
      collisionDetection={closestCorners}
      onDragStart={(e) => setActiveTask(tasks.find((t) => t.id === e.active.id) || null)}
      onDragEnd={onDragEnd}
    >
      <div className="flex h-[calc(100vh-180px)] gap-3 overflow-x-auto pb-2">
        {KANBAN_COLUMNS.map((col) => (
          <KanbanColumn key={col.status} column={col} tasks={grouped[col.status] || []} onCardClick={onCardClick} />
        ))}
      </div>
      <DragOverlay>{activeTask && <TaskCard task={activeTask} />}</DragOverlay>
    </DndContext>
  );
}
