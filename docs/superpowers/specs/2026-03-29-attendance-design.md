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

Add the following `match` block **inside** the existing `service cloud.firestore { match /databases/{database}/documents { ... } }` block in `firestore.rules`, alongside the existing `admins` and `members` rules:

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
- Shows a loading spinner while fetching; shows an error message if the fetch fails
- Sorted by date descending (newest first)
- Columns: Date, Men, Women, Children, Visitors, Total, Last Updated
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
- **No delete:** records can be updated but not deleted (set all values to 0 to effectively clear). Zero-value records still appear in the history table and still show a blue dot on the calendar — they are treated as valid records.
- **Pie chart visibility:** the chart is only shown when a date is selected AND that date has an existing saved record with a non-zero total. If the selected date has no record yet (new entry), the chart is hidden.
- **Form disabled state:** when no date is selected, all four inputs and the Save button are disabled and a message reads "Select a date to record attendance."

## Out of Scope

- Individual member attendance (who was present)
- Per-service-type tracking (Sunday vs midweek) — all records are assumed to be Sunday services
- Attendance trends/graphs over time (future module)
- Export to CSV/PDF
