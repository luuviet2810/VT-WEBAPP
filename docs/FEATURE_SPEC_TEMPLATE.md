# FEATURE_SPEC_TEMPLATE.md

Use this template for every future feature request.

---

## Goal

One-paragraph description of the user-facing outcome.

---

## Business Rules

- Rule 1
- Rule 2
- Rule 3

Be explicit about validation, permissions, status transitions, and defaults.

---

## Scope

### In scope
- What this feature does
- Which workflows it touches
- Which users/roles it affects

### Out of scope
- What this feature does not do
- What should be excluded even if related

---

## Files to Modify

- `src/pages/...`
- `src/components/...`
- `src/store/useStore.ts` — only if allowed
- `src/services/...` — only if allowed

List exact files and whether edits are expected to be additions or modifications.

---

## Files to Create

- `src/...`
- `docs/...` if needed

---

## Files NOT to Modify

- `src/store/useAuthStore.ts` — unless explicitly requested
- `src/services/checksheet.service.ts` — unless explicitly requested
- `src/services/task.service.ts` — unless explicitly requested
- `src/components/CheckSheetForm.tsx` — unless explicitly requested
- Any file outside allowed scope

Be explicit about protected files.

---

## Acceptance Criteria

- [ ] Criterion 1
- [ ] Criterion 2
- [ ] Criterion 3

Write criteria that are verifiable from the UI or data state.

---

## Implementation Plan

1. Step 1
2. Step 2
3. Step 3

Keep steps small and reviewable.

---

## Testing Checklist

- [ ] Happy path
- [ ] Empty state
- [ ] Permission boundary
- [ ] Failure/rollback behavior
- [ ] UI regression on related screens

---

## Completion Report

After implementation, provide:
- Changed files
- What was added
- What was intentionally not changed
- Any follow-up risks or TODOs left for later
