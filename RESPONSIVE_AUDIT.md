# RESPONSIVE AUDIT REPORT — Auto-Generated from Code Analysis

**Date:** 2026-07-14
**Viewports:** 390, 402, 412, 430, 440 px
**Screenshots:** 50 captured across 9 pages
**Analysis method:** Code-level + screenshot review

---

## ISSUE SUMMARY

| Severity | Count |
|----------|-------|
| Critical | 3 |
| High | 5 |
| Medium | 6 |
| Low | 4 |

---

## CRITICAL ISSUES

### C1 — Vehicle List Filter Popover overflows on mobile

| Field | Value |
|-------|-------|
| **Page** | VehicleList |
| **Screenshot** | `390x900/VehicleList/390-filter.png` |
| **Component** | VehicleFilterBar > filter popover |
| **Viewport** | 390–430 |
| **Cause** | Popover is fixed `w-[320px]` (Tailwind: `w-[320px]`). At 390px viewport with `right-0` positioning, the popover extends beyond the left edge. The filter popover uses `absolute right-0` which pushes content left off-screen. |
| **Fix** | Change popover to use `left-0 sm:right-0` positioning, or use `min-w-[320px]` with `max-w-[calc(100vw-32px)]` so it shrinks to fit mobile viewport. |

```css
/* Before */
<div className="absolute right-0 z-40 mt-2 w-[320px] ...

/* After */  
<div className="fixed right-4 left-4 z-40 mt-2 sm:absolute sm:right-0 sm:left-auto sm:w-[320px] ...
```

---

### C2 — Kanban columns break on mobile

| Field | Value |
|-------|-------|
| **Page** | Tasks |
| **Screenshot** | `390x900/Tasks/390-main.png` |
| **Component** | Kanban board columns |
| **Viewport** | 390–440 |
| **Cause** | Each column is `w-80 shrink-0` (320px fixed). Three columns = 960px minimum width. At 390–440px viewport, all three columns overflow horizontally. The `overflow-x-auto` on the container allows scrolling but the header and filter bar don't scroll with it, creating a disjointed UX. |
| **Fix** | On mobile, either stack columns vertically or use a horizontal scroll container with snapped column widths: |

```css
/* Mobile: full-width stacked */
@media (max-width: 640px) {
  .kanban-container {
    flex-direction: column;
    overflow-x: visible;
  }
  .kanban-column {
    width: 100%;
    min-height: auto;
  }
}
```

---

### C3 — PriceList table has no horizontal scroll on mobile

| Field | Value |
|-------|-------|
| **Page** | PriceList |
| **Screenshot** | `390x900/PriceList/390-main.png` |
| **Component** | Vehicle data table |
| **Viewport** | 390–430 |
| **Cause** | The table uses `min-w-[600px]` but the outer container lacks `overflow-x-auto`. At 390px, the table extends well beyond the viewport with no way to scroll. |
| **Fix** | Add overflow-x-auto to the table wrapper: |

```html
<div className="overflow-x-auto">
  <table className="w-full min-w-[600px]">
```

---

## HIGH ISSUES

### H1 — Vehicle card grid becomes too dense

| Field | Value |
|-------|-------|
| **Page** | VehicleList |
| **Screenshot** | `390x900/VehicleList/390-main.png` |
| **Component** | Vehicle card grid |
| **Viewport** | 390–430 |
| **Cause** | Grid uses `grid-cols-2 gap-5` at all sizes. On 390px, two columns of cards are cramped. Card images (`aspect-[4/3]`) and text get compressed. |
| **Severity** | High |
| **Fix** | Change to `grid-cols-1 sm:grid-cols-2` on mobile so cards stack vertically: |

```jsx
<div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-4 2xl:grid-cols-5">
```

---

### H2 — Attendance table overflows

| Field | Value |
|-------|-------|
| **Page** | Attendance |
| **Screenshot** | `390x900/Attendance/390-main.png` |
| **Component** | Attendance data table |
| **Viewport** | 390–440 |
| **Cause** | Table uses `min-w-[600px]` with no horizontal scroll wrapper. Time inputs and action buttons are clipped. |
| **Severity** | High |
| **Fix** | Add overflow-x-auto to the table container. On mobile, consider hiding less important columns (e.g., "Ghi chú") via `hidden sm:table-cell`. |

---

### H3 — Dashboard KPI cards stacked tightly

| Field | Value |
|-------|-------|
| **Page** | Dashboard |
| **Screenshot** | `390x900/Dashboard/390-main.png` |
| **Component** | KPI cards grid |
| **Viewport** | 390–430 |
| **Cause** | KPI cards use `grid-cols-4 gap-5`. At 390px, four cards in a row become too narrow for the text labels ("Xe chưa kiểm tra đầu vào" wraps to multiple lines). |
| **Severity** | High |
| **Fix** | Change to responsive columns: `grid-cols-2 sm:grid-cols-4` |

---

### H4 — Vehicle Detail tabs overflow

| Field | Value |
|-------|-------|
| **Page** | VehicleDetail |
| **Screenshot** | `390x900/VehicleDetail/390-main.png` |
| **Component** | Tab navigation |
| **Viewport** | 390–440 |
| **Cause** | Five tabs with long labels ("Giấy tờ & Ảnh") overflow on mobile. No horizontal scroll on the tab bar. |
| **Severity** | High |
| **Fix** | Add overflow-x-auto to tab container + `shrink-0` on tab items, or shorten tab labels on mobile. |

---

### H5 — Employees page table overflow

| Field | Value |
|-------|-------|
| **Page** | Employees |
| **Screenshot** | `390x900/Employees/390-main.png` |
| **Component** | Employee data table |
| **Viewport** | 390–440 |
| **Cause** | Similar to Attendance — table with many columns overflows mobile viewport without scroll. |
| **Severity** | High |
| **Fix** | Add `overflow-x-auto` wrapper. Consider responsive column hiding. |

---

## MEDIUM ISSUES

### M1 — Attendance card (check-in) has cramped spacing

| Page | Viewport | Issue | Fix |
|------|----------|-------|-----|
| Attendance | 390–440 | Check-in card uses `flex-col sm:flex-row`. At 390px, the button is full-width below the text, but spacing is too tight (`gap-3` → use `gap-4`). | Increase `gap-4` and add `py-4` padding |

### M2 — Dashboard workflow board truncation

| Page | Viewport | Issue | Fix |
|------|----------|-------|-----|
| Dashboard | 390–430 | Workflow columns use `min-w-[200px]`. With 5 columns = 1000px minimum. Text truncation on task cards may occur. | Consider hiding task description on mobile. Use `line-clamp-1` on card text. |

### M3 — Filter popover too narrow at 390px

| Page | Viewport | Issue | Fix |
|------|----------|-------|-----|
| VehicleList | 390 | `w-[360px]` filter popover at `right-0` overflows left edge. | Use `fixed right-[8px] left-[8px]` positioning on mobile instead. |

### M4 — Positions drawer doesn't scroll on narrow screens

| Page | Viewport | Issue | Fix |
|------|----------|-------|-----|
| Positions | 390–440 | History drawer (`sm:w-[460px]`) is full-width on mobile (`w-full`) but may still overflow if content is wide. | Ensure `min-h-0 overflow-y-auto` on the drawer body, not the outer wrapper. |

### M5 — Save buttons may be hidden below fold

| Page | Viewport | Issue | Fix |
|------|----------|-------|-----|
| CheckSheetForm (all) | 390 | On long forms, the Save/Cancel button bar is at the bottom. If `max-height: calc(100dvh - 160px)` is too restrictive, buttons may be hidden. | Ensure the button bar is `sticky bottom-0 bg-white` so it stays visible. |

### M6 — Statistics dashboard grid alignment

| Page | Viewport | Issue | Fix |
|------|----------|-------|-----|
| Statistics | 390–430 | Charts and stat cards may not align properly in a 1-column layout. | Use `grid-cols-1` on mobile, `md:grid-cols-2` on tablet, `lg:grid-cols-4` on desktop. |

---

## LOW ISSUES

### L1 — Employee filter dropdown clipped

| Page | Viewport | Issue | Fix |
|------|----------|-------|-----|
| Attendance | 390 | "Tất cả nhân viên" dropdown `w-52` (208px) may be wider than the viewport margins. | Use `w-full sm:w-52` on mobile. |

### L2 — Spacing in sidebar navigation

| Page | Viewport | Issue | Fix |
|------|----------|-------|-----|
| All | 390 | Sidebar menu items use `py-3.5 min-h-[48px]`. At 390px, 8+ items may not fit the viewport. | Ensure sidebar body has `overflow-y-auto` and the logo section is compact on mobile. |

### L3 — Modal close button overlap on very narrow screens

| Page | Viewport | Issue | Fix |
|------|----------|-------|-----|
| All modals | 390 | Modal title text may overlap with the X close button when title is long. | Use `pr-8` on the title element to reserve space for the close button. |

### L4 — Touch target size on task cards

| Page | Viewport | Issue | Fix |
|------|----------|-------|-----|
| Tasks | 390 | Task card drag handles and edit buttons are small (14–15px icons, ~24px buttons). Below 44px minimum touch target. | Increase button hit area with `p-2` (8px padding) around icons, or use `min-h-[44px] min-w-[44px]` on interactive elements. |

---

## Screenshots by Viewport

| Viewport | Screenshots | Dir |
|----------|-------------|-----|
| 390×900 | 10 | `screenshots/390x900/` |
| 402×900 | 10 | `screenshots/402x900/` |
| 412×900 | 10 | `screenshots/412x900/` |
| 430×900 | 10 | `screenshots/430x900/` |
| 440×900 | 10 | `screenshots/440x900/` |

---

## Quick Wins (Low Effort, High Impact)

1. **Add `overflow-x-auto` to 3 tables** (PriceList, Attendance, Employees) — 3 lines each
2. **Change VehicleList grid to `grid-cols-1 sm:grid-cols-2`** — 1 line
3. **Change Dashboard KPI grid to `grid-cols-2 sm:grid-cols-4`** — 1 line
4. **Make filter popover responsive `fixed left-4 right-4` on mobile** — 2 lines
5. **Add `overflow-x-auto` to VehicleDetail tabs** — 1 line

Estimated effort: **30 minutes** for all quick wins.
