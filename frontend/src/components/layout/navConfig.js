import {
  LayoutDashboard,
  Users,
  Briefcase,
  KanbanSquare,
  Wallet,
  Receipt,
  BarChart3,
  ScrollText,
  CalendarCheck,
  UserCog,
  Video,
  Banknote,
  FolderKanban,
  Trash2,
  History,
} from 'lucide-react';

const ALL = ['superadmin', 'admin', 'manager', 'employee', 'accountant', 'auditor'];

/**
 * Sidebar structure: standalone items and accordion groups.
 * Each leaf has `roles` (who sees it). A group is shown if it has ≥1 visible child.
 */
export const NAV = [
  { type: 'item', to: '/', label: 'Boshqaruv paneli', icon: LayoutDashboard, roles: ALL },
  { type: 'item', to: '/users', label: 'Foydalanuvchilar', icon: UserCog, roles: ['superadmin', 'admin'] },
  { type: 'item', to: '/clients', label: 'Mijozlar', icon: Users, roles: ['superadmin', 'admin', 'manager', 'auditor'] },
  {
    type: 'group',
    key: 'tasks',
    label: 'Vazifalar boshqaruvi',
    icon: FolderKanban,
    children: [
      { to: '/projects', label: 'Loyihalar', icon: Briefcase, roles: ['superadmin', 'admin', 'manager', 'employee', 'auditor'] },
      { to: '/tasks', label: 'Vazifalar', icon: KanbanSquare, roles: ['superadmin', 'admin', 'manager', 'employee', 'auditor'] },
      { to: '/meetings', label: "Yig'ilishlar", icon: Video, roles: ['superadmin', 'admin', 'manager', 'employee', 'auditor'] },
    ],
  },
  {
    type: 'group',
    key: 'finance',
    label: 'Moliya',
    icon: Wallet,
    children: [
      { to: '/finance', label: "Xarajat so'rovlari", icon: Wallet, roles: ['superadmin', 'admin', 'manager', 'employee', 'accountant', 'auditor'] },
      { to: '/expense-categories', label: 'Xarajat toifalari', icon: Receipt, roles: ['superadmin', 'admin'] },
      { to: '/payroll', label: 'Ish haqi', icon: Banknote, roles: ['superadmin', 'admin', 'accountant', 'manager', 'employee', 'auditor'] },
      { to: '/finance-history', label: 'Tarix', icon: History, roles: ['superadmin', 'admin', 'accountant', 'auditor'] },
    ],
  },
  {
    type: 'group',
    key: 'reports',
    label: 'Hisobotlar',
    icon: BarChart3,
    children: [
      { to: '/reports/employees', label: "Xodim bo'yicha", icon: UserCog, roles: ['superadmin', 'admin', 'accountant', 'auditor'] },
      { to: '/reports/projects', label: "Loyiha bo'yicha", icon: Briefcase, roles: ['superadmin', 'admin', 'manager', 'accountant', 'auditor'] },
      { to: '/reports/expenses', label: "Xarajat so'rovlari bo'yicha", icon: Receipt, roles: ['superadmin', 'admin', 'accountant', 'auditor'] },
      { to: '/reports/payroll', label: "Ish haqi bo'yicha", icon: Banknote, roles: ['superadmin', 'admin', 'accountant', 'auditor'] },
      { to: '/reports/tasks', label: "Vazifalar bo'yicha", icon: KanbanSquare, roles: ['superadmin', 'admin', 'manager', 'auditor'] },
    ],
  },
  { type: 'item', to: '/daily-plans', label: 'Kundalik rejalar', icon: CalendarCheck, roles: ALL },
  { type: 'item', to: '/audit', label: 'Audit', icon: ScrollText, roles: ['superadmin', 'admin', 'accountant', 'auditor'] },
  { type: 'item', to: '/trash', label: 'Chiqindi', icon: Trash2, roles: ['superadmin', 'admin'] },
];

/** Filter the nav tree for a role: keep visible items and groups with ≥1 visible child. */
export function navForRole(role) {
  const r = role || 'employee';
  const out = [];
  for (const node of NAV) {
    if (node.type === 'group') {
      const children = node.children.filter((c) => c.roles.includes(r));
      if (children.length) out.push({ ...node, children });
    } else if (node.roles.includes(r)) {
      out.push(node);
    }
  }
  return out;
}

/** Flat list of all leaf links a role can see (used for collapsed sidebar). */
export function leafLinks(role) {
  return navForRole(role).flatMap((n) => (n.type === 'group' ? n.children : [n]));
}

/**
 * Berilgan path uchun ruxsat etilgan rollar (route himoyasi uchun — yagona manba).
 * Detal sahifalar (masalan /projects/:id) bo'lim ildizidan rollarni meros qiladi.
 * null qaytsa — bu sidebar boshqarmaydigan route (masalan /settings) → barcha authed uchun ochiq.
 */
export function rolesForPath(pathname) {
  const leaves = [];
  for (const node of NAV) {
    if (node.type === 'group') leaves.push(...node.children);
    else leaves.push(node);
  }
  const hit = leaves.find((l) => pathname === l.to || (l.to !== '/' && pathname.startsWith(l.to + '/')));
  return hit ? hit.roles : null;
}

/**
 * Breadcrumb for the navbar: { group, groupTo, label, to } for a given path.
 * `to` — yorliq bosilganda o'tiladigan bo'lim ro'yxati (detal sahifadan ham qaytaradi).
 * `groupTo` — guruh nomi bosilganda o'tiladigan bo'lim (rolega ko'ra birinchi ko'rinadigan bola).
 */
export function breadcrumbForPath(pathname, role) {
  const matches = (to) => pathname === to || (to !== '/' && pathname.startsWith(to + '/'));
  const r = role || 'employee';
  for (const node of NAV) {
    if (node.type === 'group') {
      const child = node.children.find((c) => matches(c.to));
      if (child) {
        const visible = node.children.filter((c) => c.roles.includes(r));
        const groupTo = (visible[0] || child).to;
        return { group: node.label, groupTo, label: child.label, to: child.to };
      }
    } else if (matches(node.to)) {
      return { group: null, groupTo: null, label: node.label, to: node.to };
    }
  }
  // Routes not present in the sidebar nav:
  if (pathname.startsWith('/settings')) return { group: null, groupTo: null, label: 'Sozlamalar', to: '/settings' };
  if (pathname.startsWith('/trash')) return { group: null, groupTo: null, label: 'Chiqindi', to: '/trash' };
  return { group: null, groupTo: null, label: '', to: null };
}
