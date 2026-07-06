# Architecture Review

## Scope

This review covers the current state of `gara-manager` after the recent UI feature work on the task board, vehicle list, and vehicle detail experiences. It focuses on maintainability risks introduced by repeated presentation logic, store coupling, and page-level component growth. No code changes are included.

## Severity guide

- **High**: likely to cause bugs or slow down multiple future features.
- **Medium**: will create duplicated maintenance work and inconsistent behavior.
- **Low**: worth improving later, but safe for now.

---

## Findings

### 1. Duplicate task-status and vehicle-status presentation logic across pages

**Severity:** High

**Why it matters**
Multiple pages redefine their own status maps, priority maps, and label strings instead of sharing one source of truth. That makes it easy to drift when wording, tone, or supported statuses change.

Evidence:
- `src/pages/Tasks.tsx` defines its own vehicle status labels, task priority labels, and work-board section constants.
- `src/pages/TaskDetail.tsx` defines its own task status columns and priority labels.
- `src/pages/VehicleDetail.tsx` defines its own vehicle status labels and priority labels.
- `src/pages/VehicleList.tsx` defines its own vehicle status labels and tone map.

This is already showing inconsistency: the new vehicle work board shows `Chưa có xe liên quan`, while earlier task-board work used `Không có xe liên quan`. That is exactly the kind of drift duplicated label maps create.

**Suggested refactor**
Add small shared presentation maps in `src/utils/format.ts` or a new `src/constants/ui.ts`, then replace inline maps in pages with imports. Keep page code focused on behavior, not string lookup tables.

---

### 2. Duplicate vehicle card and image fallback UI in multiple pages

**Severity:** Medium

**Why it matters**
The same visual pattern appears in `VehicleList.tsx`, `VehicleDetail.tsx`, and the new work board in `Tasks.tsx`:
- image area with `aspect-[16/10]`
- plate/model block
- car icon fallback when no image exists
- position text
- assignee display
- status badge

Each page currently owns its own copy. Any visual change now requires touching three places and hoping none of them diverge.

**Suggested refactor**
Extract a shared `VehicleCardHeader` component that accepts vehicle, position, assignee, image aspect, and click handler. Then:
- reuse it in vehicle list
- reuse it in vehicle detail where appropriate
- reuse it in task work board

This is a low-risk extraction that does not change business logic.

---

### 3. Duplicate checklist rendering and progress math

**Severity:** Medium

**Why it matters**
`Tasks.tsx` and `TaskDetail.tsx` both render task checklist UIs, compute progress counts, and visualize completion. They are currently different implementations:
- the work board uses checkbox rows inside vehicle cards
- task detail uses inline editable checklist rows with add/edit/delete controls

This means checklist UX, edge-case handling, and future improvements must be duplicated or intentionally split without a clear boundary.

**Suggested refactor**
Create page-local or shared checklist primitives for:
- compact checklist display
- progress bar helper
- done-count text

Keep editing behavior in `TaskDetail.tsx`, but move shared display and counting into reusable helpers/components so the work board and detail page do not quietly diverge.

---

### 4. Recent task board logic may silently misplace vehicles

**Severity:** Medium

**Why it matters**
The new grouping logic in `src/pages/Tasks.tsx` places a vehicle into **Đang làm** when:
- at least one doing task exists
- OR when todo and done both exist

That matches the spec, but the current implementation recomputes section membership from visible/filtered tasks every render and ignores the global task list. If the assignee filter hides all doing tasks for a vehicle, its card can jump from **Đang làm** to **Chưa làm** even though the vehicle still has unfinished real-world work. That undermines the main purpose of a vehicle-centric board.

**Suggested refactor**
Decouple section derivation from UI filters, or at least document that the board reflects the *currently filtered view*, not the *true vehicle state*. If filtered views should be supported, keep a deterministic `sectionForVehicle(vehicleId, allMatchingTasks)` helper in a small hook or util instead of inline `useMemo` logic.

---

### 5. Store complexity and page-to-store coupling are increasing

**Severity:** Medium

**Why it matters**
`src/store/useStore.ts` already imports nearly every service and owns a large flat interface. Pages increasingly reach into the store for many unrelated selectors at once:
- `VehicleDetail.tsx` pulls vehicles, positions, employees, tasks, move logs, check sheets, timelines, and multiple actions.
- `Tasks.tsx` pulls tasks, employees, vehicles, positions, and task mutations.

That makes pages hard to test in isolation, hard to refactor later, and increasingly fragile when store shape changes.

**Suggested refactor**
Introduce thin domain hooks under `src/hooks/`, for example:
- `useVehicleBoard()`
- `useVehicleDetail()`
- `useTaskDetail()`

Each hook can read from `useStore` and return only the data and handlers the page needs. This keeps store access centralized without splitting Zustand slices yet.

---

### 6. Oversized files and mixing of layout, domain, and presentation code

**Severity:** Medium

**Why it matters**
Several recently touched files are now large enough to hide simple regressions:
- `src/store/useStore.ts`: 739 lines
- `src/pages/Tasks.tsx`: 448 lines
- `src/components/ui.tsx`: 426 lines
- `src/pages/VehicleList.tsx`: 265 lines
- `src/pages/TaskDetail.tsx`: 250 lines

`Tasks.tsx` especially mixes page chrome, board layout, card layout, modal form, and local checklist preview in one file. That is convenient now, but each future task-board feature will add more unrelated concerns to the same file.

**Suggested refactor**
Split page-local presentational pieces into their own components when they exceed about 120-150 lines or when they have independent interaction logic. For example:
- `WorkBoardVehicleCard`
- `AssignTaskModal`

These already exist conceptually in `Tasks.tsx`; extracting them into real files would reduce cognitive load and make reviews safer.

---

### 7. Unnecessary imports and dead symbol noise

**Severity:** Low

**Why it matters**
Recent feature files import more symbols than they use:
- `Tasks.tsx` imports `AlertCircle`, `Check`, `GripVertical`, `EmptyState`, `TaskStatus`, `updateTask`, and `VehicleStatus`, but the current implementation does not use all of them.
- `TaskDetail.tsx` imports `Plus` and `X` even though no obvious inline usage remains in the current shape.
- `VehicleDetail.tsx` still references timeline loading even though timeline is described as half-integrated.

Dead imports do not break the app, but they increase review noise and can mask real unused-code problems.

**Suggested refactor**
Remove unused imports during normal feature cleanup. Consider enabling a stricter lint/noUnusedLocals policy if TypeScript config allows it.

---

### 8. Recent feature work added UI-only debt faster than abstraction

**Severity:** Low

**Why it matters**
The last several features each added new page behavior and shared UI patterns, but most reuse was implemented ad hoc:
- `VehicleGallery.tsx` is reusable in spirit, but coupled to car/media assumptions and modal presentation.
- `VehicleFilterBar.tsx` is better, but it is still special-cased for vehicle list filtering rather than generic filter behavior.
- The new work board reused store data, but added a new layout pattern without extracting any reusable board primitives.

This is acceptable for quick feature delivery, but the cumulative cost is higher long-term maintenance because each new feature repeats adjacent scaffolding.

**Suggested refactor**
After the next few UI features, do a small consolidation pass:
- shared vehicle summary card header
- shared horizontal-scroll section primitive
- shared progress text/progress bar component

No urgent rewrite is needed; this is a pacing item.

---

## Recommendation

Do not refactor now as part of this review. The highest-value next steps are:

1. Centralize status/priority label maps.
2. Extract shared vehicle header/card UI.
3. Extract shared checklist/progress helpers.
4. Add lightweight domain hooks to reduce store coupling.
5. Clarify whether filtered task-board section state should reflect the filter or global truth.

These changes keep recent feature value while lowering the cost of the next feature.
