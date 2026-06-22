import { useEffect, useState } from 'react'
import { supabase } from './lib/supabaseClient'

const BOOK_CANDIDATES_PER_MONTH = 10
const RATINGS = [1, 2, 3, 4]
const SHORT_MONTHS = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec']

function monthBucket(spottedOn) {
  return spottedOn ? spottedOn.slice(0, 7) : 'undated'
}

function yearOf(spottedOn) {
  return spottedOn ? spottedOn.slice(0, 4) : 'Undated'
}

function formatMonth(bucket) {
  if (bucket === 'undated') return 'Undated'
  const [year, month] = bucket.split('-')
  const date = new Date(Number(year), Number(month) - 1, 1)
  return date.toLocaleString('default', { month: 'long', year: 'numeric' })
}

function shortMonth(bucket) {
  if (bucket === 'undated') return 'Undated'
  const m = parseInt(bucket.split('-')[1], 10)
  return SHORT_MONTHS[m - 1]
}

function formatDate(spottedOn) {
  if (!spottedOn) return null
  const [y, m, d] = spottedOn.split('-')
  return `${d}/${m}/${y}`
}

function getSortedYears(candidates) {
  const yearSet = new Set(candidates.map((s) => yearOf(s.spotted_on)))
  const numeric = [...yearSet].filter((y) => y !== 'Undated').sort((a, b) => Number(b) - Number(a))
  if (yearSet.has('Undated')) numeric.push('Undated')
  return numeric
}

function Thumbnail({ src }) {
  if (src) return <img src={src} alt="" className="bookcand-item__thumb" />
  return <div className="bookcand-item__thumb bookcand-item__thumb--placeholder" aria-hidden="true" />
}

export default function BookCandidatesView({ onBack, onSelectReg }) {
  const [candidates, setCandidates] = useState([])
  const [regsById, setRegsById] = useState({})
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [selectedYear, setSelectedYear] = useState(null)
  const [selectedMonths, setSelectedMonths] = useState(new Set())

  useEffect(() => {
    if (!supabase) {
      setError('Supabase is not configured.')
      setLoading(false)
      return
    }

    supabase
      .from('sightings')
      .select('id, registration_id, spotted_on, airport, is_book_candidate, book_story, book_rating')
      .eq('is_book_candidate', true)
      .then(async ({ data: sightings, error: sErr }) => {
        if (sErr) { setError(sErr.message); setLoading(false); return }
        const rows = sightings ?? []
        setCandidates(rows)

        const regIds = [...new Set(rows.map((s) => s.registration_id))]
        if (regIds.length === 0) { setLoading(false); return }

        const { data: regs, error: rErr } = await supabase
          .from('registrations')
          .select('id, registration, photo_urls, airlines ( id, name ), aircraft_types ( id, name )')
          .in('id', regIds)

        if (!rErr && regs) {
          const map = {}
          for (const r of regs) map[r.id] = r
          setRegsById(map)
        }
        setLoading(false)
      })
  }, [])

  async function handleRate(sightingId, n) {
    const current = candidates.find((s) => s.id === sightingId)?.book_rating ?? null
    const next = current === n ? null : n
    setCandidates((prev) =>
      prev.map((s) => s.id === sightingId ? { ...s, book_rating: next } : s)
    )
    await supabase.from('sightings').update({ book_rating: next }).eq('id', sightingId)
  }

  const grouped = {}
  for (const s of candidates) {
    const bucket = monthBucket(s.spotted_on)
    if (!grouped[bucket]) grouped[bucket] = []
    grouped[bucket].push(s)
  }

  const sortedYears = getSortedYears(candidates)
  const activeYear = selectedYear ?? sortedYears[0] ?? null

  function handleYearSelect(year) {
    setSelectedYear(year)
    setSelectedMonths(new Set())
  }

  function toggleMonth(bucket) {
    setSelectedMonths((prev) => {
      const next = new Set(prev)
      if (next.has(bucket)) next.delete(bucket)
      else next.add(bucket)
      return next
    })
  }

  const bucketsForYear = activeYear === null
    ? []
    : activeYear === 'Undated'
      ? (grouped['undated'] ? ['undated'] : [])
      : Object.keys(grouped)
          .filter((b) => b !== 'undated' && b.slice(0, 4) === activeYear)
          .sort()

  const displayBuckets = selectedMonths.size === 0
    ? bucketsForYear
    : bucketsForYear.filter((b) => selectedMonths.has(b))

  const hasData = !loading && !error && candidates.length > 0

  return (
    <div className="page bookcand-page">
      <header className="bookcand-header">
        <button className="bookcand-header__back" onClick={onBack} aria-label="Back">
          ‹ Back
        </button>
        <img src="/book-card.PNG" alt="" aria-hidden="true" className="bookcand-header__icon" />
        <div className="bookcand-header__text">
          <h1 className="bookcand-header__title">Coffee Table</h1>
          <p className="bookcand-header__sub">Tagged for the books · by month</p>
        </div>
      </header>

      {hasData && (
        <div className="bookcand-nav-row" role="group" aria-label="Year and month filter">
          {sortedYears.map((year) => (
            <button
              key={year}
              className={`bookcand-year-btn${activeYear === year ? ' bookcand-year-btn--on' : ''}`}
              onClick={() => handleYearSelect(year)}
              aria-pressed={activeYear === year}
            >
              {year}
            </button>
          ))}
          {bucketsForYear.length > 0 && (
            <span className="bookcand-nav-sep" aria-hidden="true" />
          )}
          {bucketsForYear.map((bucket) => (
            <button
              key={bucket}
              className={`bookcand-pill${selectedMonths.has(bucket) ? ' bookcand-pill--on' : ''}`}
              onClick={() => toggleMonth(bucket)}
              aria-pressed={selectedMonths.has(bucket)}
            >
              {shortMonth(bucket)}
            </button>
          ))}
        </div>
      )}

      <main className="content bookcand-content">
        {loading && <p className="state-message">Loading…</p>}
        {error && <p className="state-message state-message--error">{error}</p>}
        {!loading && !error && candidates.length === 0 && (
          <p className="bookcand-empty">
            No book candidates yet — tag sightings as you enter them.
          </p>
        )}
        {hasData && displayBuckets.map((bucket) => {
          const rows = grouped[bucket]
          if (!rows) return null
          const count = rows.length
          return (
            <div key={bucket} className="bookcand-group">
              <div className="bookcand-group__header">
                <span className="bookcand-group__month">{formatMonth(bucket)}</span>
                <span className="bookcand-group__count">{count}/{BOOK_CANDIDATES_PER_MONTH}</span>
              </div>
              <ul className="bookcand-list">
                {rows.map((s) => {
                  const reg = regsById[s.registration_id]
                  const thumbUrl = Array.isArray(reg?.photo_urls) && reg.photo_urls.length > 0
                    ? reg.photo_urls[reg.photo_urls.length - 1]
                    : null
                  const airlineName = reg?.airlines?.name ?? null
                  const typeName = reg?.aircraft_types?.name ?? null
                  const metaParts = [airlineName, typeName, s.airport, formatDate(s.spotted_on)].filter(Boolean)

                  return (
                    <li key={s.id}>
                      <div className="bookcand-item">
                        <div className="bookcand-item__top">
                          <Thumbnail src={thumbUrl} />
                          <div className="bookcand-item__info">
                            <button
                              className="bookcand-item__reg"
                              onClick={reg && onSelectReg ? () => onSelectReg(reg) : undefined}
                              disabled={!reg || !onSelectReg}
                            >
                              {reg?.registration ?? '—'}
                            </button>
                            {metaParts.length > 0 && (
                              <span className="bookcand-item__meta">{metaParts.join(' · ')}</span>
                            )}
                            {s.book_story && (
                              <p className="bookcand-item__story">{s.book_story}</p>
                            )}
                          </div>
                        </div>
                        <div className="bookcand-rate" aria-label="Rating">
                          {RATINGS.map((n) => (
                            <button
                              key={n}
                              className={`bookcand-rate__btn${s.book_rating === n ? ' bookcand-rate__btn--on' : ''}`}
                              onClick={() => handleRate(s.id, n)}
                              aria-label={`Rate ${n}`}
                              aria-pressed={s.book_rating === n}
                            >
                              {n}
                            </button>
                          ))}
                        </div>
                      </div>
                    </li>
                  )
                })}
              </ul>
            </div>
          )
        })}
      </main>
    </div>
  )
}
