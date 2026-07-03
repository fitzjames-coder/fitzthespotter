// Fetch ALL rows for a Supabase query, paging past the ~1000-row API cap.
// makeQuery must return a FRESH Supabase select builder each call.
export async function fetchAllRows(makeQuery, pageSize = 1000) {
  let from = 0
  const all = []
  for (;;) {
    const { data, error } = await makeQuery().range(from, from + pageSize - 1)
    if (error) return { data: null, error }
    const batch = data ?? []
    for (const row of batch) all.push(row)
    if (batch.length < pageSize) break
    from += pageSize
  }
  return { data: all, error: null }
}
