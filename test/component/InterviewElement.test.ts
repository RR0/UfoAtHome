import { afterEach, describe, expect, it, vi } from "vitest"
import { register, INTERVIEW_CHANGE_EVENT } from "../../src/component/InterviewElement.js"
import type { InterviewElement, InterviewEvent } from "../../src/component/InterviewElement.js"

register()

// A browser lays text out; jsdom does not, and CodeMirror asks for the boxes of what it draws: none, here.
Range.prototype.getClientRects = () => [] as unknown as DOMRectList
Range.prototype.getBoundingClientRect = () => new DOMRect()

const transcript = { version: 1, speakers: { witness: { role: "witness", title: "Q. B." } }, segments: [{ speaker: "witness", start: 0, end: 2, text: "Bonjour tout le monde" }] }
const files: Record<string, unknown> = {}
const wait = (ms = 40) => new Promise(resolve => setTimeout(resolve, ms))

const fetched = (): string[] => (fetch as unknown as ReturnType<typeof vi.fn>).mock.calls.map(call => String(call[0]))

const make = (event: InterviewEvent): { element: InterviewElement, changes: { field: string, text?: string }[] } => {
  vi.stubGlobal("fetch", vi.fn(async (url: string) => ({
    ok: url in files, status: url in files ? 200 : 404, json: () => Promise.resolve(structuredClone(files[url])), arrayBuffer: () => Promise.resolve(new ArrayBuffer(0))
  })))
  const element = document.createElement("rr0-interview") as InterviewElement
  document.body.appendChild(element)
  element.documentUrl = "https://example.org/d/case.json"
  element.event = event
  const changes: { field: string, text?: string }[] = []
  element.addEventListener(INTERVIEW_CHANGE_EVENT, e => changes.push((e as CustomEvent<{ field: string, text?: string }>).detail))
  return { element, changes }
}
const part = (element: InterviewElement, id: string) => element.shadowRoot!.getElementById(id) as HTMLElement
const tabs = (element: InterviewElement) => [...element.shadowRoot!.querySelectorAll<HTMLButtonElement>("#tabs .group-tab")]
const shown = (element: InterviewElement): string => element.shadowRoot!.querySelector("#file-editor .cm-content")?.textContent ?? ""

describe("InterviewElement's groups", () => {
  afterEach(() => {
    document.body.innerHTML = ""
    vi.unstubAllGlobals()
    for (const key of Object.keys(files)) delete files[key]
  })

  const event = (): InterviewEvent => ({ type: "event", eventType: "interview", id: "interview-qb-1", time: "2026-10-13 21:27", title: { en: "Video interview" }, summary: { en: "It fixed the figures." } })

  it("has a summary and a file, the summary on show first, with the event's fields in it", () => {
    const { element } = make(event())
    expect(tabs(element).map(tab => tab.getAttribute("aria-controls"))).toEqual(["group-summary", "group-exchanges", "group-transcript"])
    expect(tabs(element).map(tab => tab.getAttribute("aria-expanded"))).toEqual(["true", "false", "false"])
    expect(part(element, "group-summary").hidden).toBe(false)
    expect(part(element, "group-transcript").hidden).toBe(true)
    expect(part(element, "group-summary").contains(part(element, "title"))).toBe(true)
    expect(part(element, "group-summary").contains(part(element, "summary"))).toBe(true)
    expect((part(element, "summary") as HTMLTextAreaElement).value).toBe("It fixed the figures.")
    expect(part(element, "group-summary").contains(part(element, "medium"))).toBe(true)
    // The transcript's address is the file group's, not the summary's.
    expect(part(element, "group-summary").contains(part(element, "url"))).toBe(false)
    expect(part(element, "group-transcript").contains(part(element, "url"))).toBe(true)
  })

  it("shows the file group in place of the summary, and the summary again", () => {
    const { element } = make(event())
    tabs(element)[2].click()
    expect(part(element, "group-summary").hidden).toBe(true)
    expect(part(element, "group-transcript").hidden).toBe(false)
    expect(part(element, "group-transcript").contains(part(element, "save"))).toBe(true)
    expect(part(element, "group-transcript").contains(part(element, "import-file"))).toBe(true)
    expect(part(element, "group-transcript").contains(part(element, "import-url"))).toBe(true)
    tabs(element)[0].click()
    expect(part(element, "group-summary").hidden).toBe(false)
  })

  it("shows in the file the transcript at the event's address, fetched relative to the case", async () => {
    files["https://example.org/d/interview.json"] = transcript
    const { element } = make({ ...event(), url: "interview.json" })
    tabs(element)[2].click()
    await wait(200)
    expect(fetched()).toContain("https://example.org/d/interview.json")
    expect(shown(element)).toContain("Bonjour tout le monde")
    // Looking at a transcript is not editing it: nothing was kept, and the host was told nothing.
    expect(element.transcriptText).toBeUndefined()
  })

  it("shows a transcript with nobody speaking when the interview has none, and gives it no address until it is written", async () => {
    const { element, changes } = make(event())
    tabs(element)[2].click()
    await wait(200)
    expect(shown(element)).toContain('"segments"')
    expect(element.event!.url).toBeUndefined()
    expect(changes).toEqual([])
  })

  it("shows what the host kept rather than fetching it again", async () => {
    files["https://example.org/d/interview.json"] = transcript
    const { element } = make({ ...event(), url: "interview.json" })
    element.transcriptText = '{ "version": 1, "segments": [], "language": "edited" }'
    element.event = element.event
    tabs(element)[2].click()
    await wait(200)
    expect(shown(element)).toContain("edited")
    expect(fetched()).not.toContain("https://example.org/d/interview.json")
  })

  it("loads a transcript from an address, keeps it, gives the interview the address of a file beside the case, and tells the host", async () => {
    files["https://example.org/d/other.json"] = transcript
    const { element, changes } = make(event())
    tabs(element)[2].click()
    await wait(100)
    ;(part(element, "import-url") as HTMLInputElement).value = "https://example.org/d/other.json"
    part(element, "import-url-button").click()
    await wait(200)
    expect(element.transcriptText).toContain("Bonjour tout le monde")
    expect(element.event!.url).toBe("interview-qb-1.json")
    expect((part(element, "url") as HTMLInputElement).value).toBe("interview-qb-1.json")
    expect(changes.map(change => change.field)).toEqual(["url", "transcript"])
    expect(changes[1].text).toContain("Bonjour tout le monde")
    expect(shown(element)).toContain("Bonjour tout le monde")
  })

  it("refuses a file that is not an interview transcript, and keeps nothing of it", async () => {
    files["https://example.org/d/plain.json"] = { version: 1, id: "plain", timeline: { keyframes: [] } }
    const { element, changes } = make(event())
    tabs(element)[2].click()
    await wait(100)
    ;(part(element, "import-url") as HTMLInputElement).value = "https://example.org/d/plain.json"
    part(element, "import-url-button").click()
    await wait(100)
    expect(part(element, "file-note").hidden).toBe(false)
    expect(element.transcriptText).toBeUndefined()
    expect(changes).toEqual([])
  })

  it("says so when the transcript at the interview's address cannot be read, and shows a blank one", async () => {
    const { element } = make({ ...event(), url: "missing.json" })
    tabs(element)[2].click()
    await wait(200)
    expect(part(element, "file-note").hidden).toBe(false)
    expect(shown(element)).toContain('"segments"')
  })

  it("shows the file at a new address once it is typed", async () => {
    files["https://example.org/d/typed.json"] = transcript
    const { element } = make(event())
    tabs(element)[2].click()
    await wait(100)
    const url = part(element, "url") as HTMLInputElement
    url.value = "typed.json"
    url.dispatchEvent(new Event("input", { bubbles: true }))
    url.dispatchEvent(new Event("change", { bubbles: true }))
    await wait(200)
    expect(element.event!.url).toBe("typed.json")
    expect(shown(element)).toContain("Bonjour tout le monde")
  })
})

describe("What the summary shows is what the file holds, and the other way round", () => {
  afterEach(() => {
    document.body.innerHTML = ""
    vi.unstubAllGlobals()
    for (const key of Object.keys(files)) delete files[key]
  })

  const event = (): InterviewEvent => ({
    type: "event", eventType: "interview", id: "interview-qb-1", interviewOf: "qb", time: "2026-10-13 21:27", by: [{ people: "BeauJerome" }],
    title: { en: "Video interview" }, summary: { en: "It fixed the figures." }
  })
  const typed = (element: InterviewElement, id: string, value: string) => {
    const field = part(element, id) as HTMLInputElement
    field.value = value
    field.dispatchEvent(new Event("input", { bubbles: true }))
  }
  const fileJson = (element: InterviewElement): Record<string, unknown> => JSON.parse(element.shadowRoot!.querySelector<HTMLElement>("#file-editor .cm-content")!.textContent!.replace(/\u00a0/g, " "))

  it("has, in the file of a new interview, everything the summary shows", async () => {
    const { element } = make(event())
    tabs(element)[2].click()
    await wait(200)
    expect(element.transcriptText).toBeUndefined()
    const json = fileJson(element)
    expect(json).toMatchObject({
      title: { en: "Video interview" }, time: "2026-10-13 21:27", by: [{ people: "BeauJerome" }], interviewOf: "qb", summary: { en: "It fixed the figures." }
    })
    // The speakers are those the event names.
    expect(json.speakers).toMatchObject({ interviewer: { by: { people: "BeauJerome" } }, witness: { of: "qb" } })
  })

  it("writes in the file what is edited in the summary, and tells the host the transcript is now that", async () => {
    const { element, changes } = make(event())
    tabs(element)[2].click()
    await wait(200)
    typed(element, "summary", "It fixed the figures and the azimuth.")
    typed(element, "time", "2026-10-13 21:30")
    typed(element, "by", "BeauJerome, Chabin")
    const json = fileJson(element)
    expect(json.summary).toEqual({ en: "It fixed the figures and the azimuth." })
    expect(json.time).toBe("2026-10-13 21:30")
    expect(json.by).toEqual([{ people: "BeauJerome" }, { people: "Chabin" }])
    expect(element.transcriptText).toContain("azimuth")
    expect(changes.filter(change => change.field === "transcript").length).toBeGreaterThanOrEqual(3)
  })

  it("leaves the file alone while there is no transcript text to say it in", () => {
    const { element, changes } = make(event())
    typed(element, "summary", "Changed.")
    expect(element.transcriptText).toBeUndefined()
    expect(changes.map(change => change.field)).toEqual(["summary"])
  })

  it("changes the summary when the text of the file is edited, and clears what the text no longer has", async () => {
    const { element, changes } = make(event())
    tabs(element)[2].click()
    await wait(200)
    const edited = { version: 1, title: { en: "Renamed" }, time: "2026-10-14", interviewOf: "other", speakers: {}, segments: [] }
    ;(element as unknown as { onEdited(text: string): void }).onEdited(JSON.stringify(edited))
    expect(element.event).toMatchObject({ title: { en: "Renamed" }, time: "2026-10-14", interviewOf: "other" })
    expect(element.event!.summary).toBeUndefined()
    expect(element.event!.by).toBeUndefined()
    expect((part(element, "title") as HTMLInputElement).value).toBe("Renamed")
    expect((part(element, "summary") as HTMLTextAreaElement).value).toBe("")
    expect(changes.map(change => change.field)).toContain("file")
  })

  it("takes the fields a loaded file says, and keeps the ones it does not", async () => {
    files["https://example.org/d/other.json"] = { version: 1, title: { en: "From the file" }, summary: { en: "Its own summary." }, speakers: {}, segments: [{ speaker: "a", start: 0, end: 1, text: "Hi" }] }
    const { element } = make(event())
    tabs(element)[2].click()
    await wait(100)
    ;(part(element, "import-url") as HTMLInputElement).value = "https://example.org/d/other.json"
    part(element, "import-url-button").click()
    await wait(200)
    expect(element.event).toMatchObject({ title: { en: "From the file" }, summary: { en: "Its own summary." }, time: "2026-10-13 21:27", interviewOf: "qb" })
    // And the text now says what the summary has that the file did not.
    expect(fileJson(element)).toMatchObject({ title: { en: "From the file" }, time: "2026-10-13 21:27", interviewOf: "qb", by: [{ people: "BeauJerome" }] })
    expect((part(element, "title") as HTMLInputElement).value).toBe("From the file")
  })

  it("reconciles a file fetched at the interview's address the same way, and says it changed the summary", async () => {
    files["https://example.org/d/interview.json"] = { version: 1, summary: { en: "Written in the file." }, speakers: {}, segments: [] }
    const { element, changes } = make({ ...event(), url: "interview.json" })
    tabs(element)[2].click()
    await wait(300)
    expect(element.event!.summary).toEqual({ en: "Written in the file." })
    expect(changes.map(change => change.field)).toContain("file")
    expect(fileJson(element)).toMatchObject({ summary: { en: "Written in the file." }, title: { en: "Video interview" }, by: [{ people: "BeauJerome" }] })
  })

  const boxes = (element: InterviewElement): HTMLInputElement[] => [...part(element, "witness").querySelectorAll<HTMLInputElement>("input[type=checkbox]")]
  const toggle = (box: HTMLInputElement): void => {
    box.checked = !box.checked
    box.dispatchEvent(new Event("change", { bubbles: true }))
  }

  it("offers the case's observers as witnesses, those the interview was held with checked", () => {
    const { element } = make({ ...event(), interviewOf: "qb" })
    element.witnesses = [{ id: "qb", label: "Q. B." }, { id: "jd", label: "J. D." }]
    expect(boxes(element).map(box => [box.value, box.checked])).toEqual([["qb", true], ["jd", false]])
  })

  it("is held with one witness, or several, written as an id or as a list of ids", () => {
    const { interviewOf: _none, ...unnamed } = event()
    const { element, changes } = make(unnamed)
    element.witnesses = [{ id: "qb", label: "Q. B." }, { id: "jd", label: "J. D." }]
    expect(boxes(element).every(box => !box.checked)).toBe(true)
    toggle(boxes(element)[0])
    expect(element.event!.interviewOf).toBe("qb")
    toggle(boxes(element)[1])
    expect(element.event!.interviewOf).toEqual(["qb", "jd"])
    expect(changes.map(change => change.field)).toContain("witness")
  })

  it("is held with somebody: the last witness cannot be unchecked", () => {
    const { element } = make({ ...event(), interviewOf: "qb" })
    element.witnesses = [{ id: "qb", label: "Q. B." }]
    toggle(boxes(element)[0])
    expect(element.event!.interviewOf).toBe("qb")
    expect(boxes(element)[0].checked).toBe(true)
  })

  it("keeps in the file a speaker for each interviewer and each witness the summary names", async () => {
    const { element } = make({ ...event(), by: [{ people: "BeauJerome" }, { people: "Ufologue2" }], interviewOf: ["qb", "jd"] })
    tabs(element)[2].click()
    await wait(200)
    // The editor draws only what is in view: the text it holds is the file.
    const json = JSON.parse((element as unknown as { fileEditor: { text: string } }).fileEditor.text) as { speakers: Record<string, unknown> }
    expect(json.speakers).toMatchObject({ interviewer2: { role: "interviewer", by: { people: "Ufologue2" } }, witness2: { role: "witness", of: "jd" } })
  })

  const dialogue = {
    version: 1, interviewOf: "qb",
    speakers: { interviewer: { role: "interviewer", by: { people: "BeauJerome" } }, witness: { role: "witness", title: "Q. B." } },
    proofreading: { interviewer: { status: "approved" }, witness: { status: "pending" } },
    segments: [
      { speaker: "interviewer", start: 0, end: 4, text: "Where were you?" },
      { speaker: "witness", start: 5, end: 9, text: "In the park.", refs: [{ at: 0.5 }] },
      { speaker: "witness", start: 10, end: 12, redacted: { reason: { en: "Private life" } } },
      { speaker: "interviewer", start: 12, end: 14, redacted: { reason: { en: "Private life" } } },
      { speaker: "witness", start: 15, end: 17, text: "Then it left." },
      { speaker: "witness", start: 18, end: 20, parts: [{ text: "No lights." }, { redacted: { reason: { en: "Place" } } }, { text: "That is all." }] }
    ]
  }

  it("reads the interview as a dialogue: who said what, the passages taken out as one gap with their reason, who has not proofread it", async () => {
    files["https://example.org/d/interview.json"] = dialogue
    const { element } = make({ ...event(), url: "interview.json" })
    tabs(element)[1].click()
    await wait(100)
    const turns = [...element.shadowRoot!.querySelectorAll<HTMLElement>("#exchanges .turn")]
    expect(turns.map(turn => turn.querySelector(".who span")!.textContent)).toEqual(["BeauJerome", "Q. B.", "", "Q. B.", "Q. B."])
    expect(turns[1].querySelector(".said")!.textContent).toBe("In the park.")
    expect(turns[2].classList.contains("is-redacted")).toBe(true)
    // The reason is said, not left to a tooltip.
    expect(turns[2].querySelector(".redacted")!.textContent).toBe("Passage removed : Private life")
    // Only a stretch taken out: the rest is still there, the gap said in its place.
    expect(turns[4].querySelector(".said")!.textContent).toBe("No lights. Passage removed : Place That is all. ")
    expect(turns[4].querySelectorAll(".said .bar")).toHaveLength(1)
    expect(part(element, "exchanges-status").textContent).toBe("Not proofread yet by: Q. B.")
    // The time of a turn is its tooltip: nothing of it is in the layout.
    expect(turns[0].title).toBe("00:00.0")
    expect(turns[1].title).toBe("00:05.0")
    expect(turns[0].querySelector(".when")).toBeNull()
  })

  it("follows a passage to the moment of the observation it tells of", async () => {
    files["https://example.org/d/interview.json"] = dialogue
    const { element } = make({ ...event(), url: "interview.json" })
    const seen: { sighting?: string, at: number }[] = []
    element.addEventListener("interviewseek", e => seen.push((e as CustomEvent<{ sighting?: string, at: number }>).detail))
    tabs(element)[1].click()
    await wait(100)
    element.shadowRoot!.querySelector<HTMLButtonElement>("#exchanges .ref")!.click()
    expect(seen).toEqual([{ sighting: "qb", at: 0.5 }])
  })

  it("says nothing was said when the interview has no transcript", async () => {
    const { element } = make(event())
    tabs(element)[1].click()
    await wait(100)
    expect(part(element, "exchanges").textContent).toBe("Nothing was said yet.")
  })

  const load = async (element: InterviewElement, name: string, content: string): Promise<void> => {
    const input = part(element, "import-file") as HTMLInputElement
    Object.defineProperty(input, "files", { configurable: true, value: [{ name, text: async () => content }] })
    input.dispatchEvent(new Event("change"))
    await wait(250)
  }

  it("loads a transcript that is not in our format, as best it can be read, naming the speakers the case names", async () => {
    const { element, changes } = make({ ...event(), by: [{ people: "BeauJerome" }], interviewOf: "qb" })
    element.witnesses = [{ id: "qb", label: "Q. B." }]
    tabs(element)[2].click()
    await wait(200)
    await load(element, "call.txt", "[00:00:05] BeauJerome: Where were you?\n[00:00:09] Q. B.: In the park.\n[00:00:20] BeauJerome: And then?\n[00:00:25] Q. B.: It left.")
    const json = JSON.parse(element.transcriptText!) as { segments: { speaker: string, start: number, text: string }[], speakers: Record<string, unknown>, transcription: { note: string } }
    expect(json.segments.map(segment => [segment.speaker, segment.start, segment.text])).toEqual([
      ["interviewer", 5, "Where were you?"], ["witness", 9, "In the park."], ["interviewer", 20, "And then?"], ["witness", 25, "It left."]
    ])
    expect(json.speakers).toMatchObject({ interviewer: { by: { people: "BeauJerome" } }, witness: { of: "qb" } })
    expect(json.transcription.note).toContain("call.txt")
    expect(changes.map(change => change.field)).toContain("transcript")
  })

  it("says so when a file holds nothing that reads as an interview", async () => {
    const { element } = make(event())
    tabs(element)[2].click()
    await wait(200)
    await load(element, "empty.txt", "   ")
    expect(part(element, "file-note").hidden).toBe(false)
    expect(part(element, "file-note").textContent).toContain("not an interview transcript")
  })

  it("says what the interview was held through, among the media, and not nothing once one is said", () => {
    const { element } = make({ ...event(), medium: "phone" })
    const select = part(element, "medium") as HTMLSelectElement
    expect([...select.options].map(option => option.value)).toEqual(["in-person", "phone", "video", "chat", "email", "letter", "other"])
    expect(select.value).toBe("phone")
    expect([...select.options].find(option => option.value === "video")!.textContent).toBe("Video call")
  })

  it("shows a placeholder for an interview that says none, which cannot be chosen and goes once a medium is", () => {
    const { element, changes } = make(event())
    const select = part(element, "medium") as HTMLSelectElement
    expect([...select.options][0]).toMatchObject({ value: "", disabled: true, hidden: true })
    select.value = "video"
    select.dispatchEvent(new Event("change", { bubbles: true }))
    expect(element.event!.medium).toBe("video")
    expect(changes.map(change => change.field)).toContain("medium")
    expect([...(part(element, "medium") as HTMLSelectElement).options].map(option => option.value)).not.toContain("")
  })

  it("keeps in the file the medium the summary says, and in the summary the medium the file says", async () => {
    const { element } = make({ ...event(), medium: "phone" })
    tabs(element)[2].click()
    await wait(200)
    expect(fileJson(element).medium).toBe("phone")
    const select = part(element, "medium") as HTMLSelectElement
    select.value = "chat"
    select.dispatchEvent(new Event("change", { bubbles: true }))
    expect(fileJson(element).medium).toBe("chat")
    ;(element as unknown as { onEdited(text: string): void }).onEdited(JSON.stringify({ version: 1, medium: "email", speakers: {}, segments: [] }))
    expect(element.event!.medium).toBe("email")
    expect((part(element, "medium") as HTMLSelectElement).value).toBe("email")
  })
})

