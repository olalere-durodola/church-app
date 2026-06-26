import { useState, useEffect } from 'react';
import { collection, getDocs, query, limit } from 'firebase/firestore';
import { Link } from 'react-router-dom';
import { db } from '../firebase';
import type { Member } from '../types/member';
import type { AttendanceRecord } from '../types/attendance';
import type { Leave } from '../types/leave';
import { getBirthdaysComingUp } from '../utils/birthdayUtils';
import { MONTHS } from '../utils/dateConstants';
import { useCountUp } from '../hooks/useCountUp';
import LoadingSpinner from '../components/LoadingSpinner';
import StatusBadge from '../components/StatusBadge';
import MemberAvatar from '../components/MemberAvatar';

type AttendanceEntry = AttendanceRecord & { id: string };

const WEEKDAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

function formatShortDate(ts: { toDate(): Date }): string {
  const d = ts.toDate();
  return `${MONTHS[d.getMonth() + 1]} ${d.getDate()}`;
}

/** Format a YYYY-MM-DD document-ID date string for display */
function formatDateId(dateId: string): string {
  const [, month, day] = dateId.split('-').map(Number);
  return `${MONTHS[month]} ${day}`;
}

function greeting(): string {
  const h = new Date().getHours();
  if (h < 12) return 'Good morning';
  if (h < 17) return 'Good afternoon';
  return 'Good evening';
}

/** Next calendar occurrence of a month/day, measured from local midnight today. */
function nextBirthdayDate(month: number, day: number): Date {
  const now = new Date();
  const next = new Date(now.getFullYear(), month - 1, day);
  const midnight = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  if (next < midnight) next.setFullYear(now.getFullYear() + 1);
  return next;
}

function daysUntil(month: number, day: number): number {
  const now = new Date();
  const midnight = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  return Math.round((nextBirthdayDate(month, day).getTime() - midnight.getTime()) / 86400000);
}

/** Build a smooth-ish sparkline path + area path for a set of values. */
function sparkPaths(values: number[], w = 320, h = 84, pad = 6) {
  if (values.length < 2) return null;
  const min = Math.min(...values);
  const max = Math.max(...values);
  const span = max - min || 1;
  const stepX = (w - pad * 2) / (values.length - 1);
  const pts = values.map((v, i) => {
    const x = pad + i * stepX;
    const y = pad + (h - pad * 2) * (1 - (v - min) / span);
    return [x, y] as const;
  });
  const line = pts.map(([x, y], i) => `${i === 0 ? 'M' : 'L'}${x.toFixed(1)},${y.toFixed(1)}`).join(' ');
  const area = `${line} L${pts[pts.length - 1][0].toFixed(1)},${h} L${pts[0][0].toFixed(1)},${h} Z`;
  return { line, area, last: pts[pts.length - 1] };
}

/** Animated number that counts up on mount (respects reduced motion). */
function CountUp({ value }: { value: number }) {
  return <>{useCountUp(value).toLocaleString()}</>;
}

export default function DashboardPage() {
  const [members, setMembers] = useState<Member[]>([]);
  const [attendance, setAttendance] = useState<AttendanceEntry[]>([]);
  const [leaves, setLeaves] = useState<Leave[]>([]);
  const [openFollowUps, setOpenFollowUps] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    // followUps may not have rules deployed yet — keep it from breaking the dashboard
    getDocs(collection(db, 'followUps'))
      .then(snap => setOpenFollowUps(snap.docs.filter(d => (d.data() as { status?: string }).status === 'open').length))
      .catch(() => setOpenFollowUps(0));

    Promise.all([
      getDocs(collection(db, 'members')),
      getDocs(query(collection(db, 'attendance'), limit(100))),
      getDocs(collection(db, 'leaves')),
    ])
      .then(([memberSnap, attSnap, leaveSnap]) => {
        setMembers(memberSnap.docs.map(d => ({ id: d.id, ...d.data() } as Member)));
        const sorted = attSnap.docs
          .map(d => ({ id: d.id, ...d.data() } as AttendanceEntry))
          .sort((a, b) => b.id.localeCompare(a.id))
          .slice(0, 8);
        setAttendance(sorted);
        const today = new Date().toISOString().split('T')[0];
        setLeaves(
          leaveSnap.docs
            .map(d => ({ id: d.id, ...d.data() } as Leave))
            .filter(l => l.endDate >= today)
            .sort((a, b) => a.startDate.localeCompare(b.startDate))
        );
      })
      .catch(() => setError('Failed to load dashboard data.'))
      .finally(() => setLoading(false));
  }, []);

  if (loading) return <LoadingSpinner />;
  if (error) return <div className="page"><p className="error-message">{error}</p></div>;

  const today = new Date();
  const todayLabel = today.toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' });

  const totalMembers = members.length;
  const activeCount = members.filter(m => m.status === 'Active').length;
  const visitorCount = members.filter(m => m.status === 'Visitor').length;
  const inactiveCount = members.filter(m => m.status === 'Inactive').length;

  const thisMonthStart = new Date(today.getFullYear(), today.getMonth(), 1);
  const newThisMonth = members.filter(m => m.createdAt?.toDate() >= thisMonthStart).length;

  // Attendance: newest first in `attendance`; oldest→newest for the trend.
  const lastRecord = attendance[0] ?? null;
  const prevRecord = attendance[1] ?? null;
  const attDeltaPct =
    lastRecord && prevRecord && prevRecord.total > 0
      ? Math.round(((lastRecord.total - prevRecord.total) / prevRecord.total) * 100)
      : null;

  const trend = [...attendance].slice(0, 6).reverse();
  const spark = sparkPaths(trend.map(r => r.total));

  const birthdays = getBirthdaysComingUp(members, today);

  const recentlyAdded = [...members]
    .sort((a, b) => {
      const diff = (b.createdAt?.toMillis() ?? 0) - (a.createdAt?.toMillis() ?? 0);
      return diff !== 0 ? diff : a.fullName.localeCompare(b.fullName);
    })
    .slice(0, 5);

  // Department strength (derived from members[].departments)
  const deptCounts = new Map<string, number>();
  members.forEach(m => (m.departments ?? []).forEach(d => deptCounts.set(d, (deptCounts.get(d) ?? 0) + 1)));
  const topDepts = [...deptCounts.entries()].sort((a, b) => b[1] - a[1]).slice(0, 5);
  const maxDept = Math.max(1, ...topDepts.map(([, n]) => n));

  return (
    <div className="page">
      {/* HERO — "This Sunday" */}
      <section className="hero reveal">
        <div className="hero-head">
          <div>
            <div className="hero-eyebrow"><span className="ornament">✦</span>{todayLabel}</div>
            <h1 className="hero-title">{greeting()}</h1>
            <p className="hero-sub">{totalMembers.toLocaleString()} {totalMembers === 1 ? 'member' : 'members'} in the house</p>
          </div>
          <Link to="/attendance" className="btn-primary btn-lg hero-cta">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="m9 11 3 3 8-8" /><path d="M20 12v6a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2h9" /></svg>
            Take roll call
          </Link>
        </div>

        {/* Care thesis leads */}
        <div className="hero-care">
          <div className="micro-cap hero-care-label">Who needs care this week</div>
          <div className="hero-chips">
            <Link to="/follow-ups" className="hero-chip"><span className="cdot clay" />Needs follow-up <b>{openFollowUps}</b></Link>
            <Link to="/birthdays" className="hero-chip"><span className="cdot brass" />Birthdays <b>{birthdays.length}</b></Link>
            <Link to="/leave" className="hero-chip"><span className="cdot sage" />On leave <b>{leaves.length}</b></Link>
            <Link to="/visitors" className="hero-chip"><span className="cdot brass" />Visitors <b>{visitorCount}</b></Link>
            <span className="hero-chip"><span className="cdot muted" />Inactive <b>{inactiveCount}</b></span>
          </div>
        </div>

        <div className="hero-grid">
          {/* Stats column */}
          <div className="hero-stats">
            <div className="hero-stat">
              <div className="hero-stat-num">
                {lastRecord ? <CountUp value={lastRecord.total} /> : '—'}
                {attDeltaPct !== null && (
                  <span className={`hero-delta ${attDeltaPct >= 0 ? 'up' : 'down'}`}>
                    {attDeltaPct >= 0 ? '▲' : '▼'} {Math.abs(attDeltaPct)}%
                  </span>
                )}
              </div>
              <div className="hero-stat-lbl">
                {lastRecord ? `Present · ${formatDateId(lastRecord.id)}` : 'No attendance yet'}
              </div>
            </div>
            <div className="hero-divider" />
            <div className="hero-stat">
              <div className="hero-stat-num"><CountUp value={newThisMonth} /></div>
              <div className="hero-stat-lbl">New members this month</div>
            </div>
          </div>

          {/* Sparkline */}
          <div className="hero-spark">
            <div className="hero-spark-top">
              <span className="micro-cap">Attendance · last {trend.length} weeks</span>
              <span className="hero-spark-now">{lastRecord ? lastRecord.total : '—'}</span>
            </div>
            {spark ? (
              <svg viewBox="0 0 320 84" width="100%" height="84" preserveAspectRatio="none" aria-hidden="true">
                <defs>
                  <linearGradient id="sparkfill" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0" stopColor="rgba(201,162,75,.32)" />
                    <stop offset="1" stopColor="rgba(201,162,75,0)" />
                  </linearGradient>
                </defs>
                <path d={spark.area} fill="url(#sparkfill)" className="spark-area" />
                <path d={spark.line} fill="none" stroke="#C9A24B" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" pathLength={1} className="spark-line" />
                <circle cx={spark.last[0]} cy={spark.last[1]} r="4" fill="#C9A24B" className="spark-dot" />
              </svg>
            ) : (
              <p className="hero-empty">Not enough attendance history yet.</p>
            )}
          </div>

          {/* Birthdays this week */}
          <div className="hero-bdays">
            <div className="micro-cap">Birthdays this week</div>
            {birthdays.length === 0 ? (
              <p className="hero-empty">None this week.</p>
            ) : (
              <>
                {birthdays.slice(0, 4).map(m => {
                  const days = daysUntil(m.birthdayMonth!, m.birthdayDay!);
                  const dt = nextBirthdayDate(m.birthdayMonth!, m.birthdayDay!);
                  return (
                    <div key={m.id} className="bday-row">
                      <span className="bday-mark" />
                      <span className="bday-name">{m.firstName} {m.lastName}</span>
                      <span className="bday-day">{days === 0 ? 'Today' : `${WEEKDAYS[dt.getDay()]} ${dt.getDate()}`}</span>
                    </div>
                  );
                })}
                {birthdays.length > 4 && (
                  <Link to="/birthdays" className="bday-more">+ {birthdays.length - 4} more →</Link>
                )}
              </>
            )}
          </div>
        </div>
      </section>

      {/* SECONDARY CARDS */}
      <section className="dash-secondary">
        {/* Membership */}
        <div className="card dash-card reveal" style={{ animationDelay: '80ms' }}>
          <div className="card-cap"><span>Membership</span><Link to="/members">View all</Link></div>
          <div className="card-big"><CountUp value={totalMembers} /></div>
          <div className="card-big-sub">across the congregation</div>
          <div className="mini-breakdown">
            <div className="mb"><div className="mb-v sage">{activeCount}</div><div className="mb-k">Active</div></div>
            <div className="mb"><div className="mb-v brass">{visitorCount}</div><div className="mb-k">Visitors</div></div>
            <div className="mb"><div className="mb-v muted">{inactiveCount}</div><div className="mb-k">Inactive</div></div>
          </div>
        </div>

        {/* Departments */}
        <div className="card dash-card reveal" style={{ animationDelay: '160ms' }}>
          <div className="card-cap"><span>Departments</span><Link to="/departments">Manage</Link></div>
          {topDepts.length === 0 ? (
            <p className="empty-state">No departments yet</p>
          ) : (
            topDepts.map(([name, n]) => (
              <div key={name} className="dash-bar-row">
                <div className="dash-bar-label">{name}</div>
                <div className="dash-bar-track"><div className="dash-bar-fill" style={{ width: `${(n / maxDept) * 100}%` }} /></div>
                <div className="dash-bar-num">{n}</div>
              </div>
            ))
          )}
        </div>

        {/* Recently joined */}
        <div className="card dash-card reveal" style={{ animationDelay: '240ms' }}>
          <div className="card-cap"><span>Recently joined</span><Link to="/members">View all</Link></div>
          <div className="dash-scroll-list">
            {recentlyAdded.length === 0 ? (
              <p className="empty-state">No members yet</p>
            ) : (
              recentlyAdded.map(m => (
                <div key={m.id} className="dash-list-row">
                  <MemberAvatar photoURL={m.photoURL} firstName={m.firstName} lastName={m.lastName} size="md" />
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div className="dash-list-name">{m.firstName} {m.lastName}</div>
                    <div className="dash-list-sub">{m.createdAt ? formatShortDate(m.createdAt) : ''}</div>
                  </div>
                  <StatusBadge status={m.status} />
                </div>
              ))
            )}
          </div>
        </div>
      </section>
    </div>
  );
}
