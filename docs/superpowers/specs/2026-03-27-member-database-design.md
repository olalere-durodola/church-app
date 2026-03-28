# Member Database & New Member Management — Design Spec

## Goal

Build an admin-only web application to manage a church member database, including adding new members, editing profiles, filtering/searching, and surfacing upcoming birthdays.

## Scope

This is the first of five modules in the church management system. It forms the foundation — departments, attendance, time off, and communication all depend on the member records created here.

## Tech Stack

- **Frontend:** React 18 + TypeScript + Vite
- **Database:** Firebase Firestore
- **Auth:** Firebase Authentication (email/password)
- **Hosting:** Firebase Hosting

## Access

Admin-only. No public-facing pages. All routes require authentication.

## Member Data Model

```
members/{memberId}
  firstName: string
  lastName: string
  phone: string
  email: string
  address: string
  birthdayMonth: number        // 1–12
  birthdayDay: number          // 1–31
  gender: 'Male' | 'Female'
  status: 'Active' | 'Inactive' | 'Visitor'
  department: string | null    // populated in departments module
  membershipDate: date | null
  notes: string
  createdAt: timestamp
```

## Pages

### Login
- Email/password sign-in
- Redirects to Members list on success

### Members List
- Table showing all members: name, phone, status, gender, department
- Search by name (first or last)
- Filter by status (Active / Inactive / Visitor)
- Filter by gender
- Filter by department
- Link to each member's detail page
- "Add Member" button

### Add Member
- Form with all fields listed above
- Birthday entered as month + day (no year) via two dropdowns
- Status defaults to Visitor
- Saves to Firestore and redirects to member detail

### Member Detail / Edit
- Displays all member info
- Edit button opens inline editing
- Save / Cancel actions

### Birthday Dashboard
- Lists all members whose birthday falls in the current month
- Highlights members whose birthday is within the next 7 days
- Sorted by day of month

## Firestore Security Rules

- All reads and writes require authenticated admin user
- No public access

## Out of Scope (covered in later modules)

- Department management (Module 3)
- Attendance tracking (Module 2)
- Time off (Module 4)
- SMS / communication (Module 5)
