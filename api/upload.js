// redeploy touch — refresh env vars
import { S3Client, PutObjectCommand } from '@aws-sdk/client-s3'

export const config = { api: { bodyParser: { sizeLimit: '10mb' } } }

const s3 = new S3Client({
  region: 'auto',
  endpoint: process.env.R2_ENDPOINT,
  credentials: {
    accessKeyId: process.env.R2_ACCESS_KEY_ID,
    secretAccessKey: process.env.R2_SECRET_ACCESS_KEY,
  },
})

export default async function handler(req, res) {
  if (req.method !== 'POST') { res.status(405).json({ error: 'Method not allowed' }); return }
  try {
    const { fileBase64, contentType, keyPrefix } = req.body || {}
    if (!fileBase64 || !contentType) { res.status(400).json({ error: 'Missing file or contentType' }); return }
    const ext = (contentType.split('/')[1] || 'bin').toLowerCase().replace('jpeg', 'jpg')
    const safePrefix = (keyPrefix || 'uploads').replace(/[^a-z0-9/_-]/gi, '').slice(0, 60)
    const key = `${safePrefix}/${Date.now()}-${Math.random().toString(36).slice(2, 8)}.${ext}`
    const buffer = Buffer.from(fileBase64, 'base64')
    await s3.send(new PutObjectCommand({
      Bucket: process.env.R2_BUCKET_NAME,
      Key: key,
      Body: buffer,
      ContentType: contentType,
    }))
    const publicUrl = `${process.env.R2_PUBLIC_URL.replace(/\/$/, '')}/${key}`
    res.status(200).json({ url: publicUrl, key })
  } catch (err) {
    res.status(500).json({ error: err?.message || 'Upload failed' })
  }
}
