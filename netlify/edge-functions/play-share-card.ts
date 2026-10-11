/**
 * What a link to `/play/?file=…` shows where it is shared: the observation's own picture, name and first words,
 * instead of the Player's general card.
 *
 * It has to be the SERVER that says so. The crawlers behind a link preview (Facebook, X, LinkedIn, Slack, WhatsApp,
 * Discord, iMessage, Mastodon) read the HTML they are served and run none of its scripts, so a Player that read the
 * recording and then set `og:image` would be read by nobody that matters. This edge function reads the same file the
 * Player is about to read, and rewrites the card in the page on its way out. A reader's browser gets the same page
 * as before, and every failure (no `file`, a file that does not answer, one that is not JSON, one too big) returns
 * the page untouched: the logo card, as it always was.
 *
 * Self-contained on purpose: Netlify bundles edge functions with Deno, which resolves neither the `.js` suffixes
 * the rest of this repository imports with, nor its path mappings.
 */

/** What Netlify hands a function: only what is used here. */
interface EdgeContext {
  next(): Promise<Response>
}

/** What a card is made of; each part may be missing, and the logo card's own then stays. */
export interface RecordingCard {
  title?: string
  description?: string
  /** Absolute. */
  image?: string
}

export class PlayShareCard {

  /** A recording that does not answer within this is not waited for: a link preview must not hang on somebody's server. */
  static readonly TIMEOUT_MS = 2500

  /** Cases and recordings are a few hundred kilobytes; this stops a link to something else from being read whole. */
  static readonly MAX_BYTES = 8_000_000

  static readonly MAX_DESCRIPTION = 200

  /** The Player's own list of where a bare name may be (see PlayerPage's `resolve`): a name is looked for in these, in order. */
  static candidates(requested: string, origin: string): string[] {
    const name = requested.toLowerCase()
    const sources = requested.includes("/")
      ? [requested]
      : [`/demo-data/observer-${name}.json`,
        `/demo-data/sky-test-${name}.json`,
        `/demo-data/${name}.json`,
        `https://rr0.org/science/crypto/ufo/enquete/dossier/${requested}/case.json`,
        `https://rr0.org/science/crypto/ufo/enquete/dossier/${requested}/sighting.json`]
    return sources.flatMap(source => {
      try {
        const url = new URL(source, origin)
        return url.protocol === "https:" || url.protocol === "http:" ? [url.href] : []
      } catch {
        return []
      }
    })
  }

  /** The first candidate that answers with a JSON object, with where it came from. */
  static async find(requested: string, origin: string): Promise<{ json: Record<string, unknown>, url: string } | undefined> {
    for (const url of PlayShareCard.candidates(requested, origin)) {
      try {
        const reply = await fetch(url, { signal: AbortSignal.timeout(PlayShareCard.TIMEOUT_MS) })
        if (!reply.ok) continue
        if (Number(reply.headers.get("content-length")) > PlayShareCard.MAX_BYTES) continue
        const text = await reply.text()
        if (text.length > PlayShareCard.MAX_BYTES) continue
        const json = JSON.parse(text)
        if (typeof json === "object" && json !== null && !Array.isArray(json)) return { json, url: reply.url || url }
      } catch {
        // Unreachable, too slow, not JSON: the next candidate, then the logo.
      }
    }
    return undefined
  }

  /**
   * What the recording says about itself, named as the Player names it (see RecordingTitle): a case by its title, an
   * account by its observer's name, then its id, then its file's name.
   */
  static cardOf(json: Record<string, unknown>, url: string, language: string): RecordingCard {
    const isCase = Array.isArray(json.events) && !json.timeline
    const observer = json.observer as { title?: string, lastName?: string, firstNames?: string[], id?: string } | undefined
    const fullName = observer && [...(observer.firstNames ?? []), observer.lastName].filter(Boolean).join(" ")
    const fileName = decodeURIComponent(new URL(url).pathname.split("/").pop() ?? "").replace(/\.json$/, "")
    const title = (isCase ? PlayShareCard.text(json.title) || PlayShareCard.text(json.id) : undefined)
      || PlayShareCard.text(observer?.title) || PlayShareCard.text(fullName) || PlayShareCard.text(observer?.id)
      || PlayShareCard.text(json.id) || PlayShareCard.text(fileName)
    return {
      title,
      description: PlayShareCard.summary(json.description, language),
      image: PlayShareCard.imageOf(json.image, url)
    }
  }

  /** The picture, as an absolute address: relative to the file, or from its site's root as RR0 writes it. */
  private static imageOf(image: unknown, fileUrl: string): string | undefined {
    if (typeof image !== "string" || image.trim() === "") return undefined
    try {
      const url = new URL(image.trim(), fileUrl)
      return url.protocol === "https:" || url.protocol === "http:" ? url.href : undefined
    } catch {
      return undefined
    }
  }

  private static text(value: unknown): string | undefined {
    return typeof value === "string" && value.trim() !== "" ? value.trim() : undefined
  }

  /** The account's first paragraph, in the page's language, then English, then any; cut at a word. */
  private static summary(description: unknown, language: string): string | undefined {
    const said = typeof description === "object" && description !== null
      ? PlayShareCard.text((description as Record<string, unknown>)[language])
        ?? PlayShareCard.text((description as Record<string, unknown>).en)
        ?? Object.values(description).map(PlayShareCard.text).find(Boolean)
      : PlayShareCard.text(description)
    const paragraph = said?.split(/\n\s*\n/)[0].replace(/\s+/g, " ").trim()
    if (!paragraph) return undefined
    if (paragraph.length <= PlayShareCard.MAX_DESCRIPTION) return paragraph
    return paragraph.slice(0, PlayShareCard.MAX_DESCRIPTION).replace(/\s+\S*$/, "") + "…"
  }

  private static attribute(value: string): string {
    return value.replace(/&/g, "&amp;").replace(/"/g, "&quot;").replace(/</g, "&lt;").replace(/>/g, "&gt;")
  }

  /** Replaces the content of a `<meta>` the page already carries (the Layout writes them all), leaving the page alone where it has none. */
  private static setMeta(html: string, key: string, value: string): string {
    const tag = new RegExp(`(<meta (?:property|name)="${key}" content=")[^"]*(">)`)
    return html.replace(tag, (_, before: string, after: string) => before + PlayShareCard.attribute(value) + after)
  }

  private static dropMeta(html: string, key: string): string {
    return html.replace(new RegExp(`\\s*<meta (?:property|name)="${key}" content="[^"]*">`), "")
  }

  /** The page with its card replaced by this one. `address` is what this very link is, for the crawlers that tell links apart by it. */
  static apply(html: string, card: RecordingCard, address: string): string {
    let page = html
    if (card.title) {
      page = PlayShareCard.setMeta(page, "og:title", `${card.title} — UFO@home`)
      page = PlayShareCard.setMeta(page, "og:image:alt", card.title)
    }
    if (card.description) {
      page = PlayShareCard.setMeta(page, "og:description", card.description)
      page = PlayShareCard.setMeta(page, "description", card.description)
    }
    if (card.image) {
      page = PlayShareCard.setMeta(page, "og:image", card.image)
      // The logo's own size and description would be wrong for a picture of any other.
      page = PlayShareCard.dropMeta(page, "og:image:width")
      page = PlayShareCard.dropMeta(page, "og:image:height")
      page = PlayShareCard.setMeta(page, "twitter:card", "summary_large_image")
    }
    // Facebook and others tell cards apart by og:url: left as the bare Player, every observation would share one.
    page = PlayShareCard.setMeta(page, "og:url", address)
    return page.replace(/(<link rel="canonical" href=")[^"]*(">)/, (_, before: string, after: string) => before + PlayShareCard.attribute(address) + after)
  }

  static async handle(request: Request, context: EdgeContext): Promise<Response> {
    const response = await context.next()
    const url = new URL(request.url)
    const requested = url.searchParams.get("file") ?? url.searchParams.get("sighting")
    if (request.method !== "GET" || !requested || requested.length > 500 || !response.ok
      || !(response.headers.get("content-type") ?? "").includes("text/html")) return response
    const found = await PlayShareCard.find(requested, url.origin)
    if (!found) return response
    const language = /index_([a-z]{2})\.html$/.exec(url.pathname)?.[1] ?? "en"
    const html = await response.text()
    const address = `${url.origin}${url.pathname}?file=${encodeURIComponent(requested)}`
    const headers = new Headers(response.headers)
    headers.delete("content-length")
    return new Response(PlayShareCard.apply(html, PlayShareCard.cardOf(found.json, found.url, language), address), {
      status: response.status,
      headers
    })
  }
}

export default (request: Request, context: EdgeContext): Promise<Response> => PlayShareCard.handle(request, context)

export const config = { path: ["/play/", "/play/index_*.html"] }
