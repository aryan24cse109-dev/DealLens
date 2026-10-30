import { LogOut } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
export default function Navbar() {
  const { user, logout, logoutError, isLoggingOut } = useAuth();
  return <header className="navbar"><div className="mobile-title">DealLens</div>{logoutError && <span className="logout-error" role="alert">{logoutError}</span>}<div className="user-menu"><div className="avatar">{(user?.name || user?.email || 'U').slice(0, 1).toUpperCase()}</div><div className="user-copy"><strong>{user?.name || 'Workspace user'}</strong><span>{user?.email}</span></div><button className="icon-button" title="Log out" onClick={logout} disabled={isLoggingOut}><LogOut size={17} /></button></div></header>;
}