import { Navigate, useLocation } from 'react-router-dom';
import { useAuthStore } from '@/store/authStore';

/** Requires authentication; otherwise redirect to /login. */
export function RequireAuth({ children }) {
  const token = useAuthStore((s) => s.accessToken);
  const location = useLocation();
  if (!token) return <Navigate to="/login" state={{ from: location }} replace />;
  return children;
}

/** Requires one of the given roles; otherwise redirect home. */
export function RequireRole({ roles, children }) {
  const role = useAuthStore((s) => s.user?.role);
  if (!roles.includes(role)) return <Navigate to="/" replace />;
  return children;
}
