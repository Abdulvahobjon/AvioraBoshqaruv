import { lazy, Suspense } from 'react';
import { createBrowserRouter, Navigate } from 'react-router-dom';
import { AppLayout } from '@/components/layout/AppLayout';
import { RequireAuth, RequireRole } from './guards';
import { PageLoader } from '@/components/shared/PageLoader';
import { LoginPage } from '@/pages/LoginPage';

// ── Lazy-loaded route pages (code-splitting → smaller initial bundle) ──
const lazyPage = (importer, name) => lazy(() => importer().then((m) => ({ default: m[name] })));

const DashboardPage = lazyPage(() => import('@/pages/DashboardPage'), 'DashboardPage');
const ClientsPage = lazyPage(() => import('@/pages/clients/ClientsPage'), 'ClientsPage');
const ClientDetailPage = lazyPage(() => import('@/pages/clients/ClientDetailPage'), 'ClientDetailPage');
const ProjectsPage = lazyPage(() => import('@/pages/projects/ProjectsPage'), 'ProjectsPage');
const ProjectDetailPage = lazyPage(() => import('@/pages/projects/ProjectDetailPage'), 'ProjectDetailPage');
const TasksPage = lazyPage(() => import('@/pages/tasks/TasksPage'), 'TasksPage');
const MeetingsPage = lazyPage(() => import('@/pages/meetings/MeetingsPage'), 'MeetingsPage');
const FinancePage = lazyPage(() => import('@/pages/finance/FinancePage'), 'FinancePage');
const PayrollPage = lazyPage(() => import('@/pages/payroll/PayrollPage'), 'PayrollPage');
const ExpensesPage = lazyPage(() => import('@/pages/expenses/ExpensesPage'), 'ExpensesPage');
const ReportsPage = lazyPage(() => import('@/pages/reports/ReportsPage'), 'ReportsPage');
const TodosPage = lazyPage(() => import('@/pages/todos/TodosPage'), 'TodosPage');
const AuditPage = lazyPage(() => import('@/pages/audit/AuditPage'), 'AuditPage');
const UsersPage = lazyPage(() => import('@/pages/users/UsersPage'), 'UsersPage');
const UserDetailPage = lazyPage(() => import('@/pages/users/UserDetailPage'), 'UserDetailPage');
const SettingsPage = lazyPage(() => import('@/pages/SettingsPage'), 'SettingsPage');

const S = (el) => <Suspense fallback={<PageLoader />}>{el}</Suspense>;

export const router = createBrowserRouter([
  { path: '/login', element: <LoginPage /> },
  {
    path: '/',
    element: (
      <RequireAuth>
        <AppLayout />
      </RequireAuth>
    ),
    children: [
      { index: true, element: S(<DashboardPage />) },

      { path: 'clients', element: <RequireRole roles={['superadmin', 'admin', 'manager']}>{S(<ClientsPage />)}</RequireRole> },
      { path: 'clients/:id', element: <RequireRole roles={['superadmin', 'admin', 'manager']}>{S(<ClientDetailPage />)}</RequireRole> },

      { path: 'projects', element: S(<ProjectsPage />) },
      { path: 'projects/:id', element: S(<ProjectDetailPage />) },

      { path: 'tasks', element: S(<TasksPage />) },
      { path: 'meetings', element: S(<MeetingsPage />) },
      { path: 'finance', element: S(<FinancePage />) },
      { path: 'payroll', element: <RequireRole roles={['superadmin', 'admin', 'accountant', 'manager', 'employee']}>{S(<PayrollPage />)}</RequireRole> },
      { path: 'expenses', element: <RequireRole roles={['superadmin', 'admin', 'accountant']}>{S(<ExpensesPage />)}</RequireRole> },
      { path: 'reports', element: S(<ReportsPage />) },
      { path: 'todos', element: S(<TodosPage />) },
      { path: 'audit', element: <RequireRole roles={['superadmin', 'admin', 'accountant']}>{S(<AuditPage />)}</RequireRole> },
      { path: 'users', element: <RequireRole roles={['superadmin', 'admin']}>{S(<UsersPage />)}</RequireRole> },
      { path: 'users/:id', element: <RequireRole roles={['superadmin', 'admin']}>{S(<UserDetailPage />)}</RequireRole> },

      { path: 'settings', element: S(<SettingsPage />) },
    ],
  },
  { path: '*', element: <Navigate to="/" replace /> },
]);
