import { Badge } from '@/components/ui/Badge';
import { cn } from '@/lib/utils/cn';
import { meetingStatus } from './meetingStatus';

/** Yig'ilish holatini boy ko'rsatadi: Yakunlangan / Muddati o'tgan / Davom etmoqda / Bugun / Tez orada / Rejada. */
export function MeetingStatusBadge({ meeting, className }) {
  const s = meetingStatus(meeting);
  return (
    <Badge tone={s.tone} className={cn('!bg-transparent px-0', className)}>
      {s.live && <span className="mr-1.5 inline-block h-1.5 w-1.5 animate-pulse rounded-full bg-current" />}
      {s.label}
    </Badge>
  );
}
