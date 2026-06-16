import { useState } from 'react'
import { supabase } from './lib/supabaseClient'
import { FlagIcon } from './App'
import { COUNTRIES } from './data/countries'

export default function ManufacturerForm({ initialName, existing, onCancel, onCreated, onUpdated }) {
  const isEdit = Boolean(existing)

  const initialCountry = isEdit
    ? (COUNTRIES.find((c) => c.code.toUpperCase() === (existing.hq_flag || '').toUpperCase())
        ?? COUNTRIES.find((c) => c.name === existing.hq_country)
        ?? null)
    : null

  const [name, setName] = useState(existing?.name ?? initialName ?? '')
  const [originCountry, setOriginCountry] = useState(existing?.origin_country ?? '')
  const [foundedYear, setFoundedYear] = useState(existing?.founded_year != null ? String(existing.founded_year) : '')
  const [countrySearch, setCountrySearch] = useState(existing?.hq_country ?? '')
  const [selectedCountry, setSelectedCountry] = useState(initialCountry)
  const [pickerOpen, setPickerOpen] = useState(false)
  const [logoFile, setLogoFile] = useState(null)
  const [logoUrl, setLogoUrl] = useState(existing?.logo_url ?? null)
  const [saving, setSaving] = useState(false)
  const [saveError, setSaveError] = useState(null)

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
          body: JSON.stringify({ fileBase64: base64, contentType: logoFile.type, keyPrefix: 'manufacturer-logos' }),
        })
        const uploadData = await resp.json()
        if (!resp.ok) throw new Error(uploadData.error || 'Logo upload failed')
        finalLogoUrl = uploadData.url
      }

      if (isEdit) {
        const { data, error: err } = await supabase
          .from('manufacturers')
          .update({
            name: name.trim(),
            hq_country: selectedCountry.name,
            hq_flag: selectedCountry.code.toUpperCase(),
            origin_country: originCountry.trim() || null,
            founded_year: foundedYear ? Number(foundedYear) : null,
            logo_url: finalLogoUrl,
          })
          .eq('id', existing.id)
          .select('id, name, hq_country, hq_flag, origin_country, founded_year, logo_url')
          .single()
        setSaving(false)
        if (err) { setSaveError(err.message); return }
        onUpdated(data)
      } else {
        const { data, error: err } = await supabase
          .from('manufacturers')
          .insert({
            name: name.trim(),
            hq_country: selectedCountry.name,
            hq_flag: selectedCountry.code.toUpperCase(),
            origin_country: originCountry.trim() || null,
            founded_year: foundedYear ? Number(foundedYear) : null,
            logo_url: finalLogoUrl,
          })
          .select('id, name, logo_url')
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

  return (
    <div className="entry-modal-backdrop" onClick={onCancel}>
      <div className="entry-modal manufacturer-form-modal" onClick={(e) => e.stopPropagation()}>
        <div className="form-header">
          <h2 className="form-title">{isEdit ? 'Edit Manufacturer' : 'New Manufacturer'}</h2>
          <button type="button" className="form-close" onClick={onCancel} aria-label="Close">×</button>
        </div>

        <div className="form-body">
          <div className="form-section">
            <div className="form-group">
              <label className="form-label" htmlFor="mfr-name-input">Manufacturer name *</label>
              <input
                id="mfr-name-input"
                className="form-input"
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="e.g. Airbus"
                autoComplete="off"
                autoFocus
              />
            </div>

            <div className="form-group">
              <label className="form-label">HQ country *</label>
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
              <label className="form-label" htmlFor="mfr-origin-input">Origin country (optional)</label>
              <input
                id="mfr-origin-input"
                className="form-input"
                type="text"
                value={originCountry}
                onChange={(e) => setOriginCountry(e.target.value)}
                placeholder="e.g. Multinational (EU)"
                autoComplete="off"
              />
            </div>

            <div className="form-group">
              <label className="form-label" htmlFor="mfr-founded-input">Founded year (optional)</label>
              <input
                id="mfr-founded-input"
                className="form-input form-input--narrow"
                type="number"
                value={foundedYear}
                onChange={(e) => setFoundedYear(e.target.value)}
                placeholder="e.g. 1970"
                min={1800}
                max={new Date().getFullYear()}
              />
            </div>

            <div className="form-group">
              <label className="form-label" htmlFor="mfr-logo-input">Manufacturer logo (optional)</label>
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
                id="mfr-logo-input"
                className="form-input"
                type="file"
                accept="image/*"
                onChange={(e) => setLogoFile(e.target.files[0] ?? null)}
              />
            </div>
          </div>

          {saveError && <p className="form-error">{saveError}</p>}
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
            {saving ? 'Saving…' : isEdit ? 'Save changes' : 'Add manufacturer'}
          </button>
        </div>
      </div>
    </div>
  )
}
