from fastapi import FastAPI, HTTPException, Query
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import StreamingResponse

from .config import get_settings
from .llm import ProviderError, ping_provider
from .mock import mock_stream
from .presets import PRESETS

settings = get_settings()

app = FastAPI(title="Agent Crash-Test Lab API", version="0.1.0")

app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.allowed_origins,
    allow_credentials=False,
    allow_methods=["*"],
    allow_headers=["*"],
)

SSE_HEADERS = {
    "Cache-Control": "no-cache",
    "Connection": "keep-alive",
    "X-Accel-Buffering": "no",
}


@app.get("/api/health")
async def health() -> dict:
    return {
        "status": "ok",
        "provider": settings.provider,
        "model": settings.model,
        "api_key_configured": bool(settings.api_key),
    }


@app.get("/api/presets")
async def list_presets() -> dict:
    return {"presets": list(PRESETS.keys())}


@app.get("/api/presets/{preset_id}")
async def get_preset(preset_id: str) -> dict:
    preset = PRESETS.get(preset_id)
    if preset is None:
        raise HTTPException(status_code=404, detail=f"Unknown preset '{preset_id}'")
    return preset.model_dump(mode="json")


@app.get("/api/provider-check")
async def provider_check() -> dict:
    try:
        return await ping_provider()
    except ProviderError as exc:
        raise HTTPException(status_code=502, detail=str(exc)) from exc


@app.get("/api/stress-test/mock")
async def stress_test_mock(delay: float = Query(0.04, ge=0.0, le=0.5)) -> StreamingResponse:
    return StreamingResponse(
        mock_stream(delay), media_type="text/event-stream", headers=SSE_HEADERS
    )