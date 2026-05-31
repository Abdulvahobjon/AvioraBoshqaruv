import { useDroppable } from '@dnd-kit/core';
import { SortableContext, verticalListSortingStrategy } from '@dnd-kit/sortable';
import { cn } from '@/lib/utils/cn';
import { TaskCard } from './TaskCard';

export function KanbanColumn({ column, tasks, onCardClick }) {
  const { setNodeRef, isOver } = useDroppable({ id: `col:${column.status}` });

  return (
    <div className="flex min-w-[260px] flex-1 flex-col">
      {/* Header */}
      <div className="mb-3 flex items-center justify-center gap-2 px-1">
        <span className="h-2.5 w-2.5 rounded-full" style={{ background: column.dot }} />
        <span className="text-sm font-semibold text-text-strong">{column.label}</span>
        <span
          className="ml-1 flex h-5 min-w-5 items-center justify-center rounded-full px-1.5 text-xs font-semibold text-white"
          style={{ background: column.count }}
        >
          {tasks.length}
        </span>
      </div>

      {/* Droppable body — fills available height */}
      <div
        ref={setNodeRef}
        style={{ background: column.tint }}
        className={cn(
          'flex-1 space-y-3 overflow-y-auto rounded-xl p-2.5 transition-colors scrollbar-none',
          isOver && 'ring-2 ring-stroke-accent',
        )}
      >
        <SortableContext items={tasks.map((t) => t.id)} strategy={verticalListSortingStrategy}>
          {tasks.map((t) => <TaskCard key={t.id} task={t} onClick={onCardClick} />)}
        </SortableContext>
      </div>
    </div>
  );
}
