import { useEffect, useState } from 'react'

export default function OpeningAnimation({ onDone }) {
  const [play, setPlay] = useState(false)

  useEffect(() => {
    const raf = requestAnimationFrame(() => requestAnimationFrame(() => setPlay(true)))
    const t = setTimeout(() => { if (onDone) onDone() }, 2000)
    return () => { cancelAnimationFrame(raf); clearTimeout(t) }
  }, [])

  return (
    <div className={`intro${play ? ' intro--play' : ''}`} aria-hidden="true">
      <div className="intro__door intro__door--top">
        <img className="intro__half" src="/fitzthespotterlogo.PNG" alt="" />
      </div>
      <div className="intro__door intro__door--bottom">
        <img className="intro__half" src="/fitzthespotterlogo.PNG" alt="" />
      </div>
      <img className="intro__logo" src="/fitzthespotterlogo.PNG" alt="" />
    </div>
  )
}
