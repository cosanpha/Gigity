import mongoose, { Document, Model, Schema } from 'mongoose'

export interface IBrandProfile extends Document {
  name: string
  description: string
  targetAudience: string
  tone: string // comma-separated selected tones, e.g. "Warm, Modern"
  platforms: string[] // e.g. ["TikTok", "YouTube Shorts"]
  exampleVideoUrls: string[]
  brandLinks: string[]
  logoUrl: string
  userId: null // always null in V1; V2 will set this to authenticated user's _id
  createdAt: Date
  updatedAt: Date
}

const BrandProfileSchema = new Schema<IBrandProfile>(
  {
    name: { type: String, required: true },
    description: { type: String, required: true },
    targetAudience: { type: String, default: '' },
    tone: { type: String, default: '' },
    platforms: { type: [String], default: [] },
    exampleVideoUrls: { type: [String], default: [] },
    brandLinks: { type: [String], default: [] },
    logoUrl: { type: String, default: '' },
    userId: { type: Schema.Types.Mixed, default: null },
  },
  { timestamps: true }
)

// Prevent model re-registration during Next.js hot-reload
const BrandProfile: Model<IBrandProfile> =
  mongoose.models.BrandProfile ??
  mongoose.model<IBrandProfile>('BrandProfile', BrandProfileSchema)

export default BrandProfile
