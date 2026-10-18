import { existsSync, readFileSync } from "node:fs"
import { describe, expect, it } from "vitest"
import { CaseFile } from "../../src/engine/persistence/caseJson.js"

describe("The Saint-Lô case", () => {
  const json = JSON.parse(readFileSync("public/demo-data/case-saint-lo.json", "utf8"))

  it("lists the recording of the witness, and nothing else as an observer", () => {
    expect(CaseFile.isCase(json)).toBe(true)
    expect(CaseFile.sightingUrls(json, "https://example.org/d/case-saint-lo.json")).toEqual(["https://example.org/d/observer-saint-lo.json"])
  })

  it("keeps the interview held with him, which names his sighting and which nothing of replays", () => {
    const interview = json.events.find((event: { eventType: string }) => event.eventType === CaseFile.INTERVIEW_EVENT)
    expect(interview.interviewOf).toBe("qb")
    // It says what it was held through.
    expect(interview.medium).toBe("video")
    expect(CaseFile.problems(json, [])).toEqual({ duplicateIds: [], unresolved: [] })
  })
})

// The transcript is published once its anonymisation has been read through: until then the file may not be there.
const TRANSCRIPT = "public/demo-data/interview-saint-lo-2026-10-13.json"

describe.skipIf(!existsSync(TRANSCRIPT))("The transcript of the Saint-Lô interview", () => {
  // Read when a test runs, not when the suite is collected: a skipped suite is still collected, and the file is not there for everyone.
  const read = () => JSON.parse(readFileSync(TRANSCRIPT, "utf8"))

  it("gives every turn a known speaker and times in order", () => {
    const transcript = read()
    expect(transcript.segments.length).toBeGreaterThan(100)
    for (const segment of transcript.segments) {
      expect(Object.keys(transcript.speakers)).toContain(segment.speaker)
      expect(segment.end).toBeGreaterThanOrEqual(segment.start)
      if (segment.redacted) {
        expect(segment.text, "a redacted passage keeps nothing of what was said").toBeUndefined()
        expect(Object.keys(segment.redacted.reason).length).toBeGreaterThan(0)
      } else if (segment.parts) {
        expect(segment.text, "a segment with parts has no text of its own").toBeUndefined()
        expect(segment.parts.some((part: { text?: string }) => part.text !== undefined && part.text.trim() !== "")).toBe(true)
      } else expect(segment.text.trim()).not.toBe("")
    }
    const starts = transcript.segments.map((segment: { start: number }) => segment.start)
    expect(starts).toEqual([...starts].sort((a, b) => a - b))
  })

  it("holds what the case lists of the interview: its title, time, interviewer, witness and summary are the same", () => {
    const transcript = read()
    const listed = JSON.parse(readFileSync("public/demo-data/case-saint-lo.json", "utf8")).events
      .find((event: { eventType: string }) => event.eventType === "interview")
    for (const key of ["title", "time", "medium", "by", "interviewOf", "summary"]) expect(transcript[key], key).toEqual(listed[key])
  })

  it("names the witness by initials and says no first name aloud", () => {
    const transcript = read()
    expect(transcript.speakers.witness.title).toBe("Q. B.")
    const said = transcript.segments.map((segment: { text: string }) => segment.text).join(" ")
    expect(said).not.toMatch(/Quentin|Jérôme|Bézard/)
  })
})
