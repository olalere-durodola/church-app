import { useState, useEffect } from 'react';
import { collection, getDocs } from 'firebase/firestore';
import { Link } from 'react-router-dom';
import { db } from '../firebase';
import type { Member } from '../types/member';
import type { AttendanceRecord } from '../types/attendance';
import { getBirthdaysComingUp } from '../utils/birthdayUtils';
import { MONTHS } from '../utils/dateConstants';
import LoadingSpinner from '../components/LoadingSpinner';
import StatusBadge from '../components/StatusBadge';
import MemberAvatar from '../components/MemberAvatar';

type AttendanceEntry = AttendanceRecord & { id: string };

function formatShortDate(ts: { toDate(): Date }): string {
  const d = ts.toDate();
  return `${MONTHS[d.getMonth() + 1]} ${d.getDate()}`;
}

/** Format a YYYY-MM-DD document-ID date string for display */
function formatDateId(dateId: string): string {
  const [, month, day] = dateId.split('-').map(Number);
  return `${MONTHS[month]} ${day}`;
}

export default function DashboardPage() {
  const [members, setMembers] = useState<Member[]>([]);
  const [attendance, setAttendance] = useState<AttendanceEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    Promise.all([
      getDocs(collection(db, 'members')),
      getDocs(collection(db, 'attendance')),
    ])
      .then(([memberSnap, attSnap]) => {
        setMembers(memberSnap.docs.map(d => ({ id: d.id, ...d.data() } as Member)));
        const sorted = attSnap.docs
          .map(d => ({ id: d.id, ...d.data() } as AttendanceEntry))
          .sort((a, b) => b.id.localeCompare(a.id))
          .slice(0, 4);
        setAttendance(sorted);
      })
      .catch(() => setError('Failed to load dashboard data.'))
      .finally(() => setLoading(false));
  }, []);

  if (loading) return <LoadingSpinner />;
  if (error) return <div className="page"><p className="error-message">{error}</p></div>;

  const today = new Date();

  const totalMembers = members.length;
  const activeCount = members.filter(m => m.status === 'Active').length;
  const visitorCount = members.filter(m => m.status === 'Visitor').length;
  const inactiveCount = members.filter(m => m.status === 'Inactive').length;

  const thisMonthStart = new Date(today.getFullYear(), today.getMonth(), 1);
  const newThisMonth = members.filter(m => m.createdAt?.toDate() >= thisMonthStart).length;

  const lastRecord = attendance[0] ?? null;

  const upcomingBirthdays = getBirthdaysComingUp(members, today);
  const nearestBirthday = upcomingBirthdays[0];

  const recentlyAdded = [...members]
    .sort((a, b) => {
      const diff = (b.createdAt?.toMillis() ?? 0) - (a.createdAt?.toMillis() ?? 0);
      return diff !== 0 ? diff : a.fullName.localeCompare(b.fullName);
    })
    .slice(0, 5);

  const trendRecords = [...attendance].reverse();
  const maxTotal = Math.max(...trendRecords.map(r => r.total), 1);

  function daysUntil(month: number, day: number): number {
    const now = new Date();
    const next = new Date(now.getFullYear(), month - 1, day);
    if (next < now) next.setFullYear(now.getFullYear() + 1);
    return Math.round((next.getTime() - new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime()) / 86400000);
  }

  return (
    <div className="page">
      <div className="page-header">
        <h1>Dashboard</h1>
      </div>

      <div className="dashboard-grid">
        {/* Total Members */}
        <div className="card dash-card">
          <div className="dash-card-label">Total Members</div>
          <div className="dash-card-value" style={{ color: 'var(--color-primary)' }}>{totalMembers}</div>
          <div className="dash-card-sub">
            {newThisMonth > 0 ? `+${newThisMonth} this month` : 'No new members this month'}
          </div>
        </div>

        {/* Last Attendance */}
        <div className="card dash-card">
          <div className="dash-card-label">Last Attendance</div>
          {lastRecord ? (
            <>
              <div className="dash-card-value" style={{ color: '#22c55e' }}>{lastRecord.total}</div>
              <div className="dash-card-sub">{formatDateId(lastRecord.id)}</div>
            </>
          ) : (
            <>
              <div className="dash-card-value" style={{ color: '#94a3b8' }}>—</div>
              <div className="dash-card-sub">No records yet</div>
            </>
          )}
        </div>

        {/* Birthdays This Week */}
        <div className="card dash-card">
          <div className="dash-card-label">Birthdays This Week</div>
          {upcomingBirthdays.length > 0 && nearestBirthday.birthdayMonth !== null && nearestBirthday.birthdayDay !== null ? (
            <>
              <div className="dash-card-value" style={{ color: '#f97316' }}>{upcomingBirthdays.length}</div>
              <div className="dash-card-sub">
                Nearest: {nearestBirthday.firstName} —{' '}
                {daysUntil(nearestBirthday.birthdayMonth, nearestBirthday.birthdayDay) === 0
                  ? 'Today'
                  : `${MONTHS[nearestBirthday.birthdayMonth]} ${nearestBirthday.birthdayDay}`}
              </div>
            </>
          ) : (
            <>
              <div className="dash-card-value" style={{ color: '#94a3b8' }}>0</div>
              <div className="dash-card-sub">None this week</div>
            </>
          )}
        </div>

        {/* Member Breakdown */}
        <div className="card dash-card dash-card-span2">
          <div className="dash-card-label">Member Breakdown</div>
          <div className="dash-breakdown">
            <div>
              <div className="dash-breakdown-value" style={{ color: 'var(--color-primary)' }}>{activeCount}</div>
              <div className="dash-breakdown-label">Active</div>
            </div>
            <div>
              <div className="dash-breakdown-value" style={{ color: '#f97316' }}>{visitorCount}</div>
              <div className="dash-breakdown-label">Visitors</div>
            </div>
            <div>
              <div className="dash-breakdown-value" style={{ color: '#94a3b8' }}>{inactiveCount}</div>
              <div className="dash-breakdown-label">Inactive</div>
            </div>
          </div>
        </div>

        {/* Upcoming Birthdays */}
        <div className="card dash-card-tall">
          <div className="dash-section-head">
            <span>🎂 Upcoming Birthdays</span>
            <Link to="/birthdays" className="dash-link">All →</Link>
          </div>
          {upcomingBirthdays.length === 0 ? (
            <p className="empty-state">No upcoming birthdays</p>
          ) : (
            upcomingBirthdays.map(m => {
              const days = m.birthdayMonth !== null && m.birthdayDay !== null
                ? daysUntil(m.birthdayMonth, m.birthdayDay) : 0;
              return (
                <div key={m.id} className="dash-list-row">
                  <div>
                    <div className="dash-list-name">{m.firstName} {m.lastName}</div>
                    <div className="dash-list-sub">
                      {m.birthdayMonth !== null && m.birthdayDay !== null
                        ? `${MONTHS[m.birthdayMonth]} ${m.birthdayDay}` : ''}
                    </div>
                  </div>
                  <span className="dash-badge-orange">{days === 0 ? 'Today' : `${days}d`}</span>
                </div>
              );
            })
          )}
        </div>

        {/* Attendance Trend */}
        <div className="card dash-card-span2">
          <div className="dash-section-head">
            <span>📊 Attendance Trend</span>
            <Link to="/attendance/history" className="dash-link">History →</Link>
          </div>
          {trendRecords.length === 0 ? (
            <p className="empty-state">No attendance records yet</p>
          ) : (
            trendRecords.map(r => (
              <div key={r.id} className="dash-bar-row">
                <div className="dash-bar-label">{formatDateId(r.id)}</div>
                <div className="dash-bar-track">
                  <div className="dash-bar-fill" style={{ width: `${(r.total / maxTotal) * 100}%` }} />
                </div>
                <div className="dash-bar-num">{r.total}</div>
              </div>
            ))
          )}
        </div>

        {/* Recently Added */}
        <div className="card dash-card-tall dash-card-span2">
          <div className="dash-section-head">
            <span>👤 Recently Added</span>
            <Link to="/members" className="dash-link">All →</Link>
          </div>
          {recentlyAdded.length === 0 ? (
            <p className="empty-state">No members yet</p>
          ) : (
            recentlyAdded.map(m => (
              <div key={m.id} className="dash-list-row">
                <MemberAvatar photoURL={m.photoURL} firstName={m.firstName} lastName={m.lastName} size="md" />
                <div style={{ flex: 1 }}>
                  <div className="dash-list-name">{m.firstName} {m.lastName}</div>
                  <div className="dash-list-sub">{m.createdAt ? formatShortDate(m.createdAt) : ''}</div>
                </div>
                <StatusBadge status={m.status} />
              </div>
            ))
          )}
        </div>

      </div>
    </div>
  );
}
