type KPIs = {
  total_containers: number
  on_time_pct: number
  high_risk: number
  avg_hours_to_eta: number | null
}

export function KPICards({ data }: { data: KPIs | null }) {
  if (!data) return null
  return (
    <div className="grid" style={{gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', marginTop: 16}}>
      <div className="card"><div>Containers</div><div className="kpi">{data.total_containers}</div></div>
      <div className="card"><div>On-time %</div><div className="kpi">{data.on_time_pct}%</div></div>
      <div className="card"><div>High Risk</div><div className="kpi">{data.high_risk}</div></div>
      <div className="card"><div>Avg Hours to ETA</div><div className="kpi">{data.avg_hours_to_eta ?? '-'}</div></div>
    </div>
  )
}
