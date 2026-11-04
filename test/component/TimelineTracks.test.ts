// @vitest-environment jsdom
import { describe, expect, it } from "vitest"
import { TimelineTracks } from "../../src/component/TimelineTracks.js"
import type { TimelineTrack } from "../../src/component/TimelineTracks.js"

const messages = { addKeyframeHere: "Add a keyframe here", keyframeHere: "A keyframe is here: editing it changes it", zoomHint: "Pinch to zoom" }

function track(times: number[], calls: string[]): TimelineTrack {
  return { id: "shapes", label: "shapes", color: "#f5c451", times, open: () => calls.push("open"), add: () => calls.push("add") }
}

describe("TimelineTracks", () => {
  it("draws a row per track: its name, its keyframes along the recording, and a +", () => {
    const host = document.createElement("div")
    const tracks = new TimelineTracks(host, () => undefined, messages)
    tracks.show([track([0, 5000], [])], 10000, 5000)
    const diamonds = [...host.querySelectorAll<HTMLElement>(".kf")]
    expect(diamonds.map(diamond => diamond.style.left)).toEqual(["0%", "50%"])
    expect(diamonds.map(diamond => diamond.getAttribute("aria-current"))).toEqual(["false", "true"])
    expect(host.querySelector<HTMLButtonElement>(".track-add")!.title).toBe("shapes · A keyframe is here: editing it changes it")
  })

  it("opens the track's section from its name, and keyframes it from its +", () => {
    const host = document.createElement("div")
    const calls: string[] = []
    new TimelineTracks(host, () => undefined, messages).show([track([], calls)], 10000, 0)
    host.querySelector<HTMLButtonElement>(".track-name")!.click()
    host.querySelector<HTMLButtonElement>(".track-add")!.click()
    expect(calls).toEqual(["open", "add"])
    expect(host.querySelector<HTMLButtonElement>(".track-add")!.title).toBe("shapes · Add a keyframe here")
  })

  it("zooms around an instant, scrolls within the recording, and cuts the bars to the part in view", () => {
    const host = document.createElement("div")
    const tracks = new TimelineTracks(host, () => undefined, messages)
    const spans = [{ t: 1000, until: 9000, label: "Rises" }]
    tracks.show([{ ...track([2000, 8000], []), spans }], 10000, 0)
    expect(host.querySelector<HTMLElement>(".track-scroll")!.hidden).toBe(true)
    tracks.zoomTo(2000, 5000)
    expect(tracks.zoomed).toBe(true)
    const bar = host.querySelector<HTMLElement>(".span")!
    expect([bar.style.left, bar.style.width]).toEqual(["0%", "100%"])
    expect([...host.querySelectorAll<HTMLElement>(".kf")].map(diamond => diamond.hidden)).toEqual([true, true])
    expect(host.querySelector<HTMLElement>(".track-scroll")!.hidden).toBe(false)
    expect(host.querySelector<HTMLElement>(".thumb")!.style.left).toBe("40%")
    tracks.scrollTo(9000)
    // Kept within the recording: the last 2 s.
    expect(host.querySelector<HTMLElement>(".thumb")!.style.left).toBe("80%")
    const diamonds = [...host.querySelectorAll<HTMLElement>(".kf")]
    expect(diamonds[1].hidden).toBe(false)
    expect(diamonds[1].style.left).toBe("0%")
    tracks.zoomTo(1e9)
    expect(tracks.zoomed).toBe(false)
  })
})
