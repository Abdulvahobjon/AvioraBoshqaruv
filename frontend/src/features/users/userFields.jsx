import { toast } from 'sonner';
import { Upload, FileText, Camera, X, ExternalLink } from 'lucide-react';
import { Input, Select } from '@/components/ui/Input';
import { FormField } from '@/components/ui/FormField';
import { cn } from '@/lib/utils/cn';
import { ROLE_LABELS } from '@/lib/constants';
import { apiError } from '@/lib/api/axios';
import { UZ_REGIONS, districtsOf } from '@/lib/uzRegions';
import { useUploadUserFile } from './usersApi';

// Uploaded files are served by the backend; in dev a /uploads proxy points to it.
export const fileUrl = (p) => (p ? (import.meta.env.VITE_API_URL || '') + p : '');

export const cardDigits = (v) => (v || '').replace(/\D/g, '').slice(0, 16);
export const formatCard = (v) => cardDigits(v).replace(/(.{4})/g, '$1 ').trim();

/** 16-digit formatted bank card input. */
export function CardInput({ value, onChange, placeholder = '0000 0000 0000 0000' }) {
  return (
    <Input
      inputMode="numeric"
      maxLength={19}
      placeholder={placeholder}
      value={value || ''}
      onChange={(e) => onChange(formatCard(e.target.value))}
    />
  );
}

/** Region + dependent District — renders two labelled FormFields (drop into a grid). */
export function RegionDistrict({ region, district, onRegion, onDistrict }) {
  const districts = districtsOf(region);
  return (
    <>
      <FormField label="Viloyat">
        <Select value={region || ''} onChange={(e) => { onRegion(e.target.value); onDistrict(''); }}>
          <option value="">Viloyatni tanlang</option>
          {UZ_REGIONS.map((r) => <option key={r.name} value={r.name}>{r.name}</option>)}
        </Select>
      </FormField>
      <FormField label="Tuman">
        <Select value={district || ''} onChange={(e) => onDistrict(e.target.value)} disabled={!region}>
          <option value="">Tuman tanlang</option>
          {districts.map((d) => <option key={d} value={d}>{d}</option>)}
        </Select>
      </FormField>
    </>
  );
}

const isImageUrl = (u) => /\.(png|jpe?g|gif|webp|bmp|svg|avif)$/i.test(u || '');

/** File upload (passport image/pdf). Stores the returned URL.
 *  Fayl yuklangach uni KO'RISH mumkin: rasm bo'lsa bosilganda to'liq ekranda ochiladi
 *  (Lightbox), PDF bo'lsa yangi oynada. Yonida "O'zgartirish" va "O'chirish".
 *  `uploadHook` — ixtiyoriy: profil o'zining (/auth/upload) hook'ini uzatishi mumkin. */
export function FileUpload({ value, onChange, accept, label = 'Rasm yuklash', uploadHook }) {
  const fallback = useUploadUserFile();
  const upload = uploadHook || fallback;
  const onPick = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    try {
      const { url } = await upload.mutateAsync(file);
      onChange(url);
    } catch (err) {
      toast.error(apiError(err, 'Yuklab bo\'lmadi'));
    }
    e.target.value = '';
  };

  // Yuklangan fayl bor — ko'rish + o'zgartirish + o'chirish.
  if (value && !upload.isPending) {
    const img = isImageUrl(value);
    return (
      <div className="flex h-10 items-center justify-between gap-2 rounded-md border border-stroke-sub px-2 text-sm">
        {img ? (
          // Rasm: thumbnail bosilganda to'liq ekran (Lightbox `img[data-zoomable]` ni ushlaydi).
          <button type="button" className="flex min-w-0 items-center gap-2 text-left text-text-strong" title="Ko'rish uchun bosing">
            <img src={fileUrl(value)} data-zoomable alt="" className="h-7 w-7 shrink-0 cursor-zoom-in rounded border border-stroke-sub object-cover" />
            <span className="truncate">Rasmni ko'rish</span>
          </button>
        ) : (
          // PDF/boshqa: yangi oynada ochish.
          <a href={fileUrl(value)} target="_blank" rel="noreferrer" className="flex min-w-0 items-center gap-2 text-text-strong hover:text-text-accent hover:underline" title="Faylni ochish">
            <FileText className="h-4 w-4 shrink-0 text-icon-accent" />
            <span className="truncate">Faylni ochish</span>
            <ExternalLink className="h-3.5 w-3.5 shrink-0 text-icon-soft" />
          </a>
        )}
        <div className="flex shrink-0 items-center gap-0.5">
          <label className="cursor-pointer rounded px-2 py-1 text-xs text-text-sub transition-colors hover:bg-bg-1-alt hover:text-text-strong">
            O'zgartirish
            <input type="file" accept={accept} className="hidden" onChange={onPick} />
          </label>
          <button type="button" onClick={() => onChange('')} className="rounded p-1.5 text-error-strong transition-colors hover:bg-error-soft" title="O'chirish" aria-label="O'chirish">
            <X className="h-3.5 w-3.5" />
          </button>
        </div>
      </div>
    );
  }

  return (
    <label className="flex h-10 cursor-pointer items-center justify-center gap-2 rounded-md border border-dashed border-stroke-strong px-3 text-sm transition-colors hover:bg-bg-1-alt">
      {upload.isPending ? (
        <span className="text-text-soft">Yuklanmoqda…</span>
      ) : (
        <span className="flex items-center gap-2 text-text-sub"><Upload className="h-4 w-4" /> {label}</span>
      )}
      <input type="file" accept={accept} className="hidden" onChange={onPick} />
    </label>
  );
}

/** Square avatar upload tile. `uploadHook` — ixtiyoriy maxsus upload mutation (profil uchun). */
export function AvatarUpload({ value, onChange, size = 'h-16 w-16', uploadHook }) {
  const fallback = useUploadUserFile();
  const upload = uploadHook || fallback;
  const onPick = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    try {
      const { url } = await upload.mutateAsync(file);
      onChange(url);
    } catch (err) {
      toast.error(apiError(err, 'Yuklab bo\'lmadi'));
    }
    e.target.value = '';
  };
  // With an image: the photo is zoomable (full-screen on click); a corner camera lets you change it.
  if (value) {
    return (
      <div className={cn('group relative shrink-0 overflow-hidden rounded-xl border border-stroke-sub', size)}>
        <img src={fileUrl(value)} alt="" data-zoomable className="h-full w-full cursor-zoom-in object-cover" />
        <label className="absolute inset-x-0 bottom-0 flex cursor-pointer items-center justify-center gap-1 bg-black/55 py-1 text-[10px] text-white opacity-0 transition-opacity group-hover:opacity-100">
          <Camera className="h-3.5 w-3.5" /> {upload.isPending ? '...' : "O'zgartirish"}
          <input type="file" accept="image/*" className="hidden" onChange={onPick} />
        </label>
      </div>
    );
  }
  return (
    <label className={cn('relative flex shrink-0 cursor-pointer items-center justify-center overflow-hidden rounded-xl border border-stroke-sub bg-bg-1-alt text-icon-soft transition-colors hover:bg-bg-2', size)}>
      <span className="flex flex-col items-center gap-1 text-center text-[10px] leading-tight">
        <Camera className="h-5 w-5" />
        <span className="whitespace-nowrap">{upload.isPending ? 'Yuklanmoqda' : 'Yuklash'}</span>
      </span>
      <input type="file" accept="image/*" className="hidden" onChange={onPick} />
    </label>
  );
}

/** Rollarni ko'p tanlovli select (dropdown) bilan tanlash. `value` — birlashgan massiv
 *  ([asosiy, ...qo'shimcha]): birinchi tanlangan rol asosiy (kirishda standart) bo'ladi.
 *  `roleKeys` — ko'rsatiladigan rollar (superadmin ko'rinishi filtri tashqarida hal qilinadi).
 *  Bir nechta rol qo'shish mumkin. */
export function RolesField({ value = [], onChange, roleKeys }) {
  const primary = value[0];
  // Yopiq trigger'da faqat asosiy rol; bir nechta bo'lsa qolganlari soni " +N" ko'rinadi.
  const summary = (vals) => {
    const label = ROLE_LABELS[vals[0]] || vals[0];
    return vals.length > 1 ? `${label} +${vals.length - 1}` : label;
  };
  return (
    <Select multiple value={value} onChange={onChange} placeholder="Rollarni tanlang" summary={summary}>
      {roleKeys.map((k) => (
        <option key={k} value={k}>{`${ROLE_LABELS[k]}${k === primary ? ' (asosiy)' : ''}`}</option>
      ))}
    </Select>
  );
}

/** UZS amount with space thousands + 2 decimals, no suffix (e.g. "10 000 000.00").
 *  BigInt arifmetikasi — maosh/balans katta bo'lsa (>90 trln) Number aniqligi yo'qolmaydi. */
export function moneyUZS(tiyin) {
  let big;
  try {
    big = typeof tiyin === 'bigint' ? tiyin : BigInt(tiyin ?? 0);
  } catch {
    big = BigInt(Math.round(Number(tiyin) || 0));
  }
  const neg = big < 0n;
  if (neg) big = -big;
  const whole = new Intl.NumberFormat('en-US').format(big / 100n).replace(/,/g, ' ');
  const cents = (big % 100n).toString().padStart(2, '0');
  return `${neg ? '-' : ''}${whole}.${cents}`;
}
