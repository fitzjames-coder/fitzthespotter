import { useEffect, useRef, useState } from 'react'
import { supabase } from './lib/supabaseClient'
import { writeQueueAdd, writeQueueCount } from './lib/writeQueue'
import { offlineSearchAirlines, offlineSearchManufacturers, offlineSearchTypes, offlineAirportExists } from './lib/offlineData'
import TypeaheadPicker from './TypeaheadPicker'
import AirlineForm from './AirlineForm'
import CopyButton from './CopyButton'
import AirportForm from './AirportForm'
import ManufacturerForm from './ManufacturerForm'
import TypeForm from './TypeForm'
import { AllianceBadge } from './StatusMarks'
import TimeBlockPicker from './TimeBlockPicker'
import markSpecialLiveryAsset from './assets/marks/mark-special-livery.png'
import markRetroAsset from './assets/marks/mark-retro.png'
import markOldLiveryAsset from './assets/marks/mark-old-livery.png'
import markFlownInAsset from './assets/marks/mark-flown-in.png'

function AirportTagsInput({ codes, onChange, onCommitCode, onMaxReached, max }) {
  const [draft, setDraft] = useState('')
  const inputRef = useRef(null)

  function commit() {
    const token = draft.trim().toUpperCase()
    if (max && codes.length >= max) {
      if (token) onMaxReached?.()
      setDraft('')
      return
    }
    if (token && !codes.includes(token)) {
      onChange([...codes, token])
      onCommitCode?.(token)
    }
    setDraft('')
  }

  function handleKeyDown(e) {
    if (e.key === ' ' || e.key === ',' || e.key === 'Enter') {
      e.preventDefault()
      commit()
    } else if (e.key === 'Backspace' && draft === '' && codes.length > 0) {
      onChange(codes.slice(0, -1))
    }
  }

  const inputHidden = max != null && codes.length >= max

  return (
    <div className="airport-tags-input" onClick={() => inputRef.current?.focus()}>
      {codes.map((code) => (
        <span key={code} className="airport-tag">
          {code}
          <button
            type="button"
            className="airport-tag__remove"
            onClick={(e) => { e.stopPropagation(); onChange(codes.filter((c) => c !== code)) }}
            aria-label={`Remove ${code}`}
          >
            ×
          </button>
        </span>
      ))}
      {!inputHidden && (
        <input
          ref={inputRef}
          type="text"
          value={draft}
          onChange={(e) => setDraft(e.target.value.replace(/[\s,]/g, ''))}
          onKeyDown={handleKeyDown}
          onBlur={commit}
          placeholder={codes.length === 0 ? 'EGLL LHR …' : ''}
          maxLength={6}
          aria-label="Add airport code"
        />
      )}
    </div>
  )
}

function StatusSwitch({ label, checked, onChange, markEl }) {
  return (
    <div className="status-switch">
      <span className="status-switch__left">
        {markEl}
        <span className="status-switch__label">{label}</span>
      </span>
      <button
        type="button"
        role="switch"
        aria-checked={checked}
        className={`status-toggle${checked ? ' status-toggle--on' : ''}`}
        onClick={() => onChange(!checked)}
      >
        <span className="status-toggle__knob" />
      </button>
    </div>
  )
}

const ALLIANCES = ['Star Alliance', 'Oneworld', 'SkyTeam']

const BOOK_CANDIDATES_PER_MONTH = 10

function monthBucket(spottedOn) {
  return spottedOn ? spottedOn.slice(0, 7) : 'undated'
}

async function fetchAirlines(q) {
  if (typeof navigator !== 'undefined' && navigator.onLine === false) return offlineSearchAirlines(q)
  if (!supabase) return []
  const { data } = await supabase
    .from('airlines')
    .select('id, name')
    .ilike('name', `%${q}%`)
    .order('name')
    .limit(8)
  return (data ?? []).map((a) => ({ id: a.id, label: a.name }))
}

async function fetchManufacturers(q) {
  if (typeof navigator !== 'undefined' && navigator.onLine === false) return offlineSearchManufacturers(q)
  if (!supabase) return []
  const { data } = await supabase
    .from('manufacturers')
    .select('id, name')
    .ilike('name', `%${q}%`)
    .order('name')
    .limit(8)
  return (data ?? []).map((m) => ({ id: m.id, label: m.name }))
}

function makeFetchTypes(manufacturerId) {
  return async function (q) {
    if (typeof navigator !== 'undefined' && navigator.onLine === false) return offlineSearchTypes(q, manufacturerId)
    if (!supabase) return []
    let qb = supabase
      .from('aircraft_types')
      .select('id, name')
      .ilike('name', `%${q}%`)
      .order('name')
      .limit(8)
    if (manufacturerId) qb = qb.eq('manufacturer_id', manufacturerId)
    const { data } = await qb
    return (data ?? []).map((t) => ({ id: t.id, label: t.name }))
  }
}

function buildDateToInput(d) {
  if (!d) return ''
  const parts = d.split('-')
  if (parts.length < 2) return ''
  return `${parts[1]}${parts[0]}`
}

function inputToBuildDate(v) {
  const digits = (v || '').replace(/\D/g, '')
  if (digits.length !== 6) return null
  const mm = digits.slice(0, 2)
  const yyyy = digits.slice(2)
  const m = parseInt(mm, 10)
  const y = parseInt(yyyy, 10)
  if (m < 0 || m > 12) return null
  if (y < 1900 || y > 2100) return null
  const monthForDate = m === 0 ? '01' : mm
  return `${yyyy}-${monthForDate}-01`
}

function dateToDDMMYYYY(iso) {
  if (!iso) return ''
  const [yyyy, mm, dd] = iso.split('-')
  if (!yyyy || !mm || !dd) return ''
  return `${dd}${mm}${yyyy}`
}

function ddmmyyyyToISO(digits) {
  if (!digits || digits.length !== 8) return null
  const dd = digits.slice(0, 2)
  const mm = digits.slice(2, 4)
  const yyyy = digits.slice(4)
  const d = parseInt(dd, 10)
  const m = parseInt(mm, 10)
  const y = parseInt(yyyy, 10)
  if (m < 1 || m > 12 || d < 1 || d > 31 || y < 1900 || y > 2100) return null
  const date = new Date(Date.UTC(y, m - 1, d))
  if (date.getUTCFullYear() !== y || date.getUTCMonth() !== m - 1 || date.getUTCDate() !== d) return null
  return `${yyyy}-${mm}-${dd}`
}

function DateFastField({ id, value, onChange }) {
  const [text, setText] = useState(() => dateToDDMMYYYY(value))
  useEffect(() => {
    setText(dateToDDMMYYYY(value))
  }, [value])
  function handleText(e) {
    const raw = e.target.value.replace(/\D/g, '').slice(0, 8)
    setText(raw)
    if (raw.length === 8) {
      const iso = ddmmyyyyToISO(raw)
      if (iso) onChange(iso)
    }
  }
  return (
    <div className="date-fast">
      <input
        className="date-fast__text form-input"
        type="text"
        inputMode="numeric"
        placeholder="DDMMYYYY"
        maxLength={8}
        value={text}
        onChange={handleText}
        aria-label="Date (DDMMYYYY)"
      />
      <input
        id={id}
        className="date-fast__picker form-input"
        type="date"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        aria-label="Date picker"
      />
    </div>
  )
}

export default function NewRegistrationForm({ onClose, onSaved, existingReg, initialAirline }) {
  const isEdit = Boolean(existingReg)
  const s = existingReg?.statuses ?? {}

  const origLivery = useRef({
    wasSpecial: Boolean(s.special_livery),
    wasRetro: Boolean(s.retro),
    wasAlliance: Boolean(s.alliance),
    liveryName: s.livery_name ?? '',
    allianceName: s.alliance_name ?? '',
  })

  const [regNumber, setRegNumber] = useState(existingReg?.registration ?? '')
  const [airline, setAirline] = useState(
    initialAirline ? { id: initialAirline.id, label: initialAirline.name } : null
  )
  const [manufacturer, setManufacturer] = useState(() => {
    const mfr = existingReg?.aircraft_types?.manufacturers
    return mfr ? { id: mfr.id, label: mfr.name } : null
  })
  const [type, setType] = useState(() => {
    const at = existingReg?.aircraft_types
    return at ? { id: at.id, label: at.name } : null
  })
  const [firstSpotted, setFirstSpotted] = useState(existingReg?.first_spotted ?? '')
  const [firstTimeBlock, setFirstTimeBlock] = useState('')
  const [firstSouthern, setFirstSouthern] = useState(false)
  const [airports, setAirports] = useState(
    Array.isArray(existingReg?.airports) ? existingReg.airports : []
  )
  const [statusSpecialLivery, setStatusSpecialLivery] = useState(Boolean(s.special_livery))
  const [statusRetro, setStatusRetro] = useState(Boolean(s.retro))
  const [statusOldLivery, setStatusOldLivery] = useState(Boolean(s.old_livery))
  const [liveryName, setLiveryName] = useState(s.livery_name ?? '')
  const [statusAlliance, setStatusAlliance] = useState(Boolean(s.alliance))
  const [allianceName, setAllianceName] = useState(s.alliance_name ?? '')
  const [statusFlownIn, setStatusFlownIn] = useState(Boolean(s.flown_in))
  const [statusRs, setStatusRs] = useState(Boolean(s.rs))
  const [flownInDate, setFlownInDate] = useState(s.flown_in_date ?? '')
  const [remark, setRemark] = useState(existingReg?.remark ?? '')
  const [msn, setMsn] = useState(existingReg?.msn ?? '')
  const [buildDate, setBuildDate] = useState(() => buildDateToInput(existingReg?.build_date))
  const [saving, setSaving] = useState(false)
  const [saveError, setSaveError] = useState(null)
  const [existingMatch, setExistingMatch] = useState(null)
  const [overrideOn, setOverrideOn] = useState(false)
  const [overrideChoice, setOverrideChoice] = useState(null)
  const dupTimerRef = useRef(null)

  const [sightingOpen, setSightingOpen] = useState(false)
  const [editingSightingId, setEditingSightingId] = useState(null)
  const [sightingDate, setSightingDate] = useState('')
  const [sightingAirport, setSightingAirport] = useState('')
  const [sightingAirportKnown, setSightingAirportKnown] = useState(false)
  const [sightingTimeBlock, setSightingTimeBlock] = useState('')
  const [sightingSouthern, setSightingSouthern] = useState(false)
  const [sightingSaving, setSightingSaving] = useState(false)

  const [sightingsMgrOpen, setSightingsMgrOpen] = useState(false)
  const [sightingsFetched, setSightingsFetched] = useState(false)
  const [sightings, setSightings] = useState([])
  const [sightingsLoading, setSightingsLoading] = useState(false)
  const [sightingsMgrError, setSightingsMgrError] = useState(null)
  const [savingDateId, setSavingDateId] = useState(null)
  const [confirmDeleteSightingId, setConfirmDeleteSightingId] = useState(null)
  const [deletingSightingId, setDeletingSightingId] = useState(null)
  const [savingBookCandidateId, setSavingBookCandidateId] = useState(null)
  const [capMessageSightingId, setCapMessageSightingId] = useState(null)

  const [airlineFormOpen, setAirlineFormOpen] = useState(false)
  const [airlineFormName, setAirlineFormName] = useState('')
  const [mfrFormOpen, setMfrFormOpen] = useState(false)
  const [mfrFormName, setMfrFormName] = useState('')
  const [typeFormOpen, setTypeFormOpen] = useState(false)
  const [typeFormName, setTypeFormName] = useState('')
  const [airportFormCode, setAirportFormCode] = useState(null)
  const [showAirportHint, setShowAirportHint] = useState(false)
  const airportHintTimer = useRef(null)

  useEffect(() => () => clearTimeout(airportHintTimer.current), [])

  const showLiveryName = statusSpecialLivery || statusRetro
  const overrideReady =
    overrideOn &&
    Boolean(overrideChoice) &&
    !(overrideChoice === 'same' && !existingMatch?.msn)

  function toggleOverride(next) {
    setOverrideOn(next)
    if (next) {
      setStatusSpecialLivery(false)
      setStatusRetro(false)
      setStatusOldLivery(false)
      setStatusAlliance(false)
      setLiveryName('')
      setAllianceName('')
      setStatusFlownIn(false)
      setFlownInDate('')
      setRemark('')
      origLivery.current = { wasSpecial: false, wasRetro: false, wasAlliance: false, liveryName: '', allianceName: '' }
    } else {
      setOverrideChoice(null)
    }
  }

  async function checkAirportExists(code) {
    if (typeof navigator !== 'undefined' && navigator.onLine === false) return offlineAirportExists(code)
    if (!supabase) return true
    const { data } = await supabase
      .from('airports')
      .select('iata')
      .eq('iata', code)
      .maybeSingle()
    return Boolean(data)
  }

  async function ensureAirport(code) {
    if (!code) return
    const exists = await checkAirportExists(code)
    if (!exists) setAirportFormCode(code)
  }

  async function ensureAirportForSighting(code) {
    if (!code) { setSightingAirportKnown(false); return }
    const exists = await checkAirportExists(code)
    setSightingAirportKnown(exists)
    if (!exists) setAirportFormCode(code)
  }

  useEffect(() => {
    if (isEdit) return
    const trimmed = regNumber.trim().toUpperCase()
    clearTimeout(dupTimerRef.current)
    if (!trimmed) { setExistingMatch(null); setOverrideOn(false); setOverrideChoice(null); return }
    dupTimerRef.current = setTimeout(async () => {
      if (!supabase) return
      const { data } = await supabase
        .from('registrations')
        .select('id, registration, statuses, remark, msn, airline_id, airlines ( name )')
        .eq('registration', trimmed)
        .maybeSingle()
      setExistingMatch(data ?? null)
      if (!data) { setOverrideOn(false); setOverrideChoice(null) }
      if (data) {
        const ms = data.statuses ?? {}
        setStatusSpecialLivery(Boolean(ms.special_livery))
        setStatusRetro(Boolean(ms.retro))
        setStatusAlliance(Boolean(ms.alliance))
        setLiveryName(ms.livery_name ?? '')
        setAllianceName(ms.alliance_name ?? '')
        setRemark(data.remark ?? '')
        origLivery.current = {
          wasSpecial: Boolean(ms.special_livery),
          wasRetro: Boolean(ms.retro),
          wasAlliance: Boolean(ms.alliance),
          liveryName: ms.livery_name ?? '',
          allianceName: ms.alliance_name ?? '',
        }
      } else {
        setStatusSpecialLivery(false)
        setStatusRetro(false)
        setStatusAlliance(false)
        setLiveryName('')
        setAllianceName('')
        setRemark('')
        setSightingOpen(false)
        origLivery.current = { wasSpecial: false, wasRetro: false, wasAlliance: false, liveryName: '', allianceName: '' }
      }
    }, 400)
    return () => clearTimeout(dupTimerRef.current)
  }, [regNumber])

  function handleManufacturerSelect(mfr) {
    setManufacturer(mfr)
    setType(null)
  }

  async function fetchSightings() {
    if (!supabase) return
    setSightingsLoading(true)
    setSightingsMgrError(null)
    const { data, error: err } = await supabase
      .from('sightings')
      .select('id, spotted_on, airport, is_book_candidate, book_story, time_block, southern_hemisphere, special_livery, retro, livery_name, alliance')
      .eq('registration_id', existingReg.id)
      .order('spotted_on', { ascending: true, nullsFirst: false })
    setSightingsLoading(false)
    setSightingsFetched(true)
    if (err) { setSightingsMgrError(err.message); return }
    setSightings(data ?? [])
  }

  function handleToggleSightingsMgr() {
    if (!sightingsMgrOpen && !sightingsFetched) {
      fetchSightings()
    }
    setSightingsMgrOpen((o) => !o)
  }

  async function handleSightingDateChange(sightingId, value) {
    if (savingDateId) return
    setSavingDateId(sightingId)
    setSightingsMgrError(null)
    const { error: err } = await supabase
      .from('sightings')
      .update({ spotted_on: value || null })
      .eq('id', sightingId)
    setSavingDateId(null)
    if (err) { setSightingsMgrError(err.message); return }
    setSightings((prev) =>
      prev.map((s) => s.id === sightingId ? { ...s, spotted_on: value || null } : s)
    )
    onSaved?.()
  }

  async function handleToggleBookCandidate(sightingId, current) {
    const next = !current

    if (next) {
      const thisSighting = sightings.find((s) => s.id === sightingId)
      const bucket = monthBucket(thisSighting?.spotted_on ?? null)

      const { data: existing } = await supabase
        .from('sightings')
        .select('id, spotted_on')
        .eq('is_book_candidate', true)

      const countInBucket = (existing ?? []).filter(
        (r) => monthBucket(r.spotted_on) === bucket
      ).length

      if (countInBucket >= BOOK_CANDIDATES_PER_MONTH) {
        setCapMessageSightingId(sightingId)
        return
      }
    }

    setCapMessageSightingId(null)
    setSavingBookCandidateId(sightingId)
    const { error: err } = await supabase
      .from('sightings')
      .update({ is_book_candidate: next })
      .eq('id', sightingId)
    if (!err) {
      setSightings((prev) =>
        prev.map((s) => s.id === sightingId ? { ...s, is_book_candidate: next } : s)
      )
    }
    setSavingBookCandidateId(null)
  }

  async function handleDeleteSighting(sightingId) {
    if (deletingSightingId) return
    setDeletingSightingId(sightingId)
    setSightingsMgrError(null)
    const { error: err } = await supabase
      .from('sightings')
      .delete()
      .eq('id', sightingId)
    setDeletingSightingId(null)
    if (err) { setSightingsMgrError(err.message); return }
    setSightings((prev) => prev.filter((s) => s.id !== sightingId))
    setConfirmDeleteSightingId(null)
    onSaved?.()
  }

  async function handleSave() {
    if (!supabase) { setSaveError('Supabase is not configured.'); return }
    const trimmed = regNumber.trim().toUpperCase()
    if (!trimmed) { setSaveError('Registration number is required.'); return }
    if (!airline) { setSaveError('Select or add an airline.'); return }
    if (!isEdit && existingMatch && !overrideReady) { setSaveError('This registration already exists.'); return }
    if (overrideReady && !type) { setSaveError('Select the aircraft manufacturer and type for the new airline.'); return }
    if (buildDate && !inputToBuildDate(buildDate)) { setSaveError('Build date must be MMYYYY, e.g. 112025 for Nov 2025.'); return }

    setSaving(true)
    setSaveError(null)

    const sinceLines = []
    if (!isEdit && firstSpotted) {
      if (statusSpecialLivery)
        sinceLines.push(`Special livery${liveryName.trim() ? ' — ' + liveryName.trim() : ''} since ${firstSpotted}`)
      if (statusRetro)
        sinceLines.push(`Retro livery${liveryName.trim() ? ' — ' + liveryName.trim() : ''} since ${firstSpotted}`)
      if (statusAlliance)
        sinceLines.push(`${allianceName ? allianceName + ' alliance' : 'Alliance'} livery since ${firstSpotted}`)
    }
    const finalRemark = [remark.trim(), ...sinceLines].filter(Boolean).join('\n')

    const statuses = {}
    if (statusRs) statuses.rs = true
    if (statusSpecialLivery) statuses.special_livery = true
    if (statusRetro) statuses.retro = true
    if (statusOldLivery) statuses.old_livery = true
    if (showLiveryName && liveryName.trim()) statuses.livery_name = liveryName.trim()
    if (statusAlliance) {
      statuses.alliance = true
      if (allianceName) statuses.alliance_name = allianceName
    }
    if (finalRemark) statuses.remarks = true
    if (statusFlownIn) {
      statuses.flown_in = true
      if (flownInDate) statuses.flown_in_date = flownInDate
    }

    const payload = {
      registration: trimmed,
      airline_id: airline?.id ?? null,
      aircraft_type_id: type?.id ?? null,
      msn: (overrideReady && overrideChoice === 'same') ? existingMatch.msn : (msn.trim() || null),
      build_date: inputToBuildDate(buildDate),
      remark: finalRemark || null,
      statuses: Object.keys(statuses).length > 0 ? statuses : null,
    }

    if (typeof navigator !== 'undefined' && navigator.onLine === false) {
      if (isEdit) {
        setSaving(false)
        setSaveError('Editing an existing registration needs a connection. New registrations can be saved to the offline queue.')
        return
      }
      const entry = {
        id: 'q_' + Date.now() + '_' + Math.random().toString(36).slice(2),
        kind: 'new_registration',
        created_at: new Date().toISOString(),
        registration: trimmed,
        payload,
        sighting: {
          airports: airports.length > 0 ? airports : [null],
          spotted_on: firstSpotted || null,
          time_block: firstTimeBlock || null,
          southern_hemisphere: firstSouthern,
          special_livery: statusSpecialLivery,
          retro: statusRetro,
          alliance: statusAlliance,
          livery_name: (showLiveryName && liveryName.trim()) ? liveryName.trim() : null,
        },
        flown_in: statusFlownIn,
        airline_id: airline?.id ?? null,
      }
      try {
        await writeQueueAdd(entry)
        const n = await writeQueueCount()
        setSaving(false)
        window.alert('Saved to your offline queue — it will sync when you are back online.\n\nPending entries: ' + n)
        onClose()
      } catch (e) {
        setSaving(false)
        setSaveError('Could not save to the offline queue: ' + (e && e.message ? e.message : 'unknown error'))
      }
      return
    }

    if (isEdit) {
      if (statusFlownIn && airline?.id) {
        await supabase.from('airlines').update({ flown_in: true }).eq('id', airline.id)
      }
      const { error: err } = await supabase
        .from('registrations')
        .update(payload)
        .eq('id', existingReg.id)
      setSaving(false)
      if (err) { setSaveError(err.message) } else { onSaved?.(); onClose() }
      return
    }

    const { data: newReg, error: regErr } = await supabase
      .from('registrations')
      .insert(payload)
      .select('id')
      .single()

    if (regErr) {
      setSaving(false)
      setSaveError(regErr.message)
      return
    }

    const codes = airports.length > 0 ? airports : [null]
    const sightingRows = codes.map((code) => ({
      registration_id: newReg.id,
      spotted_on: firstSpotted || null,
      time_block: firstTimeBlock || null,
      southern_hemisphere: firstSouthern,
      airport: code,
      special_livery: statusSpecialLivery,
      retro: statusRetro,
      alliance: statusAlliance,
      livery_name: (showLiveryName && liveryName.trim()) ? liveryName.trim() : null,
    }))

    const { error: sErr } = await supabase.from('sightings').insert(sightingRows)
    setSaving(false)
    if (sErr) {
      setSaveError(sErr.message)
    } else {
      if (statusFlownIn && airline?.id) {
        await supabase.from('airlines').update({ flown_in: true }).eq('id', airline.id)
      }
      onSaved?.()
      onClose()
    }
  }

  function beginEditSighting(s) {
    setEditingSightingId(s.id)
    setSightingDate(s.spotted_on ?? '')
    setSightingTimeBlock(s.time_block ?? '')
    setSightingSouthern(Boolean(s.southern_hemisphere))
    setSightingAirport(s.airport ?? '')
    setSightingAirportKnown(Boolean(s.airport))
    setStatusSpecialLivery(Boolean(s.special_livery))
    setStatusRetro(Boolean(s.retro))
    setStatusAlliance(Boolean(s.alliance))
    setLiveryName(s.livery_name ?? '')
    setSightingOpen(true)
    if (typeof window !== 'undefined') window.scrollTo({ top: 0, behavior: 'smooth' })
  }

  function startNewSighting() {
    setEditingSightingId(null)
    setSightingDate('')
    setSightingTimeBlock('')
    setSightingSouthern(false)
    setSightingAirport('')
    setSightingAirportKnown(false)
    setSightingOpen((o) => !o)
  }

  async function handleLogSighting() {
    if (!supabase) { setSaveError('Supabase is not configured.'); return }
    const targetId = existingReg?.id ?? existingMatch?.id
    if (!targetId) { setSaveError('No registration to log sighting against.'); return }
    setSightingSaving(true)
    setSaveError(null)

    const effectiveDate = sightingDate || new Date().toISOString().slice(0, 10)

    const lines = []
    if (origLivery.current.wasSpecial && !statusSpecialLivery)
      lines.push(`Used to wear ${origLivery.current.liveryName || 'special livery'} until ${effectiveDate}`)
    if (origLivery.current.wasRetro && !statusRetro)
      lines.push(`Used to wear ${origLivery.current.liveryName || 'retro livery'} until ${effectiveDate}`)
    if (origLivery.current.wasAlliance && !statusAlliance)
      lines.push(`Used to wear ${origLivery.current.allianceName ? origLivery.current.allianceName + ' alliance livery' : 'alliance livery'} until ${effectiveDate}`)
    if (!origLivery.current.wasSpecial && statusSpecialLivery)
      lines.push(`Special livery${liveryName.trim() ? ' — ' + liveryName.trim() : ''} since ${effectiveDate}`)
    if (!origLivery.current.wasRetro && statusRetro)
      lines.push(`Retro livery${liveryName.trim() ? ' — ' + liveryName.trim() : ''} since ${effectiveDate}`)
    if (!origLivery.current.wasAlliance && statusAlliance)
      lines.push(`${allianceName ? allianceName + ' alliance' : 'Alliance'} livery since ${effectiveDate}`)

    const newRemark = [remark.trim(), ...lines].filter(Boolean).join('\n')
    setRemark(newRemark)

    const statuses = {}
    if (statusRs) statuses.rs = true
    if (statusSpecialLivery) statuses.special_livery = true
    if (statusRetro) statuses.retro = true
    if (statusOldLivery) statuses.old_livery = true
    if (showLiveryName && liveryName.trim()) statuses.livery_name = liveryName.trim()
    if (statusAlliance) {
      statuses.alliance = true
      if (allianceName) statuses.alliance_name = allianceName
    }
    if (newRemark.trim()) statuses.remarks = true
    if (statusFlownIn) {
      statuses.flown_in = true
      if (flownInDate) statuses.flown_in_date = flownInDate
    }

    const { error: regErr } = await supabase
      .from('registrations')
      .update({
        airline_id: airline?.id ?? null,
        aircraft_type_id: type?.id ?? null,
        msn: msn.trim() || null,
        build_date: inputToBuildDate(buildDate),
        remark: newRemark.trim() || null,
        statuses: Object.keys(statuses).length > 0 ? statuses : null,
      })
      .eq('id', targetId)

    if (regErr) {
      setSightingSaving(false)
      setSaveError(regErr.message)
      return
    }

    const sightingPayload = {
      spotted_on: sightingDate || null,
      time_block: sightingTimeBlock || null,
      southern_hemisphere: sightingSouthern,
      airport: sightingAirport.trim().toUpperCase() || null,
      special_livery: statusSpecialLivery,
      retro: statusRetro,
      alliance: statusAlliance,
      livery_name: (showLiveryName && liveryName.trim()) ? liveryName.trim() : null,
    }
    const { error: sErr } = editingSightingId
      ? await supabase.from('sightings').update(sightingPayload).eq('id', editingSightingId)
      : await supabase.from('sightings').insert({ registration_id: targetId, ...sightingPayload })

    setSightingSaving(false)
    if (sErr) {
      setSaveError(sErr.message)
    } else {
      if (statusFlownIn && airline?.id) {
        await supabase.from('airlines').update({ flown_in: true }).eq('id', airline.id)
      }
      setEditingSightingId(null)
      onSaved?.()
      onClose()
    }
  }

  if (airlineFormOpen) {
    return (
      <AirlineForm
        initialName={airlineFormName}
        onCancel={() => setAirlineFormOpen(false)}
        onCreated={(a) => {
          setAirline({ id: a.id, label: a.name })
          setAirlineFormOpen(false)
        }}
      />
    )
  }

  if (mfrFormOpen) {
    return (
      <ManufacturerForm
        initialName={mfrFormName}
        onCancel={() => setMfrFormOpen(false)}
        onCreated={(m) => {
          handleManufacturerSelect({ id: m.id, label: m.name })
          setMfrFormOpen(false)
        }}
      />
    )
  }

  if (typeFormOpen) {
    return (
      <TypeForm
        initialName={typeFormName}
        manufacturer={manufacturer}
        onCancel={() => setTypeFormOpen(false)}
        onCreated={(t) => {
          setType({ id: t.id, label: t.name })
          setTypeFormOpen(false)
        }}
      />
    )
  }

  if (airportFormCode !== null) {
    return (
      <AirportForm
        initialCode={airportFormCode}
        onCancel={() => setAirportFormCode(null)}
        onCreated={(ap) => {
          if (ap?.iata === sightingAirport) setSightingAirportKnown(true)
          setAirportFormCode(null)
        }}
      />
    )
  }

  return (
    <div className="entry-modal-backdrop" onClick={onClose}>
      <div className="entry-modal" onClick={(e) => e.stopPropagation()}>
        <div className="form-header">
          <h2 className="form-title">{isEdit ? 'Edit Registration' : 'New Registration'}</h2>
          <button type="button" className="form-close" onClick={onClose} aria-label="Close form">
            ×
          </button>
        </div>

        <div className="form-body">
          <div className="form-section">
            <div className="form-section__label-row">
              <p className="form-section__label">Registration</p>
              <button
                type="button"
                className="radar-link"
                disabled={!regNumber.trim()}
                aria-label="Look up this registration on a flight tracker (opens in a new tab)"
                title="Look up this registration on a flight tracker (opens in a new tab)"
                onClick={() => {
                  const tail = regNumber.trim().toLowerCase()
                  window.open(`https://www.flightradar24.com/data/aircraft/${tail}`, '_blank', 'noopener')
                }}
              >
                <img src="/mark-radar.png" alt="" />
              </button>
            </div>
            <div className="form-group">
              <div className="form-label-row">
                <label className="form-label" htmlFor="reg-number-input">Reg number *</label>
                <CopyButton value={regNumber} label="Copy registration" />
              </div>
              <input
                id="reg-number-input"
                className="form-input form-input--mono"
                type="text"
                value={regNumber}
                onChange={(e) => setRegNumber(e.target.value.toUpperCase())}
                placeholder="G-BOAC"
                autoCapitalize="characters"
                autoComplete="off"
                maxLength={10}
              />
            </div>
            <div className="form-group">
              <div className="form-label-row">
                <label className="form-label" htmlFor="msn-input">MSN (serial number)</label>
                <CopyButton value={msn} label="Copy MSN" />
              </div>
              <input
                id="msn-input"
                className="form-input form-input--mono"
                type="text"
                value={msn}
                onChange={(e) => setMsn(e.target.value.toUpperCase())}
                placeholder="Optional — e.g. 29984"
                autoComplete="off"
                maxLength={20}
              />
            </div>
            <div className="form-group">
              <label className="form-label" htmlFor="build-date-input">Built (month &amp; year)</label>
              <input
                id="build-date-input"
                className="form-input form-input--mono"
                type="text"
                inputMode="numeric"
                value={buildDate}
                onChange={(e) => setBuildDate(e.target.value.replace(/\D/g, '').slice(0, 6))}
                placeholder="Optional — e.g. 112025"
                autoComplete="off"
                maxLength={6}
              />
              <p className="form-hint">Format MMYYYY — e.g. 112025 = Nov 2025. Use 00 for the month if unknown (002015 = 2015 only).</p>
            </div>
            {!isEdit && existingMatch && (
              <div className="reg-override">
                <p className="reg-exists-banner">
                  Already exists under {existingMatch.airlines?.name ?? 'another airline'} (MSN {existingMatch.msn || '—'}).
                </p>
                <StatusSwitch
                  label="Override — log this tail under a different airline"
                  checked={overrideOn}
                  onChange={toggleOverride}
                />
                {overrideOn && (
                  <div className="reg-override__choices">
                    <button
                      type="button"
                      className={`reg-override__choice${overrideChoice === 'same' ? ' is-on' : ''}`}
                      onClick={() => setOverrideChoice('same')}
                    >
                      Same airframe, different airline
                    </button>
                    <button
                      type="button"
                      className={`reg-override__choice${overrideChoice === 'reused' ? ' is-on' : ''}`}
                      onClick={() => setOverrideChoice('reused')}
                    >
                      Different airframe, reused tail
                    </button>
                    {overrideChoice === 'same' && !existingMatch.msn && (
                      <p className="reg-override__warn">
                        The original record has no MSN. Add the MSN to the original registration first, then come back and try again.
                      </p>
                    )}
                    {overrideChoice === 'same' && existingMatch.msn && (
                      <p className="reg-override__note">
                        Links to the same airframe via MSN {existingMatch.msn}. Set the new airline, manufacturer and type below.
                      </p>
                    )}
                    {overrideChoice === 'reused' && (
                      <p className="reg-override__note">
                        Creates a separate airframe. Set the new airline, manufacturer, type — and MSN if known — below.
                      </p>
                    )}
                  </div>
                )}
              </div>
            )}
            <div className="form-group">
              <div className="form-label-row">
                <label className="form-label">Airline *</label>
                <CopyButton value={airline?.label} label="Copy airline" />
              </div>
              <TypeaheadPicker
                placeholder="Search airlines…"
                value={airline}
                onSelect={setAirline}
                fetchOptions={fetchAirlines}
                onAddNew={(q) => { setAirlineFormName(q); setAirlineFormOpen(true) }}
                addNewLabel="Add new airline"
              />
            </div>
          </div>

          {(isEdit || (existingMatch && !overrideOn)) && (
            <div className="new-sighting-panel">
              <button
                type="button"
                className="new-sighting-toggle"
                onClick={startNewSighting}
                aria-expanded={sightingOpen}
              >
                <span className="new-sighting-toggle__icon" aria-hidden="true">
                  {sightingOpen ? '▾' : '+'}
                </span>
                {editingSightingId ? 'Editing sighting' : 'New Sighting'}
              </button>
              {sightingOpen && (
                <div className="new-sighting-body">
                  <div className="form-group">
                    <label className="form-label" htmlFor="sighting-date-input">Date</label>
                    <DateFastField id="sighting-date-input" value={sightingDate} onChange={setSightingDate} />
                  </div>
                  <div className="form-group">
                    <label className="form-label">Time of day</label>
                    <TimeBlockPicker value={sightingTimeBlock} onChange={setSightingTimeBlock} />
                    <label className="timeblock-hemi">
                      <input
                        type="checkbox"
                        checked={sightingSouthern}
                        onChange={(e) => setSightingSouthern(e.target.checked)}
                      />
                      <span>Southern hemisphere (flips season)</span>
                    </label>
                  </div>
                  <div className="form-group">
                    <label className="form-label">Airport *</label>
                    <AirportTagsInput
                      codes={sightingAirport ? [sightingAirport] : []}
                      onChange={(arr) => {
                        const code = arr[arr.length - 1] || ''
                        setSightingAirport(code)
                        if (!code) setSightingAirportKnown(false)
                      }}
                      onCommitCode={ensureAirportForSighting}
                      max={1}
                    />
                    {sightingAirport && !sightingAirportKnown && (
                      <p className="form-hint sighting-airport-hint">Create this airport to log the sighting</p>
                    )}
                  </div>
                  <StatusSwitch
                    label="Special livery"
                    checked={statusSpecialLivery}
                    onChange={(v) => { setStatusSpecialLivery(v); if (v) { setStatusRetro(false); setStatusAlliance(false) } }}
                    markEl={<img src={markSpecialLiveryAsset} width={24} height={24} alt="" className="status-switch__mark-img" />}
                  />
                  <StatusSwitch
                    label="Retro"
                    checked={statusRetro}
                    onChange={(v) => { setStatusRetro(v); if (v) { setStatusSpecialLivery(false); setStatusAlliance(false) } }}
                    markEl={<img src={markRetroAsset} width={24} height={24} alt="" className="status-switch__mark-img" />}
                  />
                  <StatusSwitch
                    label="Livery change"
                    checked={statusOldLivery}
                    onChange={setStatusOldLivery}
                    markEl={<img src={markOldLiveryAsset} width={24} height={24} alt="" className="status-switch__mark-img" />}
                  />
                  {showLiveryName && (
                    <div className="form-group status-revealed-field">
                      <label className="form-label" htmlFor="sighting-livery-name-input">Livery name (optional)</label>
                      <input
                        id="sighting-livery-name-input"
                        className="form-input"
                        type="text"
                        value={liveryName}
                        onChange={(e) => setLiveryName(e.target.value)}
                        placeholder="e.g. Star Alliance 15yrs, Retrojet"
                        autoComplete="off"
                      />
                    </div>
                  )}
                  <StatusSwitch
                    label="Alliance"
                    checked={statusAlliance}
                    onChange={(v) => { setStatusAlliance(v); if (v) { setStatusSpecialLivery(false); setStatusRetro(false) } }}
                    markEl={<AllianceBadge name={allianceName} size={24} />}
                  />
                  {statusAlliance && (
                    <div className="form-group status-revealed-field">
                      <label className="form-label" htmlFor="sighting-alliance-select">Alliance name</label>
                      <select
                        id="sighting-alliance-select"
                        className="form-input form-select"
                        value={allianceName}
                        onChange={(e) => setAllianceName(e.target.value)}
                      >
                        <option value="">Select…</option>
                        {ALLIANCES.map((a) => (
                          <option key={a} value={a}>{a}</option>
                        ))}
                      </select>
                    </div>
                  )}
                  <button
                    type="button"
                    className="btn-log-sighting"
                    onClick={handleLogSighting}
                    disabled={sightingSaving || !sightingAirport || !sightingAirportKnown}
                  >
                    {sightingSaving ? 'Saving…' : (editingSightingId ? 'Save sighting changes' : 'Log sighting')}
                  </button>
                </div>
              )}
            </div>
          )}

          <div className="form-section">
            <p className="form-section__label">Aircraft</p>
            <div className="form-group">
              <label className="form-label">Manufacturer</label>
              <TypeaheadPicker
                placeholder="Search manufacturers…"
                value={manufacturer}
                onSelect={handleManufacturerSelect}
                fetchOptions={fetchManufacturers}
                onAddNew={(q) => { setMfrFormName(q); setMfrFormOpen(true) }}
                addNewLabel="Add new manufacturer"
              />
            </div>
            <div className="form-group">
              <label className="form-label">Type</label>
              <TypeaheadPicker
                placeholder={manufacturer ? 'Search types…' : 'Select a manufacturer first'}
                value={type}
                onSelect={setType}
                fetchOptions={makeFetchTypes(manufacturer?.id)}
                disabled={!manufacturer}
                onAddNew={manufacturer ? (q) => { setTypeFormName(q); setTypeFormOpen(true) } : undefined}
                addNewLabel="Add new type"
              />
            </div>
          </div>

          {!isEdit && (
            <div className="form-section">
              <p className="form-section__label">Sighting</p>
              <div className="form-group">
                <label className="form-label" htmlFor="first-spotted-input">First spotted</label>
                <DateFastField id="first-spotted-input" value={firstSpotted} onChange={setFirstSpotted} />
              </div>
              <div className="form-group">
                <label className="form-label">Time of day</label>
                <TimeBlockPicker value={firstTimeBlock} onChange={setFirstTimeBlock} />
                <label className="timeblock-hemi">
                  <input
                    type="checkbox"
                    checked={firstSouthern}
                    onChange={(e) => setFirstSouthern(e.target.checked)}
                  />
                  <span>Southern hemisphere (flips season)</span>
                </label>
              </div>
              <div className="form-group">
                <label className="form-label">Airport spotted at</label>
                <AirportTagsInput
                  codes={airports}
                  onChange={(arr) => {
                    setAirports(arr)
                    if (arr.length === 1) {
                      setShowAirportHint(true)
                      clearTimeout(airportHintTimer.current)
                      airportHintTimer.current = setTimeout(() => setShowAirportHint(false), 6000)
                    } else {
                      setShowAirportHint(false)
                      clearTimeout(airportHintTimer.current)
                    }
                  }}
                  onCommitCode={ensureAirport}
                  max={1}
                />
                {showAirportHint
                  ? <p className="field-hint field-hint--fade">To add another airport, log it as a New Sighting.</p>
                  : airports.length === 0 && <p className="form-hint">Space or comma to confirm</p>
                }
              </div>
            </div>
          )}

          {(isEdit || !existingMatch) && (
          <div className="form-section">
            <p className="form-section__label">Status</p>
            <StatusSwitch label="R/S — removed / stored / scrapped" checked={statusRs} onChange={setStatusRs} markEl={<span className="status-switch__rs">R/S</span>} />
            {!isEdit && (
              <>
                <StatusSwitch label="Special livery" checked={statusSpecialLivery} onChange={setStatusSpecialLivery} markEl={<img src={markSpecialLiveryAsset} width={24} height={24} alt="" className="status-switch__mark-img" />} />
                <StatusSwitch label="Retro" checked={statusRetro} onChange={setStatusRetro} markEl={<img src={markRetroAsset} width={24} height={24} alt="" className="status-switch__mark-img" />} />
                <StatusSwitch label="Livery change" checked={statusOldLivery} onChange={setStatusOldLivery} markEl={<img src={markOldLiveryAsset} width={24} height={24} alt="" className="status-switch__mark-img" />} />
                {showLiveryName && (
                  <div className="form-group status-revealed-field">
                    <label className="form-label" htmlFor="livery-name-input">Livery name (optional)</label>
                    <input
                      id="livery-name-input"
                      className="form-input"
                      type="text"
                      value={liveryName}
                      onChange={(e) => setLiveryName(e.target.value)}
                      placeholder="e.g. Star Alliance 15yrs, Retrojet"
                      autoComplete="off"
                    />
                  </div>
                )}
                <StatusSwitch label="Alliance" checked={statusAlliance} onChange={setStatusAlliance} markEl={<AllianceBadge name={allianceName} size={24} />} />
                {statusAlliance && (
                  <div className="form-group status-revealed-field">
                    <label className="form-label" htmlFor="alliance-select">Alliance name</label>
                    <select
                      id="alliance-select"
                      className="form-input form-select"
                      value={allianceName}
                      onChange={(e) => setAllianceName(e.target.value)}
                    >
                      <option value="">Select…</option>
                      {ALLIANCES.map((a) => (
                        <option key={a} value={a}>{a}</option>
                      ))}
                    </select>
                  </div>
                )}
              </>
            )}
            <StatusSwitch
              label="Flown in"
              checked={statusFlownIn}
              onChange={(v) => { setStatusFlownIn(v); if (!v) setFlownInDate('') }}
              markEl={<img src={markFlownInAsset} width={24} height={24} alt="" className="status-switch__mark-img" />}
            />
            {statusFlownIn && (
              <div className="form-group status-revealed-field">
                <label className="form-label" htmlFor="flown-in-date-input">Date flown in</label>
                <input
                  id="flown-in-date-input"
                  className="form-input"
                  type="date"
                  value={flownInDate}
                  onChange={(e) => setFlownInDate(e.target.value)}
                />
              </div>
            )}
          </div>
          )}

          <div className="form-section">
            <p className="form-section__label">Notes</p>
            <div className="form-group">
              <label className="form-label" htmlFor="remark-input">Remark</label>
              <textarea
                id="remark-input"
                className="form-input form-textarea"
                value={remark}
                onChange={(e) => setRemark(e.target.value)}
                placeholder="Any notes about this spotting…"
                rows={3}
              />
            </div>
          </div>

          {isEdit && (
            <div className="form-section sightings-mgr-section">
              <button
                type="button"
                className="sightings-mgr-toggle"
                onClick={handleToggleSightingsMgr}
                aria-expanded={sightingsMgrOpen}
              >
                <span>Sightings</span>
                <span className="sightings-mgr-toggle__chevron" aria-hidden="true">
                  {sightingsMgrOpen ? '▾' : '›'}
                </span>
              </button>

              {sightingsMgrOpen && (
                <div className="sightings-mgr-body">
                  {sightingsLoading && (
                    <p className="sightings-mgr-empty">Loading…</p>
                  )}
                  {!sightingsLoading && sightings.length === 0 && (
                    <p className="sightings-mgr-empty">No sightings yet.</p>
                  )}
                  {!sightingsLoading && sightings.length > 0 && (
                    <ul className="sightings-mgr-list">
                      {sightings.map((s) => {
                        const isConfirming = confirmDeleteSightingId === s.id
                        const isDeleting = deletingSightingId === s.id
                        const isSavingDate = savingDateId === s.id
                        return (
                          <li key={s.id} className="sightings-mgr-row">
                            <div className="sightings-mgr-row__main">
                              <span className="sightings-mgr-airport">{s.airport ?? '—'}</span>
                              <input
                                type="date"
                                className="form-input sightings-mgr-date"
                                value={s.spotted_on ?? ''}
                                disabled={isSavingDate || !!deletingSightingId}
                                onChange={(e) => handleSightingDateChange(s.id, e.target.value)}
                                aria-label={`Date for sighting at ${s.airport ?? 'unknown airport'}`}
                              />
                              <button
                                type="button"
                                className="sighting-edit-btn"
                                onClick={() => beginEditSighting(s)}
                                disabled={!!deletingSightingId || !!savingDateId}
                                aria-label={`Edit sighting at ${s.airport ?? 'unknown airport'}`}
                              >
                                Edit
                              </button>
                              <button
                                type="button"
                                className="type-mgmt-trash-btn"
                                onClick={() => setConfirmDeleteSightingId(s.id)}
                                disabled={!!deletingSightingId || !!savingDateId}
                                aria-label={`Delete sighting at ${s.airport ?? 'unknown airport'}`}
                              >
                                Del
                              </button>
                            </div>
                            <button
                              type="button"
                              className={`book-candidate-toggle${s.is_book_candidate ? ' book-candidate-toggle--on' : ''}`}
                              onClick={() => handleToggleBookCandidate(s.id, s.is_book_candidate)}
                              disabled={savingBookCandidateId === s.id}
                            >
                              {s.is_book_candidate ? '★' : '☆'} Book candidate
                            </button>
                            {capMessageSightingId === s.id && (
                              <p className="book-cap-msg">
                                That month already has {BOOK_CANDIDATES_PER_MONTH} book candidates (the max). Turn one off first, or leave this as a normal sighting and revisit later.
                              </p>
                            )}
                            {s.is_book_candidate && (
                              <textarea
                                className="book-story-input"
                                rows={2}
                                placeholder="Story / note for the book…"
                                value={s.book_story ?? ''}
                                onChange={(e) => {
                                  const val = e.target.value
                                  setSightings((prev) =>
                                    prev.map((r) => r.id === s.id ? { ...r, book_story: val } : r)
                                  )
                                }}
                                onBlur={(e) => {
                                  const val = e.target.value.trim()
                                  supabase
                                    .from('sightings')
                                    .update({ book_story: val || null })
                                    .eq('id', s.id)
                                    .then(() => {
                                      setSightings((prev) =>
                                        prev.map((r) => r.id === s.id ? { ...r, book_story: val || null } : r)
                                      )
                                    })
                                }}
                              />
                            )}
                            {isConfirming && (
                              <div className="delete-confirm type-mgmt-inline-confirm">
                                <p className="delete-confirm__hint">
                                  Delete this sighting? This is permanent.
                                </p>
                                <button
                                  className="btn-confirm-delete"
                                  onClick={() => handleDeleteSighting(s.id)}
                                  disabled={isDeleting}
                                >
                                  {isDeleting ? 'Deleting…' : 'Confirm Delete'}
                                </button>
                                <button
                                  className="btn-cancel-delete"
                                  onClick={() => setConfirmDeleteSightingId(null)}
                                  disabled={isDeleting}
                                >
                                  Cancel
                                </button>
                              </div>
                            )}
                          </li>
                        )
                      })}
                    </ul>
                  )}
                  {sightingsMgrError && (
                    <p className="form-error" style={{ marginTop: '0.5rem' }}>{sightingsMgrError}</p>
                  )}
                </div>
              )}
            </div>
          )}

          {saveError && <p className="form-error">{saveError}</p>}
        </div>

        <div className="form-add-row">
          <span className="form-add-row__label">Add new:</span>
          <button type="button" className="btn-add-chip"
            onClick={() => { setAirlineFormName(''); setAirlineFormOpen(true) }}>Airline</button>
          <button type="button" className="btn-add-chip"
            onClick={() => setAirportFormCode('')}>Airport</button>
          <button type="button" className="btn-add-chip"
            onClick={() => { setMfrFormName(''); setMfrFormOpen(true) }}>Manufacturer</button>
        </div>

        <div className="form-footer">
          <button type="button" className="btn-secondary" onClick={onClose}>
            Cancel
          </button>
          <button
            type="button"
            className="btn-primary"
            onClick={handleSave}
            disabled={saving || (!isEdit && Boolean(existingMatch) && !overrideReady) || sightingOpen}
          >
            {saving ? 'Saving…' : isEdit ? 'Save changes' : 'Save'}
          </button>
        </div>
        {sightingOpen && (
          <p className="save-locked-note">
            Finish or close the sighting form above before saving the registration.
          </p>
        )}
      </div>
    </div>
  )
}
