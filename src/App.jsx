import { useEffect, useState } from 'react'
import './App.css'
import { supabase } from './lib/supabaseClient'

function TopBar() {
  return (
    <header className="top-bar">
      <h1 className="top-bar__title">
        <span className="top-bar__title--cream">Fitz</span>
        <span className="top-bar__title--amber">the</span>
        <span className="top-bar__title--cream">spotter</span>
      </h1>
    </header>
  )
}

function AirlineCard({ airline }) {
  const isClosed = airline.status === 'closed'
  return (
    <div className="airline-card">
      <div className="airline-card__main">
        {airline.flag_emoji && (
          <span className="airline-card__flag" aria-hidden="true">
            {airline.flag_emoji}
          </span>
        )}
        <div className="airline-card__text">
          <span className="airline-card__name">{airline.name}</span>
          {airline.country && (
            <span className="airline-card__country">{airline.country}</span>
          )}
        </div>
      </div>
      {isClosed && <span className="airline-card__closed-badge">CLOSED</span>}
    </div>
  )
}

export default function App() {
  const [airlines, setAirlines] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)

  useEffect(() => {
    if (!supabase) {
      setError('Supabase is not configured. Add VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY to your .env file.')
      setLoading(false)
      return
    }

    supabase
      .from('airlines')
      .select('id, name, country, country_code, flag_emoji, logo_url, status, closed_date, parent_airline_id')
      .order('name', { ascending: true })
      .then(({ data, error: fetchError }) => {
        if (fetchError) {
          console.error('[fitzthespotter] Failed to fetch airlines:', fetchError)
          setError(fetchError.message)
        } else {
          setAirlines(data)
        }
        setLoading(false)
      })
  }, [])

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
            <AirlineCard airline={airline} />
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
