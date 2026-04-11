import mongoose, { Document, Model, Schema } from 'mongoose'

export interface IMessage {
  role: 'user' | 'assistant'
  content: string
}

export interface IWorkflowStep {
  stepNumber: number
  conversation: IMessage[]
  llmResponse: string | null
  outputAssetUrl: string | null
  sunoTaskId: string | null
  sunoSelectedTrackIndex: number | null
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
    sunoTaskId: { type: String, default: null },
    sunoSelectedTrackIndex: { type: Number, default: null },
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
