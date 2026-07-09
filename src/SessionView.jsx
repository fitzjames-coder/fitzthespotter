import { useMemo, useState } from 'react'
import { TIME_BLOCKS } from './TimeBlockPicker'
import { stripTypeParens } from './lib/typeGrouping'
import { computeSession } from './lib/session'

function niceDate(iso) {
  const [y, m, d] = iso.split('-').map(Number)
  return new Date(y, m - 1, d).toLocaleDateString([], { year: 'numeric', month: 'short', day: 'numeric' })
}

const CHIP_LIMIT = 12

export default function SessionView({ dateISO, sightings, regs, onBack, onSelectReg }) {
  const [expanded, setExpanded] = useState(false)
  const session = useMemo(() => computeSession(dateISO, sightings, regs), [dateISO, sightings, regs])
  const chips = [...session.newRegs.map((r) => ({ r, isNew: true })), ...session.seenRegs.map((r) => ({ r, isNew: false }))]
  const shown = expanded ? chips : chips.slice(0, CHIP_LIMIT)

  return (
    <div className="otd-view">
      <div className="otd-view__head">
        <button className="otd-view__back" onClick={onBack}>‹ Back</button>
        <h2 className="otd-view__title">Session — {niceDate(dateISO)}</h2>
      </div>
      <div className="otd-view__body">
        <p className="sess-sub">{[session.airports.join(', '), `${session.total} aircraft`].filter(Boolean).join(' · ')}</p>

        {session.firsts.length > 0 && (
          <div className="sess-card sess-card--firsts">
            <p className="sess-card__t">Firsts that day</p>
            {session.firsts.map((f, i) => (
              <button key={i} className="sess-first" onClick={() => onSelectReg({ id: f.reg.id, airlines: f.reg.airlines })}>
                <span className="sess-first__tag">{f.kind}</span>
                <span className="sess-first__name">{f.kind === 'FIRST TYPE' ? stripTypeParens(f.name) : f.name} — {f.reg.registration}</span>
              </button>
            ))}
          </div>
        )}

        <div className="sess-card">
          <p className="sess-card__t">Timeline</p>
          <div className="sess-tl">
            {TIME_BLOCKS.map((b) => (
              <span key={b.key} className={session.blocksUsed.has(b.key) ? 'sess-tl__block sess-tl__block--on' : 'sess-tl__block'}>{b.range}</span>
            ))}
          </div>
          {session.blocksUsed.size === 0 && <p className="sess-tl__cap">No time blocks logged for this day.</p>}
        </div>

        <div className="sess-card">
          <p className="sess-card__t">The haul</p>
          <div className="sess-split">
            <div className="sess-half sess-half--new"><div className="sess-half__n">{session.newRegs.length}</div><div className="sess-half__l">New that day</div></div>
            <div className="sess-half"><div className="sess-half__n">{session.seenRegs.length}</div><div className="sess-half__l">Seen before</div></div>
          </div>
          <div className="sess-chips">
            {shown.map(({ r, isNew }) => (
              <button key={r.id} className={isNew ? 'sess-chip sess-chip--new' : 'sess-chip'} onClick={() => onSelectReg({ id: r.id, airlines: r.airlines })}>
                {r.registration}
              </button>
            ))}
            {!expanded && chips.length > CHIP_LIMIT && (
              <button className="sess-more" onClick={() => setExpanded(true)}>+ {chips.length - CHIP_LIMIT} more ›</button>
            )}
          </div>
        </div>

        <div className="sess-card">
          <p className="sess-card__t">Airlines that day</p>
          {session.topAirlines.map(([name, n]) => (
            <div key={name} className="sess-al"><span>{name}</span><b>{n}</b></div>
          ))}
          {session.topAirlines.length === 0 && <p className="sess-tl__cap">No airline data for this day.</p>}
        </div>
      </div>
    </div>
  )
}
