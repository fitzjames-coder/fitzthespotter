import { useEffect, useRef, useState } from 'react'

export default function TypeaheadPicker({ placeholder, value, onSelect, fetchOptions, disabled, onAddNew, addNewLabel }) {
  const [query, setQuery] = useState('')
  const [options, setOptions] = useState([])
  const [open, setOpen] = useState(false)
  const [highlight, setHighlight] = useState(-1)
  const containerRef = useRef(null)
  const inputRef = useRef(null)
  const timerRef = useRef(null)

  const isDesktop = () => !!containerRef.current?.closest('.desktop-mode')

  useEffect(() => {
    function onOutsideClick(e) {
      if (containerRef.current && !containerRef.current.contains(e.target)) {
        setOpen(false)
        setHighlight(-1)
      }
    }
    document.addEventListener('mousedown', onOutsideClick)
    return () => document.removeEventListener('mousedown', onOutsideClick)
  }, [])

  useEffect(() => {
    if (!value) setQuery('')
  }, [value])

  const displayValue = value ? value.label : query

  function handleFocus() {
    if (value) {
      setTimeout(() => inputRef.current?.select(), 0)
    }
  }

  function handleChange(e) {
    const q = e.target.value
    setQuery(q)
    if (value) onSelect(null)
    clearTimeout(timerRef.current)
    if (!q.trim()) {
      setOptions([])
      setOpen(false)
      setHighlight(-1)
      return
    }
    timerRef.current = setTimeout(async () => {
      const results = await fetchOptions(q.trim())
      setOptions(results)
      setOpen(true)
      setHighlight(isDesktop() && results.length > 0 ? 0 : -1)
    }, 220)
  }

  function handleKeyDown(e) {
    if (!isDesktop() || !open || options.length === 0) return
    if (e.key === 'ArrowDown') {
      e.preventDefault()
      setHighlight((h) => Math.min(h + 1, options.length - 1))
    } else if (e.key === 'ArrowUp') {
      e.preventDefault()
      setHighlight((h) => Math.max(h - 1, 0))
    } else if (e.key === 'Enter') {
      if (highlight >= 0) {
        e.preventDefault()
        pick(options[highlight])
      }
    } else if (e.key === 'Tab') {
      if (highlight >= 0) {
        pick(options[highlight])
        // no preventDefault — let Tab move focus naturally
      }
    } else if (e.key === 'Escape') {
      e.preventDefault()
      setOpen(false)
      setHighlight(-1)
    }
  }

  function pick(option) {
    onSelect(option)
    setQuery(option.label)
    setOpen(false)
    setOptions([])
    setHighlight(-1)
  }

  function clear(e) {
    e.stopPropagation()
    onSelect(null)
    setQuery('')
    setOptions([])
    setOpen(false)
    setHighlight(-1)
    inputRef.current?.focus()
  }

  return (
    <div className="typeahead" ref={containerRef}>
      <div className="typeahead__wrap">
        <input
          ref={inputRef}
          className="form-input"
          type="text"
          placeholder={placeholder}
          value={displayValue}
          onChange={handleChange}
          onFocus={handleFocus}
          onKeyDown={handleKeyDown}
          disabled={disabled}
          autoComplete="off"
        />
        {value && (
          <button
            type="button"
            className="typeahead__clear"
            onMouseDown={clear}
            aria-label="Clear selection"
          >
            ×
          </button>
        )}
      </div>
      {open && (
        <div className="typeahead__dropdown">
          {options.length === 0 ? (
            <>
              <div className="typeahead__empty">No results</div>
              {onAddNew && query.trim() && (
                <div
                  className="typeahead__add-new"
                  onMouseDown={() => { setOpen(false); onAddNew(query.trim()) }}
                >
                  + {addNewLabel ?? 'Add new'} &ldquo;{query.trim()}&rdquo;
                </div>
              )}
            </>
          ) : (
            options.map((opt, i) => (
              <div
                key={opt.id}
                className={`typeahead__option${i === highlight ? ' is-highlighted' : ''}`}
                onMouseDown={() => pick(opt)}
              >
                {opt.label}
              </div>
            ))
          )}
        </div>
      )}
    </div>
  )
}
