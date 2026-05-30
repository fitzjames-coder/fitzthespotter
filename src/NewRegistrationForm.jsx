import { useRef, useState } from 'react'
import { supabase } from './lib/supabaseClient'
import TypeaheadPicker from './TypeaheadPicker'

function AirportTagsInput({ codes, onChange }) {
  const [draft, setDraft] = useState('')
  const inputRef = useRef(null)

  function commit() {
    const token = draft.trim().toUpperCase()
    if (token && !codes.includes(token)) {
      onChange([...codes, token])
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
    </div>
  )
}

async function fetchAirlines(q) {
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
    if (!supabase) return []
    let qb = supabase
      .from('aircraft_types')
      .select('id, model')
      .ilike('model', `%${q}%`)
      .order('model')
      .limit(8)
    if (manufacturerId) qb = qb.eq('manufacturer_id', manufacturerId)
    const { data } = await qb
    return (data ?? []).map((t) => ({ id: t.id, label: t.model }))
  }
}

export default function NewRegistrationForm({ onClose, onSaved, existingReg, initialAirline }) {
  const isEdit = Boolean(existingReg)

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
    return at ? { id: at.id, label: at.model } : null
  })
  const [airports, setAirports] = useState(
    Array.isArray(existingReg?.airport_codes) ? existingReg.airport_codes : []
  )
  const [firstSpotted, setFirstSpotted] = useState(existingReg?.first_spotted ?? '')
  const [liveryTag, setLiveryTag] = useState('')
  const [remark, setRemark] = useState(existingReg?.remark ?? '')
  const [saving, setSaving] = useState(false)
  const [saveError, setSaveError] = useState(null)

  function handleManufacturerSelect(mfr) {
    setManufacturer(mfr)
    setType(null)
  }

  async function handleSave() {
    if (!supabase) { setSaveError('Supabase is not configured.'); return }
    const trimmed = regNumber.trim().toUpperCase()
    if (!trimmed) { setSaveError('Registration number is required.'); return }

    setSaving(true)
    setSaveError(null)

    const payload = {
      registration: trimmed,
      airline_id: airline?.id ?? null,
      aircraft_type_id: type?.id ?? null,
      airport_codes: airports.length > 0 ? airports : null,
      first_spotted: firstSpotted.trim() || null,
      remark: remark.trim() || null,
    }

    const { error: err } = isEdit
      ? await supabase.from('registrations').update(payload).eq('id', existingReg.id)
      : await supabase.from('registrations').insert(payload)

    setSaving(false)
    if (err) {
      setSaveError(err.message)
    } else {
      onSaved?.()
      onClose()
    }
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
            <p className="form-section__label">Registration</p>
            <div className="form-group">
              <label className="form-label" htmlFor="reg-number-input">Reg number *</label>
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
              <label className="form-label">Airline</label>
              <TypeaheadPicker
                placeholder="Search airlines…"
                value={airline}
                onSelect={setAirline}
                fetchOptions={fetchAirlines}
              />
            </div>
          </div>

          <div className="form-section">
            <p className="form-section__label">Aircraft</p>
            <div className="form-group">
              <label className="form-label">Manufacturer</label>
              <TypeaheadPicker
                placeholder="Search manufacturers…"
                value={manufacturer}
                onSelect={handleManufacturerSelect}
                fetchOptions={fetchManufacturers}
              />
            </div>
            <div className="form-group">
              <label className="form-label">Type</label>
              <TypeaheadPicker
                placeholder={manufacturer ? 'Search types…' : 'Select a manufacturer first'}
                value={type}
                onSelect={setType}
                fetchOptions={makeFetchTypes(manufacturer?.id)}
              />
            </div>
            <div className="form-illustration-stub">
              <span className="form-stub__label">Aircraft image coming soon</span>
            </div>
          </div>

          <div className="form-section">
            <p className="form-section__label">Sighting</p>
            <div className="form-group">
              <label className="form-label">Airports spotted at</label>
              <AirportTagsInput codes={airports} onChange={setAirports} />
              <p className="form-hint">Space or comma to confirm each code</p>
            </div>
            <div className="form-group">
              <label className="form-label" htmlFor="first-spotted-input">First spotted</label>
              <input
                id="first-spotted-input"
                className="form-input"
                type="text"
                value={firstSpotted}
                onChange={(e) => setFirstSpotted(e.target.value)}
                placeholder="e.g. Mar 2023 or 14 Jun 2022"
                autoComplete="off"
              />
            </div>
            <div className="form-group">
              <label className="form-label" htmlFor="livery-input">Special livery</label>
              <input
                id="livery-input"
                className="form-input"
                type="text"
                value={liveryTag}
                onChange={(e) => setLiveryTag(e.target.value)}
                placeholder="e.g. 100th Anniversary"
                autoComplete="off"
              />
            </div>
          </div>

          <div className="form-section">
            <p className="form-section__label">Notes</p>
            <div className="form-photos-stub">
              <span className="form-stub__label">Photo upload coming soon</span>
            </div>
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

          {saveError && <p className="form-error">{saveError}</p>}
        </div>

        <div className="form-footer">
          <button type="button" className="btn-secondary" onClick={onClose}>
            Cancel
          </button>
          <button
            type="button"
            className="btn-primary"
            onClick={handleSave}
            disabled={saving}
          >
            {saving ? 'Saving…' : isEdit ? 'Save changes' : 'Save'}
          </button>
        </div>
      </div>
    </div>
  )
}
