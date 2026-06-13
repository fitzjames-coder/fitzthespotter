import { useEffect, useState } from 'react'
import { supabase } from './lib/supabaseClient'
import { getAirportDiagram } from './lib/airportDiagram'
import { FlagIcon } from './App'
import AirportDiagram from './AirportDiagram'

function LogoTile({ name, logoUrl }) {
  const initials = name.trim().split(/\s+/).map((w) => w[0]).join('').toUpperCase().slice(0, 2)
  return (
    <div className="stat-logo-tile ap-logo-tile" title={name}>
      {logoUrl
        ? <img className="stat-logo-tile__img" src={logoUrl} alt={name} />
        : <div className="stat-logo-tile__initials"><span>{initials}</span></div>
      }
    </div>
  )
}

export default function AirportDetailView({ airport, onBack }) {
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [gallery, setGallery] = useState([])
  const [sightingCount, setSightingCount] = useState(0)
  const [firstHere, setFirstHere] = useState(null)
  const [recentHere, setRecentHere] = useState(null)

  const [diagramGeometry, setDiagramGeometry] = useState(null)
  const [diagramStatus, setDiagramStatus] = useState('loading')

  useEffect(() => {
    setDiagramStatus('loading')
    setDiagramGeometry(null)
    getAirportDiagram(airport).then(({ status, geometry }) => {
      setDiagramStatus(status)
      setDiagramGeometry(status === 'ok' ? geometry : null)
    })
  }, [airport.iata])

  useEffect(() => {
    if (!supabase) {
      setError('Supabase is not configured.')
      setLoading(false)
      return
    }
    supabase
      .from('sightings')
      .select('spotted_on, registrations ( airlines ( id, name, logo_url ) )')
      .eq('airport', airport.iata)
      .then(({ data, error: err }) => {
        if (err) {
          setError(err.message)
          setLoading(false)
          return
        }
        const rows = data ?? []
        setSightingCount(rows.length)

        const dates = rows.map((r) => r.spotted_on).filter(Boolean).sort()
        setFirstHere(dates[0] ?? null)
        setRecentHere(dates[dates.length - 1] ?? null)

        const airlineMap = new Map()
        for (const row of rows) {
          const al = row.registrations?.airlines
          if (al?.id && !airlineMap.has(al.id)) {
            airlineMap.set(al.id, { id: al.id, name: al.name, logo_url: al.logo_url ?? null })
          }
        }
        setGallery(
          Array.from(airlineMap.values()).sort((a, b) => a.name.localeCompare(b.name))
        )
        setLoading(false)
      })
  }, [airport.iata])

  const codes = [airport.icao, airport.iata].filter(Boolean).join(' / ')

  const SKYLINE_IMAGES = { OKA: '/oka-hero.PNG' }
  const skylineImage = SKYLINE_IMAGES[airport.iata] || null

  const runwayRefs = (diagramGeometry ?? [])
    .filter((w) => w.aeroway === 'runway' && w.ref)
    .map((w) => w.ref)
  const uniqueRefs = [...new Set(runwayRefs)]

  return (
    <div className="page page--deep-blue">
      <AirportDiagram geometry={diagramGeometry} status={diagramStatus} />
      <header className={`ap-top-bar${airport.iata === 'OKA' ? ' ap-top-bar--oka' : ''}`}>
        <button className="ap-top-bar__back" onClick={onBack} aria-label="Back to airports">
          ‹ Back
        </button>
        <div className="ap-top-bar__body">
          <h1 className="ap-top-bar__name">{airport.name}</h1>
          <div className="ap-top-bar__meta">
            <span className="ap-top-bar__codes">{codes}</span>
            <FlagIcon countryCode={airport.country_flag} />
            <span className="ap-top-bar__country">{airport.country}</span>
          </div>
          {uniqueRefs.length > 0 && (
            <div className="ap-top-bar__runways" style={{ fontSize: '0.72rem', color: 'rgba(246,239,220,0.7)', marginTop: '0.15rem', letterSpacing: '0.3px' }}>
              Runways · {uniqueRefs.join(' · ')}
            </div>
          )}
        </div>
      </header>

      {loading && <p className="state-message">Loading…</p>}
      {error && <p className="state-message state-message--error">{error}</p>}

      {!loading && !error && (
        <main className="content ap-content">
          <div className="ap-stat-row">
            <div className="ap-stat">
              <span className="ap-stat__value">{gallery.length}</span>
              <span className="ap-stat__label">Airlines</span>
            </div>
            <div className="ap-stat">
              <span className="ap-stat__value">{sightingCount}</span>
              <span className="ap-stat__label">Sightings</span>
            </div>
            <div className="ap-stat">
              <span className={`ap-stat__value airport-date--first`}>{firstHere ?? '—'}</span>
              <span className="ap-stat__label">First here</span>
            </div>
            <div className="ap-stat">
              <span className={`ap-stat__value airport-date--last`}>{recentHere ?? '—'}</span>
              <span className="ap-stat__label">Most recent</span>
            </div>
          </div>

          {gallery.length > 0 && (
            <div className="ap-gallery">
              {gallery.map((airline) => (
                <LogoTile key={airline.id} name={airline.name} logoUrl={airline.logo_url} />
              ))}
            </div>
          )}

          {airport.remarks && (
            <p className="ap-remarks">{airport.remarks}</p>
          )}

          {airport.runway_image_url && (
            <img
              className="ap-runway-img"
              src={airport.runway_image_url}
              alt={`${airport.iata} runway`}
            />
          )}

          {skylineImage && (
            <div className="ap-skyline">
              <img className="ap-skyline__img" src={skylineImage} alt={`${airport.name} skyline`} />
            </div>
          )}
        </main>
      )}
    </div>
  )
}
