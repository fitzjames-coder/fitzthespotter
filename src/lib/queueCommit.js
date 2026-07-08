import { supabase } from './supabaseClient'
import { writeQueueGetAll, writeQueueRemove } from './writeQueue'

async function commitOne(entry) {
  const trimmed = (entry.registration || '').trim().toUpperCase()
  if (!trimmed) return { ok: false, reason: 'Missing registration number.' }
  if (!entry.payload?.airline_id) return { ok: false, reason: 'Missing airline — delete this entry and re-enter it.' }

  const { data: existing } = await supabase
    .from('registrations')
    .select('id, registration, airlines ( name )')
    .eq('registration', trimmed)
    .maybeSingle()
  if (existing) {
    const who = existing.airlines?.name ? ` (${existing.airlines.name})` : ''
    return { ok: false, reason: `Already exists in your logbook${who} — review manually, then delete this entry.` }
  }

  const { data: newReg, error: regErr } = await supabase
    .from('registrations')
    .insert(entry.payload)
    .select('id')
    .single()
  if (regErr) return { ok: false, reason: regErr.message }

  const s = entry.sighting || {}
  const codes = Array.isArray(s.airports) && s.airports.length > 0 ? s.airports : [null]
  const sightingRows = codes.map((code) => ({
    registration_id: newReg.id,
    spotted_on: s.spotted_on || null,
    time_block: s.time_block || null,
    southern_hemisphere: Boolean(s.southern_hemisphere),
    airport: code,
    special_livery: Boolean(s.special_livery),
    retro: Boolean(s.retro),
    alliance: Boolean(s.alliance),
    livery_name: s.livery_name || null,
  }))
  const { error: sErr } = await supabase.from('sightings').insert(sightingRows)
  if (sErr) return { ok: false, reason: 'Registration saved but sightings failed: ' + sErr.message }

  if (entry.flown_in && entry.airline_id) {
    await supabase.from('airlines').update({ flown_in: true }).eq('id', entry.airline_id)
  }
  return { ok: true }
}

export async function commitQueue(onProgress) {
  const all = await writeQueueGetAll()
  const results = []
  let i = 0
  for (const entry of all) {
    i += 1
    if (onProgress) onProgress({ current: i, total: all.length, registration: entry.registration })
    try {
      const res = await commitOne(entry)
      if (res.ok) {
        await writeQueueRemove(entry.id)
        results.push({ id: entry.id, registration: entry.registration, ok: true })
      } else {
        results.push({ id: entry.id, registration: entry.registration, ok: false, reason: res.reason })
      }
    } catch (e) {
      results.push({ id: entry.id, registration: entry.registration, ok: false, reason: (e && e.message) || 'Unknown error' })
    }
  }
  return results
}
