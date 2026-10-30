import { Navigate, Outlet, useLocation } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';

export default function ProtectedRoute() {
  const { status, error, refreshUser } = useAuth();
  const location = useLocation();

  if (status === 'loading') return <div className="screen-state"><div className="spinner" /><p>Checking your session…</p></div>;
  if (status === 'error') return <div className="screen-state"><h1>Unable to connect</h1><p>{error}</p><button className="button primary" onClick={refreshUser}>Retry</button></div>;
  if (status !== 'authenticated') return <Navigate to="/login" replace state={{ from: location.pathname }} />;
  return <Outlet />;
}
