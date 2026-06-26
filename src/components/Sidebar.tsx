import { NavLink } from 'react-router-dom';
import type { ReactNode } from 'react';
import { useAuth } from '../hooks/useAuth';
import logo from '../assets/logo.jpg';

const ico = (paths: ReactNode) => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8}
    strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">{paths}</svg>
);

const NAV_SECTIONS = [
  {
    label: 'Overview',
    items: [
      { to: '/', label: 'Dashboard', icon: ico(<><path d="M3 9.5 12 3l9 6.5" /><path d="M5 10v10h14V10" /><path d="M9 20v-6h6v6" /></>) },
      { to: '/members', label: 'Members', icon: ico(<><circle cx="9" cy="8" r="3.2" /><path d="M3 20c0-3.3 2.7-5.5 6-5.5s6 2.2 6 5.5" /><path d="M16 5.5a3 3 0 0 1 0 5.7" /><path d="M21 20c0-2.3-1.2-4-3-4.8" /></>) },
      { to: '/visitors', label: 'Visitors', icon: ico(<><path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2" /><circle cx="9" cy="7" r="4" /><path d="M19 8v6M22 11h-6" /></>) },
      { to: '/birthdays', label: 'Birthdays', icon: ico(<><path d="M6 11h12a2 2 0 0 1 2 2v5a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2v-5a2 2 0 0 1 2-2Z" /><path d="M9 11V8a3 3 0 0 1 6 0v3" /><path d="M12 3v2" /></>) },
    ],
  },
  {
    label: 'Operations',
    items: [
      { to: '/follow-ups', label: 'Follow-ups', icon: ico(<><path d="M21 11.5a8.38 8.38 0 0 1-.9 3.8 8.5 8.5 0 0 1-7.6 4.7 8.38 8.38 0 0 1-3.8-.9L3 21l1.9-5.7a8.38 8.38 0 0 1-.9-3.8 8.5 8.5 0 0 1 4.7-7.6 8.38 8.38 0 0 1 3.8-.9h.5a8.48 8.48 0 0 1 8 8v.5Z" /></>) },
      { to: '/attendance', label: 'Attendance', icon: ico(<><rect x="4" y="5" width="16" height="16" rx="2" /><path d="M8 3v4M16 3v4M4 10h16" /><path d="m9 15 2 2 4-4" /></>) },
      { to: '/departments', label: 'Departments', icon: ico(<><path d="M3 21V10l9-6 9 6v11" /><path d="M9 21v-6h6v6" /><path d="M3 21h18" /></>) },
      { to: '/leave', label: 'Leave', icon: ico(<><rect x="4" y="5" width="16" height="16" rx="2" /><path d="M8 3v4M16 3v4M4 10h16" /><path d="M14 14h-4v4h4z" /></>) },
    ],
  },
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
        <span className="sidebar-crest">
          <img src={logo} alt="R.C.C.G Covenant Embassy" className="sidebar-logo" />
        </span>
        <div>
          <div className="sidebar-brand-name">Covenant Embassy</div>
          <div className="sidebar-brand-sub">R.C.C.G</div>
        </div>
      </div>
      <nav className="sidebar-nav">
        {NAV_SECTIONS.map(section => (
          <div key={section.label} className="sidebar-section">
            <div className="sidebar-section-label">{section.label}</div>
            {section.items.map(({ to, label, icon }) => (
              <NavLink
                key={to}
                to={to}
                end={to === '/'}
                className={({ isActive }) => `sidebar-link${isActive ? ' active' : ''}`}
                onClick={onClose}
              >
                {icon}
                {label}
              </NavLink>
            ))}
          </div>
        ))}
      </nav>
      <button className="sidebar-signout" onClick={logout}>
        {ico(<><path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" /><path d="m16 17 5-5-5-5M21 12H9" /></>)}
        Sign out
      </button>
    </aside>
  );
}
