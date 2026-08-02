import { describe, expect, it, vi } from "vitest"
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
})
