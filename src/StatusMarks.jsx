import markRemark from './assets/marks/mark-remark.png'
import markSpecialLivery from './assets/marks/mark-special-livery.png'
import markRetro from './assets/marks/mark-retro.png'
import markFlownIn from './assets/marks/mark-flown-in.png'

function allianceLetters(name) {
  if (name === 'Star Alliance') return 'SA'
  if (name === 'SkyTeam') return 'ST'
  if (name === 'Oneworld') return 'OW'
  return 'AL'
}

export function AllianceBadge({ name, size }) {
  return (
    <span
      className="status-marks__alliance"
      style={{ width: size, height: size, fontSize: Math.round(size * 0.38) }}
    >
      {allianceLetters(name)}
    </span>
  )
}

const SRCS = {
  remarks: markRemark,
  special_livery: markSpecialLivery,
  retro: markRetro,
  flown_in: markFlownIn,
}

const ALTS = {
  remarks: 'Remark',
  special_livery: 'Special livery',
  retro: 'Retro',
  flown_in: 'Flown in',
}

const SLOT_KEYS = ['remarks', 'special_livery', 'retro', 'alliance', 'flown_in']

export default function StatusMarks({ statuses, size = 22, onRemarkClick }) {
  if (!statuses) return null

  const active = {
    remarks: Boolean(statuses.remarks),
    special_livery: Boolean(statuses.special_livery),
    retro: Boolean(statuses.retro),
    alliance: Boolean(statuses.alliance),
    flown_in: Boolean(statuses.flown_in),
  }

  if (!Object.values(active).some(Boolean)) return null

  return (
    <span className="status-marks">
      {SLOT_KEYS.map((key) => {
        if (!active[key]) {
          return (
            <span
              key={key}
              className="status-marks__spacer"
              style={{ width: size, height: size }}
            />
          )
        }

        if (key === 'alliance') {
          return <AllianceBadge key={key} name={statuses.alliance_name} size={size} />
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
              <img src={SRCS[key]} alt={ALTS[key]} width={size} height={size} className="status-marks__img" />
            </button>
          )
        }

        return (
          <img
            key={key}
            src={SRCS[key]}
            alt={ALTS[key]}
            width={size}
            height={size}
            className="status-marks__img"
          />
        )
      })}
    </span>
  )
}
