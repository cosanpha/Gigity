import {
  CLOUDINARY_API_KEY,
  CLOUDINARY_API_SECRET,
  CLOUDINARY_CLOUD_NAME,
} from '@/constants/env.server'
import { v2 as cloudinary } from 'cloudinary'
import { Readable } from 'node:stream'

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

export async function uploadVideoFromUrl(
  url: string,
  folder = 'gigity/videos'
): Promise<string> {
  const result = await cloudinary.uploader.upload(url, {
    folder,
    resource_type: 'video',
  })
  return result.secure_url
}

export async function uploadVideoBuffer(
  buffer: Buffer,
  folder = 'gigity/videos'
): Promise<string> {
  return new Promise((resolve, reject) => {
    const uploadStream = cloudinary.uploader.upload_stream(
      { folder, resource_type: 'video' },
      (error, result) => {
        if (error) {
          reject(error)
          return
        }
        const secureUrl = result?.secure_url
        if (!secureUrl) {
          reject(new Error('Upload finished without URL'))
          return
        }
        resolve(secureUrl)
      }
    )
    Readable.from(buffer).pipe(uploadStream)
  })
}
