import { useEffect, useState } from 'react'
import { supabase } from './lib/supabaseClient'

const DRAMATIZE_INSTRUCTIONS = `You are helping me write evocative captions for an aviation photography project — a coffee-table book and social posts about plane spotting. I'll give you a raw spotting note I dictated in the field.

Rewrite it into a vivid, atmospheric short paragraph in my first-person voice as the spotter — capturing the anticipation, the conditions, and why the catch mattered.

Hard rules — these override everything:
- Use ONLY the facts in my note. Do NOT add any aircraft detail, engine count, manufacturer, nationality, era, history, rarity, route, or technical spec from your own knowledge — not even if you are certain it is true. I add real facts myself; your job is mood, not facts.
- Embellish the atmosphere and the moment only, never the facts. If a detail is not in my note, it cannot appear in the caption.
- Keep the registration, aircraft type, and place names exactly as I wrote them.
- If my note is short, keep the caption short. Do not pad length with outside facts — a tight two true sentences beat six with invented detail.
- Evocative, not purple. Avoid clichés ("majestic bird", "kissed the runway").
- Return only the rewritten paragraph, nothing else.

Here is my note:`

export default function NotesView({ onBack }) {
  const [notes, setNotes] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [mode, setMode] = useState('list')
  const [editingId, setEditingId] = useState(null)
  const [regInput, setRegInput] = useState('')
  const [bodyInput, setBodyInput] = useState('')
  const [dramatizedInput, setDramatizedInput] = useState('')
  const [copied, setCopied] = useState(null)
  const [saving, setSaving] = useState(false)
  const [saveError, setSaveError] = useState(null)
  const [deleting, setDeleting] = useState(false)

  function fetchNotes() {
    setLoading(true)
    supabase
      .from('notes')
      .select('id, registration, note_body, dramatized_body, created_at, updated_at')
      .order('updated_at', { ascending: false })
      .then(({ data, error: err }) => {
        if (err) setError(err.message)
        else setNotes(data ?? [])
        setLoading(false)
      })
  }

  useEffect(() => { fetchNotes() }, [])

  function openNew() {
    setEditingId(null)
    setRegInput('')
    setBodyInput('')
    setDramatizedInput('')
    setCopied(null)
    setSaveError(null)
    setMode('editor')
  }

  function openNote(note) {
    setEditingId(note.id)
    setRegInput(note.registration ?? '')
    setBodyInput(note.note_body ?? '')
    setDramatizedInput(note.dramatized_body ?? '')
    setCopied(null)
    setSaveError(null)
    setMode('editor')
  }

  function backToList() {
    setMode('list')
    setEditingId(null)
  }

  async function copyText(text, which) {
    try {
      await navigator.clipboard.writeText(text ?? '')
      setCopied(which)
      setTimeout(() => setCopied(null), 1500)
    } catch {
      setCopied(null)
    }
  }

  async function handleSave() {
    const reg = regInput.trim()
    if (!reg) { setSaveError('Registration is required.'); return }
    setSaving(true)
    setSaveError(null)
    if (editingId) {
      const { error: err } = await supabase
        .from('notes')
        .update({
          registration: reg,
          note_body: bodyInput,
          dramatized_body: dramatizedInput,
          updated_at: new Date().toISOString(),
        })
        .eq('id', editingId)
      setSaving(false)
      if (err) { setSaveError(err.message); return }
    } else {
      const { error: err } = await supabase
        .from('notes')
        .insert({ registration: reg, note_body: bodyInput })
      setSaving(false)
      if (err) { setSaveError(err.message); return }
    }
    fetchNotes()
    backToList()
  }

  async function handleDelete() {
    if (!editingId) return
    setDeleting(true)
    const { error: err } = await supabase.from('notes').delete().eq('id', editingId)
    setDeleting(false)
    if (err) { setSaveError(err.message); return }
    fetchNotes()
    backToList()
  }

  if (mode === 'editor') {
    return (
      <div className="page notes-page">
        <header className="stats-top-bar">
          <button className="stats-top-bar__back" onClick={backToList} aria-label="Back to notes">‹ Back</button>
          <span className="notes-editor__heading">{editingId ? 'Edit Note' : 'New Note'}</span>
        </header>
        <main className="content notes-content">
          <label className="notes-label" htmlFor="note-reg">Registration</label>
          <input
            id="note-reg"
            className="notes-input"
            type="text"
            value={regInput}
            onChange={(e) => setRegInput(e.target.value)}
            placeholder="e.g. CU-T1251"
            autoComplete="off"
            autoCapitalize="characters"
          />
          <label className="notes-label" htmlFor="note-body">Note</label>
          <textarea
            id="note-body"
            className="notes-textarea"
            value={bodyInput}
            onChange={(e) => setBodyInput(e.target.value)}
            placeholder="Type or dictate your note…"
            rows={10}
          />
          {editingId && (
            <div className="notes-dramatize">
              <div className="notes-dramatize__bar">
                <button
                  className="notes-copybtn"
                  onClick={() => copyText(DRAMATIZE_INSTRUCTIONS, 'instructions')}
                >
                  {copied === 'instructions' ? 'Copied!' : 'Copy Instructions'}
                </button>
                <button
                  className="notes-copybtn"
                  onClick={() => copyText(bodyInput, 'note')}
                >
                  {copied === 'note' ? 'Copied!' : 'Copy Note'}
                </button>
              </div>
              <label className="notes-label" htmlFor="note-dramatized">Dramatized</label>
              <textarea
                id="note-dramatized"
                className="notes-textarea"
                value={dramatizedInput}
                onChange={(e) => setDramatizedInput(e.target.value)}
                placeholder="Paste the dramatized version here…"
                rows={8}
              />
            </div>
          )}
          {saveError && <p className="notes-error">{saveError}</p>}
          <div className="notes-actions">
            <button className="notes-save" onClick={handleSave} disabled={saving}>
              {saving ? 'Saving…' : 'Save'}
            </button>
            {editingId && (
              <button className="notes-delete" onClick={handleDelete} disabled={deleting}>
                {deleting ? 'Deleting…' : 'Delete'}
              </button>
            )}
          </div>
        </main>
      </div>
    )
  }

  return (
    <div className="page notes-page">
      <header className="stats-top-bar">
        <button className="stats-top-bar__back" onClick={onBack} aria-label="Back to search">‹ Back</button>
        <button className="notes-newbtn" onClick={openNew}>+ New Note</button>
      </header>
      <main className="content notes-content">
        <div className="notes-header">
          <p className="search-kicker">SPOTTING NOTES</p>
          <h1 className="search-title"><span className="search-title--cream">Notes</span></h1>
        </div>
        {loading ? (
          <p className="search-state">Loading…</p>
        ) : error ? (
          <p className="search-state search-state--error">{error}</p>
        ) : notes.length === 0 ? (
          <p className="search-state">No notes yet. Tap "+ New Note" to start.</p>
        ) : (
          <div className="notes-list">
            {notes.map((note) => (
              <button key={note.id} className="stats-card notes-card" onClick={() => openNote(note)}>
                <span className="notes-card__body">
                  <span className="notes-card__reg">{note.registration}</span>
                  {note.note_body && <span className="notes-card__snippet">{note.note_body}</span>}
                </span>
                <span className="stats-card__chevron" aria-hidden="true">›</span>
              </button>
            ))}
          </div>
        )}
      </main>
    </div>
  )
}
