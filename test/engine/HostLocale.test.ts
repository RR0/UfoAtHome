import { describe, expect, it } from "vitest"
import { HostLocale } from "../../src/i18n/locale.js"

describe("HostLocale", () => {

  const inDocument = (markup: string, selector: string): Element => {
    document.body.innerHTML = markup
    return document.querySelector(selector)!
  }

  it("puts the page's own declared language ahead of the browser's", () => {
    const element = inDocument(`<div lang="en"><span id="widget"></span></div>`, "#widget")
    expect(HostLocale.preferencesFor(element)[0]).toBe("en")
  })

  it("reads the NEAREST declared language, not the root's", () => {
    const element = inDocument(`<div lang="en"><section lang="fr"><span id="widget"></span></section></div>`, "#widget")
    expect(HostLocale.preferencesFor(element)[0]).toBe("fr")
  })

  it("still offers the browser's own preferences after the declared one", () => {
    const element = inDocument(`<div lang="en"><span id="widget"></span></div>`, "#widget")
    expect(HostLocale.preferencesFor(element).slice(1)).toEqual([...navigator.languages])
  })

  it("takes a language declared on the component itself", () => {
    // `<rr0-sighting lang="en">` on a French page: the tag is the closest declaration there is, so
    // that one embed speaks English and the article around it does not change.
    const element = inDocument(`<article lang="fr"><rr0-sighting id="widget" lang="en"></rr0-sighting></article>`, "#widget")
    expect(HostLocale.preferencesFor(element)[0]).toBe("en")
  })

  it("declares a FORCE, never a restriction: the browser's own list still follows", () => {
    // A declared language decides what is read where the recording has it. It does not throw away
    // what the reader can read: a `lang="de"` article holding a recording with no German still has
    // to reach a French reader in French rather than in whatever came first in the file.
    const element = inDocument(`<article lang="de"><span id="widget"></span></article>`, "#widget")
    expect(HostLocale.preferencesFor(element)).toEqual(["de", ...navigator.languages])
  })

  it("reaches out of a shadow root to find the page's language", () => {
    // `<rr0-ufo>` lives inside `<rr0-sighting>`'s shadow root, so `closest` alone stopped at that
    // root and never saw the article around it. Which was invisible until a recording began
    // carrying several languages: the outer element then showed the French account while the
    // milestone captions inside it showed the English one, in the same frame.
    const host = inDocument(`<article lang="fr"><div id="host"></div></article>`, "#host")
    const shadow = host.attachShadow({ mode: "open" })
    shadow.innerHTML = `<span id="nested"></span>`
    expect(HostLocale.preferencesFor(shadow.querySelector("#nested")!)).toEqual(["fr", ...navigator.languages])
  })

  it("lets a shadow root declare a language of its own, ahead of the page's", () => {
    const host = inDocument(`<article lang="fr"><div id="host"></div></article>`, "#host")
    const shadow = host.attachShadow({ mode: "open" })
    shadow.innerHTML = `<section lang="en"><span id="nested"></span></section>`
    expect(HostLocale.preferencesFor(shadow.querySelector("#nested")!)[0]).toBe("en")
  })

  it("falls back to the browser alone where the page declares nothing", () => {
    document.documentElement.removeAttribute("lang")
    const element = inDocument(`<span id="widget"></span>`, "#widget")
    expect(HostLocale.preferencesFor(element)).toEqual([...navigator.languages])
  })
})
