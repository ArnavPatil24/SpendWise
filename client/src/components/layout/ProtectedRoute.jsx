import { Navigate, Outlet, useLocation } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { Logo } from '../ui/Logo';

export function Splash() {
  return (
    <div className="splash">
      <Logo size={48} />
      <div className="spinner" />
    </div>
  );
}

export function ProtectedRoute() {
  const { isAuthenticated, booting } = useAuth();
  const location = useLocation();
  if (booting) return <Splash />;
  if (!isAuthenticated) return <Navigate to="/login" replace state={{ from: location.pathname }} />;
  return <Outlet />;
}

export function PublicOnlyRoute() {
  const { isAuthenticated, booting } = useAuth();
  if (booting) return <Splash />;
  if (isAuthenticated) return <Navigate to="/" replace />;
  return <Outlet />;
}
