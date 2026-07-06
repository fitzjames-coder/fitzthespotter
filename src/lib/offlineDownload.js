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

export async function downloadAll(onProgress) {
  const totals = await tableCounts()
  const grandTotal = Object.values(totals).reduce((a, b) => a + b, 0)
  let done = 0
  const counts = {}
  for (const t of TABLES) {
    const col = ORDER_COL[t] || 'id'
    const { data, error } = await fetchAllRows(() => supabase.from(t).select('*').order(col, { ascending: true }))
    if (error) throw new Error(`${t}: ${error.message}`)
    await idbSet(t, data ?? [])
    counts[t] = (data ?? []).length
    done += counts[t]
    if (onProgress) onProgress({ done, total: grandTotal, table: t })
  }
  const meta = { downloaded_at: new Date().toISOString(), counts, total: done }
  await idbSet('__meta__', meta)
  return meta
}
