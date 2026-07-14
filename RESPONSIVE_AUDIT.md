# Responsive Audit Report

**Generated:** ${new Date().toISOString().split('T')[0]}
**Viewports:** 390, 402, 412, 430, 440 px
**Screenshots:** `playwright-report/screenshots/mobile/`

---

## Pages Covered

| Page | States Captured |
|------|----------------|
| Dashboard | main |
| Vehicle List | main, filter, preview |
| Tasks | main, detail |
| Positions | main, history |
| Vehicle Detail | main |
| Price List | main, edit |
| Attendance | main |
| Employees | main |
| Statistics | main |

## How to Review

1. Open `playwright-report/screenshots/mobile/`
2. Browse by page → viewport → state
3. For each screenshot, check:

### Checklist per screenshot

- [ ] Horizontal overflow (scrollbar appears when it shouldn't)
- [ ] Text clipped / cut off (ellipsis where full text should be visible)
- [ ] Buttons clipped or narrower than content
- [ ] Elements extending beyond viewport
- [ ] Dialogs / modals wider than screen
- [ ] Touch targets smaller than 44×44px
- [ ] Tables overflowing with no horizontal scroll
- [ ] Grid broken (cards misaligned, wrong column count)
- [ ] Spacing inconsistent (too tight or too loose)
- [ ] Footer / Save buttons hidden below fold

### Known Issues

| Page | Viewport | Issue | Severity | Suggested Fix |
|------|----------|-------|----------|---------------|
| _Fill after review_ | | | | |

---

## Screenshot Organization

```
screenshots/mobile/
  Dashboard/
    390-main.png
    402-main.png
    ...
  VehicleList/
    390-main.png
    390-filter.png
    390-preview.png
    ...
  Tasks/
    390-main.png
    390-detail.png
    ...
  Positions/
    390-main.png
    390-history.png
    ...
  VehicleDetail/
    390-main.png
    ...
  PriceList/
    390-main.png
    390-edit.png
    ...
  Attendance/
    390-main.png
    ...
  Employees/
    390-main.png
    ...
  Statistics/
    390-main.png
    ...
```

---

## Instructions

For each issue found:
1. Note the page, viewport, and state
2. Take a screenshot (already done)
3. Assign severity: Critical / Major / Minor / Cosmetic
4. Describe the cause (e.g. "fixed width on select prevents truncation")
5. Suggest a fix (e.g. "use min-width instead of fixed width")
