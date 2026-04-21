import { createBrowserRouter, Navigate, RouterProvider } from 'react-router-dom';
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
import { GroupListPage } from '@/features/groups/pages/GroupListPage';
import { GroupCreatePage } from '@/features/groups/pages/GroupCreatePage';
import { GroupDetailPage } from '@/features/groups/pages/GroupDetailPage';
import { SubmissionListPage } from '@/features/submissions/pages/SubmissionListPage';
import { SubmissionDetailPage } from '@/features/submissions/pages/SubmissionDetailPage';
import { UserManagementPage } from '@/features/users/pages/UserManagementPage';
import { AuditLogPage } from '@/features/audit/pages/AuditLogPage';
import { useAuthStore } from '@/features/auth/store';

const GLOBAL_ADMIN_ROLES = ['admin', 'setter', 'tester'];

function HomeRoute() {
  const user = useAuthStore((state) => state.user);
  if (!user) {
    return <Navigate to="/login" replace />;
  }
  return GLOBAL_ADMIN_ROLES.includes(user.role)
    ? <DashboardPage />
    : <Navigate to="/groups" replace />;
}

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
          { path: '/', element: <HomeRoute /> },
          // Problems
          { path: '/problems', element: <ProblemListPage /> },
          { path: '/problems/new', element: <ProblemCreatePage /> },
          { path: '/problems/:id', element: <ProblemEditorPage /> },
          { path: '/problems/:id/edit', element: <ProblemEditorPage /> },
          // Contests
          { path: '/contests', element: <ContestListPage /> },
          { path: '/contests/new', element: <ContestCreatePage /> },
          { path: '/contests/:id', element: <ContestEditorPage /> },
          // Groups
          { path: '/groups', element: <GroupListPage /> },
          { path: '/groups/:id', element: <GroupDetailPage /> },
          // Submissions
          { path: '/submissions', element: <SubmissionListPage /> },
          { path: '/submissions/:id', element: <SubmissionDetailPage /> },
          {
            element: <ProtectedRoute requiredRoles={['admin']} />,
            children: [
              // Users (admin only)
              { path: '/groups/new', element: <GroupCreatePage /> },
              { path: '/users', element: <UserManagementPage /> },
              // Audit log (admin only)
              { path: '/audit-log', element: <AuditLogPage /> },
            ],
          },
        ],
      },
    ],
  },
]);

export function Router() {
  return <RouterProvider router={router} />;
}
