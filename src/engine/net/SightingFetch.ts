/** What went wrong fetching a recording, as far as a browser will ever let a page find out. */
export type SightingFetchKind = "cors" | "mixed-content" | "unreachable" | "status" | "malformed"

export class SightingFetchError extends Error {

  constructor(readonly kind: SightingFetchKind, readonly url: string, readonly status?: number) {
    super(`${kind}: ${url}${status === undefined ? "" : ` (HTTP ${status})`}`)
    this.name = "SightingFetchError"
  }
}

/**
 * Fetches a recording, and says WHY when it cannot.
 *
 * A failed cross-origin fetch is deliberately opaque: the browser rejects with a bare `TypeError`
 * and the same one whether the server refused the origin, the host does not resolve, the machine
 * is offline, or an extension blocked it. Telling those apart from script would leak, across
 * origins, whether a host exists and answers — so the platform will not, and no amount of trying
 * gets the reason out of the rejection itself.
 *
 * What CAN be established is whether the server was reached at all, and that is the distinction
 * that matters here. A second request in `no-cors` mode is sent and its reply is opaque — unreadable
 * by design — but the promise RESOLVING is proof that something answered. A server that answered
 * and bytes the page was not allowed to read is a CORS refusal; a server that answered nothing is
 * unreachable. It is inference rather than a reported cause, so the messages built on it say
 * "almost certainly" and not "is".
 *
 * The cheaper cases are settled before any of that: a secure page may not fetch an insecure URL at
 * all, and a same-origin failure is never a CORS one.
 */
export class SightingFetch {

  static async json(url: string): Promise<unknown> {
    // Resolved only to be REASONED about — which origin, which protocol. What is handed to fetch
    // stays the caller's own string, relative or not, because that is what every consumer of this
    // already passes and what a page's own network log will show.
    const resolved = new URL(url, location.href)
    // Blocked by the browser before a request is even made, and with its own obvious remedy.
    if (location.protocol === "https:" && resolved.protocol === "http:") {
      throw new SightingFetchError("mixed-content", url)
    }
    let response: Response
    try {
      response = await fetch(url)
    } catch {
      throw await this.diagnose(url, resolved)
    }
    if (!response.ok) {
      throw new SightingFetchError("status", url, response.status)
    }
    try {
      return await response.json()
    } catch {
      throw new SightingFetchError("malformed", url)
    }
  }

  /** Reached, or not reached — see the class comment for why that is the only question a page is
   * allowed to answer. */
  private static async diagnose(url: string, resolved: URL): Promise<SightingFetchError> {
    if (resolved.origin === location.origin) {
      return new SightingFetchError("unreachable", url)
    }
    try {
      await fetch(url, { mode: "no-cors" })
      return new SightingFetchError("cors", url)
    } catch {
      return new SightingFetchError("unreachable", url)
    }
  }
}
