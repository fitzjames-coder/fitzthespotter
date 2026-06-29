import { useEffect, useRef, useState } from 'react'
import L from 'leaflet'
import 'leaflet/dist/leaflet.css'
import { supabase } from './lib/supabaseClient'

const SAT_URL = 'https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}'
const LABELS_URL = 'https://server.arcgisonline.com/ArcGIS/rest/services/Reference/World_Boundaries_and_Places/MapServer/tile/{z}/{y}/{x}'
const OSM_URL = 'https://tile.openstreetmap.org/{z}/{x}/{y}.png'

export default function AirportMap({ airport, savedView, onViewSaved, onClose }) {
  const elRef = useRef(null)
  const mapRef = useRef(null)
  const markersRef = useRef([])
  const maxNumRef = useRef(0)
  const satRef = useRef(null)
  const labelsRef = useRef(null)
  const osmRef = useRef(null)
  const addModeRef = useRef(false)
  const pinLockedRef = useRef(false)

  const [locked, setLocked] = useState(savedView != null)
  const [saving, setSaving] = useState(false)
  const [flash, setFlash] = useState(false)
  const [addMode, setAddMode] = useState(false)
  const [pinLocked, setPinLocked] = useState(false)
  const [layer, setLayer] = useState('satellite')

  function pinIcon(num) {
    return L.divIcon({ className: '', html: `<div class="ap-pin"><b>${num}</b></div>`, iconSize: [26, 26], iconAnchor: [13, 26] })
  }

  function addPinMarker(pin, map) {
    const m = L.marker([pin.lat, pin.lng], { icon: pinIcon(pin.pin_number), draggable: !pinLockedRef.current }).addTo(map)
    m._pinId = pin.id
    m.on('click', () => {
      if (pinLockedRef.current) return
      m.bindPopup(`<div class="ap-pin-pop">Pin ${pin.pin_number}<button class="ap-pin-del" data-id="${pin.id}">Delete</button></div>`).openPopup()
    })
    m.on('dragend', async () => {
      const p = m.getLatLng()
      await supabase.from('airport_pins').update({ lat: p.lat, lng: p.lng }).eq('id', pin.id)
    })
    markersRef.current.push(m)
  }

  useEffect(() => {
    const center = savedView ? [savedView.lat, savedView.lng] : [20, 0]
    const zoom = savedView ? (savedView.zoom ?? 14) : 2
    const map = L.map(elRef.current).setView(center, zoom)
    satRef.current = L.tileLayer(SAT_URL, { maxZoom: 19, attribution: 'Imagery © Esri' }).addTo(map)
    labelsRef.current = L.tileLayer(LABELS_URL, { maxZoom: 19 }).addTo(map)
    osmRef.current = L.tileLayer(OSM_URL, { maxZoom: 19, attribution: '© OpenStreetMap' })
    mapRef.current = map

    map.on('click', async (e) => {
      if (!addModeRef.current || pinLockedRef.current) return
      const num = maxNumRef.current + 1
      const { data, error } = await supabase
        .from('airport_pins')
        .insert({ iata: airport.iata, lat: e.latlng.lat, lng: e.latlng.lng, pin_number: num })
        .select('id, lat, lng, pin_number')
        .single()
      if (!error && data) {
        maxNumRef.current = num
        addPinMarker(data, map)
      }
    })

    function onDelClick(ev) {
      const btn = ev.target.closest('.ap-pin-del')
      if (!btn) return
      const id = btn.getAttribute('data-id')
      supabase.from('airport_pins').delete().eq('id', id).then(() => {
        const mk = markersRef.current.find((mm) => mm._pinId === id)
        if (mk) { map.removeLayer(mk); markersRef.current = markersRef.current.filter((mm) => mm !== mk) }
      })
    }
    elRef.current.addEventListener('click', onDelClick)

    supabase
      .from('airport_pins')
      .select('id, lat, lng, pin_number')
      .eq('iata', airport.iata)
      .order('pin_number')
      .then(({ data }) => {
        const pins = data ?? []
        pins.forEach((p) => addPinMarker(p, map))
        maxNumRef.current = pins.reduce((mx, p) => Math.max(mx, p.pin_number), 0)
        if (pins.length > 0) { pinLockedRef.current = true; setPinLocked(true) }
      })

    setTimeout(() => map.invalidateSize(), 60)
    const elNode = elRef.current
    return () => { elNode.removeEventListener('click', onDelClick); map.remove(); mapRef.current = null }
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

  function toggleAdd() {
    const next = !addMode
    setAddMode(next)
    addModeRef.current = next
  }

  function togglePinLock() {
    const next = !pinLocked
    setPinLocked(next)
    pinLockedRef.current = next
    markersRef.current.forEach((m) => { if (m.dragging) { next ? m.dragging.disable() : m.dragging.enable() } })
    if (next) { setAddMode(false); addModeRef.current = false }
  }

  function toggleLayer() {
    const map = mapRef.current
    if (!map) return
    if (layer === 'satellite') {
      map.removeLayer(satRef.current)
      map.removeLayer(labelsRef.current)
      osmRef.current.addTo(map)
      setLayer('diagram')
    } else {
      map.removeLayer(osmRef.current)
      satRef.current.addTo(map)
      labelsRef.current.addTo(map)
      setLayer('satellite')
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
        <button className={`airport-map__ctl airport-map__ctl--add${addMode ? ' airport-map__ctl--on' : ''}`} onClick={toggleAdd} disabled={pinLocked}>+ Add pin</button>
        <button className={`airport-map__ctl${pinLocked ? ' airport-map__ctl--on' : ''}`} onClick={togglePinLock}>{pinLocked ? '🔒 Pins' : '🔓 Pins'}</button>
        <button className="airport-map__ctl" onClick={toggleLayer}>{layer === 'satellite' ? '🛰 Satellite' : '🗺 Diagram'}</button>
        {locked ? (
          <button className="airport-map__ctl airport-map__ctl--on" onClick={() => setLocked(false)}>🔒 View</button>
        ) : (
          <button className="airport-map__ctl" onClick={lockView} disabled={saving}>{flash ? '📍 Saved ✓' : (saving ? '…' : '📍 Lock view')}</button>
        )}
      </div>
    </div>
  )
}
