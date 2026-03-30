# Dark Theme Redesign — Design Spec
**Date:** 2026-03-30
**Status:** Approved

---

## Overview

Redesign the app's visual language to a dark, modern theme with a navy sidebar. Two pages get layout changes: Dashboard (card removal) and Attendance (live breakdown panel). All other pages adopt the dark theme passively through CSS variable changes.

---

## 1. Design System Changes

### Colour Tokens (CSS variables in `main.css`)

| Token | Old Value | New Value |
|---|---|---|
| `--color-bg` | `#f8fafc` | `#0f172a` |
| `--color-surface` | `#ffffff` | `#1e293b` |
| `--color-border` | `#e2e8f0` | `rgba(255,255,255,0.07)` |
| `--color-text` | `#0f172a` | `#f1f5f9` |
| `--color-text-secondary` | `#64748b` | `#94a3b8` |
| `--color-text-muted` | `#94a3b8` | `#475569` |
| `--color-sidebar-bg` | `#1e293b` | (see sidebar section) |
| `--color-input-bg` | `#ffffff` | `#0f172a` |
| `--color-input-border` | `#d1d5db` | `rgba(255,255,255,0.08)` |
| `--color-label` | `#374151` | `#475569` |
| `--color-row-hover` | `rgba(0,0,0,0.02)` | `rgba(255,255,255,0.03)` |

Primary blue (`#3b82f6`), danger red (`#ef4444`), and status badge colours remain unchanged. The page background and all card surfaces flip to dark.

### Typography
No changes to font family, base size, or scale.

### Cards / Surfaces
- `border-radius`: increase from `8px` to `10px`
- `box-shadow`: remove light shadow; replace with `border: 1px solid rgba(255,255,255,0.07)`
- Remove all white box-shadow values from `.card`

### Inputs
- Background: `var(--color-input-bg)` (`#0f172a`)
- Border: `var(--color-input-border)` (`rgba(255,255,255,0.08)`)
- Text colour: `var(--color-text)` (inherits dark-theme value)
- Focus border: `#3b82f6` (unchanged)
- Disabled: `opacity: 0.4`

### Buttons
- `btn-secondary`: border becomes `rgba(255,255,255,0.12)`, text becomes `#f1f5f9`, background `transparent`
- `btn-primary` and `btn-danger`: unchanged

---

## 2. Sidebar Redesign

### Visual
- Background: `linear-gradient(180deg, #1e3a5f 0%, #0f2744 100%)` — deep navy, distinct from page background
- Width: `240px` (up from `220px`) to comfortably fit labels
- Brand area: logo image (40px circle) + "Covenant Embassy" text, bottom border `rgba(255,255,255,0.10)`
- Nav items: emoji icon + text label (current behaviour kept, no icon-only collapse)
- Active item: `background: rgba(255,255,255,0.15)`, `color: #ffffff`, `font-weight: 600`
- Inactive item: `color: rgba(255,255,255,0.55)`, no background
- Hover: `background: rgba(255,255,255,0.07)`
- Sign-out button at bottom: `color: rgba(255,255,255,0.4)`, top border separator

### Layout grid
Update `App.tsx` layout column from `220px 1fr` → `240px 1fr`.

---

## 3. Dashboard Page Changes

### Remove Departments card
Remove the `🏛 Departments` bar-chart card entirely from `DashboardPage.tsx`. The card currently shows department member counts as horizontal bars with a "Manage →" link.

### Remaining cards (no layout change)
- Total Members (stat card)
- Last Attendance (stat card)
- Birthdays This Week (stat card)
- Member Breakdown (Active / Visitors / Inactive counts)
- Attendance Trend (horizontal bar chart, last 4 sessions)
- Upcoming Birthdays (list)
- Recently Added (member list with avatars)

### Dashboard grid
Keep the existing `dashboard-grid` CSS. Removing one card is sufficient — no grid restructure needed.

---

## 4. Attendance Page Layout Change

### New three-column layout
Replace the current two-column layout (calendar left, form right) with a three-column layout:

```
[  Calendar  ] [  Edit Form  ] [  Breakdown  ]
   260px         flex: 1         180px
```

All three panels are dark surface cards (`background: var(--color-surface)`).

### Calendar panel (260px)
- Width increases from current size to `260px`
- All existing calendar functionality preserved (month navigation, date selection, recorded-date dots)
- Add legend at bottom: `● = attendance recorded`

### Edit form panel (flex: 1)
No functional changes. Dark theme applied via CSS variables. Fields: Men, Women, Children, Visitors (2×2 grid), Sermon Title, Preacher, Total + Save button.

### Breakdown panel (180px, NEW)
A live read-only panel that reacts to the form values in real time.

**Contents:**
- Section label: "BREAKDOWN" (small caps, muted)
- Four rows — Men, Women, Children, Visitors — each showing:
  - Label (left) + count and percentage (right)
  - Colour-coded progress bar (full width, 6px tall)
  - Colours: Men `#3b82f6`, Women `#ec4899`, Children `#f97316`, Visitors `#a855f7`
- Percentage = `Math.round((count / total) * 100)` where `total > 0`, else `0`
- Total section below a divider: muted label "Total" + large white number

**Real-time reactivity:** The breakdown panel reads directly from the same `form` state object already used by the edit form. No new state, no Firestore calls. Updates on every keystroke.

**Empty state:** When no date is selected, the breakdown panel shows `—` for all values.

### Responsive behaviour
On viewports narrower than 900px, the three columns stack vertically (calendar → form → breakdown). Use `flex-wrap: wrap` with min-widths.

---

## 5. Files to Change

| File | Change |
|---|---|
| `src/styles/main.css` | CSS variable updates, sidebar width, card radius/border, input dark styles, sidebar gradient |
| `src/components/Sidebar.tsx` | No logic change; CSS does the work |
| `src/pages/DashboardPage.tsx` | Remove Departments card JSX |
| `src/pages/AttendancePage.tsx` | Add breakdown panel component inline; change layout to 3-column |
| `src/App.tsx` | Update grid column from `220px` to `240px` |

No new files. No new components. No new Firestore queries.

---

## 6. Out of Scope

- Animations / transitions beyond existing `0.15s ease-in-out`
- Mobile / responsive beyond the 900px wrap rule
- Changes to Members, Birthdays, Departments, or AttendanceHistory pages beyond inheriting dark theme from CSS variables
- Any data model or Firestore changes
