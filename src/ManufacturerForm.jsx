import { useEffect, useState } from 'react'
import { supabase } from './lib/supabaseClient'
import { FlagIcon } from './App'
import { COUNTRIES } from './data/countries'

function thumbAbbrev(model) {
  const seg = model.split(/[-\s]/)[0]
  return seg.length <= 5 ? seg : seg.slice(0, 4)
}

function regLabel(n) {
  return `${n} registration${n === 1 ? '' : 's'}`
}

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

  const [types, setTypes] = useState([])
  const [typeCounts, setTypeCounts] = useState({})
  const [typesLoading, setTypesLoading] = useState(false)
  const [typesError, setTypesError] = useState(null)
  const [uploadingTypeId, setUploadingTypeId] = useState(null)
  const [deletingTypeId, setDeletingTypeId] = useState(null)
  const [confirmDeleteTypeId, setConfirmDeleteTypeId] = useState(null)
  const [newTypeName, setNewTypeName] = useState('')
  const [addingType, setAddingType] = useState(false)

  useEffect(() => {
    if (!isEdit) return
    if (!supabase) { setTypesError('Supabase is not configured.'); return }
    setTypesLoading(true)
    supabase
      .from('aircraft_types')
      .select('id, name, template_url')
      .eq('manufacturer_id', existing.id)
      .order('name', { ascending: true })
      .then(async ({ data, error: err }) => {
        if (err) {
          setTypesError(err.message)
          setTypesLoading(false)
          return
        }
        const fetchedTypes = data ?? []
        setTypes(fetchedTypes)

        if (fetchedTypes.length > 0) {
          const typeIds = fetchedTypes.map((t) => t.id)
          const { data: regsData } = await supabase
            .from('registrations')
            .select('aircraft_type_id')
            .in('aircraft_type_id', typeIds)
          if (regsData) {
            const counts = {}
            for (const row of regsData) {
              counts[row.aircraft_type_id] = (counts[row.aircraft_type_id] ?? 0) + 1
            }
            setTypeCounts(counts)
          }
        }
        setTypesLoading(false)
      })
  }, [isEdit, existing?.id])

  async function handleUploadTemplate(typeId, file) {
    if (!file || uploadingTypeId) return
    setUploadingTypeId(typeId)
    setTypesError(null)
    try {
      const base64 = await new Promise((resolve, reject) => {
        const r = new FileReader()
        r.onload = () => resolve(String(r.result).split(',')[1])
        r.onerror = reject
        r.readAsDataURL(file)
      })
      const resp = await fetch('/api/upload', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ fileBase64: base64, contentType: file.type, keyPrefix: 'type-templates' }),
      })
      const uploadData = await resp.json()
      if (!resp.ok) throw new Error(uploadData.error || 'Template upload failed')

      const { error: err } = await supabase
        .from('aircraft_types')
        .update({ template_url: uploadData.url })
        .eq('id', typeId)
      if (err) throw new Error(err.message)

      setTypes((prev) => prev.map((t) => (t.id === typeId ? { ...t, template_url: uploadData.url } : t)))
    } catch (e) {
      setTypesError(e?.message || 'Template upload failed')
    } finally {
      setUploadingTypeId(null)
    }
  }

  async function handleDeleteType(typeId) {
    if (deletingTypeId) return
    setDeletingTypeId(typeId)
    setTypesError(null)
    const { error: err } = await supabase.from('aircraft_types').delete().eq('id', typeId)
    setDeletingTypeId(null)
    if (err) { setTypesError(err.message); return }
    setTypes((prev) => prev.filter((t) => t.id !== typeId))
    setConfirmDeleteTypeId(null)
  }

  async function handleAddType() {
    const trimmed = newTypeName.trim()
    if (!trimmed || addingType) return
    setAddingType(true)
    setTypesError(null)
    const { data, error: err } = await supabase
      .from('aircraft_types')
      .insert({ name: trimmed, manufacturer_id: existing.id })
      .select('id, name, template_url')
      .single()
    setAddingType(false)
    if (err) { setTypesError(err.message); return }
    setTypes((prev) =>
      [...prev, data].sort((a, b) => a.name.localeCompare(b.name))
    )
    setNewTypeName('')
  }

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

          {isEdit && (
            <div className="form-section type-mgmt-section">
              <h3 className="type-mgmt-heading">Aircraft types</h3>
              <p className="type-mgmt-subtext">
                One template image per type — shared by every registration of that type.
              </p>

              {typesLoading && <p className="state-message">Loading types…</p>}

              {!typesLoading && types.length > 0 && (
                <ul className="type-mgmt-list">
                  {types.map((type) => {
                    const count = typeCounts[type.id] ?? 0
                    const isUploading = uploadingTypeId === type.id
                    const isDeleting = deletingTypeId === type.id
                    const isConfirming = confirmDeleteTypeId === type.id
                    return (
                      <li key={type.id} className="type-mgmt-row">
                        <div className="type-mgmt-row__main">
                          <div className="type-mgmt-thumb">
                            {type.template_url ? (
                              <img className="type-mgmt-thumb__img" src={type.template_url} alt="" aria-hidden="true" />
                            ) : (
                              <div className="type-mgmt-thumb__placeholder" aria-hidden="true">
                                {thumbAbbrev(type.name)}
                              </div>
                            )}
                          </div>
                          <div className="type-mgmt-row__info">
                            <span className="type-mgmt-row__name">{type.name}</span>
                            <span className="type-mgmt-row__count">{regLabel(count)}</span>
                          </div>
                          <div className="type-mgmt-row__actions">
                            <label className={`btn-secondary type-mgmt-upload-btn${isUploading ? ' type-mgmt-upload-btn--busy' : ''}`}>
                              {isUploading ? 'Uploading…' : type.template_url ? 'Replace' : 'Upload'}
                              <input
                                type="file"
                                accept="image/*"
                                className="type-mgmt-upload-input"
                                disabled={isUploading}
                                onChange={(e) => {
                                  const file = e.target.files[0] ?? null
                                  e.target.value = ''
                                  if (file) handleUploadTemplate(type.id, file)
                                }}
                              />
                            </label>
                            <button
                              type="button"
                              className="type-mgmt-trash-btn"
                              onClick={() => setConfirmDeleteTypeId(type.id)}
                              aria-label={`Delete ${type.name}`}
                              disabled={isDeleting}
                            >
                              🗑
                            </button>
                          </div>
                        </div>

                        {isConfirming && (
                          <div className="delete-confirm type-mgmt-inline-confirm">
                            <p className="delete-confirm__hint">
                              Delete {type.name}? {regLabel(count)} will lose their type.
                            </p>
                            <button
                              className="btn-confirm-delete"
                              onClick={() => handleDeleteType(type.id)}
                              disabled={isDeleting}
                            >
                              {isDeleting ? 'Deleting…' : 'Confirm Delete'}
                            </button>
                            <button
                              className="btn-cancel-delete"
                              onClick={() => setConfirmDeleteTypeId(null)}
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

              <div className="type-mgmt-add-row">
                <input
                  className="form-input"
                  type="text"
                  value={newTypeName}
                  onChange={(e) => setNewTypeName(e.target.value)}
                  placeholder="Add a new type…"
                  autoComplete="off"
                  disabled={addingType}
                />
                <button
                  type="button"
                  className="btn-secondary type-mgmt-add-btn"
                  onClick={handleAddType}
                  disabled={!newTypeName.trim() || addingType}
                >
                  {addingType ? 'Adding…' : 'Add'}
                </button>
              </div>

              {typesError && <p className="form-error">{typesError}</p>}

              <p className="type-mgmt-warning">
                Deleting a type doesn't delete its registrations — they lose their type link (the regs survive).
              </p>
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
            {saving ? 'Saving…' : isEdit ? 'Save changes' : 'Add manufacturer'}
          </button>
        </div>
      </div>
    </div>
  )
}
