import { useEffect, useState, Fragment } from 'react'
import './App.css'
import { supabase } from './lib/supabaseClient'
import markFlownIn from './assets/marks/mark-flown-in.png'
import AirlineDetailView from './AirlineDetailView'
import ManufacturerDetailView from './ManufacturerDetailView'
import AirportsTab from './AirportsTab'
import AirportDetailView from './AirportDetailView'
import BottomNav from './BottomNav'
import PlaceholderScreen from './PlaceholderScreen'
import NewRegistrationForm from './NewRegistrationForm'
import SearchView from './SearchView'

function airlineBucket(name) {
  const c = (name || '').trim().charAt(0)
  if (!c) return '#'
  if (/[0-9]/.test(c)) return '#'
  const base = c.normalize('NFD').replace(/[̀-ͯ]/g, '').toUpperCase()
  return /[A-Z]/.test(base) ? base : '#'
}

function compareAirlineNames(a, b) {
  const an = (a.name ?? '').trim()
  const bn = (b.name ?? '').trim()
  const aDigit = /^\d/.test(an)
  const bDigit = /^\d/.test(bn)
  if (aDigit !== bDigit) return aDigit ? -1 : 1
  return an.localeCompare(bn, 'en', { numeric: true, sensitivity: 'base' })
}

export function TopBar({ searchValue, onSearchChange, searchPlaceholder, onSearchClear }) {
  const [showForm, setShowForm] = useState(false)
  return (
    <>
      <header className="top-bar">
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
        {onSearchChange && (
          <div className="top-bar__search">
            <div className="list-search__field">
              <span className="list-search__icon" aria-hidden="true">🔍</span>
              <input
                className="list-search__input"
                type="text"
                placeholder={searchPlaceholder}
                value={searchValue}
                onChange={(e) => onSearchChange(e.target.value)}
                aria-label="Search this list"
              />
              {searchValue && (
                <button
                  className="list-search__clear"
                  aria-label="Clear search"
                  onClick={onSearchClear}
                >×</button>
              )}
            </div>
          </div>
        )}
      </header>
      {showForm && <NewRegistrationForm onClose={() => setShowForm(false)} />}
    </>
  )
}

export function FlagIcon({ countryCode }) {
  if (!countryCode) {
    return <span className="airline-card__flag-placeholder" aria-hidden="true" />
  }
  return (
    <span
      className={`fi fi-${countryCode.toLowerCase()} airline-card__flag-svg`}
      aria-hidden="true"
    />
  )
}

function RegCountPill({ count }) {
  return (
    <span className="reg-count-pill">
      <span className="reg-count-pill__number">{count}</span>
    </span>
  )
}

function cardInitials(name) {
  if (!name) return '?'
  const words = name.trim().split(/\s+/)
  if (words.length === 1) return words[0].slice(0, 2).toUpperCase()
  return (words[0][0] + words[1][0]).toUpperCase()
}

function AirlineCard({ airline, regCount, onSelect }) {
  const isClosed = airline.is_closed
  return (
    <button className="airline-card" onClick={() => onSelect(airline)}>
      <div className="airline-card__main">
        <div className="airline-card__logo">
          {airline.logo_url
            ? <img className="airline-card__logo-img" src={airline.logo_url} alt="" />
            : <span className="airline-card__logo-initials">{cardInitials(airline.name)}</span>}
        </div>
        <div className="airline-card__text">
          <span className="airline-card__name">{airline.name}</span>
          {(airline.country_flag || airline.country) && (
            <span className="airline-card__country">
              <FlagIcon countryCode={airline.country_flag} />
              {airline.country}
            </span>
          )}
        </div>
      </div>
      <div className="airline-card__right">
        {airline.flown_in && (
          <img className="airline-card__flown" src={markFlownIn} alt="Flown" title="Flown this airline" />
        )}
        {isClosed && (
          <img className="airline-card__closed-banner" src="/Closed.PNG"
               alt="Closed — ceased operations" />
        )}
        {regCount !== undefined && <RegCountPill count={regCount} />}
      </div>
    </button>
  )
}

function AirlineGridTile({ airline, regCount, onSelect }) {
  const isClosed = airline.is_closed
  return (
    <button className="airline-grid-tile" onClick={() => onSelect(airline)}>
      <div className="airline-grid-tile__ears">
        {airline.country_flag
          ? <span className="airline-grid-tile__flag-pill"><FlagIcon countryCode={airline.country_flag} /></span>
          : <span className="airline-grid-tile__ear-spacer" />}
        <RegCountPill count={regCount} />
      </div>
      <div className="airline-grid-tile__logo">
        {airline.logo_url
          ? <img className="airline-grid-tile__logo-img" src={airline.logo_url} alt="" />
          : <span className="airline-grid-tile__logo-initials">{cardInitials(airline.name)}</span>}
      </div>
      <span className="airline-grid-tile__name">{airline.name}</span>
      {(airline.flown_in || isClosed) && (
        <div className="airline-grid-tile__marks">
          {airline.flown_in && (
            <img className="airline-grid-tile__mark" src={markFlownIn} alt="Flown" title="Flown this airline" />
          )}
          {isClosed && (
            <img className="airline-grid-tile__mark airline-grid-tile__mark--closed" src="/Closed.PNG" alt="Closed" title="Ceased operations" />
          )}
        </div>
      )}
    </button>
  )
}

let airlinesViewMode = 'list'

function AirlinesTab() {
  const [airlines, setAirlines] = useState([])
  const [regCounts, setRegCounts] = useState({})
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [selectedAirline, setSelectedAirline] = useState(null)
  const [selectedManufacturer, setSelectedManufacturer] = useState(null)
  const [manufacturerAirline, setManufacturerAirline] = useState(null)
  const [reloadNonce, setReloadNonce] = useState(0)
  const [airlineQuery, setAirlineQuery] = useState('')
  const [viewMode, setViewMode] = useState(airlinesViewMode)

  function changeViewMode(mode) { airlinesViewMode = mode; setViewMode(mode) }

  function reloadAirlines() { setReloadNonce((n) => n + 1) }

  useEffect(() => {
    if (!supabase) {
      setError('Supabase is not configured. Add VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY to your .env file.')
      setLoading(false)
      return
    }

    Promise.all([
      supabase
        .from('airlines')
        .select('id, name, country, country_flag, logo_url, is_closed, closed_date, parent_id, secondary_name, flown_in')
        .order('name', { ascending: true }),
      supabase
        .from('registrations')
        .select('airline_id'),
    ]).then(([airlinesResult, regsResult]) => {
      if (airlinesResult.error) {
        console.error('[fitzthespotter] Failed to fetch airlines:', airlinesResult.error)
        setError(airlinesResult.error.message)
      } else {
        setAirlines([...airlinesResult.data].sort(compareAirlineNames))
      }

      if (regsResult.error) {
        console.error('[fitzthespotter] Failed to fetch reg counts:', regsResult.error)
      } else {
        const counts = {}
        for (const row of regsResult.data) {
          counts[row.airline_id] = (counts[row.airline_id] ?? 0) + 1
        }
        setRegCounts(counts)
      }

      setLoading(false)
    })
  }, [reloadNonce])

  if (selectedManufacturer) {
    return (
      <ManufacturerDetailView
        manufacturerId={selectedManufacturer.id}
        airlineId={manufacturerAirline?.id ?? null}
        airlineName={manufacturerAirline?.name ?? null}
        onBack={() => { setSelectedManufacturer(null); setManufacturerAirline(null) }}
      />
    )
  }

  if (selectedAirline) {
    return (
      <AirlineDetailView
        airline={selectedAirline}
        onBack={() => setSelectedAirline(null)}
        onSelectManufacturer={(mfr) => {
          setSelectedManufacturer(mfr)
          setManufacturerAirline(selectedAirline ? { id: selectedAirline.id, name: selectedAirline.name } : null)
        }}
        onUpdated={(row) => { setSelectedAirline(row); reloadAirlines() }}
        onDeleted={() => { setSelectedAirline(null); reloadAirlines() }}
      />
    )
  }

  function renderBody() {
    // px: navy banner (~54px) + breathing room. Nudge on device if header lands hidden.
    const STICKY_OFFSET = 60

    function jumpToBucket(b) {
      const el = document.getElementById(`ag-${b}`)
      if (!el) return
      const y = el.getBoundingClientRect().top + window.scrollY - STICKY_OFFSET
      window.scrollTo({ top: y, behavior: 'smooth' })
    }

    if (loading) {
      return <p className="state-message">Loading airlines…</p>
    }
    if (error) {
      return <p className="state-message state-message--error">{error}</p>
    }
    if (airlines.length === 0) {
      return <p className="state-message">No airlines yet.</p>
    }

    const q = airlineQuery.trim().toLowerCase()
    const filtered = q
      ? airlines.filter((a) => a.name.toLowerCase().includes(q))
      : airlines

    if (q && filtered.length === 0) {
      return <p className="state-message">No airlines match.</p>
    }

    const groups = []
    const bucketMap = new Map()
    for (const airline of filtered) {
      const b = airlineBucket(airline.name)
      if (!bucketMap.has(b)) { bucketMap.set(b, []); groups.push(b) }
      bucketMap.get(b).push(airline)
    }

    return (
      <>
        {viewMode === 'list' ? (
          <ul className="airline-list">
            {groups.map((bucket) => (
              <Fragment key={bucket}>
                <li className="airline-group-header" id={`ag-${bucket}`}>{bucket}</li>
                {bucketMap.get(bucket).map((airline) => (
                  <li key={airline.id}>
                    <AirlineCard
                      airline={airline}
                      regCount={regCounts[airline.id] ?? 0}
                      onSelect={setSelectedAirline}
                    />
                  </li>
                ))}
              </Fragment>
            ))}
          </ul>
        ) : (
          <div className="airline-grid">
            {groups.map((bucket) => (
              <Fragment key={bucket}>
                <div className="airline-group-header airline-grid__header" id={`ag-${bucket}`}>{bucket}</div>
                {bucketMap.get(bucket).map((airline) => (
                  <AirlineGridTile
                    key={airline.id}
                    airline={airline}
                    regCount={regCounts[airline.id] ?? 0}
                    onSelect={setSelectedAirline}
                  />
                ))}
              </Fragment>
            ))}
          </div>
        )}
        {groups.length > 1 && (
          <nav className="az-rail" aria-label="Jump to letter">
            {groups.map((b) => (
              <button
                key={b}
                className="az-rail__letter"
                onClick={() => jumpToBucket(b)}
              >
                {b}
              </button>
            ))}
          </nav>
        )}
      </>
    )
  }

  return (
    <div className="page airlines-page">
      <TopBar
        searchValue={airlineQuery}
        onSearchChange={setAirlineQuery}
        searchPlaceholder="Search airlines…"
        onSearchClear={() => setAirlineQuery('')}
      />
      <main className="content">
        <div className="list-head">
          <p className="section-label">Airlines Spotted</p>
          <div className="airlines-view-toggle" role="group" aria-label="View mode">
            <button
              type="button"
              className={`airlines-view-toggle__btn${viewMode === 'list' ? ' is-on' : ''}`}
              onClick={() => changeViewMode('list')}
              aria-label="List view"
            >☰</button>
            <button
              type="button"
              className={`airlines-view-toggle__btn${viewMode === 'grid' ? ' is-on' : ''}`}
              onClick={() => changeViewMode('grid')}
              aria-label="Grid view"
            >▦</button>
          </div>
        </div>
        {renderBody()}
      </main>
    </div>
  )
}

export default function App() {
  const [activeTab, setActiveTab] = useState('airlines')
  const [navOpen, setNavOpen] = useState(false)
  const [navNonce, setNavNonce] = useState(0)
  const [selectedAirport, setSelectedAirport] = useState(null)
  const [desktopMode, setDesktopMode] = useState(
    () => typeof window !== 'undefined' && window.innerWidth >= 1024
  )
  const [userToggled, setUserToggled] = useState(false)

  useEffect(() => {
    if (userToggled) return
    function handleResize() {
      if (!userToggled) setDesktopMode(window.innerWidth >= 1024)
    }
    window.addEventListener('resize', handleResize)
    return () => window.removeEventListener('resize', handleResize)
  }, [userToggled])

  function handleTabChange(tab) {
    setActiveTab(tab)
    setSelectedAirport(null)
    setNavOpen(false)
    setNavNonce((n) => n + 1)
  }

  function handleToggleDesktop() {
    setUserToggled(true)
    setDesktopMode((v) => !v)
  }

  return (
    <div className={`app-root${desktopMode ? ' desktop-mode' : ''}`}>
      {activeTab === 'airlines' && <AirlinesTab key={navNonce} />}
      {activeTab === 'airports' && !selectedAirport && (
        <AirportsTab key={navNonce} onSelectAirport={setSelectedAirport} />
      )}
      {activeTab === 'airports' && selectedAirport && (
        <AirportDetailView
          airport={selectedAirport}
          onBack={() => setSelectedAirport(null)}
          onUpdated={(row) => setSelectedAirport(row)}
          onDeleted={() => { setSelectedAirport(null); setNavNonce((n) => n + 1) }}
        />
      )}
      {activeTab === 'search'   && <SearchView key={navNonce} />}

      <BottomNav
        activeTab={activeTab}
        navOpen={navOpen}
        onLogoTap={() => setNavOpen((o) => !o)}
        onTabChange={handleTabChange}
        desktopMode={desktopMode}
        onToggleDesktop={handleToggleDesktop}
      />
    </div>
  )
}
