import { useState } from 'react';
import { toast } from 'sonner';
import { Copy, Check } from 'lucide-react';
import { cn } from '@/lib/utils/cn';

/**
 * Bosilganda UID'ni (yoki istalgan qisqa matnni) clipboard'ga nusxalaydi.
 * Klikni yutadi (stopPropagation) — qator/karta bosilishini ishga tushirmaydi.
 */
export function CopyId({ value, className, icon = true }) {
  const [copied, setCopied] = useState(false);
  if (!value) return <span className={cn('font-mono text-text-soft', className)}>—</span>;

  const onCopy = (e) => {
    e.stopPropagation();
    e.preventDefault();
    navigator.clipboard?.writeText(String(value));
    setCopied(true);
    toast.success('Nusxalandi');
    setTimeout(() => setCopied(false), 1200);
  };

  return (
    <button
      type="button"
      onClick={onCopy}
      title="Nusxalash uchun bosing"
      className={cn('group inline-flex items-center gap-1 font-mono transition-colors hover:text-text-accent', className)}
    >
      {value}
      {icon && (copied
        ? <Check className="h-3 w-3 shrink-0 text-success-strong" />
        : <Copy className="h-3 w-3 shrink-0 opacity-0 transition-opacity group-hover:opacity-100" />)}
    </button>
  );
}
