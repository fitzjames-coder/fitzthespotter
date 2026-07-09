export function computeSession(dateISO, sightings, regs) {
  const regById = new Map(regs.map((r) => [r.id, r]))
  const daySightings = sightings.filter((s) => s.spotted_on === dateISO)

  const airports = [...new Set(daySightings.map((s) => s.airport).filter(Boolean))]
  const blocksUsed = new Set(daySightings.map((s) => s.time_block).filter(Boolean))

  const dayRegIds = [...new Set(daySightings.map((s) => s.registration_id))]
  const dayRegs = dayRegIds.map((id) => regById.get(id)).filter(Boolean)
  const newRegs = dayRegs.filter((r) => r.first_spotted === dateISO)
  const seenRegs = dayRegs.filter((r) => r.first_spotted !== dateISO)

  const airlineCounts = new Map()
  for (const r of dayRegs) {
    const name = r.airlines?.name
    if (!name) continue
    airlineCounts.set(name, (airlineCounts.get(name) || 0) + 1)
  }
  const topAirlines = [...airlineCounts.entries()].sort((a, b) => b[1] - a[1]).slice(0, 3)

  const firstAirlineDate = new Map()
  const firstTypeDate = new Map()
  for (const r of regs) {
    if (!r.first_spotted) continue
    const al = r.airlines?.name
    if (al) {
      const cur = firstAirlineDate.get(al)
      if (!cur || r.first_spotted < cur.date || (r.first_spotted === cur.date && r.id < cur.reg.id)) {
        firstAirlineDate.set(al, { date: r.first_spotted, reg: r })
      }
    }
    const ty = r.aircraft_types?.name
    if (ty) {
      const cur = firstTypeDate.get(ty)
      if (!cur || r.first_spotted < cur.date || (r.first_spotted === cur.date && r.id < cur.reg.id)) {
        firstTypeDate.set(ty, { date: r.first_spotted, reg: r })
      }
    }
  }
  const firsts = []
  for (const [name, info] of firstAirlineDate) {
    if (info.date === dateISO) firsts.push({ kind: 'FIRST AIRLINE', name, reg: info.reg })
  }
  for (const [name, info] of firstTypeDate) {
    if (info.date === dateISO) firsts.push({ kind: 'FIRST TYPE', name, reg: info.reg })
  }

  return { airports, total: dayRegs.length, blocksUsed, newRegs, seenRegs, topAirlines, firsts }
}
