const ENDPOINTS = [
  'https://overpass-api.de/api/interpreter',
  'https://overpass.kumi.systems/api/interpreter',
  'https://overpass.private.coffee/api/interpreter',
]
const TIMEOUT_MS = 20000

async function readBody(req) {
  if (req.body !== undefined) {
    if (typeof req.body === 'object' && req.body !== null) return req.body
    if (typeof req.body === 'string') return JSON.parse(req.body)
  }
  // Raw stream (no body parser middleware)
  return new Promise((resolve, reject) => {
    let raw = ''
    req.on('data', (chunk) => { raw += chunk })
    req.on('end', () => {
      try { resolve(JSON.parse(raw)) } catch { reject(new Error('bad_json')) }
    })
    req.on('error', reject)
  })
}

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(400).json({ error: 'POST only' })
  }

  let body
  try {
    body = await readBody(req)
  } catch {
    return res.status(400).json({ error: 'invalid_body' })
  }

  const { query } = body ?? {}
  if (!query || typeof query !== 'string') {
    return res.status(400).json({ error: 'missing_query' })
  }

  try {
    const formBody = 'data=' + encodeURIComponent(query)

    const perEndpoint = ENDPOINTS.map((url) => {
      const controller = new AbortController()
      const timer = setTimeout(() => controller.abort(), TIMEOUT_MS)
      return fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        body: formBody,
        signal: controller.signal,
      })
        .then((r) => {
          clearTimeout(timer)
          if (!r.ok) throw new Error(`${url} ${r.status}`)
          return r.json()
        })
        .catch((err) => {
          clearTimeout(timer)
          throw err
        })
    })

    const data = await Promise.any(perEndpoint)
    return res.status(200).json(data)
  } catch (err) {
    if (err instanceof AggregateError) {
      return res.status(502).json({ error: 'overpass_unreachable' })
    }
    return res.status(500).json({ error: 'overpass_error' })
  }
}
