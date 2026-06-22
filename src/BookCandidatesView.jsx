import { useEffect, useState } from 'react'
import { supabase } from './lib/supabaseClient'

const BOOK_CANDIDATES_PER_MONTH = 10
const RATINGS = [1, 2, 3, 4]
const SHORT_MONTHS = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec']

const TIER_ROLES  = { 1: 'hero', 2: 'second', 3: 'third', 4: 'pick' }
const TIER_LABELS = { 1: 'Your 1s — pick the hero', 2: 'Your 2s', 3: 'Your 3s', 4: 'Your 4s' }
const PICK_DISPLAY = { hero: 'HERO ✓', second: '#2 ✓', third: '#3 ✓', pick: 'PICK ✓' }
const PICK_ACTION  = { hero: 'Mark hero', second: 'Mark #2', third: 'Mark #3', pick: 'Mark' }

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

function Thumbnail({ src, small }) {
  const cls = small ? 'bookcand-tier-card__thumb' : 'bookcand-item__thumb'
  const phCls = small ? 'bookcand-tier-card__thumb bookcand-tier-card__thumb--placeholder' : 'bookcand-item__thumb bookcand-item__thumb--placeholder'
  if (src) return <img src={src} alt="" className={cls} />
  return <div className={phCls} aria-hidden="true" />
}

export default function BookCandidatesView({ onBack, onSelectReg }) {
  const [candidates, setCandidates] = useState([])
  const [regsById, setRegsById] = useState({})
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [selectedYear, setSelectedYear] = useState(null)
  const [selectedMonths, setSelectedMonths] = useState(new Set())
  const [sortedBuckets, setSortedBuckets] = useState(new Set())

  useEffect(() => {
    if (!supabase) {
      setError('Supabase is not configured.')
      setLoading(false)
      return
    }

    supabase
      .from('sightings')
      .select('id, registration_id, spotted_on, airport, is_book_candidate, book_story, book_rating, book_pick')
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

  async function handlePick(sightingId, role, bucket) {
    const current = candidates.find((s) => s.id === sightingId)?.book_pick ?? null
    const next = current === role ? null : role

    const monthRows = candidates.filter((s) => monthBucket(s.spotted_on) === bucket)
    const prevHolder = next !== null
      ? monthRows.find((s) => s.id !== sightingId && s.book_pick === role)
      : null

    setCandidates((prev) => prev.map((s) => {
      if (s.id === sightingId) return { ...s, book_pick: next }
      if (prevHolder && s.id === prevHolder.id) return { ...s, book_pick: null }
      return s
    }))

    if (prevHolder) {
      await supabase.from('sightings').update({ book_pick: null }).eq('id', prevHolder.id)
    }
    await supabase.from('sightings').update({ book_pick: next }).eq('id', sightingId)
  }

  function toggleSorted(bucket) {
    setSortedBuckets((prev) => {
      const next = new Set(prev)
      if (next.has(bucket)) next.delete(bucket)
      else next.add(bucket)
      return next
    })
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
          const isSorted = sortedBuckets.has(bucket)

          return (
            <div key={bucket} className="bookcand-group">
              <div className="bookcand-group__header">
                <span className="bookcand-group__month">{formatMonth(bucket)}</span>
                <span className="bookcand-group__count">{count}/{BOOK_CANDIDATES_PER_MONTH}</span>
              </div>

              {/* ── RATE MODE ─────────────────────────────── */}
              {!isSorted && (
                <>
                  <ul className="bookcand-list">
                    {rows.map((s) => {
                      const reg = regsById[s.registration_id]
                      const thumbUrl = Array.isArray(reg?.photo_urls) && reg.photo_urls.length > 0
                        ? reg.photo_urls[reg.photo_urls.length - 1] : null
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
                  <div className="bookcand-mode-bar">
                    <button className="bookcand-sort-btn" onClick={() => toggleSorted(bucket)}>
                      Sort into tiers ↓
                    </button>
                  </div>
                </>
              )}

              {/* ── SORTED MODE ───────────────────────────── */}
              {isSorted && (() => {
                const tierNums = [1, 2, 3, 4]
                const tiers = tierNums
                  .map((n) => ({ rating: n, rows: rows.filter((s) => s.book_rating === n) }))
                  .filter((t) => t.rows.length > 0)
                const unrated = rows.filter((s) => !s.book_rating)

                return (
                  <div className="bookcand-sorted">
                    {tiers.map(({ rating, rows: tierRows }) => {
                      const role = TIER_ROLES[rating]
                      return (
                        <div key={rating} className="bookcand-tier">
                          <div className="bookcand-tier__header">
                            <span className="bookcand-tier__badge">{rating}</span>
                            <span className="bookcand-tier__label">{TIER_LABELS[rating]}</span>
                          </div>
                          <ul className="bookcand-tier-list">
                            {tierRows.map((s) => {
                              const reg = regsById[s.registration_id]
                              const thumbUrl = Array.isArray(reg?.photo_urls) && reg.photo_urls.length > 0
                                ? reg.photo_urls[reg.photo_urls.length - 1] : null
                              const airlineName = reg?.airlines?.name ?? null
                              const typeName = reg?.aircraft_types?.name ?? null
                              const metaParts = [airlineName, typeName, s.airport, formatDate(s.spotted_on)].filter(Boolean)
                              const isPicked = s.book_pick === role

                              return (
                                <li key={s.id}>
                                  <div className={`bookcand-tier-card${isPicked ? ' bookcand-tier-card--picked' : ''}`}>
                                    <div className="bookcand-tier-card__left">
                                      <Thumbnail src={thumbUrl} small />
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
                                      </div>
                                    </div>
                                    <button
                                      className={`bookcand-pick-btn${isPicked ? ' bookcand-pick-btn--on' : ''}`}
                                      onClick={() => handlePick(s.id, role, bucket)}
                                    >
                                      {isPicked ? PICK_DISPLAY[role] : PICK_ACTION[role]}
                                    </button>
                                  </div>
                                </li>
                              )
                            })}
                          </ul>
                        </div>
                      )
                    })}

                    {unrated.length > 0 && (
                      <div className="bookcand-tier">
                        <div className="bookcand-tier__header">
                          <span className="bookcand-tier__label bookcand-tier__label--unrated">Unrated</span>
                        </div>
                        <ul className="bookcand-tier-list">
                          {unrated.map((s) => {
                            const reg = regsById[s.registration_id]
                            const thumbUrl = Array.isArray(reg?.photo_urls) && reg.photo_urls.length > 0
                              ? reg.photo_urls[reg.photo_urls.length - 1] : null
                            const metaParts = [reg?.airlines?.name, reg?.aircraft_types?.name, s.airport, formatDate(s.spotted_on)].filter(Boolean)
                            return (
                              <li key={s.id}>
                                <div className="bookcand-tier-card">
                                  <div className="bookcand-tier-card__left">
                                    <Thumbnail src={thumbUrl} small />
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
                                    </div>
                                  </div>
                                </div>
                              </li>
                            )
                          })}
                        </ul>
                      </div>
                    )}

                    <div className="bookcand-mode-bar">
                      <button className="bookcand-back-btn" onClick={() => toggleSorted(bucket)}>
                        ↑ Back to rating
                      </button>
                    </div>
                  </div>
                )
              })()}
            </div>
          )
        })}
      </main>
    </div>
  )
}
