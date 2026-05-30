import {
  LayoutDashboard,
  Users,
  Briefcase,
  KanbanSquare,
  Wallet,
  Receipt,
  BarChart3,
  ScrollText,
  CheckSquare,
  UserCog,
  Video,
  Banknote,
  FolderKanban,
} from 'lucide-react';

const ALL = ['superadmin', 'admin', 'manager', 'employee', 'accountant'];

/**
 * Sidebar structure: standalone items and accordion groups.
 * Each leaf has `roles` (who sees it). A group is shown if it has ≥1 visible child.
 */
export const NAV = [
  { type: 'item', to: '/', label: 'Boshqaruv paneli', icon: LayoutDashboard, roles: ALL },
  { type: 'item', to: '/users', label: 'Foydalanuvchilar', icon: UserCog, roles: ['superadmin', 'admin'] },
  { type: 'item', to: '/clients', label: 'Mijozlar', icon: Users, roles: ['superadmin', 'admin', 'manager'] },
  {
    type: 'group',
    key: 'tasks',
    label: 'Vazifalar boshqaruvi',
    icon: FolderKanban,
    children: [
      { to: '/projects', label: 'Loyihalar', icon: Briefcase, roles: ['superadmin', 'admin', 'manager', 'employee'] },
      { to: '/tasks', label: 'Vazifalar', icon: KanbanSquare, roles: ['superadmin', 'admin', 'manager', 'employee'] },
      { to: '/meetings', label: "Yig'ilishlar", icon: Video, roles: ['superadmin', 'admin', 'manager', 'employee'] },
    ],
  },
  {
    type: 'group',
    key: 'finance',
    label: 'Moliya',
    icon: Wallet,
    children: [
      { to: '/finance', label: 'Balans va so\'rovlar', icon: Wallet, roles: ['superadmin', 'admin', 'manager', 'employee', 'accountant'] },
      { to: '/payroll', label: 'Oyliklar', icon: Banknote, roles: ['superadmin', 'admin', 'accountant', 'manager', 'employee'] },
      { to: '/expenses', label: 'Xarajatlar', icon: Receipt, roles: ['superadmin', 'admin', 'accountant'] },
    ],
  },
  { type: 'item', to: '/reports', label: 'Hisobotlar', icon: BarChart3, roles: ALL },
  { type: 'item', to: '/todos', label: 'Eslatmalar', icon: CheckSquare, roles: ALL },
  { type: 'item', to: '/audit', label: 'Audit', icon: ScrollText, roles: ['superadmin', 'admin', 'accountant'] },
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
