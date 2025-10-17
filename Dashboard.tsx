import { useEffect, useState } from 'react'
import { MapView } from './MapView'
import { KPICards } from './KPICards'
import { ShipmentsTable } from './ShipmentsTable'

const API = import.meta.env.VITE_API_URL ?? ''

type TrackResp = {
  container_id: string
  vessel_name: string
  lat: number
  lon: number
  speed_knots: number
  heading: number
  next_waypoint: { lat: number, lon: number }
  eta: string
  risk: string
  last_update: string
}

type WeatherResp = {
  temperature?: number
  windspeed?: number
  winddirection?: number
  weathercode?: number
  time?: string
  source?: string
}

type KPIs = {
  total_containers: number
  on_time_pct: number
  high_risk: number
  avg_hours_to_eta: number | null
}

type Shipment = {
  container_id: string
  vessel_name: string
  lat: number
  lon: number
  eta: string
  risk: string
  last_update: string
}

export function Dashboard() {
  const [containerId, setContainerId] = useState('MSCU1234567')
  const [track, setTrack] = useState<TrackResp | null>(null)
  const [weather, setWeather] = useState<WeatherResp | null>(null)
  const [summary, setSummary] = useState<string>('')
  const [kpis, setKpis] = useState<KPIs | null>(null)
  const [shipments, setShipments] = useState<Shipment[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function getAll() {
    setLoading(true)
    setError(null)
    setSummary('')
    try {
      // Track
      const tr = await fetch(`${API}/track`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ container_id: containerId })
      })
      if (!tr.ok) throw new Error('Track failed')
      const trData: TrackResp = await tr.json()
      setTrack(trData)

      // Weather
      const wr = await fetch(`${API}/weather?lat=${trData.lat}&lon=${trData.lon}`)
      if (!wr.ok) throw new Error('Weather failed')
      const wData: WeatherResp = await wr.json()
      setWeather(wData)

      // Summary
      const sr = await fetch(`${API}/summary`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          container_id: containerId,
          lat: trData.lat,
          lon: trData.lon,
          eta: trData.eta,
          weather: wData
        })
      })
      if (!sr.ok) throw new Error('Summary failed')
      const sData = await sr.json()
      setSummary(sData.summary || '')
    } catch (e: any) {
      setError(e.message || 'Error')
    } finally {
      setLoading(false)
    }
  }

  async function refreshDashboardData() {
    try {
      const [kpiRes, shipRes] = await Promise.all([
        fetch(`${API}/kpis`),
        fetch(`${API}/shipments`)
      ])
      if (kpiRes.ok) setKpis(await kpiRes.json())
      if (shipRes.ok) setShipments(await shipRes.json())
    } catch {}
  }

  useEffect(() => {
    refreshDashboardData()
  }, [])

  return (
    <div style={{maxWidth: 1100, margin: '24px auto', padding: '0 16px'}}>
      <h1 style={{fontSize: '2rem', margin: 0}}>🚢 AI Container Tracking</h1>
      <p>Map view + current location + weather + predictive ETA + LLM summary + KPIs + Shipments table.</p>

      <div className="grid" style={{gridTemplateColumns: '1fr auto', alignItems: 'end'}}>
        <label>
          Container ID:{' '}
          <input value={containerId} onChange={(e) => setContainerId(e.target.value)} />
        </label>
        <button onClick={getAll} disabled={loading}>{loading ? 'Loading…' : 'Fetch Tracking'}</button>
      </div>

      {error && <p style={{color: 'crimson'}}>Error: {error}</p>}

      <KPICards data={kpis} />

      {track && (
        <div className="card" style={{marginTop: 16}}>
          <h2 style={{margin: '0 0 8px'}}>Map</h2>
          <MapView lat={track.lat} lon={track.lon} nextLat={track.next_waypoint.lat} nextLon={track.next_waypoint.lon} />
        </div>
      )}

      <div className="grid" style={{gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', marginTop: 16}}>
        {track && (
          <div className="card">
            <h3 style={{marginTop: 0}}>Current Location</h3>
            <p><strong>Vessel:</strong> {track.vessel_name}</p>
            <p><strong>Coords:</strong> {track.lat.toFixed(4)}, {track.lon.toFixed(4)}</p>
            <p><strong>Speed/Heading:</strong> {track.speed_knots} kts / {track.heading}°</p>
            <p><strong>Last Update:</strong> {new Date(track.last_update).toLocaleString()}</p>
          </div>
        )}

        {track && (
          <div className="card">
            <h3 style={{marginTop: 0}}>Predictive ETA</h3>
            <p><strong>ETA (UTC):</strong> {new Date(track.eta).toUTCString()}</p>
            <p><strong>Risk:</strong> {track.risk}</p>
            <p><strong>Next Waypoint:</strong> {track.next_waypoint.lat.toFixed(2)}, {track.next_waypoint.lon.toFixed(2)}</p>
          </div>
        )}

        {weather && (
          <div className="card">
            <h3 style={{marginTop: 0}}>Weather Now</h3>
            <p><strong>Temp:</strong> {weather.temperature}°C</p>
            <p><strong>Wind:</strong> {weather.windspeed} km/h @ {weather.winddirection}°</p>
            <p><strong>Source:</strong> {weather.source}</p>
            <p><strong>Time:</strong> {weather.time}</p>
          </div>
        )}
      </div>

      {summary && (
        <div className="card" style={{marginTop: 16}}>
          <h3 style={{marginTop: 0}}>Operations Summary (LLM)</h3>
          <p>{summary}</p>
        </div>
      )}

      <ShipmentsTable rows={shipments} />
    </div>
  )
}
