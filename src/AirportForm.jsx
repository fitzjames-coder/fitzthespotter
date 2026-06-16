import { useState } from 'react'
import { supabase } from './lib/supabaseClient'
import { FlagIcon } from './App'
import { COUNTRIES } from './data/countries'

export default function AirportForm({ initialCode, existing, onCancel, onCreated, onUpdated, onDeleted }) {
  const isEdit = Boolean(existing)

  const initialCountry = isEdit
    ? (COUNTRIES.find((c) => c.code.toUpperCase() === (existing.country_flag || '').toUpperCase()) ?? null)
    : null

  const [iata, setIata] = useState(existing?.iata ?? initialCode ?? '')
  const [icao, setIcao] = useState(existing?.icao ?? '')
  const [name, setName] = useState(existing?.name ?? '')
  const [remarks, setRemarks] = useState(existing?.remarks ?? '')
  const [countrySearch, setCountrySearch] = useState(existing?.country ?? '')
  const [selectedCountry, setSelectedCountry] = useState(initialCountry)
  const [pickerOpen, setPickerOpen] = useState(false)
  const [headerImageFile, setHeaderImageFile] = useState(null)
  const [headerImageUrl, setHeaderImageUrl] = useState(existing?.header_image_url ?? null)
  const [saving, setSaving] = useState(false)
  const [saveError, setSaveError] = useState(null)
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false)
  const [deleting, setDeleting] = useState(false)

  const filtered = countrySearch.trim()
    ? COUNTRIES.filter((c) =>
        c.name.toLowerCase().includes(countrySearch.trim().toLowerCase())
      )
    : COUNTRIES

  const canSave = iata.trim().length > 0 && name.trim().length > 0 && selectedCountry !== null

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
    const code = iata.trim().toUpperCase()

    try {
      let finalHeaderImageUrl = headerImageUrl
      if (headerImageFile) {
        const base64 = await new Promise((resolve, reject) => {
          const r = new FileReader()
          r.onload = () => resolve(String(r.result).split(',')[1])
          r.onerror = reject
          r.readAsDataURL(headerImageFile)
        })
        const resp = await fetch('/api/upload', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ fileBase64: base64, contentType: headerImageFile.type, keyPrefix: 'airport-headers' }),
        })
        const uploadData = await resp.json()
        if (!resp.ok) throw new Error(uploadData.error || 'Image upload failed')
        finalHeaderImageUrl = uploadData.url
      }

      if (isEdit) {
        const { data, error: err } = await supabase
          .from('airports')
          .update({
            iata: code,
            icao: icao.trim().toUpperCase() || null,
            name: name.trim(),
            country: selectedCountry.name,
            country_flag: selectedCountry.code.toUpperCase(),
            remarks: remarks.trim() || null,
            header_image_url: finalHeaderImageUrl,
          })
          .eq('iata', existing.iata)
          .select('iata, icao, name, country, country_flag, remarks, header_image_url')
          .single()
        setSaving(false)
        if (err) {
          if (err.code === '23505') { setSaveError('An airport with this code already exists.'); return }
          setSaveError(err.message)
          return
        }
        onUpdated(data)
      } else {
        const { data: dup } = await supabase
          .from('airports')
          .select('iata')
          .eq('iata', code)
          .maybeSingle()
        if (dup) {
          setSaveError('An airport with this code already exists.')
          setSaving(false)
          return
        }
        const { data, error: err } = await supabase
          .from('airports')
          .insert({
            iata: code,
            icao: icao.trim().toUpperCase() || null,
            name: name.trim(),
            country: selectedCountry.name,
            country_flag: selectedCountry.code.toUpperCase(),
            remarks: remarks.trim() || null,
            header_image_url: finalHeaderImageUrl,
          })
          .select('iata, name, header_image_url')
          .single()
        setSaving(false)
        if (err) {
          if (err.code === '23505') { setSaveError('An airport with this code already exists.'); return }
          setSaveError(err.message)
          return
        }
        onCreated(data)
      }
    } catch (e) {
      setSaving(false)
      setSaveError(e?.message || 'Save failed')
    }
  }

  async function handleDelete() {
    setDeleting(true)
    const { error: err } = await supabase.from('airports').delete().eq('iata', existing.iata)
    setDeleting(false)
    if (err) { setSaveError(err.message); return }
    onDeleted()
  }

  return (
    <div className="entry-modal-backdrop" onClick={onCancel}>
      <div className="entry-modal airport-form-modal" onClick={(e) => e.stopPropagation()}>
        <div className="form-header">
          <h2 className="form-title">{isEdit ? 'Edit Airport' : 'New Airport'}</h2>
          <button type="button" className="form-close" onClick={onCancel} aria-label="Close">×</button>
        </div>

        <div className="form-body">
          <div className="form-section">
            <div className="form-group">
              <label className="form-label" htmlFor="airport-iata-input">IATA code *</label>
              <input
                id="airport-iata-input"
                className="form-input form-input--mono"
                type="text"
                value={iata}
                onChange={(e) => setIata(e.target.value.toUpperCase().replace(/[^A-Z0-9]/g, ''))}
                placeholder="e.g. LHR"
                maxLength={4}
                autoComplete="off"
                autoFocus
              />
            </div>

            <div className="form-group">
              <label className="form-label" htmlFor="airport-icao-input">ICAO (optional)</label>
              <input
                id="airport-icao-input"
                className="form-input form-input--mono"
                type="text"
                value={icao}
                onChange={(e) => setIcao(e.target.value.toUpperCase().replace(/[^A-Z0-9]/g, ''))}
                placeholder="e.g. EGLL"
                maxLength={4}
                autoComplete="off"
              />
            </div>

            <div className="form-group">
              <label className="form-label" htmlFor="airport-name-input">Airport name *</label>
              <input
                id="airport-name-input"
                className="form-input"
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="e.g. London Heathrow"
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
              <label className="form-label" htmlFor="airport-remarks-input">Remarks (optional)</label>
              <textarea
                id="airport-remarks-input"
                className="form-input form-textarea"
                value={remarks}
                onChange={(e) => setRemarks(e.target.value)}
                placeholder="Any notes about this airport…"
                rows={2}
              />
            </div>

            <div className="form-group">
              <label className="form-label" htmlFor="airport-header-image-input">Header image (optional)</label>
              {isEdit && headerImageUrl && (
                <div className="logo-preview-row">
                  <img
                    src={headerImageUrl}
                    alt=""
                    className="logo-preview-thumb"
                  />
                  <button
                    type="button"
                    className="btn-secondary logo-remove-btn"
                    onClick={() => setHeaderImageUrl(null)}
                  >
                    Remove image
                  </button>
                </div>
              )}
              <input
                id="airport-header-image-input"
                className="form-input"
                type="file"
                accept="image/*"
                onChange={(e) => setHeaderImageFile(e.target.files[0] ?? null)}
              />
            </div>
          </div>

          {saveError && <p className="form-error">{saveError}</p>}

          {isEdit && !showDeleteConfirm && (
            <div className="danger-row">
              <button
                type="button"
                className="btn-delete-reg"
                onClick={() => setShowDeleteConfirm(true)}
              >
                Delete airport
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
            {saving ? 'Saving…' : isEdit ? 'Save changes' : 'Add airport'}
          </button>
        </div>
      </div>
    </div>
  )
}
