# CHANGELOG_AI.md

## 2026-07-07 - RBAC: ROLE & PERMISSION SYSTEM

### New Files
- **New**: `src/rbac/usePermissions.ts` — Centralized permission hooks for all components. Exports `usePermission`, `useAnyPermission`, `useAllPermissions`, `useVehiclePermissions`, `useTaskPermissions`, `usePricePermissions`, `useChecksheetPermissions`, `useCanUpdateTask`, `useCanDeleteVehicle`, `useCanChangePrice`, `useCanChangeWorkflow`.

### Roles (4 levels)
- **Admin** — Full access.
- **Manager** — Vehicle management, task management, dashboard, timeline, employees, reports. No system settings.
- **Staff** — View vehicles, update own tasks, upload photos, complete checklists. No delete or price edit.
- **Driver** — View assigned vehicles, confirm movement, view info only.

### Permission Model
- 4 new permissions: `vehicle:upload_photo`, `vehicle:upload_document`, `vehicle:change_price`, `vehicle:change_workflow`.
- Full role-permission matrix for all 4 roles.

### UI Guards
- `VehicleDetail.tsx` — Delete, position, assignee, sell price, status, checksheet, photo/document upload buttons guarded by role permissions.
- `Tasks.tsx` — "Giao việc" button guarded by `task:create`.
- `PriceList.tsx` — Add/edit/delete guarded by `pricelist:update`/`vehicle:delete`.

### Sidebar
- All 4 roles have tailored menus via `sidebarConfig.tsx`.

### Changed Files
- `src/rbac/roles.ts`, `src/rbac/permissions.ts`, `src/rbac/routesConfig.ts`, `src/rbac/dashboardConfig.ts`, `src/rbac/sidebarConfig.tsx`, `src/store/viewModeStore.ts`, `src/hooks/useAuthRole.ts`, `src/types.ts`, `src/App.tsx`, `src/components/ViewModeToggle.tsx`, `src/pages/VehicleDetail.tsx`, `src/pages/Tasks.tsx`, `src/pages/PriceList.tsx`.

## 2026-07-07 - GARAGE DASHBOARD v1

### New Files
- **New**: `src/pages/dashboards/GarageDashboard.tsx` — Operational garage dashboard with 6 sections. Replaces `OverviewDashboard` as the default post-login page.

### Sections
1. **Garage Overview** — Summary cards: Total vehicles, Active, Waiting check-in, Final check, Ready for sale, Sold, Overdue. All counts derived from existing store data.
2. **Today's Work** — Employee task progress: avatar, name, progress bar, % complete, done-today count. Sorted busiest first. Uses only Zustand store data (no extra queries).
3. **Vehicles In Progress** — Card grid (responsive 1–4 cols) showing plate, model, position, workflow badge, active task count, progress %, assigned employee. Click opens Vehicle Detail.
4. **Overdue Vehicles** — List of vehicles with overdue tasks, sorted longest delay first. Shows plate, workflow badge, assignee, days delayed. Click opens Vehicle Detail.
5. **Recent Activity** — Latest task activity logs (newest first). Uses existing `taskActivityLogs` from store. Shows activity description, type label, employee, timestamp.
6. **Employee Workload** — Small ranking table: employee, assigned tasks, completed today, working vehicles count. Sorted most-loaded first.

### Technical Notes
- All data computed from existing Zustand store via `useStore` selectors; no new Supabase queries.
- All expensive computations wrapped in `useMemo` to avoid recalculating on re-renders.
- Workflow status for each vehicle derived via existing `getVehicleWorkflowStatus()` with `WorkflowCheckSheet` minimal type.
- Realtime updates are automatic — dashboard re-renders whenever Zustand state changes (vehicles, tasks, move logs, etc. are already subscribed via `useRealtimeSync`).
- `App.tsx` updated to use `GarageDashboard` as the default post-login route (`/`).

### Changed Files
- `src/App.tsx` — Replaced `OverviewDashboard` import with `GarageDashboard`, updated `DashboardRouter()` to render `GarageDashboard`.
- `src/pages/dashboards/GarageDashboard.tsx` — New file.

## 2026-07-07 - VEHICLE WORKFLOW STATUS

### Build Fixes
- Fixed `getVehicleWorkflowStatus()` taking a `CheckSheet[]` parameter — replaced with a minimal `WorkflowCheckSheet` interface (`{ type, checkDate }`) so callers with minimal checksheet data can satisfy the type without casts.
- Fixed `Badge` component receiving unsupported `className` prop in `Tasks.tsx` and `VehicleList.tsx` — removed `className="text-xs"` from both usages.

### New Files
- **New**: `src/utils/vehicleWorkflow.ts` — Derives a vehicle's pipeline/workflow status from tasks and checksheets. Exports `getVehicleWorkflowStatus(vehicle, tasks, sheets)`, `WORKFLOW_STATUS_LABEL`, and `WORKFLOW_STATUS_TONE`. The workflow pipeline: `NEW → INPUT → WORKING → FINAL_CHECK → READY → SOLD`.
- **New**: `src/services/vehicleWorkflow.service.ts` — Persists workflow status changes to the new `vehicle_workflow_logs` table. Exports `getVehicleWorkflowLogs()` and `addVehicleWorkflowLog()`.
- **New**: `migrations/003_add_vehicle_workflow_log.sql` — Creates the `vehicle_workflow_logs` table for storing workflow state transitions.

### Changes
- **Modified**: `src/types.ts` — Added `VehicleWorkflowStatus` type (`'new' | 'input' | 'working' | 'final_check' | 'ready' | 'sold'`). Added `'vehicle_workflow_changed'` to `TimelineItemType` union.
- **Modified**: `src/store/useStore.ts` — `addCheckSheet` now records workflow status transitions in the vehicle timeline and persists to `vehicle_workflow_logs`. `generateTasksFromSheet` records workflow status after task generation. `updateTask` records workflow status transitions when task state changes affect the vehicle's pipeline position.
- **Modified**: `src/pages/VehicleList.tsx` — Each vehicle card now shows a workflow status badge alongside the sale status badge.
- **Modified**: `src/pages/VehicleDetail.tsx` — Header now shows the workflow status badge next to the plate number.
- **Modified**: `src/pages/Tasks.tsx` — Each task card now shows the workflow status badge next to the vehicle plate.

### Workflow Rules (evaluated top-to-bottom, first match wins)
1. `SOLD` — `vehicle.status === 'sold'`
2. `READY` — output checksheet exists (vehicle passed final inspection)
3. `FINAL_CHECK` — all tasks done AND output checksheet not yet completed
4. `WORKING` — vehicle has at least one unfinished task
5. `INPUT` — input checksheet exists
6. `NEW` — default (vehicle created, no checksheets)

## 2026-07-06 - SPRINT #2: SUPABASE REALTIME FOUNDATION

### New Files
- **New**: `src/types/realtime.ts` — Type definitions for realtime channels and store action contracts (`RealtimeChannels`, `RealtimeStoreActions`).
- **New**: `src/services/realtime.service.ts` — Centralized Supabase Realtime manager. Subscribes to 7 tables: `vehicles`, `tasks`, `positions`, `move_logs`, `task_activity_logs`, `vehicle_images`, `vehicle_documents`. All subscriptions are started by `subscribe()` and stopped by `unsubscribe()`.
- **New**: `src/hooks/useRealtimeSync.ts` — React hook that subscribes to Supabase Realtime when authenticated and unsubscribes on logout. Uses an in-memory `Map<imageId, {vehicleId, url, isDoc}>` to correctly handle DELETE events for images/documents (Supabase DELETE payload only contains `{ id }`). Calls `loadVehicleTimeline` after vehicle and task changes to keep timelines fresh.

### Changes
- **Modified**: `src/App.tsx` — Added `useRealtimeSync()` hook call in `App` component. Realtime channels are active for the entire authenticated session and automatically cleaned up on logout.
- **Modified**: `src/store/useStore.ts` — Added 5 realtime helper actions: `upsertVehicleFromRealtime`, `upsertTaskFromRealtime`, `upsertPositionFromRealtime`, `upsertMoveLogFromRealtime`, `upsertTaskActivityFromRealtime`. `upsertMoveLogFromRealtime` also updates the affected vehicle's `positionId` optimistically. `upsertVehicleFromRealtime` preserves existing `images`/`documents` arrays when updating (realtime payload carries empty arrays).

### How it works
- **Vehicles**: INSERT/UPDATE upserts into Zustand `vehicles[]`. DELETE removes from Zustand. Vehicle timeline reloaded on change.
- **Tasks**: INSERT/UPDATE upserts into Zustand `tasks[]`. DELETE removes. Vehicle timeline reloaded on change.
- **Positions**: INSERT/UPDATE upserts into Zustand `positions[]`. DELETE removes.
- **MoveLogs**: INSERT prepends to Zustand `moveLogs[]` and updates the affected vehicle's `positionId`. Vehicle timeline reloaded.
- **TaskActivityLogs**: INSERT prepends to Zustand `taskActivityLogs[]`. Vehicle timeline reloaded.
- **VehicleImages**: INSERT/UPDATE tracks `id→{vehicleId, url}` in memory map, adds URL to vehicle's `images[]`. DELETE removes URL from vehicle's `images[]`.
- **VehicleDocuments**: Same pattern as images — tracks `id→{vehicleId, url}` in memory map, manages vehicle's `documents[]`.

## 2026-07-06
- Fixed checksheet out-tire state not being included in `CheckSheetForm` save patches, which prevented out-check tire status from persisting to Supabase.
- Fixed `generateTasksFromSheet` duplicate task handling to merge new checklist items into existing tasks instead of skipping updates silently.
- Removed noisy production console logs from checksheet save/debug paths while keeping error logging intact.
- Made checksheet-driven task generation idempotent by reusing stable rule identifiers and preventing duplicate task creation for the same checklist condition.
- Made removed checklist items reconcile safely: rule-backed tasks no longer in the checksheet are deleted if still TODO, while completed tasks are preserved and annotated in task activity logs.
- Improved status consistency by keeping checklist cleanup scoped to non-done tasks and recording lifecycle changes through centralized task activity entries.
- Recorded important workflow actions in Timeline by wiring task activity logs into the timeline provider and adding task-creation activity entries in `task.service.ts`.
- Audited vehicle lifecycle paths to ensure create/edit/delete/position/assignee/status changes remain consistent across Zustand, services, and UI.
- Verified task lifecycle behavior: create, edit, delete, finish, reopen, checklist updates, and linked vehicle updates all flow through store actions with optimistic updates and rollback.
- Verified checksheet lifecycle end-to-end: input → generate tasks → task completion → output checksheet, with safeguards against duplicate tasks and safe removal of unfinished rule-backed tasks.
- Verified gallery and document flows: upload, delete, cover selection, sort order, and refresh state all preserve media order and metadata correctly.
- Verified positions and move-log flows: dragging a vehicle updates Vehicle Detail, Vehicle List, Task Board, and Timeline consistently via centralized store actions.
- Tightened My Tasks toggle behavior so it only flips between todo/done, preventing invalid intermediate status transitions from the personal task view.
- Fixed duplicate type definitions: `TimelineItem`/`TimelineItemType` now have a single canonical definition in `src/types.ts`; removed duplicates from `src/services/timeline.service.ts` and `src/utils/timeline.ts`. Added missing members `vehicle_updated`, `photo_uploaded`, `document_uploaded` to the shared `TimelineItemType` union.
- Fixed `TaskActivityEntry` duplicate type by replacing it with the canonical `TaskActivityLogEntry` from `src/types.ts` in `src/services/task.service.ts`.
- Fixed `TaskPriority`/`TaskStatus` duplicates in `src/utils/taskRules.ts` by importing from `src/types.ts`.
- Fixed `ruleId` not being persisted to Supabase: `mapRow`, `createTask`, and `updateTask` in `task.service.ts` now correctly map and write the `rule_id` column. Added migration `002_add_task_rule_id.sql` to add the column to the database.
- Fixed `outTireState` not being loaded from existing checksheets in `CheckSheetForm.tsx` — the state is now initialized from the loaded sheet on mount.
- Fixed `updateCheckSheet` in `checksheet.service.ts` missing `outTireState` in the update payload, which could cause the field to be nulled on partial saves.
- Removed noisy production console logs from all service and store files: `checksheet.service.ts`, `taskRules.ts`, `VehicleFormModal.tsx`, `users.service.ts`, `position.service.ts`, `timeline.service.ts`, `moveLog.service.ts`, `useStore.ts`.
- Fixed timeline becoming stale after vehicle updates: `updateVehicle` and `moveVehicle` in `useStore.ts` now call `loadVehicleTimeline(id)` after successful Supabase writes, keeping Vehicle Detail timeline in sync with state changes.
