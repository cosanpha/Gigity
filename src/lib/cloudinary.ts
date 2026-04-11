import {
  CLOUDINARY_API_KEY,
  CLOUDINARY_API_SECRET,
  CLOUDINARY_CLOUD_NAME,
} from '@/constants/env.server'
import { v2 as cloudinary } from 'cloudinary'

cloudinary.config({
  cloud_name: CLOUDINARY_CLOUD_NAME,
  api_key: CLOUDINARY_API_KEY,
  api_secret: CLOUDINARY_API_SECRET,
})

export function isCloudinaryUrl(url: string): boolean {
  if (!CLOUDINARY_CLOUD_NAME) return false
  return url.includes(`res.cloudinary.com/${CLOUDINARY_CLOUD_NAME}`)
}

// Upload a file from a remote URL. Returns the permanent Cloudinary URL.
export async function uploadFromUrl(
  url: string,
  folder = 'gigity'
): Promise<string> {
  const result = await cloudinary.uploader.upload(url, {
    folder,
    resource_type: 'auto', // handles image, video, audio
  })
  return result.secure_url
}
