import { useEffect, useState } from 'react'
import TypeaheadPicker from './TypeaheadPicker'
import { supabase } from './lib/supabaseClient'
import { stripTypeParens } from './lib/typeGrouping'
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

async function fetchAirlinesForRetire(q) {
  if (!supabase) return []
  const { data } = await supabase
    .from('airlines')
    .select('id, name')
    .ilike('name', `%${q}%`)
    .order('name')
    .limit(8)
  return (data ?? []).map((a) => ({ id: a.id, label: a.name }))
}

function RetireTypeOverlay({ type, onClose }) {
  const [airline, setAirline] = useState(null)
  const [saving, setSaving] = useState(false)
  const [flash, setFlash] = useState(null)

  async function handlePick(opt) {
    setAirline(opt)
    if (!opt || !supabase) return
    setSaving(true)
    setFlash(null)
    const existing = await supabase
      .from('retired_types')
      .select('id')
      .eq('airline_id', opt.id)
      .eq('aircraft_type_id', type.id)
      .maybeSingle()
    if (existing.data) {
      setSaving(false)
      setFlash({ kind: 'warn', text: `${type.name} is already marked as retired for ${opt.label}.` })
      setAirline(null)
      return
    }
    const { error } = await supabase
      .from('retired_types')
      .insert({ airline_id: opt.id, aircraft_type_id: type.id })
    setSaving(false)
    if (error) {
      setFlash({ kind: 'warn', text: error.message })
      setAirline(null)
    } else {
      setFlash({ kind: 'ok', text: `${type.name} marked retired for ${opt.label}.` })
      setAirline(null)
    }
  }

  return (
    <div className="retire-overlay" onClick={onClose}>
      <div className="retire-card" onClick={(e) => e.stopPropagation()}>
        <div className="retire-card__head">
          <span className="retire-card__title">Mark {type.name} retired</span>
          <button className="retire-card__close" onClick={onClose} aria-label="Close">✕</button>
        </div>
        <p className="retire-card__hint">Search an airline you've logged. The type will be marked retired for that airline only.</p>
        <TypeaheadPicker
          placeholder="Airline name…"
          value={airline}
          onSelect={handlePick}
          fetchOptions={fetchAirlinesForRetire}
          disabled={saving}
        />
        {flash && (
          <p className={`retire-flash retire-flash--${flash.kind}`}>{flash.text}</p>
        )}
      </div>
    </div>
  )
}

function TypeTile({ type, count, onRetire }) {
  const isZero = count === 0
  return (
    <button
      type="button"
      className={`type-tile-wrap type-tile-wrap--btn${isZero ? ' type-tile-wrap--zero' : ''}`}
      onClick={() => onRetire(type)}
    >
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
      <span className="type-tile__name">{stripTypeParens(type.name)}</span>
    </button>
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
  const [retireType, setRetireType] = useState(null)

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
                <TypeTile key={type.id} type={type} count={regCounts[type.id] ?? 0} onRetire={setRetireType} />
              ))}
            </div>
          )}
        </main>
      </div>

      {retireType && (
        <RetireTypeOverlay type={retireType} onClose={() => setRetireType(null)} />
      )}

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
