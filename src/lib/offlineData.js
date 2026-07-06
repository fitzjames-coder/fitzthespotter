import { idbGet } from './offlineStore'

export async function offlineAirlinesTab() {
  const airlines = await idbGet('airlines')
  if (!airlines) return null
  const registrations = (await idbGet('registrations')) || []
  const counts = {}
  for (const r of registrations) counts[r.airline_id] = (counts[r.airline_id] ?? 0) + 1
  return { airlines, counts }
}
