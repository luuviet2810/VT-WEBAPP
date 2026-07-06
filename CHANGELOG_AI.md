# CHANGELOG_AI.md

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
