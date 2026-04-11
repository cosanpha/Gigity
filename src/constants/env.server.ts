import 'server-only'

export const MONGODB = process.env.MONGODB
export const OPENAI_API_KEY = process.env.OPENAI_API_KEY
export const LLM_BASE_URL =
  process.env.LLM_BASE_URL ?? 'https://api.openai.com/v1'
export const LLM_MODEL = process.env.LLM_MODEL ?? 'gpt-4.1-mini'

export const CLOUDINARY_CLOUD_NAME = process.env.CLOUDINARY_CLOUD_NAME
export const CLOUDINARY_API_KEY = process.env.CLOUDINARY_API_KEY
export const CLOUDINARY_API_SECRET = process.env.CLOUDINARY_API_SECRET

export const SUNO_API_KEY = process.env.SUNO_API_KEY
