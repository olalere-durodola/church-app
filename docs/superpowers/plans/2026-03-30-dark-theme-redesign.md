# Dark Theme Redesign Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace the light theme with a dark/navy design, update the attendance page to a 3-column layout with a live breakdown panel, and remove the Departments card from the dashboard.

**Architecture:** All colour changes flow through CSS custom properties in `main.css` — pages inherit the dark theme without JSX edits. Two pages (Dashboard, Attendance) get targeted JSX changes. `AttendancePieChart` gets Recharts dark-theme props for use on the History page.

**Tech Stack:** React 18 + TypeScript + Vite + CSS custom properties + Recharts

---

## File Map

| File | What changes |
|---|---|
| `src/styles/main.css` | CSS tokens, sidebar gradient/width, sidebar nav states, card styles, input/button/table dark overrides |
| `src/pages/DashboardPage.tsx` | Remove Departments card + computation; Recently Added spans full width |
| `src/pages/AttendancePage.tsx` | Remove pie chart; new 3-column layout; inline breakdown panel |
| `src/components/AttendancePieChart.tsx` | Recharts dark-theme props (Tooltip, Legend, label) |

`src/App.tsx` and `src/components/Sidebar.tsx` need **no changes**. The spec lists `App.tsx` for the `220px → 240px` grid change, but `App.tsx` uses `className="layout"` with no inline style — the column width lives in the `.layout` rule in `main.css` (line 113). The plan's Task 1 Step 3 updates that rule directly.

---

## Task 1: CSS Design Tokens, Core Styles, and Sidebar

**Files:**
- Modify: `src/styles/main.css`

### What to change and where

**`:root` block (lines 6–52):**

- [ ] **Step 1: Update colour tokens**

  Replace these six token values in the `:root` block:

  ```css
  --color-bg: #0f172a;
  --color-surface: #1e293b;
  --color-border: rgba(255, 255, 255, 0.07);
  --color-text-primary: #f1f5f9;
  --color-text-secondary: #94a3b8;
  --color-text-label: #475569;
  ```

- [ ] **Step 2: Remove `--color-sidebar-bg` token and add `--color-input-bg`**

  Delete the line:
  ```css
  --color-sidebar-bg: #1e293b;
  ```
  Add in its place:
  ```css
  --color-input-bg: #0f172a;
  ```

**`.layout` rule (line 113):**

- [ ] **Step 3: Update layout column width**

  ```css
  grid-template-columns: 240px 1fr;
  ```

**`.sidebar` rule (line 125–135):**

- [ ] **Step 4: Replace sidebar background with navy gradient**

  Change `background-color: var(--color-sidebar-bg);` to:
  ```css
  background: linear-gradient(180deg, #1e3a5f 0%, #0f2744 100%);
  ```

- [ ] **Step 4b: Update sidebar nav item states**

  The sidebar nav link rules need these changes (find each rule in the `SIDEBAR` section):

  **`.sidebar-link`** — change `color` from `#94a3b8` to:
  ```css
  color: rgba(255, 255, 255, 0.55);
  ```

  **`.sidebar-link:hover`** — change `background-color` to:
  ```css
  background-color: rgba(255, 255, 255, 0.07);
  ```

  **`.sidebar-link.active`** — change `background-color` to `rgba(255,255,255,0.15)` and add `font-weight: 600`:
  ```css
  .sidebar-link.active {
    color: var(--color-sidebar-text);
    background-color: rgba(255, 255, 255, 0.15);
    border-left-color: var(--color-sidebar-active);
    font-weight: 600;
  }
  ```

  **`.sidebar-brand`** — change bottom border to:
  ```css
  border-bottom: 1px solid rgba(255, 255, 255, 0.10);
  ```

  **`.sidebar-signout`** — change `color` to:
  ```css
  color: rgba(255, 255, 255, 0.4);
  ```

**`.card` rule (lines 240–246):**

- [ ] **Step 5: Update card border-radius and replace box-shadow with border**

  ```css
  .card {
    background: var(--color-surface);
    border: 1px solid var(--color-border);
    border-radius: 10px;
    overflow: hidden;
  }
  ```
  Remove the `box-shadow: var(--shadow-card);` line.

**`td` rule (lines 292–297):**

- [ ] **Step 6: Fix hard-coded `td` border**

  Change:
  ```css
  border-bottom: 1px solid #f1f5f9;
  ```
  To:
  ```css
  border-bottom: 1px solid var(--color-border);
  ```

**`tbody tr:hover` rule (lines 307–309):**

- [ ] **Step 7: Fix table row hover**

  Change:
  ```css
  background-color: var(--color-bg);
  ```
  To:
  ```css
  background-color: rgba(255, 255, 255, 0.03);
  ```

**`.btn-secondary` rule (lines 376–385):**

- [ ] **Step 8: Override secondary button for dark theme**

  Replace the entire `.btn-secondary` and `.btn-secondary:hover` blocks with:
  ```css
  .btn-secondary {
    background-color: transparent;
    color: #f1f5f9;
    border: 1px solid rgba(255, 255, 255, 0.15);
  }

  .btn-secondary:hover {
    background-color: rgba(255, 255, 255, 0.06);
    border-color: rgba(255, 255, 255, 0.25);
  }
  ```

**Input styles (lines 412–466):**

- [ ] **Step 9: Update input backgrounds and remove hard-coded disabled style**

  In the `input[type='text'], ... select, textarea` rule, change:
  ```css
  background-color: var(--color-input-bg);
  border: 1px solid rgba(255, 255, 255, 0.08);
  color: var(--color-text-primary);
  ```

  Replace the `input:disabled, select:disabled, textarea:disabled` block (lines 460–466) with:
  ```css
  input:disabled,
  select:disabled,
  textarea:disabled {
    opacity: 0.5;
    cursor: not-allowed;
  }
  ```

- [ ] **Step 10: Verify the build passes**

  ```bash
  cd /c/church-app && npm run build
  ```
  Expected: `✓ built in` — no TypeScript errors.

- [ ] **Step 11: Commit**

  ```bash
  cd /c/church-app && git add src/styles/main.css && git commit -m "feat: dark theme — CSS tokens, sidebar gradient, card/input/table styles"
  ```

---

## Task 2: Dashboard — Remove Departments Card

**Files:**
- Modify: `src/pages/DashboardPage.tsx`

- [ ] **Step 1: Remove `deptCounts` and `deptEntries` computation**

  Delete lines 74–78 (the two variables nothing else uses):
  ```typescript
  // DELETE these lines:
  const deptCounts: Record<string, number> = {};
  members.forEach(m => (m.departments ?? []).forEach(d => {
    deptCounts[d] = (deptCounts[d] ?? 0) + 1;
  }));
  const deptEntries = Object.entries(deptCounts).sort((a, b) => b[1] - a[1]);
  ```

- [ ] **Step 2: Remove the Departments card JSX**

  Delete the entire `{/* Departments */}` card block — the `<div className="card dash-card-span2">` that contains `deptEntries.map(...)`.

- [ ] **Step 3: Make Recently Added span full width**

  Find the Recently Added card (currently `className="card dash-card-tall"`) and change to:
  ```tsx
  <div className="card dash-card-tall dash-card-span2">
  ```

- [ ] **Step 4: Verify build passes**

  ```bash
  cd /c/church-app && npm run build
  ```
  Expected: no TypeScript errors. No unused variable warnings for `deptCounts`/`deptEntries`.

- [ ] **Step 5: Commit**

  ```bash
  cd /c/church-app && git add src/pages/DashboardPage.tsx && git commit -m "feat: remove Departments card from dashboard, Recently Added spans full width"
  ```

---

## Task 3: AttendancePieChart — Dark Theme Props

**Files:**
- Modify: `src/components/AttendancePieChart.tsx`

The pie chart is now only used on `AttendanceHistoryPage`. Apply dark-theme Recharts props so text and tooltips are legible on the dark background.

- [ ] **Step 1: Update `<Tooltip>` with dark contentStyle**

  Change line 42:
  ```tsx
  <Tooltip
    formatter={(value) => [value]}
    contentStyle={{ background: '#1e293b', border: '1px solid rgba(255,255,255,0.1)', color: '#f1f5f9' }}
  />
  ```

- [ ] **Step 2: Update `<Legend>` with dark wrapperStyle**

  Change line 43:
  ```tsx
  <Legend wrapperStyle={{ color: '#94a3b8' }} />
  ```

- [ ] **Step 3: Update `<Pie>` label to render in light colour**

  Change the `label` prop on line 35 to include a `fill` on the label text. Replace the `label` prop value:
  ```tsx
  label={({ name, percent, x, y }) => (
    <text x={x} y={y} fill="#94a3b8" fontSize={12} textAnchor="middle" dominantBaseline="central">
      {`${name} ${((percent ?? 0) * 100).toFixed(0)}%`}
    </text>
  )}
  labelLine={{ stroke: '#475569' }}
  ```

- [ ] **Step 4: Verify build passes**

  ```bash
  cd /c/church-app && npm run build
  ```
  Expected: no TypeScript errors.

- [ ] **Step 5: Commit**

  ```bash
  cd /c/church-app && git add src/components/AttendancePieChart.tsx && git commit -m "feat: dark theme props for AttendancePieChart (tooltip, legend, label)"
  ```

---

## Task 4: Attendance Page — 3-Column Layout + Live Breakdown Panel

**Files:**
- Modify: `src/pages/AttendancePage.tsx`
- Modify: `src/styles/main.css`

### Part A — Remove pie chart from AttendancePage

- [ ] **Step 1: Remove `AttendancePieChart` import and related code**

  Delete all four of these — `selectedRecord` is only used by `showChart` and the chart render, so all four are safe to remove together:

  1. Import (line 10): `import AttendancePieChart from '../components/AttendancePieChart';`
  2. `selectedRecord` variable (line 116): `const selectedRecord = selectedDate ? records.get(selectedDate) : undefined;`
  3. `showChart` variable (line 117): `const showChart = !!(selectedRecord && selectedRecord.total > 0);`
  4. The conditional chart render block (lines 195–197):
  ```tsx
  {showChart && selectedRecord && selectedDate && (
    <AttendancePieChart record={selectedRecord} date={selectedDate} />
  )}
  ```

### Part B — New 3-column layout

- [ ] **Step 2: Replace `.attendance-top` layout in JSX**

  The current JSX wraps the calendar and form in `<div className="attendance-top">`. Change this to:
  ```tsx
  <div className="attendance-columns">
  ```
  The breakdown panel will be added as a third child inside this wrapper.

- [ ] **Step 3: Add the breakdown panel as third column**

  Inside `attendance-columns`, after the `attendance-form-card` div, add:
  ```tsx
  {/* Breakdown Panel */}
  <div className="attendance-breakdown">
    <div className="breakdown-label">Breakdown</div>
    {(['men', 'women', 'children', 'visitors'] as const).map(field => {
      const count = selectedDate ? (form[field] ?? 0) : null;
      const pct = count !== null && total > 0 ? Math.round((count / total) * 100) : 0;
      const color = { men: '#3b82f6', women: '#ec4899', children: '#f97316', visitors: '#a855f7' }[field];
      return (
        <div key={field} className="breakdown-row">
          <div className="breakdown-row-top">
            <span className="breakdown-field-label">{field.charAt(0).toUpperCase() + field.slice(1)}</span>
            <span className="breakdown-field-value" style={{ color }}>
              {count !== null ? count : '—'}{count !== null ? ` (${pct}%)` : ''}
            </span>
          </div>
          <div className="breakdown-bar-track">
            <div className="breakdown-bar-fill" style={{ width: `${pct}%`, background: color }} />
          </div>
        </div>
      );
    })}
    <div className="breakdown-total">
      <div className="breakdown-total-label">Total</div>
      <div className="breakdown-total-value">{selectedDate ? total : '—'}</div>
    </div>
  </div>
  ```

### Part C — CSS for new layout

- [ ] **Step 4: Replace `.attendance-top` CSS with new 3-column styles**

  In `main.css`, replace the `.attendance-top` block (lines 815–826) with:
  ```css
  .attendance-columns {
    display: flex;
    gap: 1.5rem;
    align-items: flex-start;
  }

  /* Calendar is first child — give it a fixed width */
  .attendance-columns > .cal-wrapper {
    width: 260px;
    flex-shrink: 0;
  }

  /* Form card is middle child — flex grow */
  .attendance-columns > .attendance-form-card {
    flex: 1;
    min-width: 0;
  }

  /* Breakdown is third child — fixed width */
  .attendance-breakdown {
    width: 180px;
    flex-shrink: 0;
  }

  @media (max-width: 900px) {
    .attendance-columns {
      flex-wrap: wrap;
    }
    .attendance-columns > .cal-wrapper,
    .attendance-breakdown {
      width: 100%;
      min-width: 220px;
    }
  }
  ```

- [ ] **Step 5: Add breakdown panel CSS**

  Note: Step 4 set `.attendance-breakdown { width: 180px; flex-shrink: 0; }` (layout properties). Step 5 adds visual properties to the same class — these are complementary rules that will be merged by the browser. Do not remove either block.

  Append to the end of `main.css`:
  ```css
  /* ── Attendance Breakdown Panel ─────────────────────────────── */
  .attendance-breakdown {
    background: var(--color-surface);
    border: 1px solid var(--color-border);
    border-radius: 10px;
    padding: 1.25rem;
    display: flex;
    flex-direction: column;
    gap: 0.75rem;
  }

  .breakdown-label {
    font-size: 0.7rem;
    font-weight: 700;
    text-transform: uppercase;
    letter-spacing: 0.07em;
    color: var(--color-text-secondary);
    margin-bottom: 0.25rem;
  }

  .breakdown-row {
    display: flex;
    flex-direction: column;
    gap: 0.3rem;
  }

  .breakdown-row-top {
    display: flex;
    justify-content: space-between;
    align-items: baseline;
    font-size: 0.78rem;
  }

  .breakdown-field-label {
    color: var(--color-text-secondary);
  }

  .breakdown-field-value {
    font-weight: 600;
    font-size: 0.75rem;
  }

  .breakdown-bar-track {
    height: 6px;
    background: rgba(255, 255, 255, 0.06);
    border-radius: var(--border-radius-full);
    overflow: hidden;
  }

  .breakdown-bar-fill {
    height: 100%;
    border-radius: var(--border-radius-full);
    transition: width 0.2s ease;
  }

  .breakdown-total {
    margin-top: 0.5rem;
    padding-top: 0.75rem;
    border-top: 1px solid var(--color-border);
  }

  .breakdown-total-label {
    font-size: 0.72rem;
    color: var(--color-text-secondary);
    text-transform: uppercase;
    letter-spacing: 0.05em;
    margin-bottom: 0.2rem;
  }

  .breakdown-total-value {
    font-size: 1.75rem;
    font-weight: 700;
    color: var(--color-text-primary);
    line-height: 1;
  }
  ```

- [ ] **Step 6: Add calendar legend text**

  `AttendanceCalendar` already renders its own `.cal-wrapper` div. Wrap the `<AttendanceCalendar />` call in a flex column so the legend sits below it:

  Replace:
  ```tsx
  <AttendanceCalendar
    selectedDate={selectedDate}
    recordedDates={recordedDates}
    onSelect={handleDateSelect}
  />
  ```
  With:
  ```tsx
  <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
    <AttendanceCalendar
      selectedDate={selectedDate}
      recordedDates={recordedDates}
      onSelect={handleDateSelect}
    />
    <p style={{ fontSize: '0.72rem', color: 'var(--color-text-secondary)', paddingLeft: '0.25rem' }}>
      ● = attendance recorded
    </p>
  </div>
  ```

- [ ] **Step 7: Verify build passes**

  ```bash
  cd /c/church-app && npm run build
  ```
  Expected: no TypeScript errors, no unused import warnings.

- [ ] **Step 8: Commit**

  ```bash
  cd /c/church-app && git add src/pages/AttendancePage.tsx src/styles/main.css && git commit -m "feat: attendance page 3-column layout with live breakdown panel"
  ```

---

## Task 5: Build and Deploy

- [ ] **Step 1: Final build**

  ```bash
  cd /c/church-app && npm run build
  ```
  Expected: `✓ built in` with no errors.

- [ ] **Step 2: Deploy to Firebase hosting**

  ```bash
  cd /c/church-app && firebase deploy --only hosting
  ```
  Expected: `Deploy complete!` with hosting URL.

- [ ] **Step 3: Commit any remaining changes**

  ```bash
  cd /c/church-app && git status
  ```
  If any files remain unstaged, commit them.
