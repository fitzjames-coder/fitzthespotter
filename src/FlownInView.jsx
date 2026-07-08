import { useEffect, useState } from 'react'
import { supabase } from './lib/supabaseClient'
import StatusMarks from './StatusMarks'
import RegistrationProfileView from './RegistrationProfileView'
import markFlownIn from './assets/marks/mark-flown-in.png'

const CARD_PALETTE = [
  { tint: 'rgba(44,66,123,0.34)',   thumb: 'rgba(44,66,123,0.60)'   },
  { tint: 'rgba(0,82,129,0.34)',    thumb: 'rgba(0,82,129,0.60)'    },
  { tint: 'rgba(232,96,122,0.34)',  thumb: 'rgba(232,96,122,0.60)'  },
  { tint: 'rgba(251,173,25,0.30)',  thumb: 'rgba(251,173,25,0.55)'  },
  { tint: 'rgba(246,239,220,0.22)', thumb: 'rgba(246,239,220,0.42)' },
  { tint: 'rgba(22,32,59,0.50)',    thumb: 'rgba(22,32,59,0.70)'    },
]

function thumbAbbrev(model) {
  const seg = model.split(/[-\s]/)[0]
  return seg.length <= 5 ? seg : seg.slice(0, 4)
}

function FlownInCard({ reg, index, onSelect }) {
  const palette   = CARD_PALETTE[index % 6]
  const textColor = '#F6EFDC'
  const subColor  = 'rgba(246,239,220,0.66)'
  const typeName  = reg.aircraft_types?.name ?? null
  const abbrev    = typeName ? thumbAbbrev(typeName) : ''

  return (
    <button
      className="fi-card"
      style={{ background: palette.tint }}
      onClick={() => onSelect(reg)}
    >
      <div className="fi-card__thumb" style={{ background: palette.thumb }}>
        <span className="fi-card__thumb-text" style={{ color: subColor }}>{abbrev}</span>
      </div>
      <div className="fi-card__body">
        <span className="fi-card__reg" style={{ color: textColor }}>{reg.registration}</span>
        {typeName && (
          <span className="fi-card__type" style={{ color: subColor }}>{typeName}</span>
        )}
      </div>
      <StatusMarks statuses={reg.statuses} />
    </button>
  )
}

export default function FlownInView({ onBack, onSelectReg }) {
  const [regs, setRegs] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [selectedReg, setSelectedReg] = useState(null)

  useEffect(() => {
    if (!supabase) {
      setError('Supabase is not configured.')
      setLoading(false)
      return
    }
    if (typeof navigator !== 'undefined' && navigator.onLine === false) {
      setError('This page needs a connection. Your logbook is viewable offline — download it from the Offline card — but this page is online-only for now.')
      setLoading(false)
      return
    }
    supabase
      .from('registrations')
      .select(`
        id, registration, first_spotted, statuses,
        aircraft_types ( id, name ),
        airlines ( id, name )
      `)
      .then(({ data, error: err }) => {
        if (err) {
          setError(err.message)
        } else {
          const flownIn = (data ?? [])
            .filter((r) => r.statuses?.flown_in === true)
            .sort((a, b) => {
              if (a.first_spotted && b.first_spotted)
                return a.first_spotted.localeCompare(b.first_spotted)
              if (a.first_spotted) return -1
              if (b.first_spotted) return 1
              return a.registration.localeCompare(b.registration)
            })
          setRegs(flownIn)
        }
        setLoading(false)
      })
  }, [])

  function handleSelect(reg) {
    if (onSelectReg) {
      onSelectReg(reg)
    } else {
      setSelectedReg(reg)
    }
  }

  if (selectedReg) {
    return (
      <RegistrationProfileView
        regId={selectedReg.id}
        airline={selectedReg.airlines}
        onBack={() => setSelectedReg(null)}
        onChanged={() => {}}
      />
    )
  }

  return (
    <div className="page fi-page">
      <button className="top-bar__back fi-back" onClick={onBack} aria-label="Back to stats">
        ‹ Back
      </button>

      <div className="fi-hero">
        <div className="fi-hero__badge">
          <img src={markFlownIn} alt="" aria-hidden="true" className="fi-hero__mark" />
        </div>
        <div className="fi-hero__text">
          <p className="fi-hero__eyebrow">Aboard the aircraft</p>
          <h1 className="fi-hero__title">Flown-in</h1>
          <span className="fi-hero__count-pill">{regs.length} flown aboard</span>
        </div>
      </div>

      <main className="content fi-content">
        {loading && <p className="state-message">Loading…</p>}
        {error  && <p className="state-message state-message--error">{error}</p>}
        {!loading && !error && (
          <>
            <p className="section-label">Registrations</p>
            {regs.length === 0 ? (
              <p className="fi-empty">No flown-in registrations yet.</p>
            ) : (
              <ul className="fi-list">
                {regs.map((reg, i) => (
                  <li key={reg.id}>
                    <FlownInCard reg={reg} index={i} onSelect={handleSelect} />
                  </li>
                ))}
              </ul>
            )}
          </>
        )}
      </main>
    </div>
  )
}
