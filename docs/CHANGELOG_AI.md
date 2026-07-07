# CHANGELOG_AI.md

## 2026-07-07 - FEATURE #018: Global Search Command Center

### Overview
Implemented a fast, global search system as the primary navigation tool. Search across vehicles, tasks, employees, and positions using in-memory Zustand state (no duplicate Supabase queries). Includes Ctrl+K / Cmd+K shortcut, debounced real-time results, keyboard navigation, recent search history, and quick filters.

### New Files
None — implemented entirely within existing `src/components/GlobalSearch.tsx`.

### Modified Files
- `src/components/GlobalSearch.tsx` — Full rewrite with: grouped result display, quick filters (all/vehicle/task/employee/position), debounced 200ms search, keyboard navigation (Arrow Up/Down, Enter, Escape), recent search history with localStorage persistence, vehicle thumbnail images, status badges, and mobile-friendly layout.

### Search Coverage
- **Vehicles**: plate, model, brand, color, status, VIN, year — navigates to VehicleDetail
- **Tasks**: title, description, status, priority — navigates to TaskDetail
- **Employees**: name, phone, role — navigates to Employees page
- **Positions**: position name/code — navigates to Positions page

### Performance
- All searches operate on Zustand state already loaded at app init — zero extra Supabase queries
- `useMemo` on result computation to avoid recalculation on re-renders
- Debounce: 200ms maximum response delay

### Acceptance Criteria
- ✅ Ctrl+K / Cmd+K opens search
- ✅ Search bar works with debounce
- ✅ Vehicle search with plate, model, color
- ✅ Task search with title, status
- ✅ Employee search with name, phone
- ✅ Position search by name
- ✅ Keyboard navigation (Arrow Up/Down/Enter/Escape)
- ✅ Recent searches with clear history
- ✅ Mobile full-screen sheet via Modal
- ✅ No duplicate Supabase requests
- ✅ `npm run build` passes

---

## 2026-07-07 - HOTFIX: Supabase Auth Crash After Login

### Overview
Fixed a post-login crash in `src/components/Sidebar.tsx` caused by calling `.trim()` on `currentUser.fullName` while profile data was still loading or temporarily missing. The auth service/store already hydrated profiles from Supabase, but the sidebar was not resilient to transient `undefined` name values. Updated profile mapping to use safer defaults as well.

### Fixed Files
- `src/components/Sidebar.tsx` — Made `getInitials()` and profile display resilient to missing `fullName` by guarding `.trim()` and `.slice()` calls with `(name || '')`.
- `src/services/auth.service.ts` — Strengthened `mapProfileRow()` to provide safe defaults for required UI fields, especially `name` and `email`, so returned profiles are complete even if DB values are missing/null.
- `src/store/useAuthStore.ts` — Verified sign-in/sign-up/session-restore paths set `currentUser` only from a complete profile; confirmed refresh and auth-state-change handlers clear state on missing profiles.

### Verification
- Confirmed login flow: `supabase.auth.signInWithPassword()` -> `loadProfile()` -> mapped `AuthProfile` -> auth store `currentUser`.
- Confirmed `loadOrCreateProfile()` creates a complete profile or returns `null`; `mapProfileRow()` now ensures required fields exist with safe defaults.
- Confirmed `currentUser` is fully populated before protected layout renders after login.
- Updated `docs/CHANGELOG_AI.md`.

---

## 2026-07-07 - FEATURE #023: SUPABASE AUTHENTICATION MIGRATION

### Overview
Migrated authentication from the custom client-side auth system to Supabase Auth as the only authentication path. Removed local password hashing, local user arrays, and custom session persistence. All login, registration, logout, and session restoration now go through Supabase Auth and `public.users` profiles.

### New Files
- `src/services/auth.service.ts` — Auth service wrapper around Supabase Auth: sign-up, sign-in, sign-out, session restore, auth state listener, profile mapping.

### Modified Files
- `src/types.ts` — Removed `passwordHash` from `User`; auth now uses `auth_id` and Supabase Auth session instead of local password state.
- `src/types/database.ts` — Kept `auth_id` as the canonical link to `auth.users`; retained legacy auth-shape comments for migration clarity.
- `src/lib/supabase.ts` — Kept as the single Supabase client import; auth service uses it for both Auth and `public.users` access.
- `src/store/useAuthStore.ts` — Replaced custom auth actions with Supabase Auth-backed actions; removed `hashPassword`, `verifyPassword`, local users/passkeys arrays, and `loginWithPasskey`; kept UI-facing auth state and persisted profile cache.
- `src/pages/Login.tsx` — Switched to `signIn` flow using Supabase Auth; removed simulated delay and custom login validation.
- `src/pages/Register.tsx` — Switched to `signUp` flow using Supabase Auth; first-admin behavior preserved through profile role update after sign-up.
- `src/pages/Employees.tsx` — Updated to async auth actions and profile-backed user state; passkey UI preserved but wired to simplified store methods.
- `src/components/RouteGuard.tsx` — Kept route protection behavior; now relies on Supabase-backed `isAuthenticated` and profile role from auth store.

### Removed Auth Patterns
- Client-side `hashPassword()` and `verifyPassword()`
- Local `users` and `passkeys` arrays as source of truth
- Custom login validation against stored password hashes
- Local session persistence as the primary auth mechanism

### Migration
- `migrations/004_supabase_auth.sql` added for Supabase Auth migration path.
- Existing `public.users` employee data preserved; `auth_id` used as canonical identity for auth mapping.

### Acceptance Criteria
- ✅ Registration creates `auth.users` record and `public.users` profile via auth service
- ✅ Login uses `signInWithPassword` and loads profile from `public.users`
- ✅ Logout uses `signOut`
- ✅ Session restore uses `getSession` + `onAuthStateChange`
- ✅ Current user profile loaded using `auth.uid` mapping
- ✅ Route guards use Supabase-backed auth state
- ✅ Admin mode and role behavior preserved
- ✅ Telegram mapping continues via `public.users.auth_id`
- ✅ Build passes

---

## 2026-07-07 - FEATURE #017.5: TELEGRAM INFRASTRUCTURE HARDENING

### Overview
Refactored Telegram integration into a production-safe architecture. Bot token is no longer stored in the browser. Frontend communicates with a dedicated backend server, `gara-bot-server`, for all Telegram operations. Employee linking is handled automatically via `/start` in Telegram.

### New Files

#### Backend: `gara-bot-server/`
- `gara-bot-server/package.json` — Node/Express backend with dependencies: `telegraf`, `@supabase/supabase-js`, `express`, `cors`
- `gara-bot-server/tsconfig.json` — TypeScript config for backend
- `gara-bot-server/.env.example` — Example env with `TELEGRAM_BOT_TOKEN`, `TELEGRAM_WEBHOOK_SECRET`, `SUPABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY`, `FRONTEND_URL`
- `gara-bot-server/src/index.ts` — Express app bootstrap with health check and Telegram routes
- `gara-bot-server/src/supabase.ts` — Admin Supabase client using service role for backend-only DB access
- `gara-bot-server/src/telegram/types.ts` — Backend Telegram/bot types
- `gara-bot-server/src/telegram/link.service.ts` — Employee Telegram linking logic with `telegram_users` table
- `gara-bot-server/src/telegram/bot.ts` — Telegram bot setup with `/start` auto-link flow and admin callback handlers
- `gara-bot-server/src/telegram/webhook.ts` — Webhook setup/forwarding helpers
- `gara-bot-server/src/telegram/server.ts` — Server-side bot lifecycle and webhook handler creation
- `gara-bot-server/src/api/telegram.service.ts` — Backend business logic: status, linked users, test message
- `gara-bot-server/src/api/telegram.routes.ts` — Express routes: `/api/telegram/status`, `/linked`, `/test`, `/notify`, `/answer`

#### Database
- `gara-bot-server/migrations/20250101000000_telegram_users.sql` — Minimal `telegram_users` table for employee ↔ Telegram account linking with unique constraints and service-role policy

### Frontend Changes

#### `src/services/telegramConfig.service.ts`
- Removed `botToken` from config model and all token getter/setter methods
- Frontend now stores only `webhookUrl`, `chatMapping`, `notificationRules`, `retryPolicy`, and `enabled`
- Token-related comments removed

#### `src/services/telegram.service.ts`
- Replaced direct Telegram API client with backend API client
- Methods now call backend endpoints: `/api/telegram/notify`, `/api/telegram/answer`, `/api/telegram/test`
- Added `getStatus()` and `getLinkedEmployees()` to query backend state
- Removed local `localStorage` log storage; logs are backend-managed
- `processUpdate()` and `processCallbackQuery()` now return no-op placeholders because webhook processing is backend-only
- Retry removed from frontend; backend owns delivery retry policy

#### `src/pages/TelegramSettings.tsx`
- Removed Bot Token field entirely
- Config tab removed; UI now shows connection status card with backend health, webhook URL, and linked employee count
- Mappings tab guidance updated to emphasize `/start` auto-link instead of manual Chat ID entry
- Manual Chat ID input still supported as admin override
- Test message now calls backend `/api/telegram/test`

#### `src/services/telegramWebhookHandler.service.ts`
- Marked as legacy; no longer part of active webhook flow
- Webhook handling moved to `gara-bot-server`

### Backend Architecture
```
React Web App
  ↓
gara-bot-server (Node.js/Express)
  ↓
Telegram Bot API
  ↓
Telegram
  ↓
Webhook
  ↓
gara-bot-server
  ↓
Supabase
  ↓
Realtime
  ↓
React
```

### Security
- Bot token exists only in `gara-bot-server/.env`
- Frontend never reads, stores, or transmits bot token
- Webhook secret validation via `TELEGRAM_WEBHOOK_SECRET`
- Unknown Telegram users are rejected in bot `/start` flow
- Backend uses Supabase service role; no client secrets exposed to browser

### Employee Auto-Link
- Employee opens Telegram bot and sends `/start`
- Bot captures `telegram_user_id`, `chat_id`, `username`, `first_name`, `last_name`, `language_code`
- Backend writes to `telegram_users`
- Subsequent webhook callbacks resolve employee via `telegram_users`

### Configuration
- Frontend settings page now displays: connection status, webhook URL, linked employees, test message
- No bot token display or storage in frontend
- Backend owns bot token, retry policy, and delivery logging

### Error Handling
- Telegram failures remain fire-and-forget from the web app perspective
- Backend logs `sent`, `failed`, `retried`, `webhook` events
- Business workflow continues if Telegram backend is unreachable

### Acceptance Criteria
- ✅ Bot token moved to backend `.env`
- ✅ Webhook handled only by backend
- ✅ Frontend uses backend API only
- ✅ Employee auto-link via `/start`
- ✅ No secret stored in browser
- ✅ Existing Telegram features continue working via backend bridge
- ✅ Frontend build remains valid

---

## 2026-07-07 - FEATURE #017: TELEGRAM AUTOMATION ENGINE v1

### Overview
Integrated the Garage Management System with Telegram Bot for staff notification and interaction. Telegram becomes the primary notification channel while the web app remains the single source of truth.

### Architecture
```
Web App → Rule Engine → Telegram Service → Telegram Bot → Staff
                                                      ↓
                                                   Webhook
                                                      ↓
                                                   Backend
                                                      ↓
                                                   Supabase
                                                      ↓
                                                  Realtime
                                                      ↓
                                                 Web App
```

### New Files

#### Types (`src/types/telegram.ts`)
- Central type definitions for the Telegram Automation Engine
- Types: `TelegramConfig`, `TelegramChatMapping`, `TelegramNotificationRule`, `TelegramRetryPolicy`
- Event types: `task_created`, `task_assigned`, `task_overdue`, `vehicle_ready`, `vehicle_sold`, `workflow_changed`, `approval_required`, `daily_summary`
- Command types: `start_task`, `complete_task`, `view_task`, `approve`, `reject`, `help`
- Logging types: `TelegramLogEntry` with levels: sent, delivered, failed, retried, received, callback

#### Services

##### `src/services/telegramConfig.service.ts`
- `TelegramConfigService` class managing all Telegram configuration in localStorage
- Bot token, webhook URL, chat mappings, notification rules, retry policy
- Methods: `getConfig()`, `setEnabled()`, `setBotToken()`, `setWebhookUrl()`, `getChatIdByEmployee()`, `isEventEnabled()`, `updateNotificationRule()`, etc.
- Default retry policy: 3 retries, 1000ms delay, exponential backoff

##### `src/services/telegramFormatter.service.ts`
- `TelegramNotificationFormatter` — formats business events into Telegram-ready messages
- Uses Telegram MarkdownV2 for rich formatting
- Formatters: `formatTaskCreated`, `formatTaskAssigned`, `formatTaskOverdue`, `formatVehicleReady`, `formatVehicleSold`, `formatWorkflowChanged`, `formatApprovalRequired`, `formatDailySummary`
- Includes Vietnamese labels and emoji for priority/status indicators
- Builds inline keyboard buttons for actions (Start, Complete, View, Approve, Reject)

##### `src/services/telegram.service.ts`
- `TelegramService` singleton — core Telegram Bot API integration
- Methods: `sendMessage()`, `sendToEmployee()`, `broadcastToAll()`, `editMessageText()`, `answerCallbackQuery()`
- Retry logic with exponential backoff using configured policy
- Command parsing from callback data and text messages
- Local storage-based logging with 500-entry limit
- Process update handling for webhook delivery

##### `src/services/telegramDispatcher.service.ts`
- Bridges Zustand store events → Telegram notifications
- NEVER writes directly to Supabase; uses existing store actions
- Dispatchers: `dispatchTaskCreated()`, `dispatchTaskAssigned()`, `dispatchTaskOverdue()`, `dispatchVehicleReady()`, `dispatchVehicleSold()`, `dispatchWorkflowChanged()`, `dispatchApprovalRequired()`
- Priority threshold filtering for overdue notifications
- `checkAndNotifyOverdueTasks()` for batch overdue checks

##### `src/services/telegramWebhookHandler.service.ts`
- Processes inbound Telegram updates (callback queries + text commands)
- Security: validates sender against chat mapping; rejects unknown users
- Command handlers: `handleStartTask()`, `handleCompleteTask()`, `handleViewTask()`, `handleApprove()`, `handleReject()`, `handleHelp()`
- Dispatches custom `window` events for store integration
- `setupTelegramEventBridge()` for reactive event handling
- `onTelegramCommand()` for command subscription

#### UI

##### `src/pages/TelegramSettings.tsx`
- Admin configuration page for Telegram integration
- Tabs: Cấu hình (Config), Liên kết (Mappings), Thông báo (Rules), Nhật ký (Logs)
- Config: bot token (masked), webhook URL, retry policy settings
- Mappings: link employees to Telegram chat IDs with enable/disable
- Rules: toggle notifications per event type with role targeting
- Logs: view sent/delivered/failed/retried/callback entries
- Test message button for connectivity verification
- Real-time reload of config and logs

### Store Integration (`src/store/useStore.ts`)
- Added Telegram dispatcher calls to:
  - `addTask`: dispatches `dispatchTaskCreated()` after task creation
  - `updateVehicle`: dispatches `dispatchVehicleSold()` and `dispatchVehicleReady()` on status changes
  - `updateTask`: dispatches `dispatchWorkflowChanged()` after workflow status change
- All dispatches are fire-and-forget; never block business workflow
- Errors logged but do not interrupt user experience

### Routes & Navigation
- Added `/telegram` route (admin only) in `App.tsx`
- Added "Telegram" menu item in sidebar (admin role, using Truck icon)
- Route protected by `RoleGuard` for admin only

### Key Design Decisions
- **Browser SPA + Telegram**: Since this is a browser SPA, direct Telegram Bot API calls go through a configurable webhook proxy URL
- **Configurable proxy**: The `webhookUrl` points to a proxy (e.g., Cloudflare Worker, Vercel Edge Function) that handles Telegram API calls and CORS
- **Bot token stored client-side**: Token is stored in localStorage for reference; the proxy uses it for API calls
- **Never blocks business flow**: All Telegram operations are async and fail silently to the user
- **No database changes**: All configuration stored in localStorage
- **Reuses existing services**: Business logic stays in Rule Engine / store; Telegram layer only handles delivery and inbound parsing

### Security
- All inbound commands validated against chat mapping
- Unknown Telegram users are rejected
- Sender ID validated before executing any action

### Acceptance Criteria Met
- ✅ Task notifications sent via Telegram on task creation
- ✅ Start task action dispatched via Telegram callback
- ✅ Complete task action dispatched via Telegram callback
- ✅ Approval request support (approve/reject buttons)
- ✅ Workflow notifications (workflow_changed events)
- ✅ Retry policy with exponential backoff
- ✅ Logging of sent, failed, retried, received, callback events
- ✅ Existing workflow unchanged (fire-and-forget, never blocks)
- ✅ Build passes (zero TypeScript errors)

---

## 2026-07-07 - FEATURE #016: DASHBOARD ANALYTICS

### GarageDashboard Enhancements

#### Top KPI Cards
- Added new KPI section showing key metrics:
  - Total vehicles
  - Vehicles processing (not sold)
  - Vehicles ready for sale (available)
  - Vehicles sold
  - Tasks pending
  - Tasks completed today (from activity logs)

#### Workflow Overview
- Added workflow overview section showing vehicle count by status:
  - Waiting (new)
  - Input (received)
  - Working (repair)
  - Final check
  - Ready
  - Sold
- Displayed as colored progress cards

#### Position Overview
- Added position overview section:
  - Shows up to 6 positions
  - Displays vehicle count per position
  - Visual occupancy indicator
  - Link to position management

#### Task Overview
- Added task overview section:
  - Todo count
  - Doing count
  - Done count
  - Completion percentage with progress bar
  - Link to task management

#### Employee Overview
- Added employee overview section:
  - Working today (checked in, not checked out)
  - Absent (not checked in)
  - Total checked in
  - Total active employees
- Uses attendance data from Zustand store

#### Quick Actions
- Added quick action buttons in header:
  - Add vehicle (navigates to /xe?add=true)
  - Create task (navigates to /nhiem-vu?add=true)
  - Positions (navigates to /vi-tri)
  - Attendance (navigates to /cham-cong)

### New Dashboard Components
- `KPICard`: KPI display card with icon, value, and colored background
- `WorkflowCard`: Workflow status card with count and progress bar
- `TaskStatusCard`: Task status card with border accent
- `EmployeeStatCard`: Employee stat card with icon

### Build Verification
- `npm run build` passes with zero TypeScript errors
- No database schema changes
- No business logic changes
- Reuses Zustand state (vehicles, tasks, employees, positions, attendance, taskActivityLogs)

---

## 2026-07-07 - FEATURE #015: PRODUCTION UX POLISH

### UX Component Enhancements

#### New UI Components (`src/components/ui.tsx`)
- **ConfirmDialog**: Reusable confirmation dialog component with variants (danger, warning, default)
  - Mobile-friendly bottom sheet design
  - Loading state with spinner
  - Accessible focus management
- **Skeleton Loading Components**:
  - `Skeleton`: Base skeleton component with variants (text, circular, rectangular)
  - `SkeletonCard`: Ready-to-use card skeleton for vehicle lists
  - `SkeletonTable`: Table skeleton with configurable rows
  - `SkeletonList`: List skeleton for employee/task lists
- **Spinner Component**: Animated loading spinner with size variants (sm, md, lg)
- **LoadingOverlay**: Full loading state with message

#### EmptyState Enhancement
- Added optional `action` prop for CTA buttons
- Improved padding and max-width for better readability
- Separated icon from text with consistent spacing

### Search UX Improvements

#### GlobalSearch Enhancements (`src/components/GlobalSearch.tsx`)
- Added 200ms debounce to prevent excessive filtering
- Separated `query` (raw input) from `debouncedQuery` (filtered)
- Improved "no results" message to show the search term
- Added `useCallback` for navigation function to prevent unnecessary re-renders
- Clears debounced query when modal closes

### Confirmation Dialogs (Replaced browser confirm/alert)

#### Employees Page (`src/pages/Employees.tsx`)
- Replaced `confirm()` with `ConfirmDialog` for self-disable warning
- Replaced `confirm()` with `ConfirmDialog` for self-admin removal
- Replaced inline delete modal with reusable `ConfirmDialog`

#### VehicleDetail Page (`src/pages/VehicleDetail.tsx`)
- Replaced `confirm()` with `ConfirmDialog` for vehicle deletion

#### PriceList Page (`src/pages/PriceList.tsx`)
- Replaced `confirm()` with `ConfirmDialog` for vehicle deletion

#### TaskDetail Page (`src/pages/TaskDetail.tsx`)
- Replaced `confirm()` with `ConfirmDialog` for task deletion

#### Positions Page (`src/pages/Positions.tsx`)
- Replaced `confirm()` with `ConfirmDialog` for position deletion
- Replaced `alert()` with `ConfirmDialog` for position with vehicles blocking

### Loading States for Forms

#### VehicleFormModal (`src/pages/VehicleFormModal.tsx`)
- Added `isSaving` state to prevent double-submit
- Disabled submit button while saving
- Shows "Đang lưu..." text during save operation

#### CheckSheetForm (`src/components/CheckSheetForm.tsx`)
- Added `isSaving` state to prevent double-submit
- Disabled save/cancel buttons while saving
- Shows "Đang lưu..." text during save operation

### Build Verification
- `npm run build` passes with zero TypeScript errors
- No business logic changes
- No folder restructuring
- All existing features continue working

---

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
