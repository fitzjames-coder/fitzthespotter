import { useState } from 'react'
import { supabase } from './lib/supabaseClient'
import { FlagIcon } from './App'
import { COUNTRIES } from './data/countries'

export default function AirlineForm({ initialName, onCancel, onCreated }) {
  const [name, setName] = useState(initialName ?? '')
  const [countrySearch, setCountrySearch] = useState('')
  const [selectedCountry, setSelectedCountry] = useState(null)
  const [pickerOpen, setPickerOpen] = useState(false)
  const [logoFile, setLogoFile] = useState(null)
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
      let logoUrl = null
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
        logoUrl = uploadData.url
      }
      const { data, error: err } = await supabase
        .from('airlines')
        .insert({
          name: name.trim(),
          country: selectedCountry.name,
          country_flag: selectedCountry.code.toUpperCase(),
          logo_url: logoUrl,
        })
        .select('id, name, country, country_flag, logo_url')
        .single()
      setSaving(false)
      if (err) { setSaveError(err.message); return }
      onCreated(data)
    } catch (e) {
      setSaving(false)
      setSaveError(e?.message || 'Save failed')
    }
  }

  return (
    <div className="entry-modal-backdrop" onClick={onCancel}>
      <div className="entry-modal airline-form-modal" onClick={(e) => e.stopPropagation()}>
        <div className="form-header">
          <h2 className="form-title">New Airline</h2>
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
              <input
                id="airline-logo-input"
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
            {saving ? 'Saving…' : 'Add airline'}
          </button>
        </div>
      </div>
    </div>
  )
}
