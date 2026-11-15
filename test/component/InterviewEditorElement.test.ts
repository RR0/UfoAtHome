import { afterEach, beforeAll, describe, expect, it, vi } from "vitest"
import { register, INTERVIEW_CHANGE_EVENT } from "../../src/component/InterviewEditorElement.js"
import type { InterviewEditorElement, InterviewEvent } from "../../src/component/InterviewEditorElement.js"
import { ModuleRegistry } from "../../src/modules/ModuleRegistry.js"
import { TranscriptionError } from "../../src/engine/transcription/TranscriptionError.js"

register()

// The File group's text editor is a chunk of its own, imported the first time the group opens: cold, on a loaded CI machine, that import alone
// outlasted the first test's wait for the transcript to show. Imported once here, every test waits for the component's own work only.
beforeAll(async () => {
  await Promise.all([import("../../src/component/SightingFileEditor.js"), import("../../src/generated/interviewSchema.json")])
})

// A browser lays text out; jsdom does not, and CodeMirror asks for the boxes of what it draws: none, here.
Range.prototype.getClientRects = () => [] as unknown as DOMRectList
Range.prototype.getBoundingClientRect = () => new DOMRect()

const transcript = { version: 1, speakers: { witness: { role: "witness", title: "Q. B." } }, segments: [{ speaker: "witness", start: 0, end: 2, text: "Bonjour tout le monde" }] }
const files: Record<string, unknown> = {}
const wait = (ms = 40) => new Promise(resolve => setTimeout(resolve, ms))

const fetched = (): string[] => (fetch as unknown as ReturnType<typeof vi.fn>).mock.calls.map(call => String(call[0]))

const make = async (event: InterviewEvent, prepare?: (element: InterviewEditorElement) => void): Promise<{ element: InterviewEditorElement, changes: { field: string, text?: string }[] }> => {
  vi.stubGlobal("fetch", vi.fn(async (url: string) => ({
    ok: url in files, status: url in files ? 200 : 404, json: () => Promise.resolve(structuredClone(files[url])), arrayBuffer: () => Promise.resolve(new ArrayBuffer(0))
  })))
  const element = document.createElement("rr0-interview-editor") as InterviewEditorElement
  document.body.appendChild(element)
  element.documentUrl = "https://example.org/d/case.json"
  prepare?.(element)
  element.event = event
  const changes: { field: string, text?: string }[] = []
  element.addEventListener(INTERVIEW_CHANGE_EVENT, e => changes.push((e as CustomEvent<{ field: string, text?: string }>).detail))
  await element.ready
  return { element, changes }
}
const part = (element: InterviewEditorElement, id: string) => element.shadowRoot!.getElementById(id) as HTMLElement
const tabs = (element: InterviewEditorElement) => [...element.shadowRoot!.querySelectorAll<HTMLButtonElement>("#tabs .group-tab")]
const shown = (element: InterviewEditorElement): string => element.shadowRoot!.querySelector("#file-editor .cm-content")?.textContent ?? ""

describe("InterviewEditorElement's groups", () => {
  afterEach(() => {
    document.body.innerHTML = ""
    vi.unstubAllGlobals()
    for (const key of Object.keys(files)) delete files[key]
  })

  const event = (): InterviewEvent => ({ type: "event", eventType: "interview", id: "interview-qb-1", time: "2026-10-13 21:27", title: { en: "Video interview" }, summary: { en: "It fixed the figures." } })

  it("has a summary and a file, the summary on show first, with the event's fields in it", async () => {
    const { element } = await make(event())
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

  it("shows the file group in place of the summary, and the summary again", async () => {
    const { element } = await make(event())
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
    const { element } = await make({ ...event(), url: "interview.json" })
    tabs(element)[2].click()
    await wait(200)
    expect(fetched()).toContain("https://example.org/d/interview.json")
    expect(shown(element)).toContain("Bonjour tout le monde")
    // Looking at a transcript is not editing it: nothing was kept, and the host was told nothing.
    expect(element.transcriptText).toBeUndefined()
  })

  it("shows a transcript with nobody speaking when the interview has none, and gives it no address until it is written", async () => {
    const { element, changes } = await make(event())
    tabs(element)[2].click()
    await wait(200)
    expect(shown(element)).toContain('"segments"')
    expect(element.event!.url).toBeUndefined()
    expect(changes).toEqual([])
  })

  it("shows what the host kept rather than fetching it again", async () => {
    files["https://example.org/d/interview.json"] = transcript
    const { element } = await make({ ...event(), url: "interview.json" }, editor => {
      editor.transcriptText = '{ "version": 1, "segments": [], "language": "edited" }'
    })
    tabs(element)[2].click()
    await wait(200)
    expect(shown(element)).toContain("edited")
    expect(fetched()).not.toContain("https://example.org/d/interview.json")
  })

  it("loads a transcript from an address, keeps it, gives the interview the address of a file beside the case, and tells the host", async () => {
    files["https://example.org/d/other.json"] = transcript
    const { element, changes } = await make(event())
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
    files["https://example.org/d/plain.json"] = { version: 4, id: "plain", timeline: { keyframes: [] } }
    const { element, changes } = await make(event())
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
    const { element } = await make({ ...event(), url: "missing.json" })
    tabs(element)[2].click()
    await wait(200)
    expect(part(element, "file-note").hidden).toBe(false)
    expect(shown(element)).toContain('"segments"')
  })

  it("shows the file at a new address once it is typed", async () => {
    files["https://example.org/d/typed.json"] = transcript
    const { element } = await make(event())
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
  const typed = (element: InterviewEditorElement, id: string, value: string) => {
    const field = part(element, id) as HTMLInputElement
    field.value = value
    field.dispatchEvent(new Event("input", { bubbles: true }))
  }
  const fileJson = (element: InterviewEditorElement): Record<string, unknown> => JSON.parse(element.shadowRoot!.querySelector<HTMLElement>("#file-editor .cm-content")!.textContent!.replace(/\u00a0/g, " "))

  it("has, in the file of a new interview, everything the summary shows", async () => {
    const { element } = await make(event())
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
    const { element, changes } = await make(event())
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

  it("leaves the file alone while there is no transcript text to say it in", async () => {
    const { element, changes } = await make(event())
    typed(element, "summary", "Changed.")
    expect(element.transcriptText).toBeUndefined()
    expect(changes.map(change => change.field)).toEqual(["summary"])
  })

  it("changes the summary when the text of the file is edited, and clears what the text no longer has", async () => {
    const { element, changes } = await make(event())
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
    const { element } = await make(event())
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
    const { element, changes } = await make({ ...event(), url: "interview.json" })
    tabs(element)[2].click()
    await wait(300)
    expect(element.event!.summary).toEqual({ en: "Written in the file." })
    expect(changes.map(change => change.field)).toContain("file")
    expect(fileJson(element)).toMatchObject({ summary: { en: "Written in the file." }, title: { en: "Video interview" }, by: [{ people: "BeauJerome" }] })
  })

  const boxes = (element: InterviewEditorElement): HTMLInputElement[] => [...part(element, "witness").querySelectorAll<HTMLInputElement>("input[type=checkbox]")]
  const toggle = (box: HTMLInputElement): void => {
    box.checked = !box.checked
    box.dispatchEvent(new Event("change", { bubbles: true }))
  }

  it("offers the case's observers as witnesses, those the interview was held with checked", async () => {
    const { element } = await make({ ...event(), interviewOf: "qb" })
    element.witnesses = [{ id: "qb", label: "Q. B." }, { id: "jd", label: "J. D." }]
    expect(boxes(element).map(box => [box.value, box.checked])).toEqual([["qb", true], ["jd", false]])
  })

  it("is held with one witness, or several, written as an id or as a list of ids", async () => {
    const { interviewOf: _none, ...unnamed } = event()
    const { element, changes } = await make(unnamed)
    element.witnesses = [{ id: "qb", label: "Q. B." }, { id: "jd", label: "J. D." }]
    expect(boxes(element).every(box => !box.checked)).toBe(true)
    toggle(boxes(element)[0])
    expect(element.event!.interviewOf).toBe("qb")
    toggle(boxes(element)[1])
    expect(element.event!.interviewOf).toEqual(["qb", "jd"])
    expect(changes.map(change => change.field)).toContain("witness")
  })

  it("is held with somebody: the last witness cannot be unchecked", async () => {
    const { element } = await make({ ...event(), interviewOf: "qb" })
    element.witnesses = [{ id: "qb", label: "Q. B." }]
    toggle(boxes(element)[0])
    expect(element.event!.interviewOf).toBe("qb")
    expect(boxes(element)[0].checked).toBe(true)
  })

  it("keeps in the file a speaker for each interviewer and each witness the summary names", async () => {
    const { element } = await make({ ...event(), by: [{ people: "BeauJerome" }, { people: "Ufologue2" }], interviewOf: ["qb", "jd"] })
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
    const { element } = await make({ ...event(), url: "interview.json" })
    tabs(element)[1].click()
    await wait(100)
    const turns = [...element.shadowRoot!.querySelectorAll<HTMLElement>("#exchanges .turn")]
    expect(turns.map(turn => turn.querySelector(".who span")!.textContent)).toEqual(["Jerome Beau", "Q. B.", "", "Q. B.", "Q. B."])
    expect(turns[1].querySelector(".said")!.textContent).toBe("In the park.")
    expect(turns[2].classList.contains("is-redacted")).toBe(true)
    // The reason is said, not left to a tooltip.
    expect((turns[2].querySelector(".redacted .bar") as HTMLElement).dataset.tip).toBe("Passage removed: Private life")
    // In the editor, a passage taken out says so where it was (and how many words, when that is known).
    expect(turns[2].querySelector(".redacted")!.textContent).toBe("Passage removed")
    // Only a stretch taken out: the rest is still there, the gap said in its place.
    expect(turns[4].querySelector(".said")!.textContent).toBe("No lights. Passage removed That is all.")
    expect((turns[4].querySelector(".said .bar") as HTMLElement).dataset.tip).toBe("Passage removed: Place")
    expect(turns[4].querySelectorAll(".said .bar")).toHaveLength(1)
    expect(element.shadowRoot!.querySelector("#exchanges .rr0-interview-status")!.textContent).toBe("Not proofread yet by: Q. B.")
    // The time of a turn is its tooltip: nothing of it is in the layout.
    expect(turns[0].dataset.time).toBe("00:00.0")
    expect(turns[1].dataset.time).toBe("00:05.0")
    expect(turns[0].querySelector(".when")).toBeNull()
  })

  const edited = (changes: { field: string, text?: string }[]) => JSON.parse(changes.filter(change => change.field === "transcript").at(-1)!.text!)

  it("says who has proofread it, and keeps it when a participant's box is ticked", async () => {
    files["https://example.org/d/interview.json"] = dialogue
    const { element, changes } = await make({ ...event(), url: "interview.json" })
    tabs(element)[1].click()
    await wait(100)
    const root = element.shadowRoot!
    expect(root.getElementById("review")!.textContent).toContain("Not proofread yet by: Q. B.")
    const boxes = [...root.querySelectorAll<HTMLInputElement>("#review input[type=checkbox]")]
    expect(boxes.map(box => box.checked)).toEqual([true, false])
    boxes[1].checked = true
    boxes[1].dispatchEvent(new Event("change"))
    await wait(100)
    expect(edited(changes).proofreading.witness.status).toBe("approved")
  })

  it("takes a whole turn out and puts it back while its text is known", async () => {
    files["https://example.org/d/interview.json"] = dialogue
    const { element, changes } = await make({ ...event(), url: "interview.json" })
    tabs(element)[1].click()
    await wait(100)
    const tool = (index: number, label: string) => [...element.shadowRoot!.querySelectorAll<HTMLButtonElement>(`#exchanges .turn[data-segment="${index}"] .turn-tools button`)]
      .find(button => button.textContent === label)!
    tool(4, "Take all out").click()
    await wait(100)
    expect(edited(changes).segments[4]).toMatchObject({ redacted: { words: 3, reason: "taken out at proofreading" } })
    tool(4, "Restore all").click()
    await wait(100)
    // Said why, as the author typed it or picked it among what is offered.
    const reason = element.shadowRoot!.querySelector<HTMLInputElement>("#redact-reason")!
    expect([...element.shadowRoot!.querySelectorAll("#redact-reasons option")].map(option => option.textContent)).toContain("private life")
    reason.value = "private life"
    tool(4, "Take all out").click()
    await wait(100)
    expect(edited(changes).segments[4]).toMatchObject({ redacted: { words: 3, reason: "private life" } })
    expect(edited(changes).segments[4].text).toBeUndefined()
    tool(4, "Restore all").click()
    await wait(100)
    expect(edited(changes).segments[4].text).toBe("Then it left.")
  })

  it("links a witness's passage to a moment of their observation, named after it", async () => {
    files["https://example.org/d/interview.json"] = dialogue
    const { element, changes } = await make({ ...event(), url: "interview.json" })
    element.witnesses = [{ id: "qb", label: "Q. B.", moments: [{ at: 0.5, label: "A", note: "A light" }, { at: 3, label: "B", note: "It turns" }] }]
    tabs(element)[1].click()
    await wait(100)
    const root = element.shadowRoot!
    expect(root.querySelector("#exchanges .turn[data-segment='1'] .ref")!.textContent).toBe("AMoment A · A light")
    root.querySelector<HTMLButtonElement>("#moment-4-3")!.click()
    await wait(100)
    expect(edited(changes).segments[4].refs).toEqual([{ at: 3 }])
  })

  it("plays nothing without a recording, and says how to get one", async () => {
    files["https://example.org/d/interview.json"] = dialogue
    const { element } = await make({ ...event(), url: "interview.json" })
    await wait(100)
    const root = element.shadowRoot!
    expect(root.querySelector<HTMLButtonElement>(".player-play")!.disabled).toBe(true)
    expect(root.querySelector(".player-empty")!.textContent).toContain("No recording")
    expect(root.querySelector(".player-recordings")!.textContent).toBe("Recordings (0)")
    expect(root.querySelectorAll(".speaker-track .seg")).toHaveLength(6)
  })

  it("follows a passage to the moment of the observation it tells of", async () => {
    files["https://example.org/d/interview.json"] = dialogue
    const { element } = await make({ ...event(), url: "interview.json" })
    const seen: { sighting?: string, at: number }[] = []
    element.addEventListener("interviewseek", e => seen.push((e as CustomEvent<{ sighting?: string, at: number }>).detail))
    tabs(element)[1].click()
    await wait(100)
    element.shadowRoot!.querySelector<HTMLButtonElement>("#exchanges .ref")!.click()
    // With what was said there, for the observation to say where its moment was quoted.
    expect(seen).toEqual([{ sighting: "qb", at: 0.5, quote: "In the park." }])
  })

  it("says nothing was said when the interview has no transcript", async () => {
    const { element } = await make(event())
    tabs(element)[1].click()
    await wait(100)
    expect(part(element, "exchanges").textContent).toBe("Nothing was said yet.")
  })

  const load = async (element: InterviewEditorElement, name: string, content: string): Promise<void> => {
    const input = part(element, "import-file") as HTMLInputElement
    Object.defineProperty(input, "files", { configurable: true, value: [{ name, text: async () => content }] })
    input.dispatchEvent(new Event("change"))
    await wait(250)
  }

  it("loads a transcript that is not in our format, as best it can be read, naming the speakers the case names", async () => {
    const { element, changes } = await make({ ...event(), by: [{ people: "BeauJerome" }], interviewOf: "qb" })
    element.witnesses = [{ id: "qb", label: "Q. B." }]
    tabs(element)[2].click()
    await wait(200)
    await load(element, "call.txt", "[00:00:05] BeauJerome: Where were you?\n[00:00:09] Q. B.: In the park.\n[00:00:20] BeauJerome: And then?\n[00:00:25] Q. B.: It left.")
    // Read in its own time, which a loaded machine stretches past the load's fixed wait.
    for (let tries = 0; element.transcriptText === undefined && tries < 50; tries++) await wait(100)
    const json = JSON.parse(element.transcriptText!) as { segments: { speaker: string, start: number, text: string }[], speakers: Record<string, unknown>, transcription: { note: string } }
    expect(json.segments.map(segment => [segment.speaker, segment.start, segment.text])).toEqual([
      ["interviewer", 5, "Where were you?"], ["witness", 9, "In the park."], ["interviewer", 20, "And then?"], ["witness", 25, "It left."]
    ])
    expect(json.speakers).toMatchObject({ interviewer: { by: { people: "BeauJerome" } }, witness: { of: "qb" } })
    expect(json.transcription.note).toContain("call.txt")
    expect(changes.map(change => change.field)).toContain("transcript")
  })

  it("says so when a file holds nothing that reads as an interview", async () => {
    const { element } = await make(event())
    tabs(element)[2].click()
    await wait(200)
    await load(element, "empty.txt", "   ")
    expect(part(element, "file-note").hidden).toBe(false)
    expect(part(element, "file-note").textContent).toContain("not an interview transcript")
  })

  describe("transcribing the recording", () => {
    afterEach(() => ModuleRegistry.uninstall("test-transcription"))

    /** A way of transcribing given by a module: what it was asked, and what it finds. */
    const fake = (sendsAudio = false) => {
      const asked: number[] = []
      ModuleRegistry.install({
        id: "test-transcription", name: "Test",
        contributes: {
          transcription: [{
            id: "fake", name: "Fake", credit: "© test", creditUrl: "https://test.example",
            create: () => ({
              sendsAudio, engine: "fake-engine", downloadBytes: 5_000_000,
              transcribe: async ({ samples }: { samples: Float32Array }) => {
                asked.push(samples.length)
                return [{ start: 0.5, end: 2, text: "Where were you?" }, { start: 2.5, end: 4, text: "In the park." }]
              }
            })
          }]
        }
      })
      return asked
    }
    const withRecording = { ...transcript, recordings: [{ kind: "audio", src: "call.m4a" }] }
    /** The recording's bytes, and a browser's decoding of them: three seconds of 16 kHz sound. */
    const decodable = () => {
      const plain = fetch as unknown as (url: string) => Promise<unknown>
      vi.stubGlobal("fetch", vi.fn(async (url: string) => url.endsWith(".m4a")
        ? { ok: true, status: 200, headers: new Headers(), arrayBuffer: async () => new ArrayBuffer(8) }
        : plain(url)))
      vi.stubGlobal("OfflineAudioContext", class {
        async decodeAudioData() {
          return { numberOfChannels: 1, getChannelData: () => new Float32Array(48_000) }
        }
      })
    }
    const choose = (element: InterviewEditorElement, id: string) => {
      const select = part(element, "transcribe-source") as HTMLSelectElement
      select.value = id
      select.dispatchEvent(new Event("change"))
    }

    it("says there is nothing to transcribe without a recording, and opens the window where one is added rather than being greyed out", async () => {
      fake()
      const { element } = await make(event())
      tabs(element)[1].click()
      const start = part(element, "transcribe-start") as HTMLButtonElement
      expect(start.disabled).toBe(false)
      expect(part(element, "transcribe-note").textContent).toContain("There is no recording of the interview yet")
      const window = element.shadowRoot!.querySelector<HTMLDialogElement>(".recordings-window")!
      expect(window.hasAttribute("open")).toBe(false)
      start.click()
      expect(window.hasAttribute("open")).toBe(true)
    })

    it("says what each way does before anything goes: download a model, or send the recording to a service", async () => {
      files["https://example.org/d/interview.json"] = withRecording
      const { element } = await make({ ...event(), url: "interview.json" })
      tabs(element)[1].click()
      await wait(100)
      expect([...(part(element, "transcribe-source") as HTMLSelectElement).options].map(option => option.value).slice(0, 3)).toEqual(["whisper-browser", "groq", "openai"])
      expect(part(element, "transcribe-note").textContent).toContain("Nothing leaves your computer")
      expect(part(element, "transcribe-note").textContent).toContain("760 MB")
      expect(part(element, "transcribe-note").textContent).toContain("The current transcript will be replaced")
      expect(part(element, "transcribe-key-row").hidden).toBe(true)
      choose(element, "groq")
      expect(part(element, "transcribe-note").textContent).toContain("The recording will be sent to Groq")
      expect(part(element, "transcribe-note").classList.contains("message-warning")).toBe(true)
      expect(part(element, "transcribe-key-row").hidden).toBe(false)
      choose(element, "whisper-browser")
    })

    it("can be pressed for a service only once its key is typed", async () => {
      files["https://example.org/d/interview.json"] = withRecording
      const { element } = await make({ ...event(), url: "interview.json" })
      tabs(element)[1].click()
      await wait(100)
      const start = part(element, "transcribe-start") as HTMLButtonElement
      expect(start.disabled).toBe(false)
      choose(element, "groq")
      expect(start.disabled).toBe(true)
      const key = part(element, "transcribe-key") as HTMLInputElement
      key.value = "gsk_test"
      key.dispatchEvent(new Event("input"))
      expect(start.disabled).toBe(false)
      key.value = ""
      key.dispatchEvent(new Event("input"))
      expect(start.disabled).toBe(true)
      choose(element, "whisper-browser")
      expect(start.disabled).toBe(false)
    })

    it("lets the selection be taken out only while words of the exchanges are selected", async () => {
      files["https://example.org/d/interview.json"] = withRecording
      const { element } = await make({ ...event(), url: "interview.json" })
      tabs(element)[1].click()
      await wait(100)
      const take = part(element, "redact-selection") as HTMLButtonElement
      expect(take.disabled).toBe(true)
      const said = element.shadowRoot!.querySelector("#exchanges .said")!
      const range = document.createRange()
      range.selectNodeContents(said)
      // What Chromium gives of a selection within a shadow tree, which jsdom does not keep.
      let selected: Range | undefined = range
      ;(element.shadowRoot as ShadowRoot & { getSelection: () => unknown }).getSelection = () => ({ rangeCount: selected ? 1 : 0, getRangeAt: () => selected })
      document.dispatchEvent(new Event("selectionchange"))
      expect(take.disabled).toBe(false)
      selected = undefined
      document.dispatchEvent(new Event("selectionchange"))
      expect(take.disabled).toBe(true)
    })

    it("makes what was found the transcript, every turn a voice to attribute, which a turn's Who speaks gives to a speaker", async () => {
      const asked = fake()
      files["https://example.org/d/interview.json"] = withRecording
      const { element, changes } = await make({ ...event(), url: "interview.json", by: [{ people: "BeauJerome" }], interviewOf: "qb" })
      element.witnesses = [{ id: "qb", label: "Q. B." }]
      decodable()
      tabs(element)[1].click()
      await wait(100)
      choose(element, "fake")
      ;(part(element, "transcribe-start") as HTMLButtonElement).click()
      for (let tries = 0; !part(element, "transcribe-note").textContent!.includes("Transcribed") && tries < 50; tries++) await wait(50)

      expect(asked).toEqual([48_000])
      expect(part(element, "transcribe-note").textContent).toContain("Transcribed by Fake")
      const json = JSON.parse(changes.filter(change => change.field === "transcript").at(-1)!.text!)
      expect(json.segments.map((segment: { speaker: string, text: string }) => [segment.speaker, segment.text])).toEqual([["voice", "Where were you?"], ["voice", "In the park."]])
      expect(json.speakers).toMatchObject({ interviewer: { by: { people: "BeauJerome" } }, witness: { of: "qb" }, voice: { role: "unattributed" } })
      expect(json.transcription).toMatchObject({ method: "automatic", engine: "fake-engine" })
      // The recording is the interview's still.
      expect(json.recordings).toEqual([{ kind: "audio", src: "call.m4a" }])

      const root = element.shadowRoot!
      for (let tries = 0; !root.querySelector("#speaker-1-witness") && tries < 50; tries++) await wait(50)
      root.querySelector<HTMLButtonElement>("#speaker-0-interviewer")!.click()
      await wait(100)
      root.querySelector<HTMLButtonElement>("#speaker-1-witness")!.click()
      await wait(100)
      const attributed = JSON.parse(changes.filter(change => change.field === "transcript").at(-1)!.text!)
      expect(attributed.segments.map((segment: { speaker: string }) => segment.speaker)).toEqual(["interviewer", "witness"])
      // No turn is the voice's any more: it is gone, and nobody waits for it to proofread.
      expect(Object.keys(attributed.speakers)).toEqual(["interviewer", "witness"])
      expect(Object.keys(attributed.proofreading)).toEqual(["interviewer", "witness"])
    })

    it("says why it could not, and changes nothing", async () => {
      ModuleRegistry.install({
        id: "test-transcription", name: "Test",
        contributes: {
          transcription: [{
            id: "fake", name: "Fake", credit: "© test", creditUrl: "https://test.example",
            create: () => ({ sendsAudio: true, engine: "fake", transcribe: async () => { throw new TranscriptionError("key") } })
          }]
        }
      })
      files["https://example.org/d/interview.json"] = withRecording
      const { element, changes } = await make({ ...event(), url: "interview.json" })
      decodable()
      tabs(element)[1].click()
      await wait(100)
      choose(element, "fake")
      ;(part(element, "transcribe-start") as HTMLButtonElement).click()
      for (let tries = 0; !part(element, "transcribe-note").classList.contains("message-error") && tries < 50; tries++) await wait(50)
      expect(part(element, "transcribe-note").textContent).toBe("The service refused the key.")
      expect(changes.filter(change => change.field === "transcript")).toEqual([])
      expect(part(element, "transcribe-stop").hidden).toBe(true)
    })
  })

  it("says what the interview was held through, among the media, and not nothing once one is said", async () => {
    const { element } = await make({ ...event(), medium: "phone" })
    const select = part(element, "medium") as HTMLSelectElement
    expect([...select.options].map(option => option.value)).toEqual(["in-person", "phone", "video", "chat", "email", "letter", "other"])
    expect(select.value).toBe("phone")
    expect([...select.options].find(option => option.value === "video")!.textContent).toBe("Video call")
  })

  it("shows a placeholder for an interview that says none, which cannot be chosen and goes once a medium is", async () => {
    const { element, changes } = await make(event())
    const select = part(element, "medium") as HTMLSelectElement
    expect([...select.options][0]).toMatchObject({ value: "", disabled: true, hidden: true })
    select.value = "video"
    select.dispatchEvent(new Event("change", { bubbles: true }))
    expect(element.event!.medium).toBe("video")
    expect(changes.map(change => change.field)).toContain("medium")
    expect([...(part(element, "medium") as HTMLSelectElement).options].map(option => option.value)).not.toContain("")
  })

  it("keeps in the file the medium the summary says, and in the summary the medium the file says", async () => {
    const { element } = await make({ ...event(), medium: "phone" })
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

