import { useEffect, useState } from 'react'
import { downloadAll, tableCounts } from './lib/offlineDownload'
import { idbGet, idbClearAll, estimateBytes } from './lib/offlineStore'
import { writeQueueGetAll, writeQueueRemove } from './lib/writeQueue'
import { commitQueue } from './lib/queueCommit'

function fmtDate(iso) {
  if (!iso) return 'Never'
  const d = new Date(iso)
  return d.toLocaleString([], { year: 'numeric', month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })
}

function fmtMB(bytes) {
  if (bytes == null) return null
  return (bytes / (1024 * 1024)).toFixed(1) + ' MB'
}

export default function OfflineView({ onBack }) {
  const [meta, setMeta] = useState(null)
  const [bytes, setBytes] = useState(null)
  const [running, setRunning] = useState(false)
  const [progress, setProgress] = useState({ done: 0, total: 0 })
  const [delta, setDelta] = useState(null)
  const [error, setError] = useState(null)
  const [pending, setPending] = useState([])
  const [syncing, setSyncing] = useState(false)
  const [syncResults, setSyncResults] = useState(null)
  const online = typeof navigator !== 'undefined' ? navigator.onLine : true

  async function refreshMeta() {
    const m = await idbGet('__meta__')
    setMeta(m)
    setBytes(await estimateBytes())
    if (m && online) {
      try {
        const live = await tableCounts()
        const liveTotal = Object.values(live).reduce((a, b) => a + b, 0)
        setDelta(liveTotal - (m.total ?? 0))
      } catch { setDelta(null) }
    } else {
      setDelta(null)
    }
  }

  async function loadPending() {
    try { setPending(await writeQueueGetAll()) } catch { setPending([]) }
  }

  async function handleDeletePending(id) {
    if (!window.confirm('Delete this pending entry? It will not be added to your logbook.')) return
    await writeQueueRemove(id)
    await loadPending()
  }

  async function handleSyncNow() {
    if (!window.confirm('Commit all pending entries to your logbook now?')) return
    setSyncing(true)
    setSyncResults(null)
    try {
      const results = await commitQueue(() => {})
      setSyncResults(results)
    } catch (e) {
      setSyncResults([{ id: 'err', registration: '', ok: false, reason: (e && e.message) || 'Sync failed' }])
    }
    setSyncing(false)
    await loadPending()
    await refreshMeta()
  }

  useEffect(() => { refreshMeta(); loadPending() }, [])

  async function handleDownload() {
    setRunning(true); setError(null); setProgress({ done: 0, total: 0 })
    try {
      await downloadAll((p) => setProgress(p))
      await refreshMeta()
    } catch (err) {
      setError(err.message || 'Download failed')
    }
    setRunning(false)
  }

  async function handleClear() {
    if (!window.confirm('Delete the offline copy from this device? Your online logbook is not affected.')) return
    await idbClearAll()
    await refreshMeta()
    setDelta(null)
  }

  const isImg = progress.phase === 'images'
  const curCount = isImg ? (progress.imgDone || 0) : (progress.done || 0)
  const totCount = isImg ? (progress.imgTotal || 0) : (progress.total || 0)
  const pct = totCount > 0 ? Math.round((curCount / totCount) * 100) : 0

  return (
    <div className="offline-view">
      <div className="offline-view__head">
        <button className="offline-view__back" onClick={onBack}>‹ Back</button>
        <h2 className="offline-view__title">Offline copy</h2>
      </div>

      <div className="offline-view__body">
        <p className="offline-view__intro">Download your whole logbook to this device so you can view it with no signal.</p>

        {running ? (
          <div className="offline-progress">
            <div className="offline-progress__bar"><div className="offline-progress__fill" style={{ width: pct + '%' }} /></div>
            <div className="offline-progress__label">{isImg ? 'Caching images' : 'Downloading'}… {curCount} / {totCount} {isImg ? 'images' : 'records'} ({pct}%)</div>
          </div>
        ) : (
          <button className="offline-btn offline-btn--primary" onClick={handleDownload} disabled={!online}>
            {meta ? 'Refresh offline copy' : 'Download for offline'}
          </button>
        )}
        {!online && !running && <p className="offline-note">You're offline — connect to download or refresh.</p>}
        {error && <p className="offline-note offline-note--err">{error}</p>}

        <div className="offline-stat"><span>Last downloaded</span><b>{fmtDate(meta?.downloaded_at)}</b></div>
        <div className="offline-stat">
          <span>Since then</span>
          <b>{!meta ? '—' : !online ? 'Offline — cannot check' : delta == null ? '—' : delta > 0 ? `${delta} new entries added` : 'Up to date'}</b>
        </div>
        <div className="offline-stat"><span>Space used (approx.)</span><b>{fmtMB(bytes) ?? 'Unavailable'}</b></div>

        <div className="offline-pending">
          <h3 className="offline-pending__title">Pending entries ({pending.length})</h3>
          {pending.length > 0 && online && !syncing && (
            <button className="offline-btn offline-btn--primary" onClick={handleSyncNow}>Sync now — commit {pending.length} {pending.length === 1 ? 'entry' : 'entries'}</button>
          )}
          {pending.length > 0 && !online && (
            <p className="offline-pending__empty">Connect to the internet to sync these entries.</p>
          )}
          {syncing && <p className="offline-pending__empty">Syncing…</p>}
          {syncResults && (
            <div className="offline-sync-results">
              {syncResults.map((r) => (
                <p key={r.id} className={r.ok ? 'offline-sync-results__ok' : 'offline-sync-results__fail'}>
                  {r.ok ? '✓' : '✗'} {r.registration || '(entry)'}{r.ok ? ' — added to your logbook' : ' — ' + r.reason}
                </p>
              ))}
            </div>
          )}
          {pending.length === 0 ? (
            <p className="offline-pending__empty">No entries waiting. New registrations saved while offline appear here.</p>
          ) : (
            pending.map((p) => (
              <div key={p.id} className="offline-pending__row">
                <div className="offline-pending__info">
                  <b>{p.registration || '(no reg)'}</b>
                  <span>{p.sighting?.spotted_on || 'no date'} · {(p.sighting?.airports || []).filter(Boolean).join(', ') || 'no airport'}</span>
                </div>
                <button className="offline-pending__del" onClick={() => handleDeletePending(p.id)} aria-label="Delete pending entry">Delete</button>
              </div>
            ))
          )}
        </div>

        {meta && (
          <button className="offline-btn offline-btn--clear" onClick={handleClear} disabled={running}>Clear offline copy</button>
        )}
      </div>
    </div>
  )
}
