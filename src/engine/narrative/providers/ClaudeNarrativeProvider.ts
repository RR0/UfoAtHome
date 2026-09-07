import type Anthropic from "@anthropic-ai/sdk"
import { NarrativeError } from "../NarrativeError.js"
import { RecordingDigest } from "../RecordingDigest.js"
import type { Basis } from "../../persistence/Provenance.js"
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
              description: "\"stated\": the witness said it. \"derived\": worked out from what they "
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
const RULES = `You are reading a witness's account of an aerial sighting and reconstructing it in the
recording format of UFO@home, a tool that replays what a witness reported seeing, from where they
stood, under the real sky of that moment.

The reconstruction has to RUN. A field left empty is a sky that cannot be computed or a phenomenon
that cannot be drawn, so fill in everything the reconstruction needs — and say, of every single
value, which of three things it is:

- "stated": the witness said it. The rationale is their own words, copied verbatim.
- "derived": you worked it out from what they said plus something checkable. The rationale is the
  working, with the numbers in it.
- "assumed": you chose it so the reconstruction would have a value at all, on nothing they said. The
  rationale says what you chose it for and how wrong it could be.

Getting that label right matters more than getting the value right. A wrong value marked "assumed"
is a question for the author to answer; a guess passed off as "stated" is a fabricated testimony,
and it is the one thing this format exists to prevent. When in doubt, mark it weaker. In particular
a PLACE nobody named is "assumed", however carefully you reasoned about which road it must have
been: the arithmetic that follows from a guessed point is only ever as good as the point.

Claim only what a reader could disagree with. Structural fields carry no testimony and belong in no
list: never claim \`version\`, an \`id\`, a \`sourceId\`, or anything else that exists to make the
file load rather than to say what was seen. The "assumed" list is the author's to-do list, and
padding it with plumbing is how it stops being read.

Then:

1. Sizes are ANGULAR, in degrees, and never metric — the format stores no physical size, because a
   witness perceives an angle and a size only follows from a distance nobody measured. Convert the
   comparisons an account gives: the full Moon and the Sun are both about 0.5 degrees across, a
   thumbnail at arm's length about 1.5, a fist about 10. Where the account gives no comparison, work
   from what a scene implies and say so: something "barring the road" spans a carriageway, so a
   5-6 m road seen from 20-100 m gives 3 to 15 degrees; take a value in that range and put the
   range in the rationale. That is "derived", not "stated".
2. Directions are \`aim\`: \`azimuthDeg\` clockwise from true north (north 0, east 90, south 180,
   west 270) and \`altitudeDeg\` above the horizon (horizon 0, zenith 90). Derive them where the
   geography allows — a witness driving towards a named village is looking along that bearing, and a
   phenomenon "barring the road" is on it. Where nothing bears on the altitude, assume something low
   and plausible rather than leaving the phenomenon undrawable, and mark it "assumed".
3. Times are the local legal time at the place, with \`utcOffsetHours\` for the offset in force
   THERE, THAT DAY. This is a fact about the country and the year, not about today: France had no
   summer time at all between 1945 and 1976, so a May 1974 sighting in Brittany is UTC+1, not UTC+2.
   Getting this wrong moves the whole sky by an hour.
4. Duration: \`durationSeconds\` is a bare number and cannot say "about". So when the account gives
   a vague length ("a few minutes"), do NOT use it — write \`endTime\` instead, whose \`raw\` takes
   the EDTF approximation suffix: {"raw": "1974-05-20T19:02~", "year": 1974, "month": 5, "day": 20,
   "hour": 19, "minute": 2}. The tilde is the format saying "approximately", and it is the honest
   way to write a duration nobody timed. Use \`durationSeconds\` only for a length that was.
5. Give a keyframe only for a moment the account actually distinguishes — where it arrived, where it
   went, when it changed. Two to four is a normal first draft, and one is right for a phenomenon
   that never moved. Interpolation between them is the player's job.
6. For each shape give only \`kind\` ("oval" or "polygon"), \`title\` (what the witness called it,
   in their language), \`angular\` and \`aim\`. Never a pixel box, a transparency or a halo: those
   are how a drawing is painted, they are derived from the angle and the direction on loading, and
   values for them would be numbers no one observed and no one could check.
7. NEVER write \`description\`. It is the account you were just given: it is what the witness said,
   it does not change because somebody read it, and anything you would put there instead belongs in
   the numbers the reading produced. Leave the field out of your answer entirely.
8. \`tags\` are stored in English whatever the account's language, because two recordings that share
   a tag have to match on it. Reuse the vocabulary already in use where it fits — landing, trace,
   aerial observation, paralysis, contact, occupants, close encounter, photograph, radar,
   electromagnetic effect — and pass classification codes and case references through unchanged
   ("RR3", "NL", "Blue Book 8729"), which read the same in every language.
9. \`decor\` is the scenery around the witness, and \`eastM\`/\`northM\` are metres from where they
   stand. Something the witness is INSIDE — their own car, their kitchen — goes at 0,0 and carries
   \`witnessSide\` ("front-left" for a European driver's seat), which is what puts the viewpoint
   within it. Anything they are NOT inside must be placed away from 0,0, or it is drawn on the lens.
   Give \`sizeM\` in metres ({widthM, lengthM, heightM}: about 1.7 x 4.2 x 1.4 for a 1970s family
   car) or leave it out for the primitive's own size. Add decor only for what the account names: an
   unmentioned streetlight is scenery nobody reported.
10. \`witnessTrack\` is where the witness stood and which way they faced, over time. One pose is
   normally enough. \`headingDeg\` is the direction they were LOOKING, same convention as \`aim\`,
   and it is what makes a shape's azimuth mean anything — a witness driving towards a named village
   faces that bearing. \`elevationM\` is metres above sea level, \`pitchDeg\` 0 for someone looking
   level, \`fovDeg\` about 60 for the naked eye.
11. Silence is a statement. A witness who says the thing was silent is not a witness who said nothing
   about sound: write a \`soundTrack\` whose keyframe holds a sound of kind "none", and mark it
   "stated". An account that simply never mentions sound gets no soundTrack at all.`

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

  /** A personal or service-account key can reach several workspaces, and the API refuses such a key
   * outright unless the request names one — see NarrativeRequest.credentialScope. */
  readonly acceptsCredentialScope = true

  /** Anthropic's most capable model, and the one whose refusals to guess are worth paying for:
   * everything this feature is good for depends on it leaving a field empty rather than filling it
   * plausibly. */
  private static readonly MODEL = "claude-opus-5"

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
    const client = await this.clientFor(request.credential, request.credentialScope)
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
