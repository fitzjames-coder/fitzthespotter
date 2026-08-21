import type { VercelRequest, VercelResponse } from '@vercel/node'
import sharp from 'sharp'

const WIDTH = 126
const HEIGHT = 84
const FETCH_TIMEOUT_MS = 5_000

function noPhoto(res: VercelResponse, status: number): void {
  res.status(status).json({ photo: false })
}

async function fetchWithTimeout(url: string): Promise<Response> {
  const controller = new AbortController()
  const timer = setTimeout(() => controller.abort(), FETCH_TIMEOUT_MS)
  try {
    return await fetch(url, { signal: controller.signal })
  } finally {
    clearTimeout(timer)
  }
}

export default async function handler(req: VercelRequest, res: VercelResponse): Promise<void> {
  if (req.method !== 'GET') {
    res.status(405).json({ error: 'Method not allowed' })
    return
  }

  const hex = typeof req.query.hex === 'string' ? req.query.hex.trim().toLowerCase() : ''
  if (!hex) {
    res.status(400).json({ error: 'hex query parameter required' })
    return
  }

  // 1. Query planespotters.net
  let psRes: Response
  try {
    psRes = await fetchWithTimeout(`https://api.planespotters.net/pub/photos/hex/${encodeURIComponent(hex)}`)
  } catch {
    return noPhoto(res, 502)
  }

  if (!psRes.ok) {
    return noPhoto(res, 502)
  }

  let psBody: { photos?: Array<{ thumbnail_large?: { src?: string }, photographer?: string }> }
  try {
    psBody = await psRes.json()
  } catch {
    return noPhoto(res, 502)
  }

  const photos = psBody?.photos
  if (!Array.isArray(photos) || photos.length === 0) {
    return noPhoto(res, 404)
  }

  const first = photos[0]

  // 4. No credit → never serve
  const credit = (first?.photographer ?? '').trim()
  if (!credit) {
    return noPhoto(res, 404)
  }

  const thumbUrl = first?.thumbnail_large?.src ?? ''
  if (!thumbUrl) {
    return noPhoto(res, 404)
  }

  // 3. Fetch + transcode thumbnail
  let imgRes: Response
  try {
    imgRes = await fetchWithTimeout(thumbUrl)
  } catch {
    return noPhoto(res, 502)
  }

  if (!imgRes.ok) {
    return noPhoto(res, 502)
  }

  let imgBuffer: Buffer
  try {
    imgBuffer = Buffer.from(await imgRes.arrayBuffer())
  } catch {
    return noPhoto(res, 502)
  }

  // Resize cover → 126×84, then extract raw RGB, convert to RGB565 big-endian
  let rawRgb: Buffer
  try {
    rawRgb = await sharp(imgBuffer)
      .resize(WIDTH, HEIGHT, { fit: 'cover', position: 'centre' })
      .removeAlpha()
      .raw()
      .toBuffer()
  } catch {
    return noPhoto(res, 502)
  }

  // Pack RGB888 → RGB565 big-endian (2 bytes per pixel)
  const pixelCount = WIDTH * HEIGHT
  const rgb565 = Buffer.allocUnsafe(pixelCount * 2)
  for (let i = 0; i < pixelCount; i++) {
    const r = rawRgb[i * 3]
    const g = rawRgb[i * 3 + 1]
    const b = rawRgb[i * 3 + 2]
    const word = ((r & 0xf8) << 8) | ((g & 0xfc) << 3) | (b >> 3)
    rgb565[i * 2] = (word >> 8) & 0xff      // high byte
    rgb565[i * 2 + 1] = word & 0xff          // low byte
  }

  res.status(200)
  res.setHeader('Content-Type', 'application/octet-stream')
  res.setHeader('X-Photo-Width', String(WIDTH))
  res.setHeader('X-Photo-Height', String(HEIGHT))
  res.setHeader('X-Photo-Credit', credit)
  res.end(rgb565)
}
