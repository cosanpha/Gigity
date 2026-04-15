# 07c — Mobile: Workflow Page — Slide-in Drawer

**Milestone:** Mobile Responsive Pass  
**Depends on:** `06f` (WorkflowClient + StepSidebar already have framer-motion)  
**Scope:** On mobile, collapse the step sidebar into a slide-in drawer. Main panel goes full-width.

---

## Context

Files to modify:
- `src/components/WorkflowClient.tsx`
- `src/components/StepSidebar.tsx`

Current layout: `flex h-[calc(100vh-52px)]` with a fixed `w-[228px]` sidebar + flex-1 main panel.
On a 375px screen, the sidebar is 228px = 61% of the screen. Completely unusable.

Target mobile layout:
- Sidebar hidden off-screen
- Main panel is full-width
- Title bar gets a "Steps" / menu button on the left
- Tapping it opens the sidebar as a slide-in overlay from the left
- Tapping outside or tapping "X" closes it
- No changes to desktop layout (sidebar stays visible at `md:` and above)

---

## 1. `WorkflowClient.tsx` — MODIFY

### 1a. Add drawer state

Add a new state variable near the top of the component:

```tsx
const [sidebarOpen, setSidebarOpen] = useState(false)
```

### 1b. Add menu button to the title bar

Find the title bar section (the `<div className="flex h-[44px] items-center gap-2 border-b ...">` div).

At the very start of that div's children, before the back `<Link>`, add:

```tsx
{/* Mobile sidebar toggle — hidden on md+ */}
<button
  type="button"
  onClick={() => setSidebarOpen(true)}
  aria-label="Open steps"
  className="mr-1 flex h-8 w-8 shrink-0 items-center justify-center rounded-[6px] text-zinc-500 hover:bg-zinc-100 hover:text-zinc-800 md:hidden"
>
  <LucideMenu className="h-4 w-4" aria-hidden />
</button>
```

Add to imports:
```tsx
import { LucideAlertCircle, LucideArrowLeft, LucideCheck, LucideMenu } from 'lucide-react'
```

### 1c. Update the main layout div

Find:
```tsx
<div className="flex min-h-0 flex-1 overflow-hidden">
  <StepSidebar
    steps={steps}
    stepDefs={stepDefs}
    activeStep={activeStep}
    onSelect={setActiveStep}
  />
  <main className="relative min-h-0 flex-1 overflow-y-auto">
```

Replace with:
```tsx
<div className="flex min-h-0 flex-1 overflow-hidden">
  {/* Desktop sidebar — hidden on mobile */}
  <div className="hidden md:block">
    <StepSidebar
      steps={steps}
      stepDefs={stepDefs}
      activeStep={activeStep}
      onSelect={() => {}}
      onSelectAndClose={(n) => setActiveStep(n)}
    />
  </div>

  {/* Mobile drawer overlay */}
  <AnimatePresence>
    {sidebarOpen && (
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        transition={{ duration: 0.15 }}
        className="fixed inset-0 z-50 flex md:hidden"
        onClick={() => setSidebarOpen(false)}
      >
        <motion.div
          initial={{ x: -260 }}
          animate={{ x: 0 }}
          exit={{ x: -260 }}
          transition={{ duration: 0.2, ease: 'easeOut' }}
          className="relative flex h-full w-[260px] flex-col bg-white shadow-xl"
          onClick={e => e.stopPropagation()}
        >
          {/* Drawer header */}
          <div className="flex items-center justify-between border-b border-zinc-200 px-4 py-3">
            <span className="text-[11px] font-semibold uppercase tracking-widest text-zinc-400">Steps</span>
            <button
              type="button"
              onClick={() => setSidebarOpen(false)}
              aria-label="Close steps"
              className="rounded-[4px] p-1 text-zinc-400 hover:bg-zinc-100 hover:text-zinc-600"
            >
              <LucideX className="h-4 w-4" aria-hidden />
            </button>
          </div>
          <StepSidebar
            steps={steps}
            stepDefs={stepDefs}
            activeStep={activeStep}
            onSelect={(n) => {
              setActiveStep(n)
              setSidebarOpen(false)
            }}
            onSelectAndClose={(n) => {
              setActiveStep(n)
              setSidebarOpen(false)
            }}
            hideHeader
          />
        </motion.div>
        {/* Backdrop */}
        <div className="flex-1 bg-black/40" />
      </motion.div>
    )}
  </AnimatePresence>

  <main className="relative min-h-0 flex-1 overflow-y-auto">
```

Add `LucideX` to imports:
```tsx
import { LucideAlertCircle, LucideArrowLeft, LucideCheck, LucideMenu, LucideX } from 'lucide-react'
```

---

## 2. `StepSidebar.tsx` — MODIFY

### 2a. Add new props

Update the props interface:

```tsx
interface StepSidebarProps {
  steps: StepState[]
  stepDefs: StepDefinition[]
  activeStep: number
  onSelect: (n: number) => void
  onSelectAndClose?: (n: number) => void
  hideHeader?: boolean
}
```

Update the function signature:
```tsx
export function StepSidebar({
  steps,
  stepDefs,
  activeStep,
  onSelect,
  onSelectAndClose,
  hideHeader = false,
}: StepSidebarProps) {
```

### 2b. Conditionally hide the header

Find the sidebar header div:
```tsx
{/* Sidebar header */}
<div className="border-b border-zinc-200 px-4 py-3">
  <span className="text-[11px] font-semibold tracking-widest text-zinc-400 uppercase">
    Steps
  </span>
</div>
```

Wrap it:
```tsx
{!hideHeader && (
  <div className="border-b border-zinc-200 px-4 py-3">
    <span className="text-[11px] font-semibold tracking-widest text-zinc-400 uppercase">
      Steps
    </span>
  </div>
)}
```

The drawer variant has its own header with a close button, so `hideHeader` prevents duplication.

### 2c. Sidebar container — remove fixed width on mobile (desktop wrapper handles it)

The `<aside>` has `w-[228px]`. This is fine because on mobile, the `<aside>` is now inside the drawer `motion.div` which has `w-[260px]`. The `<aside>` should fill the drawer.

Update the aside class:
```tsx
<aside className="flex min-h-0 w-full flex-col overflow-hidden border-r border-zinc-200 md:w-[228px]">
```

`w-full` on mobile (fills the drawer), `md:w-[228px]` on desktop (fixed width sidebar).

---

## 3. `src/components/WorkflowClient.tsx` — Mobile title bar refinement

The title bar also has the project title (truncated) + edit button + save button. On mobile this is very tight.

Find the title + edit button area:
```tsx
<span className="min-w-0 truncate text-[14px] font-medium text-zinc-950">
  {title}
</span>
<button
  onClick={() => { ... }}
  className="shrink-0 rounded-[4px] px-2 py-1 text-[12px] text-zinc-400 ..."
>
  Edit
</button>
```

The "Edit" title button can be hidden on mobile to save space (user can edit title when needed on desktop). Optional: only show when not on mobile, or make it icon-only.

Make the "Edit" title button hidden on mobile:
```tsx
<button
  onClick={() => {
    setTitleInput(title)
    setEditingTitle(true)
  }}
  className="hidden shrink-0 rounded-[4px] px-2 py-1 text-[12px] text-zinc-400 transition-colors hover:bg-zinc-100 hover:text-zinc-600 sm:block"
>
  Edit
</button>
```

---

## Verification

```bash
bunx tsc --noEmit
```

Visual check at 375px:
- Title bar shows: hamburger icon | back link | project title | save button
- Tapping hamburger opens drawer from left with step list
- Tapping a step closes drawer and switches to that step
- Tapping outside drawer (backdrop) closes it
- Step panel is full-width, scrollable

Visual check at 768px+:
- Sidebar is visible as fixed column on left
- No hamburger button visible
- Desktop layout unchanged
