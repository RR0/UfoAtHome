import { describe, expect, it } from "vitest"
import { InterviewImport } from "../../../src/engine/persistence/interviewImport.js"

describe("InterviewImport", () => {
  it("reads times as seconds, with or without hours, and a fraction after a dot or a comma", () => {
    expect(InterviewImport.seconds("01:02:03")).toBe(3723)
    expect(InterviewImport.seconds("02:03")).toBe(123)
    expect(InterviewImport.seconds("00:00:01,500")).toBe(1.5)
    expect(InterviewImport.seconds("01:01.25")).toBe(61.25)
    expect(InterviewImport.seconds("hello")).toBeUndefined()
  })

  it("reads WebVTT with its voice tags", () => {
    const json = InterviewImport.parse("WEBVTT\n\n00:00:01.000 --> 00:00:04.000\n<v Jérôme>Where were you?\n\n00:00:05.000 --> 00:00:08.000\n<v Q. B.>In the <i>park</i>.\n")!
    expect(json.segments).toEqual([
      { speaker: "interviewer", start: 1, end: 5, text: "Where were you?" },
      { speaker: "witness", start: 5, text: "In the park." }
    ])
    expect(json.speakers.witness.title).toBe("Q. B.")
  })

  it("reads SRT, numbered cues with a comma before the milliseconds, and a name before the text", () => {
    const json = InterviewImport.parse("1\n00:00:01,000 --> 00:00:03,000\nAlice: Tell me.\n\n2\n00:00:04,000 --> 00:00:06,000\nBob: It was big.\n")!
    expect(json.segments.map(segment => [segment.start, segment.text])).toEqual([[1, "Tell me."], [4, "It was big."]])
    expect(Object.values(json.speakers).map(speaker => speaker.role)).toEqual(["interviewer", "witness"])
  })

  it("reads a text with a name before each turn, a turn going on over the lines that have none", () => {
    const json = InterviewImport.parse("Jérôme: Did you see it?\nQ. B.: Yes.\nIt crossed the sky.\n\nJérôme: How long?\nQ. B.: Five seconds.", { by: ["Jérôme"], witnesses: [{ id: "qb", label: "Q. B." }] })!
    expect(json.segments.map(segment => [segment.speaker, segment.text])).toEqual([
      ["interviewer", "Did you see it?"], ["witness", "Yes. It crossed the sky."], ["interviewer", "How long?"], ["witness", "Five seconds."]
    ])
    expect(json.speakers).toMatchObject({ interviewer: { by: { people: "Jérôme" } }, witness: { of: "qb", title: "Q. B." } })
    expect(json.proofreading).toEqual({ interviewer: { status: "pending" }, witness: { status: "pending" } })
  })

  it("reads the times that come with the names, in brackets before or in parentheses after", () => {
    const json = InterviewImport.parse("[00:00:10] Alice: First.\nBob (00:00:20): Second.\n00:00:30 Alice: Third.")!
    expect(json.segments.map(segment => [segment.start, segment.end])).toEqual([[10, 20], [20, 30], [30, undefined]].map(([a, b]) => b === undefined ? [a, undefined] : [a, b]))
    expect(json.segments.map(segment => segment.text)).toEqual(["First.", "Second.", "Third."])
  })

  it("takes Q and R, in any language, for the one who asks and the one who answers", () => {
    const json = InterviewImport.parse("Q: What did you see?\nR: A light.\nQ: Where?\nR: Over the trees.")!
    expect(json.segments.map(segment => segment.speaker)).toEqual(["interviewer", "witness", "interviewer", "witness"])
    expect(json.speakers.witness.title).toBeUndefined()
  })

  it("gives the other speakers of a file witnesses of their own, called what the file calls them", () => {
    const json = InterviewImport.parse("Ann: One.\nBen: Two.\nCal: Three.\nBen: Four.")!
    expect(Object.keys(json.speakers)).toEqual(["interviewer", "witness", "witness2"])
    expect(json.speakers.witness2.title).toBe("Cal")
  })

  it("does not take a colon in a sentence for a speaker", () => {
    const json = InterviewImport.parse("I saw three things: a light, a shape and a sound.\n\nIt was late: past two.")!
    expect(json.segments).toHaveLength(2)
    expect(json.segments[0].text).toBe("I saw three things: a light, a shape and a sound.")
  })

  it("reads plain paragraphs as turns with no times", () => {
    const json = InterviewImport.parse("First paragraph\nover two lines.\n\nSecond one.")!
    expect(json.segments.map(segment => segment.text)).toEqual(["First paragraph over two lines.", "Second one."])
    expect(json.segments.every(segment => segment.start === undefined && segment.end === undefined)).toBe(true)
  })

  it("holds nothing of an empty file", () => {
    expect(InterviewImport.parse("  \n ")).toBeUndefined()
  })

  it("gives what a transcription found to a voice still to attribute, never to the interviewer, the case's speakers ready for it", () => {
    const json = InterviewImport.transcribed([
      { start: 0.004, end: 2.5, text: " Where  were you? " },
      { start: 3, end: 5, text: "In the park." },
      { start: 6, end: 6, text: "   " }
    ], { by: ["BeauJerome"], witnesses: [{ id: "qb", label: "Q. B." }] })!
    expect(json.speakers).toEqual({
      interviewer: { role: "interviewer", by: { people: "BeauJerome" } },
      witness: { role: "witness", title: "Q. B.", of: "qb" },
      voice: { role: InterviewImport.UNATTRIBUTED }
    })
    expect(json.segments).toEqual([
      { speaker: "voice", start: 0, end: 2.5, text: "Where were you?" },
      { speaker: "voice", start: 3, end: 5, text: "In the park." }
    ])
    // The voice proofreads nothing: whoever it turns out to be does.
    expect(json.proofreading).toEqual({ interviewer: { status: "pending" }, witness: { status: "pending" } })
  })

  it("keeps the voices a service told apart as voices, each called as it called it", () => {
    const json = InterviewImport.transcribed([
      { start: 0, end: 1, text: "Hello.", speaker: "A" },
      { start: 1, end: 2, text: "Hi.", speaker: "B" },
      { start: 2, end: 3, text: "So.", speaker: "A" }
    ])!
    expect(json.segments.map(segment => segment.speaker)).toEqual(["voice", "voice2", "voice"])
    expect(json.speakers.voice2).toEqual({ role: InterviewImport.UNATTRIBUTED, title: "B" })
    expect(InterviewImport.transcribed([{ start: 0, end: 1, text: " " }])).toBeUndefined()
  })

  it("drops a voice nobody speaks with any more, and only such a voice", () => {
    const json = InterviewImport.transcribed([{ start: 0, end: 1, text: "Hello." }], { by: ["BeauJerome"], witnesses: [{ id: "qb", label: "Q. B." }] })!
    json.segments[0].speaker = "witness"
    InterviewImport.dropUnheard(json)
    expect(Object.keys(json.speakers)).toEqual(["interviewer", "witness"])
    expect(Object.keys(json.proofreading!)).toEqual(["interviewer", "witness"])
  })

  it("gives every turn of a voice a service told apart at once, and a voice nobody told apart turn by turn", () => {
    const told = InterviewImport.transcribed([
      { start: 0, end: 1, text: "Q?", speaker: "A" }, { start: 1, end: 2, text: "R.", speaker: "B" }, { start: 2, end: 3, text: "Q2?", speaker: "A" }
    ], { by: ["BeauJerome"], witnesses: [{ id: "qb", label: "Q. B." }] })!
    InterviewImport.attribute(told, 0, "interviewer")
    expect(told.segments.map(segment => segment.speaker)).toEqual(["interviewer", "voice2", "interviewer"])
    expect(told.speakers.voice).toBeUndefined()
    const one = InterviewImport.transcribed([{ start: 0, end: 1, text: "Q?" }, { start: 1, end: 2, text: "R." }], { by: ["BeauJerome"] })!
    InterviewImport.attribute(one, 0, "interviewer")
    expect(one.segments.map(segment => segment.speaker)).toEqual(["interviewer", "voice"])
  })
})
