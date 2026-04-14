# 06c — UI Redesign: DashboardProjectList

**Milestone:** UI Redesign Pass A  
**Depends on:** `06a` (SectionHeader must exist)  
**Scope:** Update filter tabs to pill-group style, replace inline section headers, improve search

---

## Context

File to modify: `src/components/DashboardProjectList.tsx`

Design reference: `docs/designs/dashboard.html` — the filter tabs and section header patterns.

---

## Changes

### 1. Add imports

At the top, add:
```tsx
import { motion } from 'framer-motion'
import { SectionHeader } from './ui/SectionHeader'
```

> `motion` is used in step 4 for animated card wrappers.
> `framer-motion` must be installed first — see chunk `06e`.
> If not yet installed, skip the `motion` import and the animated wrappers in step 4;
> add them after `06e` is done.

Full import block at top of file:
```tsx
'use client'

import { isWorkflowFullyComplete } from '@/lib/workflow-templates'
import { motion } from 'framer-motion'
import { useState } from 'react'
import { EmptyState } from './EmptyState'
import { SectionHeader } from './ui/SectionHeader'
import { VideoCard } from './VideoCard'
```

### 2. Replace the filter bar

Find the entire `{/* Filter bar */}` block. Replace with this pill-group style:

```tsx
{/* Filter bar */}
<div className="mb-4 flex items-center gap-2">
  <div className="flex items-center rounded-full border border-zinc-200 bg-zinc-50 p-[3px]">
    {(['all', 'in_progress', 'completed', 'canceled'] as FilterTab[]).map(tab => (
      <button
        key={tab}
        onClick={() => setFilter(tab)}
        className={`rounded-full px-3 py-[3px] text-[12.5px] font-medium transition-all ${
          filter === tab
            ? tab === 'all'
              ? 'bg-zinc-900 text-white shadow-sm'
              : 'bg-orange-500 text-white shadow-sm'
            : 'text-zinc-500 hover:text-zinc-800'
        }`}
      >
        {tab === 'all'
          ? 'All'
          : tab === 'in_progress'
            ? 'In progress'
            : tab === 'completed'
              ? 'Completed'
              : 'Canceled'}
      </button>
    ))}
  </div>
  <div className="flex-1" />
  <input
    type="text"
    placeholder="Search videos…"
    value={search}
    onChange={e => setSearch(e.target.value)}
    className="w-[200px] rounded-[6px] border border-zinc-200 px-3 py-[5px] text-[13px] text-zinc-950 outline-none transition-colors placeholder:text-zinc-400 focus:border-orange-300 focus:ring-2 focus:ring-orange-100"
  />
</div>
```

Key changes vs old:
- Tabs are inside a `rounded-full border bg-zinc-50 p-[3px]` pill group container
- Active "All" tab: `bg-zinc-900 text-white` (dark)
- Active other tabs: `bg-orange-500 text-white` (orange)
- Search input: `focus:border-orange-300 focus:ring-2 focus:ring-orange-100`

### 3. Replace inline section headers

There are 3 instances of this pattern:
```tsx
<div className="mb-2 flex items-center gap-3">
  <span className="text-[11px] font-semibold tracking-widest text-zinc-400 uppercase">
    In progress
  </span>
  <span className="flex-1 border-t border-zinc-200" />
</div>
```

Replace each with `<SectionHeader>` + count prop:

**In-progress section:**
```tsx
<SectionHeader label="In progress" count={inProgress.length} />
```

**Completed section:**
```tsx
<SectionHeader label="Completed" count={completed.length} />
```

**Canceled section:**
```tsx
<SectionHeader label="Canceled" count={canceled.length} />
```

### 4. Animate card lists with stagger

Also change `gap-[6px]` → `gap-[5px]` on all three card list containers.

Replace each card list `<div className="flex flex-col gap-[6px]">` block with staggered motion wrappers:

**In-progress list:**
```tsx
<div className="flex flex-col gap-[5px]">
  {inProgress.map((p, i) => (
    <motion.div
      key={String(p._id)}
      initial={{ opacity: 0, y: 6 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.18, delay: i * 0.04, ease: 'easeOut' }}
    >
      <VideoCard project={p} />
    </motion.div>
  ))}
</div>
```

**Completed list:**
```tsx
<div className="flex flex-col gap-[5px]">
  {completed.map((p, i) => (
    <motion.div
      key={String(p._id)}
      initial={{ opacity: 0, y: 6 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.18, delay: i * 0.04, ease: 'easeOut' }}
    >
      <VideoCard project={p} />
    </motion.div>
  ))}
</div>
```

**Canceled list:**
```tsx
<div className="flex flex-col gap-[5px]">
  {canceled.map((p, i) => (
    <motion.div
      key={String(p._id)}
      initial={{ opacity: 0, y: 6 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.18, delay: i * 0.04, ease: 'easeOut' }}
    >
      <VideoCard project={p} />
    </motion.div>
  ))}
</div>
```

> If framer-motion is not yet installed, skip step 4 and come back after `06e`.

---

## Final structure of the JSX return

The list section should look like:

```tsx
{inProgress.length > 0 && (
  <div className="mb-6">
    <SectionHeader label="In progress" count={inProgress.length} />
    <div className="flex flex-col gap-[5px]">
      {inProgress.map((p, i) => (
        <motion.div key={String(p._id)} initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.18, delay: i * 0.04, ease: 'easeOut' }}>
          <VideoCard project={p} />
        </motion.div>
      ))}
    </div>
  </div>
)}
{completed.length > 0 && (
  <div>
    <SectionHeader label="Completed" count={completed.length} />
    <div className="flex flex-col gap-[5px]">
      {completed.map((p, i) => (
        <motion.div key={String(p._id)} initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.18, delay: i * 0.04, ease: 'easeOut' }}>
          <VideoCard project={p} />
        </motion.div>
      ))}
    </div>
  </div>
)}
{canceled.length > 0 && (
  <div className="mt-6">
    <SectionHeader label="Canceled" count={canceled.length} />
    <div className="flex flex-col gap-[5px]">
      {canceled.map((p, i) => (
        <motion.div key={String(p._id)} initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.18, delay: i * 0.04, ease: 'easeOut' }}>
          <VideoCard project={p} />
        </motion.div>
      ))}
    </div>
  </div>
)}
```

---

## Verification

```bash
bunx tsc --noEmit
```

Zero errors expected (aside from framer-motion missing if `06e` not done yet).
