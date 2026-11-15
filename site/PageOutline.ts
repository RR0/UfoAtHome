/**
 * The "On this page" outline of a long page: its sections, listed beside the text on a wide screen and behind a
 * button on a narrow one, the section being read marked as the reader scrolls.
 *
 * Built from the headings `Headings.withAnchors` has already given an id AND a visible anchor: those are the page's
 * sections. A heading without the anchor is a card's title inside a link (a demo, a hub entry), which is not a part
 * of the page one would jump to, and is left out. The ids are the ones every language shares, so the outline of a
 * translation leads to the same places.
 *
 * Only a page with enough sections gets one: on a page that fits in a few screens, a list of three titles is noise
 * beside text that already shows them.
 */
export class PageOutline {

  /** Fewer sections than this, and the page is read without one. */
  static readonly MIN_SECTIONS = 5

  /** An <h2> or <h3> carrying its section anchor, as `Headings.withAnchors` writes them. Never read past the end of a
   * heading: one without the anchor would otherwise run on to the next one's, taking the text between as its title. */
  private static readonly SECTION = /<(h[23])\b[^>]*\bid="([^"]+)"[^>]*>((?:(?!<\/h[23]>)[\s\S])*?)<a class="heading-anchor"/g

  /**
   * Makes the outline follow the reading and fit the screen. A classic script, not a module: it is small and has
   * nothing to import, and the outline is open from the first paint on a wide screen rather than after the modules.
   *
   * - On a wide screen the outline stands open beside the text; on a narrow one it is a button that opens a panel,
   *   closed again by the choice of a section.
   * - The section being read is the last whose heading has gone above the first third of the window; the outline
   *   scrolls itself (never the page) to keep it in sight.
   * - A heading not shown (the panel of a tab not chosen, as the editor's ten groups) is neither listed nor read.
   */
  static readonly SCRIPT = `<script>
  class PageOutlineReading {
    constructor(outline) {
      this.details = outline.querySelector("details")
      this.list = outline.querySelector("ol")
      this.wide = matchMedia("(min-width: 64rem)")
      this.entries = Array.from(this.list.querySelectorAll("a"), link => ({
        link, heading: document.getElementById(decodeURIComponent(link.hash.substring(1)))
      })).filter(entry => entry.heading)
      this.fit()
      this.wide.addEventListener("change", () => this.fit())
      this.list.addEventListener("click", event => {
        if (event.target.closest("a") && !this.wide.matches) {
          this.details.open = false
        }
      })
      addEventListener("scroll", () => this.schedule(), {passive: true})
      addEventListener("resize", () => this.schedule(), {passive: true})
      this.update()
    }

    fit() {
      this.details.open = this.wide.matches
    }

    schedule() {
      if (!this.pending) {
        this.pending = requestAnimationFrame(() => {
          this.pending = 0
          this.update()
        })
      }
    }

    update() {
      const line = innerHeight / 3
      let reading
      for (const entry of this.entries) {
        const shown = entry.heading.getClientRects().length > 0
        entry.link.parentElement.hidden = !shown
        if (!shown) {
          continue
        }
        if (entry.heading.getBoundingClientRect().top > line) {
          break
        }
        reading = entry
      }
      if (reading === this.current) {
        return
      }
      this.current?.link.removeAttribute("aria-current")
      this.current = reading
      if (reading) {
        reading.link.setAttribute("aria-current", "location")
        const item = reading.link.parentElement
        const top = item.offsetTop - this.list.offsetTop
        if (top < this.list.scrollTop || top + item.offsetHeight > this.list.scrollTop + this.list.clientHeight) {
          this.list.scrollTop = top - this.list.clientHeight / 3
        }
      }
    }
  }
  for (const outline of document.querySelectorAll(".page-outline")) {
    new PageOutlineReading(outline)
  }
</script>`

  /**
   * @param html The page's content, its headings already anchored.
   * @param label What the outline is called ("On this page"), in the page's language.
   * @return The outline's markup, or undefined for a page with too few sections to need one.
   */
  render(html: string, label: string): string | undefined {
    const items: string[] = []
    for (const [, tag, id, inner] of html.matchAll(PageOutline.SECTION)) {
      // The heading's markup is already escaped text; only its tags go (a <code>, an <abbr>), not its entities.
      const text = inner.replace(/<[^>]+>/g, "").replace(/\s+/g, " ").trim()
      if (text) {
        items.push(`<li class="${tag}"><a href="#${id}">${text}</a></li>`)
      }
    }
    if (items.length < PageOutline.MIN_SECTIONS) {
      return undefined
    }
    return `<nav class="page-outline" aria-label="${label}">
  <details>
    <summary>${label}</summary>
    <ol>
      ${items.join("\n      ")}
    </ol>
  </details>
</nav>`
  }
}
