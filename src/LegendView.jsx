import markRemark from './assets/marks/mark-remark.png'
import markSpecialLivery from './assets/marks/mark-special-livery.png'
import markRetro from './assets/marks/mark-retro.png'
import markOldLivery from './assets/marks/mark-old-livery.png'
import markFlownIn from './assets/marks/mark-flown-in.png'
import allianceStar from './assets/marks/mark-alliance-star.png'
import allianceSkyteam from './assets/marks/mark-alliance-skyteam.png'
import allianceOneworld from './assets/marks/mark-alliance-oneworld.png'
import cameraIcon from './assets/marks/mark-camera.png'
import cameraOffIcon from './assets/marks/mark-camera-off.png'

function ImgRow({ src, name, desc }) {
  return (
    <div className="legend-row">
      <div className="legend-row__icon"><img src={src} alt={name} /></div>
      <div className="legend-row__text">
        <p className="legend-row__name">{name}</p>
        <p className="legend-row__desc">{desc}</p>
      </div>
    </div>
  )
}

function SwatchRow({ className, label, name, desc, dot }) {
  return (
    <div className="legend-row">
      <div className="legend-row__icon">
        <span className={className}>{label}{dot && <span className="airport-pill__recent" />}</span>
      </div>
      <div className="legend-row__text">
        <p className="legend-row__name">{name}</p>
        <p className="legend-row__desc">{desc}</p>
      </div>
    </div>
  )
}

export default function LegendView({ onBack }) {
  return (
    <div className="page legend-page">
      <div className="stats-top-bar">
        <button className="stats-top-bar__back" onClick={onBack} aria-label="Back to search">‹ Back</button>
        <h1 className="legend-title">Legend</h1>
      </div>
      <main className="legend-main">
        <p className="legend-intro">Every symbol used across the app, and what it means.</p>

        <h2 className="legend-section">Status marks</h2>
        <ImgRow src={markRemark} name="Remark" desc="A written remark exists for this registration. Tap it on the profile to read it." />
        <ImgRow src={markSpecialLivery} name="Special livery" desc="The aircraft wore a special or promotional livery when spotted." />
        <ImgRow src={markRetro} name="Retro livery" desc="The aircraft wore a historic or retro livery." />
        <ImgRow src={markOldLivery} name="Old livery" desc="The aircraft wore a previous (now superseded) livery." />
        <ImgRow src={markFlownIn} name="Flown in" desc="You have personally flown aboard this exact registration. Tap it on the profile to see the date." />

        <h2 className="legend-section">Alliance badges</h2>
        <ImgRow src={allianceStar} name="Star Alliance" desc="The airline is a member of Star Alliance." />
        <ImgRow src={allianceSkyteam} name="SkyTeam" desc="The airline is a member of SkyTeam." />
        <ImgRow src={allianceOneworld} name="Oneworld" desc="The airline is a member of Oneworld." />

        <h2 className="legend-section">Airport pills</h2>
        <SwatchRow className="airport-pill airport-pill--first" label="DUS" name="First-spotted airport" desc="Always sits furthest left. The airport where you first spotted this registration." />
        <SwatchRow className="airport-pill airport-pill--last" label="FRA" name="Most-recent airport" desc="The airport where you most recently spotted this registration." />
        <SwatchRow className="airport-pill airport-pill--first" label="DUS" dot name="First & most-recent (same airport)" desc="When the first and most-recent sighting are the same airport, a gold dot is added to mark it as the most recent." />

        <h2 className="legend-section">Photo</h2>
        <ImgRow src={cameraIcon} name="Photo on file" desc="A photo is attached to this registration." />
        <ImgRow src={cameraOffIcon} name="No photo" desc="No photo is attached yet. The written record is the truth of the logbook." />

        <h2 className="legend-section">Other</h2>
        <div className="legend-row">
          <div className="legend-row__icon"><span className="reg-retired-pill">Retired</span></div>
          <div className="legend-row__text">
            <p className="legend-row__name">Retired type</p>
            <p className="legend-row__desc">This airline no longer operates this aircraft type. Shown on the registration profile and as a pill in the airline banner.</p>
          </div>
        </div>
        <div className="legend-row">
          <div className="legend-row__icon"><img src={markFlownIn} alt="Flown airline" /></div>
          <div className="legend-row__text">
            <p className="legend-row__name">Flown airline</p>
            <p className="legend-row__desc">Shown on an airline's banner when you have flown aboard that airline.</p>
          </div>
        </div>
      </main>
    </div>
  )
}
