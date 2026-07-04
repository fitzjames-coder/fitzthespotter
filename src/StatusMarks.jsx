import markRemark from './assets/marks/mark-remark.png'
import markSpecialLivery from './assets/marks/mark-special-livery.png'
import markRetro from './assets/marks/mark-retro.png'
import markOldLivery from './assets/marks/mark-old-livery.png'
import markFlownIn from './assets/marks/mark-flown-in.png'
import allianceStar from './assets/marks/mark-alliance-star.png'
import allianceSkyteam from './assets/marks/mark-alliance-skyteam.png'
import allianceOneworld from './assets/marks/mark-alliance-oneworld.png'

function allianceLetters(name) {
  if (name === 'Star Alliance') return 'SA'
  if (name === 'SkyTeam') return 'ST'
  if (name === 'Oneworld') return 'OW'
  return 'AL'
}

const ALLIANCE_EMBLEMS = {
  'Star Alliance': allianceStar,
  SkyTeam: allianceSkyteam,
  Oneworld: allianceOneworld,
}

export function AllianceBadge({ name, size }) {
  const style = size
    ? { width: size, height: size, fontSize: Math.round(size * 0.38) }
    : { width: '2.73em', height: '2.73em', fontSize: '0.55em' }

  const emblem = ALLIANCE_EMBLEMS[name]
  if (emblem) {
    return (
      <img
        src={emblem}
        alt={name}
        className="status-marks__alliance-img"
        style={style}
      />
    )
  }

  return (
    <span
      className="status-marks__alliance"
      style={style}
    >
      {allianceLetters(name)}
    </span>
  )
}

const SRCS = {
  remarks: markRemark,
  special_livery: markSpecialLivery,
  retro: markRetro,
  old_livery: markOldLivery,
  flown_in: markFlownIn,
}

const ALTS = {
  remarks: 'Remark',
  special_livery: 'Special livery',
  retro: 'Retro',
  old_livery: 'Livery change',
  flown_in: 'Flown in',
}

const SLOT_KEYS = ['remarks', 'special_livery', 'retro', 'old_livery', 'alliance', 'flown_in']

export default function StatusMarks({ statuses, size = 22, onRemarkClick, onFlownInClick }) {
  if (!statuses) return null

  const active = {
    remarks: Boolean(statuses.remarks),
    special_livery: Boolean(statuses.special_livery),
    retro: Boolean(statuses.retro),
    old_livery: Boolean(statuses.old_livery),
    alliance: Boolean(statuses.alliance),
    flown_in: Boolean(statuses.flown_in),
    rs: Boolean(statuses.rs),
  }

  if (!Object.values(active).some(Boolean)) return null

  return (
    <span className="status-marks">
      {active.rs && (
        <span className="status-marks__rs" style={{ width: size, height: size }} title="Removed / stored / scrapped">R/S</span>
      )}
      {SLOT_KEYS.map((key) => {
        if (!active[key]) {
          return <span key={key} className="status-marks__spacer" />
        }

        if (key === 'alliance') {
          return <AllianceBadge key={key} name={statuses.alliance_name} />
        }

        if (key === 'remarks' && onRemarkClick) {
          return (
            <button
              key={key}
              type="button"
              className="status-marks__btn"
              onClick={onRemarkClick}
              aria-label="View remark"
            >
              <img src={SRCS[key]} alt={ALTS[key]} className="status-marks__img" />
            </button>
          )
        }

        if (key === 'flown_in' && onFlownInClick) {
          return (
            <button
              key={key}
              type="button"
              className="status-marks__btn"
              onClick={onFlownInClick}
              aria-label="View flown-in date"
            >
              <img src={SRCS[key]} alt={ALTS[key]} className="status-marks__img" />
            </button>
          )
        }

        return (
          <img
            key={key}
            src={SRCS[key]}
            alt={ALTS[key]}
            className="status-marks__img"
          />
        )
      })}
    </span>
  )
}
