import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { AuthProvider } from "./auth/AuthContext";
import { ProtectedRoute } from "./auth/ProtectedRoute";
import { RequirePerm } from "./auth/RequirePerm";
import AppShell from "./layout/AppShell";

import LandingPage from "./pages/LandingPage";
import CheckInPage from "./pages/CheckInPage";
import Login from "./pages/Login";
import RegisterPage from "./pages/RegisterPage";
import ForgotPasswordPage from "./pages/ForgotPasswordPage";
import ResetPasswordPage from "./pages/ResetPasswordPage";
import DashboardPage from "./pages/DashboardPage";
import ProfilePage from "./pages/ProfilePage";
import LeaderboardPage from "./pages/LeaderboardPage";
import AwardsPage from "./pages/AwardsPage";
import MembersPage from "./pages/MembersPage";
import ActivitiesPage from "./pages/ActivitiesPage";
import AffiliatesPage from "./pages/AffiliatesPage";
import AttendancePage from "./pages/AttendancePage";
import AnnouncementsPage from "./pages/AnnouncementsPage";
import PrayerPage from "./pages/PrayerPage";
import FinancePage from "./pages/FinancePage";
import ReportsPage from "./pages/ReportsPage";
import ElectionsPage from "./pages/ElectionsPage";
import VotePage from "./pages/VotePage";
import ResultsPage from "./pages/ResultsPage";
import ScoringSettingsPage from "./pages/ScoringSettingsPage";
import SettingsPage from "./pages/SettingsPage";
import UsersPage from "./pages/UsersPage";
import FinalistsPage from "./pages/FinalistsPage";
import AuditPage from "./pages/AuditPage";
import Forbidden from "./pages/Forbidden";

export default function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <Routes>
          {/* Public Routes */}
          <Route path="/" element={<LandingPage />} />
          <Route path="/login" element={<Login />} />
          <Route path="/register" element={<RegisterPage />} />
          <Route path="/forgot-password" element={<ForgotPasswordPage />} />
          <Route path="/reset-password" element={<ResetPasswordPage />} />
          <Route path="/checkin" element={<CheckInPage />} />

          {/* Protected Routes */}
          <Route element={<ProtectedRoute />}>
            <Route element={<AppShell />}>
              <Route path="/dashboard" element={<DashboardPage />} />
              <Route path="/profile" element={<ProfilePage />} />
              <Route path="/leaderboard" element={<RequirePerm perm="leaderboard.view"><LeaderboardPage /></RequirePerm>} />
              <Route path="/awards" element={<RequirePerm perm="leaderboard.view"><AwardsPage /></RequirePerm>} />
              <Route path="/members" element={<RequirePerm perm="members.view"><MembersPage /></RequirePerm>} />
              <Route path="/activities" element={<RequirePerm perm="activities.view"><ActivitiesPage /></RequirePerm>} />
              <Route path="/affiliates" element={<RequirePerm perm="affiliates.view"><AffiliatesPage /></RequirePerm>} />
              <Route path="/activities/:id/attendance" element={<RequirePerm perm="activities.manage"><AttendancePage /></RequirePerm>} />
              <Route path="/announcements" element={<RequirePerm perm="announcements.view"><AnnouncementsPage /></RequirePerm>} />
              <Route path="/prayer" element={<RequirePerm perm="prayer.view"><PrayerPage /></RequirePerm>} />
              <Route path="/finance" element={<RequirePerm perm="finance.view_aggregate"><FinancePage /></RequirePerm>} />
              <Route path="/reports" element={<RequirePerm perm="reports.view"><ReportsPage /></RequirePerm>} />
              <Route path="/elections" element={<RequirePerm perm="leaderboard.view"><ElectionsPage /></RequirePerm>} />
              <Route path="/elections/:id/vote" element={<RequirePerm perm="leaderboard.view"><VotePage /></RequirePerm>} />
              <Route path="/elections/:id/results" element={<RequirePerm perm="leaderboard.view"><ResultsPage /></RequirePerm>} />
              <Route path="/scoring-settings" element={<RequirePerm perm="scoring.manage"><ScoringSettingsPage /></RequirePerm>} />
              <Route path="/settings" element={<RequirePerm perm="settings.manage"><SettingsPage /></RequirePerm>} />
              <Route path="/users" element={<RequirePerm perm="settings.manage"><UsersPage /></RequirePerm>} />
              <Route path="/finalists" element={<RequirePerm perm="dashboard.view"><FinalistsPage /></RequirePerm>} />
              <Route path="/audit" element={<RequirePerm perm="audit.view"><AuditPage /></RequirePerm>} />
              <Route path="/forbidden" element={<Forbidden />} />
              
              {/* Fallback for authenticated users */}
              <Route path="*" element={<Navigate to="/dashboard" replace />} />
            </Route>
          </Route>
        </Routes>
      </AuthProvider>
    </BrowserRouter>
  );
}
