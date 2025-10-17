# API (FastAPI) — AIS provider + KPIs + Shipments

## Environment
- `AIS_PROVIDER`: `mock` (default) | `aishub` | `custom`
- `AIS_ENDPOINT`: base URL for provider (e.g., `https://data.aishub.net/api`)
- `AIS_API_KEY`: your provider key
- `OPENAI_API_KEY`: optional for /summary

## Local dev
```bash
cd api
pip install -r requirements.txt
uvicorn main:app --reload
# http://127.0.0.1:8000/health
```

## Endpoints
- `POST /track` -> current position + ETA + risk (uses AIS provider or mock)
- `GET /weather?lat&lon`
- `POST /summary` -> LLM narrative
- `GET /shipments` -> list of demo containers with ETA/risk
- `GET /kpis` -> dashboard KPIs
