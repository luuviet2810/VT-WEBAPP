# CHANGELOG_AI.md

## 2026-07-07 - FEATURE #014: WORKFLOW VALIDATION & PRODUCTION HARDENING

### Production Hardening

#### Console.log Cleanup
- Removed all `console.log` statements from production code:
  - `src/store/useAuthStore.ts` — Removed 14 debug logging statements (registration, login, password hash logging)
  - `src/store/useStore.ts` — Removed initialization logging
  - `src/utils/webauthn.ts` — Removed 1 success log statement
  - `src/services/timeline.service.ts` — Removed provider registration logging

#### Console.error Standardization
- Standardized console.error format (removed emoji prefixes) for cleaner production logs:
  - `src/services/vehicleMedia.service.ts` — Cleaned 2 error logs
  - `src/pages/VehicleDetail.tsx` — Cleaned 1 error log
  - `src/components/CheckSheetForm.tsx` — Cleaned 3 error logs
  - `src/services/task.service.ts` — Cleaned 1 error log
  - `src/components/PhotoUploader.tsx` — Cleaned 1 error log
  - `src/utils/webauthn.ts` — Cleaned 4 error logs

#### Error Handling Improvements
- Added user-facing error notifications for critical store failures:
  - Vehicle deletion failure
  - Vehicle move failure
  - Vehicle update failure
  - Task creation failure
- Notifications use existing notification system with `type: 'error'`

#### Code Quality
- Verified no dead code or duplicate helpers exist
- Confirmed all utility functions (formatDate, formatCurrency, uid) have single implementations
- Verified RBAC permission system has proper 4-role hierarchy (admin > manager > staff > driver)
- Confirmed permission hooks (`useVehiclePermissions`, `useTaskPermissions`, etc.) are properly integrated

#### Build Verification
- `npm run build` passes with zero TypeScript errors
- No schema changes
- No UI redesigns
- Existing features continue working

---

## 2026-07-07 - FEATURE #013A: SAFE ARCHITECTURE CLEANUP

### Aborted Previous Refactor
- Aborted the large architecture refactor (FEATURE #013).
- No folder restructuring; current project structure preserved.

### Deleted Files
- **Deleted**: `src/shared/` directory (created by aborted refactor, not part of project architecture).
  - `src/shared/hooks/useRole.ts`
  - `src/shared/hooks/index.ts`
  - `src/shared/utils/format.ts`
  - `src/shared/utils/webauthn.ts`
  - `src/shared/utils/timeline.ts`
  - `src/shared/utils/index.ts`

### Restored Files
- `src/hooks/useAuthRole.ts` — Restored original implementation (removed `shared/` re-export forwarding).
- `src/utils/format.ts` — Restored original implementation (removed `shared/` re-export forwarding).
- `src/utils/webauthn.ts` — Restored original implementation (removed `shared/` re-export forwarding).
- `src/utils/timeline.ts` — Restored original implementation (removed `shared/` re-export forwarding).

### Cleanup
- `src/rbac/index.ts` — Removed orphaned `export * from './usePermissions'` (usePermissions exists but was not included in the barrel before the refactor).
- `src/types.ts` — No duplicate Employee interface found. Verified clean.
- `src/types/database.ts` — Confirmed unused (no imports). Not deleted per project guidelines.

### Build
- `npm run build` passes with zero errors.

---

## 2026-07-07 - FEATURE #013: PROJECT MODULARIZATION

### New Directory
- **New**: `src/shared/` — canonical location for cross-feature shared code.
  - `src/shared/hooks/useRole.ts` — Unified role hooks (useEffectiveRole, useIsAdminMode, useIsManagerMode, useIsStaffMode, useIsDriverMode). Resolves the three conflicting `useEffectiveRole` definitions that existed previously.
  - `src/shared/hooks/index.ts` — Barrel re-export.
  - `src/shared/utils/format.ts` — Pure date/currency/ID helpers.
  - `src/shared/utils/webauthn.ts` — WebAuthn/passkey utilities.
  - `src/shared/utils/timeline.ts` — Timeline formatting helpers.
  - `src/shared/utils/index.ts` — Barrel re-export.

### Deduplication
- `src/types.ts` — Removed duplicate `Employee` interface (was declared twice, identical shape). Kept the first definition.
- `src/rbac/index.ts` — Added `export * from './usePermissions'` to make the barrel complete. Previously it was orphaned (no imports).
- `src/hooks/useAuthRole.ts` — Replaced implementation with re-export from `src/shared/hooks/useRole.ts`.
- `src/hooks/useIsAdmin.ts` — Kept as-is (has distinct semantics: reads `employees` array in store, not RBAC role). Marked as legacy.
- `src/utils/format.ts` — Replaced implementation with re-export from `src/shared/utils/format.ts`.
- `src/utils/webauthn.ts` — Replaced implementation with re-export from `src/shared/utils/webauthn.ts`.
- `src/utils/timeline.ts` — Replaced implementation with re-export from `src/shared/utils/timeline.ts`.

### Cleanup (No Functional Changes)
- `src/types/database.ts` — Confirmed unused (no imports in codebase). Not deleted (may be needed for future Supabase typed queries).
- `src/rbac/index.ts` — Now a useful barrel re-exporting all rbac sub-modules including `usePermissions`.
- All original import paths unchanged — backward compatible via re-export forwarding.

### Build
- `npm run build` passes with zero errors.

---

## 2026-07-07 - FEATURE #012: SMART SCHEDULING ENGINE

### New Files
- **New**: `src/utils/RecommendationEngine.ts` — Deterministic rule-based scheduling engine. NOT AI, NOT machine learning. Pure conditional logic. Isolates all scheduling rules from UI.
  - Types: `RecommendationInput`, `VehicleRecommendation`, `TaskRecommendation`, `EmployeeRecommendation`, `PositionRecommendation`, `Recommendations`
  - Exports: `getRecommendations(input)`, `suggestEmployeeForTask(taskId, tasks, employees)`
  - Rules implemented:
    - Vehicle: `vehicle_needs_final_check` (all tasks done), `vehicle_needs_ready` (final check done), `vehicle_overdue` (>7d working or >14d any workflow), `vehicle_blocked` (new with no checksheet)
    - Task: `task_unassigned`, `task_overdue`, `task_high_priority`
    - Employee: `employee_idle` (0 active tasks), `employee_underloaded` (< 2 active tasks)
    - Position: `position_crowded` (>5 vehicles), `position_empty` (0 vehicles)

### Dashboard Integration
- `pages/dashboards/GarageDashboard.tsx` — Added new Section 7 "Đề xuất thông minh" below Recent Activity. Shows vehicle, task, and employee recommendations in 3-column grid with priority-colored dots. Only renders when recommendations exist. Links to VehicleDetail and TaskDetail.

### No New UI Pages
- No new routes, no new sidebar items.
- Engine is purely in `utils/RecommendationEngine.ts`.

---

## 2026-07-07 - FEATURE #011: TASK & CHECKSHEET TEMPLATES

### New Files
- **New**: `src/types.ts` — Added `TaskTemplate`, `TaskTemplateTask`, `TaskTemplateChecklistItem` interfaces and `TaskTemplateType` union.
- **New**: `src/services/template.service.ts` — Template CRUD service (Zustand/localStorage persistence, no DB table). Includes 7 seed templates: Kiểm tra tổng quát, Thay dầu máy, Vệ sinh nội thất, Đánh bóng ngoại thất, Sửa chữa sơn, Dịch vụ toàn diện, Mẫu tuỳ chỉnh.
- **New**: `src/components/TemplateLibrary.tsx` — Full template library component with search, sort (by usage/name/date), filter by type, CRUD modals, duplicate, favorite toggle, and RBAC-gated management actions.
- **New**: `src/components/ApplyTemplateModal.tsx` — Modal for applying a template to a vehicle. Shows which tasks will be created, marks already-applied templates, and displays a success animation.
- **New**: `src/pages/Templates.tsx` — Full-page template library route at `/mau-cong-viec`.

### Templates Page & Route
- Added `/mau-cong-viec` route in `App.tsx`, protected by `RoleGuard` for admin + manager.
- Added "Mẫu công việc" sidebar menu item for admin and manager (using `FileText` icon).

### Store Integration
- Added `templates: TaskTemplate[]` state, `loadTemplates`, `createTemplate`, `updateTemplate`, `deleteTemplate`, `duplicateTemplate`, `toggleTemplateFavorite`, `applyTemplate` actions to `useStore`.
- Templates loaded from localStorage on `initializeFromSupabase()`.
- `applyTemplate` is idempotent: skips tasks with matching `ruleId`, merges checklist items for same task, creates only net-new items.

### RBAC Integration
- Added `template:read` and `template:write` permissions in `permissions.ts`.
- admin + manager: full CRUD on templates.
- staff: read-only template list, can apply templates to vehicles.
- driver: read-only template list.
- `useTemplatePermissions()` hook in `usePermissions.ts` for components.

### VehicleDetail Integration
- "Áp dụng mẫu" button added to the checksheet tab (visible when `checksheet:create` is granted).
- Opens `ApplyTemplateModal` filtered to current vehicle.

### No Database Changes
- Templates stored entirely in Zustand → localStorage.
- No new Supabase tables created.

---

## 2026-07-07 - RBAC: ROLE & PERMISSION SYSTEM

### New Files
- **New**: `src/rbac/usePermissions.ts` — Centralized permission hooks for all components. Exports `usePermission`, `useAnyPermission`, `useAllPermissions`, `useVehiclePermissions`, `useTaskPermissions`, `usePricePermissions`, `useChecksheetPermissions`, `useCanUpdateTask`, `useCanDeleteVehicle`, `useCanChangePrice`, `useCanChangeWorkflow`.

### Roles (4 levels)
- **Admin** — Full access to everything including system settings and user management.
- **Manager** — Vehicle management (create, update, move, assign), task management, dashboard, timeline, employees, reports. Cannot manage system settings.
- **Staff** — View assigned vehicles, update own tasks, upload photos, complete checklists. Cannot delete vehicles, change workflow manually, or edit pricing.
- **Driver** — View assigned move jobs, confirm vehicle movement, view vehicle information only.

### Permission Model
- 4 new permissions added: `vehicle:upload_photo`, `vehicle:upload_document`, `vehicle:change_price`, `vehicle:change_workflow`.
- Role-permission matrix fully defined for all 4 roles.
- Centralized `hasPermission`, `hasAnyPermission`, `hasAllPermissions` utilities.

### Route Protection
- `routesConfig.ts` updated: admin + manager + staff + driver route access lists. Staff/Driver go to `/viec-cua-toi` instead of `/nhiem-vu`.
- `RoleGuard` in `App.tsx` updated to support manager role.

### UI Guards (pages)
- `VehicleDetail.tsx` — Delete button hidden unless `vehicle:delete`. Position/assignee selectors hidden unless `vehicle:move`/`vehicle:assign`. Sell price field hidden unless `vehicle:change_price`. Status selector hidden unless `vehicle:change_workflow`. Checksheet creation buttons hidden unless `checksheet:create`. Photo/document upload hidden unless `vehicle:upload_photo`/`vehicle:upload_document`. Read-only fallback shown otherwise.
- `Tasks.tsx` — "Giao việc" button hidden unless `task:create`.
- `PriceList.tsx` — Add vehicle button, edit/status/delete actions hidden unless `pricelist:update`/`vehicle:delete`.

### Sidebar
- `sidebarConfig.tsx` — All 4 roles have tailored menus. Driver sees only Overview, Vehicle List, Attendance, Profile. Staff sees Overview, Vehicle List, Price List, My Tasks, Attendance. Manager sees all admin menus except Settings. Admin sees everything.

### View Mode Toggle
- `ViewModeToggle.tsx` — Preview options expanded to all 4 roles (Admin/Manager/Staff/Driver).

### Changed Files
- `src/rbac/roles.ts` — Added `manager` and `driver` to `UserRole`. Updated hierarchy and labels.
- `src/rbac/permissions.ts` — Complete rewrite with all permissions and 4-role mapping.
- `src/rbac/routesConfig.ts` — Updated allowedRoles for all routes.
- `src/rbac/dashboardConfig.ts` — Added manager and driver entries.
- `src/rbac/sidebarConfig.tsx` — Full rewrite with 4-role config.
- `src/store/viewModeStore.ts` — `UserRole` widened to all 4 roles.
- `src/hooks/useAuthRole.ts` — Added `useIsManagerMode`, `useIsDriverMode`; updated `useEffectiveRole`.
- `src/types.ts` — Updated `UserRole` to include manager and driver.
- `src/App.tsx` — Cleaned up `RoleGuard` comment, updated imports.

## 2026-07-06

- **Sprint**: Feature Sprint
- **Feature**: Vehicle Work Board Mobile Layout v1
- **Goal**: Optimize the Vehicle Work Board for mobile devices by hiding the vehicle image section below `md`, expanding information and task sections to full width, and preserving the existing scrollable checklist, progress bar, assignee, vehicle information, task title, checklist, and desktop/tablet image display.
- **Modified files**:
  - `src/pages/Tasks.tsx`
- **Created files**: None
- **Deleted files**: None
- **Database changes**: None
- **API changes**: None
- **Breaking changes**: None
- **Known issues**: None
- **Technical debt**: None
- **Suggested next feature**: Continue with the next bounded feature from `docs/FEATURE_SPEC_TEMPLATE.md`.

## 2026-07-06

- **Sprint**: Feature Sprint
- **Feature**: Complete Supabase Storage Integration v1
- **Goal**: Make vehicle image upload fully functional with Supabase Storage by verifying upload, public URL generation, metadata insertion, gallery refresh, delete, list, and ordering behavior without temporary state.
- **Modified files**:
  - `src/components/PhotoUploader.tsx`
  - `src/services/storage.service.ts`
  - `src/services/vehicleMedia.service.ts`
  - `src/store/useStore.ts`
  - `docs/CHANGELOG_AI.md`
- **Created files**: None
- **Deleted files**: None
- **Database changes**: None
- **API changes**: None
- **Breaking changes**: None
- **Known issues**: None
- **Technical debt**: None
- **Suggested next feature**: Continue with the next bounded feature from `docs/FEATURE_SPEC_TEMPLATE.md`.

## 2026-07-06

- **Sprint**: Documentation Sprint
- **Feature**: Permanent AI development documentation setup
- **Goal**: Establish project context, coding rules, feature spec template, and AI changelog standards before further implementation.
- **Modified files**: None
- **Created files**:
  - `docs/PROJECT_AUDIT.md`
  - `docs/PROJECT_CONTEXT.md`
  - `docs/CODING_RULES.md`
  - `docs/FEATURE_SPEC_TEMPLATE.md`
  - `docs/CHANGELOG_AI.md`
- **Deleted files**: None
- **Database changes**: None
- **API changes**: None
- **Breaking changes**: None
- **Known issues**: None
- **Technical debt**: None
- **Suggested next feature**: Choose one small bounded UI or data feature and implement it using `docs/FEATURE_SPEC_TEMPLATE.md`.

## 2026-07-06

- **Sprint**: Feature Sprint
- **Feature**: Vehicle Timeline v1
- **Goal**: Complete the existing Vehicle Timeline feature using the current architecture and fix broken timeline integration on Vehicle Detail.
- **Modified files**:
  - `src/pages/VehicleDetail.tsx`
- **Created files**: None
- **Deleted files**: None
- **Database changes**: None
- **API changes**: None
- **Breaking changes**: None
- **Known issues**:
  - Build fails due to unrelated pre-existing TypeScript errors in `CheckSheetForm.tsx`, `checksheet.service.ts`, `store/useStore.ts`, `VehicleFormModal.tsx`, and `utils/taskRules.ts`.
  - These errors were discovered during build verification and are out of scope for this timeline feature.
- **Technical debt**:
  - Timeline providers for `task_status_changed` and `vehicle_status_changed` are placeholders.
  - `refreshVehicleTimeline` exists but is not used.
- **Suggested next feature**: Fix the unrelated TypeScript build errors, starting with `utils/taskRules.ts` and `services/checksheet.service.ts`, then continue with the next bounded feature from `docs/FEATURE_SPEC_TEMPLATE.md`.

## 2026-07-06

- **Sprint**: Feature Sprint
- **Feature**: Vehicle Gallery v1
- **Goal**: Improve the Vehicle Detail image experience with a responsive gallery, preview lightbox, empty state, and preserved upload flow.
- **Modified files**:
  - `src/pages/VehicleDetail.tsx`
- **Created files**:
  - `src/components/VehicleGallery.tsx`
- **Deleted files**: None
- **Database changes**: None
- **API changes**: None
- **Breaking changes**: None
- **Known issues**: None
- **Technical debt**: None
- **Suggested next feature**: None yet; validate Vehicle Gallery on Vehicle Detail and proceed with the next bounded feature from `docs/FEATURE_SPEC_TEMPLATE.md`.

## 2026-07-06

- **Sprint**: Feature Sprint
- **Feature**: Vehicle List - Search & Filter v1
- **Goal**: Make the vehicle list easier to scan with instant search and combined filters, without redesigning the page or adding backend changes.
- **Modified files**:
  - `src/pages/VehicleList.tsx`
- **Created files**:
  - `src/components/VehicleFilterBar.tsx`
- **Deleted files**: None
- **Database changes**: None
- **API changes**: None
- **Breaking changes**: None
- **Known issues**: None
- **Technical debt**: None
- **Suggested next feature**: Continue with the next bounded feature from `docs/FEATURE_SPEC_TEMPLATE.md`.

## 2026-07-06

- **Sprint**: Feature Sprint
- **Feature**: Vehicle ↔ Task Integration v1
- **Goal**: Strengthen the relationship between vehicles and tasks by showing related tasks on Vehicle Detail and linked vehicle info on Task Detail, without changing existing workflows.
- **Modified files**:
  - `src/pages/VehicleDetail.tsx`
  - `src/pages/TaskDetail.tsx`
- **Created files**: None
- **Deleted files**: None
- **Database changes**: None
- **API changes**: None
- **Breaking changes**: None
- **Known issues**: None
- **Technical debt**: None
- **Suggested next feature**: Continue with the next bounded feature from `docs/FEATURE_SPEC_TEMPLATE.md`.

## 2026-07-06

- **Sprint**: Feature Sprint
- **Feature**: Task Board - Vehicle Context v1
- **Goal**: Improve task visibility on the task board by showing related vehicle info directly on each task card without changing task logic or page layout.
- **Modified files**:
  - `src/pages/Tasks.tsx`
- **Created files**: None
- **Deleted files**: None
- **Database changes**: None
- **API changes**: None
- **Breaking changes**: None
- **Known issues**: None
- **Technical debt**: None
- **Suggested next feature**: Continue with the next bounded feature from `docs/FEATURE_SPEC_TEMPLATE.md`.

## 2026-07-06

- **Sprint**: Feature Sprint
- **Feature**: Task Work Board v1
- **Goal**: Redesign the Tasks page into a vehicle-centric work board showing grouped task progress per vehicle with horizontal scrolling sections.
- **Modified files**:
  - `src/pages/Tasks.tsx`
- **Created files**: None
- **Deleted files**: None
- **Database changes**: None
- **API changes**: None
- **Breaking changes**: None
- **Known issues**: None
- **Technical debt**: None
- **Suggested next feature**: Continue with the next bounded feature from `docs/FEATURE_SPEC_TEMPLATE.md`.

## 2026-07-06

- **Sprint**: Feature Sprint
- **Feature**: Replace Task Board with Vehicle Work Board v1
- **Goal**: Replace the old task-card kanban entirely with a new vehicle-centric work board where each card is one vehicle and tasks are displayed inside it.
- **Modified files**:
  - `src/pages/Tasks.tsx`
- **Created files**: None
- **Deleted files**: None
- **Database changes**: None
- **API changes**: None
- **Breaking changes**: None
- **Known issues**: None
- **Technical debt**: None
- **Suggested next feature**: Continue with the next bounded feature from `docs/FEATURE_SPEC_TEMPLATE.md`.

## 2026-07-06

- **Sprint**: Feature Sprint
- **Feature**: Vehicle Work Board UX Improvement v1
- **Goal**: Improve the vehicle work board for daily operations with horizontal carousels, fixed-height horizontal cards, independently scrollable checklists, section counters, carousel navigation, and smooth transition feedback when vehicles change sections.
- **Modified files**:
  - `src/pages/Tasks.tsx`
- **Created files**: None
- **Deleted files**: None
- **Database changes**: None
- **API changes**: None
- **Breaking changes**: None
- **Known issues**: None
- **Technical debt**: None
- **Suggested next feature**: Continue with the next bounded feature from `docs/FEATURE_SPEC_TEMPLATE.md`.

## 2026-07-06

- **Sprint**: Feature Sprint
- **Feature**: Vehicle Work Board UX Polish v1
- **Goal**: Polish the work board interaction by removing arrow controls and adding native horizontal scrolling via wheel, drag, and touch while keeping compact fixed-height cards, independently scrollable checklists, and visible peek of the next card.
- **Modified files**:
  - `src/pages/Tasks.tsx`
- **Created files**: None
- **Deleted files**: None
- **Database changes**: None
- **API changes**: None
- **Breaking changes**: None
- **Known issues**: None
- **Technical debt**: None
- **Suggested next feature**: Continue with the next bounded feature from `docs/FEATURE_SPEC_TEMPLATE.md`.

## 2026-07-06

- **Sprint**: Feature Sprint
- **Feature**: Rule-based Task Suggestions v1
- **Goal**: Assist users during checksheet completion by showing selectable suggested tasks derived from existing task rules, while keeping manual task creation and preserving the current workflow.
- **Modified files**:
  - `src/components/CheckSheetForm.tsx`
- **Created files**: None
- **Deleted files**: None
- **Database changes**: None
- **API changes**: None
- **Breaking changes**: None
- **Known issues**: None
- **Technical debt**: None
- **Suggested next feature**: Continue with the next bounded feature from `docs/FEATURE_SPEC_TEMPLATE.md`.
