import { useEffect, useMemo, useState, useRef } from 'react'
import { supabase } from './lib/supabaseClient'
import { stripTypeParens } from './lib/typeGrouping'
import { offlineAirlineRegs } from './lib/offlineData'
import RegistrationProfileView from './RegistrationProfileView'
import StatusMarks from './StatusMarks'
import AirlineForm from './AirlineForm'
import NewRegistrationForm from './NewRegistrationForm'
import markFlownIn from './assets/marks/mark-flown-in.png'

function heroInitials(name) {
  return name.split(/\s+/).map((w) => w[0]).join('').toUpperCase().slice(0, 3)
}

function thumbAbbrev(model) {
  const seg = model.split(/[-\s]/)[0]
  return seg.length <= 5 ? seg : seg.slice(0, 4)
}

function closedYear(airline) {
  if (!airline.closed_date) return null
  const y = new Date(airline.closed_date).getFullYear()
  return isNaN(y) ? null : y
}

function formatShortDate(iso) {
  if (!iso) return null
  const [y, m, d] = iso.split('-').map(Number)
  const months = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec']
  return `${d} ${months[m - 1]} ${y}`
}

function FlagIcon({ countryCode }) {
  if (!countryCode) return null
  return (
    <span
      className={`fi fi-${countryCode.toLowerCase()} airline-hero__flag`}
      aria-hidden="true"
    />
  )
}

function AirlineHeroLogo({ airline }) {
  if (airline.logo_url) {
    return (
      <img
        className="airline-hero__logo"
        src={airline.logo_url}
        alt=""
        aria-hidden="true"
      />
    )
  }
  return (
    <div className="airline-hero__logo-placeholder" aria-hidden="true">
      <span className="airline-hero__logo-initials">{heroInitials(airline.name)}</span>
    </div>
  )
}

function RetiredPill({ item, onLongPress }) {
  const timer = useRef(null)
  const fired = useRef(false)

  function start() {
    fired.current = false
    timer.current = setTimeout(() => {
      fired.current = true
      onLongPress(item)
    }, 1500)
  }
  function cancel() {
    if (timer.current) { clearTimeout(timer.current); timer.current = null }
  }

  return (
    <span
      className="retired-pill"
      onPointerDown={start}
      onPointerUp={cancel}
      onPointerLeave={cancel}
      onContextMenu={(e) => e.preventDefault()}
      title="Press and hold to un-retire"
    >
      {item.type_name}
    </span>
  )
}

function AirlineHero({ airline, regCount, sightingCount, loading, onBack, onEdit, onAddReg, retiredTypes, onRetireLongPress, details }) {
  const isClosed = airline.is_closed
  const year = closedYear(airline)

  const metaParts = []
  if (airline.country) metaParts.push(airline.country)
  if (isClosed && year) metaParts.push(`closed ${year}`)
  const meta = metaParts.join(' · ')

  let identityMeta = null
  if (details) {
    const parts = []
    const codes = [details.iata, details.icao].filter(Boolean)
    if (codes.length) parts.push(codes.join(' · '))
    if (details.callsign) parts.push(`"${details.callsign}"`)
    if (details.founded) {
      const y = parseInt(details.founded.slice(0, 4), 10)
      if (!isNaN(y)) parts.push(`est. ${y}`)
    }
    if (parts.length) identityMeta = parts.join(' · ')
  }

  return (
    <div className="airline-hero">
      <button className="top-bar__back" onClick={onBack} aria-label="Back to airlines list">
        ‹ Back
      </button>
      <button className="edit-btn" onClick={onEdit} aria-label="Edit airline">Edit</button>
      <button className="reg-add-btn" onClick={onAddReg} aria-label="Add registration">REG</button>
      <div className="airline-hero__body">
        <AirlineHeroLogo airline={airline} />
        <div className="airline-hero__text">
          <div className="airline-hero__name-row">
            <h1 className="airline-hero__name">{airline.name}</h1>
            {airline.flown_in && (
              <img className="airline-hero__flown" src={markFlownIn} alt="Flown" title="Flown this airline" />
            )}
            {isClosed && <span className="airline-closed-chip">CLOSED</span>}
          </div>
          {airline.secondary_name && (
            <p className="airline-hero__secondary">{airline.secondary_name}</p>
          )}
          {identityMeta && (
            <p className="airline-hero__meta">{identityMeta}</p>
          )}
          {(airline.country_flag || meta) && (
            <p className="airline-hero__meta">
              <FlagIcon countryCode={airline.country_flag} />
              {meta && <span>{meta}</span>}
            </p>
          )}
          {!loading && (
            <div className="airline-hero__stats">
              <span className="airline-regs-logged__number">{regCount}</span>
              <span className="airline-regs-logged__label">REGS LOGGED</span>
              {typeof sightingCount === 'number' && (
                <span className="airline-regs-logged__sub">{sightingCount} sightings</span>
              )}
            </div>
          )}
        </div>
      </div>
      {retiredTypes && retiredTypes.length > 0 && (
        <div className="airline-hero__retired">
          {retiredTypes.map((rt) => (
            <RetiredPill key={rt.id} item={rt} onLongPress={onRetireLongPress} />
          ))}
        </div>
      )}
      {isClosed && (
        <img
          className="airline-hero__closed-banner"
          src="/Closed.PNG"
          alt="Closed — ceased operations"
        />
      )}
    </div>
  )
}

function deriveManufacturerBreakdown(registrations) {
  const mfrMap = new Map()
  for (const reg of registrations) {
    const mfr = reg.aircraft_types?.manufacturers
    const model = reg.aircraft_types?.name ? stripTypeParens(reg.aircraft_types.name) : null
    if (!mfr?.name || !model) continue
    if (!mfrMap.has(mfr.id)) mfrMap.set(mfr.id, { id: mfr.id, name: mfr.name, count: 0, models: new Map() })
    const entry = mfrMap.get(mfr.id)
    entry.count++
    entry.models.set(model, (entry.models.get(model) ?? 0) + 1)
  }
  return Array.from(mfrMap.values())
    .map(({ id, name, count, models }) => ({
      id,
      name,
      count,
      models: Array.from(models.entries())
        .map(([model, count]) => ({ model, count }))
        .sort((a, b) => b.count - a.count || a.model.localeCompare(b.model)),
    }))
    .sort((a, b) => b.count - a.count || a.name.localeCompare(b.name))
}

function ManufacturerBreakdown({ registrations, onSelectManufacturer }) {
  const [open, setOpen] = useState(false)
  const [expandedMfrs, setExpandedMfrs] = useState(new Set())

  const breakdown = useMemo(() => deriveManufacturerBreakdown(registrations), [registrations])

  if (breakdown.length === 0) return null

  function toggleMfr(id) {
    setExpandedMfrs((prev) => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })
  }

  return (
    <div className="breakdown-card">
      <button
        className="breakdown-title-row"
        onClick={() => setOpen((o) => !o)}
        aria-expanded={open}
      >
        <span className="breakdown-title">Manufacturer Breakdown</span>
        <span className={`breakdown-chevron${open ? ' breakdown-chevron--open' : ''}`} aria-hidden="true">
          ▾
        </span>
      </button>
      {open && (
        <div className="breakdown-body">
          {breakdown.map(({ id, name, count, models }) => {
            const isExpanded = expandedMfrs.has(id)
            return (
              <div key={id} className="mfr-group">
                <div className="mfr-row">
                  <button
                    className="mfr-row__name-area"
                    onClick={() => onSelectManufacturer?.({ id })}
                    aria-label={`View ${name} details`}
                  >
                    <span className="mfr-row__name">{name}</span>
                  </button>
                  <button
                    className="mfr-row__toggle-area"
                    onClick={() => toggleMfr(id)}
                    aria-expanded={isExpanded}
                    aria-label={`${isExpanded ? 'Collapse' : 'Expand'} ${name} models`}
                  >
                    <span className="mfr-row__count">{count}</span>
                    <span className={`mfr-row__chevron${isExpanded ? ' mfr-row__chevron--open' : ''}`} aria-hidden="true">
                      ›
                    </span>
                  </button>
                </div>
                {isExpanded && (
                  <div className="model-rows">
                    {models.map(({ model, count: mc }) => (
                      <div key={model} className="model-row">
                        <span className="model-row__name">{model}</span>
                        <span className="model-row__count">{mc}</span>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}

function AirlineIdentityCard({ details, regCount }) {
  if (!details) return null
  const hasAny = details.founded ||
    (Array.isArray(details.hubs) && details.hubs.length > 0) ||
    details.airline_group || details.predecessors ||
    (details.fleet_size && details.fleet_size_date)
  if (!hasAny) return null

  return (
    <div className="info-card">
      {details.founded && (
        <div className="info-row">
          <span className="info-row__label">Founded</span>
          <span className="info-row__value">{formatShortDate(details.founded)}</span>
        </div>
      )}
      {Array.isArray(details.hubs) && details.hubs.length > 0 && (
        <div className="info-row info-row--airports">
          <span className="info-row__label">Hub · Bases</span>
          <div className="info-row__pills">
            {details.hubs.map((code) => (
              <span key={code} className="airport-pill">{code}</span>
            ))}
          </div>
        </div>
      )}
      {details.airline_group && (
        <div className="info-row">
          <span className="info-row__label">Group</span>
          <span className="info-row__value">{details.airline_group}</span>
        </div>
      )}
      {details.predecessors && (
        <div className="info-row">
          <span className="info-row__label">Predecessors</span>
          <span className="info-row__value">{details.predecessors}</span>
        </div>
      )}
      {details.fleet_size && details.fleet_size_date && (
        <div className="info-row">
          <span className="info-row__label">Fleet</span>
          <span className="info-row__value">
            {details.fleet_size} aircraft as of {formatShortDate(details.fleet_size_date)} — {regCount} captured ({((regCount / details.fleet_size) * 100).toFixed(1)}%)
          </span>
        </div>
      )}
    </div>
  )
}

function RegistrationCard({ reg, onSelect }) {
  const typeName = reg.aircraft_types?.name ? stripTypeParens(reg.aircraft_types.name) : null
  const abbrev = typeName ? thumbAbbrev(typeName) : ''

  return (
    <button className="reg-card" onClick={() => onSelect(reg)}>
      <div className="reg-card__thumb" aria-hidden="true">
        <span className="reg-card__thumb-text">{abbrev}</span>
      </div>
      <div className="reg-card__body">
        <span className="reg-card__reg">{reg.registration}</span>
        {typeName && <span className="reg-card__type">{typeName}</span>}
      </div>
      <StatusMarks statuses={reg.statuses} />
    </button>
  )
}

export default function AirlineDetailView({ airline, onBack, onSelectManufacturer, onUpdated, onDeleted }) {
  const [registrations, setRegistrations] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [selectedReg, setSelectedReg] = useState(null)
  const [showEdit, setShowEdit] = useState(false)
  const [showRegForm, setShowRegForm] = useState(false)
  const [retiredTypes, setRetiredTypes] = useState([])
  const [unretireTarget, setUnretireTarget] = useState(null)
  const [sightingCount, setSightingCount] = useState(null)
  const [regQuery, setRegQuery] = useState('')
  const [showSearch, setShowSearch] = useState(false)
  const [sortMode, setSortMode] = useState('spotted')
  const [airlineDetails, setAirlineDetails] = useState(null)

  useEffect(() => {
    if (!supabase || !airline.id) return
    supabase
      .from('airlines')
      .select('iata, icao, callsign, founded, predecessors, airline_group, hubs, fleet_size, fleet_size_date')
      .eq('id', airline.id)
      .single()
      .then(({ data }) => { if (data) setAirlineDetails(data) })
  }, [airline.id])

  function loadRetiredTypes() {
    if (!supabase) return
    supabase
      .from('retired_types')
      .select('id, aircraft_types ( name )')
      .eq('airline_id', airline.id)
      .then(({ data }) => {
        const rows = (data ?? [])
          .map((r) => ({ id: r.id, type_name: r.aircraft_types?.name }))
          .filter((r) => r.type_name)
          .sort((a, b) => a.type_name.localeCompare(b.type_name))
        setRetiredTypes(rows)
      })
  }

  async function confirmUnretire() {
    if (!unretireTarget || !supabase) return
    await supabase.from('retired_types').delete().eq('id', unretireTarget.id)
    setUnretireTarget(null)
    loadRetiredTypes()
  }

  function loadRegistrations() {
    if (!supabase) {
      setError('Supabase is not configured.')
      setLoading(false)
      return
    }

    async function loadFromOffline() {
      const data = await offlineAirlineRegs(airline.id)
      if (!data) {
        setError('You are offline and no offline copy is saved yet. Download from the Offline card while connected.')
        setLoading(false)
        return
      }
      setRegistrations(data.regs)
      setSightingCount(data.sightingCount)
      setError(null)
      setLoading(false)
    }

    if (typeof navigator !== 'undefined' && navigator.onLine === false) {
      loadFromOffline()
      return
    }

    supabase
      .from('registrations')
      .select(`
        id,
        registration,
        first_spotted,
        statuses,
        aircraft_types (
          id,
          name,
          manufacturers (
            id,
            name
          )
        )
      `)
      .eq('airline_id', airline.id)
      .order('first_spotted', { ascending: true, nullsFirst: false })
      .order('registration', { ascending: true })
      .then(({ data, error: fetchError }) => {
        if (fetchError) {
          console.error('[fitzthespotter] Failed to fetch registrations:', fetchError)
          setError(fetchError.message)
        } else {
          setRegistrations(data)
        }
        setLoading(false)

        supabase
          .from('sightings')
          .select('id, registrations!inner(airline_id)', { count: 'exact', head: true })
          .eq('registrations.airline_id', airline.id)
          .then(({ count }) => setSightingCount(count ?? 0))
      })
      .catch(() => { loadFromOffline() })
  }

  useEffect(() => {
    loadRegistrations()
    loadRetiredTypes()
  }, [airline.id])

  if (selectedReg) {
    return (
      <RegistrationProfileView
        regId={selectedReg.id}
        airline={airline}
        onBack={() => setSelectedReg(null)}
        onChanged={loadRegistrations}
      />
    )
  }

  const regCount = registrations.length

  function renderBody() {
    if (loading) {
      return <p className="state-message">Loading registrations…</p>
    }
    if (error) {
      return <p className="state-message state-message--error">{error}</p>
    }
    if (registrations.length === 0) {
      return <p className="state-message">No registrations yet.</p>
    }
    const q = regQuery.trim().toLowerCase()
    const filtered = q ? registrations.filter((r) => r.registration.toLowerCase().includes(q)) : registrations
    const displayed = sortMode === 'az'
      ? [...filtered].sort((a, b) => a.registration.localeCompare(b.registration, 'en', { numeric: true }))
      : filtered
    return (
      <>
        <AirlineIdentityCard details={airlineDetails} regCount={regCount} />
        <ManufacturerBreakdown registrations={registrations} onSelectManufacturer={onSelectManufacturer} />
        <div className="reg-list-head">
          <p className="section-label">Registrations</p>
          <div className="reg-list-controls">
            <div className="airlines-view-toggle" role="group" aria-label="Sort order">
              <button
                type="button"
                className={`airlines-view-toggle__btn${sortMode === 'spotted' ? ' is-on' : ''}`}
                onClick={() => setSortMode('spotted')}
              >Spotted</button>
              <button
                type="button"
                className={`airlines-view-toggle__btn${sortMode === 'az' ? ' is-on' : ''}`}
                onClick={() => setSortMode('az')}
              >A–Z</button>
            </div>
            <button
              type="button"
              className={`reg-search-btn${showSearch ? ' reg-search-btn--on' : ''}`}
              onClick={() => { if (showSearch) { setShowSearch(false); setRegQuery('') } else { setShowSearch(true) } }}
              aria-label="Search registrations"
            >🔍</button>
          </div>
        </div>
        {showSearch && (
          <div className="reg-search-bar">
            <input
              className="reg-search-bar__input"
              type="text"
              placeholder="Filter registrations…"
              value={regQuery}
              onChange={(e) => setRegQuery(e.target.value)}
              aria-label="Filter registrations"
              autoFocus
            />
            <button
              className="reg-search-bar__clear"
              onClick={() => { setRegQuery(''); setShowSearch(false) }}
              aria-label="Clear and close search"
            >✕</button>
          </div>
        )}
        {showSearch && q && (
          <p className="reg-search-result">{displayed.length} of {registrations.length} registrations</p>
        )}
        {displayed.length === 0
          ? <p className="state-message">No matches.</p>
          : (
            <ul className="reg-list">
              {displayed.map((reg) => (
                <li key={reg.id}>
                  <RegistrationCard reg={reg} onSelect={setSelectedReg} />
                </li>
              ))}
            </ul>
          )
        }
      </>
    )
  }

  return (
    <>
      <div className="page page--navy airline-detail-page">
        <AirlineHero
          airline={airline}
          regCount={regCount}
          sightingCount={sightingCount}
          loading={loading}
          onBack={onBack}
          onEdit={() => setShowEdit(true)}
          onAddReg={() => setShowRegForm(true)}
          retiredTypes={retiredTypes}
          onRetireLongPress={setUnretireTarget}
          details={airlineDetails}
        />
        <main className="content">
          {renderBody()}
        </main>
      </div>

      {unretireTarget && (
        <div className="retire-overlay" onClick={() => setUnretireTarget(null)}>
          <div className="retire-card" onClick={(e) => e.stopPropagation()}>
            <div className="retire-card__head">
              <span className="retire-card__title">Un-retire {unretireTarget.type_name}?</span>
              <button className="retire-card__close" onClick={() => setUnretireTarget(null)} aria-label="Close">✕</button>
            </div>
            <p className="retire-card__hint">This removes the retired mark for {unretireTarget.type_name} on this airline and all its matching registrations.</p>
            <div className="retire-confirm-row">
              <button className="retire-confirm-cancel" onClick={() => setUnretireTarget(null)}>Cancel</button>
              <button className="retire-confirm-go" onClick={confirmUnretire}>Un-retire</button>
            </div>
          </div>
        </div>
      )}

      {showEdit && (
        <AirlineForm
          existing={airline}
          onCancel={() => setShowEdit(false)}
          onUpdated={(row) => { setShowEdit(false); onUpdated?.(row) }}
          onDeleted={() => { setShowEdit(false); onDeleted?.() }}
        />
      )}
      {showRegForm && (
        <NewRegistrationForm
          onClose={() => setShowRegForm(false)}
          initialAirline={{ id: airline.id, name: airline.name }}
        />
      )}
    </>
  )
}
