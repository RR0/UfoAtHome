import { mkdtempSync, readFileSync, writeFileSync } from "node:fs"
import { tmpdir } from "node:os"
import { join } from "node:path"
import { describe, expect, it } from "vitest"
import { RecordingMigration } from "../../scripts/migrate-recordings.js"

/** A recording as the builders of the demo cases write one: the oldest version of the format, one space of indent, a closing newline. */
const wrote = (json: object): string => {
  const path = join(mkdtempSync(join(tmpdir(), "recording-")), "observer.json")
  writeFileSync(path, JSON.stringify(json, undefined, 1) + "\n")
  return path
}

const VERSION_1 = {
  version: 1,
  id: "observer-test",
  event: { time: { year: 1994, month: 1, day: 28 }, place: [{ lat: 48.8, lng: 2.3 }] },
  timeline: { keyframes: [], order: [], groups: [] }
}

describe("RecordingMigration", () => {
  it("brings a recording a builder wrote in the oldest version up to the current one", () => {
    const path = wrote(VERSION_1)
    const moved = RecordingMigration.migrate([path])
    expect(moved).toEqual([{ path, from: 1, to: 4 }])
    const migrated = JSON.parse(readFileSync(path, "utf8")) as { version: number }
    expect(migrated.version).toBe(4)
  })

  it("leaves a recording already at the current version exactly as it was, down to the byte", () => {
    // What a Python builder writes a whole number as: a round-trip through JSON.stringify would silently drop the trailing zero.
    const path = wrote({ ...VERSION_1, version: 4, observerTrack: { keyframes: [{ t: 0, pose: { headingDeg: 332.0, lat: 48.8 } }] } })
    const before = readFileSync(path, "utf8")
    expect(RecordingMigration.migrate([path])).toEqual([])
    expect(readFileSync(path, "utf8")).toBe(before)
  })

  it("says nothing of a file it did not have to move, so a whole case can be run through it", () => {
    const old = wrote(VERSION_1)
    const current = wrote({ ...VERSION_1, version: 4 })
    expect(RecordingMigration.migrate([old, current]).map(entry => entry.path)).toEqual([old])
  })
})
