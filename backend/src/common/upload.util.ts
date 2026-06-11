import { BadRequestException } from '@nestjs/common';
import { diskStorage } from 'multer';
import { extname } from 'path';

/**
 * Fayl yuklash uchun umumiy multer sozlamasi.
 * - Faqat rasm va hujjat turlari ruxsat etiladi.
 * - .svg/.html/.htm va boshqa skript-ijro etiluvchi turlar BLOKLANADI (stored-XSS oldini olish:
 *   /uploads static papkadan ochilganda brauzerda kod ishlamasligi uchun).
 */
const ALLOWED_MIME = new Set([
  'image/jpeg',
  'image/png',
  'image/gif',
  'image/webp',
  'application/pdf',
  'application/msword',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document', // .docx
  'application/vnd.ms-excel',
  'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet', // .xlsx
  'text/plain',
  'application/zip',
]);

const ALLOWED_EXT = new Set([
  '.jpg', '.jpeg', '.png', '.gif', '.webp',
  '.pdf', '.doc', '.docx', '.xls', '.xlsx', '.txt', '.zip',
]);

const storage = diskStorage({
  destination: process.env.UPLOAD_DIR || 'uploads',
  filename: (_req, file, cb) => {
    const unique = `${Date.now()}-${Math.round(Math.random() * 1e9)}`;
    cb(null, `${unique}${extname(file.originalname).toLowerCase()}`);
  },
});

const fileFilter = (_req: any, file: any, cb: any) => {
  const ext = extname(file.originalname || '').toLowerCase();
  if (ALLOWED_MIME.has(file.mimetype) && ALLOWED_EXT.has(ext)) {
    cb(null, true);
  } else {
    cb(new BadRequestException(`Bu fayl turi ruxsat etilmagan (${ext || file.mimetype}). Rasm yoki hujjat yuklang.`), false);
  }
};

/** maxMb — fayl hajmi chegarasi (MB). */
export function uploadOptions(maxMb = 10) {
  return { storage, fileFilter, limits: { fileSize: maxMb * 1024 * 1024 } };
}
