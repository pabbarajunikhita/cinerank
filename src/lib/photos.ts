import { createClient } from '@/lib/supabase/client'

export const PHOTO_BUCKET = 'ranking-photos'
const MAX_INPUT_BYTES = 15 * 1024 * 1024 // reject huge originals before decoding
const MAX_DIMENSION = 1600 // longest side after resizing
const JPEG_QUALITY = 0.85

/**
 * Downscale + re-encode to JPEG in the browser. Phone photos are often 3–8 MB;
 * this typically brings them to ~200–400 KB, which keeps storage + page loads cheap.
 * Re-encoding also strips EXIF metadata (e.g. GPS location) from selfies.
 */
export async function resizeImage(file: File): Promise<Blob> {
  if (!file.type.startsWith('image/')) throw new Error('Please choose an image file')
  if (file.size > MAX_INPUT_BYTES) throw new Error('That photo is too large (max 15 MB)')

  let bitmap: ImageBitmap
  try {
    bitmap = await createImageBitmap(file, { imageOrientation: 'from-image' })
  } catch {
    throw new Error("Couldn't read that image. Try a JPG or PNG.")
  }

  const scale = Math.min(1, MAX_DIMENSION / Math.max(bitmap.width, bitmap.height))
  const width = Math.round(bitmap.width * scale)
  const height = Math.round(bitmap.height * scale)

  const canvas = document.createElement('canvas')
  canvas.width = width
  canvas.height = height
  canvas.getContext('2d')!.drawImage(bitmap, 0, 0, width, height)
  bitmap.close()

  return new Promise((resolve, reject) =>
    canvas.toBlob(b => (b ? resolve(b) : reject(new Error('Could not process image'))), 'image/jpeg', JPEG_QUALITY)
  )
}

/** Upload to `<userId>/<uuid>.jpg` in the public bucket; returns the public URL. */
export async function uploadRankingPhoto(file: File): Promise<string> {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) throw new Error('You need to be logged in to upload photos')

  const blob = await resizeImage(file)
  const path = `${user.id}/${crypto.randomUUID()}.jpg`
  const { error } = await supabase.storage
    .from(PHOTO_BUCKET)
    .upload(path, blob, { contentType: 'image/jpeg', upsert: false })
  if (error) throw new Error(`Upload failed: ${error.message}`)

  return supabase.storage.from(PHOTO_BUCKET).getPublicUrl(path).data.publicUrl
}

/** True if `url` points at this user's own folder in our photo bucket. */
export function isOwnPhotoUrl(url: string, userId: string): boolean {
  const base = process.env.NEXT_PUBLIC_SUPABASE_URL
  return !!base && url.startsWith(`${base}/storage/v1/object/public/${PHOTO_BUCKET}/${userId}/`)
}
