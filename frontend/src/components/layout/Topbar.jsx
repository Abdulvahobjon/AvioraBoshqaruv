import { Menu, ChevronRight } from 'lucide-react';
import { useLocation, Link } from 'react-router-dom';
import { NotificationBell } from './NotificationBell';
import { breadcrumbForPath } from './navConfig';
import { useAuthStore } from '@/store/authStore';

export function Topbar({ onMenuClick, onCollapseToggle }) {
  const { pathname } = useLocation();
  const role = useAuthStore((s) => s.user?.role);
  const bc = breadcrumbForPath(pathname, role);
  return (
    <header className="sticky top-0 z-20 flex h-16 items-center gap-3 border-b border-stroke-sub bg-bg-base px-4">
      <button aria-label="Menyuni ochish" className="rounded-md p-2 text-icon-sub hover:bg-bg-1-alt lg:hidden" onClick={onMenuClick}>
        <Menu className="h-5 w-5" />
      </button>
      <button aria-label="Yon panelni yig'ish/ochish" className="hidden rounded-md p-2 text-icon-sub hover:bg-bg-1-alt lg:block" onClick={onCollapseToggle}>
        <Menu className="h-5 w-5" />
      </button>

      {/* Breadcrumb — har bir qism bosilganda tegishli bo'limga o'tadi */}
      <div className="flex min-w-0 items-center gap-1.5 text-sm">
        {bc.group && (
          <>
            {bc.groupTo ? (
              <Link to={bc.groupTo} className="hidden truncate text-text-soft transition-colors hover:text-text-strong sm:inline">{bc.group}</Link>
            ) : (
              <span className="hidden truncate text-text-soft sm:inline">{bc.group}</span>
            )}
            <ChevronRight className="hidden h-4 w-4 shrink-0 text-icon-soft sm:inline" />
          </>
        )}
        {bc.to ? (
          <Link to={bc.to} className="truncate font-semibold text-text-strong transition-colors hover:text-text-accent">{bc.label}</Link>
        ) : (
          <span className="truncate font-semibold text-text-strong">{bc.label}</span>
        )}
      </div>

      <div className="ml-auto flex items-center gap-2">
        {/* Page-specific actions are portalled here by the active page. */}
        <div id="page-actions" className="flex flex-wrap items-center justify-end gap-2" />
        <NotificationBell />
      </div>
    </header>
  );
}
