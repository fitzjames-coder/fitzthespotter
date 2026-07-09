export const VG_BASE = "https://pub-a6896cffb8174119bc7526118a41f2f0.r2.dev/guide"
export const VG_EXTS = ["PNG", "png", "jpg", "JPG", "jpeg"]

export const VG_SECTIONS = [
  {
    title: "Logging new entries",
    items: [
      { img: "IMG_4829", title: "New Registration - the essentials", caption: "Registration number, optional MSN and build month (MMYYYY, 00 for an unknown month), then the airline. The reg number is the only thing the form insists on up front." },
      { img: "IMG_4830", title: "New Registration - the sighting", caption: "Date, the time-of-day block, southern-hemisphere flip, the airport (space or comma to confirm), and the status toggles: R/S, special livery, retro, livery change, alliance, flown-in." },
      { img: "IMG_4831", title: "New Registration - the rest", caption: "The remainder of the form: notes and save. One form logs the aircraft and its first sighting together." },
      { img: "IMG_4832", title: "New Airline", caption: "Name, optional secondary name, country, logo upload, and the ceased-operations / flown-this-airline flags. Add airlines while online - offline entry can only reference airlines that already exist." },
      { img: "IMG_4833", title: "New Airport", caption: "IATA (required), optional ICAO, name, country, remarks, and a header image. Same rule: create airports online, before the trip." },
      { img: "IMG_4834", title: "New Manufacturer", caption: "Name, HQ country, optional origin and founded year, logo." },
    ],
  },
  {
    title: "Airlines & registrations",
    items: [
      { img: "IMG_4835", title: "Airlines tab, list view", caption: "Every airline with flag, registration count, and a CLOSED banner where operations ceased. The A-Z rail on the right jumps to any letter - both directions." },
      { img: "IMG_4836", title: "An airline opened", caption: "Header with logo, country, regs-logged and sightings counts, then the registration cards with their type templates." },
      { img: "IMG_4837", title: "Edit Airline", caption: "Rename, change country, swap the logo, toggle ceased or flown - and the delete lives here too." },
      { img: "IMG_4838", title: "New Registration from inside an airline", caption: "Opened from the airline page, the airline field arrives pre-filled - the fast path during a session at the fence." },
      { img: "IMG_4839", title: "Manufacturer Breakdown", caption: "Expanded on the airline page: the fleet you have logged, counted per type. Types sharing a (family) code in their name combine here." },
      { img: "IMG_4840", title: "A registration profile", caption: "The heart of the logbook: type, MSN, both ages (at first spotting and current), airports, sighting count, first and last spotted - and how long since you last saw it." },
      { img: "IMG_4841", title: "Edit Registration - top", caption: "Fix the reg, MSN, build date, airline, manufacturer or type - and + New Sighting to log another encounter." },
      { img: "IMG_4842", title: "Edit Registration - statuses & sightings", caption: "R/S and flown-in toggles, the remark, every sighting listed with Edit/Del, and the ADD NEW shortcuts to create an airline, airport, or manufacturer without leaving the form." },
      { img: "IMG_4843", title: "Editing a sighting", caption: "Date, time block, airport, and the livery toggles - including the livery name." },
      { img: "IMG_4844", title: "New Sighting", caption: "Logging another encounter with a tail you already have - same fields, attached to the existing registration." },
      { img: "IMG_4845", title: "The bottom navigation", caption: "Airlines, Airports, Search/Stats, and Desktop - the four homes of the app." },
      { img: "IMG_4846", title: "Airlines tab, grid view", caption: "The same list as logo tiles - switchable any time." },
    ],
  },
  {
    title: "Airports",
    items: [
      { img: "IMG_4847", title: "Airports tab", caption: "Grouped by country with counts, each airport carrying its closed banner where relevant." },
      { img: "IMG_4848", title: "An airport opened", caption: "Runways, airlines-seen and sightings counts, first-here and most-recent dates, the airline logo gallery - and the button that reveals the spotting map." },
      { img: "IMG_4849", title: "Edit Airport", caption: "Codes, name, country, remarks, and the header image." },
      { img: "IMG_4850", title: "The spotting map", caption: "Satellite view of the field with your saved pins - add a pin at your spotting position and the view is remembered." },
    ],
  },
  {
    title: "Search, stats home & backup",
    items: [
      { img: "IMG_4851", title: "Search / Stats", caption: "Search across every registration with quick filter chips (special livery, retro, R/S, flagged...) - and below, the cards row, led by On this day with its weekly count." },
      { img: "IMG_4852", title: "The cards, continued", caption: "Age, Manufacturers, Notes, Coffee Table, Spotting Through Time, Legend, Guide, and the Offline card." },
      { img: "IMG_4853", title: "CSV backup", caption: "The cargo-container icon in the top bar exports your whole logbook as a readable CSV - opens in Excel or Numbers. Your data, in your hands." },
      { img: "IMG_4854", title: "Flown-in", caption: "Every airline you have flown on, in one view - fed by the flown-in toggle on registrations." },
    ],
  },
  {
    title: "On this day & Sessions",
    items: [
      { img: "IMG_4855", title: "On this day", caption: "Up to three picks a week from past years, each with its year, the tail, and Airfleets/FR24 links preloaded with the registration. Future picks stay blurred until their day. Resets Monday." },
      { img: "IMG_4856", title: "That day's session", caption: "The whole day around a pick: firsts pinned on top, the time-block timeline (tap a lit block to filter the haul to it), the haul split into new-that-day vs seen-before, and the day's airlines." },
    ],
  },
  {
    title: "Stats & analysis",
    items: [
      { img: "IMG_4857", title: "Milestones", caption: "The counting joys: registration and sighting milestones with number chips, per-airline 50th/100th behind the dropdown, airports and countries. Each anchored to the tail that crossed it - and until the primary migration completes, these badges can move as history fills in." },
      { img: "IMG_4858", title: "Spotting Stats - counts", caption: "Total unique registrations, sightings, airlines, manufacturers, types, airports, countries - and the most-spotted of each." },
      { img: "IMG_4859", title: "Spotting Stats - makers & statuses", caption: "Registrations per manufacturer, and the special-status counts (liveries, retro, alliance, flown-in, remarks)." },
      { img: "IMG_4860", title: "Spotting Stats - through the years", caption: "First and latest spot, unique spotting days, sightings per year, and your busiest days ever." },
      { img: "IMG_4861", title: "Sighting Stats", caption: "Most-sighted registrations, airlines, airports - and the Longest Reunions: the biggest gaps between two of your own sightings of the same tail." },
      { img: "IMG_4862", title: "Second Life", caption: "Airframes logged under more than one airline, matched by MSN - the registration may change; the airframe does not." },
      { img: "IMG_4863", title: "Coffee Table", caption: "Sightings flagged as book candidates, gathered for the someday photo book." },
      { img: "IMG_4864", title: "Notes", caption: "Spotting notes saved on sightings, collected in one place - each can be dramatized into a story." },
      { img: "IMG_4865", title: "Notes, continued", caption: "The note detail and its dramatized story." },
      { img: "IMG_4866", title: "Notes, continued", caption: "More of the notes flow." },
      { img: "IMG_4867", title: "Spotting Through Time - shares", caption: "When you spot: time-of-day and season, as percentages." },
      { img: "IMG_4868", title: "Spotting Through Time - counts", caption: "Tap any bar to flip between percentages and raw counts." },
      { img: "IMG_4869", title: "Spotting Through Time - months", caption: "The season chart switched to month-by-month." },
    ],
  },
]
