export const VG_BASE = "https://pub-a6896cffb8174119bc7526118a41f2f0.r2.dev/guide"
export const VG_EXTS = ["PNG", "png", "jpg", "JPG", "jpeg"]

export const VG_SECTIONS = [
  {
    title: "Logging new entries",
    items: [
      { img: "IMG_4829", title: "New Registration - the essentials", caption: "Reg number is the only required field up front. MSN and build month are optional (MMYYYY - use 00 for an unknown month, e.g. 002015). The small FR24 icon beside the reg field opens Flightradar24 preloaded with that exact tail in a new tab - check identity or live status without leaving the form. Then pick the airline." },
      { img: "IMG_4830", title: "New Registration - the sighting", caption: "Date, time-of-day block, southern-hemisphere switch (flips how seasons are counted), airport, statuses. The status toggles do more than tag: with a first-spotted date set, Special livery, Retro, and Alliance each auto-write a remark line like Special livery - Acropolis Museum since 2016-04-10 on save. The livery/alliance name field appears once Special livery or Retro is on, and what you type lands in that line. They are not all independent: the duplicate-registration override (Second Life flow) clears every livery status when engaged. R/S marks removed/stored/scrapped airframes (coral badge); Flown-in records that you flew this aircraft." },
      { img: "IMG_4831", title: "New Registration - the rest", caption: "Airports you type become pills once confirmed with space or comma - tap a pill's x to remove it; multiple airports on one sighting are fine. The ADD NEW chips (Airline / Airport / Manufacturer) open those creation forms right here, so a missing parent never forces you to abandon the entry. Then notes and Save - one form logs the aircraft and its first sighting together." },
      { img: "IMG_4832", title: "New Airline", caption: "Name, optional secondary name, country, logo. Two flags matter later: Ceased operations puts the CLOSED banner on the airline everywhere, and Flown this airline feeds the Flown-in card. Create airlines while online - offline entry can only reference ones that already exist." },
      { img: "IMG_4833", title: "New Airport", caption: "IATA is required - it becomes the code on every airport pill and stat. ICAO, name, country, remarks, and a header image are optional. Same rule: create airports online, before the trip." },
      { img: "IMG_4834", title: "New Manufacturer", caption: "Name and HQ country required; origin country (e.g. Multinational EU), founded year, and logo optional." },
    ],
  },
  {
    title: "Airlines & registrations",
    items: [
      { img: "IMG_4835", title: "Airlines tab, list view", caption: "Every airline with flag, registration count, and the CLOSED banner where operations ceased. The Fitzthespotter+ wordmark top-left is a button - tap it anywhere in the app to open a New Registration. The list/grid toggle switches this view to logo tiles. The A-Z rail jumps to any letter - both directions. The search field filters the list live." },
      { img: "IMG_4836", title: "An airline opened", caption: "The airline's home: Edit opens the Edit Airline form (rename, logo, flags, delete). Manufacturer Breakdown expands into your fleet-by-type counts - types sharing a (family) code in their names combine into one line. Below, every registration as a card - tap any card to open that tail's full profile." },
      { img: "IMG_4837", title: "Edit Airline", caption: "Rename, change country, swap or remove the logo, toggle ceased/flown - and Delete airline lives here (removes the airline; use with care)." },
      { img: "IMG_4838", title: "New Registration from an airline", caption: "Opened from inside an airline, the airline field arrives pre-filled - the fast path when logging a session's haul airline by airline." },
      { img: "IMG_4839", title: "Manufacturer Breakdown expanded", caption: "Your fleet with this airline, counted per type. The counts follow the parentheses grouping: rename types with a shared (family) code and they combine here without touching the data." },
      { img: "IMG_4840", title: "A registration profile", caption: "Top bar: the copy icon copies the registration to your clipboard (for pasting anywhere); Edit opens the full editor. The badges under the tail number are its statuses (see Legend). The camera has two moves: ONE tap flags the registration (the flag shows in Search filters), DOUBLE tap uploads a photo - up to 5 per tail, connection required. The takeoff arrows bottom-left/right jump to the previous/next registration of the SAME airline without going back to the list. Delete registration removes the tail and all its sightings - permanent. In the info rows: MSN is the airframe's serial (it survives reregistration - it powers Second Life); the two ages are how old the aircraft was when you first caught it vs today; Last seen is time since your latest sighting; an amber dot on an airport pill marks where you first spotted it." },
      { img: "IMG_4841", title: "Edit Registration - top", caption: "Fix the reg, MSN, build date, airline, manufacturer or type. + New Sighting logs another encounter with this tail. The FR24 icon works here too - opens the tail on Flightradar24." },
      { img: "IMG_4842", title: "Edit Registration - statuses & sightings", caption: "R/S and flown-in toggles, the remark (auto-written livery lines live here and can be edited), then every sighting listed with its own Edit and Del. The ADD NEW row creates an airline, airport, or manufacturer without leaving the form. Save changes commits everything at once." },
      { img: "IMG_4843", title: "Editing a sighting", caption: "Each sighting has its own date, time block, airport, and livery toggles - including the livery name. Save sighting changes applies to just this sighting; the outer Save changes closes the whole edit." },
      { img: "IMG_4844", title: "New Sighting", caption: "Logging another encounter with a tail you already have - same fields, attached to the existing registration. This is what feeds the reunion math and Last seen." },
      { img: "IMG_4845", title: "The bottom navigation", caption: "Airlines, Airports, Search/Stats, and Desktop - the four homes of the app. Desktop is the data-entry oriented layout for the Mac." },
      { img: "IMG_4846", title: "Airlines tab, grid view", caption: "The same list as logo tiles - switch back and forth any time with the toggle; the A-Z rail works here too." },
    ],
  },
  {
    title: "Airports",
    items: [
      { img: "IMG_4847", title: "Airports tab", caption: "Grouped by country with per-country counts; closed airports carry their banner. Tap any airport for its stats." },
      { img: "IMG_4848", title: "An airport opened", caption: "Runways, how many airlines you have seen here, total sightings, first-here and most-recent dates. The logo gallery is every airline you have caught at this field. Edit opens the airport editor; Show spotting map reveals the satellite map (kept behind a button so the map library only loads when asked)." },
      { img: "IMG_4849", title: "Edit Airport", caption: "Codes, name, country, remarks, header image - and Delete airport (careful: permanent)." },
      { img: "IMG_4850", title: "The spotting map", caption: "Satellite view of the field. + Add pin drops a numbered pin - drag it onto your exact spotting position; pins stay draggable until you lock the view, and the map remembers your saved view and pins next time. Toggle satellite/map with the control bottom-right." },
    ],
  },
  {
    title: "Search, stats home & backup",
    items: [
      { img: "IMG_4851", title: "Search / Stats", caption: "Type any part of a registration to search the whole logbook (registrations only). The filter pills - Special livery, Retro, Livery change, Alliance, Remarks, Flown-in, Flagged, Closed, R/S - toggle on (highlighted) and combine with your text, so Flagged + R/S shows flagged removed airframes. Below: the cards row, led by On this day with its weekly count." },
      { img: "IMG_4852", title: "The cards, continued", caption: "Age, Manufacturers, Notes, Coffee Table, Spotting Through Time, Legend, Guide, and the Offline card (download the whole logbook to the device - see the Guide's Offline chapter for exactly what works without signal)." },
      { img: "IMG_4853", title: "CSV backup", caption: "The cargo-container icon in the top bar exports your whole logbook as a readable CSV - opens in Excel or Numbers. Your data, in your hands; do it now and then." },
      { img: "IMG_4854", title: "Flown-in", caption: "Every airline you have flown on, in one view - fed by the Flown-in toggle on registrations and the flag on airlines." },
    ],
  },
  {
    title: "On this day & Sessions",
    items: [
      { img: "IMG_4855", title: "On this day", caption: "Up to three picks a week from past years, at least a day apart, resetting Monday. Tap the pick body to open that tail's profile. Airfleets and FR24 open preloaded with the registration. Future picks sit blurred until their day - squint if you must. That day's session opens the whole day around the pick." },
      { img: "IMG_4856", title: "That day's session", caption: "The day, reconstructed: firsts pinned on top (first-ever airline or type, tappable to the tail that did it) - or, on days without firsts, the Reunion of the day (the longest gap since you last saw a tail). The timeline lights the hour blocks you were out; TAP a lit block to filter the haul and airline counts to just that block, tap again for the whole day. The haul splits new-that-day (amber) vs seen-before - every chip opens its profile; + N more expands the rest." },
    ],
  },
  {
    title: "Stats & analysis",
    items: [
      { img: "IMG_4857", title: "Milestones", caption: "The counting joys. Registration and Sighting milestones use number chips - preselected to your highest, tap any number to see the tail (or the sighting's airport and tail) that crossed it, tappable to the profile. Airline milestones: pick the airline in the dropdown, filter with All / 50th / 100th. Airports and countries list ascending. Until the primary migration completes these badges can move as history fills in - they settle on their own." },
      { img: "IMG_4858", title: "Spotting Stats - counts", caption: "Total unique registrations, sightings, airlines, manufacturers, types, airports, countries - and the most-spotted of each. The most-spotted rows expand to a top-3." },
      { img: "IMG_4859", title: "Spotting Stats - makers & statuses", caption: "Registrations per manufacturer, and the special-status counts (liveries, retro, alliance, flown-in, remarks)." },
      { img: "IMG_4860", title: "Spotting Stats - through the years", caption: "First and latest spot, unique spotting days, sightings per year, and your busiest days ever." },
      { img: "IMG_4861", title: "Sighting Stats", caption: "Most-sighted registrations, airlines, airports - and the Longest Reunions: the biggest gaps between two of your own sightings of the same tail, each tappable to the profile." },
      { img: "IMG_4862", title: "Second Life", caption: "Airframes logged under more than one airline, matched by MSN - the registration may change; the airframe does not. Tap an airframe to expand every airline it wore, and tap any of those to jump to that registration." },
      { img: "IMG_4863", title: "Coffee Table", caption: "Sightings flagged as book candidates, gathered for the someday photo book - browse by year, with ratings and picks to shortlist the ones that make the cut." },
      { img: "IMG_4864", title: "Notes", caption: "Spotting notes dictated in the field, collected per registration. Each note can be dramatized: the built-in instruction set turns your plain lines into a first-person cinematic story - copy it to your AI chatbot, paste the story back, and it saves alongside the note." },
      { img: "IMG_4865", title: "Notes - the dramatize flow", caption: "The note, the copyable instructions, and the field where the returned story lives." },
      { img: "IMG_4866", title: "Notes - the story", caption: "A saved dramatized story next to its raw note - the coffee-table voice of a plain field observation." },
      { img: "IMG_4867", title: "Spotting Through Time - shares", caption: "When you spot: time-of-day and season, as percentages of all your sightings." },
      { img: "IMG_4868", title: "Spotting Through Time - counts", caption: "Tap any bar to flip between percentages and raw counts." },
      { img: "IMG_4869", title: "Spotting Through Time - months", caption: "The season chart switched to month-by-month - the Seasons/Months toggle above the chart does the switching." },
    ],
  },
]
