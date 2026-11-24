from collections.abc import AsyncIterator

from fastapi import FastAPI, HTTPException, Query
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import StreamingResponse

from .config import get_settings
from .engine import run_stress_test
from .llm import ProviderError, ping_provider
from .mock import mock_stream
from .presets import PRESETS
from .schemas import StressTestRequest
from .sse import sse_format

settings = get_settings()

app = FastAPI(title="Agent Crash-Test Lab API", version="0.2.0")

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


async def _sse(req: StressTestRequest) -> AsyncIterator[str]:
    async for name, data in run_stress_test(req):
        yield sse_format(name, data)


@app.get("/api/health")
async def health() -> dict:
    return {
        "status": "ok",
        "provider": settings.provider,
        "model": settings.model,
        "judge_model": settings.judge,
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


@app.post("/api/stress-test")
async def stress_test(req: StressTestRequest) -> StreamingResponse:
    return StreamingResponse(_sse(req), media_type="text/event-stream", headers=SSE_HEADERS)


@app.get("/api/stress-test/demo")
async def stress_test_demo(
    preset: str = Query("hr_onboarding"), turns: int = Query(1, ge=1, le=3)
) -> StreamingResponse:
    target = PRESETS.get(preset)
    if target is None:
        raise HTTPException(status_code=404, detail=f"Unknown preset '{preset}'")
    req = StressTestRequest(target=target, turns_per_vector=turns)
    return StreamingResponse(_sse(req), media_type="text/event-stream", headers=SSE_HEADERS)