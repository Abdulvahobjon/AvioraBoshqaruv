import { useState, useRef, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { NavLink, useNavigate, useLocation } from 'react-router-dom';
import { AnimatePresence, motion } from 'framer-motion';
import { Plane, X, ChevronDown, Sun, User, LogOut } from 'lucide-react';
import { cn } from '@/lib/utils/cn';
import { useAuthStore } from '@/store/authStore';
import { useThemeStore } from '@/store/themeStore';
import { Avatar } from '@/components/ui/Avatar';
import { Switch } from '@/components/ui/Switch';
import { ROLE_LABELS } from '@/lib/constants';
import { navForRole, leafLinks } from './navConfig';

export function Sidebar({ collapsed, mobileOpen, onMobileClose, onExpand }) {
  const user = useAuthStore((s) => s.user);
  const role = user?.role || 'employee';
  const items = navForRole(role);

  return (
    <>
      {mobileOpen && <div className="fixed inset-0 z-30 bg-black/40 lg:hidden" onClick={onMobileClose} />}

      <aside
        onClick={collapsed ? () => onExpand?.() : undefined}
        title={collapsed ? 'Ochish uchun bosing' : undefined}
        className={cn(
          'fixed inset-y-0 left-0 z-40 flex flex-col border-r border-stroke-sub bg-bg-1 transition-all duration-200',
          collapsed ? 'w-[68px] cursor-pointer' : 'w-64',
          mobileOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0',
        )}
      >
        {/* Logo */}
        <div className="flex h-16 items-center gap-2.5 border-b border-stroke-sub px-4">
          <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-accent-strong">
            <Plane className="h-5 w-5 text-text-white" />
          </div>
          {!collapsed && (
            <div className="min-w-0">
              <p className="truncate text-sm font-semibold text-text-strong">Aviora</p>
              <p className="truncate text-xs text-text-soft">Boshqaruv tizimi</p>
            </div>
          )}
          <button className="ml-auto lg:hidden" onClick={onMobileClose}>
            <X className="h-5 w-5 text-icon-sub" />
          </button>
        </div>

        {/* Nav */}
        <nav className="flex-1 space-y-1 overflow-y-auto p-3 scrollbar-none">
          {collapsed ? (
            // Collapsed: flat icon-only links
            leafLinks(role).map((item) => (
              <SideLink key={item.to} item={item} collapsed onMobileClose={onMobileClose} />
            ))
          ) : (
            <AccordionNav items={items} onMobileClose={onMobileClose} />
          )}
        </nav>

        {/* User block (bottom) */}
        <UserBlock user={user} collapsed={collapsed} onNavigate={onMobileClose} />
      </aside>
    </>
  );
}

/** A single nav leaf link. `nested` indents it inside a group. */
function SideLink({ item, collapsed, nested, onMobileClose }) {
  return (
    <NavLink
      to={item.to}
      end={item.to === '/'}
      onClick={onMobileClose}
      className={({ isActive }) =>
        cn(
          'flex items-center gap-3 rounded-md text-sm font-medium transition-colors',
          collapsed ? 'justify-center px-0 py-2.5' : nested ? 'px-3 py-2' : 'px-3 py-2.5',
          isActive
            ? nested ? 'bg-bg-2 text-text-accent' : 'bg-accent-strong text-text-white'
            : 'text-text-sub hover:bg-bg-2 hover:text-text-strong',
        )
      }
      title={collapsed ? item.label : undefined}
    >
      {!nested && <item.icon className="h-5 w-5 shrink-0" />}
      {!collapsed && <span className={cn('truncate', nested && 'pl-1')}>{item.label}</span>}
    </NavLink>
  );
}

/** Accordion nav: only one group open at a time, auto-opens the active route's group. */
function AccordionNav({ items, onMobileClose }) {
  const location = useLocation();
  const groupOf = (path) =>
    items.find((n) => n.type === 'group' && n.children.some((c) => path === c.to || path.startsWith(c.to + '/')))?.key;
  const [open, setOpen] = useState(() => groupOf(location.pathname) || null);

  useEffect(() => {
    const g = groupOf(location.pathname);
    if (g) setOpen(g);
  }, [location.pathname]); // eslint-disable-line react-hooks/exhaustive-deps

  return (
    <>
      {items.map((node) =>
        node.type === 'group' ? (
          <NavGroup
            key={node.key}
            group={node}
            open={open === node.key}
            onToggle={() => setOpen((o) => (o === node.key ? null : node.key))}
            location={location}
            onMobileClose={onMobileClose}
          />
        ) : (
          <SideLink key={node.to} item={node} onMobileClose={onMobileClose} />
        ),
      )}
    </>
  );
}

function NavGroup({ group, open, onToggle, location, onMobileClose }) {
  const hasActive = group.children.some((c) => location.pathname === c.to || location.pathname.startsWith(c.to + '/'));
  return (
    <div>
      <button
        onClick={onToggle}
        className={cn(
          'flex w-full items-center gap-3 rounded-md px-3 py-2.5 text-sm font-medium transition-colors',
          hasActive
            ? 'bg-accent-strong text-text-white'
            : 'text-text-sub hover:bg-bg-2 hover:text-text-strong',
        )}
      >
        <group.icon className="h-5 w-5 shrink-0" />
        <span className="flex-1 truncate text-left">{group.label}</span>
        <ChevronDown className={cn('h-4 w-4 transition-transform duration-200', open && 'rotate-180', hasActive ? 'text-text-white' : 'text-icon-soft')} />
      </button>

      <AnimatePresence initial={false}>
        {open && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.24, ease: [0.4, 0, 0.2, 1] }}
            className="overflow-hidden"
          >
            <div className="mt-1 space-y-1 pl-4">
              {group.children.map((c) => (
                <SideLink key={c.to} item={c} nested onMobileClose={onMobileClose} />
              ))}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

function UserBlock({ user, collapsed, onNavigate }) {
  const [open, setOpen] = useState(false);
  const [coords, setCoords] = useState({ left: 0, bottom: 0, width: 248 });
  const btnRef = useRef(null);
  const menuRef = useRef(null);
  const navigate = useNavigate();
  const logout = useAuthStore((s) => s.logout);
  const { theme, toggle } = useThemeStore();

  useEffect(() => {
    if (!open) return;
    const onClick = (e) => {
      if (menuRef.current?.contains(e.target) || btnRef.current?.contains(e.target)) return;
      setOpen(false);
    };
    document.addEventListener('mousedown', onClick);
    return () => document.removeEventListener('mousedown', onClick);
  }, [open]);

  const openMenu = () => {
    const r = btnRef.current.getBoundingClientRect();
    // Position fully to the RIGHT of the sidebar (outside it), bottom-aligned to the user block.
    setCoords({ left: r.right + 10, bottom: window.innerHeight - r.bottom, width: 248 });
    setOpen((o) => !o);
  };

  return (
    <div className="border-t border-stroke-sub p-3">
      {createPortal(
        <AnimatePresence>
          {open && (
            <motion.div
              ref={menuRef}
              initial={{ opacity: 0, x: -8, scale: 0.98 }}
              animate={{ opacity: 1, x: 0, scale: 1 }}
              exit={{ opacity: 0, x: -8, scale: 0.98 }}
              transition={{ duration: 0.16 }}
              style={{ position: 'fixed', left: coords.left, bottom: coords.bottom, width: coords.width, zIndex: 60 }}
              className="overflow-hidden rounded-xl border border-stroke-sub bg-bg-base shadow-elevated"
            >
              <div className="flex items-center gap-2.5 border-b border-stroke-sub px-4 py-3">
                <Avatar name={user?.fullName} src={user?.avatar} size="md" />
                <div className="min-w-0">
                  <p className="truncate text-sm font-medium text-text-strong">{user?.fullName}</p>
                  <p className="truncate text-xs text-text-soft">{ROLE_LABELS[user?.role]}</p>
                </div>
              </div>

              <div className="flex items-center justify-between px-4 py-3">
                <span className="flex items-center gap-2.5 text-sm text-text-sub">
                  <Sun className="h-4 w-4 text-icon-sub" /> Kunduzgi mavzu
                </span>
                <Switch checked={theme === 'light'} onChange={toggle} />
              </div>

              <button
                onClick={() => { setOpen(false); onNavigate?.(); navigate('/settings'); }}
                className="flex w-full items-center gap-2.5 border-t border-stroke-sub px-4 py-3 text-sm text-text-sub transition-colors hover:bg-bg-1-alt"
              >
                <User className="h-4 w-4 text-icon-sub" /> Shaxsiy kabinet
              </button>

              <button
                onClick={() => { logout(); navigate('/login'); }}
                className="flex w-full items-center gap-2.5 border-t border-stroke-sub px-4 py-3 text-sm font-medium text-error-strong transition-colors hover:bg-error-soft"
              >
                <LogOut className="h-4 w-4" /> Chiqish
              </button>
            </motion.div>
          )}
        </AnimatePresence>,
        document.body,
      )}

      <button
        ref={btnRef}
        onClick={collapsed ? undefined : openMenu}
        className={cn('flex w-full items-center gap-2.5 rounded-lg p-2 transition-colors hover:bg-bg-2', collapsed && 'justify-center')}
        title={collapsed ? user?.fullName : undefined}
      >
        <Avatar name={user?.fullName} src={user?.avatar} size="md" />
        {!collapsed && (
          <>
            <div className="min-w-0 flex-1 text-left">
              <p className="truncate text-sm font-medium text-text-strong">{user?.fullName}</p>
              <p className="truncate text-xs text-text-soft">{ROLE_LABELS[user?.role]}</p>
            </div>
            <ChevronDown className={cn('h-4 w-4 text-icon-soft transition-transform', open && 'rotate-180')} />
          </>
        )}
      </button>
    </div>
  );
}
