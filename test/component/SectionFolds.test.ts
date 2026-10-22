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
})
