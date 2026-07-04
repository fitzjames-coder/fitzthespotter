export function parenTokens(name) {
  const matches = (name || '').match(/\(([^)]*)\)/g)
  if (!matches) return []
  return matches.map((m) => m.slice(1, -1).trim()).filter(Boolean)
}

export function typeGroupKey(name, manufacturerId) {
  const tokens = parenTokens(name)
  if (tokens.length === 0) return null
  return `${manufacturerId}::${tokens.map((t) => t.toLowerCase()).join('|')}`
}

export function typeGroupLabel(name) {
  return parenTokens(name).join(' ')
}

export function stripTypeParens(name) {
  return (name || '').replace(/[()]/g, '')
}
