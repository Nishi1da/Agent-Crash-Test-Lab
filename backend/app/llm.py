import asyncio
import time
from collections.abc import AsyncIterator
from functools import lru_cache

from .config import get_settings


class ProviderError(Exception):
    """Configuration or API problem, with a message that is safe to show the user."""


@lru_cache
def _groq_client():
    from groq import AsyncGroq

    return AsyncGroq(api_key=get_settings().api_key)


@lru_cache
def _anthropic_client():
    from anthropic import AsyncAnthropic

    return AsyncAnthropic(api_key=get_settings().api_key)


def _require_key() -> None:
    s = get_settings()
    if not s.api_key:
        raise ProviderError(
            f"No API key found for provider '{s.provider}'. Add it to backend/.env and restart the server."
        )


def _extra_body(model: str) -> dict:
    # gpt-oss models "think" before answering. Low effort keeps the wait short.
    if "gpt-oss" in model:
        return {"reasoning_effort": "low"}
    return {}


def _clean_error(exc: Exception) -> str:
    s = get_settings()
    msg = f"{s.provider} request failed: {type(exc).__name__}: {exc}"
    if s.api_key:
        msg = msg.replace(s.api_key, "***")
    return msg


def _is_retryable(exc: Exception) -> bool:
    code = getattr(exc, "status_code", None)
    if code == 429 or (isinstance(code, int) and code >= 500):
        return True
    return type(exc).__name__ in {"APIConnectionError", "APITimeoutError", "RateLimitError"}


async def _complete_once(system: str, user: str, model: str, temperature: float, max_tokens: int) -> str:
    s = get_settings()
    if s.provider == "anthropic":
        resp = await _anthropic_client().messages.create(
            model=model,
            max_tokens=max_tokens,
            temperature=temperature,
            system=system,
            messages=[{"role": "user", "content": user}],
        )
        return "".join(b.text for b in resp.content if getattr(b, "type", "") == "text").strip()

    resp = await _groq_client().chat.completions.create(
        model=model,
        messages=[{"role": "system", "content": system}, {"role": "user", "content": user}],
        temperature=temperature,
        max_tokens=max_tokens,
        extra_body=_extra_body(model),
    )
    return (resp.choices[0].message.content or "").strip()


async def complete(
    system: str,
    user: str,
    *,
    model: str | None = None,
    temperature: float = 0.7,
    max_tokens: int | None = None,
) -> str:
    """One full reply. Retries up to 3 times on rate limits and server errors."""
    _require_key()
    s = get_settings()
    model = model or s.model
    max_tokens = max_tokens or s.max_tokens

    last_exc: Exception | None = None
    for attempt in range(3):
        try:
            return await _complete_once(system, user, model, temperature, max_tokens)
        except Exception as exc:
            last_exc = exc
            if _is_retryable(exc) and attempt < 2:
                await asyncio.sleep(2 * (attempt + 1))
                continue
            break
    raise ProviderError(_clean_error(last_exc)) from last_exc


async def _stream_once(
    system: str, user: str, model: str, temperature: float, max_tokens: int
) -> AsyncIterator[str]:
    s = get_settings()
    if s.provider == "anthropic":
        async with _anthropic_client().messages.stream(
            model=model,
            max_tokens=max_tokens,
            temperature=temperature,
            system=system,
            messages=[{"role": "user", "content": user}],
        ) as stream:
            async for text in stream.text_stream:
                if text:
                    yield text
        return

    stream = await _groq_client().chat.completions.create(
        model=model,
        messages=[{"role": "system", "content": system}, {"role": "user", "content": user}],
        temperature=temperature,
        max_tokens=max_tokens,
        stream=True,
        extra_body=_extra_body(model),
    )
    async for chunk in stream:
        if not chunk.choices:
            continue
        piece = chunk.choices[0].delta.content
        if piece:
            yield piece


async def stream_chat(
    system: str,
    user: str,
    *,
    model: str | None = None,
    temperature: float = 0.4,
    max_tokens: int | None = None,
) -> AsyncIterator[str]:
    """Yields the reply in small pieces. Retries only if nothing has been sent yet."""
    _require_key()
    s = get_settings()
    model = model or s.model
    max_tokens = max_tokens or s.max_tokens

    for attempt in range(3):
        started = False
        try:
            async for piece in _stream_once(system, user, model, temperature, max_tokens):
                started = True
                yield piece
            return
        except Exception as exc:
            if not started and _is_retryable(exc) and attempt < 2:
                await asyncio.sleep(2 * (attempt + 1))
                continue
            raise ProviderError(_clean_error(exc)) from exc


async def ping_provider() -> dict:
    s = get_settings()
    started = time.perf_counter()
    reply = await complete(
        "You are a connectivity check.", "Reply with the single word: ready", temperature=0
    )
    return {
        "provider": s.provider,
        "model": s.model,
        "reply": reply,
        "round_trip_ms": round((time.perf_counter() - started) * 1000),
    }