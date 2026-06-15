import { Droppable } from '@hello-pangea/dnd';
import { Plus } from 'lucide-react';
import { cn } from '@/lib/utils/cn';
import { TaskCard } from './TaskCard';

/** Trello-style list: fixed-width grey column with a header, a droppable card area and an add footer. */
export function KanbanColumn({ column, tasks, onCardClick, actions, onAddCard, canAdd, dropDisabled = false }) {
  return (
    <div
      className={cn(
        'flex h-full min-w-[260px] flex-1 flex-col rounded-xl bg-bg-2 transition-opacity',
        dropDisabled && 'opacity-40', // sudrash paytida orqaga/ruxsatsiz ustun xiralashadi
      )}
    >
      {/* Header */}
      <div className="flex items-center gap-2 px-3 pt-2.5 pb-1.5">
        <span className="h-2.5 w-2.5 shrink-0 rounded-full" style={{ background: column.dot }} />
        <span className="truncate text-sm font-semibold text-text-strong">{column.label}</span>
        <span className="ml-auto flex h-5 min-w-5 items-center justify-center rounded-full bg-bg-3 px-1.5 text-xs font-semibold text-text-sub">
          {tasks.length}
        </span>
      </div>

      {/* Droppable card area */}
      <Droppable droppableId={column.status} isDropDisabled={dropDisabled}>
        {(provided, snapshot) => (
          <div
            ref={provided.innerRef}
            {...provided.droppableProps}
            className={cn(
              'min-h-[8px] flex-1 space-y-2 overflow-y-auto px-2 py-1 scrollbar-none',
              snapshot.isDraggingOver && 'rounded-lg bg-bg-2-alt',
            )}
          >
            {tasks.length === 0 && !snapshot.isDraggingOver && (
              <div className="flex min-h-[60px] items-center justify-center rounded-lg border border-dashed border-stroke-sub/60 px-3 py-4 text-center text-xs text-text-soft">
                Vazifa yo'q
              </div>
            )}
            {tasks.map((t, i) => (
              <TaskCard key={t.id} task={t} index={i} onClick={onCardClick} actions={actions} />
            ))}
            {provided.placeholder}
          </div>
        )}
      </Droppable>

      {/* Add footer */}
      {canAdd && (
        <button
          onClick={() => onAddCard?.(column.status)}
          className="m-2 flex items-center gap-1.5 rounded-md px-2 py-1.5 text-sm font-medium text-text-sub transition-colors hover:bg-bg-3 hover:text-text-strong"
        >
          <Plus className="h-4 w-4" /> Karta qo'shish
        </button>
      )}
    </div>
  );
}
