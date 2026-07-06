# CODING_RULES.md

## 1. Naming conventions

- **Components**: PascalCase file and component names. Example: `VehicleList.tsx`, `CheckSheetForm.tsx`
- **Hooks**: camelCase with `use` prefix. Example: `useAuthRole.ts`, `useIsAdminMode`
- **Stores**: camelCase with `use` prefix. Example: `useStore.ts`, `useAuthStore.ts`
- **Services**: camelCase file names. Example: `vehicle.service.ts`, `moveLog.service.ts`
- **Utilities**: camelCase file names. Example: `format.ts`, `taskRules.ts`
- **Types**: PascalCase interfaces/types. Example: `Vehicle`, `MoveLog`, `TimelineItem`
- **Functions/variables**: camelCase
- **Constants**: PascalCase or UPPER_SNAKE_CASE only when truly constant/config-like
- **Route params**: use meaningful names from existing routes. Example: `id`, avoid generic `xid`

### Forbidden patterns
- Do not rename existing exported symbols without explicit request
- Do not introduce new naming schemes mid-file; match existing local style

---

## 2. Folder conventions

- `src/pages/`: route-level screens; one file per page unless extracting shared subcomponents
- `src/components/`: shared UI or domain components reused across pages
- `src/hooks/`: reusable hooks; keep small and focused
- `src/services/`: Supabase data access; one service per entity/domain
- `src/store/`: Zustand stores only
- `src/types/`: shared TypeScript types
- `src/utils/`: pure helper functions
- `src/rbac/`: roles, permissions, route metadata, sidebar config
- `src/lib/`: low-level integrations like Supabase client init
- `docs/`: project documentation

### Forbidden patterns
- Do not create new top-level folders without strong justification
- Do not move files between folders unless explicitly requested
- Do not nest feature folders unless doing a planned refactor

---

## 3. Component conventions

- Use function components and hooks only
- Keep components focused; avoid large monolithic JSX blocks when possible, but do not refactor existing large components unless requested
- Use existing shared primitives from `components/ui.tsx`: `Modal`, `Badge`, `EmptyState`, `Tabs`, etc.
- Use Tailwind utility classes; avoid inline styles unless absolutely necessary
- Use `clsx` for conditional classes
- Use `lucide-react` for icons
- Use Vietnamese for visible UI text; English for code identifiers

### Props
- Prefer explicit props over large config objects unless existing pattern uses config objects
- Keep prop types local to the component when not reused

### Event handlers
- Name handlers clearly: `handleX`, `onX`
- Avoid anonymous handlers in JSX when logic is more than trivial

---

## 4. Zustand conventions

- Use `create<StoreState>()((set, get) => ({ ... }))` pattern
- State should be normalized arrays/records, not nested copies
- Actions should be async when they call services
- Use optimistic updates for mutations, with rollback on failure
- Do not persist business data unless explicitly requested
- `useAuthStore` and `viewModeStore` already use `persist`; keep that behavior unchanged unless requested

### Forbidden patterns
- Do not split the main store into slices unless explicitly requested
- Do not add Redux, Context providers, or other state libraries
- Do not replace Zustand with local component state for shared data

---

## 5. Service conventions

- Services are thin Supabase wrappers
- One service per entity/module
- Export named async functions: `getX`, `createX`, `updateX`, `deleteX`
- Map DB rows to app types inside the service
- Throw errors on failure; do not swallow them silently
- Keep side effects limited to Supabase calls

### Forbidden patterns
- Do not add business logic to services; keep it in store or future domain layer
- Do not call services directly from components unless explicitly allowed
- Do not add caching, retry, or middleware to services unless requested

---

## 6. Routing conventions

- Routes are defined in `src/App.tsx`
- Use `ProtectedRoute` for authenticated routes
- Use `RoleGuard` for role-restricted routes
- Keep route definitions declarative and grouped by feature
- Do not add nested route trees unless requested
- Do not lazy-load routes unless requested

### RBAC
- `allowedRoles` is enforced in `App.tsx`
- `requiredPermissions` exists in `rbac/routesConfig.ts` but is **not enforced in App.tsx yet**
- Do not add new permission enforcement rules unless requested

---

## 7. Error handling

- Log errors to console with consistent prefix: `🔴 [MODULE] message`
- Show user-facing errors via existing UI patterns when possible
- Rollback optimistic updates on failure
- Do not add global error boundaries unless requested
- Do not add toast/notification error systems unless requested

### Forbidden patterns
- Do not silently ignore rejected promises
- Do not add alert/prompt/confirm replacements unless requested

---

## 8. UI consistency rules

- Use existing Tailwind patterns: `card`, `input`, `btn-primary`, `btn-secondary`, `btn-icon`, `btn-danger`
- Maintain spacing and typography scale already in use
- Use existing badge tones: `slate`, `blue`, `purple`, `green`, `orange`, `red`, `amber`
- Keep Vietnamese UI text natural and concise
- Do not redesign existing pages unless explicitly requested

---

## 9. Refactoring rules

- Do not refactor unless explicitly requested
- Do not extract components, reorganize folders, or rename files as side effects
- Do not remove unused code unless it is clearly dead and requested
- If a task requires cleanup, call it out and ask before doing it

---

## 10. Forbidden modifications

Unless explicitly requested, do not modify:
- Auth business logic in `store/useAuthStore.ts`
- Checksheet business logic in `services/checksheet.service.ts` and `components/CheckSheetForm.tsx`
- Task business logic in `services/task.service.ts`, `pages/Tasks.tsx`, `pages/TaskDetail.tsx`
- Vehicle CRUD unless the feature request explicitly covers it
- Existing UI layout and tab structure outside the requested change

### Special restriction for timeline/tabs
- Adding the **Lịch sử** tab is allowed only in allowed files
- Do not add realtime, refresh hooks, or timeline service integration unless explicitly requested

---

## 11. Definition of Done

A feature or fix is complete when:
1. The requested behavior is implemented in the specified files
2. No unintended UI changes are introduced
3. No unrelated files are modified
4. The change compiles and is consistent with existing conventions
5. A concise report of changed files is provided
6. No hidden refactors, renamed symbols, or moved files are included
