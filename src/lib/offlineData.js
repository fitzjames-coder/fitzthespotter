import { idbGet } from './offlineStore'

export async function offlineAirlinesTab() {
  const airlines = await idbGet('airlines')
  if (!airlines) return null
  const registrations = (await idbGet('registrations')) || []
  const counts = {}
  for (const r of registrations) counts[r.airline_id] = (counts[r.airline_id] ?? 0) + 1
  return { airlines, counts }
}

export async function offlineAirlineRegs(airlineId) {
  const registrations = await idbGet('registrations')
  if (!registrations) return null
  const types = (await idbGet('aircraft_types')) || []
  const mfrs = (await idbGet('manufacturers')) || []
  const sightings = (await idbGet('sightings')) || []
  const typeById = new Map(types.map((t) => [t.id, t]))
  const mfrById = new Map(mfrs.map((m) => [m.id, m]))
  const regs = registrations
    .filter((r) => r.airline_id === airlineId)
    .map((r) => {
      const t = typeById.get(r.aircraft_type_id)
      let aircraft_types = null
      if (t) {
        const m = mfrById.get(t.manufacturer_id)
        aircraft_types = { id: t.id, name: t.name, manufacturers: m ? { id: m.id, name: m.name } : null }
      }
      return { ...r, aircraft_types }
    })
    .sort((a, b) => {
      const fa = a.first_spotted || '9999-99-99'
      const fb = b.first_spotted || '9999-99-99'
      if (fa !== fb) return fa < fb ? -1 : 1
      return (a.registration || '') < (b.registration || '') ? -1 : 1
    })
  const regIds = new Set(regs.map((r) => r.id))
  const sightingCount = sightings.filter((s) => regIds.has(s.registration_id)).length
  return { regs, sightingCount }
}
