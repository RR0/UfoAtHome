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

  static readonly MAX_DESCRIPTION = 260

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
      description: PlayShareCard.said(json.summary, language) ?? PlayShareCard.derived(json, url, language, title, isCase),
      image: PlayShareCard.imageOf(json.image, url)
    }
  }

  /** What a recording or a case says of when it happened, which is all there is to say of one that has no description of its own. */
  private static readonly REPLAY: Record<string, string> = {
    en: "Replay it in the real sky of the date and place it states.",
    fr: "À rejouer sous le ciel réel de la date et du lieu qu'elle énonce.",
    es: "Para reproducir bajo el cielo real de la fecha y el lugar que indica.",
    it: "Da riprodurre sotto il cielo reale della data e del luogo che indica."
  }

  /** A time as a recording states it (`{year, month, day, hour, minute}`) or a case does ("1967-08-29 10:30", "1954"). */
  private static momentOf(time: unknown): { year: number, month?: number, day?: number, hour?: number, minute?: number } | undefined {
    if (typeof time === "string") {
      const found = /^(-?\d{1,4})(?:-(\d{2}))?(?:-(\d{2}))?(?:[ T](\d{2}):(\d{2}))?/.exec(time.trim())
      if (!found) return undefined
      const [, year, month, day, hour, minute] = found
      return { year: Number(year), month: month ? Number(month) : undefined, day: day ? Number(day) : undefined, hour: hour ? Number(hour) : undefined, minute: minute ? Number(minute) : undefined }
    }
    const said = time as { year?: unknown, month?: unknown, day?: unknown, hour?: unknown, minute?: unknown } | undefined
    if (typeof said?.year !== "number") return undefined
    const number = (value: unknown) => typeof value === "number" ? value : undefined
    return { year: said.year, month: number(said.month), day: number(said.day), hour: number(said.hour), minute: number(said.minute) }
  }

  /** "29 August 1967, 10:30", in the page's language; only as much as the time states. */
  private static dateIn(language: string, time: unknown): string | undefined {
    const moment = PlayShareCard.momentOf(time)
    if (!moment) return undefined
    let date = String(moment.year)
    if (moment.year >= 1000 && moment.month) {
      const when = new Date(Date.UTC(moment.year, moment.month - 1, moment.day ?? 1))
      try {
        date = new Intl.DateTimeFormat(language, moment.day
          ? { day: "numeric", month: "long", year: "numeric", timeZone: "UTC" }
          : { month: "long", year: "numeric", timeZone: "UTC" }).format(when)
      } catch {
        // A language the runtime does not know: the year alone is still true.
      }
    }
    const hour = moment.day && moment.hour !== undefined
      ? `, ${String(moment.hour).padStart(2, "0")}:${String(moment.minute ?? 0).padStart(2, "0")}` : ""
    return date + hour
  }

  /**
   * What a card says of an observation whose file gives no `summary`: who saw it, in which case and when.
   *
   * A recording does not name its case (a case names its accounts), so the case is read off the address when that has
   * the shape of an RR0 dossier (`.../dossier/Cussac/sighting.json`), and left out otherwise. A case, or a recording
   * with nobody to name, says its date and what can be done with it.
   */
  private static derived(json: Record<string, unknown>, url: string, language: string, title: string | undefined, isCase: boolean): string | undefined {
    const date = PlayShareCard.dateIn(language, json.time)
    const place = Array.isArray(json.place) ? PlayShareCard.text((json.place[0] as { name?: unknown } | undefined)?.name) : undefined
    const dossier = isCase ? undefined : /\/dossier\/([^/]+)\//.exec(new URL(url).pathname)?.[1]
    const where = [dossier && decodeURIComponent(dossier), date].filter(Boolean).join(", ")
    if (!isCase && title && where) return `${title} — ${where}`
    if (!date) return undefined
    return `${date}${place ? ` · ${place}` : ""}. ${PlayShareCard.REPLAY[language] ?? PlayShareCard.REPLAY.en}`
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

  /** A said text in the page's language, then English, then any; its first paragraph, cut at a word. */
  private static said(description: unknown, language: string): string | undefined {
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
