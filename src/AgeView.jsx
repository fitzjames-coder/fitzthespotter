import { useEffect, useMemo, useState } from 'react'
import { supabase } from './lib/supabaseClient'
import { fetchAllRows } from './lib/fetchAllRows'

const BANDS = [
  { key: 0, label: '0s' },
  { key: 10, label: '10' },
  { key: 20, label: '20' },
  { key: 30, label: '30' },
  { key: 40, label: '40' },
  { key: 50, label: '50' },
  { key: 60, label: '60' },
  { key: 70, label: '70' },
  { key: 80, label: '80' },
  { key: 90, label: '90' },
  { key: 100, label: '100+' },
]

function bandKeyForAge(age) {
  if (age >= 100) return 100
  return Math.floor(age / 10) * 10
}

function computeBands(regs) {
  const year = new Date().getFullYear()
  const map = new Map()
  for (const r of regs) {
    if (!r.build_date) continue
    const by = parseInt(r.build_date.slice(0, 4), 10)
    if (!by) continue
    const age = year - by
    if (age < 0) continue
    const key = bandKeyForAge(age)
    if (!map.has(key)) map.set(key, [])
    map.get(key).push({
      id: r.id,
      registration: r.registration,
      airline: r.airlines ?? null,
      airlineName: r.airlines?.name ?? '—',
      age,
    })
  }
  for (const list of map.values()) {
    list.sort((a, b) => a.age - b.age || a.registration.localeCompare(b.registration))
  }
  return map
}

export default function AgeView({ onBack, onSelectReg }) {
  const [regs, setRegs] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [selectedBand, setSelectedBand] = useState(null)

  useEffect(() => {
    if (!supabase) { setError('Supabase is not configured.'); setLoading(false); return }
    if (typeof navigator !== 'undefined' && navigator.onLine === false) {
      setError('This page needs a connection. Your logbook is viewable offline — download it from the Offline card — but this page is online-only for now.')
      setLoading(false)
      return
    }
    fetchAllRows(() =>
      supabase
        .from('registrations')
        .select('id, registration, build_date, airlines ( id, name )')
        .order('id', { ascending: true })
    )
      .then(({ data, error: err }) => {
        if (err) setError(err.message)
        else setRegs(data ?? [])
        setLoading(false)
      })
  }, [])

  const bandMap = useMemo(() => computeBands(regs), [regs])
  const activeBands = useMemo(() => BANDS.filter((b) => bandMap.has(b.key)), [bandMap])

  useEffect(() => {
    if (activeBands.length > 0 && selectedBand === null) {
      setSelectedBand(activeBands[0].key)
    }
  }, [activeBands, selectedBand])

  const list = selectedBand !== null ? (bandMap.get(selectedBand) ?? []) : []

  return (
    <div className="page search-page">
      <header className="stats-top-bar">
        <button className="stats-top-bar__back" onClick={onBack} aria-label="Back to search">‹ Back</button>
        <h1 className="stats-top-bar__title">Age</h1>
      </header>

      <main className="content stats-content">
        {loading && <p className="search-state">Loading…</p>}
        {error && <p className="search-state search-state--error">{error}</p>}
        {!loading && !error && activeBands.length === 0 && (
          <div className="stat-card">
            <p className="secondlife-empty">
              No aircraft have a build date yet. Add a build date to a registration and its age band appears here — then tap a decade to see every aircraft that age.
            </p>
          </div>
        )}
        {!loading && !error && activeBands.length > 0 && (
          <>
            <div className="age-band-row">
              {activeBands.map((b) => (
                <button
                  key={b.key}
                  className={`search-filter-pill${selectedBand === b.key ? ' search-filter-pill--active' : ''}`}
                  onClick={() => setSelectedBand(b.key)}
                >
                  {b.label}
                  <span className="age-band-pill__count">{bandMap.get(b.key).length}</span>
                </button>
              ))}
            </div>
            <div className="sight-reg-grid">
              {list.map((r) => (
                <button
                  key={r.id}
                  className="sight-reg-pill"
                  onClick={() => onSelectReg({ id: r.id, airlines: r.airline })}
                >
                  <span className="sight-reg-pill__reg">{r.registration}</span>
                  <span className="sight-reg-pill__airline">{r.airlineName}</span>
                  <span className="sight-reg-pill__count">{r.age}y</span>
                </button>
              ))}
            </div>
          </>
        )}
      </main>
    </div>
  )
}
