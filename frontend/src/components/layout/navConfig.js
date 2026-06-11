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
  ClipboardList,
  Trash2,
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
  { type: 'item', to: '/applications', label: 'Arizalar', icon: ClipboardList, roles: ['superadmin', 'admin', 'manager'] },
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
      { to: '/finance', label: 'Balans va so\'rovlar', icon: Wallet, roles: ['superadmin', 'admin', 'manager', 'employee', 'accountant', 'auditor'] },
      { to: '/payroll', label: 'Oyliklar', icon: Banknote, roles: ['superadmin', 'admin', 'accountant', 'manager', 'employee', 'auditor'] },
      { to: '/expenses', label: 'Xarajatlar', icon: Receipt, roles: ['superadmin', 'admin', 'accountant', 'auditor'] },
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

/** Breadcrumb for the navbar: { group, label } for a given path (handles detail pages). */
export function breadcrumbForPath(pathname) {
  const matches = (to) => pathname === to || (to !== '/' && pathname.startsWith(to + '/'));
  for (const node of NAV) {
    if (node.type === 'group') {
      const child = node.children.find((c) => matches(c.to));
      if (child) return { group: node.label, label: child.label };
    } else if (matches(node.to)) {
      return { group: null, label: node.label };
    }
  }
  // Routes not present in the sidebar nav:
  if (pathname.startsWith('/settings')) return { group: null, label: 'Sozlamalar' };
  if (pathname.startsWith('/trash')) return { group: null, label: 'Chiqindi' };
  return { group: null, label: '' };
}
