// @vitest-environment jsdom
import { describe, expect, it } from "vitest"
import { SectionFolds } from "../../src/component/SectionFolds.js"
import { WindowClose } from "../../src/component/WindowClose.js"

const messages = {
  moreSettings: "More settings ({n})", lessSettings: "Fewer settings", showSettings: "Show ({n} settings)",
  showSettingsOne: "Show (1 setting)", showSettingsAny: "Show", hideSettings: "Hide"
}

function fixture(html: string): HTMLElement {
  const root = document.createElement("div")
  root.innerHTML = html
  return root
}

describe("SectionFolds", () => {
  it("ends a section holding advanced fields with how many it holds back, and shows them when opened", () => {
    const root = fixture(`<div class="form-section"><h3 class="section-title">Vision</h3>
      <label>Focal <input/></label><label class="adv">Aperture <input/></label><label class="adv">Roll <input/></label></div>`)
    const folds = new SectionFolds(root)
    folds.setMessages(messages)
    const toggle = root.querySelector<HTMLButtonElement>(".more-toggle")!
    expect(toggle.textContent).toBe("More settings (2)")
    expect(root.querySelector(".form-section")!.lastElementChild).toBe(toggle)
    toggle.click()
    expect(root.querySelector(".form-section")!.hasAttribute("data-open")).toBe(true)
    expect(toggle.textContent).toBe("Fewer settings")
    expect(toggle.getAttribute("aria-expanded")).toBe("true")
  })

  it("shows the fields it would hold back, and offers no fold, where they fit the lines the section has", () => {
    const html = `<div class="form-section"><label>Focal <input/></label><label class="adv">Aperture <input/></label></div>`
    // A page that lays the section out: as tall open as folded (the fields beside the others), then taller (on lines of their own).
    for (const [openHeight, fits] of [[40, true], [80, false]] as const) {
      const root = fixture(html)
      const section = root.querySelector<HTMLElement>(".form-section")!
      section.getBoundingClientRect = () => ({ height: section.hasAttribute("data-open") ? openHeight : 40 }) as DOMRect
      new SectionFolds(root).setMessages(messages)
      expect(section.hasAttribute("data-fits")).toBe(fits)
      expect(root.querySelector<HTMLButtonElement>(".more-toggle")!.hidden).toBe(fits)
      expect(section.hasAttribute("data-open")).toBe(false)
    }
  })

  it("does not count a field hidden for another reason, and says nothing when none is left", () => {
    const root = fixture(`<div class="form-section"><label>Focal <input/></label><label class="adv" hidden>Aperture <input/></label></div>`)
    new SectionFolds(root).setMessages(messages)
    expect(root.querySelector<HTMLButtonElement>(".more-toggle")!.hidden).toBe(true)
  })

  it("holds a whole advanced section back under its title", () => {
    const root = fixture(`<div class="form-section" data-fold="all"><h3 class="section-title">Pose</h3><label>Heading <input/></label></div>`)
    new SectionFolds(root).setMessages(messages)
    const toggle = root.querySelector<HTMLButtonElement>(".more-toggle")!
    expect(toggle.textContent).toBe("Show (1 setting)")
    expect(toggle.previousElementSibling!.className).toBe("section-title")
  })

  it("opens the section of a field somebody is sent to", () => {
    const root = fixture(`<div class="form-section"><label class="adv">ID <input id="id"/></label></div>`)
    const folds = new SectionFolds(root)
    folds.setMessages(messages)
    folds.reveal(root.querySelector("#id")!)
    expect(root.querySelector(".form-section")!.hasAttribute("data-open")).toBe(true)
  })
})

describe("WindowClose", () => {
  it("gives a window one ✕, labelled, that closes it", () => {
    const menu = document.createElement("div")
    let closed = 0
    WindowClose.button(menu, "Close", () => closed++)
    WindowClose.button(menu, "Fermer", () => closed++)
    const buttons = menu.querySelectorAll<HTMLButtonElement>(".window-close")
    expect(buttons).toHaveLength(1)
    expect(buttons[0].getAttribute("aria-label")).toBe("Fermer")
    buttons[0].click()
    expect(closed).toBe(1)
  })

  it("lists the open group's sections in an index where the page shows it, the one chosen shown alone, unfolded, its title no fold", () => {
    const root = fixture(`<nav class="section-index"></nav>
      <section class="group-panel"><div class="form-section"><h3 class="section-title">Identity</h3><label>ID <input/></label></div>
      <div class="form-section"><h3 class="section-title">Profile</h3><label>Age <input/></label></div></section>`)
    document.body.append(root)
    const folds = new SectionFolds(root)
    folds.setMessages(messages)
    const nav = root.querySelector<HTMLElement>(".section-index")!
    folds.indexIn(nav, () => root.querySelector<HTMLElement>(".group-panel")!)
    const [identity, profile] = [...root.querySelectorAll<HTMLElement>(".form-section")]
    // Where the page leaves no room for it (its CSS hides it), nothing is listed: the titles fold their sections as before.
    nav.style.display = "none"
    folds.refresh()
    expect(nav.children.length).toBe(0)
    expect(identity.hasAttribute("data-elsewhere")).toBe(false)
    nav.style.display = "block"
    folds.refresh()
    expect([...nav.children].map(link => link.textContent)).toEqual(["Identity", "Profile"])
    expect(nav.children[0].getAttribute("aria-current")).toBe("true")
    expect(identity.hasAttribute("data-unfolded")).toBe(true)
    expect(profile.hasAttribute("data-elsewhere")).toBe(true)
    ;(nav.children[1] as HTMLElement).click()
    expect(profile.hasAttribute("data-elsewhere")).toBe(false)
    expect(profile.hasAttribute("data-unfolded")).toBe(true)
    expect(identity.hasAttribute("data-elsewhere")).toBe(true)
    // Its title, beside the index, folds nothing.
    profile.querySelector<HTMLElement>(".section-title")!.click()
    expect(profile.hasAttribute("data-unfolded")).toBe(true)
    root.remove()
  })
})
