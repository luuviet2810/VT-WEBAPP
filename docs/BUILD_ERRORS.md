# BUILD_ERRORS.md

Generated from: `npm run build`
Status: FAIL
Scope: Report only. No application code modified.

## Summary

Build is blocked by pre-existing TypeScript errors across checksheet, store, vehicle form, and task rule modules. No timeline-related changes were necessary to resolve these errors, and no unrelated fixes were applied.

## Error Inventory

Sorted by dependency order: type/shape mismatches first, then callers that depend on those types.

---

### 1. `src/types.ts` — `CheckSheet` shape mismatch with checksheet code

- **File**: `src/types.ts`
- **Line**: 230-255
- **Error message**: Indirect downstream errors such as `Property 'inputAcquySOH' does not exist on type 'CheckSheet'`, `Property 'inputAcquySOC' does not exist on type 'CheckSheet'`, `Property 'acquySOH' does not exist on type 'CheckSheet'`, and `Property 'acquySOC' does not exist on type 'CheckSheet'`.
- **Root cause**: The `CheckSheet` interface in `src/types.ts` does not include battery-related fields that checksheet UI/service code expects.
- **Classification**: Pre-existing
- **Suggested fix**: Add `inputAcquySOH`, `inputAcquySOC`, `acquySOH`, `acquySOC` to `CheckSheet` or remove their usage in checksheet modules if the DB schema no longer uses them.
- **Estimated difficulty**: Easy

---

### 2. `src/types.ts` — `NotificationType` mismatch in checksheet form

- **File**: `src/types.ts`
- **Line**: 301-310
- **Error message**: `Type '"error"' is not assignable to type 'NotificationType'`
- **Root cause**: `CheckSheetForm.tsx` uses a notification type value `'error'` that is not present in the exported `NotificationType` union.
- **Classification**: Pre-existing
- **Suggested fix**: Add `'error'` to `NotificationType` or replace the usage with an existing allowed notification type.
- **Estimated difficulty**: Easy

---

### 3. `src/types.ts` / `src/types/index.ts` — `MoveLog` not exported where store expects it

- **File**: `src/store/useStore.ts`
- **Line**: 108, 360
- **Error message**: `Cannot find name 'MoveLog'`
- **Root cause**: The store references `MoveLog`, but the current import path or re-export chain does not provide that name at compile time in this module.
- **Classification**: Pre-existing
- **Suggested fix**: Ensure `MoveLog` is exported from `src/types` and imported explicitly in `src/store/useStore.ts`.
- **Estimated difficulty**: Easy

---

### 4. `src/services/checksheet.service.ts` — checksheet DB mapping uses removed fields

- **File**: `src/services/checksheet.service.ts`
- **Line**: 30, 105-108, 147-150, 229
- **Error message**:
  - `Object literal may only specify known properties, and 'inputAcquySOH' does not exist in type 'CheckSheet'`
  - `Property 'inputAcquySOH' does not exist on type 'Omit<CheckSheet, "id" | "createdAt">'`
  - `Property 'acquySOH' does not exist on type 'Partial<CheckSheet>'`
  - `Type 'ExteriorCheck | {}' is not assignable to type 'ExteriorCheck'`
- **Root cause**: Service layer still reads/writes battery fields and uses unsafe exterior defaults despite type definitions no longer matching.
- **Classification**: Pre-existing
- **Suggested fix**:
  - Align service field usage with `CheckSheet` type, or extend `CheckSheet` with the missing fields.
  - Replace unsafe exterior fallback with a valid default shape.
- **Estimated difficulty**: Medium

---

### 5. `src/components/CheckSheetForm.tsx` — checksheet form uses removed fields and invalid notification type

- **File**: `src/components/CheckSheetForm.tsx`
- **Line**: 281-284, 291, 319, 321, 340
- **Error message**:
  - Missing property errors for `inputAcquySOH`, `inputAcquySOC`, `acquySOH`, `acquySOC`
  - Invalid notification type `'error'`
- **Root cause**: Form state initialization, patch builder, and error notification call still reference fields/types that no longer exist in current type definitions.
- **Classification**: Pre-existing
- **Suggested fix**:
  - Remove or replace acquy-related fields in form state.
  - Change invalid notification type to an allowed `NotificationType`.
- **Estimated difficulty**: Medium

---

### 6. `src/store/useStore.ts` — `addVehicle` return type and argument shape mismatch

- **File**: `src/store/useStore.ts`
- **Line**: 181, 182
- **Error message**:
  - `Type '(v: Partial<Vehicle>) => Promise<Vehicle>' is not assignable to type '(v: Partial<Vehicle>) => Promise<void>'`
  - `Argument of type '{ plate: string; model: string; ... note: string; }' is not assignable to parameter of type 'Omit<Vehicle, "id" | "createdAt" | "updatedAt">'. ... missing: images, documents`
- **Root cause**: Store interface declares `addVehicle` returning `Promise<void>`, but implementation returns the created vehicle. Also, the constructed payload omits `images` and `documents` while the service expects them.
- **Classification**: Pre-existing
- **Suggested fix**:
  - Make implementation return `void` or update interface to `Promise<Vehicle>`.
  - Include `images: []` and `documents: []` in created payload if required by service/types.
- **Estimated difficulty**: Medium

---

### 7. `src/pages/VehicleFormModal.tsx` — narrowed `created` type becomes `never`

- **File**: `src/pages/VehicleFormModal.tsx`
- **Line**: 166, 167
- **Error message**: `Property 'id' does not exist on type 'never'`
- **Root cause**: TypeScript infers `created` as `never`, likely because `addVehicle` is typed inconsistently with its actual return path, causing the truthy branch to collapse to an impossible type.
- **Classification**: Pre-existing
- **Suggested fix**: Fix `addVehicle` typing first; then this caller should compile without additional changes.
- **Estimated difficulty**: Medium

---

### 8. `src/utils/taskRules.ts` — impossible comparison and missing checksheet field

- **File**: `src/utils/taskRules.ts`
- **Line**: 97, 195
- **Error message**:
  - `This comparison appears to be unintentional because the types 'DieuHoaStatus | undefined' and '"broken"' have no overlap`
  - `Property 'inputAcquySOC' does not exist on type 'CheckSheet'`
- **Root cause**:
  - Rule compares `inputDieuHoa.status` to `'broken'` even though the type only allows `'good' | 'need_gas'`.
  - Another rule references `inputAcquySOC`, which is absent from current `CheckSheet` type.
- **Classification**: Pre-existing
- **Suggested fix**:
  - Update the rule condition to valid status values or extend `DieuHoaStatus` if business rules require it.
  - Align battery rule with current `CheckSheet` fields.
- **Estimated difficulty**: Medium

---

## Recommended Fix Order

1. `src/types.ts` — type/shape mismatches
2. `src/store/useStore.ts` — `MoveLog` import, `addVehicle` signature/payload
3. `src/services/checksheet.service.ts` — field mapping and exterior default
4. `src/components/CheckSheetForm.tsx` — field usage and notification type
5. `src/pages/VehicleFormModal.tsx` — verify fix from step 2 resolves `never`
6. `src/utils/taskRules.ts` — invalid comparisons and missing fields

## Notes

- This list is based on the current build output only.
- No code changes were made while creating this report.
