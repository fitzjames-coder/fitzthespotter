import { useEffect, useState } from 'react'
import './App.css'
import { supabase } from './lib/supabaseClient'
import AirlineDetailView from './AirlineDetailView'
import ManufacturerDetailView from './ManufacturerDetailView'
import BottomNav from './BottomNav'
import PlaceholderScreen from './PlaceholderScreen'

function EntryModal({ onClose }) {
  return (
    <div className="entry-modal-backdrop" onClick={onClose}>
      <div className="entry-modal" onClick={(e) => e.stopPropagation()}>
        <p className="entry-modal__text">Entry form coming soon</p>
        <button className="entry-modal__close" onClick={onClose}>Close</button>
      </div>
    </div>
  )
}

function TopBar() {
  const [showModal, setShowModal] = useState(false)
  return (
    <>
      <header className="top-bar">
        <button
          className="top-bar__wordmark"
          onClick={() => setShowModal(true)}
          aria-label="Add new entry"
        >
          <span className="top-bar__title--cream">Fitz</span>
          <span className="top-bar__title--amber">the</span>
          <span className="top-bar__title--cream">spotter</span>
          <sup className="top-bar__plus" aria-hidden="true">+</sup>
        </button>
      </header>
      {showModal && <EntryModal onClose={() => setShowModal(false)} />}
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
        setAirlines(airlinesResult.data)
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

  function handleTabChange(tab) {
    setActiveTab(tab)
    setNavOpen(false)
  }

  return (
    <>
      {activeTab === 'airlines' && <AirlinesTab />}
      {activeTab === 'stats'    && <PlaceholderScreen name="Stats" />}
      {activeTab === 'airports' && <PlaceholderScreen name="Airports" />}
      {activeTab === 'search'   && <PlaceholderScreen name="Search" />}

      <BottomNav
        activeTab={activeTab}
        navOpen={navOpen}
        onLogoTap={() => setNavOpen((o) => !o)}
        onTabChange={handleTabChange}
      />
    </>
  )
}
