import { lazy, Suspense } from 'react';
import { createBrowserRouter, Navigate } from 'react-router-dom';
import { AppLayout } from '@/components/layout/AppLayout';
import { RequireAuth } from './guards';
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
const FinanceHistoryPage = lazyPage(() => import('@/pages/finance/FinanceHistoryPage'), 'FinanceHistoryPage');
const ExpenseCategoriesPage = lazyPage(() => import('@/pages/finance/ExpenseCategoriesPage'), 'ExpenseCategoriesPage');
const EmployeeReportPage = lazyPage(() => import('@/pages/reports/EmployeeReportPage'), 'EmployeeReportPage');
const ProjectsReportPage = lazyPage(() => import('@/pages/reports/ProjectsReportPage'), 'ProjectsReportPage');
const ExpensesReportPage = lazyPage(() => import('@/pages/reports/ExpensesReportPage'), 'ExpensesReportPage');
const PayrollReportPage = lazyPage(() => import('@/pages/reports/PayrollReportPage'), 'PayrollReportPage');
const TasksReportPage = lazyPage(() => import('@/pages/reports/TasksReportPage'), 'TasksReportPage');
const DailyPlansPage = lazyPage(() => import('@/pages/daily-plans/DailyPlansPage'), 'DailyPlansPage');
const AuditPage = lazyPage(() => import('@/pages/audit/AuditPage'), 'AuditPage');
const UsersPage = lazyPage(() => import('@/pages/users/UsersPage'), 'UsersPage');
const UserDetailPage = lazyPage(() => import('@/pages/users/UserDetailPage'), 'UserDetailPage');
const SettingsPage = lazyPage(() => import('@/pages/SettingsPage'), 'SettingsPage');
const TrashPage = lazyPage(() => import('@/pages/trash/TrashPage'), 'TrashPage');

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

      // Rol himoyasi AppLayout'dagi <RequireRoute> orqali navConfig'dan markazlashgan.
      { path: 'clients', element: S(<ClientsPage />) },
      { path: 'clients/:id', element: S(<ClientDetailPage />) },

      { path: 'projects', element: S(<ProjectsPage />) },
      { path: 'projects/:id', element: S(<ProjectDetailPage />) },

      { path: 'tasks', element: S(<TasksPage />) },
      { path: 'meetings', element: S(<MeetingsPage />) },
      { path: 'finance', element: S(<FinancePage />) },
      { path: 'payroll', element: S(<PayrollPage />) },
      { path: 'finance-history', element: S(<FinanceHistoryPage />) },
      { path: 'expense-categories', element: S(<ExpenseCategoriesPage />) },
      { path: 'reports', element: <Navigate to="/reports/projects" replace /> },
      { path: 'reports/employees', element: S(<EmployeeReportPage />) },
      { path: 'reports/projects', element: S(<ProjectsReportPage />) },
      { path: 'reports/expenses', element: S(<ExpensesReportPage />) },
      { path: 'reports/payroll', element: S(<PayrollReportPage />) },
      { path: 'reports/tasks', element: S(<TasksReportPage />) },
      { path: 'daily-plans', element: S(<DailyPlansPage />) },
      { path: 'audit', element: S(<AuditPage />) },
      { path: 'users', element: S(<UsersPage />) },
      { path: 'users/:id', element: S(<UserDetailPage />) },

      { path: 'settings', element: S(<SettingsPage />) },
      { path: 'trash', element: S(<TrashPage />) },
    ],
  },
  { path: '*', element: <Navigate to="/" replace /> },
]);
