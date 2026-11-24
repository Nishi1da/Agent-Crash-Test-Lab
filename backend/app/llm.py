import time

from .config import get_settings


class ProviderError(Exception):
    """Raised for configuration or API problems, with a message safe to show the user."""


async def ping_provider() -> dict:
    s = get_settings()
    if not s.api_key:
        raise ProviderError(
            f"No API key found for provider '{s.provider}'. Add it to backend/.env and restart the server."
        )

    started = time.perf_counter()
    try:
        if s.provider == "anthropic":
            from anthropic import AsyncAnthropic

            client = AsyncAnthropic(api_key=s.api_key)
            resp = await client.messages.create(
                model=s.model,
                max_tokens=500,
                messages=[{"role": "user", "content": "Reply with the single word: ready"}],
            )
            reply = resp.content[0].text
        else:
            from groq import AsyncGroq

            client = AsyncGroq(api_key=s.api_key)
            resp = await client.chat.completions.create(
                model=s.model,
                max_tokens=500,
                messages=[{"role": "user", "content": "Reply with the single word: ready"}],
            )
            reply = resp.choices[0].message.content or ""
    except Exception as exc:  # provider SDKs raise many types; surface a clean message
        raise ProviderError(f"{s.provider} request failed: {type(exc).__name__}: {exc}") from exc

    return {
        "provider": s.provider,
        "model": s.model,
        "reply": reply.strip(),
        "round_trip_ms": round((time.perf_counter() - started) * 1000),
    }