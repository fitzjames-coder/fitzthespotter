import { useEffect, useState } from 'react'
import { supabase } from './lib/supabaseClient'

const TOD_ORDER = [
  { key: 'morning', label: 'Morning' },
  { key: 'midday', label: 'Midday' },
  { key: 'afternoon', label: 'Afternoon' },
  { key: 'evening', label: 'Evening' },
  { key: 'night', label: 'Night' },
]
const SEASON_ORDER = ['Spring', 'Summer', 'Autumn', 'Winter']
const MONTHS = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec']

function seasonForMonth(month, southern) {
  let s
  if (month === 12 || month === 1 || month === 2) s = 'Winter'
  else if (month >= 3 && month <= 5) s = 'Spring'
  else if (month >= 6 && month <= 8) s = 'Summer'
  else s = 'Autumn'
  if (southern) s = { Winter: 'Summer', Summer: 'Winter', Spring: 'Autumn', Autumn: 'Spring' }[s]
  return s
}

export default function SpottingThroughTimeView({ onBack }) {
  const [sightings, setSightings] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [showCounts, setShowCounts] = useState(false)
  const [seasonMode, setSeasonMode] = useState('seasons')

  useEffect(() => {
    supabase
      .from('sightings')
      .select('time_block, spotted_on, southern_hemisphere')
      .then(({ data, error: err }) => {
        if (err) setError(err.message)
        else setSightings(data ?? [])
        setLoading(false)
      })
  }, [])

  const todCounts = {}
  for (const b of TOD_ORDER) todCounts[b.key] = 0
  for (const s of sightings) {
    if (s.time_block && todCounts[s.time_block] !== undefined) todCounts[s.time_block]++
  }
  const todData = TOD_ORDER.map((b) => ({ label: b.label, count: todCounts[b.key] }))
  const todTotal = todData.reduce((a, d) => a + d.count, 0)
  const todMax = Math.max(1, ...todData.map((d) => d.count))

  const seasonCounts = { Spring: 0, Summer: 0, Autumn: 0, Winter: 0 }
  const monthCounts = Array(12).fill(0)
  for (const s of sightings) {
    if (!s.spotted_on) continue
    const m = Number(String(s.spotted_on).slice(5, 7))
    if (m >= 1 && m <= 12) {
      monthCounts[m - 1]++
      seasonCounts[seasonForMonth(m, s.southern_hemisphere)]++
    }
  }
  const seasonData = seasonMode === 'seasons'
    ? SEASON_ORDER.map((name) => ({ label: name, count: seasonCounts[name] }))
    : MONTHS.map((name, i) => ({ label: name, count: monthCounts[i] }))
  const seasonTotal = seasonData.reduce((a, d) => a + d.count, 0)
  const seasonMax = Math.max(1, ...seasonData.map((d) => d.count))

  const todPeak = todTotal > 0 ? todData.reduce((a, d) => (d.count > a.count ? d : a)) : null
  const seasonPeak = seasonTotal > 0 ? seasonData.reduce((a, d) => (d.count > a.count ? d : a)) : null

  function fmt(count, total) {
    if (showCounts) return count
    if (total === 0) return '0%'
    return Math.round((count / total) * 100) + '%'
  }

  return (
    <div className="page stp-page">
      <header className="stats-top-bar">
        <button className="stats-top-bar__back" onClick={onBack} aria-label="Back">‹ Back</button>
        <span className="stp-heading">Spotting Through Time</span>
      </header>
      <main className="content stp-content">
        {loading ? (
          <p className="search-state">Loading…</p>
        ) : error ? (
          <p className="search-state search-state--error">{error}</p>
        ) : (
          <>
            <div className="stp-chart stp-chart--tod">
              <div className="stp-chart__title">Time of day</div>
              <div className="stp-bars">
                {todData.map((d) => (
                  <button
                    key={d.label}
                    className={`stp-col${todPeak && d.label === todPeak.label && d.count > 0 ? ' stp-col--peak' : ''}`}
                    onClick={() => setShowCounts((v) => !v)}
                  >
                    <span className="stp-val">{fmt(d.count, todTotal)}</span>
                    <span className="stp-fill" style={{ height: `${(d.count / todMax) * 100}%` }}></span>
                  </button>
                ))}
              </div>
              <div className="stp-xlab">
                {todData.map((d) => (
                  <span key={d.label} className={todPeak && d.label === todPeak.label && d.count > 0 ? 'stp-peak-lab' : ''}>{d.label}</span>
                ))}
              </div>
            </div>
            {todTotal > 0
              ? <p className="stp-insight">Most catches in the <b>{todPeak.label}</b>.</p>
              : <p className="stp-insight stp-insight--empty">Log sightings with a time of day to see this.</p>}

            <div className="stp-chart stp-chart--season">
              <div className="stp-chart__titlerow">
                <span className="stp-chart__title">Season</span>
                <div className="stp-toggle">
                  <button className={seasonMode === 'seasons' ? 'on' : ''} onClick={() => setSeasonMode('seasons')}>Seasons</button>
                  <button className={seasonMode === 'months' ? 'on' : ''} onClick={() => setSeasonMode('months')}>Months</button>
                </div>
              </div>
              <div className={`stp-bars${seasonMode === 'months' ? ' stp-bars--months' : ''}`}>
                {seasonData.map((d) => (
                  <button
                    key={d.label}
                    className={`stp-col${seasonPeak && d.label === seasonPeak.label && d.count > 0 ? ' stp-col--peak' : ''}`}
                    onClick={() => setShowCounts((v) => !v)}
                  >
                    <span className="stp-val">{fmt(d.count, seasonTotal)}</span>
                    <span className="stp-fill" style={{ height: `${(d.count / seasonMax) * 100}%` }}></span>
                  </button>
                ))}
              </div>
              <div className={`stp-xlab${seasonMode === 'months' ? ' stp-xlab--months' : ''}`}>
                {seasonData.map((d) => (
                  <span key={d.label} className={seasonPeak && d.label === seasonPeak.label && d.count > 0 ? 'stp-peak-lab' : ''}>{d.label}</span>
                ))}
              </div>
            </div>
            {seasonTotal > 0
              ? <p className="stp-insight">You spot most in <b>{seasonPeak.label}</b>.</p>
              : <p className="stp-insight stp-insight--empty">Log sightings with dates to see this.</p>}

            <p className="stp-hint">Tap any bar to switch between % and counts.</p>
          </>
        )}
      </main>
    </div>
  )
}
