import { SetMetadata } from '@nestjs/common';

export const AUDITOR_CAN_WRITE_KEY = 'auditorCanWrite';

/**
 * Nazoratchi (auditor) odatda read-only. Bu dekorator qo'yilgan endpoint(lar)da
 * auditor yozish (mutatsiya) qila oladi — masalan task QA (checked/rejected) va audit xulosa.
 */
export const AuditorCanWrite = () => SetMetadata(AUDITOR_CAN_WRITE_KEY, true);
