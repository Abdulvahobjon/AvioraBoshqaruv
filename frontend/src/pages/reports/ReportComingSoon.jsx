import { BarChart3 } from 'lucide-react';
import { PageHeader } from '@/components/shared/PageHeader';
import { EmptyState } from '@/components/shared/EmptyState';

/** Hisobotlar bo'limi uchun vaqtinchalik placeholder (keyingi bosqichlarda quriladi). */
export function ReportComingSoon({ title = 'Hisobot' }) {
  return (
    <div className="flex h-[calc(100vh-7rem)] flex-col">
      <PageHeader title={title} subtitle="Bu hisobot keyingi bosqichda shakllantiriladi" />
      <div className="min-h-0 flex-1">
        <EmptyState fill icon={BarChart3} title="Tez orada" description="Ushbu hisobot Xodim bo'yicha hisobot tasdiqlanganidan so'ng xuddi shu uslubda tayyorlanadi." />
      </div>
    </div>
  );
}
