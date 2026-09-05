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

  it("falls back to the browser alone where the page declares nothing", () => {
    document.documentElement.removeAttribute("lang")
    const element = inDocument(`<span id="widget"></span>`, "#widget")
    expect(HostLocale.preferencesFor(element)).toEqual([...navigator.languages])
  })
})
