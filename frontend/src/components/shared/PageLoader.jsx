import { Loader2 } from 'lucide-react';

/** Fallback shown while a lazily-loaded route chunk is fetching. */
export function PageLoader() {
  return (
    <div className="flex h-[60vh] items-center justify-center">
      <Loader2 className="h-7 w-7 animate-spin text-icon-accent" />
    </div>
  );
}
