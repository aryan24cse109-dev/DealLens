import { BrowserRouter, Navigate, Route, Routes } from 'react-router-dom';
import ProtectedRoute from './components/auth/ProtectedRoute';
import LoginPage from './pages/LoginPage';
import MainLayout from './layouts/MainLayout';
import DashboardPage from './pages/DashboardPage';
import UploadPage from './pages/UploadPage';
import AnalysisPage from './pages/AnalysisPage';
import ComparisonPage from './pages/ComparisonPage';
import ReportPage from './pages/ReportPage';
import CommunicationPage from './pages/CommunicationPage';
import DealsPage from './pages/DealsPage';
import AnalysesPage from './pages/AnalysesPage';
import DraftsPage from './pages/DraftsPage';
import ReportsPage from './pages/ReportsPage';
import SettingsPage from './pages/SettingsPage';

function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/login" element={<LoginPage />} />
        <Route
          path="/"
          element={
            <ProtectedRoute />
          }
        >
          <Route element={<MainLayout />}>
            <Route index element={<Navigate to="/dashboard" replace />} />
            <Route path="dashboard" element={<DashboardPage />} />
            <Route path="deals" element={<DealsPage />} />
            <Route path="analyses" element={<AnalysesPage />} />
            <Route path="drafts" element={<DraftsPage />} />
            <Route path="reports" element={<ReportsPage />} />
            <Route path="settings" element={<SettingsPage />} />
            <Route path="upload" element={<UploadPage />} />
            <Route path="comparison" element={<ComparisonPage />} />
            <Route path="analyse/:analysisId" element={<AnalysisPage />} />
            <Route path="report" element={<ReportPage />} />
            <Route path="communication" element={<CommunicationPage />} />
          </Route>
        </Route>
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </BrowserRouter>
  );
}

export default App;
