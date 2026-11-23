import { describe, expect, it } from "vitest"
import { Orientation } from "../../../src/engine/orientation/OrientationProvider.js"
import type { OrientationResults } from "../../../src/engine/orientation/OrientationProvider.js"
import { RecordingDigest } from "../../../src/engine/orientation/RecordingDigest.js"

const results: OrientationResults = {
  provider: "tool",
  engine: { name: "Tool", version: "1.0" },
  profiles: [
    { id: "P1", episodes: [{ event: "a", digest: "1" }, { event: "b", digest: "2" }], configurations: [] },
    { id: "P2", episodes: [{ event: "c" }], configurations: [] }
  ]
}

describe("Orientation", () => {
  it("says which episodes were coded on a recording that changed since, and not those it cannot tell", () => {
    expect(Orientation.stale(results, new Map([["a", "1"], ["b", "3"], ["c", "9"]]))).toEqual([{ profile: "P1", event: "b" }])
    expect(Orientation.stale(results, new Map())).toEqual([])
  })

  it("lists the profiles an episode is in", () => {
    expect(Orientation.profilesOf(results, "b").map(profile => profile.id)).toEqual(["P1"])
    expect(Orientation.profilesOf(results, "z")).toEqual([])
  })
})

describe("RecordingDigest", () => {
  it("is the SHA-256 of a text, in hexadecimal", async () => {
    expect(await RecordingDigest.of("abc")).toBe("ba7816bf8f01cfea414140de5dae2223b00361a396177a9cb410ff61f20015ad")
  })

  it("is the same for an object whatever order its keys were written in, and differs when a value does", async () => {
    const one = await RecordingDigest.of({ id: "x", time: { value: "2023", basis: "assumed" } })
    expect(await RecordingDigest.of({ time: { basis: "assumed", value: "2023" }, id: "x" })).toBe(one)
    expect(await RecordingDigest.of({ id: "x", time: { value: "2023", basis: "stated" } })).not.toBe(one)
  })
})
