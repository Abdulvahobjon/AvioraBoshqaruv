import { toast } from 'sonner';
import { Upload, FileText, Camera } from 'lucide-react';
import { Input, Select } from '@/components/ui/Input';
import { FormField } from '@/components/ui/FormField';
import { cn } from '@/lib/utils/cn';
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

/** File upload (passport image/pdf). Stores the returned URL. */
export function FileUpload({ value, onChange, accept, label = 'Rasm yuklash' }) {
  const upload = useUploadUserFile();
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
  return (
    <label className="flex h-10 cursor-pointer items-center justify-center gap-2 rounded-md border border-dashed border-stroke-strong px-3 text-sm transition-colors hover:bg-bg-1-alt">
      {upload.isPending ? (
        <span className="text-text-soft">Yuklanmoqda…</span>
      ) : value ? (
        <span className="flex items-center gap-2 text-text-strong"><FileText className="h-4 w-4 text-icon-accent" /> Fayl yuklandi</span>
      ) : (
        <span className="flex items-center gap-2 text-text-sub"><Upload className="h-4 w-4" /> {label}</span>
      )}
      <input type="file" accept={accept} className="hidden" onChange={onPick} />
    </label>
  );
}

/** Square avatar upload tile. */
export function AvatarUpload({ value, onChange, size = 'h-16 w-16' }) {
  const upload = useUploadUserFile();
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
      <span className="flex flex-col items-center gap-1 text-[11px]">
        <Camera className="h-5 w-5" />
        {upload.isPending ? 'Yuklanmoqda' : 'Rasm yuklash'}
      </span>
      <input type="file" accept="image/*" className="hidden" onChange={onPick} />
    </label>
  );
}

/** UZS amount with space thousands + 2 decimals, no suffix (e.g. "10 000 000.00"). */
export function moneyUZS(tiyin) {
  const n = Number(tiyin || 0) / 100;
  return n.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 }).replace(/,/g, ' ');
}
