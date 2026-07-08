import { useEffect, useState } from 'react'
import { supabase } from './lib/supabaseClient'
import { fetchAllRows } from './lib/fetchAllRows'
import { idbGet } from './lib/offlineStore'
import { stripTypeParens } from './lib/typeGrouping'
import { weekStartISO, buildWeekSchedule, getWeekMode, setWeekMode, setWeekCount, OTD_LINKS } from './lib/onThisDay'

function todayISO() {
  const d = new Date()
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
}

function niceDate(iso) {
  const [y, m, d] = iso.split('-').map(Number)
  return new Date(y, m - 1, d).toLocaleDateString([], { weekday: 'short', month: 'short', day: 'numeric' })
}

export default function OnThisDayView({ onBack, onSelectReg }) {
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [schedule, setSchedule] = useState(null)
  const [regById, setRegById] = useState(new Map())
  const [mode, setMode] = useState(null)

  const weekStart = weekStartISO()
  const today = todayISO()

  useEffect(() => {
    async function load() {
      const savedMode = getWeekMode(weekStart)
      setMode(savedMode)
      let sightings = null
      let regs = null
      const offline = typeof navigator !== 'undefined' && navigator.onLine === false
      if (!offline && supabase) {
        try {
          const [{ data: sData }, { data: rData }] = await Promise.all([
            fetchAllRows(() => supabase.from('sightings').select('id, registration_id, spotted_on, airport').order('id', { ascending: true })),
            fetchAllRows(() => supabase.from('registrations').select('id, registration, airline_id, aircraft_type_id, airlines ( id, name, logo_url ), aircraft_types ( id, name )').order('id', { ascending: true })),
          ])
          sightings = sData
          regs = rData || []
        } catch { /* fall through to mirror */ }
      }
      if (!sightings) {
        sightings = await idbGet('sightings')
        const rawRegs = await idbGet('registrations')
        if (!sightings || !rawRegs) {
          setError('This card needs a connection or a downloaded offline copy.')
          setLoading(false)
          return
        }
        const airlines = (await idbGet('airlines')) || []
        const types = (await idbGet('aircraft_types')) || []
        const airlineById = new Map(airlines.map((a) => [a.id, a]))
        const typeById = new Map(types.map((t) => [t.id, t]))
        regs = rawRegs.map((r) => {
          const al = airlineById.get(r.airline_id)
          const ty = typeById.get(r.aircraft_type_id)
          return {
            ...r,
            airlines: al ? { id: al.id, name: al.name, logo_url: al.logo_url ?? null } : null,
            aircraft_types: ty ? { id: ty.id, name: ty.name } : null,
          }
        })
      }
      setRegById(new Map((regs || []).map((r) => [r.id, r])))
      const sched = buildWeekSchedule(sightings || [], weekStart, savedMode)
      setSchedule(sched)
      setWeekCount(weekStart, sched.empty ? 0 : sched.picks.length)
      setLoading(false)
    }
    load()
  }, [weekStart])

  function chooseMode(m) {
    setWeekMode(weekStart, m)
    setMode(m)
    setLoading(true)
    setSchedule(null)
    setError(null)
    setTimeout(() => window.location.reload(), 50)
  }

  const visible = (schedule?.picks || []).filter((p) => p.date <= today)
  const upcoming = (schedule?.picks || []).filter((p) => p.date > today)

  return (
    <div className="otd-view">
      <div className="otd-view__head">
        <button className="otd-view__back" onClick={onBack}>‹ Back</button>
        <h2 className="otd-view__title">On this day</h2>
      </div>
      <div className="otd-view__body">
        <p className="otd-weekline">Week of {niceDate(weekStart)} — resets Monday</p>
        {loading && <p className="otd-empty">Loading…</p>}
        {error && <p className="otd-empty">{error}</p>}

        {!loading && !error && schedule && schedule.empty && mode !== 'none' && (
          <div className="otd-fallback">
            <p className="otd-fallback__msg">No past sightings match the days of this week.</p>
            <p className="otd-fallback__ask">What should this week show?</p>
            <button className="otd-fallback__btn" onClick={() => chooseMode('none')}>Nothing this week</button>
            <button className="otd-fallback__btn" onClick={() => chooseMode('relax')}>Allow back-to-back days</button>
            <button className="otd-fallback__btn" onClick={() => chooseMode('month')}>3 random from this month</button>
          </div>
        )}

        {!loading && !error && schedule && schedule.empty && mode === 'none' && (
          <p className="otd-empty">Quiet week — nothing scheduled. New picks arrive Monday.</p>
        )}

        {!loading && !error && schedule && !schedule.empty && (
          <>
            {visible.map((p) => {
              const reg = regById.get(p.sighting.registration_id)
              if (!reg) return null
              const year = p.sighting.spotted_on.slice(0, 4)
              return (
                <div key={p.sighting.id} className="otd-pick">
                  <button className="otd-pick__main" onClick={() => onSelectReg({ id: reg.id, airlines: reg.airlines })}>
                    <div className="otd-pick__date">{niceDate(p.date)} · <b>{year}</b></div>
                    <div className="otd-pick__row">
                      {reg.airlines?.logo_url && <img className="otd-pick__logo" src={reg.airlines.logo_url} alt="" loading="lazy" />}
                      <div className="otd-pick__reg">{reg.registration}</div>
                    </div>
                    <div className="otd-pick__sub">
                      {[reg.airlines?.name, reg.aircraft_types?.name ? stripTypeParens(reg.aircraft_types.name) : null, p.sighting.airport].filter(Boolean).join(' · ')}
                    </div>
                  </button>
                  <div className="otd-pick__links">
                    {OTD_LINKS.map((l) => (
                      <a key={l.name} className="otd-link" href={l.url(reg.registration)} target="_blank" rel="noopener noreferrer">{l.name}</a>
                    ))}
                  </div>
                </div>
              )
            })}
            {upcoming.map((p) => {
              const reg = regById.get(p.sighting.registration_id)
              if (!reg) return null
              return (
                <div key={p.sighting.id} className="otd-pick otd-pick--future">
                  <div className="otd-pick__date">{niceDate(p.date)} · <b>?</b></div>
                  <div className="otd-pick__row">
                    {reg.airlines?.logo_url && <img className="otd-pick__logo otd-blur-logo" src={reg.airlines.logo_url} alt="" loading="lazy" />}
                    <div className="otd-pick__reg otd-blur-reg">{reg.registration}</div>
                  </div>
                  <div className="otd-pick__sub">Arrives {niceDate(p.date)}…</div>
                </div>
              )
            })}
          </>
        )}
      </div>
    </div>
  )
}
