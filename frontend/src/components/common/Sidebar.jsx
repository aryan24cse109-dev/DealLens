
import {
  LayoutDashboard,
  BriefcaseBusiness,
  BrainCircuit,
  FileDiff,
  FileText,
  MessageSquareText,
  Settings,
  Plus,
  BarChart3,
} from 'lucide-react';

import { NavLink } from 'react-router-dom';

const links = [
  ['/dashboard', LayoutDashboard, 'Dashboard'],
  ['/deals', BriefcaseBusiness, 'Saved Deals'],
  ['/analyses', BrainCircuit, 'AI Analyses'],
  ['/upload', Plus, 'New Deal'],
  ['/comparison', FileDiff, 'Compare'],
  ['/reports', FileText, 'Saved Reports'],
  ['/drafts', MessageSquareText, 'Saved Drafts'],
  ['/settings', Settings, 'Settings'],
];

export default function Sidebar() {
  return (
    <aside className="sidebar">
      <div className="side-brand">
        <img
          src="/deallens-logo.png"
          alt="DealLens"
          className="side-brand-logo"
        />
      </div>

      <nav>
        {links.map(([to, Icon, label]) => (
          <NavLink
            key={to}
            to={to}
            end
            className={({ isActive }) => (isActive ? 'active' : '')}
          >
            <Icon size={18} />
            <span>{label}</span>
          </NavLink>
        ))}
      </nav>

      <div className="side-note">
        <BarChart3 size={17} />
        <span>Turn contract changes into clear decisions.</span>
      </div>
    </aside>
  );
}
