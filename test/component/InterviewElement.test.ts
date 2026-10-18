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
    { speaker: "witness", text: "I met <a href=\"../people/h/HynekJosefAllen/\" title=\"J. Allen Hynek\">Allen Hynek</a> in 1960.", refs: [{ at: 12 }] },
    { speaker: "interviewer", text: "Since <i lang=\"en\">Fastwalker</i> and <a href=\"../book/si/\"><i>Science interdite</i></a>&nbsp;? 5 < 6 <script>window.hacked = true</script><b onclick=\"window.hacked = true\">!</b>" },
    { speaker: "witness", parts: [{ text: "He lived in" }, { redacted: { reason: { en: "Address" } } }, { text: ", near <i>Chicago</i>." }] }
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
    expect(turns.map(turn => turn.querySelector(".who")!.textContent)).toEqual(["Ross Coulthart", "Jacques Vallee", "Ross Coulthart", "Jacques Vallee"])
    expect(document.head.querySelectorAll("style[data-rr0-interview]")).toHaveLength(1)
  })

  it("shows what was said as the HTML it is, its addresses relative to the file", async () => {
    files["https://example.org/time/interview.json"] = interview
    const element = await make({ src: "https://example.org/time/interview.json" })
    const said = element.querySelectorAll(".turn .said")
    const link = said[1].querySelector("a")!
    expect(link.textContent).toBe("Allen Hynek")
    expect(link.href).toBe("https://example.org/people/h/HynekJosefAllen/")
    expect(link.title).toBe("J. Allen Hynek")
    expect(said[1].textContent).toBe("I met Allen Hynek in 1960.")
    const [foreign, title] = [...said[2].querySelectorAll("i")]
    expect(foreign.lang).toBe("en")
    expect(title.closest("a")!.href).toBe("https://example.org/book/si/")
    expect(said[2].textContent).toBe("Since Fastwalker and Science interdite\u00a0? 5 < 6 !")
  })

  it("leaves scripts and handlers out of what was said", async () => {
    files["https://example.org/time/interview.json"] = interview
    const element = await make({ src: "https://example.org/time/interview.json" })
    const said = element.querySelectorAll(".turn .said")[2]
    expect(said.querySelector("script")).toBeNull()
    expect(said.querySelector("b")!.hasAttribute("onclick")).toBe(false)
  })

  it("keeps a stretch taken out as a bar that says why, the rest as said", async () => {
    files["https://example.org/time/interview.json"] = interview
    const element = await make({ src: "https://example.org/time/interview.json" })
    const said = element.querySelectorAll(".turn .said")[3]
    expect((said.querySelector(".bar") as HTMLElement).dataset.tip).toBe("Passage removed : Address")
    expect(said.querySelector("i")!.textContent).toBe("Chicago")
    expect(said.textContent).toBe("He lived in , near Chicago.")
  })

  it("does not name again a speaker who goes on", async () => {
    const element = await make({})
    element.interview = { version: 1, speakers: { a: { role: "interviewer" }, b: { role: "witness" } }, segments: [
      { speaker: "a", text: "Q" }, { speaker: "b", text: "A1" }, { speaker: "b", text: "A2" }, { speaker: "a", text: "Q2" }
    ] }
    expect([...element.querySelectorAll(".turn")].map(turn => turn.classList.contains("goes-on"))).toEqual([false, false, true, false])
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

  it("fetches its file once when it is in the page before it is defined", async () => {
    files["https://example.org/time/interview.json"] = interview
    await make({})
    document.body.innerHTML = `<rr0-interview src="https://example.org/time/interview.json"></rr0-interview>`
    await wait()
    expect((fetch as unknown as ReturnType<typeof vi.fn>).mock.calls).toHaveLength(1)
    expect(document.querySelectorAll("rr0-interview .turn")).toHaveLength(4)
  })

  it("says nothing was said when the file cannot be read", async () => {
    const element = await make({ src: "https://example.org/time/missing.json" })
    expect(element.querySelector(".rr0-interview-turns")!.textContent).toBe("Nothing was said yet.")
  })
})
