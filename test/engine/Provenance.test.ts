import { describe, expect, it } from "vitest"
import { Provenance } from "../../src/engine/persistence/Provenance.js"
import { fromSightingJson, toSightingJson } from "../../src/engine/persistence/sightingJson.js"
import type { SightingRecordingJson } from "../../src/engine/persistence/sightingJson.js"

describe("Provenance", () => {
  it("leaves a recording that carries none exactly as it is", () => {
    // Every recording written before this existed is one, and no entry reads as "stated", which is
    // what those files were.
    const json = { version: 4, time: "1974-05-20", timeline: { keyframes: [] } }

    const { recording, provenance } = Provenance.strip(json)

    expect(recording).toEqual(json)
    expect(provenance.size).toBe(0)
  })

  it("takes a wrapped value out and remembers where it came from", () => {
    const { recording, provenance } = Provenance.strip({
      version: 4,
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
      version: 4,
      durationSeconds: { value: 120, basis: "assumed" },
      place: [{ lat: 48.29, lng: { value: -4.26, basis: "derived", rationale: "geocoded" } }],
      timeline: { keyframes: [] }
    }

    const { recording, provenance } = Provenance.strip(json)

    expect(Provenance.restore(recording, provenance)).toEqual(json)
  })

  it("drops a bare \"stated\", which is the default and would be noise in every file", () => {
    const { recording, provenance } = Provenance.strip({ id: { value: "landevennec", basis: "stated" } })

    expect(provenance.size).toBe(0)
    expect(Provenance.restore(recording, provenance)).toEqual({ id: "landevennec" })
  })

  it("keeps a \"stated\" that carries a rationale, since that is not the default", () => {
    const { provenance } = Provenance.strip({ id: { value: "x", rationale: "the observer named the hamlet" } })

    expect(provenance.at("id")).toMatchObject({ basis: "stated", rationale: "the observer named the hamlet" })
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
    const { provenance } = Provenance.strip({ id: { value: "x", basis: "assumed" }, version: 4 })

    expect(Provenance.restore({ version: 4 }, provenance)).toEqual({ version: 4 })
  })

  it("survives a full load and save of a recording", () => {
    const json = {
      version: 4,
      time: "1974-05-20T19:00",
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
      version: 4,
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
      version: 4,
      durationSeconds: { value: 120, basis: "assumed", rationale: "\"quelques mn\" gives no number" }
    })

    recording.durationSeconds = 300

    expect(Provenance.restore(recording, provenance)).toEqual({ version: 4, durationSeconds: 300 })
  })

  it("keeps it while the value is still the one it was said about", () => {
    const { recording, provenance } = Provenance.strip({
      durationSeconds: { value: 120, basis: "assumed" }
    })

    expect(Provenance.restore(recording, provenance)).toEqual({ durationSeconds: { value: 120, basis: "assumed" } })
  })
})

describe("Provenance.restore and what it is given", () => {
  it("never writes into the recording it is given, copying only what lies on the way to a value it wraps", () => {
    const json = {
      version: 4,
      observerTrack: { keyframes: [{ t: 0, pose: { headingDeg: { value: 110, rationale: "call" }, pitchDeg: 10 } }] },
      timeline: { keyframes: [{ t: 0, shapes: [] }] }
    }
    const { recording, provenance } = Provenance.strip(json)
    const before = JSON.stringify(recording)
    const restored = Provenance.restore(recording, provenance) as typeof json
    expect(JSON.stringify(recording)).toBe(before)
    expect(restored).toEqual(json)
    // What no path goes through is the recording's own, shared rather than copied.
    expect(restored.timeline).toBe((recording as typeof json).timeline)
    expect(restored.observerTrack).not.toBe((recording as typeof json).observerTrack)
  })
})

describe("Provenance.free", () => {
  it("is true of what a reading may move: what nobody settled, and what was turned for a hypothesis", () => {
    expect(Provenance.free({ basis: "assumed" })).toBe(true)
    expect(Provenance.free({ basis: "fitted", rationale: "Venus, to see whether the heading can be made to fit" })).toBe(true)
  })

  it("is false of everything a reconstruction may be judged against, and of nothing said at all", () => {
    for (const basis of ["established", "measured", "stated", "derived"] as const) {
      expect(Provenance.free({ basis })).toBe(false)
    }
    expect(Provenance.free(undefined)).toBe(false)
  })
})

describe("Provenance and what a value rests on", () => {
  /** A duration the observer first said, corrected in a second interview; a distance measured in SVH on a
   * registered photograph; a crane's height taken from the works permit. */
  const recording = () => ({
    version: 4,
    durationSeconds: { value: 90, source: { said: { interview: "itw-2", segment: 14, range: [0, 32] } } },
    observerTrack: {
      keyframes: [{
        t: 0,
        pose: {
          headingDeg: { value: 112, basis: "measured", how: "instrument", source: { tool: "SVH", picture: "ref-1" } },
          elevationM: { value: 31, basis: "established", source: { document: "Permis de construire PC 075-2024", at: "p. 4", url: "https://example.org/pc.pdf" } },
          // Never revisited: it goes on citing the first interview, which is what says it did not change.
          pitchDeg: { value: 3, source: { said: { interview: "itw-1", segment: 7 } } }
        }
      }]
    }
  })

  it("keeps what a value rests on through a round trip, as it keeps the rest", () => {
    const { recording: stripped, provenance } = Provenance.strip(recording())
    // A bare basis is "stated", and stays unwritten: what is written back is what a file holds.
    expect(provenance.at("durationSeconds")?.basis).toBe("stated")
    expect(provenance.at("durationSeconds")?.source).toEqual({ said: { interview: "itw-2", segment: 14, range: [0, 32] } })
    expect(provenance.at("observerTrack.keyframes.0.pose.elevationM")?.source).toMatchObject({ at: "p. 4" })
    expect(Provenance.restore(stripped, provenance)).toEqual(recording())
  })

  it("lists every value that names its source, with its basis: a report's traceability table", () => {
    const { provenance } = Provenance.strip(recording())
    expect(provenance.sourced().map(({ path, basis }) => [path, basis])).toEqual([
      ["durationSeconds", "stated"],
      ["observerTrack.keyframes.0.pose.headingDeg", "measured"],
      ["observerTrack.keyframes.0.pose.elevationM", "established"],
      ["observerTrack.keyframes.0.pose.pitchDeg", "stated"]
    ])
  })

  it("says which interviews it cites and what each accounts for: the history of what was said", () => {
    const { provenance } = Provenance.strip(recording())
    expect(provenance.interviewsCited()).toEqual(["itw-2", "itw-1"])
    expect(provenance.pathsFromInterview("itw-2")).toEqual(["durationSeconds"])
    expect(provenance.pathsFromInterview("itw-1")).toEqual(["observerTrack.keyframes.0.pose.pitchDeg"])
    // What a document or a tool holds up is not an interview's doing.
    expect(provenance.pathsFromInterview()).toEqual([])
  })

  it("is said of a value that says nothing else: a source alone is worth storing", () => {
    const { recording: stripped, provenance } = Provenance.strip({ lightPollution: { value: 2, source: { tool: "World Atlas 2016" } } })
    expect(provenance.at("lightPollution")).toMatchObject({ basis: "stated", source: { tool: "World Atlas 2016" } })
    expect(Provenance.restore(stripped, provenance)).toEqual({ lightPollution: { value: 2, source: { tool: "World Atlas 2016" } } })
  })

  it("keeps a justification given in several languages, as a title is", () => {
    const rationale = { fr: "le rapport, tableau 1", en: "the report, table 1" }
    const { recording: stripped, provenance } = Provenance.strip({ time: { value: "1950", basis: "derived", rationale } })
    expect(provenance.at("time")?.rationale).toEqual(rationale)
    expect(Provenance.restore(stripped, provenance)).toEqual({ time: { value: "1950", basis: "derived", rationale } })
  })
})
