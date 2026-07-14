# Responsive Audit Report

**Generated:** 2026-07-14
**Viewports:** 390, 402, 412, 430, 440 px
**Screenshots:** `/screenshots/{width}x{height}/{Page}/{state}.png`
**Total:** 50 screenshots across 9 pages

---

## Run Audit

```bash
TEST_USER_EMAIL="your-email" TEST_USER_PASSWORD="your-password" npm run audit:all
```

## Results Summary

| Page | States | Viewports | Screenshots | Status |
|------|--------|-----------|-------------|--------|
| Dashboard | main | 5 | 5 | ✅ |
| Vehicle List | main, filter | 5 | 10 | ✅ |
| Tasks | main | 5 | 5 | ✅ |
| Positions | main | 5 | 5 | ✅ |
| Vehicle Detail | main | 5 | 5 | ✅ |
| Price List | main | 5 | 5 | ✅ |
| Attendance | main | 5 | 5 | ✅ |
| Employees | main | 5 | 5 | ✅ |
| Statistics | main | 5 | 5 | ✅ |

**Failed interactions** (UI selectors need updating):
- VehicleList preview button: not found
- Tasks detail drawer: task card selector mismatch
- Positions history drawer: button selector mismatch
- PriceList edit modal: edit button not found

---

## Checklist per screenshot

- [ ] Horizontal overflow (scrollbar appears when it shouldn't)
- [ ] Text clipped / cut off
- [ ] Buttons clipped or narrower than content
- [ ] Elements extending beyond viewport
- [ ] Dialogs / modals wider than screen
- [ ] Touch targets smaller than 44×44px
- [ ] Tables overflowing with no horizontal scroll
- [ ] Grid broken (cards misaligned, wrong column count)
- [ ] Spacing inconsistent (too tight or too loose)
- [ ] Footer / Save buttons hidden below fold

---

## Known Issues

| Page | Viewport | Issue | Severity | Suggested Fix |
|------|----------|-------|----------|---------------|
| _Fill after review_ | | | | |

---

## How to Review

1. Open each screenshot from the list above
2. Check against the checklist
3. Fill issues into the Known Issues table
