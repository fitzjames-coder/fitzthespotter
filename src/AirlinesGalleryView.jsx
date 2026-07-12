import { useEffect, useState } from 'react'
import { supabase } from './lib/supabaseClient'
import { fetchAllRows } from './lib/fetchAllRows'

function galInitials(name) {
  return name.trim().split(/\s+/).map((w) => w[0]).join('').toUpperCase().slice(0, 2)
}

export default function AirlinesGalleryView({ onBack }) {
  const [airlines, setAirlines] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)

  useEffect(() => {
    let active = true
    fetchAllRows(() =>
      supabase
        .from('registrations')
        .select('airlines ( id, name, logo_url )')
    ).then(({ data, error }) => {
        if (!active) return
        if (error) { setError(error.message); setLoading(false); return }
        const map = new Map()
        for (const row of data || []) {
          const a = row.airlines
          if (a && a.id && !map.has(a.id)) map.set(a.id, a)
        }
        const list = [...map.values()].sort((x, y) => x.name.localeCompare(y.name))
        setAirlines(list)
        setLoading(false)
      })
    return () => { active = false }
  }, [])

  return (
    <div className="page page--deep-blue airlines-gallery-page">
      <header className="ap-top-bar">
        <button className="ap-top-bar__back" onClick={onBack}>‹ Back</button>
        <div className="ap-top-bar__body">
          <h1 className="ap-top-bar__name">Airlines Spotted</h1>
        </div>
      </header>
      <main className="content">
        {loading && <p className="state-message">Loading…</p>}
        {error && <p className="state-message state-message--error">{error}</p>}
        {!loading && !error && (
          <div className="stat-logo-grid">
            {airlines.map((a) => (
              <div className="stat-logo-tile" title={a.name} key={a.id}>
                {a.logo_url
                  ? <img className="stat-logo-tile__img" src={a.logo_url} alt={a.name} />
                  : <div className="stat-logo-tile__initials"><span>{galInitials(a.name)}</span></div>}
              </div>
            ))}
          </div>
        )}
      </main>
    </div>
  )
}
