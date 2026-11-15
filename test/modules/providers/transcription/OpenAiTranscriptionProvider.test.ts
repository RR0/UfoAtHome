import { describe, expect, it } from "vitest"
import { OpenAiTranscriptionProvider } from "../../../../src/modules/providers/transcription/OpenAiTranscriptionProvider.js"
import { TranscriptionAudio } from "../../../../src/engine/transcription/TranscriptionAudio.js"
import { TranscriptionError } from "../../../../src/engine/transcription/TranscriptionError.js"
import { TRANSCRIPTION_SOURCES } from "../../../../src/modules/providers/transcription/transcriptionSources.js"
import { SourceCredentials } from "../../../../src/engine/source/SourceCredentials.js"

const RATE = TranscriptionAudio.RATE

/** A fake service: what it was asked, and an answer per block. */
const service = (answer: (index: number) => Response) => {
  const asked: { url: string, init: RequestInit }[] = []
  const fetchImpl = (async (url: string, init: RequestInit) => {
    asked.push({ url, init })
    return answer(asked.length - 1)
  }) as unknown as typeof fetch
  return { asked, fetchImpl }
}
const json = (body: unknown, status = 200) => new Response(JSON.stringify(body), { status, headers: { "Content-Type": "application/json" } })

describe("OpenAiTranscriptionProvider", () => {
  it("sends the recording in blocks with the reader's key, and moves each block's times to where it starts", async () => {
    const { asked, fetchImpl } = service(() => json({ segments: [{ start: 1, end: 2, text: "Bonjour." }] }))
    const provider = new OpenAiTranscriptionProvider({ base: "https://api.example/v1", model: "whisper-x", key: () => "secret", fetchImpl })
    const samples = new Float32Array(Math.round(OpenAiTranscriptionProvider.BLOCK_SECONDS * 1.5 * RATE))
    const progress: number[] = []

    const found = await provider.transcribe({ samples, language: "fr-FR", progress: p => { if (p.stage === "transcribing") progress.push(p.done) } })

    expect(asked).toHaveLength(2)
    expect(asked[0].url).toBe("https://api.example/v1/audio/transcriptions")
    expect(asked[0].init.headers).toEqual({ Authorization: "Bearer secret" })
    const form = asked[0].init.body as FormData
    expect([form.get("model"), form.get("response_format"), form.get("language")]).toEqual(["whisper-x", "verbose_json", "fr"])
    expect((form.get("file") as File).type).toBe("audio/wav")
    const second = (found[1].start - 1)
    expect(found[0]).toEqual({ start: 1, end: 2, text: "Bonjour." })
    expect(second).toBeGreaterThan(OpenAiTranscriptionProvider.BLOCK_SECONDS - 21)
    expect(second).toBeLessThanOrEqual(OpenAiTranscriptionProvider.BLOCK_SECONDS)
    expect(progress[progress.length - 1]).toBeCloseTo(samples.length / RATE)
    expect(provider.sendsAudio).toBe(true)
  })

  it("says why it could not, in words the editor translates", async () => {
    const samples = new Float32Array(RATE)
    const failing = (status: number) => new OpenAiTranscriptionProvider({ base: "b", model: "m", key: () => "k", fetchImpl: service(() => json({}, status)).fetchImpl })
    const code = (promise: Promise<unknown>) => promise.then(() => "none", (error: TranscriptionError) => error.code)
    expect(await code(new OpenAiTranscriptionProvider({ base: "b", model: "m", key: () => undefined }).transcribe({ samples }))).toBe("noKey")
    expect(await code(failing(401).transcribe({ samples }))).toBe("key")
    expect(await code(failing(413).transcribe({ samples }))).toBe("tooLarge")
    expect(await code(failing(429).transcribe({ samples }))).toBe("rateLimited")
    expect(await code(failing(500).transcribe({ samples }))).toBe("failed")
  })

  it("stops between blocks when asked to, sending nothing more", async () => {
    const controller = new AbortController()
    const { asked, fetchImpl } = service(() => {
      controller.abort()
      return json({ text: "Un." })
    })
    const provider = new OpenAiTranscriptionProvider({ base: "b", model: "m", key: () => "k", fetchImpl })
    const samples = new Float32Array(OpenAiTranscriptionProvider.BLOCK_SECONDS * 2 * RATE)
    await expect(provider.transcribe({ samples, signal: controller.signal })).rejects.toBeDefined()
    expect(asked).toHaveLength(1)
  })
})

describe("TRANSCRIPTION_SOURCES", () => {
  it("offers Whisper in the browser first, which sends nothing, then services on the reader's own key, which send the recording", () => {
    const providers = TRANSCRIPTION_SOURCES.map(source => [source.id, source.create().sendsAudio, Boolean(source.keyUrl)])
    expect(providers).toEqual([["whisper-browser", false, false], ["groq", true, true], ["openai", true, true], ["assemblyai", true, true]])
    expect(TRANSCRIPTION_SOURCES[0].create().downloadBytes).toBeGreaterThan(0)
  })

  it("reads the key typed for that service, and none other", async () => {
    SourceCredentials.forget()
    const groq = TRANSCRIPTION_SOURCES.find(source => source.id === "groq")!.create()
    const code = await groq.transcribe({ samples: new Float32Array(RATE) }).then(() => "none", (error: TranscriptionError) => error.code)
    expect(code).toBe("noKey")
  })
})
