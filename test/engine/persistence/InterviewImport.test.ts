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
})
