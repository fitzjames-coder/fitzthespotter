import { useEffect, useState } from 'react'
import { supabase } from './lib/supabaseClient'
import NewRegistrationForm from './NewRegistrationForm'
import RegistrationProfileView from './RegistrationProfileView'

function SearchTopBar() {
  const [showForm, setShowForm] = useState(false)
  return (
    <>
      <header className="top-bar top-bar--dark">
        <button
          className="top-bar__wordmark"
          onClick={() => setShowForm(true)}
          aria-label="Add new entry"
        >
          <span className="top-bar__title--cream">Fitz</span>
          <span className="top-bar__title--amber">the</span>
          <span className="top-bar__title--cream">spotter</span>
          <sup className="top-bar__plus" aria-hidden="true">+</sup>
        </button>
      </header>
      {showForm && <NewRegistrationForm onClose={() => setShowForm(false)} />}
    </>
  )
}

function thumbAbbrev(model) {
  const seg = model.split(/[-\s]/)[0]
  return seg.length <= 5 ? seg : seg.slice(0, 4)
}

const QUICK_FILTERS = [
  { id: 'special_livery', label: 'Special Livery' },
  { id: 'retro',          label: 'Retro'          },
  { id: 'alliance',       label: 'Alliance'       },
  { id: 'remarks',        label: 'Remarks'        },
  { id: 'flown_in',       label: 'Flown-in'       },
]

function ResultCard({ reg, onSelect }) {
  const typeName = reg.aircraft_types?.name ?? null
  const abbrev = typeName ? thumbAbbrev(typeName) : ''
  const airlineName = reg.airlines?.name ?? null
  const subtitle = [airlineName, typeName].filter(Boolean).join(' · ')

  return (
    <button className="search-result-card" onClick={() => onSelect(reg)}>
      <div className="search-result-card__thumb" aria-hidden="true">
        <span className="search-result-card__thumb-text">{abbrev}</span>
      </div>
      <div className="search-result-card__body">
        <span className="search-result-card__reg">{reg.registration}</span>
        {subtitle && <span className="search-result-card__sub">{subtitle}</span>}
      </div>
    </button>
  )
}

function StatsCard({ onOpen }) {
  return (
    <button className="stats-card" onClick={onOpen}>
      <span className="stats-card__title">Stats</span>
      <span className="stats-card__sub">Your numbers</span>
      <span className="stats-card__chevron" aria-hidden="true">›</span>
    </button>
  )
}

function StatsPlaceholder({ onBack }) {
  return (
    <div className="page search-page">
      <SearchTopBar />
      <main className="content search-content">
        <button className="search-stats-back" onClick={onBack}>‹ Back</button>
        <p className="search-stats-soon">Stats — coming soon</p>
      </main>
    </div>
  )
}

export default function SearchView() {
  const [allRegs, setAllRegs] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [query, setQuery] = useState('')
  const [activeFilters, setActiveFilters] = useState(new Set())
  const [selectedReg, setSelectedReg] = useState(null)
  const [showStats, setShowStats] = useState(false)

  function fetchAll() {
    if (!supabase) {
      setError('Supabase is not configured.')
      setLoading(false)
      return
    }
    supabase
      .from('registrations')
      .select(`
        id, registration, airports, remark, statuses,
        airlines ( id, name, country, country_flag ),
        aircraft_types ( id, name, manufacturers ( id, name ) )
      `)
      .then(({ data, error: err }) => {
        if (err) {
          setError(err.message)
        } else {
          setAllRegs(data ?? [])
        }
        setLoading(false)
      })
  }

  useEffect(() => { fetchAll() }, [])

  function toggleFilter(id) {
    setActiveFilters((prev) => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })
  }

  const q = query.trim().toLowerCase()
  const hasInput = q !== '' || activeFilters.size > 0

  const results = hasInput
    ? allRegs.filter((reg) => {
        for (const fid of activeFilters) {
          if (!reg.statuses?.[fid]) return false
        }
        if (q === '') return true
        const airports = Array.isArray(reg.airports) ? reg.airports : []
        return (
          reg.registration.toLowerCase().includes(q) ||
          (reg.airlines?.name ?? '').toLowerCase().includes(q) ||
          (reg.aircraft_types?.name ?? '').toLowerCase().includes(q) ||
          airports.some((code) => code.toLowerCase().includes(q))
        )
      })
    : []

  if (selectedReg) {
    return (
      <RegistrationProfileView
        regId={selectedReg.id}
        airline={selectedReg.airlines}
        onBack={() => setSelectedReg(null)}
        onChanged={fetchAll}
      />
    )
  }

  if (showStats) {
    return <StatsPlaceholder onBack={() => setShowStats(false)} />
  }

  return (
    <div className="page search-page">
      <SearchTopBar />

      <main className="content search-content">
        <div className="search-header">
          <p className="search-kicker">FIND ANYTHING</p>
          <h1 className="search-title">
            <span className="search-title--cream">Search</span>
            <span className="search-title--amber"> / </span>
            <span className="search-title--cream">Stats</span>
          </h1>
          <p className="search-subtitle">Reg · airline · type · airport</p>
        </div>

        <div className="search-bar-wrap">
          <span className="search-bar__icon" aria-hidden="true">🔍</span>
          <input
            className="search-bar__input"
            type="text"
            placeholder="Search registrations…"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            autoComplete="off"
          />
          {query && (
            <button
              className="search-bar__clear"
              onClick={() => setQuery('')}
              aria-label="Clear search"
            >
              ×
            </button>
          )}
        </div>

        <div className="search-filters">
          {QUICK_FILTERS.map((f) => (
            <button
              key={f.id}
              className={`search-filter-pill${activeFilters.has(f.id) ? ' search-filter-pill--active' : ''}`}
              onClick={() => toggleFilter(f.id)}
            >
              {f.label}
            </button>
          ))}
        </div>

        {hasInput && (
          <div className="search-results">
            {loading ? (
              <p className="search-state">Loading…</p>
            ) : error ? (
              <p className="search-state search-state--error">{error}</p>
            ) : results.length === 0 ? (
              <p className="search-state">No results.</p>
            ) : (
              results.map((reg) => (
                <ResultCard key={reg.id} reg={reg} onSelect={setSelectedReg} />
              ))
            )}
          </div>
        )}

        <StatsCard onOpen={() => setShowStats(true)} />
      </main>
    </div>
  )
}
