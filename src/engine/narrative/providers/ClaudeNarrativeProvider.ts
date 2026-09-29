import type Anthropic from "@anthropic-ai/sdk"
import { NarrativeError } from "../NarrativeError.js"
import { RecordingRules } from "../RecordingRules.js"
import { RecordingDigest } from "../RecordingDigest.js"
import type { ClaudeNarrativeTexts } from "./ClaudeNarrativeTexts.js"
import type { Basis } from "../../persistence/Provenance.js"
import type {
  NarrativeDraft, NarrativeImage, NarrativeProvider, NarrativeRequest, NarrativeSetting
} from "../NarrativeProvider.js"

/** The one tool the model is asked to answer through. Not a formality: a tool call comes back as
 * parsed JSON rather than as prose that has to be dug out of a reply, and its schema is where the
 * three parts of a draft are stated once instead of being described in a paragraph and hoped for. */
const DRAFT_TOOL = {
  name: "draft_recording",
  description: "Record what the account states, what justifies each value, and what it leaves out.",
  input_schema: {
    type: "object" as const,
    properties: {
      recording: {
        type: "object",
        description:
          "The recording, in the format given above. Partial: only the fields the account actually states."
      },
      claims: {
        type: "array",
        description: "One entry per value in `recording`. EVERY value needs one: a value with no "
          + "claim is a value nobody can check.",
        items: {
          type: "object",
          properties: {
            path: {
              type: "string",
              description: "Where the value sits in `recording`, dot-joined, array indices as steps: "
                + "\"time.hour\", \"place.0.lat\", "
                + "\"timeline.keyframes.1.shapes.0.shape.angular.widthDeg\"."
            },
            basis: {
              type: "string",
              enum: ["stated", "derived", "assumed"],
              description: "\"stated\": the observer said it. \"derived\": worked out from what they "
                + "said plus something checkable. \"assumed\": chosen so the reconstruction has a "
                + "value at all, on nothing they said."
            },
            rationale: {
              type: "string",
              description: "For \"stated\", the account's own words, copied verbatim, never a "
                + "paraphrase. For \"derived\", the working, with the numbers in it. For "
                + "\"assumed\", what the guess was chosen for and how wrong it could be."
            }
          },
          required: ["path", "basis", "rationale"]
        }
      },
      gaps: {
        type: "array",
        description: "What nothing could settle, not even a guess worth making — one short sentence "
          + "each, in the reader's language. Usually empty.",
        items: { type: "string" }
      }
    },
    required: ["recording", "claims", "gaps"]
  }
}

/** What a draft has to obey. Sent as the first system block, ahead of the format, and stable
 * across every call — which is what lets the format behind it be cached. */
const RULES = `You are reading an observer's account of an aerial sighting and reconstructing it in the
recording format of UFO@home, a tool that replays what an observer reported seeing, from where they
stood, under the real sky of that moment.

The reconstruction has to RUN. A field left empty is a sky that cannot be computed or a phenomenon
that cannot be drawn, so fill in everything the reconstruction needs — and say, of every single
value, which of three things it is:

- "stated": the observer said it. The rationale is their own words, copied verbatim.
- "derived": you worked it out from what they said plus something checkable. The rationale is the
  working, with the numbers in it.
- "assumed": you chose it so the reconstruction would have a value at all, on nothing they said. The
  rationale says what you chose it for and how wrong it could be.

Getting that label right matters more than getting the value right. A wrong value marked "assumed"
is a question for the author to answer; a guess passed off as "stated" is a fabricated account,
and it is the one thing this format exists to prevent. When in doubt, mark it weaker. In particular
a PLACE nobody named is "assumed", however carefully you reasoned about which road it must have
been: the arithmetic that follows from a guessed point is only ever as good as the point.

Claim only what a reader could disagree with. Structural fields carry no account and belong in no
list: never claim \`version\`, an \`id\`, a \`sourceId\`, or anything else that exists to make the
file load rather than to say what was seen. The "assumed" list is the author's to-do list, and
padding it with plumbing is how it stops being read.

Then:

${RecordingRules.text("draft")}`

/**
 * Reads an account with Claude, on the reader's own account.
 *
 * The key is the reader's, kept by the page that asked for it and sent from their own browser
 * straight to the API. Nothing here holds a credential for anybody else and nothing relays one:
 * this is the whole reason there is no server behind this feature, and the reason it works wherever
 * the editor is embedded rather than only where a function of ours happens to be deployed. The
 * SDK's \`dangerouslyAllowBrowser\` names the danger of shipping YOUR key inside a page other people
 * load, which is a thing this arrangement structurally cannot do.
 *
 * The format the draft has to obey is the generated schema — the same file the Player page's JSON
 * editor completes from, read out of \`SightingRecordingJson\` itself at build time. Describing the
 * format here in prose instead would be a second statement of it, free to fall behind the day a
 * field is added, which is exactly what that generator exists to prevent.
 */
export class ClaudeNarrativeProvider implements NarrativeProvider {

  /**
   * The key, the workspace it may need, and the model. The key and workspace are half of one
   * credential each and are kept together only when the reader asks; the model is a preference.
   *
   * The models are Anthropic's current ones, most capable first after the default: Opus 5.5 is the
   * default because everything this feature is good for depends on the model leaving a field empty
   * rather than filling it plausibly, which is worth what it costs; Fable 5.1 reasons further for
   * more; Sonnet 5.5 and Haiku 4.5 are there for a reader who would rather pay less and check more.
   */
  static readonly DEFAULT_MODEL = "claude-opus-5-5"

  /** The settings, in English until localize has put them in the reader's language. */
  get settings(): ReadonlyArray<NarrativeSetting> {
    return this.localizedSettings
  }

  private localizedSettings = ClaudeNarrativeProvider.settingsIn()

  /**
   * Puts the settings in `language`. Only that language's texts are downloaded, and none for
   * English, which is this class's own; a language it has no texts for keeps English.
   */
  async localize(language: string): Promise<void> {
    const texts = await ClaudeNarrativeProvider.textsIn(language)
    this.localizedSettings = ClaudeNarrativeProvider.settingsIn(texts)
  }

  private static textsIn(language: string): Promise<ClaudeNarrativeTexts | undefined> {
    switch (language) {
      case "fr": return import("./ClaudeNarrativeTexts_fr.js").then(m => m.claudeNarrativeTexts_fr)
      case "es": return import("./ClaudeNarrativeTexts_es.js").then(m => m.claudeNarrativeTexts_es)
      case "it": return import("./ClaudeNarrativeTexts_it.js").then(m => m.claudeNarrativeTexts_it)
      default: return Promise.resolve(undefined)
    }
  }

  private static settingsIn(texts?: ClaudeNarrativeTexts): ReadonlyArray<NarrativeSetting> {
    return [
      {
        id: "key",
        kind: "secret",
        label: texts?.keyLabel ?? "Claude API key",
        required: true,
        remembered: "credential",
        // Every Anthropic key has begun with this prefix. Marked, never blocked: see NarrativeSetting.
        suspect: value => value.startsWith("sk-ant-") ? undefined
          : texts?.keySuspect ?? "This does not look like a Claude API key: they begin with sk-ant-"
      },
      {
        // A personal or service-account key can reach several workspaces, and the API refuses such a
        // key outright unless the request names one.
        id: "workspace",
        kind: "text",
        label: texts?.workspaceLabel ?? "Workspace ID",
        placeholder: texts?.workspacePlaceholder ?? "only if your key spans several",
        hint: texts?.workspaceHint
          ?? "Only for a key whose scope is the whole organisation. Simpler: leave this empty and create a key scoped to one workspace instead.",
        remembered: "credential"
      },
      {
        id: "model",
        kind: "choice",
        label: texts?.modelLabel ?? "Model",
        choices: [
          { value: ClaudeNarrativeProvider.DEFAULT_MODEL, label: "Claude Opus 5.5" },
          { value: "claude-fable-5-1", label: texts?.fableChoice ?? "Claude Fable 5.1 (most capable, dearer)" },
          { value: "claude-sonnet-5-5", label: texts?.sonnetChoice ?? "Claude Sonnet 5.5 (cheaper)" },
          { value: "claude-haiku-4-5", label: texts?.haikuChoice ?? "Claude Haiku 4.5 (cheapest)" }
        ],
        remembered: "preference"
      }
    ]
  }

  /** Loaded the first time a draft is asked for, not when the editor starts: the SDK is a
   * substantial download and most readers never open this panel at all. Kept, so the second ask
   * does not pay for it again. */
  private client?: Anthropic
  /** The credential and scope the cached client was built for — a reader who fixes either gets a
   * new client rather than the old one going on being refused. */
  private clientFor_?: string

  /** The format, loaded beside the SDK and for the same reason: 26 KB of generated JSON that only
   * a reader who actually opens this panel ever needs, and which would otherwise ride along in the
   * editor's own bundle for everyone else. */
  private format?: string

  async draft(request: NarrativeRequest, signal?: AbortSignal): Promise<NarrativeDraft> {
    const client = await this.clientFor(request.settings.key, request.settings.workspace)
    const format = this.format ??= JSON.stringify((await import("../../../generated/sightingSchema.json")).default)
    const stream = client.messages.stream({
      model: request.settings.model || ClaudeNarrativeProvider.DEFAULT_MODEL,
      max_tokens: 16000,
      system: [
        { type: "text", text: RULES },
        {
          type: "text",
          text: `The recording format, every key with what its own declaration says about it:\n\n${format}`,
          // The format is ~26 KB and identical on every call, so it is read from the cache from the
          // second ask on — which is what makes a round of corrections cost a fraction of the first
          // draft rather than the same again.
          cache_control: { type: "ephemeral" }
        }
      ],
      messages: this.messages(request),
      tools: [DRAFT_TOOL],
      // Not a forced tool_choice: an instruction plus a single allowed tool gets the same answer
      // without depending on how forcing interacts with the model's own thinking.
      tool_choice: { type: "auto", disable_parallel_tool_use: true }
    })
    const abort = () => stream.controller.abort()
    // Before the listener, which would never fire on a signal that is already aborted — a reader
    // who pressed Stop while the SDK was still downloading would otherwise wait out a whole call
    // they had already cancelled.
    if (signal?.aborted) {
      abort()
    }
    signal?.addEventListener("abort", abort, { once: true })
    try {
      return ClaudeNarrativeProvider.read(await stream.finalMessage())
    } catch (error) {
      throw await ClaudeNarrativeProvider.diagnose(error, signal)
    } finally {
      signal?.removeEventListener("abort", abort)
    }
  }

  /** The one turn there is. No conversation: an account is read whole, and reworking a draft means
   * rewording the account and reading it again — see NarrativeRequest.ask. */
  private messages(request: NarrativeRequest): Anthropic.MessageParam[] {
    return [{
      role: "user",
      content: [
        ...(request.images ?? []).map(image => ClaudeNarrativeProvider.imageBlock(image)),
        { type: "text", text: this.ask(request) }
      ]
    }]
  }

  private ask(request: NarrativeRequest): string {
    const parts: string[] = []
    if (request.language) {
      parts.push(`Write the gaps in ${request.language}.`)
    }
    const digest = request.current ? RecordingDigest.of(request.current) : undefined
    if (digest) {
      // So a draft does not overrule what is already settled by other means — a place geocoded to
      // the metre, an instrument chosen. An account does not carry those and cannot correct them.
      parts.push(
        `What the editor already holds, shapes reduced to their stated angle and direction. Do not \
restate a value here that the account does not itself state:\n\n${JSON.stringify(digest)}`
      )
    }
    parts.push(`The account:\n\n${request.ask}`, "Answer by calling draft_recording.")
    return parts.join("\n\n")
  }

  private static imageBlock(image: NarrativeImage): Anthropic.ContentBlockParam {
    return { type: "image", source: { type: "base64", media_type: image.mediaType, data: image.data } }
  }

  private async clientFor(credential?: string, scope?: string): Promise<Anthropic> {
    if (!credential) {
      throw new NarrativeError("credential")
    }
    const wanted = `${credential}\u0000${scope ?? ""}`
    if (this.client && this.clientFor_ === wanted) {
      return this.client
    }
    const { default: Anthropic } = await import("@anthropic-ai/sdk")
    this.client = new Anthropic({
      apiKey: credential,
      // Which of the key's workspaces the call belongs to. A property of the key, so it goes on the
      // client rather than on each request; absent for a key that is already scoped to one, where
      // sending it would be wrong rather than merely redundant.
      ...(scope ? { defaultHeaders: { "anthropic-workspace-id": scope } } : {}),
      // The reader's own key, typed by them, in their own browser, sent to Anthropic and nowhere
      // else. See this class's own doc comment on why that is the case this flag exists for.
      dangerouslyAllowBrowser: true,
      // The SDK retries rate limits and server errors twice by default, which is right, but a draft
      // is a long call and a reader watching a spinner deserves to be told sooner.
      maxRetries: 1
    })
    this.clientFor_ = wanted
    return this.client
  }

  private static read(message: Anthropic.Message): NarrativeDraft {
    if (message.stop_reason === "refusal") {
      throw new NarrativeError("refused")
    }
    const call = message.content.find(block => block.type === "tool_use" && block.name === DRAFT_TOOL.name)
    if (!call || call.type !== "tool_use") {
      throw new NarrativeError("malformed")
    }
    // Never string-matched: a tool input arrives as parsed JSON, and its escaping is not ours to
    // reason about.
    const input = call.input as { recording?: unknown, claims?: unknown, gaps?: unknown }
    if (typeof input?.recording !== "object" || input.recording === null || Array.isArray(input.recording)) {
      throw new NarrativeError("malformed")
    }
    return {
      recording: input.recording as NarrativeDraft["recording"],
      claims: Array.isArray(input.claims)
        ? input.claims.flatMap(claim => {
          const { path, basis, rationale } = (claim ?? {}) as { path?: unknown, basis?: unknown, rationale?: unknown }
          if (typeof path !== "string" || typeof rationale !== "string") {
            return []
          }
          // An unrecognised basis reads as "stated", the same default a file with no basis at all
          // gets: the safe reading is that somebody said it, not that something guessed it.
          const known = basis === "derived" || basis === "assumed" ? basis : "stated"
          return [{ path, basis: known as Basis, rationale }]
        })
        : [],
      gaps: Array.isArray(input.gaps) ? input.gaps.filter((gap): gap is string => typeof gap === "string") : []
    }
  }

  /** The SDK's typed errors, in the terms a reader can act on — and the reader's own Stop first,
   * because an aborted stream surfaces as a connection failure and is not one. */
  private static async diagnose(error: unknown, signal?: AbortSignal): Promise<Error> {
    if (error instanceof NarrativeError) {
      return error
    }
    if (signal?.aborted) {
      return new NarrativeError("cancelled", error)
    }
    const { default: Anthropic } = await import("@anthropic-ai/sdk")
    if (error instanceof Anthropic.AuthenticationError || error instanceof Anthropic.PermissionDeniedError) {
      return new NarrativeError("credential", error)
    }
    if (error instanceof Anthropic.RateLimitError) {
      return new NarrativeError("rate-limited", error)
    }
    // The service said what is wrong with the request, in words that name the field to fill. Passed
    // through rather than translated: see NarrativeErrorKind's "rejected".
    if (error instanceof Anthropic.BadRequestError || error instanceof Anthropic.NotFoundError) {
      return new NarrativeError("rejected", error.message, error)
    }
    if (error instanceof Anthropic.APIConnectionError) {
      return new NarrativeError("unreachable", error)
    }
    return new NarrativeError("malformed", error)
  }
}
