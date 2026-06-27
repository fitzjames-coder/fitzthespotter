export const TIME_BLOCKS = [
  { key: 'morning', label: 'Morning', range: '05–11' },
  { key: 'midday', label: 'Midday', range: '11–14' },
  { key: 'afternoon', label: 'Afternoon', range: '14–18' },
  { key: 'evening', label: 'Evening', range: '18–21' },
  { key: 'night', label: 'Night', range: '21–05' },
]

export default function TimeBlockPicker({ value, onChange }) {
  return (
    <div className="timeblock-pills">
      {TIME_BLOCKS.map((b) => (
        <button
          type="button"
          key={b.key}
          className={`timeblock-pill${value === b.key ? ' timeblock-pill--on' : ''}`}
          onClick={() => onChange(value === b.key ? '' : b.key)}
        >
          {b.label}<span className="timeblock-pill__range">{b.range}</span>
        </button>
      ))}
    </div>
  )
}
