# Implementation Guide — Gigity

Plans are split into small chunks. Each plan = one focused session in Cursor.
Implement in order. Don't skip ahead — later plans depend on earlier ones.

## Build order

| #   | File                                                       | What it builds                          | Milestone |
| --- | ---------------------------------------------------------- | --------------------------------------- | --------- |
| 00a | [00a-setup-deps.md](00a-setup-deps.md)                     | Install deps, fix health route          | Pre-M1    |
| 00b | [00b-setup-env-db.md](00b-setup-env-db.md)                 | env.server.ts, env.client.ts, db.ts     | Pre-M1    |
| 00c | [00c-design-tokens.md](00c-design-tokens.md)               | Design token reference, globals.css     | Pre-M1    |
| 01a | [01a-brand-model.md](01a-brand-model.md)                   | BrandProfile Mongoose model             | M1        |
| 01b | [01b-brand-api.md](01b-brand-api.md)                       | Brand API routes (GET/POST/PUT/DELETE)  | M1        |
| 01c | [01c-brand-form.md](01c-brand-form.md)                     | BrandForm component                     | M1        |
| 01d | [01d-brand-pages.md](01d-brand-pages.md)                   | /brand/new and /brand/[id]/edit pages   | M1        |
| 02a | [02a-dashboard-page.md](02a-dashboard-page.md)             | Dashboard server component              | M1        |
| 02b | [02b-dashboard-components.md](02b-dashboard-components.md) | VideoCard, StepProgressBar, StatusBadge | M1        |
| 02c | [02c-new-video-modal.md](02c-new-video-modal.md)           | NewVideoModal client component          | M1        |
| 03a | [03a-video-project-model.md](03a-video-project-model.md)   | VideoProject + WorkflowStep model       | M2        |
| 03b | [03b-workflow-templates.md](03b-workflow-templates.md)     | 11 step definitions + prompt drafts     | Pre-M2    |
| 03c | [03c-interpolate.md](03c-interpolate.md)                   | interpolate.ts + unit tests             | M2        |
| 03d | [03d-llm-builder.md](03d-llm-builder.md)                   | llm.ts + unit tests                     | M2        |
| 03e | [03e-api-create-project.md](03e-api-create-project.md)     | POST /api/v1/projects                   | M2        |
| 03f | [03f-api-generate.md](03f-api-generate.md)                 | POST .../steps/[n]/generate             | M2        |
| 03g | [03g-api-approve.md](03g-api-approve.md)                   | POST .../steps/[n]/approve              | M2        |
| 04a | [04a-workflow-page.md](04a-workflow-page.md)               | /projects/[id] server page              | M3        |
| 04b | [04b-workflow-client.md](04b-workflow-client.md)           | WorkflowClient state + auto-start       | M3        |
| 04c | [04c-step-sidebar.md](04c-step-sidebar.md)                 | StepSidebar component                   | M3        |
| 04d | [04d-llm-step-panel.md](04d-llm-step-panel.md)             | LLMStepPanel (4 sub-states)             | M3        |
| 04e | [04e-external-step-panel.md](04e-external-step-panel.md)   | ExternalStepPanel component             | M3        |
| 05  | [05-prompt-validation.md](05-prompt-validation.md)         | 7 LLM prompts + manual test process     | Pre-M2    |
| 06a | [06a-ui-shared-components.md](06a-ui-shared-components.md) | StatusBadge, SectionHeader, PageLayout, MotionLayout | UI-A |
| 06b | [06b-ui-navbar-videocard.md](06b-ui-navbar-videocard.md)   | Navbar polish, VideoCard redesign       | UI-A      |
| 06c | [06c-ui-dashboard-list.md](06c-ui-dashboard-list.md)       | Pill filter tabs, stagger animations    | UI-A      |
| 06d | [06d-ui-page-layouts.md](06d-ui-page-layouts.md)           | Wire PageLayout into dashboard page     | UI-A      |
| 06e | [06e-ui-animations-setup.md](06e-ui-animations-setup.md)   | Install framer-motion, wire MotionLayout | UI-A     |
| 06f | [06f-ui-workflow-animations.md](06f-ui-workflow-animations.md) | WorkflowClient + StepSidebar animations | UI-A  |
| 06g | [06g-ui-brand-form-pages.md](06g-ui-brand-form-pages.md)   | BrandForm SectionHeader + page polish   | UI-A      |
| 06h | [06h-ui-modals-empty.md](06h-ui-modals-empty.md)           | NewVideoModal animation + EmptyState    | UI-A      |

> **06 chunks implement order:** `06a` → `06e` → `06b`, `06c`, `06d` (any order) → `06f`, `06g`, `06h` (any order)

| 07a | [07a-mobile-navbar.md](07a-mobile-navbar.md)               | Navbar icon-only buttons, brand truncation | Mobile  |
| 07b | [07b-mobile-dashboard.md](07b-mobile-dashboard.md)         | Filter bar stack, VideoCard mobile layout  | Mobile  |
| 07c | [07c-mobile-workflow-drawer.md](07c-mobile-workflow-drawer.md) | Sidebar → slide-in drawer on mobile    | Mobile  |
| 07d | [07d-mobile-brand-forms.md](07d-mobile-brand-forms.md)     | BrandForm full-width, save button stretch  | Mobile  |
| 07e | [07e-mobile-modal-empty.md](07e-mobile-modal-empty.md)     | NewVideoModal max-height scroll            | Mobile  |

> **07 chunks implement order:** `07a`, `07b`, `07d`, `07e` (any order, independent) → `07c` last (depends on StepSidebar prop changes)

## Design reference

See `docs/designs/` for HTML mockups:

- `dashboard.html` — the video list page
- `workflow.html` — the 11-step workflow page
- `brand.html` — brand new/edit pages

## Key decisions (locked)

- Env var name: `MONGODB` (not MONGODB_URI)
- Constants: `env.server.ts` (server-only) + `env.client.ts` (NEXT*PUBLIC*\*)
- Components: `src/components/` for shared components; route-specific files co-located with the route
- Fonts: Montserrat + Source Sans Pro (already in globals.css — do not change)
- Styling: Tailwind utility classes (translate from design HTML — do NOT copy CSS class names)

