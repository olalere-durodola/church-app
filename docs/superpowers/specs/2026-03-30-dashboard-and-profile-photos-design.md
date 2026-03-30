# Dashboard & Profile Photos — Design Spec

**Date:** 2026-03-30
**App:** R.C.C.G Covenant Embassy Admin Portal
**Stack:** React 18 + TypeScript + Vite + Firebase (Firestore + Storage + Auth)

---

## Overview

Two features are added in this spec:

1. **Sidebar navigation + Dashboard home page** — replace the top nav with a persistent left sidebar and add a dashboard as the app's landing page.
2. **Member profile photos** — allow uploading a photo per member, displayed on the detail page, members list, and department overlays.

---

## Feature 1: Sidebar Navigation

### Current state
The app uses a horizontal top nav bar (`<nav className="nav">`) rendered inside a `<Nav>` component in `App.tsx`. All pages share this via the `<Layout>` wrapper.

### Changes

#### App shell
- Remove the top `<Nav>` component and `.nav` CSS.
- Add a `<Sidebar>` component rendered inside `<Layout>`.
- `<Layout>` becomes a two-column grid: `sidebar (220px) | main content (1fr)`.
- The sidebar is fixed/sticky on the left and full viewport height.

#### Sidebar contents (top to bottom)
- Church name: **R.C.C.G Covenant Embassy** (with a cross icon)
- Nav links (using `<NavLink>` with active state styling):
  - Dashboard (`/`)
  - Members (`/members`)
  - Birthdays (`/birthdays`)
  - Attendance (`/attendance`)
  - Departments (`/departments`)
- Sign Out button pinned to the bottom

#### Routing
- `/` currently redirects to `/members`. Change to render `<DashboardPage>` instead.
- All other routes remain unchanged.

#### CSS
- Add `.sidebar`, `.sidebar-brand`, `.sidebar-nav`, `.sidebar-link`, `.sidebar-link.active`, `.sidebar-signout` classes.
- Remove `.nav`, `.nav-brand`, `.nav-links`, `.nav-link`, `.nav-signout` classes.
- Update `.layout` from a single column to a two-column grid.
- Update `.content` to account for the sidebar (no left offset needed with CSS grid).

---

## Feature 2: Dashboard Page

### Route
`/` — replaces the current `<Navigate to="/members">` redirect.

### Component
`src/pages/DashboardPage.tsx`

### Data sources (all read from Firestore on mount)
| Data | Collection | Notes |
|------|-----------|-------|
| All members | `members` | Used for counts, recent additions |
| All attendance records | `attendance` | Used for last record + 4-week trend |

No new Firestore collections required.

### Derived values (computed client-side)
- **Total members** — `members.length`
- **Active / Visitor / Inactive counts** — filter by `status`
- **New this month** — members with `createdAt` within current calendar month
- **Last attendance** — attendance record with latest `recordedAt`
- **4-week trend** — last 4 attendance records sorted by `recordedAt` descending
- **Birthdays this week** — members with birthday within next 7 days (reuse `getBirthdaysComingUp` from `birthdayUtils.ts`)
- **Recently added** — last 5 members sorted by `createdAt` descending

### Card grid layout
Cards are arranged in a responsive CSS grid (`repeat(3, 1fr)` on desktop):

| Card | Width | Content |
|------|-------|---------|
| Total Members | 1 col | Count + "N this month" pill |
| Last Attendance | 1 col | Total count + date |
| Birthdays This Week | 1 col | Count + nearest name/date |
| Member Breakdown | 2 col | Active / Visitors / Inactive split |
| Upcoming Birthdays | 1 col | List of next 7 days with "N days" badge |
| Attendance Trend | 2 col | Horizontal bar chart, last 4 Sundays |
| Recently Added | 1 col | Last 5 members with status badge |
| Departments | 2 col | List with member counts + mini bar |

All "View all →" / "History →" links use `<Link>` to the relevant page.

### Loading state
Show `<LoadingSpinner />` while data is fetching. Fetch members and attendance in parallel with `Promise.all`.

### Error state
If fetch fails, show a non-blocking error message per section (don't crash the whole page).

---

## Feature 3: Member Profile Photos

### Storage
- **Firebase Storage** bucket path: `photos/{memberId}`
- One photo per member. Uploading a new photo overwrites the previous one.
- Accepted file types: `image/jpeg`, `image/png`, `image/webp`
- Max file size: 5 MB (enforced client-side before upload)

### Data model change
Add optional field to `Member` type in `src/types/member.ts`:
```typescript
photoURL?: string;  // Firebase Storage download URL
```
Existing members without a photo have `photoURL` undefined — no migration needed.

### Upload flow
1. On the member detail page (view mode), the avatar area is a clickable element.
2. Clicking it triggers a hidden `<input type="file" accept="image/*">`.
3. On file selection:
   - Validate file type and size (≤ 5 MB).
   - Show an inline loading indicator on the avatar.
   - Upload to Firebase Storage at `photos/{memberId}`.
   - On success, call `getDownloadURL()`, then `updateDoc` the member's `photoURL` field.
   - Update local state so the new photo appears immediately.
4. On error, show an inline error message below the avatar.

No "Save" button needed — upload is immediate on file selection.

### Avatar component
Create `src/components/MemberAvatar.tsx`:

```
Props:
  photoURL?: string
  firstName: string
  lastName: string
  size: 'sm' | 'md' | 'lg'
```

- If `photoURL` is set: render `<img>` with the URL.
- If not: render a coloured circle with the member's initials (`firstName[0] + lastName[0]`).
- Colour is deterministic based on the member's name (pick from a palette of 8 colours using a hash).
- Sizes: `sm` = 28px (list/overlays), `md` = 40px (dashboard recently added), `lg` = 64px (detail page).

### Where photos appear

| Location | Component | Size |
|----------|-----------|------|
| Member detail page (view mode) | `MemberDetailPage` | `lg` |
| Members list table | `MembersListPage` | `sm` |
| Department view overlay | `DepartmentsPage` (view modal) | `sm` |
| Department edit overlay | `DepartmentsPage` (edit modal) | `sm` |
| Dashboard — Recently Added | `DashboardPage` | `md` |

### Firebase Storage rules
Add to `storage.rules` (new file):
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

---

## Files Changed

### New files
- `src/pages/DashboardPage.tsx`
- `src/components/MemberAvatar.tsx`
- `storage.rules`

### Modified files
- `src/App.tsx` — remove `<Nav>`, add `<Sidebar>`, change `/` route to `<DashboardPage>`
- `src/types/member.ts` — add `photoURL?: string`
- `src/styles/main.css` — sidebar CSS, remove top nav CSS, update layout grid
- `src/pages/MemberDetailPage.tsx` — add avatar upload flow
- `src/pages/MembersListPage.tsx` — add `<MemberAvatar>` to table rows
- `src/pages/DepartmentsPage.tsx` — add `<MemberAvatar>` to both modals
- `firebase.json` — add storage rules reference

### Deleted
- `.nav*` CSS classes from `main.css`

---

## Out of Scope
- Photo cropping / resizing (upload as-is)
- Multiple photos per member
- Deleting a photo without replacing it
- Push notifications or email alerts from the dashboard
