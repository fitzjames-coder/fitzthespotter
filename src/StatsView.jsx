import { useEffect, useMemo, useState } from 'react'
import { supabase } from './lib/supabaseClient'

function computeStats(regs) {
  if (!regs.length) {
    return {
      total: 0,
      airlines: 0, manufacturers: 0, types: 0, airports: 0, countries: 0,
      topAirline: null, topType: null, topAirport: null,
      specialLivery: 0, retro: 0, alliance: 0, flownIn: 0, remarks: 0,
      firstSpot: null, latestSpot: null, totalDays: 0,
    }
  }

  const airlineIds = new Set()
  const mfrIds = new Set()
  const typeIds = new Set()
  const airportCodes = new Set()
  const countryNames = new Set()

  const airlineCounts = {}
  const typeCounts = {}
  const airportCounts = {}

  let specialLivery = 0, retro = 0, alliance = 0, flownIn = 0, remarks = 0

  const spotDates = new Set()
  let firstSpotReg = null, latestSpotReg = null

  for (const reg of regs) {
    if (reg.airlines?.id) {
      airlineIds.add(reg.airlines.id)
      const aid = reg.airlines.id
      airlineCounts[aid] = (airlineCounts[aid] ?? 0) + 1
    }
    if (reg.aircraft_types?.manufacturers?.id) {
      mfrIds.add(reg.aircraft_types.manufacturers.id)
    }
    if (reg.aircraft_types?.id) {
      typeIds.add(reg.aircraft_types.id)
      const tid = reg.aircraft_types.id
      typeCounts[tid] = (typeCounts[tid] ?? 0) + 1
    }
    const aps = Array.isArray(reg.airports) ? reg.airports : []
    for (const code of aps) {
      airportCodes.add(code)
      airportCounts[code] = (airportCounts[code] ?? 0) + 1
    }
    if (reg.airlines?.country) countryNames.add(reg.airlines.country)

    const s = reg.statuses ?? {}
    if (s.special_livery) specialLivery++
    if (s.retro) retro++
    if (s.alliance) alliance++
    if (s.flown_in) flownIn++
    if (s.remarks) remarks++

    if (reg.first_spotted) {
      spotDates.add(reg.first_spotted)
      if (!firstSpotReg || reg.first_spotted < firstSpotReg.first_spotted) firstSpotReg = reg
      if (!latestSpotReg || reg.first_spotted > latestSpotReg.first_spotted) latestSpotReg = reg
    }
  }

  function topKey(counts) {
    let best = null, bestVal = 0
    for (const [k, v] of Object.entries(counts)) {
      if (v > bestVal) { best = k; bestVal = v }
    }
    return best ? { key: best, count: bestVal } : null
  }

  const topAirlineEntry = topKey(airlineCounts)
  const topAirline = topAirlineEntry
    ? { name: regs.find((r) => String(r.airlines?.id) === String(topAirlineEntry.key))?.airlines?.name ?? '—', count: topAirlineEntry.count }
    : null

  const topTypeEntry = topKey(typeCounts)
  const topType = topTypeEntry
    ? { name: regs.find((r) => String(r.aircraft_types?.id) === String(topTypeEntry.key))?.aircraft_types?.name ?? '—', count: topTypeEntry.count }
    : null

  const topAirportEntry = topKey(airportCounts)
  const topAirport = topAirportEntry
    ? { name: topAirportEntry.key, count: topAirportEntry.count }
    : null

  return {
    total: regs.length,
    airlines: airlineIds.size,
    manufacturers: mfrIds.size,
    types: typeIds.size,
    airports: airportCodes.size,
    countries: countryNames.size,
    topAirline, topType, topAirport,
    specialLivery, retro, alliance, flownIn, remarks,
    firstSpot: firstSpotReg ? { date: firstSpotReg.first_spotted, reg: firstSpotReg.registration } : null,
    latestSpot: latestSpotReg ? { date: latestSpotReg.first_spotted, reg: latestSpotReg.registration } : null,
    totalDays: spotDates.size,
  }
}

function StatCard({ title, children }) {
  return (
    <div className="stat-card">
      <p className="stat-card__title">{title}</p>
      {children}
    </div>
  )
}

function MiniTile({ label, value }) {
  return (
    <div className="stat-mini-tile">
      <span className="stat-mini-tile__value">{value}</span>
      <span className="stat-mini-tile__label">{label}</span>
    </div>
  )
}

function MostRow({ label, name, count }) {
  return (
    <div className="stat-most-row">
      <span className="stat-most-row__label">{label}</span>
      <span className="stat-most-row__name">{name ?? '—'}</span>
      {count != null && <span className="stat-most-row__count">{count}</span>}
    </div>
  )
}

function StatusTally({ label, count }) {
  return (
    <div className="stat-tally-row">
      <span className="stat-tally-row__label">{label}</span>
      <span className="stat-tally-row__count">{count}</span>
    </div>
  )
}

function MilestoneRow({ label, date, reg }) {
  return (
    <div className="stat-milestone-row">
      <span className="stat-milestone-row__label">{label}</span>
      <div className="stat-milestone-row__right">
        <span className="stat-milestone-row__date">{date ?? '—'}</span>
        {reg && <span className="stat-milestone-row__reg">{reg}</span>}
      </div>
    </div>
  )
}

export default function StatsView({ onBack }) {
  const [regs, setRegs] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)

  useEffect(() => {
    if (!supabase) {
      setError('Supabase is not configured.')
      setLoading(false)
      return
    }
    supabase
      .from('registrations')
      .select(`
        id, registration, first_spotted, airports, statuses,
        airlines ( id, name, country ),
        aircraft_types ( id, name, manufacturers ( id, name ) )
      `)
      .then(({ data, error: err }) => {
        if (err) setError(err.message)
        else setRegs(data ?? [])
        setLoading(false)
      })
  }, [])

  const stats = useMemo(() => computeStats(regs), [regs])

  return (
    <div className="page search-page">
      <header className="stats-top-bar">
        <button className="stats-top-bar__back" onClick={onBack} aria-label="Back to search">
          ‹ Back
        </button>
        <h1 className="stats-top-bar__title">Stats</h1>
      </header>

      <main className="content stats-content">
        {loading && <p className="search-state">Loading…</p>}
        {error && <p className="search-state search-state--error">{error}</p>}
        {!loading && !error && (
          <>
            <div className="stats-headline">
              <span className="stats-headline__number">{stats.total}</span>
              <span className="stats-headline__label">Total Unique Registrations</span>
            </div>

            <StatCard title="Counts">
              <div className="stat-mini-tiles">
                <MiniTile label="Airlines"      value={stats.airlines}      />
                <MiniTile label="Manufacturers" value={stats.manufacturers} />
                <MiniTile label="Types"         value={stats.types}         />
                <MiniTile label="Airports"      value={stats.airports}      />
                <MiniTile label="Countries"     value={stats.countries}     />
              </div>
            </StatCard>

            <StatCard title="Most-spotted">
              <MostRow label="Airline" name={stats.topAirline?.name}  count={stats.topAirline?.count}  />
              <MostRow label="Type"    name={stats.topType?.name}     count={stats.topType?.count}     />
              <MostRow label="Airport" name={stats.topAirport?.name}  count={stats.topAirport?.count}  />
            </StatCard>

            <StatCard title="Special status">
              <StatusTally label="Special livery" count={stats.specialLivery} />
              <StatusTally label="Retro"           count={stats.retro}         />
              <StatusTally label="Alliance"        count={stats.alliance}      />
              <StatusTally label="Flown-in"        count={stats.flownIn}       />
              <StatusTally label="Remarks"         count={stats.remarks}       />
            </StatCard>

            <StatCard title="Milestones">
              <MilestoneRow label="First spot"   date={stats.firstSpot?.date}  reg={stats.firstSpot?.reg}  />
              <MilestoneRow label="Latest spot"  date={stats.latestSpot?.date} reg={stats.latestSpot?.reg} />
              <div className="stat-milestone-row">
                <span className="stat-milestone-row__label">Days spotting</span>
                <div className="stat-milestone-row__right">
                  <span className="stat-milestone-row__date">{stats.totalDays}</span>
                  <span className="stat-milestone-row__reg">unique days</span>
                </div>
              </div>
            </StatCard>
          </>
        )}
      </main>
    </div>
  )
}
