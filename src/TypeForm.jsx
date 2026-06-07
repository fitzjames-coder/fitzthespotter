import { useState } from 'react'
import { supabase } from './lib/supabaseClient'

export default function TypeForm({ initialName, manufacturer, onCancel, onCreated }) {
  const [name, setName] = useState(initialName ?? '')
  const [category, setCategory] = useState('')
  const [saving, setSaving] = useState(false)
  const [saveError, setSaveError] = useState(null)

  const canSave = name.trim().length > 0 && Boolean(manufacturer)

  async function handleSave() {
    if (!canSave) return
    if (!supabase) { setSaveError('Supabase is not configured.'); return }
    setSaving(true)
    setSaveError(null)
    const { data, error: err } = await supabase
      .from('aircraft_types')
      .insert({
        name: name.trim(),
        manufacturer_id: manufacturer.id,
        category: category.trim() || null,
      })
      .select('id, name')
      .single()
    setSaving(false)
    if (err) { setSaveError(err.message); return }
    onCreated(data)
  }

  return (
    <div className="entry-modal-backdrop" onClick={onCancel}>
      <div className="entry-modal type-form-modal" onClick={(e) => e.stopPropagation()}>
        <div className="form-header">
          <h2 className="form-title">New Type</h2>
          <button type="button" className="form-close" onClick={onCancel} aria-label="Close">×</button>
        </div>

        <div className="form-body">
          <div className="form-section">
            <div className="type-form__mfr-context">
              <span className="type-form__mfr-label">Manufacturer</span>
              <span className="type-form__mfr-name">{manufacturer?.label ?? manufacturer?.name ?? '—'}</span>
            </div>

            <div className="form-group">
              <label className="form-label" htmlFor="type-name-input">Type name *</label>
              <input
                id="type-name-input"
                className="form-input"
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="e.g. A350-900"
                autoComplete="off"
                autoFocus
              />
            </div>

            <div className="form-group">
              <label className="form-label" htmlFor="type-category-input">Category (optional)</label>
              <input
                id="type-category-input"
                className="form-input"
                type="text"
                value={category}
                onChange={(e) => setCategory(e.target.value)}
                placeholder="e.g. Widebody, Narrowbody, Regional"
                autoComplete="off"
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
            {saving ? 'Saving…' : 'Add type'}
          </button>
        </div>
      </div>
    </div>
  )
}
