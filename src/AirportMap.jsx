import { useEffect, useRef, useState } from 'react'
import L from 'leaflet'
import 'leaflet/dist/leaflet.css'
import { supabase } from './lib/supabaseClient'

export default function AirportMap({ airport, savedView, onViewSaved, onClose }) {
  const elRef = useRef(null)
  const mapRef = useRef(null)
  const [locked, setLocked] = useState(savedView != null)
  const [saving, setSaving] = useState(false)
  const [flash, setFlash] = useState(false)

  useEffect(() => {
    const center = savedView ? [savedView.lat, savedView.lng] : [20, 0]
    const zoom = savedView ? (savedView.zoom ?? 14) : 2
    const map = L.map(elRef.current).setView(center, zoom)
    L.tileLayer(
      'https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}',
      { maxZoom: 19, attribution: 'Imagery © Esri' }
    ).addTo(map)
    L.tileLayer(
      'https://server.arcgisonline.com/ArcGIS/rest/services/Reference/World_Boundaries_and_Places/MapServer/tile/{z}/{y}/{x}',
      { maxZoom: 19 }
    ).addTo(map)
    mapRef.current = map
    setTimeout(() => map.invalidateSize(), 60)
    return () => { map.remove(); mapRef.current = null }
  }, [])

  async function lockView() {
    const map = mapRef.current
    if (!map) return
    const c = map.getCenter()
    const z = map.getZoom()
    setSaving(true)
    const { error } = await supabase
      .from('airports')
      .update({ view_lat: c.lat, view_lng: c.lng, view_zoom: z })
      .eq('iata', airport.iata)
    setSaving(false)
    if (!error) {
      if (onViewSaved) onViewSaved({ lat: c.lat, lng: c.lng, zoom: z })
      setLocked(true)
      setFlash(true)
      setTimeout(() => setFlash(false), 1400)
    }
  }

  return (
    <div className="airport-map-layer">
      <header className="airport-map-layer__top">
        <span className="airport-map-layer__title">{airport.iata} · Spotting map</span>
        <button className="airport-map-layer__close" onClick={onClose} aria-label="Close map">×</button>
      </header>
      <div className="airport-map" ref={elRef} />
      <div className="airport-map__controls">
        {locked ? (
          <button className="airport-map__ctl airport-map__ctl--on" onClick={() => setLocked(false)}>🔒 View locked</button>
        ) : (
          <button className="airport-map__ctl" onClick={lockView} disabled={saving}>
            {flash ? '📍 View saved ✓' : (saving ? 'Saving…' : '📍 Lock this view')}
          </button>
        )}
      </div>
    </div>
  )
}
