import { BarChart3, FileDiff, FileText, LayoutDashboard, MessageSquareText, Plus } from 'lucide-react';
import { NavLink } from 'react-router-dom';
const links = [['/dashboard', LayoutDashboard, 'Dashboard'], ['/upload', Plus, 'New deal'], ['/comparison', FileDiff, 'Compare'], ['/report', FileText, 'Reports'], ['/communication', MessageSquareText, 'Drafts']];
export default function Sidebar() {
  return <aside className="sidebar"><div className="side-brand"><span>DL</span><strong>DealLens</strong></div><nav>{links.map(([to, Icon, label]) => <NavLink key={to} to={to} className={({ isActive }) => isActive ? 'active' : ''}><Icon size={18} />{label}</NavLink>)}</nav><div className="side-note"><BarChart3 size={17} /><span>Turn contract changes into clear decisions.</span></div></aside>;
}