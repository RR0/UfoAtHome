import { describe, expect, it } from "vitest"
import { GenerativePrompt } from "../../../src/engine/generative/GenerativePrompt.js"
import { ControlPassEncoding } from "../../../src/engine/generative/ControlPassEncoding.js"

const RECORDING = {
  id: "2012-06-29-Maffliers",
  time: "2012-06-29T06:06",
  place: { name: "Maffliers, Val-d'Oise, France" },
  description: { en: "I was walking my dog, no portholes.", fr: "Je promenais ma chienne, sans hublot." },
  tags: ["daylight"],
  timeline: {
    keyframes: [
      { t: 0, shapes: [{ sourceId: "ufo-1", shape: { title: { en: "Very bright object" }, color: "#eef1f4", angular: { widthDeg: 8.5, heightDeg: 0.5 }, aim: { azimuthDeg: 353.6, altitudeDeg: 0.64 } } }] },
      { t: 20500, shapes: [{ sourceId: "ufo-1", shape: { title: { en: "Very bright object" }, color: "#eef1f4", angular: { widthDeg: 8.5, heightDeg: 0.5 }, aim: { azimuthDeg: 327, altitudeDeg: 6.6 } } }] }
    ]
  },
  weatherTrack: {
    keyframes: [
      { t: 0, weather: { cloudCover: 1, cloudBaseM: 241, precipitationType: "none" } },
      { t: 16900, weather: { cloudCover: 1, cloudBaseM: 241, precipitationType: "none" } },
      { t: 17000, weather: { cloudCover: 1, cloudBaseM: 241, precipitationType: "rain", precipitationIntensity: 0.5 } }
    ]
  },
  milestones: [{ t: 4000, note: { en: "The dog stops." } }, { t: 17000, note: { en: "A shower falls." } }]
}

describe("GenerativePrompt", () => {
  it("says only what the recording states, counted in the video's own seconds, and never the testimony itself", () => {
    const prompt = GenerativePrompt.of(RECORDING, { fromSeconds: 15, toSeconds: 21 })
    expect(prompt).toContain("Maffliers, Val-d'Oise, France, local time 2012-06-29T06:06")
    // Where the phenomenon stands as the clip opens, not where it ends.
    expect(prompt).toContain("Very bright object: colour #eef1f4, 8.5° wide and 0.5° tall as seen, at azimuth 354°, 0.6° above the horizon.")
    expect(prompt).toContain("- 2.0 s into the video: A shower falls.")
    expect(prompt).not.toContain("The dog stops.")
    expect(prompt).toContain("- from the start: overcast, cloud base 241 m, no precipitation.")
    expect(prompt).toContain("- from 2.0 s into the video: overcast, cloud base 241 m, rain, intensity 0.5.")
    expect(prompt).not.toContain("walking my dog")
    expect(prompt).toContain("Negative prompt:")
  })

  it("counts a recording played faster than it happened in the video's seconds", () => {
    expect(GenerativePrompt.of(RECORDING, { fromSeconds: 15, toSeconds: 21, rate: 2 })).toContain("- 1.0 s into the video: A shower falls.")
  })
})

describe("ControlPassEncoding", () => {
  it("writes the depth on one logarithmic scale, the sky black", () => {
    expect(ControlPassEncoding.depthLevel(0)).toBe(0)
    expect(ControlPassEncoding.depthLevel(0.5)).toBe(1)
    expect(ControlPassEncoding.depthLevel(ControlPassEncoding.DEPTH_FAR_M * 2)).toBe(0)
    // A wood's edge 500 m away is a third of the way up, not black.
    expect(ControlPassEncoding.depthLevel(500)).toBeCloseTo(0.372, 3)
  })

  it("grows the phenomenon's mask by its margin, as a square", () => {
    const width = 11, height = 11
    const mask = new Uint8Array(width * height)
    mask[5 * width + 5] = 1
    const grown = new Uint8Array(width * height)
    ControlPassEncoding.dilate(mask, grown, width, height, 2)
    const on = [...grown].filter(value => value === 255).length
    expect(on).toBe(25)
    expect(grown[3 * width + 3]).toBe(255)
    expect(grown[2 * width + 5]).toBe(0)
  })
})
