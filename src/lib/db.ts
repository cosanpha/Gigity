import { MONGODB } from '@/constants/env.server'
import mongoose from 'mongoose'

declare global {
  var _mongooseConn: typeof mongoose | undefined
}

export async function connectDB() {
  if (global._mongooseConn) return global._mongooseConn
  if (!MONGODB) throw new Error('MONGODB env var is not set')
  global._mongooseConn = await mongoose.connect(MONGODB)
  return global._mongooseConn
}
