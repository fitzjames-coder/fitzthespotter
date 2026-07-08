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

export async function offlineRegProfile(regId) {
  const registrations = await idbGet('registrations')
  if (!registrations) return null
  const raw = registrations.find((r) => r.id === regId)
  if (!raw) return { notFound: true }
  const types = (await idbGet('aircraft_types')) || []
  const mfrs = (await idbGet('manufacturers')) || []
  const sightings = (await idbGet('sightings')) || []
  const t = types.find((ty) => ty.id === raw.aircraft_type_id) || null
  const mfr = t ? (mfrs.find((m) => m.id === t.manufacturer_id) || null) : null
  const aircraft_types = t
    ? { id: t.id, name: t.name, template_url: t.template_url, manufacturers: mfr ? { id: mfr.id, name: mfr.name } : null }
    : null
  const reg = {
    id: raw.id,
    registration: raw.registration,
    airline_id: raw.airline_id,
    first_spotted: raw.first_spotted,
    airports: raw.airports,
    remark: raw.remark,
    statuses: raw.statuses,
    flagged: raw.flagged,
    photo_urls: raw.photo_urls,
    msn: raw.msn,
    build_date: raw.build_date,
    aircraft_types,
  }
  const regSightings = sightings.filter((s) => s.registration_id === regId)
  const dated = regSightings.filter((s) => s.spotted_on).sort((a, b) => (b.spotted_on || '').localeCompare(a.spotted_on || ''))
  const src = dated[0] || regSightings[0] || null
  const lastSighting = src ? { airport: src.airport, spotted_on: src.spotted_on } : null
  return { reg, lastSighting, sightingCount: regSightings.length }
}

export async function offlineAirports() {
  const airports = await idbGet('airports')
  if (!airports) return null
  return [...airports].sort((a, b) => (a.iata || '').localeCompare(b.iata || ''))
}

export async function offlineAirportStats(iata) {
  const sightings = await idbGet('sightings')
  if (!sightings) return null
  const registrations = (await idbGet('registrations')) || []
  const airlines = (await idbGet('airlines')) || []
  const regById = new Map(registrations.map((r) => [r.id, r]))
  const airlineById = new Map(airlines.map((a) => [a.id, a]))
  const rows = sightings.filter((s) => s.airport === iata)
  const dates = rows.map((r) => r.spotted_on).filter(Boolean).sort()
  const airlineMap = new Map()
  for (const row of rows) {
    const reg = regById.get(row.registration_id)
    const al = reg ? airlineById.get(reg.airline_id) : null
    if (al && al.id && !airlineMap.has(al.id)) {
      airlineMap.set(al.id, { id: al.id, name: al.name, logo_url: al.logo_url ?? null })
    }
  }
  const gallery = Array.from(airlineMap.values()).sort((a, b) => a.name.localeCompare(b.name))
  return { sightingCount: rows.length, firstHere: dates[0] ?? null, recentHere: dates[dates.length - 1] ?? null, gallery }
}

export async function offlineAllRegs() {
  const registrations = await idbGet('registrations')
  if (!registrations) return null
  const airlines = (await idbGet('airlines')) || []
  const types = (await idbGet('aircraft_types')) || []
  const mfrs = (await idbGet('manufacturers')) || []
  const airlineById = new Map(airlines.map((a) => [a.id, a]))
  const typeById = new Map(types.map((t) => [t.id, t]))
  const mfrById = new Map(mfrs.map((m) => [m.id, m]))
  return registrations.map((r) => {
    const al = airlineById.get(r.airline_id) || null
    const t = typeById.get(r.aircraft_type_id) || null
    const m = t ? (mfrById.get(t.manufacturer_id) || null) : null
    return {
      id: r.id,
      registration: r.registration,
      airports: r.airports,
      remark: r.remark,
      statuses: r.statuses,
      flagged: r.flagged,
      airlines: al ? { id: al.id, name: al.name, country: al.country, country_flag: al.country_flag, is_closed: al.is_closed } : null,
      aircraft_types: t ? { id: t.id, name: t.name, manufacturers: m ? { id: m.id, name: m.name } : null } : null,
    }
  })
}

export async function offlineStatsData() {
  const registrations = await idbGet('registrations')
  if (!registrations) return null
  const airlines = (await idbGet('airlines')) || []
  const types = (await idbGet('aircraft_types')) || []
  const mfrs = (await idbGet('manufacturers')) || []
  const sightingsRaw = (await idbGet('sightings')) || []
  const airportsRaw = (await idbGet('airports')) || []
  const airlineById = new Map(airlines.map((a) => [a.id, a]))
  const typeById = new Map(types.map((t) => [t.id, t]))
  const mfrById = new Map(mfrs.map((m) => [m.id, m]))
  const regData = registrations.map((r) => {
    const al = airlineById.get(r.airline_id) || null
    const t = typeById.get(r.aircraft_type_id) || null
    const m = t ? (mfrById.get(t.manufacturer_id) || null) : null
    return {
      id: r.id, registration: r.registration, msn: r.msn, first_spotted: r.first_spotted, airports: r.airports, statuses: r.statuses,
      airlines: al ? { id: al.id, name: al.name, country: al.country, logo_url: al.logo_url } : null,
      aircraft_types: t ? { id: t.id, name: t.name, manufacturers: m ? { id: m.id, name: m.name, logo_url: m.logo_url } : null } : null,
    }
  })
  const sightData = sightingsRaw.map((s) => ({ spotted_on: s.spotted_on }))
  const apData = airportsRaw.map((a) => ({ iata: a.iata, country: a.country }))
  return { regData, sightData, apData }
}

export async function offlineSearchAirlines(q) {
  const airlines = (await idbGet('airlines')) || []
  const term = (q || '').toLowerCase()
  return airlines
    .filter((a) => (a.name || '').toLowerCase().includes(term))
    .sort((a, b) => (a.name || '').localeCompare(b.name || ''))
    .slice(0, 8)
    .map((a) => ({ id: a.id, label: a.name }))
}

export async function offlineSearchManufacturers(q) {
  const mfrs = (await idbGet('manufacturers')) || []
  const term = (q || '').toLowerCase()
  return mfrs
    .filter((m) => (m.name || '').toLowerCase().includes(term))
    .sort((a, b) => (a.name || '').localeCompare(b.name || ''))
    .slice(0, 8)
    .map((m) => ({ id: m.id, label: m.name }))
}

export async function offlineSearchTypes(q, manufacturerId) {
  const types = (await idbGet('aircraft_types')) || []
  const term = (q || '').toLowerCase()
  return types
    .filter((t) => (!manufacturerId || t.manufacturer_id === manufacturerId) && (t.name || '').toLowerCase().includes(term))
    .sort((a, b) => (a.name || '').localeCompare(b.name || ''))
    .slice(0, 8)
    .map((t) => ({ id: t.id, label: t.name }))
}

export async function offlineAirportExists(code) {
  const airports = (await idbGet('airports')) || []
  return airports.some((a) => a.iata === code)
}
