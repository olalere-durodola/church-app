import { NavLink } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth';
import logo from '../assets/logo.jpg';

const NAV_ITEMS = [
  { to: '/',            label: 'Dashboard',   icon: '🏠' },
  { to: '/members',     label: 'Members',     icon: '👥' },
  { to: '/birthdays',   label: 'Birthdays',   icon: '🎂' },
  { to: '/attendance',  label: 'Attendance',  icon: '📋' },
  { to: '/departments', label: 'Departments', icon: '🏛' },
  { to: '/leave',       label: 'Leave',        icon: '📅' },
];

interface SidebarProps {
  open: boolean;
  onClose: () => void;
}

export default function Sidebar({ open, onClose }: SidebarProps) {
  const { logout } = useAuth();
  return (
    <aside className={`sidebar${open ? ' sidebar-open' : ''}`}>
      <div className="sidebar-brand">
        <img src={logo} alt="R.C.C.G Covenant Embassy" className="sidebar-logo" />
        <div>
          <div style={{ fontSize: '11px', lineHeight: 1.3 }}>Redeemed Christian</div>
          <div style={{ fontSize: '11px', lineHeight: 1.3 }}>Church of God</div>
          <div style={{ fontSize: '10px', fontWeight: 400, opacity: 0.65, lineHeight: 1.3 }}>Covenant Embassy</div>
        </div>
      </div>
      <nav className="sidebar-nav">
        {NAV_ITEMS.map(({ to, label, icon }) => (
          <NavLink
            key={to}
            to={to}
            end={to === '/'}
            className={({ isActive }) => `sidebar-link${isActive ? ' active' : ''}`}
            onClick={onClose}
          >
            <span aria-hidden="true">{icon}</span>
            {label}
          </NavLink>
        ))}
      </nav>
      <button className="sidebar-signout" onClick={logout}>Sign out</button>
    </aside>
  );
}
