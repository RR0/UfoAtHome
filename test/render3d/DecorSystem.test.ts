import { describe, expect, it } from "vitest"
import { DecorSystem } from "../../src/render3d/DecorSystem.js"
import type { DecorObject } from "../../src/engine/model/Decor.js"

function building(overrides: Partial<DecorObject> = {}): DecorObject {
  return { id: "decor-1", kind: "building", eastM: 0, northM: 15, floors: 2, ...overrides }
}

function vehicle(overrides: Partial<DecorObject> = {}): DecorObject {
  return { id: "decor-2", kind: "vehicle", eastM: 8, northM: 15, ...overrides }
}

describe("DecorSystem.build window rendering", () => {
  it("adds no window mesh at all for a side with no windows entry", () => {
    const group = DecorSystem.build(building(), false)
    // Just the body box, no window panes, no occupant (no witnessSide) — no entries on any side
    // adds nothing.
    expect(group.children).toHaveLength(1)
  })

  it("adds exactly one window pane per floor per side with a present opacity value, however low", () => {
    const group = DecorSystem.build(building({ windows: { front: 0, behind: 60 } }), false)
    // body (1) + front pane * 3 levels + behind pane * 3 levels = 7 — left/right stay absent, even
    // though front is opacity 0 (fully transparent) it's still a PRESENT entry, so it still gets a
    // (fully-see-through) pane rather than no mesh at all.
    expect(group.children).toHaveLength(7)
  })

  it("adds a room enclosure (plain walls on windowless sides, floor+ceiling always) plus the occupant figure once witnessSide is set", () => {
    const noWindows = DecorSystem.build(building({ witnessSide: "front" }), false)
    // body (1) + occupant figure group (1) + room: 4 plain walls (all sides absent) + floor + ceiling = 6
    expect(noWindows.children).toHaveLength(1 + 1 + 6)
  })

  it("frames a windowed side (4 panels around the gap) instead of skipping its wall entirely — the real bug this fixes: an earlier version left the WHOLE side open (not just the window's own rectangle), reading as a giant unintended hole straight through to the sky rather than a wall with one window in it", () => {
    const oneWindow = DecorSystem.build(building({ witnessSide: "front", windows: { front: 0 } }), false)
    // body (1) + front window pane * 3 levels (3) + occupant (1) + room: front framed (4 panels) +
    // behind/left/right plain (3) + floor + ceiling (2) = 9
    expect(oneWindow.children).toHaveLength(1 + 3 + 1 + 9)
  })
})

describe("DecorSystem.occupantView", () => {
  it("throws when witnessSide is unset", () => {
    expect(() => DecorSystem.occupantView(building())).toThrow()
  })

  it("places the camera at a standing eye height (1.6m) above the occupied floor's own ground level, facing outward through the given side combined with the building's own heading", () => {
    const view = DecorSystem.occupantView(building({ witnessSide: "left", headingDeg: 40, occupiedFloor: 1 }))
    expect(view.eyeY).toBe(3 + 1.6) // occupiedFloor 1 * BUILDING_FLOOR_HEIGHT (3) + EYE_HEIGHT_M (1.6)
    expect(view.headingDeg).toBe(40 - 90) // heading - SIDE_YAW_DEG.left(90)
  })

  it("places the camera at a fixed eye height matching the cabin's own vertical center (not a standing eye height, and not the visible figure's own base) regardless of occupiedFloor (meaningless for a vehicle)", () => {
    const view = DecorSystem.occupantView(vehicle({ witnessSide: "right", headingDeg: 90 }))
    expect(view.eyeY).toBe(1.7) // VEHICLE_CABIN_Y, i.e. VEHICLE_EYE_Y — NOT VEHICLE_WITNESS_Y (0.75, the figure's own base)
    expect(view.headingDeg).toBe(90 - -90) // heading - SIDE_YAW_DEG.right(-90)
  })
})
