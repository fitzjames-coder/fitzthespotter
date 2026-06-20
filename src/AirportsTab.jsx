import { useEffect, useState } from 'react'
import { supabase } from './lib/supabaseClient'
import { FlagIcon } from './App'

export default function AirportsTab({ onSelectAirport }) {
  const [airports, setAirports] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [airportQuery, setAirportQuery] = useState('')

  useEffect(() => {
    if (!supabase) {
      setError('Supabase is not configured.')
      setLoading(false)
      return
    }
    supabase
      .from('airports')
      .select('iata, icao, name, country, country_flag, header_image_url')
      .order('iata')
      .then(({ data, error: err }) => {
        if (err) setError(err.message)
        else setAirports(data ?? [])
        setLoading(false)
      })
  }, [])

  return (
    <div className="page airports-page">
      <header className="top-bar">
        <span className="top-bar__wordmark" style={{ cursor: 'default' }}>
          <span className="top-bar__title--cream">Airports</span>
        </span>
      </header>
      <main className="content">
        <div className="list-head">
          <p className="section-label">Airports Spotted</p>
          <div className="list-search list-search--inline">
            <div className="list-search__field">
              <span className="list-search__icon" aria-hidden="true">🔍</span>
              <input
                className="list-search__input"
                type="text"
                placeholder="Search airports…"
                value={airportQuery}
                onChange={(e) => setAirportQuery(e.target.value)}
                aria-label="Search this list"
              />
              {airportQuery && (
                <button
                  className="list-search__clear"
                  aria-label="Clear search"
                  onClick={() => setAirportQuery('')}
                >×</button>
              )}
            </div>
          </div>
        </div>
        {loading && <p className="state-message">Loading airports…</p>}
        {error && <p className="state-message state-message--error">{error}</p>}
        {!loading && !error && airports.length === 0 && (
          <p className="state-message">No airports yet.</p>
        )}
        {!loading && !error && airports.length > 0 && (() => {
          const q = airportQuery.trim().toLowerCase()
          const filtered = q
            ? airports.filter((ap) =>
                (ap.name ?? '').toLowerCase().includes(q) ||
                (ap.iata ?? '').toLowerCase().includes(q) ||
                (ap.icao ?? '').toLowerCase().includes(q)
              )
            : airports
          if (q && filtered.length === 0) {
            return <p className="state-message">No airports match.</p>
          }
          return (
          <ul className="airport-list">
            {filtered.map((ap) => (
              <li key={ap.iata}>
                <button className="airport-row" onClick={() => onSelectAirport(ap)}>
                  <span className="airport-row__iata">{ap.iata}</span>
                  <div className="airport-row__body">
                    <span className="airport-row__name">{ap.name}</span>
                    <span className="airport-row__country">
                      <FlagIcon countryCode={ap.country_flag} />
                      {ap.country}
                    </span>
                  </div>
                  <span className="airport-row__chevron" aria-hidden="true">›</span>
                </button>
              </li>
            ))}
          </ul>
          )
        })()}
      </main>
    </div>
  )
}
