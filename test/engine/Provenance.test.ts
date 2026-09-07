import { describe, expect, it } from "vitest"
import { Provenance } from "../../src/engine/persistence/Provenance.js"
import { fromSightingJson, toSightingJson } from "../../src/engine/persistence/sightingJson.js"
import type { SightingRecordingJson } from "../../src/engine/persistence/sightingJson.js"

describe("Provenance", () => {
  it("leaves a recording that carries none exactly as it is", () => {
    // Every recording written before this existed is one, and no entry reads as "stated", which is
    // what those files were.
    const json = { version: 1, time: { year: 1974, month: 5, day: 20 }, timeline: { keyframes: [] } }

    const { recording, provenance } = Provenance.strip(json)

    expect(recording).toEqual(json)
    expect(provenance.size).toBe(0)
  })

  it("takes a wrapped value out and remembers where it came from", () => {
    const { recording, provenance } = Provenance.strip({
      version: 1,
      durationSeconds: { value: 120, basis: "assumed", rationale: "\"quelques mn\" gives no number; two taken so the timeline has a length" },
      timeline: { keyframes: [] }
    })

    expect(recording.durationSeconds).toBe(120)
    expect(provenance.at("durationSeconds")).toMatchObject({
      basis: "assumed",
      rationale: "\"quelques mn\" gives no number; two taken so the timeline has a length"
    })
  })

  it("names a path through arrays by index, the way a claim does", () => {
    const { provenance } = Provenance.strip({
      place: [{ lat: { value: 48.29, basis: "derived", rationale: "Landévennec, geocoded" }, lng: -4.26 }]
    })

    expect(provenance.paths()).toEqual(["place.0.lat"])
  })

  it("round-trips: what is stripped is put back where it was", () => {
    const json = {
      version: 1,
      durationSeconds: { value: 120, basis: "assumed" },
      place: [{ lat: 48.29, lng: { value: -4.26, basis: "derived", rationale: "geocoded" } }],
      timeline: { keyframes: [] }
    }

    const { recording, provenance } = Provenance.strip(json)

    expect(Provenance.restore(recording, provenance)).toEqual(json)
  })

  it("drops a bare \"stated\", which is the default and would be noise in every file", () => {
    const { recording, provenance } = Provenance.strip({ caseId: { value: "landevennec", basis: "stated" } })

    expect(provenance.size).toBe(0)
    expect(Provenance.restore(recording, provenance)).toEqual({ caseId: "landevennec" })
  })

  it("keeps a \"stated\" that carries a rationale, since that is not the default", () => {
    const { provenance } = Provenance.strip({ caseId: { value: "x", rationale: "the witness named the hamlet" } })

    expect(provenance.at("caseId")).toMatchObject({ basis: "stated", rationale: "the witness named the hamlet" })
  })

  it("forgets a guess whose value the author has taken over", () => {
    const { provenance } = Provenance.strip({ time: { hour: { value: 19, basis: "assumed" }, year: 1974 } })

    provenance.clear("time.hour")

    expect(provenance.at("time.hour")).toBeUndefined()
  })

  it("forgets everything under a path, not only the path itself", () => {
    const { provenance } = Provenance.strip({
      place: [{ lat: { value: 48.29, basis: "derived" }, lng: { value: -4.26, basis: "derived" } }]
    })

    provenance.clear("place.0")

    expect(provenance.size).toBe(0)
  })

  it("drops provenance for a path the recording no longer has", () => {
    // A shape deleted, a keyframe removed: its provenance goes with it rather than resurrecting an
    // empty wrapper where the value used to be.
    const { provenance } = Provenance.strip({ caseId: { value: "x", basis: "assumed" }, version: 1 })

    expect(Provenance.restore({ version: 1 }, provenance)).toEqual({ version: 1 })
  })

  it("survives a full load and save of a recording", () => {
    const json = {
      version: 1,
      time: { year: 1974, month: 5, day: 20, hour: 19, minute: 0 },
      utcOffsetHours: { value: 1, basis: "derived", rationale: "France had no summer time before 1976" },
      timeline: { keyframes: [] }
    } as unknown as SightingRecordingJson

    const written = toSightingJson(fromSightingJson(json)) as unknown as Record<string, unknown>

    expect(written.utcOffsetHours).toEqual({
      value: 1,
      basis: "derived",
      rationale: "France had no summer time before 1976"
    })
  })

  it("leaves the model reading plain values, whatever the file wrapped", () => {
    // The whole point of stripping: nothing that draws, computes or plays a sighting consults
    // provenance, and none of them had to learn to unwrap.
    const sighting = fromSightingJson({
      version: 1,
      utcOffsetHours: { value: 1, basis: "derived" },
      timeline: { keyframes: [] }
    } as unknown as SightingRecordingJson)

    expect(sighting.event.utcOffsetHours).toBe(1)
    expect(sighting.provenance.at("utcOffsetHours")?.basis).toBe("derived")
  })
})

describe("Provenance expiry", () => {
  it("drops a basis whose value the author has typed over", () => {
    // A basis describes one value, not one field: crediting the author's own duration to a machine
    // that guessed a different one is exactly the confusion this format exists to prevent.
    const { recording, provenance } = Provenance.strip<Record<string, unknown>>({
      version: 1,
      durationSeconds: { value: 120, basis: "assumed", rationale: "\"quelques mn\" gives no number" }
    })

    recording.durationSeconds = 300

    expect(Provenance.restore(recording, provenance)).toEqual({ version: 1, durationSeconds: 300 })
  })

  it("keeps it while the value is still the one it was said about", () => {
    const { recording, provenance } = Provenance.strip({
      durationSeconds: { value: 120, basis: "assumed" }
    })

    expect(Provenance.restore(recording, provenance)).toEqual({ durationSeconds: { value: 120, basis: "assumed" } })
  })
})
