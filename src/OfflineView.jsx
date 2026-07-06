import { useEffect, useState } from 'react'
import { downloadAll, tableCounts } from './lib/offlineDownload'
import { idbGet, idbClearAll, estimateBytes } from './lib/offlineStore'

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

  useEffect(() => { refreshMeta() }, [])

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

  const pct = progress.total > 0 ? Math.round((progress.done / progress.total) * 100) : 0

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
            <div className="offline-progress__label">Downloading… {progress.done} / {progress.total} records ({pct}%)</div>
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

        {meta && (
          <button className="offline-btn offline-btn--clear" onClick={handleClear} disabled={running}>Clear offline copy</button>
        )}
      </div>
    </div>
  )
}
