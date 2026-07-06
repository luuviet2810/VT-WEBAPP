# CHANGELOG_AI.md

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
