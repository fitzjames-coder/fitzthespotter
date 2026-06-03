import { useEffect, useRef, useState } from 'react'

export default function TypeaheadPicker({ placeholder, value, onSelect, fetchOptions, disabled, openOnFocus = false }) {
  const [query, setQuery] = useState('')
  const [options, setOptions] = useState([])
  const [open, setOpen] = useState(false)
  const containerRef = useRef(null)
  const inputRef = useRef(null)
  const timerRef = useRef(null)

  useEffect(() => {
    function onOutsideClick(e) {
      if (containerRef.current && !containerRef.current.contains(e.target)) {
        setOpen(false)
      }
    }
    document.addEventListener('mousedown', onOutsideClick)
    return () => document.removeEventListener('mousedown', onOutsideClick)
  }, [])

  useEffect(() => {
    if (!value) setQuery('')
  }, [value])

  const displayValue = value ? value.label : query

  async function loadAll() {
    const results = await fetchOptions('')
    setOptions(results)
    setOpen(true)
  }

  function handleFocus() {
    if (value) {
      setTimeout(() => inputRef.current?.select(), 0)
    }
    if (openOnFocus) {
      loadAll()
    }
  }

  function handleChange(e) {
    const q = e.target.value
    setQuery(q)
    if (value) onSelect(null)
    clearTimeout(timerRef.current)
    if (!q.trim()) {
      if (openOnFocus) {
        loadAll()
      } else {
        setOptions([])
        setOpen(false)
      }
      return
    }
    timerRef.current = setTimeout(async () => {
      const results = await fetchOptions(q.trim())
      setOptions(results)
      setOpen(true)
    }, 220)
  }

  function pick(option) {
    onSelect(option)
    setQuery(option.label)
    setOpen(false)
    setOptions([])
  }

  function clear(e) {
    e.stopPropagation()
    onSelect(null)
    setQuery('')
    setOptions([])
    setOpen(false)
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
            <div className="typeahead__empty">No results</div>
          ) : (
            options.map((opt) => (
              <div
                key={opt.id}
                className="typeahead__option"
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
