const REG_STEPS = [100, 250, 500, 750, 1000]
const SIGHT_STEPS = [500, 1000]
const AIRLINE_STEPS = [50, 100]
const AIRPORT_STEPS = [10, 25, 50]
const COUNTRY_STEPS = [10, 25]

function regSteps(n) {
  const steps = [...REG_STEPS]
  for (let s = 1500; s <= n; s += 500) steps.push(s)
  return steps.filter((s) => s <= n)
}

function sightSteps(n) {
  const steps = [...SIGHT_STEPS]
  for (let s = 2000; s <= n; s += 1000) steps.push(s)
  return steps.filter((s) => s <= n)
}

export function computeMilestones(regs, sightings) {
  const out = []
  const datedRegs = regs
    .filter((r) => r.first_spotted)
    .sort((a, b) => a.first_spotted.localeCompare(b.first_spotted))

  for (const step of regSteps(datedRegs.length)) {
    const r = datedRegs[step - 1]
    out.push({ kind: 'reg', label: `Registration #${step}`, detail: r.registration, date: r.first_spotted, reg: r })
  }

  const datedSightings = sightings
    .filter((s) => s.spotted_on)
    .sort((a, b) => a.spotted_on.localeCompare(b.spotted_on))
  for (const step of sightSteps(datedSightings.length)) {
    const s = datedSightings[step - 1]
    out.push({ kind: 'sight', label: `Sighting #${step}`, detail: s.airport || '', date: s.spotted_on, regId: s.registration_id })
  }

  const byAirline = new Map()
  for (const r of datedRegs) {
    const name = r.airlines?.name
    if (!name) continue
    if (!byAirline.has(name)) byAirline.set(name, [])
    byAirline.get(name).push(r)
  }
  for (const [name, list] of byAirline) {
    for (const step of AIRLINE_STEPS) {
      if (list.length >= step) {
        const r = list[step - 1]
        out.push({ kind: 'airline', label: `${step}th ${name}`, detail: r.registration, date: r.first_spotted, reg: r })
      }
    }
  }

  const seenAirports = new Set()
  for (const s of datedSightings) {
    if (!s.airport || seenAirports.has(s.airport)) continue
    seenAirports.add(s.airport)
    const n = seenAirports.size
    if (AIRPORT_STEPS.includes(n)) {
      out.push({ kind: 'airport', label: `Airport #${n}`, detail: s.airport, date: s.spotted_on })
    }
  }

  const seenCountries = new Set()
  for (const r of datedRegs) {
    const c = r.airlines?.country
    if (!c || seenCountries.has(c)) continue
    seenCountries.add(c)
    const n = seenCountries.size
    if (COUNTRY_STEPS.includes(n)) {
      out.push({ kind: 'country', label: `Country #${n}`, detail: c, date: r.first_spotted, reg: r })
    }
  }

  out.sort((a, b) => b.date.localeCompare(a.date))
  return out
}
