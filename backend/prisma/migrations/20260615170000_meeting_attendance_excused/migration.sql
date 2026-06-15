-- MeetingAttendance.excused — tashkilotchi qarori: true=sababli, false=sababsiz, null=hal qilinmagan
ALTER TABLE "meeting_attendance" ADD COLUMN IF NOT EXISTS "excused" BOOLEAN;
