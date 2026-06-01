import { Menu, ChevronRight } from 'lucide-react';
import { useLocation } from 'react-router-dom';
import { NotificationBell } from './NotificationBell';
import { breadcrumbForPath } from './navConfig';

export function Topbar({ onMenuClick, onCollapseToggle }) {
  const { pathname } = useLocation();
  const bc = breadcrumbForPath(pathname);
  return (
    <header className="sticky top-0 z-20 flex h-16 items-center gap-3 border-b border-stroke-sub bg-bg-base px-4">
      <button className="rounded-md p-2 text-icon-sub hover:bg-bg-1-alt lg:hidden" onClick={onMenuClick}>
        <Menu className="h-5 w-5" />
      </button>
      <button className="hidden rounded-md p-2 text-icon-sub hover:bg-bg-1-alt lg:block" onClick={onCollapseToggle}>
        <Menu className="h-5 w-5" />
      </button>

      {/* Current page name */}
      <div className="flex min-w-0 items-center gap-1.5 text-sm">
        {bc.group && (
          <>
            <span className="hidden truncate text-text-soft sm:inline">{bc.group}</span>
            <ChevronRight className="hidden h-4 w-4 shrink-0 text-icon-soft sm:inline" />
          </>
        )}
        <span className="truncate font-semibold text-text-strong">{bc.label}</span>
      </div>

      <div className="ml-auto flex items-center gap-2">
        {/* Page-specific actions are portalled here by the active page. */}
        <div id="page-actions" className="flex flex-wrap items-center justify-end gap-2" />
        <NotificationBell />
      </div>
    </header>
  );
}
