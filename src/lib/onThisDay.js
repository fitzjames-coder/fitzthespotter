function hashString(str) {
  let h = 2166136261
  for (let i = 0; i < str.length; i++) {
    h ^= str.charCodeAt(i)
    h = Math.imul(h, 16777619)
  }
  return h >>> 0
}

function mulberry32(seed) {
  let a = seed
  return function () {
    a |= 0
    a = (a + 0x6D2B79F5) | 0
    let t = Math.imul(a ^ (a >>> 15), 1 | a)
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
}

function pad2(n) { return String(n).padStart(2, '0') }

export function weekStartISO(now = new Date()) {
  const d = new Date(now.getFullYear(), now.getMonth(), now.getDate())
  const dow = (d.getDay() + 6) % 7
  d.setDate(d.getDate() - dow)
  return `${d.getFullYear()}-${pad2(d.getMonth() + 1)}-${pad2(d.getDate())}`
}

function weekDates(weekStart) {
  const [y, m, dd] = weekStart.split('-').map(Number)
  const out = []
  for (let i = 0; i < 7; i++) {
    const d = new Date(y, m - 1, dd + i)
    out.push(`${d.getFullYear()}-${pad2(d.getMonth() + 1)}-${pad2(d.getDate())}`)
  }
  return out
}

function shuffleInPlace(arr, rng) {
  for (let i = arr.length - 1; i > 0; i--) {
    const j = Math.floor(rng() * (i + 1))
    const t = arr[i]; arr[i] = arr[j]; arr[j] = t
  }
  return arr
}

export function buildWeekSchedule(sightings, weekStart, mode) {
  const rng = mulberry32(hashString(weekStart + ':' + (mode || 'normal')))
  const dates = weekDates(weekStart)
  const dated = sightings.filter((s) => s.spotted_on)

  if (mode === 'month') {
    const month = dates[0].slice(5, 7)
    const pool = dated.filter((s) => s.spotted_on.slice(5, 7) === month && !dates.includes(s.spotted_on))
    if (pool.length === 0) return { picks: [], empty: true }
    const chosen = shuffleInPlace([...pool], rng).slice(0, 3)
    const slots = [dates[0], dates[2], dates[4]]
    return { picks: chosen.map((s, i) => ({ date: slots[i], sighting: s })), empty: false }
  }

  const byDay = dates.map((date) => ({
    date,
    pool: dated.filter((s) => s.spotted_on.slice(5) === date.slice(5) && s.spotted_on !== date),
  }))
  const candidates = byDay.filter((d) => d.pool.length > 0)
  if (candidates.length === 0) return { picks: [], empty: true }

  const minGap = mode === 'relax' ? 1 : 2
  const order = shuffleInPlace([...candidates], rng)
  const chosenDays = []
  for (const c of order) {
    const idx = dates.indexOf(c.date)
    const ok = chosenDays.every((d) => Math.abs(dates.indexOf(d.date) - idx) >= minGap)
    if (ok) chosenDays.push(c)
    if (chosenDays.length === 3) break
  }
  chosenDays.sort((a, b) => dates.indexOf(a.date) - dates.indexOf(b.date))

  const picks = []
  let prevYear = null
  for (const day of chosenDays) {
    const pool = shuffleInPlace([...day.pool], rng)
    const differentYear = pool.find((s) => s.spotted_on.slice(0, 4) !== prevYear)
    const sighting = differentYear || pool[0]
    prevYear = sighting.spotted_on.slice(0, 4)
    picks.push({ date: day.date, sighting })
  }
  return { picks, empty: false }
}

export function getWeekMode(weekStart) {
  try { return localStorage.getItem('fts-otd-' + weekStart) } catch { return null }
}

export function setWeekMode(weekStart, mode) {
  try { localStorage.setItem('fts-otd-' + weekStart, mode) } catch { /* ignore */ }
}

export function setWeekCount(weekStart, n) {
  try { localStorage.setItem('fts-otd-count-' + weekStart, String(n)) } catch { /* ignore */ }
}

export function getWeekCount(weekStart) {
  try {
    const v = localStorage.getItem('fts-otd-count-' + weekStart)
    return v == null ? null : Number(v)
  } catch { return null }
}

export const OTD_LINKS = [
  { name: 'Airfleets', url: (reg) => 'https://www.airfleets.net/recherche/?key=' + encodeURIComponent(reg) },
  { name: 'FR24', url: (reg) => 'https://www.flightradar24.com/data/aircraft/' + encodeURIComponent(reg.toLowerCase()) },
]
