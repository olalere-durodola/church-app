# Dashboard & Profile Photos Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add a sidebar navigation, dashboard home page with key stats, and member profile photo upload/display throughout the app.

**Architecture:** Seven independent tasks in dependency order — shared components first (MemberAvatar), then app shell (CSS + Sidebar + routing), then the Dashboard page, then Firebase Storage wiring, then upload flow in MemberDetailPage, and finally avatar display in MembersListPage and DepartmentsPage.

**Tech Stack:** React 18 + TypeScript + Vite, Firebase Firestore + Storage, Vitest for tests, CSS custom properties.

**Spec:** `docs/superpowers/specs/2026-03-30-dashboard-and-profile-photos-design.md`

---

## File Map

| File | Action | Responsibility |
|------|--------|---------------|
| `src/components/MemberAvatar.tsx` | Create | Circular avatar — photo or initials fallback |
| `src/utils/avatarUtils.ts` | Create | Deterministic colour hash (testable pure function) |
| `src/utils/avatarUtils.test.ts` | Create | Unit tests for colour hash |
| `src/components/Sidebar.tsx` | Create | Left sidebar nav with sign-out |
| `src/styles/main.css` | Modify | Sidebar CSS, remove nav CSS, layout grid, rename variables |
| `src/App.tsx` | Modify | Remove Nav, add Sidebar, add Dashboard route |
| `src/pages/DashboardPage.tsx` | Create | Card-grid dashboard page |
| `src/firebase.ts` | Modify | Export `storage` instance |
| `storage.rules` | Create | Firebase Storage security rules |
| `firebase.json` | Modify | Add storage rules reference |
| `src/types/member.ts` | Modify | Add `photoURL?: string` |
| `src/pages/MemberDetailPage.tsx` | Modify | Avatar upload flow |
| `src/pages/MembersListPage.tsx` | Modify | Avatar thumbnail in table rows |
| `src/pages/DepartmentsPage.tsx` | Modify | Avatar in view + edit modals |

---

## Task 1: avatarUtils — colour hash utility

**Files:**
- Create: `src/utils/avatarUtils.ts`
- Create: `src/utils/avatarUtils.test.ts`

The deterministic colour logic needs to be a pure function so it can be unit tested. Extract it here, then import it from `MemberAvatar`.

- [ ] **Step 1: Write the failing tests**

Create `src/utils/avatarUtils.test.ts`:

```typescript
import { describe, it, expect } from 'vitest';
import { getAvatarColor, getInitials } from './avatarUtils';

describe('getInitials', () => {
  it('returns uppercase first letters of first and last name', () => {
    expect(getInitials('Adaeze', 'Okonkwo')).toBe('AO');
  });

  it('handles single-character names', () => {
    expect(getInitials('A', 'B')).toBe('AB');
  });

  it('returns ?? for empty strings', () => {
    expect(getInitials('', '')).toBe('??');
  });
});

describe('getAvatarColor', () => {
  it('returns a hex colour string', () => {
    const color = getAvatarColor('John', 'Doe');
    expect(color).toMatch(/^#[0-9a-f]{6}$/i);
  });

  it('returns the same colour for the same name', () => {
    expect(getAvatarColor('Jane', 'Smith')).toBe(getAvatarColor('Jane', 'Smith'));
  });

  it('returns one of the 8 palette colours', () => {
    const PALETTE = [
      '#3b82f6', '#22c55e', '#f97316', '#a855f7',
      '#ec4899', '#14b8a6', '#f59e0b', '#6366f1',
    ];
    const color = getAvatarColor('Emmanuel', 'Nwosu');
    expect(PALETTE).toContain(color);
  });
});
```

- [ ] **Step 2: Run to confirm they fail**

```bash
npx vitest run src/utils/avatarUtils.test.ts --root c:/church-app
```
Expected: FAIL — module not found.

- [ ] **Step 3: Implement avatarUtils**

Create `src/utils/avatarUtils.ts`:

```typescript
const AVATAR_COLORS = [
  '#3b82f6', '#22c55e', '#f97316', '#a855f7',
  '#ec4899', '#14b8a6', '#f59e0b', '#6366f1',
];

export function getInitials(firstName: string, lastName: string): string {
  const f = firstName.trim()[0]?.toUpperCase() ?? '?';
  const l = lastName.trim()[0]?.toUpperCase() ?? '?';
  return f + l;
}

export function getAvatarColor(firstName: string, lastName: string): string {
  const str = firstName + lastName;
  const sum = Array.from(str).reduce((acc, ch) => acc + ch.charCodeAt(0), 0);
  return AVATAR_COLORS[sum % AVATAR_COLORS.length];
}
```

- [ ] **Step 4: Run tests — expect PASS**

```bash
npx vitest run src/utils/avatarUtils.test.ts --root c:/church-app
```
Expected: 5 tests pass.

- [ ] **Step 5: Commit**

```bash
cd /c/church-app
git add src/utils/avatarUtils.ts src/utils/avatarUtils.test.ts
git commit -m "feat: add avatar colour hash and initials utilities"
```

---

## Task 2: MemberAvatar component

**Files:**
- Create: `src/components/MemberAvatar.tsx`

- [ ] **Step 1: Create MemberAvatar**

Create `src/components/MemberAvatar.tsx`:

```typescript
import { getInitials, getAvatarColor } from '../utils/avatarUtils';

interface MemberAvatarProps {
  photoURL?: string;
  firstName: string;
  lastName: string;
  size: 'sm' | 'md' | 'lg';
  onClick?: () => void;
}

const SIZE_PX = { sm: 28, md: 40, lg: 64 } as const;

export default function MemberAvatar({ photoURL, firstName, lastName, size, onClick }: MemberAvatarProps) {
  const px = SIZE_PX[size];
  const style: React.CSSProperties = {
    width: px,
    height: px,
    borderRadius: '50%',
    flexShrink: 0,
    cursor: onClick ? 'pointer' : 'default',
    position: 'relative',
    display: 'inline-flex',
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
  };

  if (photoURL) {
    return (
      <div style={style} onClick={onClick} className={onClick ? 'avatar-uploadable' : undefined}>
        <img
          src={photoURL}
          alt={`${firstName} ${lastName}`}
          style={{ width: '100%', height: '100%', objectFit: 'cover' }}
        />
        {onClick && <div className="avatar-camera-overlay">📷</div>}
      </div>
    );
  }

  return (
    <div
      style={{
        ...style,
        background: getAvatarColor(firstName, lastName),
        color: '#fff',
        fontWeight: 700,
        fontSize: px * 0.38,
        letterSpacing: '-0.02em',
      }}
      onClick={onClick}
      className={onClick ? 'avatar-uploadable' : undefined}
    >
      {getInitials(firstName, lastName)}
      {onClick && <div className="avatar-camera-overlay">📷</div>}
    </div>
  );
}
```

- [ ] **Step 2: Add avatar CSS to main.css**

Add this block near the end of `src/styles/main.css` (before the media queries):

```css
/* ── Member Avatar ──────────────────────────────────────────── */
.avatar-uploadable:hover .avatar-camera-overlay {
  opacity: 1;
}

.avatar-camera-overlay {
  position: absolute;
  inset: 0;
  background: rgba(0, 0, 0, 0.45);
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 1rem;
  opacity: 0;
  transition: opacity 0.15s ease;
  border-radius: 50%;
}
```

- [ ] **Step 3: Verify TypeScript compiles**

```bash
npx tsc --noEmit --project c:/church-app/tsconfig.json
```
Expected: no errors.

- [ ] **Step 4: Commit**

```bash
cd /c/church-app
git add src/components/MemberAvatar.tsx src/styles/main.css
git commit -m "feat: add MemberAvatar component with initials fallback and upload overlay"
```

---

## Task 3: CSS sidebar + app shell

**Files:**
- Modify: `src/styles/main.css`
- Create: `src/components/Sidebar.tsx`
- Modify: `src/App.tsx`

- [ ] **Step 1: Update CSS — variables, layout, sidebar, remove nav**

In `src/styles/main.css`:

**a) In `:root`, replace the nav/content variables:**
```css
/* Replace these three lines: */
--color-nav-bg: #1e293b;
--color-nav-text: #f1f5f9;
--color-nav-active: #3b82f6;
/* and these three spacing variables: */
--nav-height: 52px;
--content-max-width: 1200px;
--content-padding: 2rem 1.5rem;

/* With these: */
--color-sidebar-bg: #1e293b;
--color-sidebar-text: #f1f5f9;
--color-sidebar-active: #3b82f6;
```

**b) Replace the entire `.layout` and `.content` block:**
```css
.layout {
  display: grid;
  grid-template-columns: 220px 1fr;
  min-height: 100vh;
}

.content {
  flex: 1;
  padding: 2rem 1.5rem;
  overflow-y: auto;
}
```

**c) Replace the entire `/* NAVIGATION */` section (`.nav` through `.nav-signout:hover`) with:**
```css
/* ============================================================
   SIDEBAR
   ============================================================ */
.sidebar {
  background-color: var(--color-sidebar-bg);
  color: var(--color-sidebar-text);
  display: flex;
  flex-direction: column;
  min-height: 100vh;
  position: sticky;
  top: 0;
  height: 100vh;
  overflow-y: auto;
}

.sidebar-brand {
  padding: 1.25rem 1rem;
  font-size: 13px;
  font-weight: 700;
  color: var(--color-sidebar-text);
  letter-spacing: -0.01em;
  border-bottom: 1px solid rgba(255, 255, 255, 0.08);
  line-height: 1.4;
}

.sidebar-nav {
  display: flex;
  flex-direction: column;
  gap: 0.125rem;
  padding: 0.75rem 0.5rem;
  flex: 1;
}

.sidebar-link {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  padding: 0.5rem 0.75rem;
  font-size: 14px;
  font-weight: 500;
  color: #94a3b8;
  border-radius: var(--border-radius);
  transition: var(--transition);
  text-decoration: none;
  border-left: 3px solid transparent;
}

.sidebar-link:hover {
  color: var(--color-sidebar-text);
  background-color: rgba(255, 255, 255, 0.08);
}

.sidebar-link.active {
  color: var(--color-sidebar-text);
  background-color: rgba(59, 130, 246, 0.15);
  border-left-color: var(--color-sidebar-active);
}

.sidebar-signout {
  background: none;
  border: none;
  color: #94a3b8;
  font-size: 13px;
  font-weight: 500;
  cursor: pointer;
  padding: 0.75rem 1rem;
  text-align: left;
  transition: var(--transition);
  border-top: 1px solid rgba(255, 255, 255, 0.08);
}

.sidebar-signout:hover {
  color: var(--color-sidebar-text);
  background-color: rgba(255, 255, 255, 0.08);
}
```

**d) Remove the media query block for `.nav` (around line 691):**
```css
/* Delete this: */
.nav {
  padding: 0 1rem;
}
```

- [ ] **Step 2: Create Sidebar component**

Create `src/components/Sidebar.tsx`:

```typescript
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
```

- [ ] **Step 3: Update App.tsx**

In `src/App.tsx`:

```typescript
// Add import at top:
import Sidebar from './components/Sidebar';
import DashboardPage from './pages/DashboardPage';

// Replace the Nav function and Layout function with:
function Layout({ children }: { children: React.ReactNode }) {
  return (
    <div className="layout">
      <Sidebar />
      <main className="content">{children}</main>
    </div>
  );
}

// Replace the '/' route:
// Before: <Route path="/" element={<Navigate to="/members" replace />} />
// After:
<Route path="/" element={<ProtectedRoute><Layout><DashboardPage /></Layout></ProtectedRoute>} />

// Remove the Navigate import if no longer used elsewhere.
```

- [ ] **Step 4: Create a stub DashboardPage so the app compiles**

Create `src/pages/DashboardPage.tsx` with just a stub (will be filled in Task 4):

```typescript
export default function DashboardPage() {
  return (
    <div className="page">
      <div className="page-header"><h1>Dashboard</h1></div>
      <p>Coming soon…</p>
    </div>
  );
}
```

- [ ] **Step 5: Verify build**

```bash
npx tsc --noEmit --project c:/church-app/tsconfig.json
```
Expected: no errors.

- [ ] **Step 6: Manual test**

Run `npm run dev` in `c:/church-app` and verify:
- Sidebar appears on the left on all pages
- All nav links work
- Active link is highlighted
- Sign out still works
- `/` loads the stub dashboard

- [ ] **Step 7: Commit**

```bash
cd /c/church-app
git add src/styles/main.css src/components/Sidebar.tsx src/App.tsx src/pages/DashboardPage.tsx
git commit -m "feat: replace top nav with sidebar navigation and add dashboard stub"
```

---

## Task 4: DashboardPage — full implementation

**Files:**
- Modify: `src/pages/DashboardPage.tsx`

The attendance `orderBy` + `limit` query requires a Firestore composite index. If the index doesn't exist yet, the dashboard will show the full-page error fallback on first deploy — see Task 8 for how to resolve this.

- [ ] **Step 1: Implement DashboardPage**

Replace the stub content of `src/pages/DashboardPage.tsx`:

```typescript
import { useState, useEffect } from 'react';
import { collection, getDocs, query, orderBy, limit } from 'firebase/firestore';
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

export default function DashboardPage() {
  const [members, setMembers] = useState<Member[]>([]);
  const [attendance, setAttendance] = useState<AttendanceEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    Promise.all([
      getDocs(collection(db, 'members')),
      getDocs(query(collection(db, 'attendance'), orderBy('recordedAt', 'desc'), limit(4))),
    ])
      .then(([memberSnap, attSnap]) => {
        setMembers(memberSnap.docs.map(d => ({ id: d.id, ...d.data() } as Member)));
        setAttendance(attSnap.docs.map(d => ({ id: d.id, ...d.data() } as AttendanceEntry)));
      })
      .catch(() => setError('Failed to load dashboard data.'))
      .finally(() => setLoading(false));
  }, []);

  if (loading) return <LoadingSpinner />;
  if (error) return <div className="page"><p className="error-message">{error}</p></div>;

  const today = new Date();

  // Derived values
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

  // Department counts from members array
  const deptCounts: Record<string, number> = {};
  members.forEach(m => (m.departments ?? []).forEach(d => {
    deptCounts[d] = (deptCounts[d] ?? 0) + 1;
  }));
  const deptEntries = Object.entries(deptCounts).sort((a, b) => b[1] - a[1]);

  // Attendance trend (reversed to oldest-first for display)
  const trendRecords = [...attendance].reverse();
  const maxTotal = Math.max(...trendRecords.map(r => r.total), 1);

  // Days until birthday helper
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
              <div className="dash-card-sub">{formatShortDate(lastRecord.recordedAt)}</div>
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
                <div className="dash-bar-label">{formatShortDate(r.recordedAt)}</div>
                <div className="dash-bar-track">
                  <div className="dash-bar-fill" style={{ width: `${(r.total / maxTotal) * 100}%` }} />
                </div>
                <div className="dash-bar-num">{r.total}</div>
              </div>
            ))
          )}
        </div>

        {/* Recently Added */}
        <div className="card dash-card-tall">
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

        {/* Departments */}
        <div className="card dash-card-span2">
          <div className="dash-section-head">
            <span>🏛 Departments</span>
            <Link to="/departments" className="dash-link">Manage →</Link>
          </div>
          {deptEntries.length === 0 ? (
            <p className="empty-state">No departments yet</p>
          ) : (
            deptEntries.map(([name, count]) => (
              <div key={name} className="dash-bar-row">
                <div className="dash-bar-label">{name}</div>
                <div className="dash-bar-track">
                  <div className="dash-bar-fill" style={{ width: `${(count / (deptEntries[0][1] || 1)) * 100}%`, background: '#a855f7' }} />
                </div>
                <div className="dash-bar-num">{count}</div>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
}
```

- [ ] **Step 2: Add dashboard CSS to main.css**

Add this block near the end of `src/styles/main.css` (before media queries):

```css
/* ── Dashboard ──────────────────────────────────────────────── */
.dashboard-grid {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 1rem;
  align-items: start;
}

.dash-card {
  padding: 1.25rem;
}

.dash-card-span2 {
  grid-column: span 2;
  padding: 1.25rem;
}

.dash-card-tall {
  padding: 1.25rem;
}

.dash-card-label {
  font-size: 0.72rem;
  font-weight: 600;
  text-transform: uppercase;
  letter-spacing: 0.05em;
  color: var(--color-text-secondary);
  margin-bottom: 0.4rem;
}

.dash-card-value {
  font-size: 2.2rem;
  font-weight: 800;
  line-height: 1;
  margin-bottom: 0.3rem;
}

.dash-card-sub {
  font-size: 0.78rem;
  color: var(--color-text-secondary);
}

.dash-breakdown {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 1rem;
  margin-top: 0.75rem;
}

.dash-breakdown-value {
  font-size: 1.8rem;
  font-weight: 700;
  line-height: 1;
}

.dash-breakdown-label {
  font-size: 0.75rem;
  color: var(--color-text-secondary);
  margin-top: 0.2rem;
}

.dash-section-head {
  display: flex;
  justify-content: space-between;
  align-items: center;
  font-size: 0.88rem;
  font-weight: 600;
  color: var(--color-text-primary);
  margin-bottom: 0.75rem;
}

.dash-link {
  font-size: 0.75rem;
  color: var(--color-primary);
  text-decoration: none;
}

.dash-list-row {
  display: flex;
  align-items: center;
  gap: 0.6rem;
  padding: 0.45rem 0;
  border-bottom: 1px solid var(--color-border);
}

.dash-list-row:last-child {
  border-bottom: none;
}

.dash-list-name {
  font-size: 0.85rem;
  font-weight: 500;
  color: var(--color-text-primary);
}

.dash-list-sub {
  font-size: 0.73rem;
  color: var(--color-text-secondary);
}

.dash-badge-orange {
  font-size: 0.68rem;
  font-weight: 600;
  background: #fff7ed;
  color: #ea580c;
  padding: 0.15rem 0.45rem;
  border-radius: var(--border-radius-full);
  white-space: nowrap;
}

.dash-bar-row {
  display: flex;
  align-items: center;
  gap: 0.75rem;
  margin-bottom: 0.6rem;
}

.dash-bar-row:last-child {
  margin-bottom: 0;
}

.dash-bar-label {
  width: 72px;
  font-size: 0.75rem;
  color: var(--color-text-secondary);
  text-align: right;
  flex-shrink: 0;
  white-space: nowrap;
}

.dash-bar-track {
  flex: 1;
  background: var(--color-border);
  border-radius: var(--border-radius-full);
  height: 9px;
  overflow: hidden;
}

.dash-bar-fill {
  height: 100%;
  border-radius: var(--border-radius-full);
  background: var(--color-primary);
}

.dash-bar-num {
  width: 28px;
  font-size: 0.8rem;
  font-weight: 600;
  color: var(--color-text-primary);
  text-align: right;
}
```

- [ ] **Step 3: Verify TypeScript**

```bash
npx tsc --noEmit --project c:/church-app/tsconfig.json
```
Expected: no errors.

- [ ] **Step 4: Run all tests**

```bash
npx vitest run --root c:/church-app
```
Expected: all pass.

- [ ] **Step 5: Manual test**

Start dev server and verify dashboard loads, all cards render, links work, empty states show when no data.

- [ ] **Step 6: Commit**

```bash
cd /c/church-app
git add src/pages/DashboardPage.tsx src/styles/main.css
git commit -m "feat: implement dashboard page with stats, trend, birthdays and department cards"
```

---

## Task 5: Firebase Storage setup

**Files:**
- Modify: `src/firebase.ts`
- Create: `storage.rules`
- Modify: `firebase.json`
- Modify: `src/types/member.ts`

- [ ] **Step 1: Add storage export to firebase.ts**

In `src/firebase.ts`, add:
```typescript
import { getStorage } from 'firebase/storage';
// after the existing exports:
export const storage = getStorage(app);
```

- [ ] **Step 2: Add photoURL to Member type**

In `src/types/member.ts`, add `photoURL?: string;` after `createdAt`:
```typescript
export interface Member {
  // ... existing fields ...
  createdAt: Timestamp;
  photoURL?: string;
}
```

- [ ] **Step 3: Create storage.rules**

Create `storage.rules` in the project root:
```
rules_version = '2';
service firebase.storage {
  match /b/{bucket}/o {
    match /photos/{memberId} {
      allow read: if request.auth != null;
      allow write: if request.auth != null;
    }
  }
}
```

- [ ] **Step 4: Update firebase.json**

Add storage config to `firebase.json`:
```json
{
  "firestore": {
    "rules": "firestore.rules"
  },
  "storage": {
    "rules": "storage.rules"
  },
  "hosting": {
    "public": "dist",
    "ignore": ["firebase.json", "**/.*", "**/node_modules/**"],
    "rewrites": [
      { "source": "**", "destination": "/index.html" }
    ]
  }
}
```

- [ ] **Step 5: Verify TypeScript**

```bash
npx tsc --noEmit --project c:/church-app/tsconfig.json
```
Expected: no errors.

- [ ] **Step 6: Commit**

```bash
cd /c/church-app
git add src/firebase.ts src/types/member.ts storage.rules firebase.json
git commit -m "feat: add Firebase Storage export, storage rules, and photoURL to Member type"
```

---

## Task 6: Photo upload in MemberDetailPage

**Files:**
- Modify: `src/pages/MemberDetailPage.tsx`

- [ ] **Step 1: Add upload state and handler**

In `src/pages/MemberDetailPage.tsx`:

**Add imports:**
```typescript
import { ref, uploadBytes, getDownloadURL } from 'firebase/storage';
import { storage } from '../firebase';
import MemberAvatar from '../components/MemberAvatar';
import { useRef } from 'react';
```

**Add state (after existing state declarations):**
```typescript
const fileInputRef = useRef<HTMLInputElement>(null);
const [photoUploading, setPhotoUploading] = useState(false);
const [photoError, setPhotoError] = useState('');
```

**Add handler (after `handleSave`):**
```typescript
async function handlePhotoChange(e: React.ChangeEvent<HTMLInputElement>) {
  const file = e.target.files?.[0];
  if (!file || !member || !id) return;
  setPhotoError('');

  const allowed = ['image/jpeg', 'image/png', 'image/webp'];
  if (!allowed.includes(file.type)) {
    setPhotoError('Only JPEG, PNG, or WebP images are allowed.');
    return;
  }
  if (file.size > 5 * 1024 * 1024) {
    setPhotoError('Image must be smaller than 5 MB.');
    return;
  }

  setPhotoUploading(true);
  try {
    const storageRef = ref(storage, `photos/${id}`);
    await uploadBytes(storageRef, file, { contentType: file.type });
    const photoURL = await getDownloadURL(storageRef);
    await updateDoc(doc(db, 'members', id), { photoURL });
    setMember(prev => prev ? { ...prev, photoURL } : prev);
  } catch {
    setPhotoError('Failed to upload photo. Please try again.');
  } finally {
    setPhotoUploading(false);
    // Reset input so the same file can be re-selected if needed
    if (fileInputRef.current) fileInputRef.current.value = '';
  }
}
```

- [ ] **Step 2: Update the view-mode JSX**

In the view-mode `return` block, replace the `<h1>{member.firstName} {member.lastName}</h1>` section inside `.page-header` with:

```tsx
<div className="page-header">
  <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
    <div>
      <MemberAvatar
        photoURL={member.photoURL}
        firstName={member.firstName}
        lastName={member.lastName}
        size="lg"
        onClick={() => fileInputRef.current?.click()}
      />
      {photoUploading && <div style={{ fontSize: '0.75rem', color: 'var(--color-text-secondary)', marginTop: '0.25rem' }}>Uploading…</div>}
      {photoError && <div className="error-message" style={{ fontSize: '0.75rem', marginTop: '0.25rem' }}>{photoError}</div>}
      <input
        ref={fileInputRef}
        type="file"
        accept="image/jpeg,image/png,image/webp"
        style={{ display: 'none' }}
        onChange={handlePhotoChange}
      />
    </div>
    <div>
      <h1>{member.firstName} {member.lastName}</h1>
      <StatusBadge status={member.status} />
    </div>
  </div>
  <div style={{ display: 'flex', gap: '0.5rem' }}>
    <button className="btn-primary" onClick={() => startEditing(member)}>Edit</button>
    <Link to="/members"><button className="btn-secondary">← Back</button></Link>
  </div>
</div>
```

- [ ] **Step 3: Verify TypeScript**

```bash
npx tsc --noEmit --project c:/church-app/tsconfig.json
```
Expected: no errors.

- [ ] **Step 4: Manual test**

Open a member detail page, click the avatar, select a photo, verify it uploads and appears immediately. Test the 5 MB limit and invalid file type error messages.

- [ ] **Step 5: Commit**

```bash
cd /c/church-app
git add src/pages/MemberDetailPage.tsx
git commit -m "feat: add profile photo upload to member detail page"
```

---

## Task 7: MemberAvatar in MembersListPage and DepartmentsPage

**Files:**
- Modify: `src/pages/MembersListPage.tsx`
- Modify: `src/pages/DepartmentsPage.tsx`

- [ ] **Step 1: Add avatar to MembersListPage**

In `src/pages/MembersListPage.tsx`:

**Add import:**
```typescript
import MemberAvatar from '../components/MemberAvatar';
```

**Update the table `<th>` row** — add a blank `<th>` for the avatar column before "Name":
```tsx
<tr>
  <th></th>
  <th>Name</th>
  <th>Phone</th>
  <th>Status</th>
  <th>Gender</th>
  <th>Department</th>
</tr>
```

**Update the table `<td>` rows** — add avatar cell before name cell:
```tsx
{filtered.map(m => (
  <tr key={m.id}>
    <td style={{ width: '1px', paddingRight: 0 }}>
      <MemberAvatar photoURL={m.photoURL} firstName={m.firstName} lastName={m.lastName} size="sm" />
    </td>
    <td>
      <Link to={`/members/${m.id}`} style={{ fontWeight: 500, color: 'var(--color-primary)' }}>
        {m.firstName} {m.lastName}
      </Link>
    </td>
    {/* remaining cells unchanged */}
  </tr>
))}
```

- [ ] **Step 2: Add avatar to DepartmentsPage view modal**

In `src/pages/DepartmentsPage.tsx`:

**Add import:**
```typescript
import MemberAvatar from '../components/MemberAvatar';
```

**In the view overlay** (`{/* View overlay */}`), update each member row inside `viewMembers.map(m => ...)`:
```tsx
<div key={m.id} className="modal-member-row">
  <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
    <MemberAvatar photoURL={m.photoURL} firstName={m.firstName} lastName={m.lastName} size="sm" />
    <div>
      <div className="modal-member-name">{m.firstName} {m.lastName}</div>
      {m.phone && <div className="modal-member-phone">{m.phone}</div>}
    </div>
  </div>
  <StatusBadge status={m.status} />
</div>
```

**In the edit modal** (`{/* Edit modal */}`), update each member row inside `editMembers.map(m => ...)`:
```tsx
<div key={m.id} className="modal-member-row">
  <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
    <MemberAvatar photoURL={m.photoURL} firstName={m.firstName} lastName={m.lastName} size="sm" />
    <div>
      <div className="modal-member-name">{m.firstName} {m.lastName}</div>
      {m.phone && <div className="modal-member-phone">{m.phone}</div>}
    </div>
  </div>
  <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
    <StatusBadge status={m.status} />
    <button
      className="btn-danger"
      style={{ padding: '0.2rem 0.6rem', fontSize: '0.78rem' }}
      onClick={() => handleRemoveMember(m.id, editDept!.name)}
    >
      Remove
    </button>
  </div>
</div>
```

- [ ] **Step 3: Verify TypeScript and tests**

```bash
npx tsc --noEmit --project c:/church-app/tsconfig.json && npx vitest run --root c:/church-app
```
Expected: no errors, all tests pass.

- [ ] **Step 4: Manual test**

Verify avatars appear in:
- Members list table (thumbnail beside name)
- Department view overlay
- Department edit overlay

- [ ] **Step 5: Commit**

```bash
cd /c/church-app
git add src/pages/MembersListPage.tsx src/pages/DepartmentsPage.tsx
git commit -m "feat: add member avatars to members list and department modals"
```

---

## Task 8: Deploy

- [ ] **Step 1: Build**

```bash
cd /c/church-app && npm run build
```
Expected: build succeeds with no TypeScript errors.

- [ ] **Step 2: Deploy**

```bash
firebase deploy --only hosting,storage
```

Note: The `orderBy('recordedAt', 'desc')` query on the `attendance` collection may require a Firestore composite index. If the dashboard shows an error on first load after deploy, open the browser console — Firebase will show a link to create the required index. Click it and wait ~1 minute for it to build, then reload.

- [ ] **Step 3: Verify live site**

Check that sidebar, dashboard, member avatars, and photo upload all work on the deployed site.

- [ ] **Step 4: Final commit**

```bash
cd /c/church-app
git add -A
git commit -m "chore: post-deploy verification complete"
```
