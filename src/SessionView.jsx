import { useMemo, useState } from 'react'
import { TIME_BLOCKS } from './TimeBlockPicker'
import { stripTypeParens } from './lib/typeGrouping'
import { computeSession } from './lib/session'

function niceDate(iso) {
  const [y, m, d] = iso.split('-').map(Number)
  return new Date(y, m - 1, d).toLocaleDateString([], { year: 'numeric', month: 'short', day: 'numeric' })
}

function gapText(fromISO, toISO) {
  const [fy, fm, fd] = fromISO.split('-').map(Number)
  const [ty, tm, td] = toISO.split('-').map(Number)
  let months = (ty - fy) * 12 + (tm - fm)
  if (td < fd) months -= 1
  if (months <= 0) return 'under a month'
  const yrs = Math.floor(months / 12)
  const mos = months % 12
  if (yrs === 0) return `${mos} mo`
  if (mos === 0) return `${yrs} yrs`
  return `${yrs} yrs ${mos} mo`
}

const CHIP_LIMIT = 12

export default function SessionView({ dateISO, sightings, regs, onBack, onSelectReg }) {
  const [expanded, setExpanded] = useState(false)
  const [blockFilter, setBlockFilter] = useState(null)
  const session = useMemo(() => computeSession(dateISO, sightings, regs, blockFilter), [dateISO, sightings, regs, blockFilter])
  const chips = [...session.newRegs.map((r) => ({ r, isNew: true })), ...session.seenRegs.map((r) => ({ r, isNew: false }))]
  const shown = expanded ? chips : chips.slice(0, CHIP_LIMIT)
  const activeBlock = blockFilter ? TIME_BLOCKS.find((b) => b.key === blockFilter) : null

  function toggleBlock(key) {
    setExpanded(false)
    setBlockFilter((cur) => (cur === key ? null : key))
  }

  return (
    <div className="otd-view">
      <div className="otd-view__head">
        <button className="otd-view__back" onClick={onBack}>‹ Back</button>
        <h2 className="otd-view__title">Session — {niceDate(dateISO)}</h2>
      </div>
      <div className="otd-view__body">
        <p className="sess-sub">{[session.airports.join(', '), `${session.dayTotal} aircraft`].filter(Boolean).join(' · ')}</p>

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

        {session.firsts.length === 0 && session.reunion && (
          <div className="sess-card sess-card--firsts">
            <p className="sess-card__t">Reunion of the day</p>
            <button className="sess-first" onClick={() => onSelectReg({ id: session.reunion.reg.id, airlines: session.reunion.reg.airlines })}>
              <span className="sess-first__tag">REUNION</span>
              <span className="sess-first__name">{session.reunion.reg.registration} — last seen {gapText(session.reunion.last, dateISO)} before</span>
            </button>
          </div>
        )}

        <div className="sess-card">
          <p className="sess-card__t">Timeline</p>
          <div className="sess-tl">
            {TIME_BLOCKS.map((b) => {
              const lit = session.blocksUsed.has(b.key)
              const cls = [
                'sess-tl__block',
                lit ? 'sess-tl__block--on' : '',
                blockFilter === b.key ? 'sess-tl__block--filter' : '',
              ].filter(Boolean).join(' ')
              if (!lit) return <span key={b.key} className={cls}>{b.range}</span>
              return <button key={b.key} className={cls} onClick={() => toggleBlock(b.key)}>{b.range}</button>
            })}
          </div>
          {activeBlock && <p className="sess-tl__cap">Showing the {activeBlock.range} block only — tap it again for the whole day.</p>}
          {!activeBlock && session.blocksUsed.size === 0 && <p className="sess-tl__cap">No time blocks logged for this day.</p>}
        </div>

        <div className="sess-card">
          <p className="sess-card__t">The haul{activeBlock ? ` · ${activeBlock.range}` : ''}</p>
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
          <p className="sess-card__t">Airlines that day{activeBlock ? ` · ${activeBlock.range}` : ''}</p>
          {session.topAirlines.map(([name, n]) => (
            <div key={name} className="sess-al"><span>{name}</span><b>{n}</b></div>
          ))}
          {session.topAirlines.length === 0 && <p className="sess-tl__cap">Nothing in this block.</p>}
        </div>
      </div>
    </div>
  )
}
