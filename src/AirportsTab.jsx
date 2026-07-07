import { useEffect, useState, Fragment } from 'react'
import { supabase } from './lib/supabaseClient'
import { offlineAirports } from './lib/offlineData'
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
    async function loadFromOffline() {
      const data = await offlineAirports()
      if (!data) {
        setError('You are offline and no offline copy is saved yet. Download from the Offline card while connected.')
        setLoading(false)
        return
      }
      setAirports(data)
      setError(null)
      setLoading(false)
    }

    if (typeof navigator !== 'undefined' && navigator.onLine === false) {
      loadFromOffline()
      return
    }

    supabase
      .from('airports')
      .select('iata, icao, name, country, country_flag, header_image_url, view_lat, view_lng, view_zoom')
      .order('iata')
      .then(({ data, error: err }) => {
        if (err) setError(err.message)
        else setAirports(data ?? [])
        setLoading(false)
      })
      .catch(() => { loadFromOffline() })
  }, [])

  return (
    <div className="page airports-page">
      <header className="top-bar">
        <span className="top-bar__wordmark" style={{ cursor: 'default' }}>
          <span className="top-bar__title--cream">Airports</span>
        </span>
        <div className="top-bar__search">
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
      </header>
      <main className="content">
        <div className="list-head">
          <p className="section-label">Airports Spotted</p>
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
          const byCountry = new Map()
          for (const ap of filtered) {
            const c = (ap.country && ap.country.trim()) ? ap.country : '—'
            if (!byCountry.has(c)) byCountry.set(c, [])
            byCountry.get(c).push(ap)
          }
          const countries = Array.from(byCountry.keys()).sort((a, b) => {
            if (a === '—') return 1
            if (b === '—') return -1
            return a.localeCompare(b)
          })
          for (const c of countries) {
            byCountry.get(c).sort((x, y) => (x.name ?? '').localeCompare(y.name ?? ''))
          }
          return (
          <ul className="airport-list">
            {countries.map((country) => (
              <Fragment key={country}>
                <li className="airline-group-header">{country}<span className="airport-group-count">{byCountry.get(country).length}</span></li>
                {byCountry.get(country).map((ap) => (
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
              </Fragment>
            ))}
          </ul>
          )
        })()}
      </main>
    </div>
  )
}
