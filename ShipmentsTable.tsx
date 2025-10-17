type Shipment = {
  container_id: string
  vessel_name: string
  lat: number
  lon: number
  eta: string
  risk: string
  last_update: string
}

export function ShipmentsTable({ rows }: { rows: Shipment[] }) {
  if (!rows?.length) return null
  return (
    <div className="card" style={{marginTop: 16}}>
      <h3 style={{marginTop: 0}}>Tracked Shipments</h3>
      <table>
        <thead>
          <tr>
            <th>Container</th>
            <th>Vessel</th>
            <th>ETA (UTC)</th>
            <th>Risk</th>
            <th>Last Update</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((r) => (
            <tr key={r.container_id}>
              <td>{r.container_id}</td>
              <td>{r.vessel_name}</td>
              <td>{new Date(r.eta).toUTCString()}</td>
              <td>{r.risk}</td>
              <td>{new Date(r.last_update).toLocaleString()}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}
