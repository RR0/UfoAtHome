import { describe, expect, it } from "vitest"
import { AssemblyAiTranscriptionProvider } from "../../../../src/modules/providers/transcription/AssemblyAiTranscriptionProvider.js"
import { TranscriptionAudio } from "../../../../src/engine/transcription/TranscriptionAudio.js"
import type { TranscriptionError } from "../../../../src/engine/transcription/TranscriptionError.js"
import type { TranscriptionProgress } from "../../../../src/engine/transcription/TranscriptionProvider.js"

const RATE = TranscriptionAudio.RATE
const json = (body: unknown, status = 200) => new Response(JSON.stringify(body), { status, headers: { "Content-Type": "application/json" } })

/** A fake AssemblyAI: the upload, the transcript asked for, then the looks at it, each answered in turn. */
const service = (looks: unknown[], status = 200) => {
  const asked: { url: string, init: RequestInit }[] = []
  let look = 0
  const fetchImpl = (async (url: string, init: RequestInit) => {
    asked.push({ url, init })
    if (status !== 200) return json({ error: "nope" }, status)
    if (url.endsWith("/v2/upload")) return json({ upload_url: "https://cdn.example/up" })
    if (init.method === "POST") return json({ id: "t1", status: "queued" })
    if (init.method === "DELETE") return json({})
    return json(looks[look++])
  }) as unknown as typeof fetch
  return { asked, fetchImpl }
}

describe("AssemblyAiTranscriptionProvider", () => {
  it("uploads the whole recording, asks for the voices told apart, waits for them, then deletes what the service kept", async () => {
    const { asked, fetchImpl } = service([
      { id: "t1", status: "processing" },
      { id: "t1", status: "completed", utterances: [{ speaker: "A", start: 250, end: 2000, text: "Bonjour." }, { speaker: "B", start: 2100, end: 4000, text: "Salut." }] }
    ])
    const provider = new AssemblyAiTranscriptionProvider({ base: "https://api.example", key: () => "secret", fetchImpl, pollMs: 1 })
    const stages: TranscriptionProgress["stage"][] = []

    const found = await provider.transcribe({ samples: new Float32Array(5 * RATE), language: "fr-FR", progress: p => stages.push(p.stage) })

    expect(found).toEqual([{ start: 0.25, end: 2, text: "Bonjour.", speaker: "A" }, { start: 2.1, end: 4, text: "Salut.", speaker: "B" }])
    expect(asked.map(call => `${call.init.method} ${call.url}`)).toEqual([
      "POST https://api.example/v2/upload",
      "POST https://api.example/v2/transcript",
      "GET https://api.example/v2/transcript/t1",
      "GET https://api.example/v2/transcript/t1",
      "DELETE https://api.example/v2/transcript/t1"
    ])
    expect((asked[0].init.headers as Record<string, string>).Authorization).toBe("secret")
    expect(asked[0].init.body).toBeInstanceOf(Blob)
    expect(JSON.parse(asked[1].init.body as string)).toEqual({ audio_url: "https://cdn.example/up", speaker_labels: true, language_code: "fr" })
    expect(stages).toEqual(["sending", "waiting", "transcribing"])
    expect(provider.sendsAudio).toBe(true)
  })

  it("lets the service find the language when none is said", async () => {
    const { asked, fetchImpl } = service([{ id: "t1", status: "completed", text: "Hello." }])
    const found = await new AssemblyAiTranscriptionProvider({ base: "b", key: () => "k", fetchImpl, pollMs: 1 }).transcribe({ samples: new Float32Array(RATE) })
    expect(JSON.parse(asked[1].init.body as string).language_detection).toBe(true)
    expect(found).toEqual([{ start: 0, end: 1, text: "Hello." }])
  })

  it("says why it could not, in words the editor translates", async () => {
    const samples = new Float32Array(RATE)
    const code = (promise: Promise<unknown>) => promise.then(() => "none", (error: TranscriptionError) => error.code)
    const failing = (status: number) => new AssemblyAiTranscriptionProvider({ base: "b", key: () => "k", fetchImpl: service([], status).fetchImpl })
    expect(await code(new AssemblyAiTranscriptionProvider({ base: "b", key: () => undefined }).transcribe({ samples }))).toBe("noKey")
    expect(await code(failing(401).transcribe({ samples }))).toBe("key")
    expect(await code(failing(429).transcribe({ samples }))).toBe("rateLimited")
    expect(await code(failing(500).transcribe({ samples }))).toBe("failed")
    const refused = service([{ id: "t1", status: "error", error: "audio too short" }])
    const error = await new AssemblyAiTranscriptionProvider({ base: "b", key: () => "k", fetchImpl: refused.fetchImpl, pollMs: 1 }).transcribe({ samples }).catch(e => e)
    expect([error.code, error.detail]).toEqual(["failed", "audio too short"])
  })

  it("stops waiting as soon as it is asked to", async () => {
    const controller = new AbortController()
    const { asked, fetchImpl } = service([])
    const provider = new AssemblyAiTranscriptionProvider({ base: "b", key: () => "k", fetchImpl, pollMs: 60_000 })
    const running = provider.transcribe({ samples: new Float32Array(RATE), signal: controller.signal, progress: p => { if (p.stage === "waiting") controller.abort() } })
    await expect(running).rejects.toBeDefined()
    expect(asked.some(call => call.init.method === "GET")).toBe(false)
  })
})
