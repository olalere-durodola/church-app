# Dark Theme Redesign — Design Spec
**Date:** 2026-03-30
**Status:** Approved

---

## Overview

Redesign the app's visual language to a dark, modern theme with a navy sidebar. Two pages get layout changes: Dashboard (card removal) and Attendance (live breakdown panel + pie chart removal). All other pages adopt the dark theme passively through CSS variable changes.

---

## 1. Design System Changes

### Colour Tokens (CSS variables in `main.css`)

All tokens listed here exist in `main.css` unless noted as NEW.

| Token | Old Value | New Value |
|---|---|---|
| `--color-bg` | `#f8fafc` | `#0f172a` |
| `--color-surface` | `#ffffff` | `#1e293b` |
| `--color-border` | `#e2e8f0` | `rgba(255,255,255,0.07)` |
| `--color-text-primary` | `#0f172a` | `#f1f5f9` |
| `--color-text-secondary` | `#64748b` | `#94a3b8` |
| `--color-text-label` | `#374151` | `#475569` |

**NEW token to add:**

| Token | Value | Used by |
|---|---|---|
| `--color-input-bg` | `#0f172a` | Input/select/textarea backgrounds |

**Token to REMOVE from colour table (handled by direct rule change instead):**
- `--color-sidebar-bg` — the sidebar now uses a `linear-gradient` that cannot be expressed as a single token. The `.sidebar` rule changes directly (see §2). Remove the token from `:root` and remove any usage of `var(--color-sidebar-bg)` in `.sidebar`.

**Hard-coded values to fix (not token changes):**
- `main.css` `td` border: change `border-bottom: 1px solid #f1f5f9` → `border-bottom: 1px solid var(--color-border)`
- `main.css` `tbody tr:hover` background: change `background-color: var(--color-bg)` → `background-color: rgba(255,255,255,0.03)`

### Input / Form Element Styles

Update the input/select/textarea rule in `main.css`:
- `background`: change from `var(--color-surface)` to `var(--color-input-bg)`
- `border-color`: change to `rgba(255,255,255,0.08)`
- `color`: change to `var(--color-text-primary)`
- **Remove** the existing disabled rule that sets `background-color: #f8fafc`. Replace with `opacity: 0.5` on `:disabled` state.

### Button Styles

`.btn-secondary` — override the rule directly (do not add new tokens):
- `background`: `transparent`
- `border-color`: `rgba(255,255,255,0.15)`
- `color`: `#f1f5f9`
- `:hover` background: `rgba(255,255,255,0.06)`

`.btn-primary` and `.btn-danger`: no changes.

### Cards / Surfaces

- `border-radius` on `.card`: increase to `10px`
- `box-shadow` on `.card`: remove light shadow; replace with `border: 1px solid var(--color-border)`

---

## 2. Sidebar Redesign

### CSS Rule Change

Replace the `.sidebar` background from `var(--color-sidebar-bg)` with:
```css
background: linear-gradient(180deg, #1e3a5f 0%, #0f2744 100%);
```

Remove `--color-sidebar-bg` from `:root` (no longer used).

### Width
- Increase from `220px` to `240px`
- Update `App.tsx` layout grid column from `220px 1fr` → `240px 1fr`

### Nav item states
- Active: `background: rgba(255,255,255,0.15)`, `color: #ffffff`, `font-weight: 600`. Keep the existing blue `border-left: 3px solid #3b82f6` accent.
- Inactive: `color: rgba(255,255,255,0.55)`, no background
- Hover: `background: rgba(255,255,255,0.07)`

### Brand area
No logic changes. Logo image + "Covenant Embassy" text. Bottom border: `1px solid rgba(255,255,255,0.10)`.

### Sign-out button
`color: rgba(255,255,255,0.4)`, top border separator `rgba(255,255,255,0.08)`.

---

## 3. Dashboard Page Changes

### Remove Departments card
Remove the `🏛 Departments` JSX block from `DashboardPage.tsx` — the `<div className="card dash-card-span2">` that contains `deptEntries.map(...)`. Also remove the `deptCounts` and `deptEntries` computation above the return statement, as nothing else uses them.

### Recently Added card — span adjustment
After removing Departments, the "Recently Added" card (currently `dash-card-tall`, 1 column) is the only card in the final grid row. Update its className to also include `dash-card-span2` so it spans the full width of the row instead of being orphaned in one column.

### Remaining cards
- Total Members (stat card)
- Last Attendance (stat card)
- Birthdays This Week (stat card)
- Member Breakdown (Active / Visitors / Inactive counts)
- Attendance Trend (horizontal bar chart, last 4 sessions by attendance date)
- Upcoming Birthdays (list)
- Recently Added (member list with avatars, now full-width)

---

## 4. Attendance Page Layout Change

### Remove AttendancePieChart
Remove the `<AttendancePieChart>` component and its conditional render from `AttendancePage.tsx`. The breakdown panel (§4 below) serves the same informational purpose in a more integrated way. Remove the `showChart` variable and the `AttendancePieChart` import.

### New three-column layout
Replace the current two-column `.attendance-top` layout with a three-column flex row:

```
[  Calendar  ] [  Edit Form  ] [  Breakdown  ]
   260px         flex: 1         180px
```

All three panels are `.card` surfaces.

### Calendar panel (260px fixed width)
- Width: `260px` (up from current `~220px`)
- All existing functionality preserved (month navigation, date selection, recorded-date indicator dots)
- Add legend text at bottom: `● = attendance recorded` in muted colour

### Edit form panel (flex: 1)
No functional changes. Dark theme applied via CSS variable inheritance. Fields: Men, Women, Children, Visitors (2×2 grid), Sermon Title, Preacher, Total label + Save button.

### Breakdown panel (180px fixed width, NEW)

A live read-only panel that derives values from the same `form` state object — no new state, no additional Firestore queries.

**Contents (top to bottom):**
1. Section label: `"BREAKDOWN"` in small-caps muted style
2. Four rows — Men, Women, Children, Visitors:
   - Left: category label
   - Right: count + `(percentage%)`
   - Below: colour-coded progress bar, `6px` tall, full panel width
   - Percentage = `Math.round((count / total) * 100)` when `total > 0`, else `0`
3. Divider line
4. "Total" muted label + large white number (`total` value)

**Accent colours per category:**

| Category | Colour |
|---|---|
| Men | `#3b82f6` |
| Women | `#ec4899` |
| Children | `#f97316` |
| Visitors | `#a855f7` |

**No-date-selected state:** All counts show `—`, all bars are empty.

### Responsive behaviour
At viewport width `≤ 900px` (a new breakpoint — existing breakpoints are at `768px`), the three columns stack vertically: calendar → form → breakdown. Use `flex-wrap: wrap` on the container; each column has `min-width: 220px`.

---

## 5. AttendancePieChart Dark Theme (for AttendanceHistory page)

`AttendancePieChart` is still used on `AttendanceHistoryPage`. Apply these Recharts prop changes to keep it legible on dark backgrounds:

- `<Tooltip>`: add `contentStyle={{ background: '#1e293b', border: '1px solid rgba(255,255,255,0.1)', color: '#f1f5f9' }}`
- `<Legend>`: add `wrapperStyle={{ color: '#94a3b8' }}`
- `<Pie>` label: add `fill="#94a3b8"` to the label prop config (or use `labelLine={{ stroke: '#475569' }}`)

---

## 6. Files to Change

| File | Change |
|---|---|
| `src/styles/main.css` | CSS token updates, remove `--color-sidebar-bg`, sidebar gradient + width, card radius/border, input dark styles + disabled fix, `btn-secondary` override, `td` border fix, new `--color-input-bg` token |
| `src/App.tsx` | Grid column `220px` → `240px` |
| `src/components/Sidebar.tsx` | No logic change; CSS handles the visual |
| `src/pages/DashboardPage.tsx` | Remove Departments card JSX + computation; "Recently Added" gets `dash-card-span2` |
| `src/pages/AttendancePage.tsx` | Remove `AttendancePieChart` import/render; new 3-column layout; add inline breakdown panel |
| `src/components/AttendancePieChart.tsx` | Add Recharts dark-theme props (Tooltip, Legend, label fill) |

---

## 7. Out of Scope

- Page transition animations
- Mobile-first redesign (only the attendance 3-column collapse at 900px is in scope)
- Changes to Members, Birthdays, or Departments pages beyond inheriting dark theme via CSS variables
- Any data model or Firestore schema changes
