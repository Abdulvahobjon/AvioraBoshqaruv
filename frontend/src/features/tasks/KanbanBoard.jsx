import { useMemo, useState } from 'react';
import { DragDropContext } from '@hello-pangea/dnd';
import { toast } from 'sonner';
import { KANBAN_COLUMNS } from '@/lib/constants';
import { KanbanColumn } from './KanbanColumn';
import { useChangeStatus } from './tasksApi';
import { apiError } from '@/lib/api/axios';

// Statusni faqat OLDINGA siljitish mumkin: todo→in_progress→done→checked→production.
// 'rejected' (review natijasi) va 'overdue' (avtomatik) bu zanjirda emas — ularga sudrab bo'lmaydi.
const PIPELINE = ['todo', 'in_progress', 'done', 'checked', 'production'];

/** Manbadan maqsadga oldinga siljish ruxsat etilganmi? (orqaga = taqiqlangan). */
function isForwardMove(from, to) {
  if (from === to) return true; // bir ustun ichida (no-op)
  const ti = PIPELINE.indexOf(to);
  if (ti === -1) return false; // rejected/overdue ga sudrab bo'lmaydi
  const fi = PIPELINE.indexOf(from);
  if (fi === -1) return true; // rejected/overdue dan pipeline ga tiklash mumkin
  return ti > fi; // faqat keyingi bosqichlarga
}

/** Trello-like board powered by @hello-pangea/dnd (react-beautiful-dnd fork). */
export function KanbanBoard({ tasks, onCardClick, onAddCard, canAdd }) {
  const changeStatus = useChangeStatus();
  const [draggingFrom, setDraggingFrom] = useState(null); // sudralayotgan kartaning manba statusi

  const grouped = useMemo(() => {
    const g = Object.fromEntries(KANBAN_COLUMNS.map((c) => [c.status, []]));
    for (const t of tasks) (g[t.status] || (g[t.status] = [])).push(t);
    return g;
  }, [tasks]);

  const onDragStart = (start) => setDraggingFrom(start.source.droppableId);

  const onDragEnd = (result) => {
    setDraggingFrom(null);
    const { source, destination, draggableId } = result;
    if (!destination) return; // dropped outside any list
    if (source.droppableId === destination.droppableId) return; // same column — reorder snaps back
    // Faqat oldinga (himoya: isDropDisabled ham bloklaydi, bu esa zaxira tekshiruv).
    if (!isForwardMove(source.droppableId, destination.droppableId)) {
      toast.error('Statusni faqat oldinga siljitish mumkin — orqaga qaytarib bo\'lmaydi');
      return;
    }
    changeStatus.mutate(
      { id: Number(draggableId), status: destination.droppableId },
      { onError: (err) => toast.error(apiError(err, 'Statusni o\'zgartirib bo\'lmadi')) },
    );
  };

  return (
    <DragDropContext onDragStart={onDragStart} onDragEnd={onDragEnd}>
      {/* Shaffof tashqi konteyner — sahifa foni ko'rinadi; ustunlar kulrang qoladi. */}
      <div className="h-full overflow-hidden">
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
              // Sudrash paytida faqat oldinga ruxsat etilgan ustunlar yoniq qoladi.
              dropDisabled={draggingFrom != null && !isForwardMove(draggingFrom, col.status)}
            />
          ))}
        </div>
      </div>
    </DragDropContext>
  );
}
