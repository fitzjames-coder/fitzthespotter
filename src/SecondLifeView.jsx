import { useEffect, useMemo, useState } from 'react'
import { supabase } from './lib/supabaseClient'

const MONTHS = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec']

function fmtDate(d) {
  if (!d) return ''
  const parts = d.split('-')
  if (parts.length !== 3) return d
  const [y, m, day] = parts
  return `${day.replace(/^0/, '')} ${MONTHS[parseInt(m, 10) - 1] ?? m} ${y}`
}

function computeSecondLife(regs) {
  const byMsn = new Map()
  for (const r of regs) {
    const msn = (r.msn ?? '').trim()
    if (!msn) continue
    const dates = (r.sightings ?? []).map((s) => s.spotted_on).filter(Boolean).sort()
    const wearing = {
      regId: r.id,
      registration: r.registration,
      airline: r.airlines ?? null,
      airlineName: r.airlines?.name ?? '—',
      airlineId: r.airlines?.id ?? null,
      dates,
    }
    if (!byMsn.has(msn)) byMsn.set(msn, [])
    byMsn.get(msn).push(wearing)
  }

  const airframes = []
  for (const [msn, wearings] of byMsn.entries()) {
    const airlineIds = new Set(wearings.map((w) => w.airlineId))
    if (airlineIds.size < 2) continue
    const sameReg = new Set(wearings.map((w) => w.registration)).size === 1
    wearings.sort((a, b) => (a.dates[0] ?? '').localeCompare(b.dates[0] ?? ''))
    airframes.push({ msn, sameReg, wearings })
  }

  airframes.sort((a, b) => b.wearings.length - a.wearings.length || a.msn.localeCompare(b.msn))
  return airframes
}

function AirframeRow({ frame, onSelectReg }) {
  const [open, setOpen] = useState(false)
  return (
    <div className="secondlife-frame">
      <button className="secondlife-frame__header" onClick={() => setOpen((o) => !o)} aria-expanded={open}>
        <span className="secondlife-frame__msn">MSN {frame.msn}</span>
        <span className="secondlife-frame__count">{frame.wearings.length} airlines</span>
        <span className={`secondlife-frame__tag${frame.sameReg ? '' : ' secondlife-frame__tag--rereg'}`}>
          {frame.sameReg ? 'Tail carried over' : 'Re-registered'}
        </span>
        <span className={`secondlife-frame__chevron${open ? ' secondlife-frame__chevron--open' : ''}`} aria-hidden="true">›</span>
      </button>
      {open && (
        <div className="secondlife-frame__body">
          {frame.wearings.map((w) => (
            <button key={w.regId} className="secondlife-wearing" onClick={() => onSelectReg({ id: w.regId, airlines: w.airline })}>
              <span className="secondlife-wearing__airline">{w.airlineName}</span>
              <span className="secondlife-wearing__reg">{w.registration}</span>
              <span className="secondlife-wearing__dates">
                {w.dates.length ? w.dates.map(fmtDate).join(', ') : 'No dated sighting'}
              </span>
            </button>
          ))}
        </div>
      )}
    </div>
  )
}

export default function SecondLifeView({ onBack, onSelectReg }) {
  const [regs, setRegs] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)

  useEffect(() => {
    if (!supabase) {
      setError('Supabase is not configured.')
      setLoading(false)
      return
    }
    supabase
      .from('registrations')
      .select('id, registration, msn, airlines ( id, name, country, country_flag ), sightings ( spotted_on )')
      .then(({ data, error: err }) => {
        if (err) setError(err.message)
        else setRegs(data ?? [])
        setLoading(false)
      })
  }, [])

  const airframes = useMemo(() => computeSecondLife(regs), [regs])

  return (
    <div className="page search-page">
      <header className="stats-top-bar">
        <button className="stats-top-bar__back" onClick={onBack} aria-label="Back to search">‹ Back</button>
        <h1 className="stats-top-bar__title">Second Life</h1>
      </header>

      <main className="content stats-content">
        {loading && <p className="search-state">Loading…</p>}
        {error && <p className="search-state search-state--error">{error}</p>}
        {!loading && !error && airframes.length === 0 && (
          <div className="stat-card">
            <p className="secondlife-empty">
              No shared airframes yet. When the same airframe — matched by MSN — appears under more than one airline in your logbook, it shows up here: the liveries and registrations one aircraft wore across its life.
            </p>
          </div>
        )}
        {!loading && !error && airframes.length > 0 && (
          <>
            <div className="stat-card">
              <p className="stat-card__title">Airframes with a second life</p>
              <p className="secondlife-lead">
                Aircraft you've logged under more than one airline, matched by MSN. Tap an airframe to see every airline it wore and when you saw it.
              </p>
            </div>
            <div className="secondlife-list">
              {airframes.map((frame) => (
                <AirframeRow key={frame.msn} frame={frame} onSelectReg={onSelectReg} />
              ))}
            </div>
          </>
        )}
      </main>
    </div>
  )
}
