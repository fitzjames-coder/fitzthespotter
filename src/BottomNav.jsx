const TABS = [
  { id: 'airlines', label: 'Airlines', icon: '/airlines.PNG' },
  { id: 'airports', label: 'Airports', icon: '/airports.PNG' },
  { id: 'search',   label: 'Search',   icon: '/search.PNG'   },
]

export default function BottomNav({ activeTab, navOpen, onLogoTap, onTabChange, desktopMode, onToggleDesktop }) {
  return (
    <>
      <div
        className={`nav-backdrop${navOpen ? ' nav-backdrop--visible' : ''}`}
        onClick={onLogoTap}
        aria-hidden="true"
      />
      <div className={`nav-drawer${navOpen ? ' nav-drawer--open' : ''}`}>
        <div className="nav-bar">
          <img
            className="nav-logo"
            src="/fitzthespotterlogo.PNG"
            alt="Open navigation"
            onClick={onLogoTap}
          />
        </div>
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
          <button
            className={`nav-tab nav-tab--desktop-toggle${desktopMode ? ' nav-tab--desktop-on' : ''}`}
            onClick={onToggleDesktop}
            aria-label={desktopMode ? 'Switch to mobile layout' : 'Switch to desktop layout'}
          >
            <img
              className="nav-tab__icon"
              src="/mark-desktop.png"
              alt=""
              aria-hidden="true"
            />
            <span className="nav-tab__label">Desktop</span>
          </button>
        </div>
      </div>
    </>
  )
}
