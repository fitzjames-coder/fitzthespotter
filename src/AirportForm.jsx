import { useState } from 'react'
import { supabase } from './lib/supabaseClient'
import { FlagIcon } from './App'
import { COUNTRIES } from './data/countries'

export default function AirportForm({ initialCode, onCancel, onCreated }) {
  const [iata, setIata] = useState(initialCode ?? '')
  const [icao, setIcao] = useState('')
  const [name, setName] = useState('')
  const [remarks, setRemarks] = useState('')
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
    const { data, error: err } = await supabase
      .from('airports')
      .insert({
        iata: iata.trim().toUpperCase(),
        icao: icao.trim().toUpperCase() || null,
        name: name.trim(),
        country: selectedCountry.name,
        country_flag: selectedCountry.code.toUpperCase(),
        remarks: remarks.trim() || null,
      })
      .select('iata, name')
      .single()
    setSaving(false)
    if (err) {
      // unique violation (23505) means it was created in the meantime — treat as success
      if (err.code === '23505') { onCreated({ iata: iata.trim().toUpperCase() }); return }
      setSaveError(err.message)
      return
    }
    onCreated(data)
  }

  return (
    <div className="entry-modal-backdrop" onClick={onCancel}>
      <div className="entry-modal airport-form-modal" onClick={(e) => e.stopPropagation()}>
        <div className="form-header">
          <h2 className="form-title">New Airport</h2>
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
            {saving ? 'Saving…' : 'Add airport'}
          </button>
        </div>
      </div>
    </div>
  )
}
