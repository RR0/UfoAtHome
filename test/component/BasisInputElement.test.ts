import { describe, expect, it } from "vitest"
import { BasisInputElement, register } from "../../src/component/BasisInputElement.js"
import { HintElement } from "../../src/component/HintElement.js"

const sourceMessages = {
  field: "What it rests on",
  kinds: { none: "Nothing named", said: "What the witness said", document: "A document", picture: "A picture", tool: "A tool" },
  interviewField: "Interview", segmentField: "Passage", documentField: "Title", atField: "Where in it", urlField: "Address",
  pictureField: "Picture", toolField: "Tool",
  free: "A working hypothesis rests on nothing.",
  segmentUnnamed: "Turn {n}", interviewOnly: "The case's interview"
}

const messages = {
  title: "How this value was obtained", basisField: "Basis", howField: "How", rationaleField: "Rationale",
  basis: { established: "established", stated: "stated", measured: "measured", derived: "derived", assumed: "assumed", fitted: "fitted" }
}

function mounted(): BasisInputElement {
  register()
  const element = document.createElement(BasisInputElement.TAG) as BasisInputElement
  element.messages = messages
  document.body.append(element)
  return element
}

describe("BasisInputElement", () => {
  it("says what a value stands on, its rationale as its tooltip", () => {
    const element = mounted()
    expect(element.pill.dataset.basis).toBe("stated")
    element.entry = { basis: "assumed", rationale: "Nobody measured it" }
    expect(element.pill.textContent).toBe("assumed")
    expect(element.pill.title).toContain("Nobody measured it")
  })

  it("opens a window where its basis and rationale are said, and reports each change", () => {
    const element = mounted()
    const reported: unknown[] = []
    element.addEventListener("basischange", event => reported.push((event as CustomEvent).detail.entry))
    element.pill.click()
    const window = element.openWindow!
    const basis = window.querySelector("select")!
    basis.value = "derived"
    basis.dispatchEvent(new Event("change"))
    const rationale = window.querySelector("textarea")!
    rationale.value = "From the road's width"
    rationale.dispatchEvent(new Event("change"))
    expect(reported).toEqual([{ basis: "derived" }, { basis: "derived", rationale: "From the road's width" }])
    // Every basis the format knows, strongest first: a reader of the window sees the whole scale, not the three in the middle.
    expect([...basis.options].map(option => option.value)).toEqual(["established", "measured", "stated", "derived", "assumed", "fitted"])
    // No list of ways given: none shown.
    expect(window.querySelectorAll("select").length).toBe(1)
    basis.value = "stated"
    rationale.value = ""
    rationale.dispatchEvent(new Event("change"))
    expect(reported.at(-1)).toBeUndefined()
  })

  it("says what the value rests on: the turn of speech of an interview the witness said it in", () => {
    const element = mounted()
    element.sourceMessages = sourceMessages
    element.choices = { interviews: [
      { id: "interview-1", label: "Interview of Q. B.", segments: [{ index: 0, label: "Q. B.: a light over the wood" }, { index: 1, label: "" }] },
      { id: "interview-2", label: "Second interview of Q. B.", segments: [{ index: 0, label: "Q. B.: higher than I said" }] }
    ] }
    const reported: unknown[] = []
    element.addEventListener("basischange", event => reported.push((event as CustomEvent).detail.entry))
    element.pill.click()
    const window = element.openWindow!
    const kind = [...window.querySelectorAll("select")].find(select => [...select.options].some(option => option.value === "said"))!
    kind.value = "said"
    kind.dispatchEvent(new Event("change"))
    // The interview corrected is the one cited: which interview each value cites IS the history of what the witness said.
    const selects = [...window.querySelectorAll("select")]
    const which = selects[selects.indexOf(kind) + 1]!
    which.value = "interview-2"
    which.dispatchEvent(new Event("change"))
    expect(reported.at(-1)).toEqual({ basis: "stated", source: { said: { interview: "interview-2", segment: 0 } } })
    // A turn whose text is not known is still one to point at.
    which.value = "interview-1"
    which.dispatchEvent(new Event("change"))
    const segment = [...window.querySelectorAll("select")].at(-1)!
    expect([...segment.options].map(option => option.text)).toEqual(["Q. B.: a light over the wood", "Turn 2"])
    segment.value = "1"
    segment.dispatchEvent(new Event("change"))
    expect(reported.at(-1)).toEqual({ basis: "stated", source: { said: { interview: "interview-1", segment: 1 } } })
    // A value that names what it rests on says so on its pill, without being opened.
    expect(element.pill.dataset.sourced).toBe("yes")
  })

  it("names a document with where in it and its address, and a picture only among the recording's", () => {
    const element = mounted()
    element.sourceMessages = sourceMessages
    element.choices = { pictures: [{ id: "photo-1", label: "From the wall, 1968" }] }
    const reported: unknown[] = []
    element.addEventListener("basischange", event => reported.push((event as CustomEvent).detail.entry))
    element.pill.click()
    const window = element.openWindow!
    const kind = [...window.querySelectorAll("select")].find(select => [...select.options].some(option => option.value === "document"))!
    // No interview to point at: that kind is not offered at all, rather than offered empty.
    expect([...kind.options].map(option => option.value)).toEqual(["none", "document", "picture", "tool"])
    kind.value = "document"
    kind.dispatchEvent(new Event("change"))
    const [title, at, url] = [...window.querySelectorAll("input")]
    title!.value = "GEIPAN questionnaire"
    at!.value = "question 14"
    url!.value = "https://example.org/q.pdf"
    url!.dispatchEvent(new Event("change"))
    expect(reported.at(-1)).toEqual({ basis: "stated", source: { document: "GEIPAN questionnaire", at: "question 14", url: "https://example.org/q.pdf" } })
    kind.value = "picture"
    kind.dispatchEvent(new Event("change"))
    const picture = [...window.querySelectorAll("select")].at(-1)!
    picture.value = "photo-1"
    picture.dispatchEvent(new Event("change"))
    // One source at a time: the document it named is gone, not kept beside the picture.
    expect(reported.at(-1)).toEqual({ basis: "stated", source: { picture: "photo-1" } })
  })

  it("leaves a free basis resting on nothing: no fields, and whatever was named goes", () => {
    const element = mounted()
    element.sourceMessages = sourceMessages
    element.entry = { basis: "derived", source: { tool: "QGIS" } }
    const reported: unknown[] = []
    element.addEventListener("basischange", event => reported.push((event as CustomEvent).detail.entry))
    element.pill.click()
    const window = element.openWindow!
    const basis = window.querySelector("select")!
    basis.value = "fitted"
    basis.dispatchEvent(new Event("change"))
    expect(window.querySelector(".basis-source-free")?.textContent).toBe(sourceMessages.free)
    // Nothing to fill in, and the tool it rested on is not carried over: a hypothesis rests on nothing.
    expect(reported.at(-1)).toEqual({ basis: "fitted" })
    expect(element.pill.dataset.sourced).toBeUndefined()
  })

  it("is not asked for where its host does not keep it", () => {
    const element = mounted()
    element.sourceMessages = sourceMessages
    element.sourceKept = false
    element.pill.click()
    expect(element.openWindow!.querySelector(".basis-source")).toBeNull()
  })
})

describe("HintElement", () => {
  it("says what a label leaves out, on hover and pressed", () => {
    const hint = HintElement.of("width, and height above the eye")
    document.body.append(hint)
    const button = hint.querySelector("button")!
    expect(button.title).toBe("width, and height above the eye")
    const popup = hint.querySelector<HTMLElement>(".hint-pop")!
    expect(popup.hidden).toBe(true)
    button.click()
    expect(popup.hidden).toBe(false)
  })
})
