const TABS = [
  { id: 'airlines', label: 'Airlines', icon: '/airlines.PNG' },
  { id: 'stats',    label: 'Stats',    icon: '/stats.PNG'    },
  { id: 'airports', label: 'Airports', icon: '/airports.PNG' },
  { id: 'search',   label: 'Search',   icon: '/search.PNG'   },
]

export default function BottomNav({ activeTab, navOpen, onLogoTap, onTabChange }) {
  return (
    <>
      <div
        className={`nav-backdrop${navOpen ? ' nav-backdrop--visible' : ''}`}
        onClick={onLogoTap}
        aria-hidden="true"
      />
      <div className="nav-shell">
        <div className="nav-tabs">
          {TABS.map((tab) => (
            <button
              key={tab.id}
              className={`nav-tab${activeTab === tab.id ? ' nav-tab--active' : ''}`}
              onClick={() => onTabChange(tab.id)}
            >
              <img
                className="nav-tab__icon"
                src={tab.icon}
                alt=""
                aria-hidden="true"
              />
              <span className="nav-tab__label">{tab.label}</span>
            </button>
          ))}
        </div>
        <div className={`nav-bar${navOpen ? ' nav-bar--open' : ''}`}>
          <img
            className="nav-logo"
            src="/fitzthespotterlogo.PNG"
            alt="Open navigation"
            onClick={onLogoTap}
          />
        </div>
      </div>
    </>
  )
}
