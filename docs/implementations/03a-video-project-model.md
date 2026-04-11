# 03a — Workflow Engine: VideoProject Model

## What this builds

The `VideoProject` Mongoose model with embedded `WorkflowStep` and `Message`
sub-documents. This is the core data structure for the entire workflow engine.

## Prerequisites

[00b-setup-env-db.md](00b-setup-env-db.md) — db.ts must exist.
[01a-brand-model.md](01a-brand-model.md) — BrandProfile model (referenced by ObjectId).

## Files to create

```
src/models/VideoProject.ts
```

---

## Data structure

```
VideoProject
  ├── brandProfileId  (ObjectId ref → BrandProfile)
  ├── userId          (null in V1)
  ├── title
  ├── status          in_progress | completed
  └── steps[11]       (WorkflowStep, embedded)
        ├── stepNumber      1–11
        ├── conversation[]  (Message, embedded) — grows per follow-up
        ├── llmResponse     last assistant response (null for external steps)
        ├── outputAssetUrl  URL pasted by user (null for LLM steps)
        ├── status          pending | generating | done
        └── completedAt     Date | null
```

### Key invariants

- System message is **NOT** stored — recomputed on every generate call
- `llmResponse` always = last `{role:'assistant'}` message in `conversation[]`
- Steps must be completed in order: step N requires step N-1 `done`
- Steps 6, 9: user pastes a URL → stored in `outputAssetUrl`
- Steps 10, 11: no URL required — just `Approve` marks them done

---

## `src/models/VideoProject.ts`

```ts
import mongoose, { Schema, Document, Model } from 'mongoose'

export interface IMessage {
  role: 'user' | 'assistant'
  content: string
}

export interface IWorkflowStep {
  stepNumber: number
  conversation: IMessage[]
  llmResponse: string | null
  outputAssetUrl: string | null
  status: 'pending' | 'generating' | 'done'
  completedAt: Date | null
}

export interface IVideoProject extends Document {
  brandProfileId: mongoose.Types.ObjectId
  userId: null
  title: string
  status: 'in_progress' | 'completed'
  steps: IWorkflowStep[]
  createdAt: Date
  updatedAt: Date
}

const MessageSchema = new Schema<IMessage>(
  {
    role: { type: String, enum: ['user', 'assistant'], required: true },
    content: { type: String, required: true },
  },
  { _id: false }
)

const WorkflowStepSchema = new Schema<IWorkflowStep>(
  {
    stepNumber: { type: Number, required: true },
    conversation: { type: [MessageSchema], default: [] },
    llmResponse: { type: String, default: null },
    outputAssetUrl: { type: String, default: null },
    status: {
      type: String,
      enum: ['pending', 'generating', 'done'],
      default: 'pending',
    },
    completedAt: { type: Date, default: null },
  },
  { _id: false }
)

const VideoProjectSchema = new Schema<IVideoProject>(
  {
    brandProfileId: {
      type: Schema.Types.ObjectId,
      ref: 'BrandProfile',
      required: true,
    },
    userId: { type: Schema.Types.Mixed, default: null },
    title: { type: String, required: true },
    status: {
      type: String,
      enum: ['in_progress', 'completed'],
      default: 'in_progress',
    },
    steps: { type: [WorkflowStepSchema], default: [] },
  },
  { timestamps: true }
)

const VideoProject: Model<IVideoProject> =
  mongoose.models.VideoProject ??
  mongoose.model<IVideoProject>('VideoProject', VideoProjectSchema)

export default VideoProject
```

---

## Verify

```bash
bun tsc --noEmit
```

No TypeScript errors. The model will be tested end-to-end when the create project
API route is built in [03e-api-create-project.md](03e-api-create-project.md).

---

**Output:** `VideoProject` model with typed `WorkflowStep` and `Message` sub-documents.

**Next step:** [03b-workflow-templates.md](03b-workflow-templates.md) — 11 step definitions
