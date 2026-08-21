import type { VercelRequest, VercelResponse } from '@vercel/node'

const WIDTH = 126
const HEIGHT = 84
const FETCH_TIMEOUT_MS = 5_000

function noPhoto(res: VercelResponse, status: number): void {
  res.status(status).json({ photo: false })
}

const UA = 'Fitzthespotter-TALLY/1.0 (+https://fitzthespotter.vercel.app)'

async function fetchWithTimeout(url: string, headers?: Record<string, string>): Promise<Response> {
  const controller = new AbortController()
  const timer = setTimeout(() => controller.abort(), FETCH_TIMEOUT_MS)
  try {
    return await fetch(url, {
      signal: controller.signal,
      headers: { 'User-Agent': UA, ...headers },
    })
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

  // Lazy sharp import — avoids module-scope load failure if native binding missing at boot
  let sharp: typeof import('sharp')
  try {
    sharp = (await import('sharp')).default as unknown as typeof import('sharp')
  } catch (err) {
    console.error('[tally/photo] sharp load failed:', err)
    return noPhoto(res, 502)
  }

  // 1. Query planespotters.net
  let psRes: Response
  try {
    psRes = await fetchWithTimeout(
      `https://api.planespotters.net/pub/photos/hex/${encodeURIComponent(hex)}`,
      { Accept: 'application/json' }
    )
  } catch (err) {
    console.error('[tally/photo] planespotters fetch failed:', err)
    return noPhoto(res, 502)
  }

  if (!psRes.ok) {
    let psErrBody = ''
    try { psErrBody = (await psRes.text()).slice(0, 200) } catch { /* ignore */ }
    console.error('[tally/photo] planespotters non-ok status:', psRes.status, psErrBody)
    return noPhoto(res, 502)
  }

  let psBody: { photos?: Array<{ thumbnail_large?: { src?: string }; photographer?: string }> }
  try {
    psBody = await psRes.json()
  } catch (err) {
    console.error('[tally/photo] planespotters json parse failed:', err)
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

  // 3. Fetch thumbnail
  let imgRes: Response
  try {
    imgRes = await fetchWithTimeout(thumbUrl, { Accept: 'image/jpeg' })
  } catch (err) {
    console.error('[tally/photo] thumbnail fetch failed:', err)
    return noPhoto(res, 502)
  }

  if (!imgRes.ok) {
    console.error('[tally/photo] thumbnail non-ok status:', imgRes.status)
    return noPhoto(res, 502)
  }

  let imgBuffer: Buffer
  try {
    imgBuffer = Buffer.from(await imgRes.arrayBuffer())
  } catch (err) {
    console.error('[tally/photo] thumbnail buffer read failed:', err)
    return noPhoto(res, 502)
  }

  // Resize cover → 126×84, extract raw RGB
  let rawRgb: Buffer
  try {
    rawRgb = await sharp(imgBuffer)
      .resize(WIDTH, HEIGHT, { fit: 'cover', position: 'centre' })
      .removeAlpha()
      .raw()
      .toBuffer()
  } catch (err) {
    console.error('[tally/photo] transcode failed:', err)
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
    rgb565[i * 2] = (word >> 8) & 0xff
    rgb565[i * 2 + 1] = word & 0xff
  }

  res.status(200)
  res.setHeader('Content-Type', 'application/octet-stream')
  res.setHeader('X-Photo-Width', String(WIDTH))
  res.setHeader('X-Photo-Height', String(HEIGHT))
  res.setHeader('X-Photo-Credit', credit)
  res.end(rgb565)
}
