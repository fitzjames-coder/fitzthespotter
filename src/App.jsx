import { useEffect, useState } from 'react'
import './App.css'
import { supabase } from './lib/supabaseClient'
import AirlineDetailView from './AirlineDetailView'
import ManufacturerDetailView from './ManufacturerDetailView'
import AirportsTab from './AirportsTab'
import AirportDetailView from './AirportDetailView'
import BottomNav from './BottomNav'
import PlaceholderScreen from './PlaceholderScreen'
import NewRegistrationForm from './NewRegistrationForm'
import SearchView from './SearchView'

function compareAirlineNames(a, b) {
  const an = (a.name ?? '').trim()
  const bn = (b.name ?? '').trim()
  const aDigit = /^\d/.test(an)
  const bDigit = /^\d/.test(bn)
  if (aDigit !== bDigit) return aDigit ? -1 : 1
  return an.localeCompare(bn, 'en', { numeric: true, sensitivity: 'base' })
}

export function TopBar() {
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

function AirlineCard({ airline, regCount, onSelect }) {
  const isClosed = airline.is_closed
  return (
    <button className="airline-card" onClick={() => onSelect(airline)}>
      <div className="airline-card__main">
        <FlagIcon countryCode={airline.country_flag} />
        <div className="airline-card__text">
          <span className="airline-card__name">{airline.name}</span>
          {airline.country && (
            <span className="airline-card__country">{airline.country}</span>
          )}
        </div>
      </div>
      <div className="airline-card__right">
        {isClosed && <span className="airline-card__closed-badge">CLOSED</span>}
        {regCount !== undefined && <RegCountPill count={regCount} />}
      </div>
    </button>
  )
}

function AirlinesTab() {
  const [airlines, setAirlines] = useState([])
  const [regCounts, setRegCounts] = useState({})
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [selectedAirline, setSelectedAirline] = useState(null)
  const [selectedManufacturer, setSelectedManufacturer] = useState(null)

  useEffect(() => {
    if (!supabase) {
      setError('Supabase is not configured. Add VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY to your .env file.')
      setLoading(false)
      return
    }

    Promise.all([
      supabase
        .from('airlines')
        .select('id, name, country, country_flag, logo_url, is_closed, closed_date, parent_id')
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
  }, [])

  if (selectedManufacturer) {
    return (
      <ManufacturerDetailView
        manufacturerId={selectedManufacturer.id}
        onBack={() => setSelectedManufacturer(null)}
      />
    )
  }

  if (selectedAirline) {
    return (
      <AirlineDetailView
        airline={selectedAirline}
        onBack={() => setSelectedAirline(null)}
        onSelectManufacturer={setSelectedManufacturer}
      />
    )
  }

  function renderBody() {
    if (loading) {
      return <p className="state-message">Loading airlines…</p>
    }
    if (error) {
      return <p className="state-message state-message--error">{error}</p>
    }
    if (airlines.length === 0) {
      return <p className="state-message">No airlines yet.</p>
    }
    return (
      <ul className="airline-list">
        {airlines.map((airline) => (
          <li key={airline.id}>
            <AirlineCard
              airline={airline}
              regCount={regCounts[airline.id] ?? 0}
              onSelect={setSelectedAirline}
            />
          </li>
        ))}
      </ul>
    )
  }

  return (
    <div className="page">
      <TopBar />
      <main className="content">
        <p className="section-label">Airlines Spotted</p>
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

  function handleTabChange(tab) {
    setActiveTab(tab)
    setSelectedAirport(null)
    setNavOpen(false)
    setNavNonce((n) => n + 1)
  }

  return (
    <>
      {activeTab === 'airlines' && <AirlinesTab key={navNonce} />}
      {activeTab === 'airports' && !selectedAirport && (
        <AirportsTab key={navNonce} onSelectAirport={setSelectedAirport} />
      )}
      {activeTab === 'airports' && selectedAirport && (
        <AirportDetailView airport={selectedAirport} onBack={() => setSelectedAirport(null)} />
      )}
      {activeTab === 'search'   && <SearchView key={navNonce} />}

      <BottomNav
        activeTab={activeTab}
        navOpen={navOpen}
        onLogoTap={() => setNavOpen((o) => !o)}
        onTabChange={handleTabChange}
      />
    </>
  )
}
