import { useState } from 'react'
import { VG_BASE, VG_EXTS, VG_SECTIONS } from './lib/visualGuide'

function GuideImage({ name, alt, onTap }) {
  const [extIdx, setExtIdx] = useState(0)
  if (extIdx >= VG_EXTS.length) {
    return <div className="vg-missing">Screenshot unavailable</div>
  }
  return (
    <img
      className="vg-shot"
      src={`${VG_BASE}/${name}.${VG_EXTS[extIdx]}`}
      alt={alt}
      loading="lazy"
      onError={() => setExtIdx(extIdx + 1)}
      onClick={onTap}
    />
  )
}

export default function VisualGuideView({ onBack }) {
  const [zoom, setZoom] = useState(null)

  if (zoom) {
    return (
      <div className="vg-zoom" onClick={() => setZoom(null)}>
        <GuideImage name={zoom.img} alt={zoom.title} onTap={() => setZoom(null)} />
        <p className="vg-zoom__cap">{zoom.title} — tap to close</p>
      </div>
    )
  }

  return (
    <div className="otd-view">
      <div className="otd-view__head">
        <button className="otd-view__back" onClick={onBack}>‹ Back</button>
        <h2 className="otd-view__title">Visual Guide</h2>
      </div>
      <div className="otd-view__body">
        <p className="vg-intro">Every part of the app, in pictures. Tap any screenshot to see it full size.</p>
        {VG_SECTIONS.map((sec) => (
          <div key={sec.title} className="vg-section">
            <h3 className="vg-section__title">{sec.title}</h3>
            {sec.items.map((item) => (
              <div key={item.img} className="vg-item">
                <GuideImage name={item.img} alt={item.title} onTap={() => setZoom(item)} />
                <div className="vg-item__text">
                  <p className="vg-item__title">{item.title}</p>
                  <p className="vg-item__cap">{item.caption}</p>
                </div>
              </div>
            ))}
          </div>
        ))}
      </div>
    </div>
  )
}
