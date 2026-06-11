import { supabase } from './supabaseClient'

const PRIMARY_ENDPOINT = 'https://overpass-api.de/api/interpreter'
const FALLBACK_ENDPOINT = 'https://overpass.kumi.systems/api/interpreter'

async function overpassPost(query) {
  const body = 'data=' + encodeURIComponent(query)
  const opts = { method: 'POST', headers: { 'Content-Type': 'application/x-www-form-urlencoded' }, body }

  let res
  try {
    res = await fetch(PRIMARY_ENDPOINT, opts)
    if (!res.ok) throw new Error(`primary ${res.status}`)
  } catch {
    res = await fetch(FALLBACK_ENDPOINT, opts)
    if (!res.ok) throw new Error(`fallback ${res.status}`)
  }
  return res.json()
}

function clampLat(v) { return Math.max(-90, Math.min(90, v)) }
function clampLon(v) { return Math.max(-180, Math.min(180, v)) }

export async function getAirportDiagram(airport) {
  // a) Check cache
  if (supabase) {
    const { data: cached } = await supabase
      .from('airport_diagrams')
      .select('status, geometry')
      .eq('iata', airport.iata)
      .maybeSingle()

    if (cached) {
      return { status: cached.status, geometry: cached.geometry, cached: true }
    }
  }

  // b) Fetch from OSM Overpass
  try {
    // Step 1 — locate the aerodrome
    const icaoLine = airport.icao
      ? `  nwr["aeroway"="aerodrome"]["icao"="${airport.icao}"];`
      : ''
    const locateQuery = `[out:json][timeout:25];
( nwr["aeroway"="aerodrome"]["iata"="${airport.iata}"];
${icaoLine} );
out center 1;`

    const locateData = await overpassPost(locateQuery)
    const elements = locateData.elements ?? []
    const el = elements[0]

    if (!el) {
      return await cacheAndReturn(airport.iata, 'unavailable', null)
    }

    // Extract center point
    let lat, lon
    if (el.center) {
      lat = el.center.lat
      lon = el.center.lon
    } else if (el.lat != null) {
      lat = el.lat
      lon = el.lon
    } else if (el.bounds) {
      lat = (el.bounds.minlat + el.bounds.maxlat) / 2
      lon = (el.bounds.minlon + el.bounds.maxlon) / 2
    } else {
      return await cacheAndReturn(airport.iata, 'unavailable', null)
    }

    // Step 2 — fetch aeroways in bounding box
    const south = clampLat(lat - 0.06)
    const north = clampLat(lat + 0.06)
    const west  = clampLon(lon - 0.09)
    const east  = clampLon(lon + 0.09)
    const bbox  = `${south},${west},${north},${east}`

    const waysQuery = `[out:json][timeout:25];
( way["aeroway"="runway"](${bbox});
  way["aeroway"="taxiway"](${bbox});
  way["aeroway"="apron"](${bbox}); );
out geom;`

    const waysData = await overpassPost(waysQuery)

    // c) Shape the result
    const shaped = (waysData.elements ?? [])
      .filter((w) => Array.isArray(w.geometry) && w.geometry.length > 1)
      .map((w) => ({
        aeroway: w.tags.aeroway,
        geometry: w.geometry.map((p) => ({ lat: p.lat, lon: p.lon })),
      }))

    // d) Decide status
    if (shaped.length === 0) {
      return await cacheAndReturn(airport.iata, 'unavailable', null)
    }

    return await cacheAndReturn(airport.iata, 'ok', shaped)
  } catch {
    // Both endpoints failed — do NOT cache, allow retry
    return { status: 'error', geometry: null, cached: false }
  }
}

async function cacheAndReturn(iata, status, geometry) {
  if (supabase) {
    await supabase.from('airport_diagrams').upsert({
      iata,
      status,
      geometry,
      fetched_at: new Date().toISOString(),
    })
  }
  return { status, geometry, cached: false }
}
