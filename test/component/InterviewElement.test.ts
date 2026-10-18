import { afterEach, describe, expect, it, vi } from "vitest"
import { register, INTERVIEW_SEEK_EVENT } from "../../src/component/InterviewElement.js"
import type { InterviewElement } from "../../src/component/InterviewElement.js"

register()

const files: Record<string, unknown> = {}
const wait = (ms = 40) => new Promise(resolve => setTimeout(resolve, ms))

const interview = {
  version: 1, interviewOf: "jv",
  speakers: { interviewer: { role: "interviewer", by: { people: "CoulthartRoss" } }, witness: { role: "witness", by: { people: "ValleeJacques" } } },
  segments: [
    { speaker: "interviewer", text: "When did you meet him?" },
    { speaker: "witness", parts: [{ text: "I met" }, { text: "Allen Hynek", href: "../people/h/HynekJosefAllen/", title: "J. Allen Hynek" }, { text: "in 1960." }], refs: [{ at: 12 }] },
    { speaker: "witness", parts: [{ text: "He lived in" }, { redacted: { reason: { en: "Address" } } }, { text: ", near Chicago." }] }
  ]
}

const make = async (attributes: Record<string, string>): Promise<InterviewElement> => {
  vi.stubGlobal("fetch", vi.fn(async (url: string) => ({
    ok: url in files, status: url in files ? 200 : 404, json: () => Promise.resolve(structuredClone(files[url]))
  })))
  const element = document.createElement("rr0-interview") as InterviewElement
  for (const [name, value] of Object.entries(attributes)) element.setAttribute(name, value)
  document.body.appendChild(element)
  await wait()
  return element
}

describe("InterviewElement", () => {
  afterEach(() => {
    document.body.innerHTML = ""
    vi.unstubAllGlobals()
    for (const key of Object.keys(files)) delete files[key]
  })

  it("reads the file at its address as a dialogue, in its own children where the page's styles reach", async () => {
    files["https://example.org/time/interview.json"] = interview
    const element = await make({ src: "https://example.org/time/interview.json" })
    expect(element.shadowRoot).toBeNull()
    const turns = [...element.querySelectorAll<HTMLElement>(".turn")]
    expect(turns.map(turn => turn.querySelector(".who")!.textContent)).toEqual(["Ross Coulthart", "Jacques Vallee", "Jacques Vallee"])
    expect(document.head.querySelectorAll("style[data-rr0-interview]")).toHaveLength(1)
  })

  it("links a stretch to its page, relative to the file, and keeps the spaces of what was said", async () => {
    files["https://example.org/time/interview.json"] = interview
    const element = await make({ src: "https://example.org/time/interview.json" })
    const said = element.querySelectorAll(".turn .said")
    const link = said[1].querySelector("a")!
    expect(link.textContent).toBe("Allen Hynek")
    expect(link.href).toBe("https://example.org/people/h/HynekJosefAllen/")
    expect(link.title).toBe("J. Allen Hynek")
    expect(said[1].textContent).toBe("I met Allen Hynek in 1960.")
    // A stretch taken out stays a bar that says why; the punctuation after it follows it.
    expect((said[2].querySelector(".bar") as HTMLElement).dataset.tip).toBe("Passage removed : Address")
    expect(said[2].textContent).toBe("He lived in , near Chicago.")
  })

  it("says nothing of proofreading when the file does not say who has proofread it", async () => {
    files["https://example.org/time/interview.json"] = interview
    const element = await make({ src: "https://example.org/time/interview.json" })
    expect(element.querySelector<HTMLElement>(".rr0-interview-status")!.hidden).toBe(true)
  })

  it("follows a passage to its moment: told to the page, and shown by the player it names", async () => {
    files["https://example.org/time/interview.json"] = interview
    const player = document.createElement("div") as HTMLDivElement & { seekTo: (seconds: number, sighting?: string) => void }
    player.id = "player"
    const seeks: [number, string | undefined][] = []
    player.seekTo = (seconds, sighting) => seeks.push([seconds, sighting])
    document.body.appendChild(player)
    const element = await make({ src: "https://example.org/time/interview.json", player: "player" })
    const told: unknown[] = []
    element.addEventListener(INTERVIEW_SEEK_EVENT, event => told.push((event as CustomEvent).detail))
    element.querySelector<HTMLButtonElement>(".ref")!.click()
    expect(told).toEqual([{ sighting: "jv", at: 12 }])
    expect(seeks).toEqual([[12, "jv"]])
  })

  it("says nothing was said when the file cannot be read", async () => {
    const element = await make({ src: "https://example.org/time/missing.json" })
    expect(element.querySelector(".rr0-interview-turns")!.textContent).toBe("Nothing was said yet.")
  })
})
