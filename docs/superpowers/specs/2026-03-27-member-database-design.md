# Member Database & New Member Management — Design Spec

## Goal

Build an admin-only web application to manage a church member database, including adding new members, editing profiles, filtering/searching, and surfacing upcoming birthdays.

## Scope

This is the first of five modules in the church management system. It forms the foundation — departments, attendance, time off, and communication all depend on the member records created here. Designed for up to ~500 members (all members fetched client-side; no pagination needed at this scale).

## Tech Stack

- **Frontend:** React 18 + TypeScript + Vite
- **Database:** Firebase Firestore
- **Auth:** Firebase Authentication (email/password)
- **Hosting:** Firebase Hosting

## Firebase Config

Environment variables stored in `.env` (gitignored):
```
VITE_FIREBASE_API_KEY=
VITE_FIREBASE_AUTH_DOMAIN=
VITE_FIREBASE_PROJECT_ID=
VITE_FIREBASE_STORAGE_BUCKET=
VITE_FIREBASE_MESSAGING_SENDER_ID=
VITE_FIREBASE_APP_ID=
```

## Access

Admin-only. No public-facing pages. All routes except `/login` require authentication.

**Auth loading:** Firebase Auth state resolves asynchronously. The `ProtectedRoute` wrapper renders a loading spinner while `onAuthStateChanged` has not yet fired. Once resolved: redirects to `/login` if unauthenticated, renders the page if authenticated admin.

Admin access is determined by the presence of the user's **UID** as the document ID in a Firestore `admins` collection. Consistent across rules and the `useAuth` hook.

**Admin bootstrap:** The first admin must be added manually:
1. Create a user in Firebase Console → Authentication
2. Copy their UID
3. Add a document to the `admins` collection with that UID as the document ID

## Routes

```
/login              — public sign-in page
/                   — React Router <Navigate> redirect to /members
/members            — members list (protected)
/members/new        — add member form (protected)
/members/:id        — member detail / edit (protected)
/birthdays          — birthday dashboard (protected)
```

## Member Data Model

```
members/{memberId}
  firstName: string
  lastName: string
  fullName: string             // trim + collapse whitespace + lowercase of firstName + ' ' + lastName
  phone: string
  email: string
  address: string
  birthdayMonth: number | null  // 1–12, null if unknown
  birthdayDay: number | null    // 1–31, null if unknown; Feb capped at 28 (Feb 29 not supported)
  gender: 'Male' | 'Female'
  status: 'Active' | 'Inactive' | 'Visitor'
  department: string | null    // populated in departments module
  membershipDate: Timestamp | null
  notes: string
  createdAt: Timestamp
```

**fullName normalization:** `firstName.trim() + ' ' + lastName.trim()` with internal whitespace collapsed to single spaces, then lowercased. Applied identically on Add and Edit.

## Pages

### Login
- Email/password sign-in
- Redirects to `/members` on success

### Members List
- Fetches all members from Firestore on load; all filtering is client-side
- Shows loading spinner while fetching, empty state ("No members yet") if collection is empty, error message on failure
- Search by name (case-insensitive, matches against stored `fullName`)
- Filter by status (Active / Inactive / Visitor)
- Filter by gender (Male / Female)
- Filter by department (derived from distinct non-null department values across all members)
- Table columns: name, phone, status, gender, department
- Each row links to `/members/:id`
- "Add Member" button links to `/members/new`

### Add Member
- Form fields: first name, last name, phone, email, address, birthday (month + day), gender, status, membership date, notes
- Birthday: Month dropdown (Jan–Dec) + Day dropdown (days constrained to valid range for selected month; Feb capped at 28; Feb 29 birthdays not supported). Both default to blank "—". Partial entry is a validation error — both must be filled or both left blank
- Membership date: date picker input, optional
- Status defaults to Visitor
- Before saving: normalize `fullName` and query Firestore for existing member with same `fullName` — show error "A member with this name already exists" if found. Concurrent adds by two admins at the same moment may bypass this check — accepted as out of scope for a single-admin use case
- On success: save to Firestore, redirect to `/members/:id`

### Member Detail / Edit
- Shows loading spinner while fetching document
- Shows "Member not found" if document does not exist (invalid `:id`)
- Shows error message if fetch fails
- Read mode: displays all member fields
- "Edit" button switches to inline edit mode
- Save / Cancel in edit mode
- Duplicate name check runs on save if name was changed
- **No hard delete.** To remove a member from active use, set status to Inactive
- Last-write-wins on concurrent edits (acceptable for this use case)

### Birthday Dashboard
Two sections, both skip members where `birthdayMonth` or `birthdayDay` is null:

**This Month** — all members with `birthdayMonth == currentMonth`, sorted by `birthdayDay` ascending.

**Coming Up This Week** — all members with a birthday within the next 7 days (inclusive). Handles year boundary: if today is Dec 26–31, this section includes January birthdays as well (these may not appear in the "This Month" list). Sorted by day.

## Firestore Security Rules

```
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    function isAdmin() {
      return request.auth != null &&
        exists(/databases/$(database)/documents/admins/$(request.auth.uid));
    }

    match /admins/{uid} {
      // Users can read their own admin document to check their access level
      allow read: if request.auth != null && request.auth.uid == uid;
      allow write: if isAdmin();
    }

    match /members/{memberId} {
      allow read, write: if isAdmin();
    }
  }
}
```

## Out of Scope (covered in later modules)

- Department management (Module 2)
- Attendance tracking (Module 3)
- Time off (Module 4)
- SMS / communication (Module 5)
