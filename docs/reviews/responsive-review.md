# Responsive Review — Bug Fixes

**Branch:** main  
**Reviewed files:** `WorkflowClient.tsx`, `VideoCard.tsx`, `BrandForm.tsx`  
**Scope:** Three bugs found in the mobile responsive implementation that break usability on touch devices.

---

## Bug 1 — Desktop sidebar step clicks do nothing

**File:** `src/components/WorkflowClient.tsx`  
**Severity:** High — desktop users cannot switch steps by clicking the sidebar

### What's wrong

The desktop sidebar renders with `onSelect={() => {}}` — an empty no-op function. Clicking any step in the sidebar on desktop does nothing. The `StepSidebar` component calls `onSelect(def.stepNumber)` on click, but it goes nowhere.

The mobile drawer passes the correct handler. Only the desktop instance is broken.

### Fix

Find the desktop sidebar render (inside `<div className="hidden md:block">`):

```tsx
<StepSidebar
  steps={steps}
  stepDefs={stepDefs}
  activeStep={activeStep}
  onSelect={() => {}}
  onSelectAndClose={(n) => setActiveStep(n)}
/>
```

Replace `onSelect={() => {}}` with `onSelect={setActiveStep}`:

```tsx
<StepSidebar
  steps={steps}
  stepDefs={stepDefs}
  activeStep={activeStep}
  onSelect={setActiveStep}
  onSelectAndClose={(n) => setActiveStep(n)}
/>
```

No other changes needed. `setActiveStep` is already in scope.

---

## Bug 2 — Cancel and Delete buttons invisible on mobile

**File:** `src/components/VideoCard.tsx`  
**Severity:** High — users on touch devices cannot cancel or delete projects

### What's wrong

The Cancel/Delete action buttons are inside a `<span>` with `hidden group-hover:inline-flex`. On touch devices, hover never fires. These buttons are permanently hidden on mobile — there is no way to cancel or delete a project on a phone.

```tsx
<span className="hidden items-center gap-1 group-hover:inline-flex">
  {/* Cancel button */}
  {/* Delete button */}
</span>
```

### Fix

Use separate action containers for mobile and desktop behavior:

- Mobile (`< sm`): always visible actions
- Desktop (`sm+`): hidden by default, visible on card hover

The most reliable fix is to render two spans with the same buttons:

Find:

```tsx
<span className="hidden items-center gap-1 group-hover:inline-flex">
```

Replace with:

```tsx
<span className="inline-flex items-center gap-1 sm:hidden">
  {/* Cancel/Re-open + Delete buttons */}
</span>

<span className="hidden items-center gap-1 sm:group-hover:inline-flex">
  {/* Cancel/Re-open + Delete buttons */}
</span>
```

This avoids hover-only controls on touch devices and keeps existing desktop hover behavior.

**Note:** The `confirmDelete` branch already renders unconditionally — that state is fine as-is. Only the non-confirm state needs this fix.

---

## Bug 3 — BrandForm Identity section 2-column grid too cramped on mobile

**File:** `src/components/BrandForm.tsx`  
**Severity:** Medium — Brand name and Logo URL inputs are ~150px wide each at 375px viewport, hard to use

### What's wrong

The Identity section uses a fixed 2-column grid:

```tsx
<div className="grid grid-cols-2 gap-4">
```

At 375px viewport with `px-6` page padding, this gives each column ~150px. The "Brand name" input and "Logo URL" input become very tight, especially with the Cloudinary upload button also in the logo column.

### Fix

Find:

```tsx
<div className="grid grid-cols-2 gap-4">
```

Replace with:

```tsx
<div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
```

This stacks Brand name above Logo URL on mobile, side-by-side on `sm:` (640px+). No structural changes needed — just the class swap.

---

## Verification

After applying all three fixes:

```bash
bunx tsc --noEmit
```

Visual check at 375px:

- [ ] Click steps in desktop sidebar (>= 768px) — active step should change
- [ ] On mobile, VideoCard should show Cancel/Delete buttons without needing hover
- [ ] BrandForm `/brand/new` — Brand name and Logo URL stack vertically on mobile
- [ ] No horizontal scroll anywhere
