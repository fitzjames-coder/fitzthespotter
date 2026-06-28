import { useState } from 'react'
import { supabase } from './lib/supabaseClient'
import { FlagIcon } from './App'
import { COUNTRIES } from './data/countries'

export default function AirlineForm({ initialName, existing, onCancel, onCreated, onUpdated, onDeleted }) {
  const isEdit = Boolean(existing)

  const initialCountry = isEdit
    ? (COUNTRIES.find((c) => c.code.toUpperCase() === (existing.country_flag || '').toUpperCase()) ?? null)
    : null

  const [name, setName] = useState(existing?.name ?? initialName ?? '')
  const [secondaryName, setSecondaryName] = useState(existing?.secondary_name ?? '')
  const [countrySearch, setCountrySearch] = useState(existing?.country ?? '')
  const [selectedCountry, setSelectedCountry] = useState(initialCountry)
  const [pickerOpen, setPickerOpen] = useState(false)
  const [logoFile, setLogoFile] = useState(null)
  const [logoUrl, setLogoUrl] = useState(existing?.logo_url ?? null)
  const [isClosed, setIsClosed] = useState(existing?.is_closed ?? false)
  const [flownIn, setFlownIn] = useState(existing?.flown_in ?? false)
  const [saving, setSaving] = useState(false)
  const [saveError, setSaveError] = useState(null)
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false)
  const [deleting, setDeleting] = useState(false)

  const filtered = countrySearch.trim()
    ? COUNTRIES.filter((c) =>
        c.name.toLowerCase().includes(countrySearch.trim().toLowerCase())
      )
    : COUNTRIES

  const canSave = name.trim().length > 0 && selectedCountry !== null

  function pickCountry(country) {
    setSelectedCountry(country)
    setCountrySearch(country.name)
    setPickerOpen(false)
  }

  async function handleSave() {
    if (!canSave) return
    if (!supabase) { setSaveError('Supabase is not configured.'); return }
    setSaving(true)
    setSaveError(null)
    try {
      let finalLogoUrl = logoUrl
      if (logoFile) {
        const base64 = await new Promise((resolve, reject) => {
          const r = new FileReader()
          r.onload = () => resolve(String(r.result).split(',')[1])
          r.onerror = reject
          r.readAsDataURL(logoFile)
        })
        const resp = await fetch('/api/upload', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ fileBase64: base64, contentType: logoFile.type, keyPrefix: 'airline-logos' }),
        })
        const uploadData = await resp.json()
        if (!resp.ok) throw new Error(uploadData.error || 'Logo upload failed')
        finalLogoUrl = uploadData.url
      }

      if (isEdit) {
        const { data, error: err } = await supabase
          .from('airlines')
          .update({
            name: name.trim(),
            secondary_name: secondaryName.trim() || null,
            country: selectedCountry.name,
            country_flag: selectedCountry.code.toUpperCase(),
            logo_url: finalLogoUrl,
            is_closed: isClosed,
            flown_in: flownIn,
          })
          .eq('id', existing.id)
          .select('id, name, country, country_flag, logo_url, is_closed, secondary_name, flown_in')
          .single()
        setSaving(false)
        if (err) { setSaveError(err.message); return }
        onUpdated(data)
      } else {
        const { data, error: err } = await supabase
          .from('airlines')
          .insert({
            name: name.trim(),
            secondary_name: secondaryName.trim() || null,
            country: selectedCountry.name,
            country_flag: selectedCountry.code.toUpperCase(),
            logo_url: finalLogoUrl,
            is_closed: isClosed,
            flown_in: flownIn,
          })
          .select('id, name, country, country_flag, logo_url, is_closed, secondary_name, flown_in')
          .single()
        setSaving(false)
        if (err) { setSaveError(err.message); return }
        onCreated(data)
      }
    } catch (e) {
      setSaving(false)
      setSaveError(e?.message || 'Save failed')
    }
  }

  async function handleDelete() {
    setDeleting(true)
    const { error: err } = await supabase.from('airlines').delete().eq('id', existing.id)
    setDeleting(false)
    if (err) { setSaveError(err.message); return }
    onDeleted()
  }

  return (
    <div className="entry-modal-backdrop" onClick={onCancel}>
      <div className="entry-modal airline-form-modal" onClick={(e) => e.stopPropagation()}>
        <div className="form-header">
          <h2 className="form-title">{isEdit ? 'Edit Airline' : 'New Airline'}</h2>
          <button type="button" className="form-close" onClick={onCancel} aria-label="Close">×</button>
        </div>

        <div className="form-body">
          <div className="form-section">
            <div className="form-group">
              <label className="form-label" htmlFor="airline-name-input">Airline name *</label>
              <input
                id="airline-name-input"
                className="form-input"
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="e.g. Lufthansa"
                autoComplete="off"
                autoFocus
              />
            </div>

            <div className="form-group">
              <label className="form-label" htmlFor="airline-secondary-input">Secondary name</label>
              <input
                id="airline-secondary-input"
                className="form-input"
                type="text"
                value={secondaryName}
                onChange={(e) => setSecondaryName(e.target.value)}
                placeholder="e.g. CityLine (optional)"
                autoComplete="off"
              />
            </div>

            <div className="form-group">
              <label className="form-label">Country *</label>
              <div className="country-picker">
                <div className="country-picker__input-row">
                  {selectedCountry && (
                    <FlagIcon countryCode={selectedCountry.code} />
                  )}
                  <input
                    className="form-input country-picker__input"
                    type="text"
                    placeholder="Search country…"
                    value={countrySearch}
                    onChange={(e) => {
                      setCountrySearch(e.target.value)
                      setSelectedCountry(null)
                      setPickerOpen(true)
                    }}
                    onFocus={() => setPickerOpen(true)}
                    autoComplete="off"
                  />
                </div>
                {pickerOpen && filtered.length > 0 && (
                  <div className="country-picker__dropdown">
                    {filtered.slice(0, 80).map((c) => (
                      <div
                        key={c.code}
                        className="country-picker__option"
                        onMouseDown={() => pickCountry(c)}
                      >
                        <FlagIcon countryCode={c.code} />
                        <span>{c.name}</span>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>

            <div className="form-group">
              <label className="form-label" htmlFor="airline-logo-input">Airline logo (optional)</label>
              {isEdit && logoUrl && (
                <div className="logo-preview-row">
                  <img
                    src={logoUrl}
                    alt=""
                    className="logo-preview-thumb"
                  />
                  <button
                    type="button"
                    className="btn-secondary logo-remove-btn"
                    onClick={() => setLogoUrl(null)}
                  >
                    Remove logo
                  </button>
                </div>
              )}
              <input
                id="airline-logo-input"
                className="form-input"
                type="file"
                accept="image/*"
                onChange={(e) => setLogoFile(e.target.files[0] ?? null)}
              />
            </div>
          </div>

          <div className="status-switch airline-form-closed-row">
            <span className="status-switch__left">
              <span className="status-switch__label">Ceased operations</span>
            </span>
            <button
              type="button"
              role="switch"
              aria-checked={isClosed}
              className={`status-toggle${isClosed ? ' status-toggle--on' : ''}`}
              onClick={() => setIsClosed((v) => !v)}
            >
              <span className="status-toggle__knob" />
            </button>
          </div>

          <div className="status-switch airline-form-closed-row">
            <span className="status-switch__left">
              <span className="status-switch__label">Flown this airline</span>
            </span>
            <button
              type="button"
              role="switch"
              aria-checked={flownIn}
              className={`status-toggle${flownIn ? ' status-toggle--on' : ''}`}
              onClick={() => setFlownIn((v) => !v)}
            >
              <span className="status-toggle__knob" />
            </button>
          </div>

          {saveError && <p className="form-error">{saveError}</p>}

          {isEdit && !showDeleteConfirm && (
            <div className="danger-row">
              <button
                type="button"
                className="btn-delete-reg"
                onClick={() => setShowDeleteConfirm(true)}
              >
                Delete airline
              </button>
            </div>
          )}

          {isEdit && showDeleteConfirm && (
            <div className="delete-confirm">
              <button
                className="btn-confirm-delete"
                onClick={handleDelete}
                disabled={deleting}
              >
                {deleting ? 'Deleting…' : 'Confirm Delete'}
              </button>
              <p className="delete-confirm__hint">This cannot be undone.</p>
              <button className="btn-cancel-delete" onClick={() => setShowDeleteConfirm(false)}>
                Cancel
              </button>
            </div>
          )}
        </div>

        <div className="form-footer">
          <button type="button" className="btn-secondary" onClick={onCancel}>
            Cancel
          </button>
          <button
            type="button"
            className="btn-primary"
            onClick={handleSave}
            disabled={!canSave || saving}
          >
            {saving ? 'Saving…' : isEdit ? 'Save changes' : 'Add airline'}
          </button>
        </div>
      </div>
    </div>
  )
}
