import { createBrowserRouter, RouterProvider } from 'react-router-dom';
import { AdminLayout } from '@/layouts/AdminLayout';
import { ProtectedRoute } from '@/components/ProtectedRoute';
import { LoginPage } from '@/features/auth/LoginPage';
import { DashboardPage } from '@/features/dashboard/DashboardPage';
import { ProblemListPage } from '@/features/problems/pages/ProblemListPage';
import { ProblemCreatePage } from '@/features/problems/pages/ProblemCreatePage';
import { ProblemEditorPage } from '@/features/problems/pages/ProblemEditorPage';
import { ContestListPage } from '@/features/contests/pages/ContestListPage';
import { ContestCreatePage } from '@/features/contests/pages/ContestCreatePage';
import { ContestEditorPage } from '@/features/contests/pages/ContestEditorPage';
import { UserManagementPage } from '@/features/users/pages/UserManagementPage';
import { AuditLogPage } from '@/features/audit/pages/AuditLogPage';

const router = createBrowserRouter([
  // Public route
  {
    path: '/login',
    element: <LoginPage />,
  },
  // Protected admin routes
  {
    element: <ProtectedRoute />,
    children: [
      {
        element: <AdminLayout />,
        children: [
          { path: '/', element: <DashboardPage /> },
          // Problems
          { path: '/problems', element: <ProblemListPage /> },
          { path: '/problems/new', element: <ProblemCreatePage /> },
          { path: '/problems/:id', element: <ProblemEditorPage /> },
          { path: '/problems/:id/edit', element: <ProblemEditorPage /> },
          // Contests
          { path: '/contests', element: <ContestListPage /> },
          { path: '/contests/new', element: <ContestCreatePage /> },
          { path: '/contests/:id', element: <ContestEditorPage /> },
          // Users (admin only)
          { path: '/users', element: <UserManagementPage /> },
          // Audit log (admin only)
          { path: '/audit-log', element: <AuditLogPage /> },
        ],
      },
    ],
  },
]);

export function Router() {
  return <RouterProvider router={router} />;
}
