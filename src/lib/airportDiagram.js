import { supabase } from './supabaseClient'

async function overpass(query) {
  const res = await fetch('/api/overpass', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ query }),
  })
  if (!res.ok) {
    let detail = `proxy ${res.status}`
    try {
      const body = await res.json()
      detail = JSON.stringify(body.detail ?? body.error ?? body)
    } catch {}
    throw new Error(detail)
  }
  return res.json()
}

function clampLat(v) { return Math.max(-90, Math.min(90, v)) }
function clampLon(v) { return Math.max(-180, Math.min(180, v)) }

export async function getAirportDiagram(airport) {
  // a) Cache first
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

  // b–d) Fetch via same-origin proxy
  try {
    // b) Locate the aerodrome
    const icaoLine = airport.icao
      ? `  nwr["aeroway"="aerodrome"]["icao"="${airport.icao}"];`
      : ''
    const locateQuery = `[out:json][timeout:15];
( nwr["aeroway"="aerodrome"]["iata"="${airport.iata}"];
${icaoLine} );
out center 1;`

    const locateData = await overpass(locateQuery)
    const el = (locateData.elements ?? [])[0]

    if (!el) {
      return cacheAndReturn(airport.iata, 'unavailable', null)
    }

    let lat, lon
    if (el.center) {
      lat = el.center.lat; lon = el.center.lon
    } else if (el.lat != null) {
      lat = el.lat; lon = el.lon
    } else if (el.bounds) {
      lat = (el.bounds.minlat + el.bounds.maxlat) / 2
      lon = (el.bounds.minlon + el.bounds.maxlon) / 2
    } else {
      return cacheAndReturn(airport.iata, 'unavailable', null)
    }

    // c) Bbox aeroway query
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

    const waysData = await overpass(waysQuery)

    // d) Shape result
    const shaped = (waysData.elements ?? [])
      .filter((w) => Array.isArray(w.geometry) && w.geometry.length > 1)
      .map((w) => ({
        aeroway: w.tags.aeroway,
        ref: w.tags.ref ?? null,
        geometry: w.geometry.map((p) => ({ lat: p.lat, lon: p.lon })),
      }))

    if (shaped.length === 0) {
      return cacheAndReturn(airport.iata, 'unavailable', null)
    }

    return cacheAndReturn(airport.iata, 'ok', shaped)
  } catch (err) {
    // Proxy/network failure — do NOT cache, allow retry
    return { status: 'error', geometry: null, cached: false, detail: err.message }
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
