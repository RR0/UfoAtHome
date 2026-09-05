import { describe, expect, it, vi, beforeEach, afterEach } from "vitest"
import { Timeline } from "../../src/engine/model/Timeline.js"
import { Player } from "../../src/engine/playback/Player.js"
import { createOval } from "../../src/engine/shape/Shape.js"

function buildTimeline(): Timeline {
  const timeline = new Timeline()
  timeline.addKeyframe(0, [{ sourceId: "a", shape: createOval({ x: 0, y: 0, width: 10, height: 10 }) }])
  timeline.addKeyframe(100, [{ sourceId: "a", shape: createOval({ x: 100, y: 0, width: 10, height: 10 }) }])
  return timeline
}

describe("Player", () => {
  it("seek resolves the interpolated shape at that instant", () => {
    const timeline = buildTimeline()
    const onFrame = vi.fn()
    const player = new Player(timeline, onFrame)

    player.seek(50)

    expect(onFrame).toHaveBeenCalledWith(50, new Map([["a", timeline.getInterpolatedShapeAt(50, "a")]]))
    expect(onFrame.mock.calls[0][1].get("a")?.bounds.x).toBe(50)
  })

  it("seek interpolates multiple simultaneous sources independently", () => {
    const timeline = new Timeline()
    timeline.addKeyframe(0, [
      { sourceId: "ufo", shape: createOval({ x: 0, y: 0, width: 10, height: 10 }) },
      { sourceId: "landmark", shape: createOval({ x: 50, y: 50, width: 10, height: 10 }) }
    ])
    timeline.addKeyframe(100, [{ sourceId: "ufo", shape: createOval({ x: 100, y: 0, width: 10, height: 10 }) }])
    const onFrame = vi.fn()
    const player = new Player(timeline, onFrame)

    player.seek(50)

    const shapes = onFrame.mock.calls[0][1] as Map<string, ReturnType<typeof createOval>>
    expect(shapes.get("ufo")?.bounds.x).toBe(50)
    // "landmark" never moves, so it holds its only recorded position.
    expect(shapes.get("landmark")?.bounds.x).toBe(50)
  })

  it("seek clamps to [0, duration]", () => {
    const timeline = buildTimeline()
    const onFrame = vi.fn()
    const player = new Player(timeline, onFrame)

    player.seek(-50)
    expect(player.time).toBe(0)

    player.seek(10_000)
    expect(player.time).toBe(timeline.duration)
  })

  it("seekableDuration falls back to timeline.duration when durationOverrideMs is unset (0)", () => {
    const timeline = buildTimeline() // duration 100
    const player = new Player(timeline, vi.fn())
    expect(player.seekableDuration).toBe(100)
  })

  it("durationOverrideMs extends seek() beyond an empty/short timeline instead of clamping back to it", () => {
    const timeline = new Timeline() // duration 0 — nothing recorded yet
    const onFrame = vi.fn()
    const player = new Player(timeline, onFrame)
    player.durationOverrideMs = 10_000

    player.seek(4000)

    expect(player.time).toBe(4000)
    expect(player.seekableDuration).toBe(10_000)
  })

  it("durationOverrideMs doesn't shrink the seekable range below the actual recorded timeline", () => {
    const timeline = buildTimeline() // duration 100
    const player = new Player(timeline, vi.fn())
    player.durationOverrideMs = 10 // shorter than what's already recorded

    expect(player.seekableDuration).toBe(100)
    player.seek(100)
    expect(player.time).toBe(100)
  })

  it("play/pause/stop transition playbackState synchronously", () => {
    const timeline = buildTimeline()
    const player = new Player(timeline, vi.fn())

    expect(player.playbackState).toBe("stopped")
    player.play()
    expect(player.playbackState).toBe("playing")
    player.pause()
    expect(player.playbackState).toBe("paused")
    player.stop()
    expect(player.playbackState).toBe("stopped")
  })

  describe("with a controllable requestAnimationFrame", () => {
    let now: number
    let frame: FrameRequestCallback | undefined

    beforeEach(() => {
      now = 1000
      frame = undefined
      vi.spyOn(performance, "now").mockImplementation(() => now)
      vi.stubGlobal("requestAnimationFrame", (cb: FrameRequestCallback) => {
        frame = cb
        return 1
      })
      vi.stubGlobal("cancelAnimationFrame", () => {})
    })

    afterEach(() => {
      vi.unstubAllGlobals()
      vi.restoreAllMocks()
    })

    it("playbackRate scales how fast currentT advances relative to wall-clock time", () => {
      const timeline = buildTimeline() // duration 100
      const player = new Player(timeline, vi.fn())
      player.playbackRate = 0.5

      player.play()
      now += 100
      frame?.(now)

      expect(player.time).toBe(50)
    })

    it("loop restarts from 0 (carrying over any overshoot) instead of stopping at the end", () => {
      const timeline = buildTimeline() // duration 100
      const player = new Player(timeline, vi.fn())
      player.loop = true

      player.play()
      now += 130 // overshoots duration by 30
      frame?.(now)

      expect(player.time).toBe(30)
      expect(player.playbackState).toBe("playing")
    })

    it("without loop, stops exactly at duration once wall-clock time overshoots it", () => {
      const timeline = buildTimeline() // duration 100
      const player = new Player(timeline, vi.fn())

      player.play()
      now += 130
      frame?.(now)

      expect(player.time).toBe(100)
      expect(player.playbackState).toBe("stopped")
    })

    it("play() holds the last recorded shape and keeps advancing through durationOverrideMs's extended range", () => {
      const timeline = buildTimeline() // recorded duration 100
      const player = new Player(timeline, vi.fn())
      player.durationOverrideMs = 200 // real declared duration is longer than what's recorded

      player.play()
      now += 150 // well past the recorded 100, but still within the extended 200
      frame?.(now)

      expect(player.time).toBe(150)
      expect(player.playbackState).toBe("playing") // not auto-stopped yet — still within range
    })

    it("play() after reaching the end (no loop) restarts from 0 instead of doing nothing", () => {
      const timeline = buildTimeline() // duration 100
      const player = new Player(timeline, vi.fn())

      player.play()
      now += 130 // reach the end -> auto-stop
      frame?.(now)
      expect(player.time).toBe(100)
      expect(player.playbackState).toBe("stopped")

      player.play()

      expect(player.time).toBe(0)
      expect(player.playbackState).toBe("playing")
    })
  })
})

describe("Player.onEnded", () => {

  const oneSecondTimeline = (): Timeline => {
    const timeline = new Timeline()
    timeline.addKeyframe(0, [{ sourceId: "a", shape: createOval({ x: 0, y: 0, width: 10, height: 10 }) }])
    timeline.addKeyframe(1000, [{ sourceId: "a", shape: createOval({ x: 100, y: 0, width: 10, height: 10 }) }])
    return timeline
  }

  it("fires once when playback runs off the end without looping", () => {
    let now = 0
    const nowSpy = vi.spyOn(performance, "now").mockImplementation(() => now)
    let frame: FrameRequestCallback | undefined
    vi.stubGlobal("requestAnimationFrame", (cb: FrameRequestCallback) => { frame = cb; return 1 })
    vi.stubGlobal("cancelAnimationFrame", () => {})

    const player = new Player(oneSecondTimeline(), () => {})
    let ended = 0
    player.onEnded = () => ended++
    player.play()
    now += 2000
    frame?.(now)

    expect(ended).toBe(1)
    expect(player.playbackState).toBe("stopped")

    vi.unstubAllGlobals()
    nowSpy.mockRestore()
  })

  it("never fires while looping, however far past the end the tick lands", () => {
    let now = 0
    const nowSpy = vi.spyOn(performance, "now").mockImplementation(() => now)
    let frame: FrameRequestCallback | undefined
    vi.stubGlobal("requestAnimationFrame", (cb: FrameRequestCallback) => { frame = cb; return 1 })
    vi.stubGlobal("cancelAnimationFrame", () => {})

    const player = new Player(oneSecondTimeline(), () => {})
    player.loop = true
    let ended = 0
    player.onEnded = () => ended++
    player.play()
    now += 5000
    frame?.(now)

    expect(ended).toBe(0)
    expect(player.playbackState).toBe("playing")

    vi.unstubAllGlobals()
    nowSpy.mockRestore()
  })

  it("does not fire on a seek to the very end — that is a scrub, not an ending", () => {
    const player = new Player(oneSecondTimeline(), () => {})
    let ended = 0
    player.onEnded = () => ended++
    player.seek(player.seekableDuration)
    expect(ended).toBe(0)
  })
})
