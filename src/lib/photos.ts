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
export async function resizeImage(
  file: File,
  { maxDimension = MAX_DIMENSION, square = false }: { maxDimension?: number; square?: boolean } = {},
): Promise<Blob> {
  if (!file.type.startsWith('image/')) throw new Error('Please choose an image file')
  if (file.size > MAX_INPUT_BYTES) throw new Error('That photo is too large (max 15 MB)')

  let bitmap: ImageBitmap
  try {
    bitmap = await createImageBitmap(file, { imageOrientation: 'from-image' })
  } catch {
    throw new Error("Couldn't read that image. Try a JPG or PNG.")
  }

  // `square` center-crops to a square first (for avatars).
  const side = Math.min(bitmap.width, bitmap.height)
  const [sx, sy, sw, sh] = square
    ? [(bitmap.width - side) / 2, (bitmap.height - side) / 2, side, side]
    : [0, 0, bitmap.width, bitmap.height]
  const scale = Math.min(1, maxDimension / Math.max(sw, sh))
  const width = Math.round(sw * scale)
  const height = Math.round(sh * scale)

  const canvas = document.createElement('canvas')
  canvas.width = width
  canvas.height = height
  canvas.getContext('2d')!.drawImage(bitmap, sx, sy, sw, sh, 0, 0, width, height)
  bitmap.close()

  return new Promise((resolve, reject) =>
    canvas.toBlob(b => (b ? resolve(b) : reject(new Error('Could not process image'))), 'image/jpeg', JPEG_QUALITY)
  )
}

/** Upload to `<userId>/<uuid>.jpg` in the public bucket; returns the public URL. */
export async function uploadRankingPhoto(file: File): Promise<string> {
  return uploadPhoto(await resizeImage(file), '')
}

/** Profile photo: square, 512px, stored in the same per-user folder. */
export async function uploadAvatar(file: File): Promise<string> {
  return uploadPhoto(await resizeImage(file, { maxDimension: 512, square: true }), 'avatar-')
}

async function uploadPhoto(blob: Blob, prefix: string): Promise<string> {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) throw new Error('You need to be logged in to upload photos')

  const path = `${user.id}/${prefix}${crypto.randomUUID()}.jpg`
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
