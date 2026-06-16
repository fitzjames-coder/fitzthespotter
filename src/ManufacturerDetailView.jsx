import { useEffect, useState } from 'react'
import { supabase } from './lib/supabaseClient'
import ManufacturerForm from './ManufacturerForm'

const CURRENT_YEAR = new Date().getFullYear()

function heroInitials(name) {
  return name.split(/\s+/).map((w) => w[0]).join('').toUpperCase().slice(0, 3)
}

function thumbAbbrev(model) {
  const seg = model.split(/[-\s]/)[0]
  return seg.length <= 5 ? seg : seg.slice(0, 4)
}

function buildMeta(manufacturer) {
  const parts = []
  const hqLine = [manufacturer.hq_flag, manufacturer.hq_country].filter(Boolean).join(' ')
  if (hqLine) parts.push(hqLine)
  if (manufacturer.founded_year) {
    const age = CURRENT_YEAR - manufacturer.founded_year
    parts.push(`founded ${manufacturer.founded_year} · ${age} yrs`)
  }
  if (manufacturer.origin_country && manufacturer.origin_country !== manufacturer.hq_country) {
    parts.push(`origin ${manufacturer.origin_country}`)
  }
  return parts.join(' · ')
}

function HeroLogo({ manufacturer }) {
  if (manufacturer.logo_url) {
    return (
      <img
        className="mfr-hero__logo"
        src={manufacturer.logo_url}
        alt=""
        aria-hidden="true"
      />
    )
  }
  return (
    <div className="mfr-hero__logo-placeholder" aria-hidden="true">
      <span className="mfr-hero__logo-initials">{heroInitials(manufacturer.name)}</span>
    </div>
  )
}

function TypeTile({ type, count }) {
  const isZero = count === 0
  return (
    <div className={`type-tile-wrap${isZero ? ' type-tile-wrap--zero' : ''}`}>
      <div className="type-tile">
        {type.template_url ? (
          <img className="type-tile__img" src={type.template_url} alt="" aria-hidden="true" />
        ) : (
          <div className="type-tile__placeholder" aria-hidden="true">
            {thumbAbbrev(type.name)}
          </div>
        )}
        <div className="type-tile__overlay">
          <span className="type-tile__count">{count}</span>
        </div>
      </div>
      <span className="type-tile__name">{type.name}</span>
    </div>
  )
}

export default function ManufacturerDetailView({ manufacturerId, airlineId = null, airlineName = null, onBack }) {
  const [manufacturer, setManufacturer] = useState(null)
  const [types, setTypes] = useState([])
  const [regCounts, setRegCounts] = useState({})
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [showEdit, setShowEdit] = useState(false)
  const [refreshNonce, setRefreshNonce] = useState(0)

  useEffect(() => {
    if (!supabase) {
      setError('Supabase is not configured.')
      setLoading(false)
      return
    }

    Promise.all([
      supabase
        .from('manufacturers')
        .select('id, name, hq_country, hq_flag, origin_country, founded_year, logo_url')
        .eq('id', manufacturerId)
        .single(),
      supabase
        .from('aircraft_types')
        .select('id, name, template_url')
        .eq('manufacturer_id', manufacturerId)
        .order('name', { ascending: true }),
    ]).then(async ([mfrResult, typesResult]) => {
      if (mfrResult.error) {
        setError(mfrResult.error.message)
        setLoading(false)
        return
      }
      setManufacturer(mfrResult.data)

      if (typesResult.error) {
        console.error('[fitzthespotter] Failed to fetch aircraft types:', typesResult.error)
        setLoading(false)
        return
      }

      const fetchedTypes = typesResult.data ?? []
      setTypes(fetchedTypes)

      if (fetchedTypes.length > 0) {
        const typeIds = fetchedTypes.map((t) => t.id)
        let regsQuery = supabase
          .from('registrations')
          .select('aircraft_type_id')
          .in('aircraft_type_id', typeIds)
        if (airlineId) regsQuery = regsQuery.eq('airline_id', airlineId)
        const { data: regsData } = await regsQuery

        if (regsData) {
          const counts = {}
          for (const row of regsData) {
            counts[row.aircraft_type_id] = (counts[row.aircraft_type_id] ?? 0) + 1
          }
          setRegCounts(counts)
        }
      }

      setLoading(false)
    })
  }, [manufacturerId, airlineId, refreshNonce])

  const totalRegs = Object.values(regCounts).reduce((sum, n) => sum + n, 0)
  const meta = manufacturer ? buildMeta(manufacturer) : ''

  return (
    <>
      <div className="page page--navy">
        <div className="mfr-hero">
          <button className="top-bar__back" onClick={onBack} aria-label="Back">
            ‹ Back
          </button>
          {manufacturer && (
            <div className="mfr-hero__body">
              <button className="edit-btn" onClick={() => setShowEdit(true)} aria-label="Edit manufacturer">Edit</button>
              <HeroLogo manufacturer={manufacturer} />
              <h1 className="mfr-hero__name">{manufacturer.name}</h1>
              {airlineName && (
                <p className="mfr-hero__filter-context">Filtered to {airlineName}</p>
              )}
              {meta && <p className="mfr-hero__meta">{meta}</p>}
              {!loading && (
                <div className="mfr-hero__stats">
                  <span className="mfr-regs-logged__number">{totalRegs}</span>
                  <span className="mfr-regs-logged__label">REGS LOGGED</span>
                </div>
              )}
            </div>
          )}
        </div>
        <main className="content">
          <p className="section-label">Aircraft Types</p>
          {loading && <p className="state-message">Loading…</p>}
          {!loading && error && <p className="state-message state-message--error">{error}</p>}
          {!loading && !error && types.length === 0 && (
            <p className="state-message">No aircraft types yet.</p>
          )}
          {!loading && !error && types.length > 0 && (
            <div className="type-gallery">
              {types.map((type) => (
                <TypeTile key={type.id} type={type} count={regCounts[type.id] ?? 0} />
              ))}
            </div>
          )}
        </main>
      </div>

      {showEdit && manufacturer && (
        <ManufacturerForm
          existing={manufacturer}
          onCancel={() => { setShowEdit(false); setRefreshNonce((n) => n + 1) }}
          onUpdated={(row) => { setManufacturer(row); setShowEdit(false); setRefreshNonce((n) => n + 1) }}
        />
      )}
    </>
  )
}
