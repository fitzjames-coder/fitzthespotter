import { useEffect, useState, useMemo } from 'react'
import { supabase } from './lib/supabaseClient'
import { fetchAllRows } from './lib/fetchAllRows'
import { idbGet } from './lib/offlineStore'
import { computeMilestones } from './lib/milestones'

function StatCard({ title, children }) {
  return (
    <div className="stat-card">
      <p className="stat-card__title">{title}</p>
      {children}
    </div>
  )
}

function NumberChips({ numbers, selected, onSelect }) {
  return (
    <div className="ms-chips">
      {numbers.map((n) => (
        <button
          key={n}
          className={n === selected ? 'ms-chip ms-chip--on' : 'ms-chip'}
          onClick={() => onSelect(n)}
        >
          {n.toLocaleString()}
        </button>
      ))}
    </div>
  )
}

export default function MilestonesView({ onBack, onSelectReg }) {
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [regs, setRegs] = useState([])
  const [sightings, setSightings] = useState([])
  const [regPick, setRegPick] = useState(null)
  const [sightPick, setSightPick] = useState(null)
  const [airlinePick, setAirlinePick] = useState(null)
  const [airlineStep, setAirlineStep] = useState('all')

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
  const regById = useMemo(() => new Map(regs.map((r) => [r.id, r])), [regs])

  const regMilestones = milestones.filter((m) => m.kind === 'reg')
  const sightMilestones = milestones.filter((m) => m.kind === 'sight')
  const airlineMilestones = milestones.filter((m) => m.kind === 'airline')
  const airportMilestones = milestones.filter((m) => m.kind === 'airport')
  const countryMilestones = milestones.filter((m) => m.kind === 'country')

  const regNumbers = regMilestones.map((m) => Number(m.label.replace(/\D/g, ''))).sort((a, b) => a - b)
  const sightNumbers = sightMilestones.map((m) => Number(m.label.replace(/\D/g, ''))).sort((a, b) => a - b)
  const regSelected = regPick ?? (regNumbers.length ? regNumbers[regNumbers.length - 1] : null)
  const sightSelected = sightPick ?? (sightNumbers.length ? sightNumbers[sightNumbers.length - 1] : null)
  const regShown = regMilestones.find((m) => Number(m.label.replace(/\D/g, '')) === regSelected)
  const sightShown = sightMilestones.find((m) => Number(m.label.replace(/\D/g, '')) === sightSelected)
  const sightShownReg = sightShown ? regById.get(sightShown.regId) : null

  const airlineGroups = useMemo(() => {
    const g = new Map()
    for (const m of airlineMilestones) {
      const name = m.reg?.airlines?.name || ''
      if (!g.has(name)) g.set(name, [])
      g.get(name).push(m)
    }
    return Array.from(g.entries()).sort((a, b) => a[0].localeCompare(b[0]))
  }, [airlineMilestones])

  const airlineNames = airlineGroups.map(([name]) => name)
  const airlineSelected = airlinePick ?? (airlineNames.length ? airlineNames[0] : null)
  const airlineList = (airlineGroups.find(([name]) => name === airlineSelected)?.[1] || [])
    .filter((m) => airlineStep === 'all' || m.label.startsWith(airlineStep))

  const byNum = (a, b) => Number(a.label.replace(/\D/g, '')) - Number(b.label.replace(/\D/g, ''))
  const airportsAsc = [...airportMilestones].sort(byNum)
  const countriesAsc = [...countryMilestones].sort(byNum)

  return (
    <div className="page search-page">
      <header className="stats-top-bar">
        <button className="stats-top-bar__back" onClick={onBack} aria-label="Back to search">‹ Back</button>
        <h1 className="stats-top-bar__title">Milestones</h1>
      </header>
      <main className="content stats-content">
        {loading && <p className="search-state">Loading…</p>}
        {error && <p className="search-state search-state--error">{error}</p>}
        {!loading && !error && (
          <>
            <StatCard title="Registration Milestones">
              {regNumbers.length === 0 && <p className="search-state">First arrives at registration #100.</p>}
              {regNumbers.length > 0 && (
                <>
                  <NumberChips numbers={regNumbers} selected={regSelected} onSelect={setRegPick} />
                  {regShown && (
                    <div className="sight-reg-grid">
                      <button className="sight-reg-pill" onClick={() => onSelectReg({ id: regShown.reg.id, airlines: regShown.reg.airlines })}>
                        <span className="sight-reg-pill__reg">{regShown.reg.registration}</span>
                        <span className="sight-reg-pill__airline">{regShown.reg.airlines?.name || ''}</span>
                        <span className="sight-reg-pill__count">{regShown.date}</span>
                      </button>
                    </div>
                  )}
                </>
              )}
            </StatCard>

            <StatCard title="Sighting Milestones">
              {sightNumbers.length === 0 && <p className="search-state">First arrives at sighting #500.</p>}
              {sightNumbers.length > 0 && (
                <>
                  <NumberChips numbers={sightNumbers} selected={sightSelected} onSelect={setSightPick} />
                  {sightShown && (
                    <div className="sight-reg-grid">
                      {sightShownReg ? (
                        <button className="sight-reg-pill" onClick={() => onSelectReg({ id: sightShownReg.id, airlines: sightShownReg.airlines })}>
                          <span className="sight-reg-pill__reg">{sightShownReg.registration}</span>
                          <span className="sight-reg-pill__airline">{sightShown.detail || ''}</span>
                          <span className="sight-reg-pill__count">{sightShown.date}</span>
                        </button>
                      ) : (
                        <div className="sight-reg-pill sight-reg-pill--static">
                          <span className="sight-reg-pill__reg">{sightShown.detail || '—'}</span>
                          <span className="sight-reg-pill__count">{sightShown.date}</span>
                        </div>
                      )}
                    </div>
                  )}
                </>
              )}
            </StatCard>

            <StatCard title="Airline Milestones">
              {airlineGroups.length === 0 && <p className="search-state">First arrives at the 50th registration of one airline.</p>}
              {airlineNames.length > 0 && (
                <>
                  <select className="ms-airline-select" value={airlineSelected || ''} onChange={(e) => setAirlinePick(e.target.value)}>
                    {airlineNames.map((name) => <option key={name} value={name}>{name}</option>)}
                  </select>
                  <div className="ms-chips">
                    {['all', '50th', '100th'].map((s) => (
                      <button key={s} className={airlineStep === s ? 'ms-chip ms-chip--on' : 'ms-chip'} onClick={() => setAirlineStep(s)}>
                        {s === 'all' ? 'All' : s}
                      </button>
                    ))}
                  </div>
                  <div className="sight-reg-grid">
                    {airlineList.map((m, i) => (
                      <button key={i} className="sight-reg-pill" onClick={() => onSelectReg({ id: m.reg.id, airlines: m.reg.airlines })}>
                        <span className="sight-reg-pill__reg">{m.reg.registration}</span>
                        <span className="sight-reg-pill__airline">{m.label}</span>
                        <span className="sight-reg-pill__count">{m.date}</span>
                      </button>
                    ))}
                    {airlineList.length === 0 && <p className="search-state">No milestone at this step yet.</p>}
                  </div>
                </>
              )}
            </StatCard>

            <StatCard title="Airport Milestones">
              {airportMilestones.length === 0 && <p className="search-state">First arrives at airport #10.</p>}
              <div className="sight-reg-grid">
                {airportsAsc.map((m, i) => (
                  <div key={i} className="sight-reg-pill sight-reg-pill--static">
                    <span className="sight-reg-pill__reg">{m.detail}</span>
                    <span className="sight-reg-pill__airline">{m.label}</span>
                    <span className="sight-reg-pill__count">{m.date}</span>
                  </div>
                ))}
              </div>
            </StatCard>

            <StatCard title="Country Milestones">
              {countryMilestones.length === 0 && <p className="search-state">First arrives at country #10.</p>}
              <div className="sight-reg-grid">
                {countriesAsc.map((m, i) => (
                  <div key={i} className="sight-reg-pill sight-reg-pill--static">
                    <span className="sight-reg-pill__reg">{m.detail}</span>
                    <span className="sight-reg-pill__airline">{m.label}</span>
                    <span className="sight-reg-pill__count">{m.date}</span>
                  </div>
                ))}
              </div>
            </StatCard>
          </>
        )}
      </main>
    </div>
  )
}
