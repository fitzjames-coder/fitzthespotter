import { useEffect, useRef, useState } from 'react'
import { supabase } from './lib/supabaseClient'
import { offlineRegProfile } from './lib/offlineData'
import { stripTypeParens } from './lib/typeGrouping'
import NewRegistrationForm from './NewRegistrationForm'
import CopyButton from './CopyButton'
import StatusMarks from './StatusMarks'
import cameraIcon from './assets/marks/mark-camera.png'
import cameraOffIcon from './assets/marks/mark-camera-off.png'

function formatFlownInDate(iso) {
  if (!iso) return ''
  const [y, m, d] = iso.split('-')
  if (!y || !m || !d) return iso
  const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec']
  return `${parseInt(d, 10)} ${months[parseInt(m, 10) - 1]} ${y}`
}

const PHOTO_MAX_LONG_EDGE = 2560
const PHOTO_MAX_UPLOAD_BYTES = 3.8 * 1024 * 1024
const PHOTO_QUALITY_STEPS = [0.92, 0.86, 0.80, 0.74]

function loadImageFile(file) {
  return new Promise((resolve, reject) => {
    const url = URL.createObjectURL(file)
    const img = new Image()
    img.onload = async () => {
      try {
        if (img.decode) await img.decode()
      } catch {
        // dimensions are already usable even if decode() itself rejects
      }
      URL.revokeObjectURL(url)
      resolve(img)
    }
    img.onerror = () => {
      URL.revokeObjectURL(url)
      reject(new Error('Could not read this image'))
    }
    img.src = url
  })
}

function canvasToJpegBlob(canvas, quality) {
  return new Promise((resolve) => {
    canvas.toBlob((blob) => resolve(blob), 'image/jpeg', quality)
  })
}

async function prepareImageForUpload(file) {
  const img = await loadImageFile(file)
  const longEdge = Math.max(img.naturalWidth, img.naturalHeight)
  const scale = longEdge > PHOTO_MAX_LONG_EDGE ? PHOTO_MAX_LONG_EDGE / longEdge : 1
  const width = Math.round(img.naturalWidth * scale)
  const height = Math.round(img.naturalHeight * scale)

  const canvas = document.createElement('canvas')
  canvas.width = width
  canvas.height = height
  const ctx = canvas.getContext('2d')
  ctx.drawImage(img, 0, 0, width, height)

  let blob = null
  for (const quality of PHOTO_QUALITY_STEPS) {
    blob = await canvasToJpegBlob(canvas, quality)
    if (blob && blob.size <= PHOTO_MAX_UPLOAD_BYTES) break
  }
  if (!blob) throw new Error('Could not process this image')

  return { blob, contentType: 'image/jpeg' }
}

function blobToBase64(blob) {
  return new Promise((resolve, reject) => {
    const r = new FileReader()
    r.onload = () => resolve(String(r.result).split(',')[1])
    r.onerror = reject
    r.readAsDataURL(blob)
  })
}

function SpotlightOverlay({ label = 'REMARK', remark, dramatized, onClose }) {
  const [showDram, setShowDram] = useState(false)
  const hasDram = Boolean(dramatized && dramatized.trim())
  const text = hasDram && showDram ? dramatized : remark
  return (
    <div
      className="spotlight-backdrop"
      onClick={onClose}
      role="dialog"
      aria-modal="true"
      aria-label="Spotlight"
    >
      <div
        className="spotlight-card"
        onClick={(e) => e.stopPropagation()}
      >
        <p className="spotlight-label">{label}</p>
        {hasDram && (
          <div className="spotlight-toggle">
            <button
              type="button"
              className={`spotlight-toggle__btn${!showDram ? ' is-on' : ''}`}
              onClick={() => setShowDram(false)}
            >Note</button>
            <button
              type="button"
              className={`spotlight-toggle__btn${showDram ? ' is-on' : ''}`}
              onClick={() => setShowDram(true)}
            >Dramatized</button>
          </div>
        )}
        <p className="spotlight-text">{text}</p>
        <button className="spotlight-close" onClick={onClose}>
          Close
        </button>
      </div>
    </div>
  )
}

function RegTopBar({ reg, onBack, onEdit }) {
  const [spotlight, setSpotlight] = useState(null)
  const [note, setNote] = useState(null)
  const hasRemark = Boolean(reg.remark && reg.remark.trim())

  useEffect(() => {
    let active = true
    if (!supabase || !reg.registration) return
    supabase
      .from('notes')
      .select('note_body, dramatized_body')
      .eq('registration', reg.registration)
      .maybeSingle()
      .then(({ data }) => {
        if (active) setNote(data && data.note_body && data.note_body.trim() ? data : null)
      })
    return () => { active = false }
  }, [reg.registration])

  return (
    <>
      <header className="top-bar top-bar--detail">
        <button className="top-bar__back" onClick={onBack} aria-label="Back to airline">
          ‹ Back
        </button>
        <div className="top-bar__detail-row">
          <div className="top-bar__detail-info">
            <h1 className="top-bar__detail-name">{reg.registration}</h1>
            <StatusMarks
              statuses={reg.statuses}
              onRemarkClick={hasRemark ? () => setSpotlight({ label: 'REMARK', text: reg.remark }) : undefined}
              onFlownInClick={reg.statuses?.flown_in ? () => {
                const dateStr = formatFlownInDate(reg.statuses?.flown_in_date)
                setSpotlight({ label: 'FLOWN IN', text: dateStr || '—' })
              } : undefined}
            />
            {note && (
              <button
                className="reg-note-indicator"
                onClick={() => setSpotlight({ label: 'NOTE', text: note.note_body, dramatized: note.dramatized_body })}
                aria-label="View note"
              >
                📝 Note
              </button>
            )}
          </div>
          <CopyButton value={reg.registration} label="Copy registration" />
          <button className="top-bar__edit" onClick={onEdit} aria-label="Edit registration">
            Edit
          </button>
        </div>
      </header>
      {spotlight !== null && (
        <SpotlightOverlay
          label={spotlight.label}
          remark={spotlight.text}
          dramatized={spotlight.dramatized}
          onClose={() => setSpotlight(null)}
        />
      )}
    </>
  )
}

function GalleryPlaceholder() {
  return (
    <div className="gallery-placeholder">
      <span className="gallery-placeholder__caption">Aircraft image coming soon</span>
    </div>
  )
}

function ImageSpotlightOverlay({ src, alt, onClose, onDelete, deleting }) {
  return (
    <div className="reg-image-overlay" onClick={onClose}>
      <img className="reg-image-overlay__img" src={src} alt={alt} />
      {onDelete && (
        <button
          className="reg-image-overlay__delete"
          onClick={(e) => { e.stopPropagation(); onDelete() }}
          disabled={deleting}
          aria-label="Delete this photo"
        >
          {deleting ? 'Deleting…' : 'Delete photo'}
        </button>
      )}
    </div>
  )
}

function PhotoGallery({ slides, onSlideClick }) {
  const trackRef = useRef(null)
  const [activeIndex, setActiveIndex] = useState(0)

  function handleScroll() {
    const track = trackRef.current
    if (!track) return
    const idx = Math.round(track.scrollLeft / track.clientWidth)
    setActiveIndex(Math.max(0, Math.min(idx, slides.length - 1)))
  }

  return (
    <div className="reg-gallery">
      <div className="reg-gallery__track" ref={trackRef} onScroll={handleScroll}>
        {slides.map((src, i) => (
          <button
            key={i}
            className="reg-gallery__slide"
            onClick={() => onSlideClick(src)}
            aria-label={`View photo ${i + 1} of ${slides.length}`}
          >
            <img className="reg-gallery__img" src={src} alt="" aria-hidden="true" />
          </button>
        ))}
      </div>
      {slides.length > 1 && (
        <div className="reg-gallery__dots" aria-hidden="true">
          {slides.map((_, i) => (
            <span
              key={i}
              className={`reg-gallery__dot${i === activeIndex ? ' reg-gallery__dot--active' : ''}`}
            />
          ))}
        </div>
      )}
    </div>
  )
}

function isRegMilestoneNumber(n) {
  if ([100, 250, 500, 750, 1000].includes(n)) return true
  return n > 1000 && (n - 1000) % 500 === 0
}

function isSightMilestoneNumber(n) {
  if (n === 500 || n === 1000) return true
  return n > 1000 && n % 1000 === 0
}

export function formatSinceLastSeen(iso) {
  const [y, m, d] = iso.split('-').map(Number)
  const then = new Date(y, m - 1, d || 1)
  const now = new Date()
  let months = (now.getFullYear() - then.getFullYear()) * 12 + (now.getMonth() - then.getMonth())
  if (now.getDate() < then.getDate()) months -= 1
  if (months <= 0) return 'under a month ago'
  const yrs = Math.floor(months / 12)
  const mos = months % 12
  if (yrs === 0) return `${mos} mo ago`
  if (mos === 0) return `${yrs} yrs ago`
  return `${yrs} yrs ${mos} mo ago`
}

function InfoSection({ reg, lastSighting, sightingCount, isRetiredType }) {
  const [honors, setHonors] = useState([])

  useEffect(() => {
    let cancelled = false
    async function computeHonors() {
      if (!supabase || !reg?.id) return
      if (typeof navigator !== 'undefined' && navigator.onLine === false) return
      const found = []
      try {
        const { data: me } = await supabase.from('registrations').select('id, first_spotted').eq('id', reg.id).single()
        if (me?.first_spotted) {
          const { count } = await supabase
            .from('registrations')
            .select('id', { count: 'exact', head: true })
            .not('first_spotted', 'is', null)
            .or(`first_spotted.lt.${me.first_spotted},and(first_spotted.eq.${me.first_spotted},id.lt.${me.id})`)
          const pos = (count ?? 0) + 1
          if (isRegMilestoneNumber(pos)) found.push(`Registration #${pos.toLocaleString()}`)
        }
        const { data: mySightings } = await supabase
          .from('sightings')
          .select('id, spotted_on')
          .eq('registration_id', reg.id)
          .not('spotted_on', 'is', null)
        for (const s of mySightings || []) {
          const { count } = await supabase
            .from('sightings')
            .select('id', { count: 'exact', head: true })
            .not('spotted_on', 'is', null)
            .or(`spotted_on.lt.${s.spotted_on},and(spotted_on.eq.${s.spotted_on},id.lt.${s.id})`)
          const pos = (count ?? 0) + 1
          if (isSightMilestoneNumber(pos)) found.push(`Carried sighting #${pos.toLocaleString()}`)
        }
      } catch { /* silently skip honors */ }
      if (!cancelled) setHonors(found)
    }
    computeHonors()
    return () => { cancelled = true }
  }, [reg?.id])

  const manufacturer = reg.aircraft_types?.manufacturers?.name
  const model = stripTypeParens(reg.aircraft_types?.name ?? '')
  const aircraftLabel = [manufacturer, model].filter(Boolean).join(' ')
  const buildYear = reg.build_date ? parseInt(reg.build_date.slice(0, 4), 10) : null
  const age = buildYear ? new Date().getFullYear() - buildYear : null
  const firstSpottedYear = reg.first_spotted ? parseInt(reg.first_spotted.slice(0, 4), 10) : null
  const firstSpottedAge = buildYear && firstSpottedYear ? firstSpottedYear - buildYear : null
  const airports = Array.isArray(reg.airports) ? reg.airports : []
  const firstAirport = airports[0] ?? null
  const lastDate = lastSighting?.spotted_on ?? null
  const lastAirport = lastDate ? (lastSighting?.airport ?? null) : null

  return (
    <div className="info-card">
      {aircraftLabel && (
        <div className="info-row">
          <span className="info-row__label">Aircraft</span>
          <span className="info-row__value">
            {aircraftLabel}
            {isRetiredType && <span className="reg-retired-pill">Retired</span>}
          </span>
        </div>
      )}
      {(reg.msn || age != null) && (
        <div className="info-row">
          <span className="info-row__label">MSN</span>
          <span className="info-row__value reg-msn-age-value">
            <span>{reg.msn || '—'}</span>
            {firstSpottedAge != null && (
              <span className="reg-age-block reg-age-block--first">
                <span className="reg-age">{firstSpottedAge} yrs</span>
                <span className="reg-age-caption">(1st Spotted Age)</span>
              </span>
            )}
            {age != null && (
              <span className="reg-age-block">
                <span className="reg-age">{age} yrs</span>
                <span className="reg-age-caption">(Current Age)</span>
              </span>
            )}
          </span>
        </div>
      )}
      {airports.length > 0 && (
        <div className="info-row info-row--airports">
          <span className="info-row__label">Airports</span>
          <div className="info-row__pills">
            {airports.map((code) => {
              const isFirst = code === firstAirport
              const isLast = Boolean(lastAirport && code === lastAirport)
              let pillClass = 'airport-pill'
              if (isFirst && isLast) pillClass = 'airport-pill airport-pill--first'
              else if (isFirst) pillClass = 'airport-pill airport-pill--first'
              else if (isLast) pillClass = 'airport-pill airport-pill--last'
              return (
                <span key={code} className={pillClass}>
                  {code}
                  {isFirst && isLast && lastDate && (
                    <span className="airport-pill__recent" aria-label="most recent sighting"></span>
                  )}
                </span>
              )
            })}
          </div>
        </div>
      )}
      <div className="info-row">
        <span className="info-row__label">Sightings</span>
        <span className="info-row__value">{sightingCount}</span>
      </div>
      {reg.first_spotted && (
        <div className="info-row">
          <span className="info-row__label">First spotted</span>
          <span className="info-row__value info-date--first">{reg.first_spotted}</span>
        </div>
      )}
      {lastDate && (
        <div className="info-row">
          <span className="info-row__label">Last spotted</span>
          <span className="info-row__value"><span className="info-date--last">{lastDate}</span></span>
        </div>
      )}
      {lastDate && (
        <div className="info-row">
          <span className="info-row__label">Last seen</span>
          <span className="info-row__value info-last-seen">{formatSinceLastSeen(lastDate)}</span>
        </div>
      )}
      {honors.map((h) => (
        <div className="info-row" key={h}>
          <span className="info-row__label">Milestone</span>
          <span className="info-row__value info-milestone">{h}</span>
        </div>
      ))}
    </div>
  )
}

function ActionConfirmSheet({ message, confirmLabel, busyLabel, onConfirm, onCancel, busy }) {
  return (
    <div className="entry-modal-backdrop" onClick={onCancel}>
      <div className="entry-modal delete-confirm action-confirm" onClick={(e) => e.stopPropagation()}>
        <p className="action-confirm__message">{message}</p>
        <button
          className="btn-confirm-action"
          onClick={onConfirm}
          disabled={busy}
        >
          {busy ? busyLabel : confirmLabel}
        </button>
        <button className="btn-cancel-delete" onClick={onCancel} disabled={busy}>
          Cancel
        </button>
      </div>
    </div>
  )
}

function DeleteConfirmSheet({ regId, onConfirm, onCancel, deleting }) {
  return (
    <div className="entry-modal-backdrop" onClick={onCancel}>
      <div className="entry-modal delete-confirm" onClick={(e) => e.stopPropagation()}>
        <button
          className="btn-confirm-delete"
          onClick={onConfirm}
          disabled={deleting}
        >
          {deleting ? 'Deleting…' : 'Confirm Delete'}
        </button>
        <p className="delete-confirm__hint">This cannot be undone.</p>
        <button className="btn-cancel-delete" onClick={onCancel}>
          Cancel
        </button>
      </div>
    </div>
  )
}

export default function RegistrationProfileView({ regId, airline, onBack, onChanged }) {
  const [currentRegId, setCurrentRegId] = useState(regId)
  const [reg, setReg] = useState(null)
  const [lastSighting, setLastSighting] = useState(null)
  const [sightingCount, setSightingCount] = useState(0)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [showEdit, setShowEdit] = useState(false)
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false)
  const [deleting, setDeleting] = useState(false)
  const [deleteError, setDeleteError] = useState(null)
  const [flagged, setFlagged] = useState(false)
  const [siblingIds, setSiblingIds] = useState([])
  const [spotlightSrc, setSpotlightSrc] = useState(null)
  const [photoUrls, setPhotoUrls] = useState([])
  const [showFlagConfirm, setShowFlagConfirm] = useState(false)
  const [flagBusy, setFlagBusy] = useState(false)
  const [showUploadConfirm, setShowUploadConfirm] = useState(false)
  const [uploadingPhoto, setUploadingPhoto] = useState(false)
  const [photoError, setPhotoError] = useState(null)
  const [photoLimitNote, setPhotoLimitNote] = useState(false)
  const [deletingPhoto, setDeletingPhoto] = useState(false)
  const fileInputRef = useRef(null)
  const tapTimerRef = useRef(null)
  // incremented by onSaved so the effect re-runs without changing currentRegId
  const [reloadKey, setReloadKey] = useState(0)
  const [isRetiredType, setIsRetiredType] = useState(false)

  useEffect(() => {
    return () => { if (tapTimerRef.current) clearTimeout(tapTimerRef.current) }
  }, [])

  useEffect(() => { setCurrentRegId(regId) }, [regId])

  useEffect(() => {
    let active = true
    async function loadReg() {
      setLoading(true)
      setError(null)
      if (!supabase) {
        setError('Supabase is not configured.')
        setLoading(false)
        return
      }

      async function loadFromOffline() {
        const res = await offlineRegProfile(currentRegId)
        if (!active) return
        if (!res) {
          setError('You are offline and no offline copy is saved yet. Download from the Offline card while connected.')
          setLoading(false)
          return
        }
        if (res.notFound) {
          setError('This registration is not in your offline copy.')
          setLoading(false)
          return
        }
        setReg(res.reg)
        setFlagged(Boolean(res.reg.flagged))
        setPhotoUrls(Array.isArray(res.reg.photo_urls) ? res.reg.photo_urls : [])
        setLastSighting(res.lastSighting)
        setSightingCount(res.sightingCount)
        setError(null)
        setLoading(false)
      }

      if (typeof navigator !== 'undefined' && navigator.onLine === false) {
        await loadFromOffline()
        return
      }

      try {
      const { data, error: fetchError } = await supabase
        .from('registrations')
        .select(`
          id,
          registration,
          airline_id,
          first_spotted,
          airports,
          remark,
          statuses,
          flagged,
          photo_urls,
          msn,
          build_date,
          aircraft_types (
            id,
            name,
            template_url,
            manufacturers (
              id,
              name
            )
          )
        `)
        .eq('id', currentRegId)
        .single()

      if (!active) return

      if (fetchError) {
        setError(fetchError.message)
        setLoading(false)
        return
      }

      setReg(data)
      setFlagged(Boolean(data.flagged))
      setPhotoUrls(Array.isArray(data.photo_urls) ? data.photo_urls : [])

      const { data: ls } = await supabase
        .from('sightings')
        .select('airport, spotted_on')
        .eq('registration_id', currentRegId)
        .order('spotted_on', { ascending: false, nullsFirst: false })
        .limit(1)
        .maybeSingle()

      if (!active) return

      setLastSighting(ls ?? null)

      const { count: sc } = await supabase
        .from('sightings')
        .select('id', { count: 'exact', head: true })
        .eq('registration_id', currentRegId)
      if (active) setSightingCount(sc ?? 0)

      setLoading(false)
      } catch (e) {
        await loadFromOffline()
      }
    }
    loadReg()
    return () => { active = false }
  }, [currentRegId, reloadKey])

  useEffect(() => {
    if (!supabase || !reg?.airline_id) return
    supabase
      .from('registrations')
      .select('id')
      .eq('airline_id', reg.airline_id)
      .order('first_spotted', { ascending: true, nullsFirst: false })
      .order('registration', { ascending: true })
      .then(({ data }) => {
        setSiblingIds((data ?? []).map((r) => r.id))
      })
  }, [reg?.airline_id])

  useEffect(() => {
    const typeId = reg?.aircraft_types?.id
    if (!supabase || !reg?.airline_id || !typeId) { setIsRetiredType(false); return }
    supabase
      .from('retired_types')
      .select('id')
      .eq('airline_id', reg.airline_id)
      .eq('aircraft_type_id', typeId)
      .maybeSingle()
      .then(({ data }) => setIsRetiredType(Boolean(data)))
  }, [reg?.airline_id, reg?.aircraft_types?.id])

  const index = siblingIds.indexOf(currentRegId)
  const hasPrev = index > 0
  const hasNext = index >= 0 && index < siblingIds.length - 1

  const goPrev = () => {
    const i = siblingIds.indexOf(currentRegId)
    if (i > 0) {
      setCurrentRegId(siblingIds[i - 1])
    }
  }
  const goNext = () => {
    const i = siblingIds.indexOf(currentRegId)
    if (i >= 0 && i < siblingIds.length - 1) {
      setCurrentRegId(siblingIds[i + 1])
    }
  }

  async function handleToggleFlag() {
    const next = !flagged
    setFlagged(next)
    if (supabase) {
      await supabase.from('registrations').update({ flagged: next }).eq('id', currentRegId)
    }
  }

  async function handleConfirmFlag() {
    if (flagBusy) return
    setFlagBusy(true)
    await handleToggleFlag()
    setFlagBusy(false)
    setShowFlagConfirm(false)
  }

  function handleCameraTap() {
    if (uploadingPhoto) return
    if (tapTimerRef.current) {
      clearTimeout(tapTimerRef.current)
      tapTimerRef.current = null
      handleCameraDoubleTap()
    } else {
      tapTimerRef.current = setTimeout(() => {
        tapTimerRef.current = null
        setShowFlagConfirm(true)
      }, 260)
    }
  }

  function handleCameraDoubleTap() {
    if (photoUrls.length >= 5) {
      setPhotoLimitNote(true)
      setTimeout(() => setPhotoLimitNote(false), 2000)
      return
    }
    setShowUploadConfirm(true)
  }

  function handleConfirmUpload() {
    setShowUploadConfirm(false)
    if (typeof navigator !== 'undefined' && navigator.onLine === false) {
      window.alert('Photos need a connection — they upload directly to storage and cannot be queued offline. Try again when you are back online.')
      return
    }
    fileInputRef.current?.click()
  }

  async function handleUploadPhoto(file) {
    if (uploadingPhoto) return
    if (typeof navigator !== 'undefined' && navigator.onLine === false) {
      window.alert('Photos need a connection — they upload directly to storage and cannot be queued offline. Try again when you are back online.')
      return
    }
    setUploadingPhoto(true)
    setPhotoError(null)
    try {
      const { blob, contentType } = await prepareImageForUpload(file)
      const base64 = await blobToBase64(blob)
      const resp = await fetch('/api/upload', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ fileBase64: base64, contentType, keyPrefix: 'reg-photos' }),
      })
      const uploadData = await resp.json()
      if (!resp.ok) throw new Error(uploadData.error || 'Photo upload failed')

      const nextUrls = [...photoUrls, uploadData.url]
      const { error: err } = await supabase
        .from('registrations')
        .update({ photo_urls: nextUrls })
        .eq('id', currentRegId)
      if (err) throw new Error(err.message)

      setPhotoUrls(nextUrls)
    } catch (e) {
      setPhotoError(e?.message || 'Photo upload failed')
    } finally {
      setUploadingPhoto(false)
    }
  }

  async function handleDeletePhoto(src) {
    if (deletingPhoto) return
    setDeletingPhoto(true)
    const nextUrls = photoUrls.filter((u) => u !== src)
    const { error: err } = await supabase
      .from('registrations')
      .update({ photo_urls: nextUrls })
      .eq('id', currentRegId)
    setDeletingPhoto(false)
    if (err) { setPhotoError(err.message); return }
    setPhotoUrls(nextUrls)
    setSpotlightSrc(null)
  }

  async function handleDelete() {
    setDeleting(true)
    setDeleteError(null)
    const { error: err } = await supabase.from('registrations').delete().eq('id', currentRegId)
    setDeleting(false)
    if (err) {
      setDeleteError(err.message)
    } else {
      onChanged?.()
      onBack()
    }
  }

  if (loading && !reg) {
    return (
      <div className="page">
        <p className="state-message">Loading…</p>
      </div>
    )
  }

  if (error) {
    return (
      <div className="page">
        <button className="top-bar__back" style={{ padding: '1rem' }} onClick={onBack}>
          ‹ Back
        </button>
        <p className="state-message state-message--error">{error}</p>
      </div>
    )
  }

  if (!reg) return null

  const templateUrl = reg.aircraft_types?.template_url ?? null
  const typeLabel = reg.aircraft_types?.name ?? reg.registration
  const photoSlides = [...photoUrls].reverse()
  const slides = templateUrl ? [...photoSlides, templateUrl] : [...photoSlides]

  return (
    <>
      <div className="page reg-profile-page">
        <RegTopBar reg={reg} onBack={onBack} onEdit={() => setShowEdit(true)} />
        {slides.length === 0 ? (
          <GalleryPlaceholder />
        ) : (
          <PhotoGallery slides={slides} onSlideClick={(src) => setSpotlightSrc(src)} />
        )}
        <main className="content reg-info-area" style={{ opacity: loading ? 0.6 : 1 }}>
          <div className="section-label-row">
            <p className="section-label">
              {airline?.name ?? ''}
            </p>
            <div className="camera-flag-area">
              <span className="camera-flag__count">
                {uploadingPhoto ? 'Uploading…' : photoLimitNote ? '5 of 5 photos' : `${photoUrls.length}/5`}
              </span>
              <button
                type="button"
                className="camera-flag-btn"
                onClick={handleCameraTap}
                disabled={uploadingPhoto}
                aria-label="Tap to flag, double-tap to upload a photo"
              >
                <img
                  src={flagged ? cameraIcon : cameraOffIcon}
                  alt=""
                  aria-hidden="true"
                  className="camera-flag__img"
                />
              </button>
              <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                className="camera-flag__file-input"
                onChange={(e) => {
                  const file = e.target.files[0] ?? null
                  e.target.value = ''
                  if (file) handleUploadPhoto(file)
                }}
              />
            </div>
          </div>
          {photoError && <p className="form-error" style={{ marginTop: '0.5rem' }}>{photoError}</p>}
          <InfoSection reg={reg} lastSighting={lastSighting} sightingCount={sightingCount} isRetiredType={isRetiredType} />
          {deleteError && <p className="form-error" style={{ marginTop: '1rem' }}>{deleteError}</p>}
          <button
            className="btn-delete-reg"
            onClick={() => setShowDeleteConfirm(true)}
          >
            Delete registration
          </button>
        </main>

        <button
          className="reg-nav reg-nav--prev"
          onClick={goPrev}
          disabled={!hasPrev || loading}
          style={{ visibility: hasPrev ? 'visible' : 'hidden' }}
          aria-label="Previous registration"
        >
          <img src="/arrow-takeoff-prev.PNG" alt="" />
        </button>
        <button
          className="reg-nav reg-nav--next"
          onClick={goNext}
          disabled={!hasNext || loading}
          style={{ visibility: hasNext ? 'visible' : 'hidden' }}
          aria-label="Next registration"
        >
          <img src="/arrow-takeoff-next.PNG" alt="" />
        </button>
      </div>

      {showEdit && (
        <NewRegistrationForm
          existingReg={reg}
          initialAirline={airline}
          onClose={() => setShowEdit(false)}
          onSaved={() => {
            setReloadKey((k) => k + 1)
            onChanged?.()
          }}
        />
      )}

      {showDeleteConfirm && (
        <DeleteConfirmSheet
          regId={currentRegId}
          onConfirm={handleDelete}
          onCancel={() => setShowDeleteConfirm(false)}
          deleting={deleting}
        />
      )}

      {spotlightSrc && (
        <ImageSpotlightOverlay
          src={spotlightSrc}
          alt={typeLabel}
          onClose={() => setSpotlightSrc(null)}
          onDelete={spotlightSrc !== templateUrl ? () => handleDeletePhoto(spotlightSrc) : undefined}
          deleting={deletingPhoto}
        />
      )}

      {showFlagConfirm && (
        <ActionConfirmSheet
          message="Flag this registration?"
          confirmLabel="Confirm"
          busyLabel="Saving…"
          busy={flagBusy}
          onConfirm={handleConfirmFlag}
          onCancel={() => setShowFlagConfirm(false)}
        />
      )}

      {showUploadConfirm && (
        <ActionConfirmSheet
          message="Upload a picture?"
          confirmLabel="Confirm"
          onConfirm={handleConfirmUpload}
          onCancel={() => setShowUploadConfirm(false)}
        />
      )}
    </>
  )
}
