const ENDPOINTS = [
  'https://overpass-api.de/api/interpreter',
  'https://overpass.kumi.systems/api/interpreter',
  'https://overpass.private.coffee/api/interpreter',
]
const TIMEOUT_MS = 20000
const USER_AGENT = 'Fitzthespotter/1.0 (https://fitzthespotter.vercel.app)'

const COMMON_HEADERS = {
  'Content-Type': 'application/x-www-form-urlencoded',
  'User-Agent': USER_AGENT,
  'Accept': '*/*',
}

function sleep(ms) {
  return new Promise((r) => setTimeout(r, ms))
}

async function fetchOnce(url, formBody) {
  const controller = new AbortController()
  const timer = setTimeout(() => controller.abort(), TIMEOUT_MS)
  try {
    const res = await fetch(url, {
      method: 'POST',
      headers: COMMON_HEADERS,
      body: formBody,
      signal: controller.signal,
    })
    clearTimeout(timer)
    return res
  } catch (err) {
    clearTimeout(timer)
    throw err
  }
}

async function makeEndpointPromise(url, formBody) {
  let res
  try {
    res = await fetchOnce(url, formBody)
  } catch (err) {
    throw new Error(`${url} -> ${err.name}:${err.message}`)
  }

  if (res.ok) return res.json()

  // Retry once on 429 or 5xx
  if (res.status === 429 || res.status >= 500) {
    await sleep(1500)
    let res2
    try {
      res2 = await fetchOnce(url, formBody)
    } catch (err) {
      throw new Error(`${url} -> ${err.name}:${err.message}`)
    }
    if (res2.ok) return res2.json()
    throw new Error(`${url} -> HTTP ${res2.status}`)
  }

  throw new Error(`${url} -> HTTP ${res.status}`)
}

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

export default async function handler(req, res) {
  // GET self-test: probe each endpoint individually, never throw
  if (req.method === 'GET') {
    const selfTestQuery = '[out:json][timeout:10];out count;'
    const formBody = 'data=' + encodeURIComponent(selfTestQuery)
    const results = await Promise.allSettled(
      ENDPOINTS.map(async (url) => {
        try {
          const r = await fetchOnce(url, formBody)
          return { url, ok: r.ok, status: r.status, error: null }
        } catch (err) {
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
