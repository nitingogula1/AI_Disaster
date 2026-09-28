import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import LandingPage from './pages/LandingPage/LandingPage';
import LoginPage from './pages/Login/LoginPage';
import CommandLayout from './components/layout/CommandLayout';
import DashboardPage from './pages/Dashboard/DashboardPage';
import DisasterEventsPage from './pages/DisasterEvents/DisasterEventsPage';
import GISMapPage from './pages/GISMap/GISMapPage';
import SatelliteAcquisitionPage from './pages/SatelliteAcquisition/SatelliteAcquisitionPage';
import SatelliteComparisonPage from './pages/SatelliteComparison/SatelliteComparisonPage';
import AIDamageDetectionPage from './pages/AIDamageDetection/AIDamageDetectionPage';
import DamageAssessmentPage from './pages/DamageAssessment/DamageAssessmentPage';
import { RescuePriorityPage } from './pages/RescuePriority/RescuePriorityPage';
import { RouteOptimizationPage } from './pages/RouteOptimization/RouteOptimizationPage';
import { RescueTeamsPage } from './pages/RescueTeams/RescueTeamsPage';
import { ReportsPage } from './pages/Reports/ReportsPage';
import { AlertsPage } from './pages/Alerts/AlertsPage';
import { UserManagementPage } from './pages/Users/UserManagementPage';
import { SettingsPage } from './pages/Settings/SettingsPage';

export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        {/* Public Routes */}
        <Route path="/" element={<LandingPage />} />
        <Route path="/login" element={<LoginPage />} />

        {/* Command Center Authenticated Layout */}
        <Route path="/command" element={<CommandLayout />}>
          <Route index element={<DashboardPage />} />
          <Route path="events" element={<DisasterEventsPage />} />
          <Route path="gis" element={<GISMapPage />} />
          <Route path="satellite" element={<SatelliteAcquisitionPage />} />
          <Route path="satellite-comparison" element={<SatelliteComparisonPage />} />
          <Route path="ai-detection" element={<AIDamageDetectionPage />} />
          <Route path="damage" element={<DamageAssessmentPage />} />
          <Route path="rescue-priority" element={<RescuePriorityPage />} />
          <Route path="routes" element={<RouteOptimizationPage />} />
          <Route path="rescue-teams" element={<RescueTeamsPage />} />
          <Route path="reports" element={<ReportsPage />} />
          <Route path="alerts" element={<AlertsPage />} />
          <Route path="users" element={<UserManagementPage />} />
          <Route path="settings" element={<SettingsPage />} />
          <Route path="*" element={<Navigate to="/command" replace />} />
        </Route>

        {/* Fallback */}
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </BrowserRouter>
  );
}
