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
const EmployeeReportPage = lazyPage(() => import('@/pages/reports/EmployeeReportPage'), 'EmployeeReportPage');
const ProjectsReportPage = lazyPage(() => import('@/pages/reports/ProjectsReportPage'), 'ProjectsReportPage');
const ExpensesReportPage = lazyPage(() => import('@/pages/reports/ExpensesReportPage'), 'ExpensesReportPage');
const PayrollReportPage = lazyPage(() => import('@/pages/reports/PayrollReportPage'), 'PayrollReportPage');
const TasksReportPage = lazyPage(() => import('@/pages/reports/TasksReportPage'), 'TasksReportPage');
const DailyPlansPage = lazyPage(() => import('@/pages/daily-plans/DailyPlansPage'), 'DailyPlansPage');
const ApplicationsPage = lazyPage(() => import('@/pages/applications/ApplicationsPage'), 'ApplicationsPage');
const ApplyPage = lazyPage(() => import('@/pages/applications/ApplyPage'), 'ApplyPage');
const AuditPage = lazyPage(() => import('@/pages/audit/AuditPage'), 'AuditPage');
const UsersPage = lazyPage(() => import('@/pages/users/UsersPage'), 'UsersPage');
const UserDetailPage = lazyPage(() => import('@/pages/users/UserDetailPage'), 'UserDetailPage');
const SettingsPage = lazyPage(() => import('@/pages/SettingsPage'), 'SettingsPage');
const TrashPage = lazyPage(() => import('@/pages/trash/TrashPage'), 'TrashPage');

const S = (el) => <Suspense fallback={<PageLoader />}>{el}</Suspense>;

export const router = createBrowserRouter([
  { path: '/login', element: <LoginPage /> },
  { path: '/apply', element: S(<ApplyPage />) }, // public nomzod anketasi (auth shart emas)
  {
    path: '/',
    element: (
      <RequireAuth>
        <AppLayout />
      </RequireAuth>
    ),
    children: [
      { index: true, element: S(<DashboardPage />) },

      { path: 'clients', element: <RequireRole roles={['superadmin', 'admin', 'manager', 'auditor']}>{S(<ClientsPage />)}</RequireRole> },
      { path: 'clients/:id', element: <RequireRole roles={['superadmin', 'admin', 'manager', 'auditor']}>{S(<ClientDetailPage />)}</RequireRole> },

      { path: 'projects', element: S(<ProjectsPage />) },
      { path: 'projects/:id', element: S(<ProjectDetailPage />) },

      { path: 'tasks', element: S(<TasksPage />) },
      { path: 'meetings', element: S(<MeetingsPage />) },
      { path: 'finance', element: S(<FinancePage />) },
      { path: 'payroll', element: <RequireRole roles={['superadmin', 'admin', 'accountant', 'manager', 'employee', 'auditor']}>{S(<PayrollPage />)}</RequireRole> },
      { path: 'expenses', element: <RequireRole roles={['superadmin', 'admin', 'accountant', 'auditor']}>{S(<ExpensesPage />)}</RequireRole> },
      { path: 'reports', element: <Navigate to="/reports/projects" replace /> },
      { path: 'reports/employees', element: <RequireRole roles={['superadmin', 'admin', 'accountant', 'auditor']}>{S(<EmployeeReportPage />)}</RequireRole> },
      { path: 'reports/projects', element: <RequireRole roles={['superadmin', 'admin', 'manager', 'accountant', 'auditor']}>{S(<ProjectsReportPage />)}</RequireRole> },
      { path: 'reports/expenses', element: <RequireRole roles={['superadmin', 'admin', 'accountant', 'auditor']}>{S(<ExpensesReportPage />)}</RequireRole> },
      { path: 'reports/payroll', element: <RequireRole roles={['superadmin', 'admin', 'accountant', 'auditor']}>{S(<PayrollReportPage />)}</RequireRole> },
      { path: 'reports/tasks', element: <RequireRole roles={['superadmin', 'admin', 'manager', 'auditor']}>{S(<TasksReportPage />)}</RequireRole> },
      { path: 'daily-plans', element: S(<DailyPlansPage />) },
      { path: 'applications', element: <RequireRole roles={['superadmin', 'admin', 'manager']}>{S(<ApplicationsPage />)}</RequireRole> },
      { path: 'audit', element: <RequireRole roles={['superadmin', 'admin', 'accountant', 'auditor']}>{S(<AuditPage />)}</RequireRole> },
      { path: 'users', element: <RequireRole roles={['superadmin', 'admin']}>{S(<UsersPage />)}</RequireRole> },
      { path: 'users/:id', element: <RequireRole roles={['superadmin', 'admin']}>{S(<UserDetailPage />)}</RequireRole> },

      { path: 'settings', element: S(<SettingsPage />) },
      { path: 'trash', element: <RequireRole roles={['superadmin', 'admin']}>{S(<TrashPage />)}</RequireRole> },
    ],
  },
  { path: '*', element: <Navigate to="/" replace /> },
]);
