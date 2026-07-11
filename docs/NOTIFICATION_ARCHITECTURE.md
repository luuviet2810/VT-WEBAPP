# Notification Architecture

## Event → Notification Service → Database → Activity Center

## Single Entry Point

Only `src/services/notification.service.ts` may create notifications.

All other modules (store, components, services) call this one service.

No module may insert directly into:

- `notifications` table
- `activity_logs` table  
- Zustand store's `addNotification`

## Event Types

| Event | Format |
|-------|--------|
| INPUT_SAVED | [Model - Plate] Đã lưu phiếu Đầu vào |
| OUTPUT_SAVED | [Model - Plate] Đã lưu phiếu Đầu ra |
| LOCATION_CHANGED | [Model - Plate] Đã chuyển sang {location} |
| TASK_CREATED | [Model - Plate] Cần "{taskName}" |
| TASK_UPDATED | [Model - Plate] Đã cập nhật "{taskName}" |
| TASK_COMPLETED | [Model - Plate] Đã hoàn thành "{taskName}" |
| TASK_ASSIGNED | [Model - Plate] Đã giao "{taskName}" cho {employee} |
| PHOTO_ADDED | [Model - Plate] Đã thêm {count} ảnh |
| DOCUMENT_ADDED | [Model - Plate] Đã thêm giấy tờ |
| VEHICLE_SOLD | [Model - Plate] Đã chuyển sang trạng thái Đã bán |

## Data Flow

```
Event occurs (task created, vehicle moved, etc.)
    ↓
Caller invokes notificationService.createEvent(eventData)
    ↓
notificationService validates:
  - vehicle model not empty
  - plate not empty  
  - task name not empty (if applicable)
    ↓
notificationService inserts into:
  1. notifications table (for Activity Center display)
    ↓
Activity Center reads notifications table
  → Formats via notificationFormatter.ts
  → Displays in timeline
```

## Validation Rules

Before creating any notification, the service MUST check:

- vehicleModel must be non-empty
- plateNumber must be non-empty  
- taskName must be non-empty for TASK_* events
- employeeName may be empty (defaults to "Hệ thống")

If validation fails, the notification is silently dropped with a console.warn.

## Database

The `notifications` table stores:

- id: UUID
- type: NotificationType
- title: string (kept for backward compatibility, not used by formatter)
- body: string (kept for backward compatibility, not used by formatter)
- data: JSONB (structured payload: vehicleModel, plateNumber, taskName, etc.)
- read: boolean
- created_at: timestamptz

The `activity_logs` table is NOT used by the notification system. It remains for system audit only.

## Activity Center

The Activity Center UI (NotificationCenter.tsx) ONLY reads from:
- `useStore(s => s.notifications)`

It NEVER creates notifications.
It ONLY displays them using `notificationFormatter.ts`.
