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
  return new Promise((resolve, reject) => {
    let raw = ''
    req.on('data', (chunk) => { raw += chunk })
    req.on('end', () => {
      try { resolve(JSON.parse(raw)) } catch { reject(new Error('bad_json')) }
    })
    req.on('error', reject)
  })
}

function makeEndpointPromise(url, formBody) {
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
      if (!r.ok) throw new Error(`${url} -> HTTP ${r.status}`)
      return r.json()
    })
    .catch((err) => {
      clearTimeout(timer)
      if (err.message.includes('->')) throw err
      throw new Error(`${url} -> ${err.name}:${err.message}`)
    })
}

export default async function handler(req, res) {
  // GET self-test: probe all endpoints with a trivial query
  if (req.method === 'GET') {
    const selfTestQuery = '[out:json][timeout:10];out count;'
    const formBody = 'data=' + encodeURIComponent(selfTestQuery)
    const results = await Promise.allSettled(
      ENDPOINTS.map(async (url) => {
        const controller = new AbortController()
        const timer = setTimeout(() => controller.abort(), TIMEOUT_MS)
        try {
          const r = await fetch(url, {
            method: 'POST',
            headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
            body: formBody,
            signal: controller.signal,
          })
          clearTimeout(timer)
          return { url, ok: r.ok, status: r.status, error: null }
        } catch (err) {
          clearTimeout(timer)
          return { url, ok: false, status: null, error: `${err.name}:${err.message}` }
        }
      })
    )
    const selftest = results.map((r) => r.value ?? { url: '?', ok: false, status: null, error: 'unexpected' })
    return res.status(200).json({ selftest })
  }

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
    const perEndpoint = ENDPOINTS.map((url) => makeEndpointPromise(url, formBody))

    const data = await Promise.any(perEndpoint)
    return res.status(200).json(data)
  } catch (err) {
    if (err instanceof AggregateError) {
      const detail = err.errors.map((e) => e.message)
      return res.status(502).json({ error: 'overpass_unreachable', detail })
    }
    return res.status(500).json({ error: 'overpass_error', detail: String(err?.message ?? err) })
  }
}
