import { useState } from 'react';
import { BrowserRouter, Routes, Route } from 'react-router-dom';
import ProtectedRoute from './components/ProtectedRoute';
import Sidebar from './components/Sidebar';
import LoginPage from './pages/LoginPage';
import DashboardPage from './pages/DashboardPage';
import MembersListPage from './pages/MembersListPage';
import AddMemberPage from './pages/AddMemberPage';
import MemberDetailPage from './pages/MemberDetailPage';
import BirthdayDashboardPage from './pages/BirthdayDashboardPage';
import AttendancePage from './pages/AttendancePage';
import AttendanceHistoryPage from './pages/AttendanceHistoryPage';
import DepartmentsPage from './pages/DepartmentsPage';
import LeavePage from './pages/LeavePage';

function Layout({ children }: { children: React.ReactNode }) {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  return (
    <div className="layout">
      <Sidebar open={sidebarOpen} onClose={() => setSidebarOpen(false)} />
      {sidebarOpen && (
        <div className="sidebar-overlay" onClick={() => setSidebarOpen(false)} aria-hidden="true" />
      )}
      <main className="content">
        <div className="mobile-topbar">
          <button
            className="hamburger"
            onClick={() => setSidebarOpen(true)}
            aria-label="Open navigation"
            aria-expanded={sidebarOpen}
          >
            <span /><span /><span />
          </button>
        </div>
        {children}
      </main>
    </div>
  );
}

export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/login" element={<LoginPage />} />
        <Route path="/" element={<ProtectedRoute><Layout><DashboardPage /></Layout></ProtectedRoute>} />
        <Route path="/members" element={<ProtectedRoute><Layout><MembersListPage /></Layout></ProtectedRoute>} />
        <Route path="/members/new" element={<ProtectedRoute><Layout><AddMemberPage /></Layout></ProtectedRoute>} />
        <Route path="/members/:id" element={<ProtectedRoute><Layout><MemberDetailPage /></Layout></ProtectedRoute>} />
        <Route path="/birthdays" element={<ProtectedRoute><Layout><BirthdayDashboardPage /></Layout></ProtectedRoute>} />
        <Route path="/attendance" element={<ProtectedRoute><Layout><AttendancePage /></Layout></ProtectedRoute>} />
        <Route path="/attendance/history" element={<ProtectedRoute><Layout><AttendanceHistoryPage /></Layout></ProtectedRoute>} />
        <Route path="/departments" element={<ProtectedRoute><Layout><DepartmentsPage /></Layout></ProtectedRoute>} />
        <Route path="/leave" element={<ProtectedRoute><Layout><LeavePage /></Layout></ProtectedRoute>} />
      </Routes>
    </BrowserRouter>
  );
}
