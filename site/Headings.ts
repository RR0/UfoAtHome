/**
 * Gives every section heading an id, so any part of a page can be linked to directly.
 *
 * Done here rather than by hand in each page because it has to hold for ALL of them, including the
 * ones written next year: a heading somebody wants to point at is not knowable in advance, and an
 * id added only where somebody happened to think of it is a link that works on four pages out of
 * ten. The id is derived from the heading's own words, so it is readable in the address bar and
 * survives a page being reordered — but not a heading being reworded, which is the price of not
 * inventing opaque ones.
 *
 * A heading that already carries an id keeps it: an id written by hand is a promise made to
 * whatever links to it, and generated text must not break it. A heading INSIDE a link keeps its
 * id and loses the visible anchor — see withAnchors for what nesting one costs.
 */
export class Headings {

  private static readonly HEADING = /<(h[23])([^>]*)>([\s\S]*?)<\/\1>/g

  /** Named entities this site's headings actually contain — the markup is generated, so the set is
   * small and known rather than open-ended. */
  private static readonly ENTITIES: ReadonlyArray<readonly [RegExp, string]> = [
    [/&lt;/g, "<"], [/&gt;/g, ">"], [/&amp;/g, "&"], [/&quot;/g, '"'], [/&#39;/g, "'"], [/&nbsp;/g, " "]
  ]

  withAnchors(html: string, anchorLabel: string): string {
    const taken = new Set<string>()
    const links = this.linkSpans(html)
    return html.replace(Headings.HEADING, (whole, tag: string, attributes: string, text: string, offset: number) => {
      if (/\bid\s*=/.test(attributes)) {
        return whole
      }
      const id = this.unique(this.slug(text), taken)
      if (!id) {
        return whole
      }
      // The id still goes on — it costs nothing and the heading stays linkable — but the visible
      // anchor does not: an <a> inside an <a> is not valid HTML, and a parser resolves it by
      // closing the OUTER one at that point, which leaves the rest of the card outside the link
      // it was meant to be. That is how the documentation hub's three cards came apart.
      const inLink = links.some(([from, to]) => offset > from && offset < to)
      const anchor = inLink ? "" : `<a class="heading-anchor" href="#${id}" aria-label="${anchorLabel}">#</a>`
      return `<${tag}${attributes} id="${id}">${text}${anchor}</${tag}>`
    })
  }

  /** Where a link is open, as [start, end] offsets — the outermost one only, which is all a
   * containment test needs. */
  private linkSpans(html: string): Array<[number, number]> {
    const spans: Array<[number, number]> = []
    let depth = 0
    let start = 0
    for (const match of html.matchAll(/<a\b[^>]*>|<\/a\s*>/gi)) {
      if (match[0].startsWith("</")) {
        depth = Math.max(0, depth - 1)
        if (depth === 0) {
          spans.push([start, match.index + match[0].length])
        }
      } else {
        if (depth === 0) {
          start = match.index
        }
        depth++
      }
    }
    return spans
  }

  /** The heading's words, as an address bar can carry them. */
  private slug(text: string): string {
    let plain = text.replace(/<[^>]+>/g, "")
    for (const [entity, character] of Headings.ENTITIES) {
      plain = plain.replace(entity, character)
    }
    return plain
      .toLowerCase()
      // Accents are stripped rather than encoded: "phénomène" in a URL is either percent-escaped
      // into noise or left to a copy-paste that may not survive the trip.
      .normalize("NFD")
      .replace(/[̀-ͯ]/g, "")
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-+|-+$/g, "")
      .slice(0, 60)
      .replace(/-+$/g, "")
  }

  /** Two headings on a page can genuinely say the same thing; the first one keeps the plain id. */
  private unique(slug: string, taken: Set<string>): string {
    if (!slug) {
      return ""
    }
    let candidate = slug
    for (let n = 2; taken.has(candidate); n++) {
      candidate = `${slug}-${n}`
    }
    taken.add(candidate)
    return candidate
  }
}
