/* eslint-disable @typescript-eslint/no-explicit-any */
export type SseHandler = (event: string, data: any) => void;

export async function streamSse(
  url: string,
  init: RequestInit,
  onEvent: SseHandler,
  signal: AbortSignal,
): Promise<void> {
  const res = await fetch(url, { ...init, signal });

  if (!res.ok || !res.body) {
    let detail = `Server returned ${res.status}`;
    try {
      const j = await res.json();
      if (j?.detail) detail = typeof j.detail === "string" ? j.detail : JSON.stringify(j.detail);
    } catch {
      /* body was not JSON */
    }
    throw new Error(detail);
  }

  const reader = res.body.getReader();
  const decoder = new TextDecoder();
  let buffer = "";

  while (true) {
    const { value, done } = await reader.read();
    if (done) break;
    buffer += decoder.decode(value, { stream: true }).replace(/\r\n/g, "\n");

    let idx: number;
    while ((idx = buffer.indexOf("\n\n")) !== -1) {
      const frame = buffer.slice(0, idx);
      buffer = buffer.slice(idx + 2);

      let event = "message";
      const dataLines: string[] = [];
      for (const line of frame.split("\n")) {
        if (line.startsWith("event:")) event = line.slice(6).trim();
        else if (line.startsWith("data:")) dataLines.push(line.slice(5).trimStart());
      }
      if (dataLines.length) {
        try {
          onEvent(event, JSON.parse(dataLines.join("\n")));
        } catch {
          /* ignore a malformed frame */
        }
      }
    }
  }
}