import os, httpx, hashlib, math
from datetime import datetime, timedelta

class AISResult(dict):
    pass

def _mock_position(container_id: str):
    # deterministic mock: derive lat/lon from container id
    cid = (container_id or "MSCU1234567").upper()
    h = int(hashlib.sha256(cid.encode()).hexdigest(), 16)
    lat = ((h % 1200000) / 10000.0) - 60.0
    lon = (((h // 1200000) % 3400000) / 10000.0) - 170.0
    speed_knots = 16 + (h % 8)
    heading = h % 360
    return {
        "vessel_name": f"MV-{cid[:4]}",
        "lat": round(lat, 5),
        "lon": round(lon, 5),
        "speed_knots": speed_knots,
        "heading": heading,
        "last_update": datetime.utcnow().isoformat()
    }

async def _aishub_position(container_id: str):
    # Example placeholder — user must set AIS_ENDPOINT & AIS_API_KEY and adapt params
    endpoint = os.getenv("AIS_ENDPOINT", "").rstrip("/")
    api_key = os.getenv("AIS_API_KEY", "")
    if not endpoint or not api_key:
        raise RuntimeError("AIS_ENDPOINT and AIS_API_KEY required for aishub provider")
    # This is a stub. Replace params with your provider's docs.
    params = {"apiKey": api_key, "mmsi": container_id}  # or "imo"/"shipid"
    async with httpx.AsyncClient(timeout=15) as client:
        r = await client.get(f"{endpoint}/position", params=params)
        r.raise_for_status()
        data = r.json()
        # normalize; adapt to provider schema
        # Here we just fake structure for demonstration
        lat = float(data.get("lat", 0))
        lon = float(data.get("lon", 0))
        return {
            "vessel_name": data.get("vessel_name", f"Vessel-{container_id[:4]}"),
            "lat": lat,
            "lon": lon,
            "speed_knots": float(data.get("speed", 12)),
            "heading": int(float(data.get("course", 0))),
            "last_update": data.get("timestamp", datetime.utcnow().isoformat())
        }

async def get_position(container_id: str):
    provider = os.getenv("AIS_PROVIDER", "mock").lower()
    if provider == "mock":
        return _mock_position(container_id)
    elif provider == "aishub":
        return await _aishub_position(container_id)
    elif provider == "custom":
        # You can implement your custom provider here (MarineTraffic, VesselFinder, etc.)
        return _mock_position(container_id)
    else:
        return _mock_position(container_id)

def compute_eta_and_waypoint(lat: float, lon: float, speed_knots: float):
    # Very rough waypoint and ETA calc for demo
    next_lat = max(min(lat + 2.5, 80), -80)
    next_lon = max(min(lon + 3.0, 179), -179)
    dist_nm = math.sqrt((next_lat - lat)**2 + (next_lon - lon)**2) * 60
    hours = max(6, dist_nm / max(1, speed_knots))
    eta = (datetime.utcnow() + timedelta(hours=hours)).isoformat()
    risk = "LOW" if hours <= 24 else ("MEDIUM" if hours <= 48 else "HIGH")
    return {"eta": eta, "risk": risk, "next_waypoint": {"lat": round(next_lat, 5), "lon": round(next_lon, 5)}}
