import { BrowserRouter, Routes, Route, Navigate, NavLink } from 'react-router-dom';
import ProtectedRoute from './components/ProtectedRoute';
import LoginPage from './pages/LoginPage';
import MembersListPage from './pages/MembersListPage';
import AddMemberPage from './pages/AddMemberPage';
import MemberDetailPage from './pages/MemberDetailPage';
import BirthdayDashboardPage from './pages/BirthdayDashboardPage';
import AttendancePage from './pages/AttendancePage';
import AttendanceHistoryPage from './pages/AttendanceHistoryPage';
import DepartmentsPage from './pages/DepartmentsPage';
import { useAuth } from './hooks/useAuth';

function Nav() {
  const { logout } = useAuth();
  return (
    <nav className="nav">
      <div className="nav-brand">✝ R.C.C.G Covenant Embassy</div>
      <div className="nav-links">
        <NavLink to="/members" className={({ isActive }) => `nav-link${isActive ? ' active' : ''}`}>
          Members
        </NavLink>
        <NavLink to="/birthdays" className={({ isActive }) => `nav-link${isActive ? ' active' : ''}`}>
          Birthdays
        </NavLink>
        <NavLink to="/attendance" className={({ isActive }) => `nav-link${isActive ? ' active' : ''}`}>
          Attendance
        </NavLink>
        <NavLink to="/departments" className={({ isActive }) => `nav-link${isActive ? ' active' : ''}`}>
          Departments
        </NavLink>
      </div>
      <button className="nav-signout" onClick={logout}>Sign out</button>
    </nav>
  );
}

function Layout({ children }: { children: React.ReactNode }) {
  return (
    <div className="layout">
      <Nav />
      <main className="content">{children}</main>
    </div>
  );
}

export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/login" element={<LoginPage />} />
        <Route path="/" element={<Navigate to="/members" replace />} />
        <Route path="/members" element={<ProtectedRoute><Layout><MembersListPage /></Layout></ProtectedRoute>} />
        <Route path="/members/new" element={<ProtectedRoute><Layout><AddMemberPage /></Layout></ProtectedRoute>} />
        <Route path="/members/:id" element={<ProtectedRoute><Layout><MemberDetailPage /></Layout></ProtectedRoute>} />
        <Route path="/birthdays" element={<ProtectedRoute><Layout><BirthdayDashboardPage /></Layout></ProtectedRoute>} />
        <Route path="/attendance" element={<ProtectedRoute><Layout><AttendancePage /></Layout></ProtectedRoute>} />
        <Route path="/attendance/history" element={<ProtectedRoute><Layout><AttendanceHistoryPage /></Layout></ProtectedRoute>} />
        <Route path="/departments" element={<ProtectedRoute><Layout><DepartmentsPage /></Layout></ProtectedRoute>} />
      </Routes>
    </BrowserRouter>
  );
}
