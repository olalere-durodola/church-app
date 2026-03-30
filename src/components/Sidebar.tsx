import { NavLink } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth';

const NAV_ITEMS = [
  { to: '/',            label: 'Dashboard',   icon: '🏠' },
  { to: '/members',     label: 'Members',     icon: '👥' },
  { to: '/birthdays',   label: 'Birthdays',   icon: '🎂' },
  { to: '/attendance',  label: 'Attendance',  icon: '📋' },
  { to: '/departments', label: 'Departments', icon: '🏛' },
];

export default function Sidebar() {
  const { logout } = useAuth();
  return (
    <aside className="sidebar">
      <div className="sidebar-brand">✝ R.C.C.G<br />Covenant Embassy</div>
      <nav className="sidebar-nav">
        {NAV_ITEMS.map(({ to, label, icon }) => (
          <NavLink
            key={to}
            to={to}
            end={to === '/'}
            className={({ isActive }) => `sidebar-link${isActive ? ' active' : ''}`}
          >
            <span>{icon}</span>
            {label}
          </NavLink>
        ))}
      </nav>
      <button className="sidebar-signout" onClick={logout}>Sign out</button>
    </aside>
  );
}
