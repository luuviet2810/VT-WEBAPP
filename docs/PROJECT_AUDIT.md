# PROJECT_AUDIT.md

## 1. Tech stack

- **Frontend framework**: React 18 + TypeScript 5
- **Build tool**: Vite 5
- **Routing**: react-router-dom 6.25
- **State management**: Zustand 4.5
- **UI styling**: Tailwind CSS 3.4 + PostCSS + Autoprefixer
- **Icons**: lucide-react
- **Data viz**: recharts
- **Drag & drop**: @dnd-kit/core/sortable/utilities
- **Mobile picker**: react-mobile-picker
- **Backend / data**: Supabase client (`@supabase/supabase-js`)
- **Auth**: custom Zustand auth store + local client-side hashing + WebAuthn helper utilities

### Notes
- Auth is **not fully server-backed yet**: `useAuthStore` stores users/passwords locally and uses a simple custom hash.
- Several RBAC concepts exist in code but are only partially enforced at route/UI level.

---

## 2. Folder structure

```
gara-manager/
  docs/
    PROJECT_AUDIT.md            <-- this file
  src/
    App.tsx                     router + layouts + guards
    main.tsx                    BrowserRouter bootstrap
    vite-env.d.ts
    components/
      ui.tsx                    shared UI primitives
      Sidebar.tsx               desktop + mobile sidebar
      GlobalSearch.tsx          cmd/ctrl+k search modal
      NotificationCenter.tsx
      SettingsPanel.tsx
      ViewModeToggle.tsx
      RouteGuard.tsx
      PermissionGuard.tsx
      CheckSheetForm.tsx
      PhotoUploader.tsx
    hooks/
      useAuthRole.ts            admin/staff mode helpers
      useIsAdmin.ts             legacy employee-based admin hook
    lib/
      supabase.ts               Supabase client init
    pages/
      Login.tsx
      Register.tsx
      Forbidden.tsx
      Dashboard.tsx              placeholder dashboard wrapper
      VehicleList.tsx
      VehicleDetail.tsx
      VehicleFormModal.tsx
      Positions.tsx
      Tasks.tsx
      TaskDetail.tsx
      MyTasks.tsx
      Attendance.tsx
      Employees.tsx
      PriceList.tsx
      dashboards/
        OverviewDashboard.tsx
        StaffDashboard.tsx
        StatisticsDashboard.tsx
    rbac/
      index.ts
      roles.ts
      permissions.ts
      routesConfig.ts
      sidebarConfig.tsx
      dashboardConfig.ts
    services/
      vehicle.service.ts
      vehicleMedia.service.ts
      storage.service.ts
      users.service.ts
      task.service.ts
      checksheet.service.ts
      moveLog.service.ts
      attendance.service.ts
      notification.service.ts
      position.service.ts
      timeline.service.ts
      locationService.ts
    store/
      useStore.ts                main domain store
      useAuthStore.ts            auth/user store
      viewModeStore.ts           preview role mode store
    types/
      database.ts                DB/schema-oriented types
      index.ts / types.ts        app domain types
    utils/
      format.ts
      taskRules.ts
      webauthn.ts
      timeline.ts
```

### Observations
- The project is **single-page** with no sub-app or feature-folder split.
- Domain logic is mostly split into `pages/`, `services/`, `store/`, and `types/`.
- There is **no feature-layer abstraction**, custom hooks are minimal, and components are page-centric.

---

## 3. Current modules

### Pages / Features
- **Auth**: Login, Register, Forbidden
- **Vehicles**: list, detail, form modal, position assignment, status editing, photo/document upload
- **Positions**: kanban-style board, drag/drop vehicles between positions, reorder positions
- **Tasks**: kanban board, create task modal, task detail, checklist editing
- **Staff task view**: MyTasks
- **Attendance**: check-in/out, admin edit, CSV export
- **Employees**: profile, registration approval flow, passkey setup
- **Pricing**: PriceList page exists
- **Dashboards**: overview, staff dashboard, statistics with charts
- **Settings**: placeholder only
- **Profile**: placeholder only

### Services
- **Vehicle, Position, Users, Task, CheckSheet, Attendance, Notification, MoveLog, Storage, VehicleMedia, Location, Timeline**

### State
- `useStore`: vehicles, positions, tasks, employees, move logs, check sheets, attendance, notifications, settings, task activity logs, vehicle timelines
- `useAuthStore`: users, passkeys, current user, auth actions, user management actions
- `viewModeStore`: admin preview mode

### Shared components
- Modal, Badge, EmptyState, Tabs, WheelPicker, CollapsibleCard, SegButton, BatteryCheck
- Sidebar, GlobalSearch, NotificationCenter, SettingsPanel, ViewModeToggle
- RouteGuard, PermissionGuard, PhotoUploader, CheckSheetForm

---

## 4. Routing structure

### Route definitions
- `/login`
- `/register`
- `/` - Overview dashboard
- `/xe` - Vehicle list
- `/xe/:id` - Vehicle detail
- `/nhiem-vu` - Tasks
- `/nhiem-vu/:id` - Task detail
- `/viec-cua-toi` - My tasks (staff only)
- `/vi-tri` - Positions
- `/thong-ke` - Statistics
- `/cham-cong` - Attendance
- `/nhan-vien` - Employees
- `/bang-gia` - Price list
- `/cai-dat` - Settings
- `/ho-so` - Profile
- `/403` - Forbidden

### Layouts / guards
- `AuthLayout`: very thin wrapper, no persistent nav
- `MainLayout`: sidebar + mobile drawer + search + content area
- `ProtectedRoute`: redirects to `/login` if not authenticated
- `RoleGuard`: redirects to `/403` if user lacks role access

### RBAC structure
- Defined roles: `admin`, `staff`
- Permission keys are well enumerated in `rbac/permissions.ts`
- Route config exists in `rbac/routesConfig.ts` but `requiredPermissions` are **not actually used** in `App.tsx` routing; only `allowedRoles` is enforced.
- Sidebar config is role-based; view mode allows admin to preview staff UI

---

## 5. State management

### Main store
- Uses Zustand without persistence for business data
- `initializeFromSupabase` loads initial data on app start
- Mixed concerns in a single large store:
  - CRUD actions
  - optimistic updates
  - notifications
  - media uploads
  - task generation from checksheet
  - timeline loading
- No slices, no domain separation, no middleware for side effects beyond direct async actions

### Auth store
- Another large Zustand store
- Persists via `zustand/middleware`
- Holds users, passkeys, auth state, and user management actions
- Password hashing is **demo-level** and clearly marked unsafe for production

### View mode store
- Small persisted store for admin UI preview mode
- Separate from auth role

### Data flow pattern
- Pages read from store via selectors
- Pages dispatch store actions
- Services are called only inside store actions
- This is mostly consistent with “components → store → service → Supabase”

---

## 6. Shared components

- **Modal**: reusable dialog with overlay, escape close, responsive width
- **Badge**: tone-based status chips
- **EmptyState**: empty state helper
- **Tabs**: segmented tab switcher
- **WheelPicker**: mobile-style numeric picker
- **CollapsibleCard**: collapsible container
- **SegButton**: toggle button group
- **BatteryCheck**: SOH/SOC picker + status display
- **PhotoUploader**: image/document uploader tied to vehicle media flows
- **CheckSheetForm**: checksheet creation/editing form

### UI conventions
- Heavy use of `clsx` for conditional classes
- Tailwind utility-first styling
- Vietnamese labels and messages
- Consistent component naming
- No clear design system layer beyond `components/ui.tsx` and shared classes

---

## 7. Business flow

### Vehicle lifecycle
1. Vehicle created
2. Position assigned or changed via `Positions` kanban or `VehicleDetail` select
3. Move log created and stored
4. Check sheets created for in/out
5. Tasks can be created manually or generated from checksheet
6. Task checklist and status updated
7. Attendance tracked separately
8. Vehicle status can be changed to sold/deposited/available
9. Vehicle can be deleted with media cleanup

### Task lifecycle
1. Admin creates task with optional vehicle link
2. Task shown on kanban board
3. Assignee updates checklist/status
4. Activity logs recorded
5. Notifications created on some transitions

### Attendance flow
1. Staff/admin check in/out
2. Admin can edit entries
3. CSV export available to admin

### Notification flow
- Created on task creation, task completion, vehicle add/status change, attendance edit, user approval/rejection
- Stored in Zustand; notification center component exists
- No realtime push mechanism observed

### Timeline flow
- `timeline.service.ts` provides a provider-registry pattern
- Providers exist for move logs, check sheets, tasks
- `getVehicleTimelineWithActivity` injects task activity logs
- `useStore.loadVehicleTimeline` stores timeline per vehicle
- Timeline UI is currently inconsistent with earlier implementation attempts

---

## 8. Existing problems

### Architecture / maintainability
- Single large `useStore` mixes many domains
- Services layer is thin and closely coupled to Supabase types
- `App.tsx` contains inline route components instead of lazy-loaded pages
- No API abstraction layer; Supabase queries are spread across services but some pages still rely on store-initialized data

### Auth / security
- Client-side password hashing and local user store
- Not suitable for production without Supabase Auth or backend auth
- `useAuthStore` is effectively a demo auth system
- RBAC permissions are declared but not fully enforced

### Data consistency
- Optimistic updates exist, but rollback is inconsistent in some flows
- `initializeFromSupabase` ignores errors per-collection, which can leave partial state
- Some pages derive data from store at render time without memoization, may cause unnecessary recomputation

### UX / features
- Many placeholder pages: Settings, Profile
- No loading states or error boundaries in most pages
- No offline support
- Global search is basic and does not search positions or checksheets deeply
- Dashboard charts use mostly mock revenue/task data
- Timeline integration is half-implemented
- No realtime updates despite Supabase being realtime-capable

---

## 9. Technical debt

- **Auth system**: replace demo auth with Supabase Auth or backend auth
- **Permission enforcement**: apply `requiredPermissions` to routes/components
- **Store decomposition**: split into domain slices or feature stores
- **Error handling**: standardize error UI instead of console-only logging
- **Environment/config**: no `.env.example`, env validation, or config layer
- **Testing**: no tests, no test runner configuration
- **Accessibility**: minimal ARIA/keyboard support beyond basic inputs
- **Performance**: no code splitting, no memoization strategy, no virtualization for long lists
- **Validation**: minimal form validation outside auth
- **Internationalization**: hardcoded Vietnamese strings
- **Schema drift risk**: two parallel type systems in `types/database.ts` and `types.ts`

---

## 10. Suggestions

### High priority
1. Finalize auth model: Supabase Auth + RLS, then remove demo local password store
2. Use `requiredPermissions` from `routesConfig.ts` in actual guards/components
3. Add basic error boundaries and loading skeletons
4. Add `.env.example` and runtime env validation
5. Introduce feature folders or at least hook/component folders per domain

### Medium priority
6. Add form validation with Zod or similar
7. Add basic unit tests for critical services/stores
8. Implement real Supabase realtime subscriptions for move logs/notifications
9. Replace hardcoded Vietnamese strings with i18n
10. Add pagination/filtering backend support instead of loading everything into Zustand

### Low priority
11. Improve charts with real aggregated data
12. Add export for statistics with real date-aware backend aggregation
13. Add audit log viewer backed by `activity_logs`
14. Add image optimization and lazy loading
15. Add E2E tests for main flows

---

## 11. Missing features

- **Settings page** is placeholder
- **Profile page** is placeholder
- **Full audit log viewer** despite `activity_logs` table types existing
- **Real notifications** beyond in-app store entries
- **Real-time updates** for positions, tasks, attendance
- **Advanced search/filtering** across entities
- **Export/import** for vehicles, positions, employees
- **Backup/restore** flow
- **Multi-language support**
- **Offline mode / PWA**
- **Role-permission matrix UI** for admins
- **Vehicle history/timeline** as a fully integrated timeline feature
- **Barcode/QR scanning** integration for vehicle/check sheet workflows
- **Reporting scheduler / email reports**

---

## 12. Recommended development roadmap

### Phase 1 — Stabilization
- Audit and fix data initialization and error handling
- Complete permission enforcement in routes and UI
- Replace demo auth with production auth
- Add loading and error states on every page

### Phase 2 — Core workflow hardening
- Finish timeline feature cleanly
- Finalize checksheet and task business logic
- Add validation and safer optimistic update patterns
- Add tests for services and critical store actions

### Phase 3 — Operational features
- Real-time subscriptions
- Real notifications system
- Audit log viewer
- Settings persistence in Supabase
- Advanced search and global navigation improvements

### Phase 4 — Scale
- Backend aggregation for statistics
- Export/import and reporting
- Performance improvements: virtualization, pagination, code splitting
- i18n and accessibility pass
- Mobile app or PWA if needed

---

_Generated by lead engineer audit. Based on current source tree only. No external system review performed._
