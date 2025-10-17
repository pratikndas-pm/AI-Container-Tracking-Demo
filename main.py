from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from datetime import datetime
import os, httpx
from dateutil import parser as dtparser
from connectors.ais_providers import get_position, compute_eta_and_waypoint

# Optional OpenAI
OPENAI_API_KEY = os.getenv("OPENAI_API_KEY")
try:
    if OPENAI_API_KEY:
        from openai import OpenAI
        openai_client = OpenAI(api_key=OPENAI_API_KEY)
    else:
        openai_client = None
except Exception:
    openai_client = None

app = FastAPI(title="AI Container Tracking API")

ALLOWED_ORIGINS = [
    "http://localhost:5173",
    "http://127.0.0.1:5173",
]
FE = os.getenv("FRONTEND_URL")
if FE:
    ALLOWED_ORIGINS.append(FE)

app.add_middleware(
    CORSMiddleware,
    allow_origins=ALLOWED_ORIGINS + ["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

class TrackRequest(BaseModel):
    container_id: str

class SummaryRequest(BaseModel):
    container_id: str
    lat: float
    lon: float
    eta: str
    weather: dict

@app.get("/health")
def health():
    return {"status": "ok", "time": datetime.utcnow().isoformat()}

@app.post("/track")
async def track(req: TrackRequest):
    pos = await get_position(req.container_id)
    eta_info = compute_eta_and_waypoint(pos["lat"], pos["lon"], pos["speed_knots"])
    out = {
        "container_id": req.container_id,
        "vessel_name": pos["vessel_name"],
        "lat": pos["lat"],
        "lon": pos["lon"],
        "speed_knots": pos["speed_knots"],
        "heading": pos["heading"],
        "last_update": pos["last_update"],
        **eta_info
    }
    return out

@app.get("/weather")
async def weather(lat: float, lon: float):
    url = "https://api.open-meteo.com/v1/forecast"
    params = {"latitude": lat, "longitude": lon, "current_weather": True}
    try:
        async with httpx.AsyncClient(timeout=10) as client:
            r = await client.get(url, params=params)
            r.raise_for_status()
            data = r.json()
            cw = data.get("current_weather", {})
            return {
                "temperature": cw.get("temperature"),
                "windspeed": cw.get("windspeed"),
                "winddirection": cw.get("winddirection"),
                "weathercode": cw.get("weathercode"),
                "time": cw.get("time"),
                "source": "open-meteo"
            }
    except Exception as e:
        raise HTTPException(status_code=502, detail=f"Weather fetch failed: {e}")

@app.post("/summary")
def summary(req: SummaryRequest):
    base_prompt = f"""Summarize the container status in 3-4 sentences, professional tone.

Container: {req.container_id}
Current position: ({req.lat:.4f}, {req.lon:.4f})
Predicted ETA (UTC): {req.eta}
Weather now: {req.weather}

Include:
- Likely on-time/delay risk based on ETA and weather
- Any operational note (e.g., moderate winds)
- One actionable suggestion for operations
"""

    if openai_client:
        try:
            completion = openai_client.chat.completions.create(
                model="gpt-4o-mini",
                messages=[
                    {"role": "system", "content": "You are a logistics operations assistant."},
                    {"role": "user", "content": base_prompt},
                ],
                temperature=0.4,
            )
            text = completion.choices[0].message.content.strip()
            return {"summary": text, "provider": "openai"}
        except Exception:
            pass

    temp = req.weather.get("temperature")
    wind = req.weather.get("windspeed")
    text = (
        f"Container {req.container_id} is near ({req.lat:.4f}, {req.lon:.4f}) with ETA {req.eta}. "
        f"Conditions: {temp}°C, wind {wind} km/h. Stay in routine monitoring; "
        f"escalate if winds exceed 30 km/h or ETA drifts by >6 hours."
    )
    return {"summary": text, "provider": "template"}

# --- Demo data for dashboard ---
DEMO_CONTAINERS = ["MSCU1234567", "MAEU7654321", "CMAU2468101", "HLCU1357913", "ONEU9988776"]

@app.get("/shipments")
async def shipments():
    # returns a small list of tracked containers (mock/real positions)
    out = []
    for cid in DEMO_CONTAINERS:
        pos = await get_position(cid)
        eta_info = compute_eta_and_waypoint(pos["lat"], pos["lon"], pos["speed_knots"])
        out.append({
            "container_id": cid,
            "vessel_name": pos["vessel_name"],
            "lat": pos["lat"], "lon": pos["lon"],
            "eta": eta_info["eta"], "risk": eta_info["risk"],
            "last_update": pos["last_update"]
        })
    return out

@app.get("/kpis")
async def kpis():
    data = await shipments()
    total = len(data)
    on_time = sum(1 for d in data if d["risk"] == "LOW")
    delayed = sum(1 for d in data if d["risk"] == "HIGH")
    # avg hours to eta
    def hours_to_eta(eta_str):
        try:
            dt = dtparser.isoparse(eta_str)
            delta = dt - datetime.utcnow()
            return max(0, delta.total_seconds() / 3600.0)
        except Exception:
            return None
    hours = [h for h in (hours_to_eta(d["eta"]) for d in data) if h is not None]
    avg_eta_h = round(sum(hours)/len(hours), 1) if hours else None
    return {
        "total_containers": total,
        "on_time_pct": round((on_time/total)*100, 1) if total else 0.0,
        "high_risk": delayed,
        "avg_hours_to_eta": avg_eta_h
    }
