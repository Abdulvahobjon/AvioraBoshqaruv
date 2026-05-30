import { useDroppable } from '@dnd-kit/core';
import { SortableContext, verticalListSortingStrategy } from '@dnd-kit/sortable';
import { cn } from '@/lib/utils/cn';
import { TASK_STATUS } from '@/lib/constants';
import { TaskCard } from './TaskCard';

export function KanbanColumn({ status, tasks, onCardClick }) {
  const { setNodeRef, isOver } = useDroppable({ id: `col:${status}` });
  const meta = TASK_STATUS[status];

  return (
    <div className="flex w-72 shrink-0 flex-col">
      <div className="mb-2 flex items-center justify-between px-1">
        <div className="flex items-center gap-2">
          <span className={cn('h-2 w-2 rounded-full', dotColor(meta?.tone))} />
          <span className="text-sm font-medium text-text-strong">{meta?.label || status}</span>
        </div>
        <span className="rounded-full bg-bg-elevation-2 px-2 text-xs text-text-sub">{tasks.length}</span>
      </div>

      <div
        ref={setNodeRef}
        className={cn(
          'flex min-h-[120px] flex-1 flex-col gap-2 rounded-lg border border-dashed p-2 transition-colors',
          isOver ? 'border-stroke-accent bg-bg-elevation-1-alt' : 'border-stroke-sub bg-bg-elevation-1',
        )}
      >
        <SortableContext items={tasks.map((t) => t.id)} strategy={verticalListSortingStrategy}>
          {tasks.map((t) => (
            <TaskCard key={t.id} task={t} onClick={onCardClick} />
          ))}
        </SortableContext>
        {tasks.length === 0 && <p className="py-4 text-center text-xs text-text-soft">Bo'sh</p>}
      </div>
    </div>
  );
}

function dotColor(tone) {
  const map = {
    success: 'bg-accent-sub',
    info: 'bg-accent-soft',
    error: 'bg-error-strong',
    neutral: 'bg-icon-soft',
  };
  return map[tone] || 'bg-icon-soft';
}
