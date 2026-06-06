import { useEffect, useState } from 'react'
import { supabase } from './lib/supabaseClient'
import ManufacturerDetailView from './ManufacturerDetailView'

function mfrInitials(name) {
  const words = name.trim().split(/\s+/)
  if (words.length >= 2) return (words[0][0] + words[1][0]).toUpperCase()
  return name.slice(0, 2).toUpperCase()
}

function MfrTile({ manufacturer, onSelect }) {
  return (
    <button
      className="mfr-gallery-tile"
      onClick={() => onSelect(manufacturer)}
      aria-label={manufacturer.name}
    >
      <div className="mfr-gallery-tile__logo">
        {manufacturer.logo_url ? (
          <img
            className="mfr-gallery-tile__logo-img"
            src={manufacturer.logo_url}
            alt=""
            aria-hidden="true"
          />
        ) : (
          <span className="mfr-gallery-tile__logo-initials">{mfrInitials(manufacturer.name)}</span>
        )}
      </div>
      <span className="mfr-gallery-tile__name">{manufacturer.name}</span>
    </button>
  )
}

export default function ManufacturersView({ onBack }) {
  const [manufacturers, setManufacturers] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [selectedManufacturer, setSelectedManufacturer] = useState(null)

  useEffect(() => {
    if (!supabase) {
      setError('Supabase is not configured.')
      setLoading(false)
      return
    }
    supabase
      .from('manufacturers')
      .select('id, name, logo_url')
      .order('name')
      .then(({ data, error: err }) => {
        if (err) setError(err.message)
        else setManufacturers(data ?? [])
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

  return (
    <div className="page search-page">
      <header className="stats-top-bar">
        <button className="stats-top-bar__back" onClick={onBack} aria-label="Back to search">
          ‹ Back
        </button>
        <h1 className="stats-top-bar__title">Manufacturers</h1>
      </header>

      <main className="content stats-content">
        {loading && <p className="search-state">Loading…</p>}
        {error && <p className="search-state search-state--error">{error}</p>}
        {!loading && !error && manufacturers.length === 0 && (
          <p className="search-state">No manufacturers yet.</p>
        )}
        {!loading && !error && manufacturers.length > 0 && (
          <div className="mfr-gallery">
            {manufacturers.map((mfr) => (
              <MfrTile key={mfr.id} manufacturer={mfr} onSelect={setSelectedManufacturer} />
            ))}
          </div>
        )}
      </main>
    </div>
  )
}
