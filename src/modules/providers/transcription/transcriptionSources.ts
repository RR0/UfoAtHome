import { ModuleRegistry } from "../../ModuleRegistry.js"
import type { DataSource } from "../../../engine/source/DataSource.js"
import { SourceCredentials } from "../../../engine/source/SourceCredentials.js"
import type { TranscriptionProvider } from "../../../engine/transcription/TranscriptionProvider.js"
import { LazyTranscriptionProvider } from "../../../engine/transcription/LazyTranscriptionProvider.js"

const GROQ_ID = "groq"
const OPENAI_ID = "openai"
const ASSEMBLYAI_ID = "assemblyai"

/**
 * Everything the interview editor can transcribe a recording with. The first, Whisper in the reader's own browser, is the default: it
 * sends nothing anywhere, as the editor promises of everything else. The others are services the reader holds a key to (see
 * DataSource.keyUrl, SourceCredentials), to which the recording is sent: faster, and the editor says so before anything goes. AssemblyAI is
 * the one that tells the voices apart, so that who each one is is said once per voice rather than once per turn.
 */
export const TRANSCRIPTION_SOURCES: DataSource<TranscriptionProvider>[] = ModuleRegistry.point("transcription").provide(ModuleRegistry.BUILT_IN, [
  {
    id: "whisper-browser",
    name: "Whisper",
    credit: "OpenAI Whisper large-v3-turbo (MIT), run by Transformers.js (Apache 2.0)",
    creditUrl: "https://huggingface.co/onnx-community/whisper-large-v3-turbo",
    create: () => new LazyTranscriptionProvider(false, "whisper-large-v3-turbo (Transformers.js, in the browser)",
      async () => new (await import("./BrowserWhisperProvider.js")).BrowserWhisperProvider(), 760_000_000)
  },
  {
    id: GROQ_ID,
    name: "Groq",
    credit: "Groq, Whisper large-v3-turbo, on your own key",
    creditUrl: "https://groq.com/terms-of-use",
    keyUrl: "https://console.groq.com/keys",
    create: () => new LazyTranscriptionProvider(true, "whisper-large-v3-turbo (Groq)",
      async () => new (await import("./OpenAiTranscriptionProvider.js")).OpenAiTranscriptionProvider({
        base: "https://api.groq.com/openai/v1",
        model: "whisper-large-v3-turbo",
        key: () => SourceCredentials.of(GROQ_ID)
      }))
  },
  {
    id: OPENAI_ID,
    name: "OpenAI",
    credit: "OpenAI, Whisper, on your own key",
    creditUrl: "https://openai.com/policies/row-terms-of-use/",
    keyUrl: "https://platform.openai.com/api-keys",
    create: () => new LazyTranscriptionProvider(true, "whisper-1 (OpenAI)",
      async () => new (await import("./OpenAiTranscriptionProvider.js")).OpenAiTranscriptionProvider({
        base: "https://api.openai.com/v1",
        model: "whisper-1",
        key: () => SourceCredentials.of(OPENAI_ID)
      }))
  },
  {
    id: ASSEMBLYAI_ID,
    name: "AssemblyAI",
    credit: "AssemblyAI, voices told apart, on your own key",
    creditUrl: "https://www.assemblyai.com/legal/terms-of-service",
    keyUrl: "https://www.assemblyai.com/app/api-keys",
    create: () => new LazyTranscriptionProvider(true, "AssemblyAI (speaker labels)",
      async () => new (await import("./AssemblyAiTranscriptionProvider.js")).AssemblyAiTranscriptionProvider({
        base: "https://api.assemblyai.com",
        key: () => SourceCredentials.of(ASSEMBLYAI_ID)
      }))
  }
])
