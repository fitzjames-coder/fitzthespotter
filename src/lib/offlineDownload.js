import { supabase } from './supabaseClient'
import { fetchAllRows } from './fetchAllRows'
import { idbSet } from './offlineStore'

const TABLES = ['registrations', 'sightings', 'airlines', 'airports', 'aircraft_types', 'manufacturers', 'notes', 'airport_pins']
const ORDER_COL = { airports: 'iata', notes: 'registration' }

export async function tableCounts() {
  const counts = {}
  for (const t of TABLES) {
    const { count } = await supabase.from(t).select('*', { count: 'exact', head: true })
    counts[t] = count ?? 0
  }
  return counts
}

async function waitForServiceWorker() {
  if (typeof navigator === 'undefined' || !('serviceWorker' in navigator)) return
  try {
    await navigator.serviceWorker.ready
    if (navigator.serviceWorker.controller) return
    await new Promise((resolve) => {
      const done = () => resolve()
      navigator.serviceWorker.addEventListener('controllerchange', done, { once: true })
      setTimeout(done, 3000)
    })
  } catch (e) {
    /* ignore */
  }
}

export async function downloadAll(onProgress) {
  const totals = await tableCounts()
  const grandTotal = Object.values(totals).reduce((a, b) => a + b, 0)
  let done = 0
  const counts = {}
  const byTable = {}
  for (const t of TABLES) {
    const col = ORDER_COL[t] || 'id'
    const { data, error } = await fetchAllRows(() => supabase.from(t).select('*').order(col, { ascending: true }))
    if (error) throw new Error(`${t}: ${error.message}`)
    await idbSet(t, data ?? [])
    byTable[t] = data ?? []
    counts[t] = byTable[t].length
    done += counts[t]
    if (onProgress) onProgress({ done, total: grandTotal, table: t })
  }

  const urls = new Set()
  for (const a of byTable.airlines || []) if (a.logo_url) urls.add(a.logo_url)
  for (const t of byTable.aircraft_types || []) if (t.template_url) urls.add(t.template_url)
  for (const ap of byTable.airports || []) if (ap.header_image_url) urls.add(ap.header_image_url)
  for (const r of byTable.registrations || []) {
    if (Array.isArray(r.photo_urls)) for (const u of r.photo_urls) if (u) urls.add(u)
  }
  const imageList = Array.from(urls)
  const imgTotal = imageList.length
  let imgDone = 0
  const cacheImage = (url) => new Promise((resolve) => {
    const img = new Image()
    img.onload = () => resolve()
    img.onerror = () => resolve()
    img.src = url
  })
  await waitForServiceWorker()
  const BATCH = 6
  for (let i = 0; i < imageList.length; i += BATCH) {
    const chunk = imageList.slice(i, i + BATCH)
    await Promise.all(chunk.map((u) => cacheImage(u)))
    imgDone += chunk.length
    if (onProgress) onProgress({ phase: 'images', imgDone, imgTotal })
  }

  const meta = { downloaded_at: new Date().toISOString(), counts, total: done, images: imgTotal }
  await idbSet('__meta__', meta)
  return meta
}
