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

export function baseTypeName(name) {
  return (name || '').replace(/\([^)]*\)/g, '').replace(/\s+/g, ' ').trim()
}

export function effectiveGroupKey(type, manufacturerId) {
  const cat = type.category ? type.category.trim() : ''
  if (cat) return `cat::${cat}`
  return `${manufacturerId}::base::${baseTypeName(type.name).toLowerCase()}`
}

export function effectiveGroupLabel(type) {
  const cat = type.category ? type.category.trim() : ''
  if (cat) return cat
  return baseTypeName(type.name)
}
