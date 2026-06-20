export async function exportBackupCsv(supabase) {
  const { data, error } = await supabase
    .from('registrations')
    .select(`
      registration, first_spotted, airports, remark, statuses, flagged, photo_urls,
      airlines ( name, country, is_closed ),
      aircraft_types ( name, manufacturers ( name ) ),
      sightings ( airport, spotted_on )
    `)
    .order('registration', { ascending: true })

  if (error) throw new Error(error.message)

  function q(val) {
    const str = val == null ? '' : String(val)
    return '"' + str.replace(/"/g, '""') + '"'
  }

  const headers = [
    'Registration', 'Airline', 'Airline Country', 'Manufacturer', 'Type',
    'First Spotted', 'Sightings', 'Airport Tags', 'Special Livery', 'Retro',
    'Alliance', 'Flown In', 'Flagged', 'Airline Closed', 'Remark', 'Photo Links',
  ]

  const rows = data.map((reg) => {
    const st = reg.statuses ?? {}

    const sightings = [...(reg.sightings ?? [])].sort((a, b) => {
      if (!a.spotted_on && !b.spotted_on) return 0
      if (!a.spotted_on) return 1
      if (!b.spotted_on) return -1
      return a.spotted_on.localeCompare(b.spotted_on)
    })
    const sightingsStr = sightings
      .map((s) => `${s.spotted_on ?? '(no date)'} @ ${s.airport ?? '?'}`)
      .join('; ')

    return [
      q(reg.registration),
      q(reg.airlines?.name),
      q(reg.airlines?.country),
      q(reg.aircraft_types?.manufacturers?.name),
      q(reg.aircraft_types?.name),
      q(reg.first_spotted),
      q(sightingsStr),
      q((reg.airports ?? []).join('; ')),
      q(st.special_livery ? 'Yes' : ''),
      q(st.retro ? 'Yes' : ''),
      q(st.alliance ? 'Yes' : ''),
      q(st.flown_in ? 'Yes' : ''),
      q(reg.flagged ? 'Yes' : ''),
      q(reg.airlines?.is_closed ? 'Yes' : ''),
      q(reg.remark),
      q((reg.photo_urls ?? []).join('; ')),
    ].join(',')
  })

  const csv = '﻿' + [headers.map(q).join(','), ...rows].join('\r\n')
  const today = new Date().toISOString().slice(0, 10)
  const blob = new Blob([csv], { type: 'text/csv;charset=utf-8' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = `fitzthespotter-backup-${today}.csv`
  document.body.appendChild(a)
  a.click()
  document.body.removeChild(a)
  URL.revokeObjectURL(url)

  return data.length
}
