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
The app uses a horizontal top nav bar (`<nav className="nav">`) rendered inside a `<Nav>` component defined inline in `App.tsx`. All pages share this via the `<Layout>` wrapper.

### Changes

#### App shell
- Remove the inline `<Nav>` component and `.nav` CSS classes from `main.css`.
- Create `src/components/Sidebar.tsx` as a standalone component file (consistent with all other components in the project).
- Render `<Sidebar>` inside `<Layout>` in `App.tsx`.
- `<Layout>` becomes a two-column CSS grid: `220px sidebar | 1fr main content` (i.e. `grid-template-columns: 220px 1fr`).
- The sidebar is sticky/full viewport height.

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
- `/` currently redirects to `/members` via a bare `<Navigate>`. Change to render `<DashboardPage>` wrapped in `<ProtectedRoute><Layout>...</Layout></ProtectedRoute>` — same pattern as all other protected routes.
- All other routes remain unchanged.

#### CSS
- Add `.sidebar`, `.sidebar-brand`, `.sidebar-nav`, `.sidebar-link`, `.sidebar-link.active`, `.sidebar-signout` classes. The sidebar uses the same dark navy background as the old nav — reuse the existing `--color-nav-bg`, `--color-nav-text`, `--color-nav-active` CSS variables (rename to `--color-sidebar-*` for clarity, updating all references).
- Remove `.nav`, `.nav-brand`, `.nav-links`, `.nav-link`, `.nav-signout` classes, and the `--nav-height`, `--content-max-width`, `--content-padding` CSS variables from `:root` (all become dead after this change).
- Update `.layout` from a single column to `display: grid; grid-template-columns: 220px 1fr; min-height: 100vh`.
- Remove `max-width` and `margin: 0 auto` from `.content` — centering is no longer needed since `.content` is the right column of the layout grid, not a centred block.
- The `Layout` component stays inline in `App.tsx` (no extraction needed).
- The dashboard card grid (`repeat(3, 1fr)`) is a separate grid scoped to `DashboardPage` — it is nested inside `.content` and has no relationship to the layout grid.
- **Mobile:** The sidebar remains visible at all viewport widths. Responsive/collapsible sidebar is out of scope for this spec.

---

## Feature 2: Dashboard Page

### Route
`/` — replaces the current `<Navigate to="/members">` redirect. Must be wrapped in `<ProtectedRoute>` like all other pages.

### Component
`src/pages/DashboardPage.tsx`

### Data sources
Two parallel Firestore queries on mount via `Promise.all`:

| Query | Details |
|-------|---------|
| `getDocs(collection(db, 'members'))` | Fetch all members — used for counts, recent additions, birthday calc, department counts |
| `getDocs(query(collection(db, 'attendance'), orderBy('recordedAt', 'desc'), limit(4)))` | Fetch only the 4 most recent attendance records server-side — avoids loading all historical records |

Department names and member counts are derived from the `members` array (`members.flatMap(m => m.departments ?? [])`). The `?? []` is defensive coding for legacy Firestore documents that predate the `departments` field. No separate query of the `departments` collection is needed.

### Error state
If the `Promise.all` rejects, show a single full-page error message (same pattern as other pages). Per-section error handling is out of scope.

### Derived values (computed client-side)
- **Total members** — `members.length`
- **Active / Visitor / Inactive counts** — filter by `status`
- **New this month** — members with `createdAt` within current calendar month
- **Last attendance** — `attendanceRecords[0]` (first result from the ordered query); if no records exist show `—`
- **4-record trend** — `attendanceRecords` as returned from the query (sorted `recordedAt` desc, max 4). **Reverse the array before rendering** so bars display oldest-to-newest left-to-right (i.e. `[...attendanceRecords].reverse()`).
- **Birthdays this week** — `getBirthdaysComingUp(members, today)` from `birthdayUtils.ts`; the utility already filters members with null `birthdayMonth`/`birthdayDay`. Count = `result.length`, nearest = `result[0]`; if empty, the "Birthdays This Week" card shows count `0` and text "None this week".
- **Recently added** — last 5 members sorted by `createdAt` descending (client-side sort). Tie-breaker: sort by `fullName` ascending when `createdAt` values are equal.
- **Department counts** — group `members.flatMap(m => m.departments ?? [])` by name to get `{ [deptName]: count }`

### Card grid layout
Cards use `display: grid; grid-template-columns: repeat(3, 1fr)`. Cards spanning 2 columns use `grid-column: span 2`.

| Card | Width | Content | Empty state |
|------|-------|---------|-------------|
| Total Members | 1 col | Count + "N this month" pill | Shows 0 |
| Last Attendance | 1 col | Total count + date | "No records yet" |
| Birthdays This Week | 1 col | Count + nearest member's name and date formatted as "Apr 1"; if today, show "Today" | "None this week" |
| Member Breakdown | 2 col (`span 2`) | Active / Visitors / Inactive split | Shows 0s |
| Upcoming Birthdays | 1 col | List of next 7 days with "N days" badge; if birthday is today show "Today" instead of "0 days" | "No upcoming birthdays" |
| Attendance Trend | 2 col (`span 2`) | Horizontal bar chart, last 4 records. Each bar represents one record's `total` value. Bar width is proportional to the max total in the set. Label shows `recordedAt` date and count. Do not reuse `AttendancePieChart` — implement as inline JSX in `DashboardPage`. | "No attendance records yet" |
| Recently Added | 1 col | Last 5 members with status badge | "No members yet" |
| Departments | 2 col (`span 2`) | List with member counts + mini bar | "No departments yet" |

All "View all →" / "History →" links use `<Link>` to the relevant page.

### Loading state
Show `<LoadingSpinner />` while data is fetching.

---

## Feature 3: Member Profile Photos

### Storage
- **Firebase Storage** bucket path: `photos/{memberId}` (no file extension — the path is the member's ID, overwritten on re-upload)
- One photo per member. Uploading a new photo overwrites the previous one at the same path.
- Accepted file types: `image/jpeg`, `image/png`, `image/webp`
- Max file size: 5 MB (enforced client-side before upload; show error if exceeded)

### Data model change
Add optional field to `Member` type in `src/types/member.ts`:
```typescript
photoURL?: string;  // Firebase Storage download URL
```
Existing members without a photo have `photoURL` undefined — no migration needed.

`NewMember` is `Omit<Member, 'id'>` so it automatically inherits `photoURL?` — no change needed to `AddMemberPage` or the `NewMember` type. New members are created without a photo; the avatar upload is only available post-creation on the detail page.

### Upload flow
1. On the member detail page (view mode), the avatar area (`<MemberAvatar size="lg">`) is a clickable element with a camera icon overlay on hover.
2. Clicking it triggers a hidden `<input type="file" accept="image/jpeg,image/png,image/webp">`.
3. On file selection:
   - Validate file type and size (≤ 5 MB). If type is invalid show "Only JPEG, PNG, or WebP images are allowed." If size exceeds 5 MB show "Image must be smaller than 5 MB." Show the error inline below the avatar and abort.
   - Show an inline loading indicator on the avatar.
   - Upload to Firebase Storage at `photos/{memberId}` using `uploadBytes(ref, file, { contentType: file.type })` — the `contentType` metadata must be set so browsers can render the image correctly.
   - On success, call `getDownloadURL()`, then `updateDoc(doc(db, 'members', id), { photoURL })`.
   - Update local `member` state so the new photo appears immediately without a page reload.
4. On upload error, show an inline error message below the avatar.

No "Save" button needed — upload is immediate on file selection.

### Avatar component
Create `src/components/MemberAvatar.tsx`:

```typescript
interface MemberAvatarProps {
  photoURL?: string;
  firstName: string;
  lastName: string;
  size: 'sm' | 'md' | 'lg';
  onClick?: () => void;  // optional — only passed by MemberDetailPage for upload
}
```

Pixel sizes: `sm` = 28px, `md` = 40px, `lg` = 64px.

- If `photoURL` is set: render `<img src={photoURL}>` with `object-fit: cover` and border-radius 50%.
- If not: render a coloured circle with initials (`firstName[0].toUpperCase() + lastName[0].toUpperCase()`).
- Background colour is deterministic: `AVATAR_COLORS[charCodeSum % AVATAR_COLORS.length]` where `charCodeSum` is the sum of char codes of `firstName + lastName` and `AVATAR_COLORS` is an array of 8 hex colours.
- If `onClick` is provided, the avatar renders with `cursor: pointer` and a camera icon overlay on hover.
- The `<input type="file">` and all upload logic lives in `MemberDetailPage`, not inside `MemberAvatar`. `MemberDetailPage` passes `onClick={() => fileInputRef.current?.click()}` to the avatar. All other usages pass no `onClick`.

### Where photos appear

| Location | Component | Size |
|----------|-----------|------|
| Member detail page (view mode) | `MemberDetailPage` | `lg` |
| Members list table | `MembersListPage` | `sm` |
| Department view overlay | `DepartmentsPage` (view modal) | `sm` |
| Department edit overlay | `DepartmentsPage` (edit modal) | `sm` |
| Dashboard — Recently Added card | `DashboardPage` | `md` |

### Firebase Storage rules
New file `storage.rules`:
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

Add to `firebase.json`:
```json
"storage": {
  "rules": "storage.rules"
}
```

---

## Files Changed

### New files
- `src/pages/DashboardPage.tsx`
- `src/components/Sidebar.tsx`
- `src/components/MemberAvatar.tsx`
- `storage.rules`

### Modified files
- `src/App.tsx` — remove inline `<Nav>`, import and render `<Sidebar>`, change `/` route to `<ProtectedRoute><Layout><DashboardPage /></Layout></ProtectedRoute>`
- `src/firebase.ts` — add `import { getStorage } from 'firebase/storage'` and `export const storage = getStorage(app)`
- `src/types/member.ts` — add `photoURL?: string`
- `src/styles/main.css` — add sidebar CSS, remove top nav CSS, update `.layout` to two-column grid, rename `--color-nav-*` to `--color-sidebar-*` (search entire codebase for any references to the old variable names and update them all)
- `src/pages/MemberDetailPage.tsx` — add avatar upload flow using `<MemberAvatar size="lg">`
- `src/pages/MembersListPage.tsx` — add `<MemberAvatar size="sm">` to table rows
- `src/pages/DepartmentsPage.tsx` — add `<MemberAvatar size="sm">` to both modals
- `firebase.json` — add `"storage": { "rules": "storage.rules" }`

### Deleted CSS classes
`.nav`, `.nav-brand`, `.nav-links`, `.nav-link`, `.nav-link.active`, `.nav-signout`

### Deleted CSS variables (from `:root`)
`--nav-height`, `--content-max-width`, `--content-padding`, `--color-nav-bg`, `--color-nav-text`, `--color-nav-active` (replaced by `--color-sidebar-bg`, `--color-sidebar-text`, `--color-sidebar-active`)

---

## Out of Scope
- Photo cropping / resizing (upload as-is)
- Multiple photos per member
- Deleting a photo without replacing it
- Push notifications or email alerts from the dashboard
