import { Menu, Search } from 'lucide-react';
import { NotificationBell } from './NotificationBell';

export function Topbar({ onMenuClick, onCollapseToggle }) {
  return (
    <header className="sticky top-0 z-20 flex h-16 items-center gap-3 border-b border-stroke-sub bg-bg-base px-4">
      <button className="rounded-md p-2 text-icon-sub hover:bg-bg-1-alt lg:hidden" onClick={onMenuClick}>
        <Menu className="h-5 w-5" />
      </button>
      <button className="hidden rounded-md p-2 text-icon-sub hover:bg-bg-1-alt lg:block" onClick={onCollapseToggle}>
        <Menu className="h-5 w-5" />
      </button>

      {/* Global search */}
      <div className="relative hidden max-w-md flex-1 sm:block">
        <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-icon-soft" />
        <input
          placeholder="Qidirish..."
          className="h-9 w-full rounded-md border border-stroke-sub bg-bg-elevation-1 pl-9 pr-3 text-sm text-text-strong placeholder:text-text-soft focus:border-stroke-accent focus-visible:outline-none"
        />
      </div>

      <div className="ml-auto flex items-center gap-1">
        <NotificationBell />
      </div>
    </header>
  );
}
