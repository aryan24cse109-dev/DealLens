import { Outlet } from 'react-router-dom';
import Navbar from '../components/common/Navbar';
import Sidebar from '../components/common/Sidebar';
export default function MainLayout() {
  return <div className="app-shell"><Sidebar /><div className="app-main"><Navbar /><Outlet /></div></div>;
}