import { useEffect, useState, useMemo } from 'react'
import { supabase } from './lib/supabaseClient'
import { fetchAllRows } from './lib/fetchAllRows'
import { idbGet } from './lib/offlineStore'
import { computeMilestones } from './lib/milestones'

export default function MilestonesView({ onBack, onSelectReg }) {
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [regs, setRegs] = useState([])
  const [sightings, setSightings] = useState([])

  useEffect(() => {
    async function load() {
      const offline = typeof navigator !== 'undefined' && navigator.onLine === false
      if (!offline && supabase) {
        try {
          const [{ data: rData }, { data: sData }] = await Promise.all([
            fetchAllRows(() => supabase.from('registrations').select('id, registration, first_spotted, airlines ( id, name, country )').order('id', { ascending: true })),
            fetchAllRows(() => supabase.from('sightings').select('id, registration_id, spotted_on, airport').order('id', { ascending: true })),
          ])
          setRegs(rData || [])
          setSightings(sData || [])
          setLoading(false)
          return
        } catch { /* fall through to mirror */ }
      }
      const rawRegs = await idbGet('registrations')
      const rawSightings = await idbGet('sightings')
      if (!rawRegs || !rawSightings) {
        setError('This card needs a connection or a downloaded offline copy.')
        setLoading(false)
        return
      }
      const airlines = (await idbGet('airlines')) || []
      const airlineById = new Map(airlines.map((a) => [a.id, a]))
      setRegs(rawRegs.map((r) => ({
        ...r,
        airlines: airlineById.get(r.airline_id) ? { id: r.airline_id, name: airlineById.get(r.airline_id).name, country: airlineById.get(r.airline_id).country } : null,
      })))
      setSightings(rawSightings)
      setLoading(false)
    }
    load()
  }, [])

  const milestones = useMemo(() => computeMilestones(regs, sightings), [regs, sightings])

  return (
    <div className="page search-page">
      <header className="stats-top-bar">
        <button className="stats-top-bar__back" onClick={onBack} aria-label="Back to search">‹ Back</button>
        <h1 className="stats-top-bar__title">Milestones</h1>
      </header>
      <main className="content stats-content">
        {loading && <p className="search-state">Loading…</p>}
        {error && <p className="search-state search-state--error">{error}</p>}
        {!loading && !error && milestones.length === 0 && (
          <p className="search-state">No milestones yet — the first arrives at registration #100.</p>
        )}
        {!loading && !error && milestones.map((m, i) => {
          const inner = (
            <>
              <span className="milestone__label">{m.label}</span>
              <span className="milestone__detail">{m.detail}</span>
              <span className="milestone__date">{m.date}</span>
            </>
          )
          if (m.reg) {
            return (
              <button key={i} className="milestone milestone--tap" onClick={() => onSelectReg({ id: m.reg.id, airlines: m.reg.airlines })}>
                {inner}
              </button>
            )
          }
          return <div key={i} className="milestone">{inner}</div>
        })}
      </main>
    </div>
  )
}
