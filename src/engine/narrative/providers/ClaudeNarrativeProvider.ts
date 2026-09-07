import type Anthropic from "@anthropic-ai/sdk"
import { NarrativeError } from "../NarrativeError.js"
import { RecordingDigest } from "../RecordingDigest.js"
import type {
  NarrativeDraft, NarrativeImage, NarrativeProvider, NarrativeRequest
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
        description: "One entry per value in `recording` that the account states. Values you derived "
          + "arithmetically from a stated one (an angle from a comparison, a duration from two times) "
          + "are stated values: quote the sentence you derived them from.",
        items: {
          type: "object",
          properties: {
            path: {
              type: "string",
              description: "Where the value sits in `recording`, dot-joined: \"time.hour\", "
                + "\"place.0.name\", \"timeline.keyframes.1.shapes.0.shape.angular.widthDeg\"."
            },
            quote: {
              type: "string",
              description: "The account's own words that state it, copied verbatim. Never a paraphrase."
            }
          },
          required: ["path", "quote"]
        }
      },
      gaps: {
        type: "array",
        description: "What the account does not say, one short sentence each, in the reader's language.",
        items: { type: "string" }
      }
    },
    required: ["recording", "claims", "gaps"]
  }
}

/** What a draft has to obey. Sent as the first system block, ahead of the format, and stable
 * across every call — which is what lets the format behind it be cached. */
const RULES = `You are reading a witness's account of an aerial sighting and reconstructing it in the
recording format of UFO@home, a tool that replays what a witness reported seeing, from where they
stood, under the real sky of that moment.

The point of the format is that a reader can tell what was witnessed from what was supposed. So:

1. State only what the account states. Every value you put in the recording must be traceable to a
   sentence you can quote, and you list that sentence in \`claims\`. If you cannot quote it, leave the
   field out and say so in \`gaps\`. An empty field is a correct answer; a plausible one is not.
2. Sizes are ANGULAR, in degrees, and never metric. The format stores no physical size at all,
   because a witness does not perceive one: they perceive an angle, and a size only follows from a
   distance nobody measured. Convert the comparisons an account does give — the full Moon and the
   Sun are both about 0.5 degrees across, a thumbnail at arm's length about 1.5, a fist about 10.
   "As big as a car at a hundred metres" is a stated angle (about 2.5 degrees); "as big as a car" on
   its own is not an angle at all, and goes in \`gaps\`.
3. Directions are \`aim\`: \`azimuthDeg\` clockwise from true north (north 0, east 90, south 180,
   west 270) and \`altitudeDeg\` above the horizon (horizon 0, zenith 90). "High in the sky" is not a
   number — say so in \`gaps\` rather than choosing one. Cardinal points and elevations the account
   does give ("in the north-west, about a third of the way up") are numbers: 315 and about 30.
4. Times are the local legal time at the place, with \`utcOffsetHours\` for the offset in force there
   THAT DAY (summer time included). Keyframe \`t\` is milliseconds from the start of the observation.
5. Give a keyframe only for a moment the account actually distinguishes — where it arrived, where it
   went, when it changed. Two to four is a normal first draft. Interpolation between them is the
   player's job, and poses nobody described are not yours to add.
6. For each shape give only \`kind\` ("oval" or "polygon"), \`title\` (what the witness called it, in
   their language), \`angular\` and \`aim\`. Never a pixel box, a transparency or a halo: those are
   how a drawing is painted, they are derived from the angle and the direction on loading, and
   inventing them would put numbers in the file that no one observed.
7. NEVER write \`description\`. It is the account you were just given: it is what the witness said,
   it does not change because somebody read it, and anything you would put there instead belongs in
   the numbers the reading produced. Leave the field out of your answer entirely.
8. \`tags\` are stored in English whatever the account's language, because two recordings that share
   a tag have to match on it. Reuse the vocabulary already in use where it fits — landing, trace,
   aerial observation, paralysis, contact, occupants, close encounter, photograph, radar,
   electromagnetic effect — and pass classification codes and case references through unchanged
   ("RR3", "NL", "Blue Book 8729"), which read the same in every language.`

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

  readonly needsCredential = true

  /** Anthropic's most capable model, and the one whose refusals to guess are worth paying for:
   * everything this feature is good for depends on it leaving a field empty rather than filling it
   * plausibly. */
  private static readonly MODEL = "claude-opus-5"

  /** Loaded the first time a draft is asked for, not when the editor starts: the SDK is a
   * substantial download and most readers never open this panel at all. Kept, so the second ask
   * does not pay for it again. */
  private client?: Anthropic
  private clientKey?: string

  /** The format, loaded beside the SDK and for the same reason: 26 KB of generated JSON that only
   * a reader who actually opens this panel ever needs, and which would otherwise ride along in the
   * editor's own bundle for everyone else. */
  private format?: string

  async draft(request: NarrativeRequest, signal?: AbortSignal): Promise<NarrativeDraft> {
    const client = await this.clientFor(request.credential)
    const format = this.format ??= JSON.stringify((await import("../../../generated/sightingSchema.json")).default)
    const stream = client.messages.stream({
      model: ClaudeNarrativeProvider.MODEL,
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

  private async clientFor(credential?: string): Promise<Anthropic> {
    if (!credential) {
      throw new NarrativeError("credential")
    }
    if (this.client && this.clientKey === credential) {
      return this.client
    }
    const { default: Anthropic } = await import("@anthropic-ai/sdk")
    this.client = new Anthropic({
      apiKey: credential,
      // The reader's own key, typed by them, in their own browser, sent to Anthropic and nowhere
      // else. See this class's own doc comment on why that is the case this flag exists for.
      dangerouslyAllowBrowser: true,
      // The SDK retries rate limits and server errors twice by default, which is right, but a draft
      // is a long call and a reader watching a spinner deserves to be told sooner.
      maxRetries: 1
    })
    this.clientKey = credential
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
          const { path, quote } = (claim ?? {}) as { path?: unknown, quote?: unknown }
          return typeof path === "string" && typeof quote === "string" ? [{ path, quote }] : []
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
    if (error instanceof Anthropic.APIConnectionError) {
      return new NarrativeError("unreachable", error)
    }
    return new NarrativeError("malformed", error)
  }
}
