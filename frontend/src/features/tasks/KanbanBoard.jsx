import { useMemo } from 'react';
import { DragDropContext } from '@hello-pangea/dnd';
import { toast } from 'sonner';
import { KANBAN_COLUMNS } from '@/lib/constants';
import { KanbanColumn } from './KanbanColumn';
import { useChangeStatus } from './tasksApi';
import { apiError } from '@/lib/api/axios';

/** Trello-like board powered by @hello-pangea/dnd (react-beautiful-dnd fork). */
export function KanbanBoard({ tasks, onCardClick, onAddCard, canAdd }) {
  const changeStatus = useChangeStatus();

  const grouped = useMemo(() => {
    const g = Object.fromEntries(KANBAN_COLUMNS.map((c) => [c.status, []]));
    for (const t of tasks) (g[t.status] || (g[t.status] = [])).push(t);
    return g;
  }, [tasks]);

  const onDragEnd = (result) => {
    const { source, destination, draggableId } = result;
    if (!destination) return; // dropped outside any list
    // Only a column (status) change is persisted; same-column reordering snaps back.
    if (source.droppableId === destination.droppableId) return;
    changeStatus.mutate(
      { id: Number(draggableId), status: destination.droppableId },
      { onError: (err) => toast.error(apiError(err, 'Statusni o\'zgartirib bo\'lmadi')) },
    );
  };

  return (
    <DragDropContext onDragEnd={onDragEnd}>
      <div className="h-[calc(100vh-150px)] overflow-hidden rounded-xl bg-bg-1 p-2.5">
        {/* Mobil/planshetda ustunlar siqilmasin — gorizontal scroll bilan to'liq ko'rinadi. */}
        <div className="flex h-full gap-2 overflow-x-auto scrollbar-none">
          {KANBAN_COLUMNS.map((col) => (
            <KanbanColumn
              key={col.status}
              column={col}
              tasks={grouped[col.status] || []}
              onCardClick={onCardClick}
              onAddCard={onAddCard}
              canAdd={canAdd}
            />
          ))}
        </div>
      </div>
    </DragDropContext>
  );
}
