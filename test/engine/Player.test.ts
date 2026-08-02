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
  it("seek resolves the hold-last-keyframe shape at that instant", () => {
    const timeline = buildTimeline()
    const onFrame = vi.fn()
    const player = new Player(timeline, onFrame)

    player.seek(50)

    expect(onFrame).toHaveBeenCalledWith(50, new Map([["a", timeline.getLatestShapeAt(50, "a")]]))
    expect(onFrame.mock.calls[0][1].get("a")?.bounds.x).toBe(0)
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
  })
})
