import { useEffect, useState } from 'react'
import { getAirportDiagram } from './lib/airportDiagram'

export default function AirportDiagram({ airport }) {
  const [status, setStatus] = useState('loading')
  const [ways, setWays] = useState(null)

  useEffect(() => {
    setStatus('loading')
    setWays(null)
    getAirportDiagram(airport).then(({ status: s, geometry }) => {
      setStatus(s)
      setWays(s === 'ok' && Array.isArray(geometry) && geometry.length > 0 ? geometry : null)
    })
  }, [airport.iata])

  if (status !== 'ok' || !ways) return null

  // Equirectangular projection corrected for latitude
  const allPts = ways.flatMap((w) => w.geometry)
  const lats = allPts.map((p) => p.lat)
  const lons = allPts.map((p) => p.lon)
  const minLat = Math.min(...lats)
  const maxLat = Math.max(...lats)
  const minLon = Math.min(...lons)
  const maxLon = Math.max(...lons)

  const midLatRad = ((minLat + maxLat) / 2) * (Math.PI / 180)
  const cosLat = Math.cos(midLatRad)

  const rawW = (maxLon - minLon) * cosLat
  const rawH = maxLat - minLat

  if (rawW === 0 || rawH === 0) return null

  // 4% padding on each side
  const padX = rawW * 0.04
  const padY = rawH * 0.04

  const VW = 1000
  const VH = VW * (rawH + 2 * padY) / (rawW + 2 * padX)
  const scale = VW / (rawW + 2 * padX)

  function project(lat, lon) {
    const x = (((lon - minLon) * cosLat) + padX) * scale
    const y = ((maxLat - lat) + padY) * scale
    return [x, y]
  }

  function toPoints(geometry) {
    return geometry
      .map((p) => {
        const [x, y] = project(p.lat, p.lon)
        return `${x.toFixed(2)},${y.toFixed(2)}`
      })
      .join(' ')
  }

  const aprons   = ways.filter((w) => w.aeroway === 'apron')
  const taxiways = ways.filter((w) => w.aeroway === 'taxiway')
  const runways  = ways.filter((w) => w.aeroway === 'runway')

  return (
    <div className="ap-diagram" aria-hidden="true">
      <svg
        viewBox={`0 0 ${VW} ${VH.toFixed(1)}`}
        preserveAspectRatio="xMidYMid meet"
        className="ap-diagram__svg"
      >
        {/* Aprons underneath */}
        {aprons.map((w, i) => (
          <polygon
            key={i}
            points={toPoints(w.geometry)}
            fill="#8fa0c8"
            fillOpacity="0.14"
            stroke="none"
          />
        ))}

        {/* Taxiways */}
        {taxiways.map((w, i) => (
          <polyline
            key={i}
            points={toPoints(w.geometry)}
            stroke="#8fa0c8"
            strokeWidth="1.5"
            fill="none"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        ))}

        {/* Runways on top with dashed centreline */}
        {runways.map((w, i) => (
          <g key={i}>
            <polyline
              points={toPoints(w.geometry)}
              stroke="#F6EFDC"
              strokeWidth="8"
              fill="none"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
            <polyline
              points={toPoints(w.geometry)}
              stroke="rgba(22,32,59,0.55)"
              strokeWidth="1.5"
              fill="none"
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeDasharray="10 12"
            />
          </g>
        ))}
      </svg>
    </div>
  )
}
