import { MapContainer, TileLayer, Marker, Polyline } from 'react-leaflet'
import 'leaflet/dist/leaflet.css'
import L from 'leaflet'

const vesselIcon = new L.Icon({
  iconUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png',
  shadowUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png',
  iconSize: [25, 41],
  iconAnchor: [12, 41],
  popupAnchor: [1, -34],
  shadowSize: [41, 41]
})

export function MapView({ lat, lon, nextLat, nextLon }:{ lat:number, lon:number, nextLat:number, nextLon:number }) {
  const center: [number, number] = [lat, lon]
  const next: [number, number] = [nextLat, nextLon]
  return (
    <div style={{height: 420, width: '100%'}}>
      <MapContainer center={center} zoom={5} style={{height: '100%', width: '100%'}}>
        <TileLayer
          attribution='&copy; OpenStreetMap contributors'
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        />
        <Marker position={center} icon={vesselIcon} />
        <Polyline positions={[center, next]} />
      </MapContainer>
    </div>
  )
}
