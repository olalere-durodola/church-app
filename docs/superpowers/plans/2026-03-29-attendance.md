# Attendance Tracking Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add an `/attendance` page where admins can record aggregate service attendance by date, view a pie chart breakdown, and browse history.

**Architecture:** A single-page layout with three stacked sections — a calendar+form pair (two columns), a recharts pie chart, and a history table. Attendance records are stored as Firestore documents keyed by `YYYY-MM-DD`. All Firestore reads happen on page load; date selection is local state only.

**Tech Stack:** React 18 + TypeScript + Vite + Firebase Firestore + recharts

---

## File Map

| Action | Path | Responsibility |
|--------|------|---------------|
| Create | `src/types/attendance.ts` | `AttendanceRecord` interface |
| Create | `src/utils/attendanceUtils.ts` | Pure helpers: `toDateString`, `getMonthDays`, `formatDisplayDate` |
| Create | `src/utils/attendanceUtils.test.ts` | Unit tests for pure helpers |
| Create | `src/components/AttendanceCalendar.tsx` | Monthly calendar grid (Mon–Sun, blue dot indicators) |
| Create | `src/components/AttendancePieChart.tsx` | recharts `PieChart` wrapper |
| Create | `src/pages/AttendancePage.tsx` | Main page: calendar + form + chart + history |
| Modify | `src/App.tsx` | Add `/attendance` route + nav link |
| Modify | `src/styles/main.css` | Calendar grid CSS |
| Modify | `firestore.rules` | Add `match /attendance/{date}` block |

---

### Task 1: Install recharts and create the AttendanceRecord type

**Files:**
- Create: `src/types/attendance.ts`

- [ ] **Step 1: Install recharts**

```bash
cd c:/church-app && npm install recharts
```

Expected: recharts added to package.json dependencies.

- [ ] **Step 2: Create the type file**

Create `src/types/attendance.ts`:

```typescript
import type { Timestamp } from 'firebase/firestore';

export interface AttendanceRecord {
  men: number;
  women: number;
  children: number;
  visitors: number;
  total: number;
  recordedAt: Timestamp;
}
```

- [ ] **Step 3: Verify TypeScript compiles**

```bash
cd c:/church-app && npx tsc --noEmit
```

Expected: no errors.

- [ ] **Step 4: Commit**

```bash
cd c:/church-app && git add src/types/attendance.ts package.json package-lock.json && git commit -m "feat: install recharts and add AttendanceRecord type"
```

---

### Task 2: Utility functions with tests (TDD)

**Files:**
- Create: `src/utils/attendanceUtils.ts`
- Create: `src/utils/attendanceUtils.test.ts`

- [ ] **Step 1: Write the failing tests**

Create `src/utils/attendanceUtils.test.ts`:

```typescript
import { describe, it, expect } from 'vitest';
import { toDateString, getMonthDays, formatDisplayDate } from './attendanceUtils';

describe('toDateString', () => {
  it('formats a date as YYYY-MM-DD', () => {
    expect(toDateString(new Date(2026, 2, 29))).toBe('2026-03-29');
  });

  it('zero-pads single-digit months and days', () => {
    expect(toDateString(new Date(2026, 0, 5))).toBe('2026-01-05');
  });
});

describe('getMonthDays', () => {
  it('returns 31 days for March', () => {
    const days = getMonthDays(2026, 3);
    expect(days).toHaveLength(31);
  });

  it('returns 28 days for February in a non-leap year', () => {
    const days = getMonthDays(2025, 2);
    expect(days).toHaveLength(28);
  });

  it('returns 29 days for February in a leap year', () => {
    const days = getMonthDays(2024, 2);
    expect(days).toHaveLength(29);
  });

  it('first day has the correct date', () => {
    const days = getMonthDays(2026, 3);
    expect(days[0].getFullYear()).toBe(2026);
    expect(days[0].getMonth()).toBe(2); // 0-indexed
    expect(days[0].getDate()).toBe(1);
  });

  it('last day of March is the 31st', () => {
    const days = getMonthDays(2026, 3);
    expect(days[30].getDate()).toBe(31);
  });

  it('throws RangeError for month 0', () => {
    expect(() => getMonthDays(2026, 0)).toThrow(RangeError);
  });

  it('throws RangeError for month 13', () => {
    expect(() => getMonthDays(2026, 13)).toThrow(RangeError);
  });
});

describe('formatDisplayDate', () => {
  it('formats YYYY-MM-DD as "D Mon YYYY" (no leading zero on day)', () => {
    expect(formatDisplayDate('2026-03-29')).toBe('29 Mar 2026');
  });

  it('formats January correctly without padding', () => {
    expect(formatDisplayDate('2026-01-05')).toBe('5 Jan 2026');
  });
});
```

- [ ] **Step 2: Run tests to confirm they fail**

```bash
cd c:/church-app && npx vitest run src/utils/attendanceUtils.test.ts
```

Expected: FAIL — "Cannot find module './attendanceUtils'"

- [ ] **Step 3: Implement the utility functions**

Create `src/utils/attendanceUtils.ts`:

```typescript
const MONTH_NAMES = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun',
                     'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

export function toDateString(date: Date): string {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

/**
 * Returns all Date objects for every day in the given month.
 * @param month — 1-based (January = 1, December = 12)
 */
export function getMonthDays(year: number, month: number): Date[] {
  if (month < 1 || month > 12) {
    throw new RangeError(`month must be 1–12, got ${month}`);
  }
  const days: Date[] = [];
  const date = new Date(year, month - 1, 1);
  while (date.getMonth() === month - 1) {
    days.push(new Date(date));
    date.setDate(date.getDate() + 1);
  }
  return days;
}

export function formatDisplayDate(dateStr: string): string {
  // dateStr is YYYY-MM-DD; parse without timezone shift
  const [year, month, day] = dateStr.split('-').map(Number);
  return `${day} ${MONTH_NAMES[month - 1]} ${year}`;
}
```

- [ ] **Step 4: Run tests to confirm they pass**

```bash
cd c:/church-app && npx vitest run src/utils/attendanceUtils.test.ts
```

Expected: all 9 tests PASS.

- [ ] **Step 5: Commit**

```bash
cd c:/church-app && git add src/utils/attendanceUtils.ts src/utils/attendanceUtils.test.ts && git commit -m "feat: add attendance date utility functions with tests"
```

---

### Task 3: AttendanceCalendar component

> **TDD note:** `AttendanceCalendar` and `AttendancePieChart` (Task 4) are presentational components that depend on recharts and DOM layout. recharts uses `ResizeObserver` and canvas internals that don't work reliably in jsdom. Unit tests are excluded for these two components; their logic is covered by the utility function tests in Task 2. The full page behaviour is verified manually via the dev server.

**Files:**
- Create: `src/components/AttendanceCalendar.tsx`
- Modify: `src/styles/main.css` (append calendar CSS)

- [ ] **Step 1: Create the calendar component**

Create `src/components/AttendanceCalendar.tsx`:

```tsx
import { useState } from 'react';
import { getMonthDays, toDateString } from '../utils/attendanceUtils';

const MONTH_NAMES = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December',
];
const DAY_NAMES = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];

interface Props {
  selectedDate: string | null;
  recordedDates: Set<string>;
  onSelect: (dateStr: string) => void;
}

export default function AttendanceCalendar({ selectedDate, recordedDates, onSelect }: Props) {
  const today = new Date();
  const [year, setYear] = useState(today.getFullYear());
  const [month, setMonth] = useState(today.getMonth() + 1); // 1-based

  const days = getMonthDays(year, month);
  // Monday = 0 offset in our grid; getDay() returns 0=Sun
  const firstDayOfWeek = days[0].getDay(); // 0=Sun,1=Mon,...
  const offset = firstDayOfWeek === 0 ? 6 : firstDayOfWeek - 1; // shift so Mon=0

  function prevMonth() {
    if (month === 1) { setMonth(12); setYear(y => y - 1); }
    else setMonth(m => m - 1);
  }

  function nextMonth() {
    if (month === 12) { setMonth(1); setYear(y => y + 1); }
    else setMonth(m => m + 1);
  }

  const todayStr = toDateString(today);

  return (
    <div className="cal-wrapper">
      <div className="cal-header">
        <button className="cal-nav-btn" onClick={prevMonth} aria-label="Previous month">‹</button>
        <span className="cal-title">{MONTH_NAMES[month - 1]} {year}</span>
        <button className="cal-nav-btn" onClick={nextMonth} aria-label="Next month">›</button>
      </div>
      <div className="cal-grid">
        {DAY_NAMES.map(d => (
          <div key={d} className="cal-day-name">{d}</div>
        ))}
        {Array.from({ length: offset }, (_, i) => (
          <div key={`empty-${i}`} className="cal-cell cal-empty" />
        ))}
        {days.map(date => {
          const str = toDateString(date);
          const isToday = str === todayStr;
          const isSelected = str === selectedDate;
          const hasRecord = recordedDates.has(str);
          return (
            <button
              key={str}
              className={`cal-cell cal-day${isToday ? ' cal-today' : ''}${isSelected ? ' cal-selected' : ''}`}
              onClick={() => onSelect(str)}
              aria-label={str}
              aria-pressed={isSelected}
            >
              {date.getDate()}
              {hasRecord && <span className="cal-dot" aria-hidden="true" />}
            </button>
          );
        })}
      </div>
    </div>
  );
}
```

- [ ] **Step 2: Append calendar CSS to main.css**

Read `src/styles/main.css` first to find the end of the file, then append:

```css
/* ── Attendance Calendar ────────────────────────────────────── */
.cal-wrapper {
  background: var(--surface);
  border: 1px solid var(--border);
  border-radius: 12px;
  padding: 1rem;
}

.cal-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 0.75rem;
}

.cal-title {
  font-weight: 600;
  font-size: 0.95rem;
  color: var(--text-primary);
}

.cal-nav-btn {
  background: none;
  border: 1px solid var(--border);
  border-radius: 6px;
  width: 32px;
  height: 32px;
  cursor: pointer;
  font-size: 1.2rem;
  color: var(--text-secondary);
  display: flex;
  align-items: center;
  justify-content: center;
  transition: background 0.15s;
}

.cal-nav-btn:hover {
  background: var(--surface-hover);
}

.cal-grid {
  display: grid;
  grid-template-columns: repeat(7, 1fr);
  gap: 2px;
}

.cal-day-name {
  font-size: 0.7rem;
  font-weight: 600;
  color: var(--text-muted);
  text-align: center;
  padding: 0.25rem 0;
  text-transform: uppercase;
  letter-spacing: 0.04em;
}

.cal-cell {
  position: relative;
  aspect-ratio: 1;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  border-radius: 8px;
  font-size: 0.82rem;
  cursor: pointer;
  border: none;
  background: none;
  color: var(--text-primary);
  transition: background 0.12s;
}

.cal-empty {
  cursor: default;
}

.cal-day:hover {
  background: var(--surface-hover);
}

.cal-today {
  font-weight: 700;
  color: var(--primary);
}

.cal-selected {
  background: var(--primary) !important;
  color: #fff !important;
}

.cal-dot {
  position: absolute;
  bottom: 3px;
  width: 4px;
  height: 4px;
  border-radius: 50%;
  background: var(--primary);
}

.cal-selected .cal-dot {
  background: rgba(255,255,255,0.8);
}
```

- [ ] **Step 3: Verify TypeScript compiles**

```bash
cd c:/church-app && npx tsc --noEmit
```

Expected: no errors.

- [ ] **Step 4: Commit**

```bash
cd c:/church-app && git add src/components/AttendanceCalendar.tsx src/styles/main.css && git commit -m "feat: add AttendanceCalendar component"
```

---

### Task 4: AttendancePieChart component

**Files:**
- Create: `src/components/AttendancePieChart.tsx`

- [ ] **Step 1: Create the pie chart component**

Create `src/components/AttendancePieChart.tsx`:

```tsx
import { PieChart, Pie, Cell, Legend, Tooltip, ResponsiveContainer } from 'recharts';
import type { AttendanceRecord } from '../types/attendance';

const SEGMENTS = [
  { key: 'men',      label: 'Men',      color: '#3b82f6' },
  { key: 'women',    label: 'Women',    color: '#ec4899' },
  { key: 'children', label: 'Children', color: '#22c55e' },
  { key: 'visitors', label: 'Visitors', color: '#f97316' },
] as const;

interface Props {
  record: AttendanceRecord;
}

export default function AttendancePieChart({ record }: Props) {
  const data = SEGMENTS.map(s => ({ name: s.label, value: record[s.key], color: s.color }))
    .filter(d => d.value > 0);

  if (data.length === 0) return null;

  return (
    <div className="chart-wrapper">
      <h2 className="section-title">Breakdown</h2>
      <ResponsiveContainer width="100%" height={280}>
        <PieChart>
          <Pie
            data={data}
            dataKey="value"
            nameKey="name"
            cx="50%"
            cy="50%"
            outerRadius={100}
            label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
            labelLine={true}
          >
            {data.map(entry => (
              <Cell key={entry.name} fill={entry.color} />
            ))}
          </Pie>
          <Tooltip formatter={(value: number) => [value, '']} />
          <Legend />
        </PieChart>
      </ResponsiveContainer>
    </div>
  );
}
```

- [ ] **Step 2: Append chart wrapper CSS to main.css**

Append to `src/styles/main.css`:

```css
/* ── Attendance Chart ───────────────────────────────────────── */
.chart-wrapper {
  background: var(--surface);
  border: 1px solid var(--border);
  border-radius: 12px;
  padding: 1.5rem;
}
```

- [ ] **Step 3: Verify TypeScript compiles**

```bash
cd c:/church-app && npx tsc --noEmit
```

Expected: no errors.

- [ ] **Step 4: Commit**

```bash
cd c:/church-app && git add src/components/AttendancePieChart.tsx src/styles/main.css && git commit -m "feat: add AttendancePieChart component"
```

---

### Task 5: AttendancePage — main page with Firestore integration

**Files:**
- Create: `src/pages/AttendancePage.tsx`

This is the largest task. It wires together the calendar, form, pie chart, and history table with Firestore reads/writes.

> **Zero-value records:** Do NOT add any guard that skips saving when `total === 0`. A record where all counts are zero is a valid save (e.g. an empty service day). Zero-value records must appear in the history table and show a blue dot on the calendar — they are saved exactly like any other record. The pie chart correctly suppresses itself when `total === 0` (via `data.length === 0` check in `AttendancePieChart`).

- [ ] **Step 1: Create AttendancePage.tsx**

Create `src/pages/AttendancePage.tsx`:

```tsx
import { useState, useEffect } from 'react';
import {
  collection, doc, getDocs, setDoc, serverTimestamp, orderBy, query,
} from 'firebase/firestore';
import { db } from '../firebase';
import type { AttendanceRecord } from '../types/attendance';
import { toDateString, formatDisplayDate } from '../utils/attendanceUtils';
import AttendanceCalendar from '../components/AttendanceCalendar';
import AttendancePieChart from '../components/AttendancePieChart';
import LoadingSpinner from '../components/LoadingSpinner';

interface FormState {
  men: number;
  women: number;
  children: number;
  visitors: number;
}

const EMPTY_FORM: FormState = { men: 0, women: 0, children: 0, visitors: 0 };

export default function AttendancePage() {
  const [records, setRecords] = useState<Map<string, AttendanceRecord>>(new Map());
  const [loading, setLoading] = useState(true);
  const [fetchError, setFetchError] = useState<string | null>(null);

  const [selectedDate, setSelectedDate] = useState<string | null>(null);
  const [form, setForm] = useState<FormState>(EMPTY_FORM);
  const [saving, setSaving] = useState(false);
  const [saveStatus, setSaveStatus] = useState<'idle' | 'success' | 'error'>('idle');

  // Fetch all records on mount
  useEffect(() => {
    const q = query(collection(db, 'attendance'), orderBy('__name__', 'desc'));
    getDocs(q)
      .then(snap => {
        const map = new Map<string, AttendanceRecord>();
        snap.forEach(d => map.set(d.id, d.data() as AttendanceRecord));
        setRecords(map);
      })
      .catch(() => setFetchError('Failed to load attendance records.'))
      .finally(() => setLoading(false));
  }, []);

  function handleDateSelect(dateStr: string) {
    setSelectedDate(dateStr);
    setSaveStatus('idle');
    const existing = records.get(dateStr);
    if (existing) {
      setForm({ men: existing.men, women: existing.women, children: existing.children, visitors: existing.visitors });
    } else {
      setForm(EMPTY_FORM);
    }
  }

  function handleInput(field: keyof FormState, raw: string) {
    const val = Math.max(0, parseInt(raw, 10) || 0);
    setForm(f => ({ ...f, [field]: val }));
    setSaveStatus('idle');
  }

  const total = form.men + form.women + form.children + form.visitors;

  async function handleSave() {
    if (!selectedDate) return;
    setSaving(true);
    setSaveStatus('idle');
    try {
      const record: Omit<AttendanceRecord, 'recordedAt'> & { recordedAt: unknown } = {
        ...form,
        total,
        recordedAt: serverTimestamp(),
      };
      await setDoc(doc(db, 'attendance', selectedDate), record, { merge: true });
      // Update local cache
      setRecords(prev => {
        const next = new Map(prev);
        next.set(selectedDate, { ...form, total } as AttendanceRecord);
        return next;
      });
      setSaveStatus('success');
    } catch {
      setSaveStatus('error');
    } finally {
      setSaving(false);
    }
  }

  const recordedDates = new Set(records.keys());
  const selectedRecord = selectedDate ? records.get(selectedDate) : undefined;
  const showChart = !!(selectedRecord && selectedRecord.total > 0);

  // History sorted by date descending (keys are YYYY-MM-DD so lexicographic = chronological)
  const history = Array.from(records.entries()).sort(([a], [b]) => b.localeCompare(a));

  if (loading) return <LoadingSpinner />;

  return (
    <div className="page-container">
      <h1 className="page-title">Attendance</h1>

      {fetchError && <div className="error-banner">{fetchError}</div>}

      {/* Top section: calendar + form */}
      <div className="attendance-top">
        <AttendanceCalendar
          selectedDate={selectedDate}
          recordedDates={recordedDates}
          onSelect={handleDateSelect}
        />

        <div className="attendance-form-card">
          <h2 className="section-title">
            {selectedDate ? formatDisplayDate(selectedDate) : 'Record Attendance'}
          </h2>
          {!selectedDate && (
            <p className="attendance-form-prompt">Select a date to record attendance.</p>
          )}
          <div className="form-fields">
            {(['men', 'women', 'children', 'visitors'] as const).map(field => (
              <label key={field} className="form-label">
                {field.charAt(0).toUpperCase() + field.slice(1)}
                <input
                  type="number"
                  min={0}
                  className="form-input"
                  value={form[field]}
                  disabled={!selectedDate}
                  onChange={e => handleInput(field, e.target.value)}
                />
              </label>
            ))}
          </div>
          <div className="attendance-total">Total: <strong>{total}</strong></div>
          <button
            className="btn btn-primary"
            onClick={handleSave}
            disabled={!selectedDate || saving}
          >
            {saving ? 'Saving…' : 'Save'}
          </button>
          {saveStatus === 'success' && <p className="save-success">Saved!</p>}
          {saveStatus === 'error' && <p className="save-error">Save failed. Try again.</p>}
        </div>
      </div>

      {/* Pie chart */}
      {showChart && selectedRecord && (
        <AttendancePieChart record={selectedRecord} />
      )}

      {/* History table */}
      <div className="table-card">
        <h2 className="section-title">History</h2>
        {history.length === 0 ? (
          <p className="empty-state">No records yet.</p>
        ) : (
          <div className="table-wrapper">
            <table className="data-table">
              <thead>
                <tr>
                  <th>Date</th>
                  <th>Men</th>
                  <th>Women</th>
                  <th>Children</th>
                  <th>Visitors</th>
                  <th>Total</th>
                  <th>Last Updated</th>
                </tr>
              </thead>
              <tbody>
                {history.map(([dateStr, rec]) => (
                  <tr
                    key={dateStr}
                    className={dateStr === selectedDate ? 'row-selected' : ''}
                    onClick={() => handleDateSelect(dateStr)}
                    style={{ cursor: 'pointer' }}
                  >
                    <td>{formatDisplayDate(dateStr)}</td>
                    <td>{rec.men}</td>
                    <td>{rec.women}</td>
                    <td>{rec.children}</td>
                    <td>{rec.visitors}</td>
                    <td><strong>{rec.total}</strong></td>
                    <td>{rec.recordedAt ? rec.recordedAt.toDate().toLocaleString() : '—'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
```

- [ ] **Step 2: Append attendance page CSS to main.css**

Append to `src/styles/main.css`:

```css
/* ── Attendance Page ────────────────────────────────────────── */
.attendance-top {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 1.5rem;
  margin-bottom: 1.5rem;
}

@media (max-width: 700px) {
  .attendance-top {
    grid-template-columns: 1fr;
  }
}

.attendance-form-card {
  background: var(--surface);
  border: 1px solid var(--border);
  border-radius: 12px;
  padding: 1.5rem;
  display: flex;
  flex-direction: column;
  gap: 1rem;
}

.attendance-form-prompt {
  color: var(--text-muted);
  font-size: 0.9rem;
  text-align: center;
  margin: auto;
}

.form-fields {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 0.75rem;
}

.attendance-total {
  font-size: 1rem;
  color: var(--text-secondary);
  border-top: 1px solid var(--border);
  padding-top: 0.75rem;
}

.save-success {
  color: var(--success, #22c55e);
  font-size: 0.85rem;
  margin: 0;
}

.save-error {
  color: var(--danger, #ef4444);
  font-size: 0.85rem;
  margin: 0;
}

.row-selected td {
  background: color-mix(in srgb, var(--primary) 8%, transparent);
}

.section-title {
  font-size: 1rem;
  font-weight: 600;
  color: var(--text-primary);
  margin: 0 0 0.5rem;
}
```

- [ ] **Step 3: Verify TypeScript compiles**

```bash
cd c:/church-app && npx tsc --noEmit
```

Expected: no errors.

- [ ] **Step 4: Commit**

```bash
cd c:/church-app && git add src/pages/AttendancePage.tsx src/styles/main.css && git commit -m "feat: add AttendancePage with Firestore integration"
```

---

### Task 6: Wire up routing, nav, and Firestore rules

**Files:**
- Modify: `src/App.tsx` — add /attendance route + Attendance nav link
- Modify: `firestore.rules` — add attendance collection rule

- [ ] **Step 1: Update App.tsx**

Add the import after the existing page imports (after the BirthdayDashboardPage import):

```tsx
// Before (existing lines 1-8):
import { BrowserRouter, Routes, Route, Navigate, NavLink } from 'react-router-dom';
import ProtectedRoute from './components/ProtectedRoute';
import LoginPage from './pages/LoginPage';
import MembersListPage from './pages/MembersListPage';
import AddMemberPage from './pages/AddMemberPage';
import MemberDetailPage from './pages/MemberDetailPage';
import BirthdayDashboardPage from './pages/BirthdayDashboardPage';
import { useAuth } from './hooks/useAuth';

// After (add one line):
import { BrowserRouter, Routes, Route, Navigate, NavLink } from 'react-router-dom';
import ProtectedRoute from './components/ProtectedRoute';
import LoginPage from './pages/LoginPage';
import MembersListPage from './pages/MembersListPage';
import AddMemberPage from './pages/AddMemberPage';
import MemberDetailPage from './pages/MemberDetailPage';
import BirthdayDashboardPage from './pages/BirthdayDashboardPage';
import AttendancePage from './pages/AttendancePage';
import { useAuth } from './hooks/useAuth';
```

Add the Attendance nav link inside the `<div className="nav-links">` block, after the Birthdays NavLink:

```tsx
// Before (lines 16-21):
        <NavLink to="/members" className={({ isActive }) => `nav-link${isActive ? ' active' : ''}`}>
          Members
        </NavLink>
        <NavLink to="/birthdays" className={({ isActive }) => `nav-link${isActive ? ' active' : ''}`}>
          Birthdays
        </NavLink>

// After:
        <NavLink to="/members" className={({ isActive }) => `nav-link${isActive ? ' active' : ''}`}>
          Members
        </NavLink>
        <NavLink to="/birthdays" className={({ isActive }) => `nav-link${isActive ? ' active' : ''}`}>
          Birthdays
        </NavLink>
        <NavLink to="/attendance" className={({ isActive }) => `nav-link${isActive ? ' active' : ''}`}>
          Attendance
        </NavLink>
```

Add the route after the /birthdays route (line 46):

```tsx
// Before (line 46):
        <Route path="/birthdays" element={<ProtectedRoute><Layout><BirthdayDashboardPage /></Layout></ProtectedRoute>} />

// After:
        <Route path="/birthdays" element={<ProtectedRoute><Layout><BirthdayDashboardPage /></Layout></ProtectedRoute>} />
        <Route path="/attendance" element={<ProtectedRoute><Layout><AttendancePage /></Layout></ProtectedRoute>} />
```

- [ ] **Step 2: Verify isAdmin() is defined in firestore.rules**

Before editing, confirm that `firestore.rules` already contains the `isAdmin()` function (from Module 1). Run:

```bash
grep -c "function isAdmin" c:/church-app/firestore.rules
```

Expected output: `1`. If the output is `0`, stop — the rules file is missing the isAdmin helper and the attendance rule will fail to deploy. In that case, add the full function block as documented in the Module 1 spec.

- [ ] **Step 3: Update firestore.rules**

Add inside the `match /databases/{database}/documents { ... }` block, alongside the existing members rule:

```
match /attendance/{date} {
  allow read, write: if isAdmin();
}
```

- [ ] **Step 4: Verify TypeScript compiles and all tests pass**

```bash
cd c:/church-app && npx tsc --noEmit && npx vitest run
```

Expected: no TS errors, all tests pass (including the 9 new attendanceUtils tests).

- [ ] **Step 5: Deploy updated Firestore rules**

```bash
cd c:/church-app && firebase deploy --only firestore:rules
```

Expected: "Deploy complete!"

- [ ] **Step 6: Commit**

```bash
cd c:/church-app && git add src/App.tsx firestore.rules && git commit -m "feat: wire up /attendance route and Firestore rules"
```

---

### Task 7: Build verification

- [ ] **Step 1: Run full test suite**

```bash
cd c:/church-app && npx vitest run
```

Expected: all tests pass (no failures).

- [ ] **Step 2: Run production build**

```bash
cd c:/church-app && npm run build
```

Expected: build succeeds (chunk size warning is acceptable, no errors).

- [ ] **Step 3: Commit if there are any outstanding changes**

```bash
cd c:/church-app && git status
```

If clean, no commit needed. If there are unstaged changes from build artifacts or similar, do not commit them (dist/ is gitignored).

---
