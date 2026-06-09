import { useEffect, useMemo, useState } from 'react'
import { supabase } from './lib/supabaseClient'

function computeStats(regs, airportCountryByIata = {}) {
  if (!regs.length) {
    return {
      total: 0,
      airlines: 0, manufacturers: 0, types: 0, airports: 0, countries: 0, airportCountries: 0,
      topAirline: null, topType: null, topAirport: null,
      top3Airlines: [], top3Types: [], top3Airports: [],
      specialLivery: 0, retro: 0, alliance: 0, flownIn: 0, remarks: 0,
      firstSpot: null, latestSpot: null, totalDays: 0,
      airlinesSpotted: [], manufacturerBreakdown: [],
    }
  }

  const airlineIds = new Set()
  const mfrIds = new Set()
  const typeIds = new Set()
  const airportCodes = new Set()
  const countryNames = new Set()
  const airportCountryNames = new Set()

  const airlineCounts = {}
  const typeCounts = {}
  const airportCounts = {}

  const airlineMap = new Map()
  const mfrMap = new Map()

  let specialLivery = 0, retro = 0, alliance = 0, flownIn = 0, remarks = 0

  const spotDates = new Set()
  let firstSpotReg = null, latestSpotReg = null

  for (const reg of regs) {
    if (reg.airlines?.id) {
      const aid = String(reg.airlines.id)
      airlineIds.add(aid)
      airlineCounts[aid] = (airlineCounts[aid] ?? 0) + 1
      if (!airlineMap.has(aid)) {
        airlineMap.set(aid, { id: reg.airlines.id, name: reg.airlines.name, logo_url: reg.airlines.logo_url ?? null })
      }
    }
    const mfr = reg.aircraft_types?.manufacturers
    if (mfr?.id) {
      const mid = String(mfr.id)
      mfrIds.add(mid)
      if (!mfrMap.has(mid)) {
        mfrMap.set(mid, { id: mfr.id, name: mfr.name, logo_url: mfr.logo_url ?? null, count: 0 })
      }
      mfrMap.get(mid).count++
    }
    if (reg.aircraft_types?.id) {
      typeIds.add(String(reg.aircraft_types.id))
      const tid = String(reg.aircraft_types.id)
      typeCounts[tid] = (typeCounts[tid] ?? 0) + 1
    }
    const aps = Array.isArray(reg.airports) ? reg.airports : []
    for (const code of aps) {
      airportCodes.add(code)
      airportCounts[code] = (airportCounts[code] ?? 0) + 1
      const apCountry = airportCountryByIata[code]
      if (apCountry) airportCountryNames.add(apCountry)
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

  const airlinesSpotted = Array.from(airlineMap.values())
    .sort((a, b) => a.name.localeCompare(b.name))

  const manufacturerBreakdown = Array.from(mfrMap.values())
    .sort((a, b) => b.count - a.count || a.name.localeCompare(b.name))

  const sortedAirlines = Object.entries(airlineCounts)
    .map(([id, count]) => ({ name: airlineMap.get(id)?.name ?? '—', count }))
    .sort((a, b) => b.count - a.count)

  const sortedTypes = Object.entries(typeCounts)
    .map(([id, count]) => {
      const name = regs.find((r) => String(r.aircraft_types?.id) === id)?.aircraft_types?.name ?? '—'
      return { name, count }
    })
    .sort((a, b) => b.count - a.count)

  const sortedAirports = Object.entries(airportCounts)
    .map(([name, count]) => ({ name, count }))
    .sort((a, b) => b.count - a.count)

  return {
    total: regs.length,
    airlines: airlineIds.size,
    manufacturers: mfrIds.size,
    types: typeIds.size,
    airports: airportCodes.size,
    countries: countryNames.size,
    airportCountries: airportCountryNames.size,
    topAirline: sortedAirlines[0] ?? null,
    topType: sortedTypes[0] ?? null,
    topAirport: sortedAirports[0] ?? null,
    top3Airlines: sortedAirlines.slice(0, 3),
    top3Types: sortedTypes.slice(0, 3),
    top3Airports: sortedAirports.slice(0, 3),
    specialLivery, retro, alliance, flownIn, remarks,
    firstSpot: firstSpotReg ? { date: firstSpotReg.first_spotted, reg: firstSpotReg.registration } : null,
    latestSpot: latestSpotReg ? { date: latestSpotReg.first_spotted, reg: latestSpotReg.registration } : null,
    totalDays: spotDates.size,
    airlinesSpotted,
    manufacturerBreakdown,
  }
}

function computeDateStats(sightings) {
  const dated = sightings.filter((s) => s.spotted_on)
  if (!dated.length) return { perYear: [], busiestEver: null, busiestThisYear: null }

  const thisYear = new Date().getFullYear()
  const dayCounts = {}
  let minYear = Infinity, maxYear = -Infinity

  for (const s of dated) {
    const d = s.spotted_on
    dayCounts[d] = (dayCounts[d] ?? 0) + 1
    const yr = parseInt(d.slice(0, 4), 10)
    if (yr < minYear) minYear = yr
    if (yr > maxYear) maxYear = yr
  }

  const yearCounts = {}
  for (const [d, count] of Object.entries(dayCounts)) {
    const yr = parseInt(d.slice(0, 4), 10)
    yearCounts[yr] = (yearCounts[yr] ?? 0) + count
  }

  const perYear = []
  for (let y = minYear; y <= maxYear; y++) {
    perYear.push({ year: y, count: yearCounts[y] ?? 0 })
  }

  let busiestEver = null
  for (const [date, count] of Object.entries(dayCounts)) {
    if (!busiestEver || count > busiestEver.count || (count === busiestEver.count && date < busiestEver.date)) {
      busiestEver = { date, count }
    }
  }

  let busiestThisYear = null
  for (const [date, count] of Object.entries(dayCounts)) {
    if (parseInt(date.slice(0, 4), 10) !== thisYear) continue
    if (!busiestThisYear || count > busiestThisYear.count || (count === busiestThisYear.count && date < busiestThisYear.date)) {
      busiestThisYear = { date, count }
    }
  }

  return { perYear, busiestEver, busiestThisYear }
}

function LogoTile({ name, logoUrl, small }) {
  const initials = name.trim().split(/\s+/).map((w) => w[0]).join('').toUpperCase().slice(0, 2)
  const cls = `stat-logo-tile${small ? ' stat-logo-tile--sm' : ''}`
  return (
    <div className={cls} title={name}>
      {logoUrl
        ? <img className="stat-logo-tile__img" src={logoUrl} alt={name} />
        : <div className="stat-logo-tile__initials"><span>{initials}</span></div>
      }
    </div>
  )
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

function MostRow({ label, top1, top3 }) {
  const [expanded, setExpanded] = useState(false)
  const hasMore = top3.length > 1
  return (
    <div className="stat-most-row">
      <button
        className="stat-most-row__header"
        onClick={() => hasMore && setExpanded((e) => !e)}
        aria-expanded={expanded}
        style={{ cursor: hasMore ? 'pointer' : 'default' }}
      >
        <span className="stat-most-row__label">{label}</span>
        <span className="stat-most-row__name">{top1?.name ?? '—'}</span>
        <span className="stat-most-row__count">{top1?.count ?? ''}</span>
        {hasMore && (
          <span className={`stat-most-row__chevron${expanded ? ' stat-most-row__chevron--open' : ''}`} aria-hidden="true">›</span>
        )}
      </button>
      {expanded && (
        <div className="stat-most-row__list">
          {top3.map((item, i) => (
            <div key={item.name} className="stat-most-row__item">
              <span className="stat-most-row__rank">{i + 1}.</span>
              <span className="stat-most-row__item-name">{item.name}</span>
              <span className="stat-most-row__item-count">{item.count}</span>
            </div>
          ))}
        </div>
      )}
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

function SightingsBarGraph({ perYear }) {
  if (!perYear.length) return null
  const maxCount = Math.max(...perYear.map((y) => y.count), 1)
  return (
    <div className="stat-laneshell" aria-hidden="true">
      {perYear.map(({ year, count }) => {
        const pct = count > 0 ? Math.max(6, (count / maxCount) * 100) : 0
        return (
          <div key={year} className="stat-lane">
            {pct > 0 && (
              <div className="stat-lane__fill" style={{ height: `${pct}%` }} />
            )}
            <span className="stat-lane__year">{year}</span>
          </div>
        )
      })}
    </div>
  )
}

function DateReadout({ label, primary, secondary }) {
  return (
    <div className="stat-date-readout">
      <span className="stat-date-readout__label">{label}</span>
      <div className="stat-date-readout__right">
        <span className="stat-date-readout__value">{primary}</span>
        {secondary && <span className="stat-date-readout__sub">{secondary}</span>}
      </div>
    </div>
  )
}

export default function StatsView({ onBack }) {
  const [regs, setRegs] = useState([])
  const [sightings, setSightings] = useState([])
  const [airportCountryByIata, setAirportCountryByIata] = useState({})
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)

  useEffect(() => {
    if (!supabase) {
      setError('Supabase is not configured.')
      setLoading(false)
      return
    }
    Promise.all([
      supabase
        .from('registrations')
        .select(`
          id, registration, first_spotted, airports, statuses,
          airlines ( id, name, country, logo_url ),
          aircraft_types ( id, name, manufacturers ( id, name, logo_url ) )
        `),
      supabase
        .from('sightings')
        .select('spotted_on'),
      supabase
        .from('airports')
        .select('iata, country'),
    ]).then(([{ data: regData, error: regErr }, { data: sightData }, { data: apData }]) => {
      if (regErr) setError(regErr.message)
      else setRegs(regData ?? [])
      setSightings(sightData ?? [])
      const byIata = {}
      for (const ap of (apData ?? [])) {
        if (ap.iata && ap.country) byIata[ap.iata] = ap.country
      }
      setAirportCountryByIata(byIata)
      setLoading(false)
    })
  }, [])

  const stats = useMemo(() => computeStats(regs, airportCountryByIata), [regs, airportCountryByIata])
  const dateStats = useMemo(() => computeDateStats(sightings), [sightings])

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

            {stats.airlinesSpotted.length > 0 && (
              <StatCard title="Airlines spotted">
                <div className="stat-logo-grid">
                  {stats.airlinesSpotted.map((airline) => (
                    <LogoTile key={airline.id} name={airline.name} logoUrl={airline.logo_url} />
                  ))}
                </div>
              </StatCard>
            )}

            <StatCard title="Counts">
              <div className="stat-mini-tiles">
                <MiniTile label="Airlines"      value={stats.airlines}      />
                <MiniTile label="Manufacturers" value={stats.manufacturers} />
                <MiniTile label="Types"         value={stats.types}         />
                <MiniTile label="Airports"      value={stats.airports}      />
                <MiniTile label="Airline countries" value={stats.countries} />
                <MiniTile label="Countries spotted in" value={stats.airportCountries} />
              </div>
            </StatCard>

            <StatCard title="Most-spotted">
              <MostRow label="Airline" top1={stats.topAirline} top3={stats.top3Airlines} />
              <MostRow label="Type"    top1={stats.topType}    top3={stats.top3Types}    />
              <MostRow label="Airport" top1={stats.topAirport} top3={stats.top3Airports} />
            </StatCard>

            {stats.manufacturerBreakdown.length > 0 && (
              <StatCard title="Manufacturers">
                {stats.manufacturerBreakdown.map((mfr) => (
                  <div key={mfr.id} className="stat-mfr-row">
                    <LogoTile name={mfr.name} logoUrl={mfr.logo_url} small />
                    <span className="stat-mfr-row__name">{mfr.name}</span>
                    <span className="stat-most-row__count">{mfr.count}</span>
                  </div>
                ))}
              </StatCard>
            )}

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

            <StatCard title="Dates">
              <p className="stat-graph-label">Sightings per year</p>
              <SightingsBarGraph perYear={dateStats.perYear} />
              <DateReadout
                label="Busiest day ever"
                primary={dateStats.busiestEver?.date ?? '—'}
                secondary={dateStats.busiestEver ? `${dateStats.busiestEver.count} sightings` : null}
              />
              <DateReadout
                label="Busiest this year"
                primary={dateStats.busiestThisYear?.date ?? '—'}
                secondary={dateStats.busiestThisYear ? `${dateStats.busiestThisYear.count} sightings` : 'none yet'}
              />
            </StatCard>
          </>
        )}
      </main>
    </div>
  )
}
