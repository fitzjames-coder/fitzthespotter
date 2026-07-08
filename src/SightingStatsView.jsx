import { useEffect, useMemo, useState } from 'react'
import { supabase } from './lib/supabaseClient'
import { fetchAllRows } from './lib/fetchAllRows'

function StatCard({ title, children }) {
  return (
    <div className="stat-card">
      <p className="stat-card__title">{title}</p>
      {children}
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

function fmtGap(days) {
  const months = Math.floor(days / 30.44)
  const yrs = Math.floor(months / 12)
  const mos = months % 12
  if (yrs === 0 && mos === 0) return `${days} days`
  if (yrs === 0) return `${mos} mo`
  if (mos === 0) return `${yrs} yrs`
  return `${yrs} yrs ${mos} mo`
}

function computeReunions(sightings) {
  const byReg = new Map()
  for (const s of sightings) {
    const reg = s.registrations
    if (!reg || !s.spotted_on) continue
    if (!byReg.has(reg.id)) byReg.set(reg.id, { reg, dates: [] })
    byReg.get(reg.id).dates.push(s.spotted_on)
  }
  const gaps = []
  for (const { reg, dates } of byReg.values()) {
    if (dates.length < 2) continue
    const sorted = [...new Set(dates)].sort()
    for (let i = 1; i < sorted.length; i++) {
      const a = new Date(sorted[i - 1])
      const b = new Date(sorted[i])
      const days = Math.round((b - a) / 86400000)
      gaps.push({ reg, from: sorted[i - 1], to: sorted[i], days })
    }
  }
  gaps.sort((x, y) => y.days - x.days)
  const seen = new Set()
  const top = []
  for (const g of gaps) {
    if (seen.has(g.reg.id)) continue
    seen.add(g.reg.id)
    top.push(g)
    if (top.length === 5) break
  }
  return top
}

function computeSightingStats(sightings) {
  const byReg = new Map()
  const airlineCounts = {}
  const airportCounts = {}
  for (const s of sightings) {
    const r = s.registrations
    if (r?.id) {
      if (!byReg.has(r.id)) {
        byReg.set(r.id, {
          id: r.id,
          registration: r.registration,
          airline: r.airlines ?? null,
          airlineName: r.airlines?.name ?? '—',
          count: 0,
        })
      }
      byReg.get(r.id).count++
      const an = r.airlines?.name
      if (an) airlineCounts[an] = (airlineCounts[an] ?? 0) + 1
    }
    if (s.airport) airportCounts[s.airport] = (airportCounts[s.airport] ?? 0) + 1
  }
  const topRegs = Array.from(byReg.values())
    .sort((a, b) => b.count - a.count || a.registration.localeCompare(b.registration))
    .slice(0, 10)
  const topAirlines = Object.entries(airlineCounts)
    .map(([name, count]) => ({ name, count }))
    .sort((a, b) => b.count - a.count || a.name.localeCompare(b.name))
  const topAirports = Object.entries(airportCounts)
    .map(([name, count]) => ({ name, count }))
    .sort((a, b) => b.count - a.count || a.name.localeCompare(b.name))
  return { total: sightings.length, topRegs, topAirlines, topAirports }
}

export default function SightingStatsView({ onBack, onSelectReg }) {
  const [sightings, setSightings] = useState([])
  const [regCount, setRegCount] = useState(0)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)

  useEffect(() => {
    if (!supabase) {
      setError('Supabase is not configured.')
      setLoading(false)
      return
    }
    if (typeof navigator !== 'undefined' && navigator.onLine === false) {
      setError('This page needs a connection. Your logbook is viewable offline — download it from the Offline card — but this page is online-only for now.')
      setLoading(false)
      return
    }
    Promise.all([
      fetchAllRows(() =>
        supabase
          .from('sightings')
          .select('id, airport, spotted_on, registrations!inner ( id, registration, airlines ( id, name, country, country_flag ) )')
          .order('id', { ascending: true })
      ),
      supabase
        .from('registrations')
        .select('id', { count: 'exact', head: true }),
    ]).then(([{ data: sData, error: sErr }, { count }]) => {
      if (sErr) setError(sErr.message)
      else setSightings(sData ?? [])
      setRegCount(count ?? 0)
      setLoading(false)
    })
  }, [])

  const stats = useMemo(() => computeSightingStats(sightings), [sightings])
  const reunions = useMemo(() => computeReunions(sightings), [sightings])

  return (
    <div className="page search-page">
      <header className="stats-top-bar">
        <button className="stats-top-bar__back" onClick={onBack} aria-label="Back to search">‹ Back</button>
        <h1 className="stats-top-bar__title">Sighting Stats</h1>
      </header>

      <main className="content stats-content">
        {loading && <p className="search-state">Loading…</p>}
        {error && <p className="search-state search-state--error">{error}</p>}
        {!loading && !error && (
          <>
            <div className="stats-headline">
              <span className="stats-headline__number">{stats.total}</span>
              <span className="stats-headline__label">Total Sightings</span>
              <span className="stats-headline__sub">{regCount} registrations spotted</span>
            </div>

            <StatCard title="Most-Sighted Registrations">
              <div className="sight-reg-grid">
                {stats.topRegs.map((r) => (
                  <button
                    key={r.id}
                    className="sight-reg-pill"
                    onClick={() => onSelectReg({ id: r.id, airlines: r.airline })}
                  >
                    <span className="sight-reg-pill__reg">{r.registration}</span>
                    <span className="sight-reg-pill__airline">{r.airlineName}</span>
                    <span className="sight-reg-pill__count">{r.count}</span>
                  </button>
                ))}
                {stats.topRegs.length === 0 && <p className="search-state">No sightings yet.</p>}
              </div>
            </StatCard>

            <StatCard title="Most-Sighted Airlines">
              <div className="sight-reg-grid">
                {stats.topAirlines.slice(0, 5).map((a) => (
                  <div key={a.name} className="sight-reg-pill sight-reg-pill--static">
                    <span className="sight-reg-pill__name">{a.name}</span>
                    <span className="sight-reg-pill__count">{a.count}</span>
                  </div>
                ))}
                {stats.topAirlines.length === 0 && <p className="search-state">No sightings yet.</p>}
              </div>
            </StatCard>

            <StatCard title="Longest Reunions">
              <div className="sight-reg-grid">
                {reunions.map((g) => (
                  <button
                    key={g.reg.id}
                    className="sight-reg-pill"
                    onClick={() => onSelectReg({ id: g.reg.id, airlines: g.reg.airlines })}
                  >
                    <span className="sight-reg-pill__reg">{g.reg.registration}</span>
                    <span className="sight-reg-pill__airline">{g.from} → {g.to}</span>
                    <span className="sight-reg-pill__count reunion-gap">{fmtGap(g.days)}</span>
                  </button>
                ))}
                {reunions.length === 0 && <p className="search-state">No registration seen twice yet.</p>}
              </div>
            </StatCard>

            <StatCard title="Most-Sighted Airports">
              <div className="sight-reg-grid">
                {stats.topAirports.slice(0, 5).map((a) => (
                  <div key={a.name} className="sight-reg-pill sight-reg-pill--static">
                    <span className="sight-reg-pill__name">{a.name}</span>
                    <span className="sight-reg-pill__count">{a.count}</span>
                  </div>
                ))}
                {stats.topAirports.length === 0 && <p className="search-state">No sightings yet.</p>}
              </div>
            </StatCard>
          </>
        )}
      </main>
    </div>
  )
}
