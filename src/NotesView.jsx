import { useEffect, useState } from 'react'
import { supabase } from './lib/supabaseClient'

const DRAMATIZE_INSTRUCTIONS = `You are writing for an aviation photography coffee-table book and social posts. I'll give you a raw spotting note I dictated in the field, and sometimes a photo of the aircraft. Your job is to transform those few plain lines into a short, cinematic, edge-of-your-seat piece of storytelling — written in my first-person voice as the spotter.

The reader should feel they are standing beside me: the waiting, the doubt, the heat or cold, the first sight of it, the moment it arrives. This is storytelling, not a caption — make those few lines breathe.

If I include a photo, use it for atmosphere only — the light, sky, weather, the aircraft's attitude and angle, the setting and mood. Describe what you can genuinely see.

Truth is non-negotiable — and it is also where the drama lives:
- Use ONLY the facts in my note (plus what is genuinely visible in the photo as mood/scenery). Do NOT add aircraft details, engine count, manufacturer, nationality, era, history, rarity, route, or specs from your own knowledge — not even if you're sure they're true.
- Never read identity facts off the photo. Do NOT infer or state the registration, airline, or aircraft type from the image — those come only from my note. If my note doesn't give them, don't name them.
- Create drama from the REAL moment, never from invented facts: the wait, the anticipation, the conditions, the doubt, the scale, the relief. Expand what I actually felt, saw, and photographed — do not fabricate what I didn't.
- Keep the registration, aircraft type, and place names exactly as I wrote them.

Structure — shape it as a compressed narrative arc. This is the craft that makes it land:
- Open in the middle of the moment (in medias res): a hook that drops the reader into the pursuit or the wait — not into backstory. Imply any backstory in a line; don't narrate it.
- Rising tension: build through the real wait — the doubt, the conditions, the delays, the tracking — each setback raising the stakes.
- The turn: the pivot from doubt to arrival, the instant it appears. This is the peak — let it hit.
- Resolution: do NOT stop on the catch. Let the tension fall away — the quiet after, the relief, what the catch actually meant to me. Close on a resonant final line: an image or reflection that echoes the opening and gives a real sense of completion. Never end flat on "I found it," "caught at last," or a summary.
- Rhythm: vary sentence length. Short, clipped lines for tension; longer ones to breathe. A short line after a long one lands like a beat.

Style:
- Cinematic and immersive, but never purple or overwrought. Earn the emotion; show, don't tell.
- Use my real spotter's vocabulary where it fits the moment and is true: opening Flightradar24, checking the radar, tracking the inbound, finals, on stand, holding, taxiing. Plain, authentic spotter language — not airline-brochure or news-anchor phrasing.
- No clichés ("majestic bird", "kissed the runway", "aviation enthusiast").
- Length should fit the moment — a tight, vivid piece, usually one to two short paragraphs.
- Return only the finished piece, nothing else.

Here is my note (photo may follow):`

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
