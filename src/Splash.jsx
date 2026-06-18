import { useEffect, useState } from 'react'

// ─── Tune this one value to nudge the logo's final landing position ───
// Positive DELTA moves the logo DOWN from viewport center.
// Goal: logo centre sits just above (cresting) the bottom nav bar.
// Typical nav height ~64px; adjust ±px after testing on device.
const LOGO_DELTA = 'calc(50vh - 88px)'

export default function Splash() {
  const [open, setOpen] = useState(false)

  useEffect(() => {
    const id = requestAnimationFrame(() => setOpen(true))
    return () => cancelAnimationFrame(id)
  }, [])

  const openCls = open ? ' open' : ''

  return (
    <div className="splash" aria-hidden="true">
      <div className={`splash__top${openCls}`} />
      <div className={`splash__bottom${openCls}`} />
      <img
        className={`splash__logo${openCls}`}
        src="/fitzthespotterlogo.PNG"
        alt=""
        style={{ '--delta': LOGO_DELTA }}
      />
    </div>
  )
}
