import { Navigate, Outlet } from 'react-router-dom';
import { useAuthStore } from '@/features/auth/store';

const ADMIN_ROLES = ['admin', 'setter', 'tester'];
const canUseAdminSite = (role: string, canAccessAdmin?: boolean) =>
  ADMIN_ROLES.includes(role) || canAccessAdmin === true;

interface ProtectedRouteProps {
  requiredRoles?: string[];
}

export function ProtectedRoute({ requiredRoles }: ProtectedRouteProps) {
  const { isAuthenticated, isLoading, user } = useAuthStore();

  if (isLoading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-bg">
        <div className="text-text-muted">Loading...</div>
      </div>
    );
  }

  if (!isAuthenticated || !user) {
    return <Navigate to="/login" replace />;
  }

  if (!canUseAdminSite(user.role, user.can_access_admin)) {
    return <Navigate to="/login" replace />;
  }

  if (requiredRoles && !requiredRoles.includes(user.role)) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-bg">
        <div className="text-error">Access denied. Insufficient permissions.</div>
      </div>
    );
  }

  return <Outlet />;
}
