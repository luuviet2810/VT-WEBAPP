# PROJECT_CONTEXT.md

## 1. Project overview

**Project name**: gara-manager  
**Domain**: Used vehicle lot / garage management  
**Primary users**: Admin and staff managing vehicle flow, positions, tasks, attendance, checksheets, and basic statistics  
**Language**: Vietnamese UI  
**Deployment target**: Frontend-only app backed by Supabase  

### Core purpose
- Manage incoming/outgoing vehicles
- Track vehicle positions in a garage workflow
- Assign and track maintenance/processing tasks
- Record checksheets for vehicle condition
- Track staff attendance
- Provide dashboards for daily operations and statistics

### Important constraint
- The app currently uses a **demo auth system** client-side. Do not assume auth is production-ready.
- RBAC roles and permissions are defined, but route enforcement is partial.

---

## 2. Tech stack

| Layer | Technology | Version / notes |
|------|------|------|
| UI framework | React | 18.3 |
| Language | TypeScript | 5.5 |
| Build | Vite | 5.3 |
| Routing | react-router-dom | 6.25 |
| State | Zustand | 4.5 |
| Styling | Tailwind CSS | 3.4 + PostCSS + Autoprefixer |
| Icons | lucide-react | 0.400 |
| Charts | recharts | 2.12 |
| Drag/drop | @dnd-kit | core 6.3, sortable 10.0, utilities 3.2 |
| Backend client | @supabase/supabase-js | 2.110 |
| Auth helpers | WebAuthn utilities | custom |
| Mobile input | react-mobile-picker | 1.2 |
| Utils | clsx | 2.1 |

### Runtime assumptions
- Browser-only SPA
- Supabase is the data source
- No backend proxy or API layer
- No test runner configured

---

## 3. Folder architecture

```
src/
  App.tsx                       Router, layouts, guards
  main.tsx                      BrowserRouter bootstrap
  vite-env.d.ts
  components/
    ui.tsx                      Shared primitives: Modal, Badge, EmptyState, Tabs, WheelPicker, CollapsibleCard, SegButton, BatteryCheck
    Sidebar.tsx                  Desktop + mobile sidebar + drawer
    GlobalSearch.tsx             Command palette search modal
    NotificationCenter.tsx       Notification UI
    SettingsPanel.tsx            Settings UI component
    ViewModeToggle.tsx           Admin preview role toggle
    RouteGuard.tsx               Route protection wrapper
    PermissionGuard.tsx          Permission-based wrapper
    CheckSheetForm.tsx           Checksheet form component
    PhotoUploader.tsx            Image/document uploader
  hooks/
    useAuthRole.ts               Admin/staff mode hooks
    useIsAdmin.ts                Legacy employee-based admin hook
  lib/
    supabase.ts                  Supabase client initialization
  pages/
    Login.tsx
    Register.tsx
    Forbidden.tsx
    Dashboard.tsx                 Placeholder wrapper
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
    roles.ts                     Role types, labels, hierarchy
    permissions.ts               Permission enum + role-permission map
    routesConfig.ts              Route metadata with roles/permissions
    sidebarConfig.tsx            Sidebar menu by role
    dashboardConfig.ts           Dashboard routing config
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
    useStore.ts                  Main domain store
    useAuthStore.ts              Auth/user store
    viewModeStore.ts             Preview role mode store
  types/
    database.ts                  DB schema-oriented types
    types.ts / index.ts          App domain types
  utils/
    format.ts                    Date, currency, uid helpers
    taskRules.ts                 Task generation from checksheet
    webauthn.ts                  WebAuthn helper
    timeline.ts                  Timeline formatting helpers
```

### Naming and layering rules
- **pages/**: route-level screens; keep them thin
- **components/**: shared UI; domain-specific components may live near their page if not reused
- **services/**: Supabase data access only
- **store/**: Zustand stores only
- **hooks/**: reusable stateful logic
- **utils/**: pure helpers
- **types/**: TypeScript types
- **rbac/**: access control metadata and helpers

---

## 4. Current modules

### Auth module
- `pages/Login.tsx`, `pages/Register.tsx`, `pages/Forbidden.tsx`
- `store/useAuthStore.ts`
- `hooks/useAuthRole.ts`, `hooks/useIsAdmin.ts`
- `utils/webauthn.ts`
- Status: **demo auth**, local password hash, not production-ready

### Vehicle module
- `pages/VehicleList.tsx`, `pages/VehicleDetail.tsx`, `pages/VehicleFormModal.tsx`
- `services/vehicle.service.ts`, `services/vehicleMedia.service.ts`, `services/storage.service.ts`
- `components/PhotoUploader.tsx`
- Handles CRUD, position assignment, media upload, status changes, deletion

### Position module
- `pages/Positions.tsx`
- `services/position.service.ts`
- Kanban board, drag/drop vehicles, reorder positions

### Task module
- `pages/Tasks.tsx`, `pages/TaskDetail.tsx`, `pages/MyTasks.tsx`
- `services/task.service.ts`
- `utils/taskRules.ts`
- Kanban board, checklist, task activities, notifications

### Checksheet module
- `components/CheckSheetForm.tsx`
- `services/checksheet.service.ts`
- In/out checksheet creation

### Attendance module
- `pages/Attendance.tsx`
- `services/attendance.service.ts`
- Check-in/out, admin edit, CSV export

### Employee module
- `pages/Employees.tsx`
- `services/users.service.ts`
- Profile, approval flow, passkey setup

### Dashboard module
- `pages/dashboards/OverviewDashboard.tsx`
- `pages/dashboards/StaffDashboard.tsx`
- `pages/dashboards/StatisticsDashboard.tsx`

### Notification module
- `services/notification.service.ts`
- `components/NotificationCenter.tsx`

### Timeline module
- `services/timeline.service.ts`
- `utils/timeline.ts`
- `store/useStore.ts` contains timeline loading state
- Status: partially integrated

---

## 5. Business architecture

### Entities
- **Vehicle**: plate, model, status, position, assignee, images, documents, pricing
- **Position**: ordered garage locations
- **MoveLog**: vehicle movement history
- **CheckSheet**: in/out inspection records
- **Task**: work item with checklist, priority, status, assignee, due date
- **TaskActivityLog**: task change history
- **Attendance**: daily check-in/out per employee
- **Notification**: in-app notifications
- **User/Employee**: identity and role
- **Settings**: company settings

### Business rules
- Vehicle status: `available`, `deposited`, `sold`
- Task status: `todo`, `doing`, `done`
- User roles: `admin`, `staff`
- Admin-only routes: tasks, statistics, employees, price list, settings
- Staff routes: vehicles read, attendance, my tasks
- Positions cannot be deleted while vehicles are assigned
- Tasks can be auto-generated from checksheet rules

### Workflow
1. Vehicle enters garage → created, assigned position
2. Checksheet in created
3. Tasks generated from checksheet
4. Staff performs tasks and moves vehicle between positions
5. Checksheet out created
6. Vehicle marked sold/deposited/available
7. Attendance and notifications recorded throughout

---

## 6. Data flow

### Current flow
```
Component
  → useStore selector
  → store action
  → service function
  → Supabase client
  → optimistic update in store
```

### Initialization
- `App.tsx` calls `initializeFromSupabase()` on mount
- Loads: vehicles, positions, employees, tasks, checkSheets, attendance, notifications, moveLogs
- Stores everything in `useStore`
- Subsequent UI reads from local Zustand state

### Mutation pattern
- Optimistic update first
- Service call after
- Rollback on error
- Notification creation after some mutations
- Timeline loading via dedicated store action

### Notable deviation
- Some UI still imports services directly; intended pattern is components → store → services

---

## 7. Coding conventions

### Language
- UI text: Vietnamese
- Code identifiers: English
- Comments: English or Vietnamese, inconsistent; prefer concise English

### Formatting
- TypeScript with semicolons
- Single quotes preferred
- 2-space indentation
- Components use PascalCase
- Functions/variables use camelCase
- Files use PascalCase for components, camelCase for utilities/services

### Style
- Tailwind utility classes inline
- `clsx` for conditional classes
- Lucide icons used consistently
- Cards, badges, inputs follow existing patterns in `components/ui.tsx`

### TypeScript
- Strict mode implied by tsconfig
- Types split between `types/database.ts` and `types.ts`
- Services cast Supabase rows manually with `Record<string, unknown>` or explicit mappers

---

## 8. Current limitations

### Functional
- Settings and profile pages are placeholders
- Timeline feature is half-integrated
- Dashboard charts use mostly placeholder/mock data
- Global search does not cover all entities deeply
- No realtime updates
- No offline support

### Non-functional
- Client-side demo auth
- Partial RBAC enforcement
- No error boundaries
- No loading skeletons
- No form validation framework
- No tests
- No code splitting
- No i18n
- Duplicate type systems risk drift

---

## 9. Future architecture

### Target direction
- Keep SPA architecture
- Move toward feature-based organization without full rewrite
- Introduce thin domain hooks between components and store
- Keep Zustand, but decompose store by domain
- Replace demo auth with Supabase Auth + RLS
- Use `requiredPermissions` from `rbac/routesConfig.ts` consistently

### Proposed structure
```
src/
  features/
    auth/
    vehicles/
    positions/
    tasks/
    attendance/
    employees/
    settings/
  components/
    ui/
    layout/
    forms/
  services/
    supabase/
  store/
    auth/
    vehicles/
    positions/
    tasks/
  hooks/
  utils/
  types/
  rbac/
```

### Principles
- Pages remain route shells
- Feature folders own their components, hooks, store slices, and services
- Shared UI stays in `components/ui`
- Services remain thin Supabase wrappers
- Business rules move from store into domain hooks or service layer

---

## 10. Module dependency graph

### High-level dependencies
```
pages/
  → components/         (UI components)
  → store/              (state)
  → services/           (data)
  → utils/              (helpers)
  → hooks/              (reusable logic)
  → rbac/               (access control)
  → types/              (types)

store/
  → services/
  → utils/
  → types/

services/
  → lib/supabase.ts
  → types/

components/
  → lucide-react
  → clsx
  → tailwind classes
```

### Current coupling notes
- `App.tsx` directly imports every page
- `useStore.ts` imports nearly all services
- `VehicleDetail.tsx` imports timeline utilities directly
- `Positions.tsx` imports dnd-kit directly
- Shared `components/ui.tsx` is a monolith of primitives

---

## 11. Safe extension strategy

### Rules for safe changes
1. **Do not refactor unless requested**
2. **Do not change existing UI unless required**
3. **Do not modify auth, checksheet, or task business logic unless explicitly asked**
4. **Prefer store actions over new service calls in components**
5. **Add new files instead of modifying large existing files when possible**
6. **Keep changes localized to allowed files per feature request**

### Extension patterns
- **New page**: add route in `App.tsx`, create file in `pages/`
- **New service**: add file in `services/`, call only from store or allowed components
- **New store action**: extend `useStore.ts` carefully; avoid expanding unrelated concerns
- **New UI component**: add to `components/` or page-local folder
- **New permission**: add to `rbac/permissions.ts`, then use in `routesConfig.ts` and guards

### AI-assisted development guardrails
- Always read `docs/CODING_RULES.md` before editing
- Always read `docs/FEATURE_SPEC_TEMPLATE.md` before implementing a feature
- Do not infer missing behavior; ask for clarification
- Do not perform cross-cutting refactors as side effects
- Report changed files explicitly after edits
