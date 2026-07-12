import { useEffect, useState } from 'react'
import { supabase } from './lib/supabaseClient'
import { stripTypeParens } from './lib/typeGrouping'
import { offlineAllRegs } from './lib/offlineData'
import { fetchAllRows } from './lib/fetchAllRows'
import { exportBackupCsv } from './exportBackup'
import NewRegistrationForm from './NewRegistrationForm'
import RegistrationProfileView from './RegistrationProfileView'
import SightingStatsView from './SightingStatsView'
import SecondLifeView from './SecondLifeView'
import AgeView from './AgeView'
import StatsView from './StatsView'
import ManufacturersView from './ManufacturersView'
import FlownInView from './FlownInView'
import AirlinesGalleryView from './AirlinesGalleryView'
import BookCandidatesView from './BookCandidatesView'
import NotesView from './NotesView'
import SpottingThroughTimeView from './SpottingThroughTimeView'
import LegendView from './LegendView'
import GuideView from './GuideView'
import OfflineView from './OfflineView'
import OnThisDayView from './OnThisDayView'
import MilestonesView from './MilestonesView'
import VisualGuideView from './VisualGuideView'
import { weekStartISO, getWeekCount } from './lib/onThisDay'

function SearchTopBar() {
  const [showForm, setShowForm] = useState(false)

  async function handleExport() {
    if (!window.confirm('Download a readable CSV backup of your whole logbook? It opens in Excel or Numbers.')) return
    try { await exportBackupCsv(supabase) }
    catch (e) { alert('Backup failed: ' + (e?.message || 'unknown error')) }
  }

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
        <button
          className="top-bar__export"
          onClick={handleExport}
          aria-label="Download a readable CSV backup of your logbook"
        >
          <img src="/export-container.PNG" alt="" className="top-bar__export-icon" />
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
  { id: 'old_livery',     label: 'Livery change'  },
  { id: 'alliance',       label: 'Alliance'       },
  { id: 'remarks',        label: 'Remarks'        },
  { id: 'flown_in',       label: 'Flown-in'       },
  { id: 'flagged',        label: 'Flagged'        },
  { id: 'closed',         label: 'Closed'         },
  { id: 'rs',             label: 'R/S'            },
]

function ResultCard({ reg, onSelect }) {
  const typeName = reg.aircraft_types?.name ? stripTypeParens(reg.aircraft_types.name) : null
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
      <span className="stats-card__title">Spotting Stats</span>
      <span className="stats-card__sub">Your numbers, by aircraft</span>
      <span className="stats-card__chevron" aria-hidden="true">›</span>
    </button>
  )
}

function SightingStatsCard({ onOpen }) {
  return (
    <button className="stats-card" onClick={onOpen}>
      <span className="stats-card__title">Sighting Stats</span>
      <span className="stats-card__sub">Your numbers, by sighting</span>
      <span className="stats-card__chevron" aria-hidden="true">›</span>
    </button>
  )
}

function AgeCard({ onOpen }) {
  return (
    <button className="stats-card" onClick={onOpen}>
      <span className="stats-card__title">Age</span>
      <span className="stats-card__sub">By decade of the airframe</span>
      <span className="stats-card__chevron" aria-hidden="true">›</span>
    </button>
  )
}

function SecondLifeCard({ onOpen }) {
  return (
    <button className="stats-card" onClick={onOpen}>
      <span className="stats-card__title">Second Life</span>
      <span className="stats-card__sub">Airframes across airlines</span>
      <span className="stats-card__chevron" aria-hidden="true">›</span>
    </button>
  )
}

function AirlinesCard({ onOpen }) {
  return (
    <button className="stats-card" onClick={onOpen}>
      <span className="stats-card__title">Airlines Spotted</span>
    </button>
  )
}

function ManufacturersCard({ onOpen }) {
  return (
    <button className="stats-card" onClick={onOpen}>
      <span className="stats-card__title">Manufacturers</span>
      <span className="stats-card__sub">Browse by maker</span>
      <span className="stats-card__chevron" aria-hidden="true">›</span>
    </button>
  )
}

function BookCandidatesCard({ onOpen }) {
  return (
    <button className="stats-card bookcand-card" onClick={onOpen}>
      <img src="/book-card.PNG" alt="" className="bookcand-card__icon" aria-hidden="true" />
      <span className="stats-card__title">Coffee Table</span>
      <span className="stats-card__chevron" aria-hidden="true">›</span>
    </button>
  )
}

function NotesCard({ onOpen }) {
  return (
    <button className="stats-card" onClick={onOpen}>
      <span className="stats-card__title">Notes</span>
      <span className="stats-card__sub">Your spotting notes</span>
      <span className="stats-card__chevron" aria-hidden="true">›</span>
    </button>
  )
}

function SpottingThroughTimeCard({ onOpen }) {
  return (
    <button className="stats-card" onClick={onOpen}>
      <span className="stats-card__title">Spotting Through Time</span>
      <span className="stats-card__sub">Chasing the Light</span>
      <span className="stats-card__chevron" aria-hidden="true">›</span>
    </button>
  )
}

function LegendCard({ onOpen }) {
  return (
    <button className="stats-card" onClick={onOpen}>
      <span className="stats-card__title">Legend</span>
      <span className="stats-card__sub">What every symbol means</span>
      <span className="stats-card__chevron" aria-hidden="true">›</span>
    </button>
  )
}

function VisualGuideCard({ onOpen }) {
  return (
    <button className="stats-card" onClick={onOpen}>
      <span className="stats-card__title">Visual Guide</span>
      <span className="stats-card__sub">The whole app, in pictures</span>
      <span className="stats-card__chevron" aria-hidden="true">›</span>
    </button>
  )
}

function GuideCard({ onOpen }) {
  return (
    <button className="stats-card" onClick={onOpen}>
      <span className="stats-card__title">Guide</span>
      <span className="stats-card__sub">How everything works</span>
      <span className="stats-card__chevron" aria-hidden="true">›</span>
    </button>
  )
}

function MilestonesCard({ onOpen }) {
  return (
    <button className="stats-card" onClick={onOpen}>
      <span className="stats-card__title">Milestones</span>
      <span className="stats-card__sub">The counting joys — #500, 1,000th, firsts</span>
      <span className="stats-card__chevron" aria-hidden="true">›</span>
    </button>
  )
}

function OnThisDayCard({ onOpen }) {
  const count = getWeekCount(weekStartISO())
  return (
    <button className="stats-card stats-card--otd" onClick={onOpen}>
      <span className="stats-card__title">On this day{count != null && count > 0 ? ` · ${count} this week` : ''}</span>
      <span className="stats-card__sub">Your logbook, years ago this week</span>
      <span className="stats-card__chevron" aria-hidden="true">›</span>
    </button>
  )
}

function OfflineCard({ onOpen }) {
  return (
    <button className="stats-card" onClick={onOpen}>
      <span className="stats-card__title">Offline</span>
      <span className="stats-card__sub">Download your logbook</span>
      <span className="stats-card__chevron" aria-hidden="true">›</span>
    </button>
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
  const [showSightingStats, setShowSightingStats] = useState(false)
  const [showSecondLife, setShowSecondLife] = useState(false)
  const [showAge, setShowAge] = useState(false)
  const [showManufacturers, setShowManufacturers] = useState(false)
  const [showFlownIn, setShowFlownIn] = useState(false)
  const [showAirlines, setShowAirlines] = useState(false)
  const [showBookCandidates, setShowBookCandidates] = useState(false)
  const [showNotes, setShowNotes] = useState(false)
  const [showSpottingTime, setShowSpottingTime] = useState(false)
  const [showLegend, setShowLegend] = useState(false)
  const [showGuide, setShowGuide] = useState(false)
  const [showVisualGuide, setShowVisualGuide] = useState(false)
  const [showOffline, setShowOffline] = useState(false)
  const [showOnThisDay, setShowOnThisDay] = useState(false)
  const [showMilestones, setShowMilestones] = useState(false)

  function fetchAll() {
    if (!supabase) {
      setError('Supabase is not configured.')
      setLoading(false)
      return
    }
    async function loadFromOffline() {
      const data = await offlineAllRegs()
      if (!data) {
        setError('You are offline and no offline copy is saved yet. Download from the Offline card while connected.')
        setLoading(false)
        return
      }
      setAllRegs(data)
      setError(null)
      setLoading(false)
    }

    if (typeof navigator !== 'undefined' && navigator.onLine === false) {
      loadFromOffline()
      return
    }

    fetchAllRows(() =>
      supabase
        .from('registrations')
        .select(`
        id, registration, airports, remark, statuses, flagged,
        airlines ( id, name, country, country_flag, is_closed ),
        aircraft_types ( id, name, manufacturers ( id, name ) )
      `)
    ).then(({ data, error: err }) => {
        if (err) {
          setError(err.message)
        } else {
          setAllRegs(data ?? [])
        }
        setLoading(false)
      })
      .catch(() => { loadFromOffline() })
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

  const flownInCount = allRegs.filter((r) => r.statuses?.flown_in === true).length

  const q = query.trim().toLowerCase()
  const hasInput = q !== '' || activeFilters.size > 0

  const results = hasInput
    ? allRegs.filter((reg) => {
        for (const fid of activeFilters) {
          if (fid === 'flagged') { if (!reg.flagged) return false; continue }
          if (fid === 'closed') { if (!reg.airlines?.is_closed) return false; continue }
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
    return <StatsView onBack={() => setShowStats(false)} />
  }

  if (showSightingStats) {
    return <SightingStatsView onBack={() => setShowSightingStats(false)} onSelectReg={setSelectedReg} />
  }

  if (showSecondLife) {
    return <SecondLifeView onBack={() => setShowSecondLife(false)} onSelectReg={setSelectedReg} />
  }

  if (showAge) {
    return <AgeView onBack={() => setShowAge(false)} onSelectReg={setSelectedReg} />
  }

  if (showManufacturers) {
    return <ManufacturersView onBack={() => setShowManufacturers(false)} />
  }

  if (showFlownIn) {
    return (
      <FlownInView
        onBack={() => setShowFlownIn(false)}
        onSelectReg={setSelectedReg}
      />
    )
  }

  if (showAirlines) {
    return <AirlinesGalleryView onBack={() => setShowAirlines(false)} />
  }

  if (showBookCandidates) {
    return (
      <BookCandidatesView
        onBack={() => setShowBookCandidates(false)}
        onSelectReg={setSelectedReg}
      />
    )
  }

  if (showNotes) {
    return <NotesView onBack={() => setShowNotes(false)} />
  }

  if (showSpottingTime) {
    return <SpottingThroughTimeView onBack={() => setShowSpottingTime(false)} />
  }

  if (showLegend) {
    return <LegendView onBack={() => setShowLegend(false)} />
  }

  if (showGuide) {
    return <GuideView onBack={() => setShowGuide(false)} />
  }

  if (showOffline) {
    return <OfflineView onBack={() => setShowOffline(false)} />
  }

  if (showOnThisDay) {
    return <OnThisDayView onBack={() => setShowOnThisDay(false)} onSelectReg={setSelectedReg} />
  }

  if (showMilestones) {
    return <MilestonesView onBack={() => setShowMilestones(false)} onSelectReg={setSelectedReg} />
  }

  if (showVisualGuide) {
    return <VisualGuideView onBack={() => setShowVisualGuide(false)} />
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
          <p className="search-subtitle">Registrations only</p>
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

        <div className="search-cards">
          <button
            className="stats-flownin-card"
            onClick={() => setShowFlownIn(true)}
          >
            <span className="stats-flownin-card__count">{flownInCount}</span>
            <span className="stats-flownin-card__text">
              <span className="stats-flownin-card__label">Flown-in</span>
              <span className="stats-flownin-card__sub">View all aboard</span>
            </span>
            <span className="stats-flownin-card__chevron" aria-hidden="true">›</span>
          </button>
          <OnThisDayCard onOpen={() => setShowOnThisDay(true)} />
          <MilestonesCard onOpen={() => setShowMilestones(true)} />
          <StatsCard onOpen={() => setShowStats(true)} />
          <SightingStatsCard onOpen={() => setShowSightingStats(true)} />
          <SecondLifeCard onOpen={() => setShowSecondLife(true)} />
          <AgeCard onOpen={() => setShowAge(true)} />
          <AirlinesCard onOpen={() => setShowAirlines(true)} />
          <ManufacturersCard onOpen={() => setShowManufacturers(true)} />
          <BookCandidatesCard onOpen={() => setShowBookCandidates(true)} />
          <NotesCard onOpen={() => setShowNotes(true)} />
          <SpottingThroughTimeCard onOpen={() => setShowSpottingTime(true)} />
          <LegendCard onOpen={() => setShowLegend(true)} />
          <GuideCard onOpen={() => setShowGuide(true)} />
          <VisualGuideCard onOpen={() => setShowVisualGuide(true)} />
          <OfflineCard onOpen={() => setShowOffline(true)} />
        </div>
      </main>
    </div>
  )
}
