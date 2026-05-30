import { Construction } from 'lucide-react';
import { PageHeader } from '@/components/shared/PageHeader';
import { EmptyState } from '@/components/shared/EmptyState';

/** Placeholder for modules built in later phases (tasks, finance, reports, ...). */
export function ComingSoonPage({ title }) {
  return (
    <div>
      <PageHeader title={title} />
      <EmptyState
        icon={Construction}
        title="Tez orada"
        description="Bu modul keyingi bosqichlarda to'liq ishlab chiqiladi (Kanban, Moliya, Hisobotlar va h.k.)."
      />
    </div>
  );
}
