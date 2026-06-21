import { useEffect, useState } from 'react'
import { supabase } from './lib/supabaseClient'

const BOOK_CANDIDATES_PER_MONTH = 10

function monthBucket(spottedOn) {
  return spottedOn ? spottedOn.slice(0, 7) : 'undated'
}

function formatMonth(bucket) {
  if (bucket === 'undated') return 'Undated'
  const [year, month] = bucket.split('-')
  const date = new Date(Number(year), Number(month) - 1, 1)
  return date.toLocaleString('default', { month: 'long', year: 'numeric' })
}

function formatDate(spottedOn) {
  if (!spottedOn) return null
  const [y, m, d] = spottedOn.split('-')
  return `${d}/${m}/${y}`
}

export default function BookCandidatesView({ onBack, onSelectReg }) {
  const [candidates, setCandidates] = useState([])
  const [regsById, setRegsById] = useState({})
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)

  useEffect(() => {
    if (!supabase) {
      setError('Supabase is not configured.')
      setLoading(false)
      return
    }

    supabase
      .from('sightings')
      .select('id, registration_id, spotted_on, airport, is_book_candidate, book_story')
      .eq('is_book_candidate', true)
      .then(async ({ data: sightings, error: sErr }) => {
        if (sErr) { setError(sErr.message); setLoading(false); return }
        const rows = sightings ?? []
        setCandidates(rows)

        const regIds = [...new Set(rows.map((s) => s.registration_id))]
        if (regIds.length === 0) { setLoading(false); return }

        const { data: regs, error: rErr } = await supabase
          .from('registrations')
          .select('id, registration')
          .in('id', regIds)

        if (!rErr && regs) {
          const map = {}
          for (const r of regs) map[r.id] = r
          setRegsById(map)
        }
        setLoading(false)
      })
  }, [])

  const grouped = {}
  for (const s of candidates) {
    const bucket = monthBucket(s.spotted_on)
    if (!grouped[bucket]) grouped[bucket] = []
    grouped[bucket].push(s)
  }

  const sortedBuckets = Object.keys(grouped).sort((a, b) => {
    if (a === 'undated') return 1
    if (b === 'undated') return -1
    return a.localeCompare(b)
  })

  return (
    <div className="page bookcand-page">
      <button className="top-bar__back fi-back" onClick={onBack} aria-label="Back">
        ‹ Back
      </button>

      <div className="bookcand-hero">
        <img src="/book-card.PNG" alt="" aria-hidden="true" className="bookcand-hero__icon" />
        <div className="bookcand-hero__text">
          <h1 className="bookcand-hero__title">Book Candidates</h1>
          <p className="bookcand-hero__sub">Tagged for the books · grouped by month</p>
        </div>
      </div>

      <main className="content bookcand-content">
        {loading && <p className="state-message">Loading…</p>}
        {error && <p className="state-message state-message--error">{error}</p>}
        {!loading && !error && candidates.length === 0 && (
          <p className="bookcand-empty">
            No book candidates yet — tag sightings as you enter them.
          </p>
        )}
        {!loading && !error && sortedBuckets.map((bucket) => {
          const rows = grouped[bucket]
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
                  const tappable = Boolean(reg && onSelectReg)
                  return (
                    <li key={s.id}>
                      <button
                        className="bookcand-row"
                        onClick={tappable ? () => onSelectReg(reg) : undefined}
                        disabled={!tappable}
                      >
                        <div className="bookcand-row__main">
                          <span className="bookcand-row__reg">{reg?.registration ?? '—'}</span>
                          <span className="bookcand-row__meta">
                            {[s.airport, formatDate(s.spotted_on)].filter(Boolean).join(' · ')}
                          </span>
                        </div>
                        {s.book_story && (
                          <p className="bookcand-row__story">{s.book_story}</p>
                        )}
                        {tappable && (
                          <span className="bookcand-row__chevron" aria-hidden="true">›</span>
                        )}
                      </button>
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
