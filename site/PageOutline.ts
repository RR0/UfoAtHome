import { Headings } from "./Headings.js"

/**
 * The "On this page" outline of a long page: its sections, listed beside the text on a wide screen and behind a
 * button on a narrow one, the section being read marked as the reader scrolls.
 *
 * Built from the page's sections as `Headings.sections` finds them once anchored: every heading with an id, except a
 * card's title inside a link (a demo, a hub entry), which is not a part of the page one would jump to. The ids are
 * the ones every language shares, so the outline of a translation leads to the same places.
 *
 * Only a page with enough sections gets one: on a page that fits in a few screens, a list of three titles is noise
 * beside text that already shows them.
 */
export class PageOutline {

  private readonly headings = new Headings()

  /** Fewer sections than this, and the page is read without one. */
  static readonly MIN_SECTIONS = 5

  /**
   * Makes the outline follow the reading and fit the screen. A classic script, not a module: it is small and has
   * nothing to import, and the outline is open from the first paint on a wide screen rather than after the modules.
   *
   * - On a wide screen the outline stands open beside the text. On a narrow one it is a bar held under the site's
   *   header, at every width and every point of the page, naming the section being read; a tap opens the list below
   *   it, and the choice of a section or a tap elsewhere closes it. A button in a corner was there too, and was not
   *   seen.
   * - The section being read is the browser's to say: the list is a `scroll-target-group`, so the link whose
   *   section is being read matches `:target-current`, and the style sheet marks it with nothing from here. The
   *   script only reads it back, for what CSS cannot do: name it in the narrow bar, say it to assistive technology
   *   (`aria-current`), and scroll the outline itself (never the page) to keep it in sight. A browser without
   *   them (Firefox and Safari in 2026) gets the same from a measure: the last section whose heading has gone above
   *   the first third of the window.
   * - A heading not shown (the panel of a tab not chosen, as the editor's ten groups) is neither listed nor read.
   * - Once the page's title has gone out of sight, the outline is headed by it instead of "On this page": the
   *   reader deep in a long page still sees which page it is.
   */
  static readonly SCRIPT = `<script>
  class PageOutlineReading {
    constructor(outline) {
      this.details = outline.querySelector("details")
      this.list = outline.querySelector("ol")
      this.where = outline.querySelector(".page-outline-current")
      this.label = outline.querySelector(".page-outline-label")
      const title = document.querySelector("main h1")
      if (title) {
        const onThisPage = this.label.textContent
        const pageTitle = title.textContent.trim()
        // Out of sight once it has gone up under the header, not before.
        new IntersectionObserver(([entry]) => {
          const gone = !entry.isIntersecting && entry.boundingClientRect.top < 0
          this.label.textContent = gone ? pageTitle : onThisPage
          this.label.classList.toggle("page-title", gone)
        }, {rootMargin: "-80px 0px 0px 0px"}).observe(title)
      }
      // The bar is held right under the header, whose height depends on how its links wrap.
      const header = document.querySelector(".site-header")
      if (header) {
        new ResizeObserver(() => document.documentElement.style.setProperty("--site-header-height", header.offsetHeight + "px")).observe(header)
      }
      this.wide = matchMedia("(min-width: 56rem)")
      this.native = CSS.supports("scroll-target-group: auto") && CSS.supports("selector(:target-current)")
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
      document.addEventListener("click", event => {
        if (!this.wide.matches && this.details.open && !outline.contains(event.target)) {
          this.details.open = false
        }
      })
      addEventListener("scroll", () => this.schedule(), {passive: true})
      // The browser settles :target-current as the scroll goes; read once more where it stops.
      addEventListener("scrollend", () => this.schedule())
      addEventListener("resize", () => this.schedule(), {passive: true})
      this.update()
    }

    fit() {
      this.details.open = this.wide.matches
    }

    /**
     * Updates at most once per frame, however many scroll events come. On the frame AFTER the scroll: the browser
     * settles :target-current as it renders the scroll, so read in the scroll's own frame it is still the previous
     * section's.
     */
    schedule() {
      if (!this.pending) {
        this.pending = requestAnimationFrame(() => requestAnimationFrame(() => {
          this.pending = 0
          this.update()
        }))
      }
    }

    update() {
      const shown = this.entries.filter(entry => {
        const visible = entry.heading.getClientRects().length > 0
        entry.link.parentElement.hidden = !visible
        return visible
      })
      const reading = this.native ? shown.find(entry => entry.link.matches(":target-current")) : this.measured(shown)
      if (reading === this.current) {
        return
      }
      this.current?.link.removeAttribute("aria-current")
      this.current = reading
      this.where.textContent = reading ? reading.link.textContent : ""
      if (reading) {
        reading.link.setAttribute("aria-current", "location")
        const item = reading.link.parentElement
        const top = item.offsetTop - this.list.offsetTop
        if (top < this.list.scrollTop || top + item.offsetHeight > this.list.scrollTop + this.list.clientHeight) {
          this.list.scrollTop = top - this.list.clientHeight / 3
        }
      }
    }

    /** Where :target-current is not known: the last section whose heading has gone above the first third of the window. */
    measured(shown) {
      const line = innerHeight / 3
      let reading
      for (const entry of shown) {
        if (entry.heading.getBoundingClientRect().top > line) {
          break
        }
        reading = entry
      }
      return reading
    }
  }
  for (const outline of document.querySelectorAll(".page-outline")) {
    new PageOutlineReading(outline)
  }
</script>`

  /**
   * @param html The page's content, its headings already anchored.
   * @param label What the outline is called ("On this page"), in the page's language.
   * @param back The page's way back up (its hero's crumb), put first in the outline: where the reader looks to find
   *   their way around the page is where the way out of it is too, and it stays in sight while the hero scrolls away.
   * @return The outline's markup, or undefined for a page with too few sections to need one.
   */
  render(html: string, label: string, back?: string): string | undefined {
    const items = this.headings.sections(html).map(section => `<li class="${section.level}"><a href="#${section.id}">${section.text}</a></li>`)
    if (items.length < PageOutline.MIN_SECTIONS) {
      return undefined
    }
    // The arrow apart from the words, so that a narrow bar can show the arrow alone.
    const way = back?.replace(/>←\s*([\s\S]*?)<\/a>$/, '><span aria-hidden="true">←</span> <span class="page-outline-back-text">$1</span></a>')
    return `<nav class="page-outline" aria-label="${label}">${way ? `
  <p class="page-outline-back">${way}</p>` : ""}
  <details>
    <summary><span class="page-outline-label">${label}</span><span class="page-outline-current"></span></summary>
    <ol>
      ${items.join("\n      ")}
    </ol>
  </details>
</nav>`
  }
}
