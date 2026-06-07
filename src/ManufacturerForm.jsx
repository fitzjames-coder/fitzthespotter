import { useState } from 'react'
import { supabase } from './lib/supabaseClient'
import { FlagIcon } from './App'
import { COUNTRIES } from './data/countries'

export default function ManufacturerForm({ initialName, onCancel, onCreated }) {
  const [name, setName] = useState(initialName ?? '')
  const [originCountry, setOriginCountry] = useState('')
  const [foundedYear, setFoundedYear] = useState('')
  const [countrySearch, setCountrySearch] = useState('')
  const [selectedCountry, setSelectedCountry] = useState(null)
  const [pickerOpen, setPickerOpen] = useState(false)
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
    const { data, error: err } = await supabase
      .from('manufacturers')
      .insert({
        name: name.trim(),
        hq_country: selectedCountry.name,
        hq_flag: selectedCountry.code.toUpperCase(),
        origin_country: originCountry.trim() || null,
        founded_year: foundedYear ? Number(foundedYear) : null,
      })
      .select('id, name')
      .single()
    setSaving(false)
    if (err) { setSaveError(err.message); return }
    onCreated(data)
  }

  return (
    <div className="entry-modal-backdrop" onClick={onCancel}>
      <div className="entry-modal manufacturer-form-modal" onClick={(e) => e.stopPropagation()}>
        <div className="form-header">
          <h2 className="form-title">New Manufacturer</h2>
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
            {saving ? 'Saving…' : 'Add manufacturer'}
          </button>
        </div>
      </div>
    </div>
  )
}
