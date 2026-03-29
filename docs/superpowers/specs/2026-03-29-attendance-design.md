# Attendance Tracking — Design Spec

## Goal

Build an attendance tracking module for R.C.C.G Covenant Embassy that allows admins to record service attendance by date, view a pie chart breakdown, and browse historical records.

## Scope

This is Module 2 of the church management system, building on the member database (Module 1). It does not track individual member attendance — only aggregate counts per service date.

## Tech Stack

Same as Module 1: React 18 + TypeScript + Vite + Firebase Firestore + Firebase Auth.

Additional dependency: `recharts` for the pie chart.

## Route

```
/attendance    — attendance page (protected, admin-only)
```

Added to the nav bar alongside Members and Birthdays.

## Firestore Data Model

```
attendance/{YYYY-MM-DD}
  men: number
  women: number
  children: number
  visitors: number
  total: number          // men + women + children + visitors
  recordedAt: Timestamp  // when the record was last saved
```

The document ID is the date string (e.g. `2026-03-29`). This ensures one record per date and makes lookup by date instant with no queries.

## Firestore Security Rules

Add to `firestore.rules`:

```
match /attendance/{date} {
  allow read, write: if isAdmin();
}
```

## Page Layout: `/attendance`

### Top Section — Calendar + Form (two columns)

**Left: Monthly calendar grid**
- Displays a full month calendar (Mon–Sun grid)
- Previous/Next month navigation arrows
- Today's date highlighted
- Dates with existing attendance records shown with a blue dot indicator
- Clicking a date selects it and loads its data into the form

**Right: Entry form**
- Four number inputs: Men, Women, Children, Visitors (all default to 0)
- Auto-calculated Total displayed below the inputs (updates as user types)
- "Save" button — creates or updates the Firestore document for the selected date
- If the selected date already has a record, form pre-fills with existing values
- If no date selected, form is disabled with a prompt: "Select a date to record attendance"
- Success/error feedback after save

### Middle Section — Pie Chart

- Rendered with `recharts` `PieChart` component
- Shows four segments: Men, Women, Children, Visitors
- Color coded: Men = blue, Women = pink, Children = green, Visitors = orange
- Displays percentage labels on each segment
- Legend below the chart
- Only visible when a date with saved data is selected (hidden otherwise)

### Bottom Section — History Table

- Fetches all attendance records from Firestore on page load
- Sorted by date descending (newest first)
- Columns: Date, Men, Women, Children, Visitors, Total
- Clicking a row selects that date in the calendar and loads it into the form
- Shows "No records yet." when empty

## Components & Files

```
src/
  pages/
    AttendancePage.tsx        — main page (calendar + form + chart + history)
  components/
    AttendanceCalendar.tsx    — monthly calendar grid component
    AttendancePieChart.tsx    — recharts pie chart wrapper
  types/
    attendance.ts             — AttendanceRecord interface
  utils/
    attendanceUtils.ts        — date helpers (formatDate, getMonthDays, etc.)
    attendanceUtils.test.ts   — unit tests for pure date utilities
```

## Key Behaviours

- **Date as document ID:** `YYYY-MM-DD` format. Saves and loads are `setDoc` with merge, not `addDoc`.
- **Total is always derived:** computed as `men + women + children + visitors` before saving. Never entered manually.
- **Pre-fill on date select:** when clicking a date that has a record, all four inputs populate automatically.
- **Calendar dot indicators:** derived from the list of attendance records fetched on page load — no extra Firestore reads needed.
- **No delete:** records can be updated but not deleted (set all values to 0 to effectively clear).

## Out of Scope

- Individual member attendance (who was present)
- Per-service-type tracking (Sunday vs midweek) — all records are assumed to be Sunday services
- Attendance trends/graphs over time (future module)
- Export to CSV/PDF
