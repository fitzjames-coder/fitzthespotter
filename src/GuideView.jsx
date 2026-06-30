import { useState } from 'react'

const SECTIONS = [
  {
    title: 'Logging a new registration',
    body: [
      'Registrations are the spine of the app — an airline must exist first, then you add its registrations.',
      'Open the airline’s page and tap the REG button (top-right of the banner).',
      'Enter the registration (e.g. EI-DEK), then set the aircraft: pick the manufacturer, then the type.',
      'You can log a first sighting now, or save and add sightings later. Tap Save.',
    ],
  },
  {
    title: 'Adding a sighting',
    body: [
      'A sighting is an airport paired with a date — that pairing is what drives the dates, the gold dot, and the airport pills.',
      'Open the registration, tap Edit, then open the New Sighting panel.',
      'Pick the airport, set the date, choose the time-of-day block, and tick Southern hemisphere only if the sighting was in the southern hemisphere (it flips the seasons).',
      'Optionally set a livery (see Liveries). Tap Log sighting.',
    ],
  },
  {
    title: 'Editing a sighting',
    body: [
      'Open the registration, tap Edit, then expand the sightings list.',
      'Tap Edit on the sighting you want to change. The rich panel opens pre-filled with that sighting’s date, airport, time-of-day and livery.',
      'Change what you need, then tap Save sighting changes. The same sighting is updated — no duplicate is made.',
      'Note: while a sighting form is open, the outer Save changes button is locked, so you can’t lose your sighting by tapping the wrong button. Finish or close the sighting form first.',
    ],
  },
  {
    title: 'Liveries (special, retro, old, alliance)',
    body: [
      'Liveries are set on a sighting (new or edited). Special, Retro and Alliance are mutually exclusive — turning one on turns the others off. Old livery is independent.',
      'When Special or Retro is on, a Livery name field appears (e.g. "Retrojet"). When Alliance is on, pick the alliance.',
      'Saving writes the livery through to the registration, so the badge shows everywhere it should.',
      'History is kept automatically: changing a livery appends an editable remark line ("… since [date]" when added, "Used to wear … until [date]" when removed), using the sighting’s date. Edit that remark before saving if you like.',
    ],
  },
  {
    title: 'Flown-in (aircraft you’ve flown aboard)',
    body: [
      'Flown-in marks a registration you have personally flown aboard.',
      'In Edit Registration, turn on Flown in and set the date.',
      'A seat badge then shows on the registration (and the airline is marked as flown). Tap the badge on the profile to see the date.',
    ],
  },
  {
    title: 'Retired types',
    body: [
      'Retired types are tagged at the airline-and-type level, from the manufacturer page (not per registration).',
      'Open a manufacturer, tap a type tile, then pick the airline to mark that airline’s use of that type as retired.',
      'A red-bordered type pill then appears in that airline’s banner. Long-press it for 1.5 seconds to un-retire.',
      'On any matching registration’s profile, a display-only "Retired" pill shows on the Aircraft row.',
    ],
  },
  {
    title: 'The airport spotting map',
    body: [
      'Each airport profile has a satellite map you reveal with a button (it stays hidden until you open it, so it doesn’t load tiles unnecessarily).',
      'Tap the map to drop a numbered spotting-position pin at a real spot; drag a pin to fine-tune. Pin numbers are permanent.',
      'Use view-lock to save the current centre and zoom as that airport’s default view. Use pin-lock to stop accidental edits once your pins are placed.',
      'Toggle between satellite imagery and the plain map (diagram) view — satellite is the default.',
    ],
  },
  {
    title: 'Notes & the dramatize flow',
    body: [
      'You can write a note tied to a registration. When a note exists, a small amber Note indicator shows by the registration name — tap it to read the note in the spotlight.',
      'The dramatize feature copies a storytelling prompt plus your note to the clipboard, so you can paste it into a chatbot and get a dramatized telling back.',
      'If a registration has a dramatized version, the spotlight shows a Note / Dramatized toggle.',
    ],
  },
  {
    title: 'Reading the symbols',
    body: [
      'Every mark, badge, pill and dot is explained on the Legend page — it sits right next to this Guide in the Search/Stats tab.',
      'Quick reminder on airport pills: the first-spotted airport stays furthest left (blue); the most-recent airport is gold; and when the first and most-recent are the same airport, a small gold dot marks it.',
    ],
  },
  {
    title: 'Spotting Through Time graphs',
    body: [
      'Open the Spotting Through Time card in the Search/Stats tab.',
      'It charts your sightings by time-of-day and by season. Toggle between percentage and count, and between seasons and months.',
    ],
  },
]

function GuideSection({ title, body, open, onToggle }) {
  return (
    <div className={`guide-item${open ? ' guide-item--open' : ''}`}>
      <button type="button" className="guide-item__head" onClick={onToggle} aria-expanded={open}>
        <span className="guide-item__title">{title}</span>
        <span className="guide-item__chevron" aria-hidden="true">{open ? '−' : '+'}</span>
      </button>
      {open && (
        <div className="guide-item__body">
          {body.map((p, i) => (
            <p key={i} className="guide-item__p">{p}</p>
          ))}
        </div>
      )}
    </div>
  )
}

export default function GuideView({ onBack }) {
  const [openIndex, setOpenIndex] = useState(null)
  return (
    <div className="page guide-page">
      <div className="stats-top-bar">
        <button className="stats-top-bar__back" onClick={onBack} aria-label="Back to search">‹ Back</button>
        <h1 className="legend-title">Guide</h1>
      </div>
      <main className="legend-main">
        <p className="legend-intro">How to do the main things in the app. Tap a topic to expand it.</p>
        {SECTIONS.map((s, i) => (
          <GuideSection
            key={i}
            title={s.title}
            body={s.body}
            open={openIndex === i}
            onToggle={() => setOpenIndex(openIndex === i ? null : i)}
          />
        ))}
      </main>
    </div>
  )
}
