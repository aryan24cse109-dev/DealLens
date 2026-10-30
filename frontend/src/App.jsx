import { BrowserRouter, Navigate, Route, Routes } from 'react-router-dom';
import ProtectedRoute from './components/auth/ProtectedRoute';
import LoginPage from './pages/LoginPage';
import MainLayout from './layouts/MainLayout';
import DashboardPage from './pages/DashboardPage';
import UploadPage from './pages/UploadPage';
import ComparisonPage from './pages/ComparisonPage';
import ReportPage from './pages/ReportPage';
import CommunicationPage from './pages/CommunicationPage';

export default function App() {
  return <BrowserRouter><Routes><Route path="/login" element={<LoginPage />} /><Route element={<ProtectedRoute />}><Route element={<MainLayout />}><Route path="/" element={<Navigate to="/dashboard" replace />} /><Route path="/dashboard" element={<DashboardPage />} /><Route path="/upload" element={<UploadPage />} /><Route path="/comparison" element={<ComparisonPage />} /><Route path="/report" element={<ReportPage />} /><Route path="/communication" element={<CommunicationPage />} /></Route></Route><Route path="*" element={<Navigate to="/" replace />} /></Routes></BrowserRouter>;
}