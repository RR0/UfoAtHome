import { describe, expect, it } from "vitest"
import { Box3, BoxGeometry, Group, Mesh, type Object3D } from "three"
import { DecorSystem } from "../../src/render3d/DecorSystem.js"
import type { DecorObject } from "../../src/engine/model/Decor.js"

/** The primitive's own parts, one level down: the stated size scales them inside a body group the
 * outer group keeps (see DecorSystem.BODY_NAME), so "what was built" is this, not parts(group). */
function parts(group: Object3D) {
  return DecorSystem.bodyOf(group).children
}

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
    expect(parts(group)).toHaveLength(1)
  })

  it("adds exactly one window pane per floor per side with a present opacity value, however low", () => {
    const group = DecorSystem.build(building({ windows: { front: 0, behind: 60 } }), false)
    // body (1) + front pane * 3 levels + behind pane * 3 levels = 7 — left/right stay absent, even
    // though front is opacity 0 (fully transparent) it's still a PRESENT entry, so it still gets a
    // (fully-see-through) pane rather than no mesh at all.
    expect(parts(group)).toHaveLength(7)
  })

  it("adds a room enclosure (plain walls on windowless sides, floor+ceiling always) plus the occupant figure once witnessSide is set", () => {
    const noWindows = DecorSystem.build(building({ witnessSide: "front" }), false)
    // body (1) + occupant figure group (1) + room: 4 plain walls (all sides absent) + floor + ceiling = 6
    expect(parts(noWindows)).toHaveLength(1 + 1 + 6)
  })

  it("frames a windowed side (4 panels around the gap) instead of skipping its wall entirely — the real bug this fixes: an earlier version left the WHOLE side open (not just the window's own rectangle), reading as a giant unintended hole straight through to the sky rather than a wall with one window in it", () => {
    const oneWindow = DecorSystem.build(building({ witnessSide: "front", windows: { front: 0 } }), false)
    // body (1) + front window pane * 3 levels (3) + occupant (1) + room: front framed (4 panels) +
    // behind/left/right plain (3) + floor + ceiling (2) = 9
    expect(parts(oneWindow)).toHaveLength(1 + 3 + 1 + 9)
  })
})

describe("DecorSystem.build vehicle door-window rendering", () => {
  it("adds no window mesh at all for a vehicle with no windows entry", () => {
    const group = DecorSystem.build(vehicle(), false)
    // body (1) + cabin (1) + 4 wheels + 2 headlights = 8, no window panes at all.
    expect(parts(group)).toHaveLength(8)
  })

  it("adds exactly one pane for a single door corner, at its own front/behind Z offset — not the old single side-spanning pane", () => {
    const group = DecorSystem.build(vehicle({ windows: { "front-left": 50 } }), false)
    expect(parts(group)).toHaveLength(9) // base 8 + 1 door pane
    const pane = parts(group)[8]
    expect(pane.position.z).toBeLessThan(0) // front door sits toward -Z
  })

  it("adds two independently-positioned panes when both the front-door and rear-door windows on the same side are present", () => {
    const group = DecorSystem.build(vehicle({ windows: { "front-left": 50, "behind-left": 30 } }), false)
    expect(parts(group)).toHaveLength(10) // base 8 + 2 door panes
    const zPositions = [parts(group)[8].position.z, parts(group)[9].position.z].sort((a, b) => a - b)
    expect(zPositions[0]).toBeLessThan(0) // front door, toward -Z
    expect(zPositions[1]).toBeGreaterThan(0) // rear door, toward +Z
  })

  it("frames a wall with TWO window gaps (front-door + rear-door) as caps + 3 strips (before/between-pillar/after), not the single-gap 4-panel decomposition a building's own wall uses", () => {
    const group = DecorSystem.build(
      vehicle({ witnessSide: "front-left", windows: { "front-left": 50, "behind-left": 30 } }),
      false
    )
    // base (8) + occupant (1) + 2 door panes (front-left, behind-left) + room:
    //   front wall (no window) plain (1) + behind wall (no window) plain (1) +
    //   left wall (2 gaps) framed = 2 caps + 3 strips (5) + right wall (no window) plain (1) +
    //   floor + ceiling (2) = 10
    expect(parts(group)).toHaveLength(8 + 1 + 2 + 10)
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

  it("seats a front-left/behind-left occupant at the same left-side yaw as plain 'left', but at their own door's Z offset — a real car's own front and rear seats sit at different points along the cabin, not both dead-center", () => {
    const front = DecorSystem.occupantView(vehicle({ witnessSide: "front-left", headingDeg: 0 }))
    const rear = DecorSystem.occupantView(vehicle({ witnessSide: "behind-left", headingDeg: 0 }))
    expect(front.headingDeg).toBe(rear.headingDeg) // same side, same yaw looking out
    expect(front.z).toBeLessThan(0)
    expect(rear.z).toBeGreaterThan(0)
    expect(front.x).toBe(rear.x) // same inset from the left door
  })
})

describe("DecorSystem stated size", () => {
  it("measures a primitive's own natural size off its geometry rather than a table beside it", () => {
    const car = DecorSystem.naturalSize("vehicle")
    // Measured, not declared — which is the point: the widest part of buildVehicle's own primitive
    // is not its 1.8 m body but its WHEELS, seated at x=+-0.95 and 0.3 m thick along X once tipped
    // onto their side, so they stand 0.2 m proud of the body on each flank.
    expect(car.widthM).toBeCloseTo(2.2, 3)
    // Likewise the length: the 4.2 m body plus the headlight spheres bulging 0.15 past its nose.
    expect(car.lengthM).toBeCloseTo(4.35, 3)
    expect(car.heightM).toBeCloseTo(2.0, 3) // cabin centre 1.7 + half its 0.6 height
  })

  it("grows a building's natural height by one storey per floor", () => {
    const two = DecorSystem.naturalSize("building", 2)
    const three = DecorSystem.naturalSize("building", 3)
    expect(three.heightM - two.heightM).toBeCloseTo(3, 5)
  })

  it("draws an object at the size the recording measured, not the primitive's own", () => {
    // Zamora's Pontiac is 5.4 m long, not the 4.2 every vehicle used to be.
    const group = DecorSystem.build(vehicle({ sizeM: { widthM: 2.0, lengthM: 5.4, heightM: 1.5 } }), false)
    const box = new Box3().setFromObject(group)
    expect(box.max.x - box.min.x).toBeCloseTo(2.0, 3)
    expect(box.max.z - box.min.z).toBeCloseTo(5.4, 3)
    expect(box.max.y - box.min.y).toBeCloseTo(1.5, 3)
  })

  it("leaves an object that states no size exactly where it always was", () => {
    const stated = new Box3().setFromObject(DecorSystem.build(building({ sizeM: DecorSystem.naturalSize("building", 2) }), false))
    const silent = new Box3().setFromObject(DecorSystem.build(building(), false))
    expect(stated.min.toArray()).toEqual(silent.min.toArray().map(v => expect.closeTo(v, 6)))
    expect(stated.max.toArray()).toEqual(silent.max.toArray().map(v => expect.closeTo(v, 6)))
  })

  it("keeps the built-in shape's own proportion on an axis nobody measured", () => {
    // Pacing out the length of a shed and not its width states ONE number. The other two axes are
    // not "the same as the length" and not zero: they are unmeasured, and the shape keeps what it
    // always drew there.
    const natural = DecorSystem.naturalSize("vehicle")
    const box = new Box3().setFromObject(DecorSystem.build(vehicle({ sizeM: { lengthM: 5.44 } }), false))
    expect(box.max.z - box.min.z).toBeCloseTo(5.44, 3)
    expect(box.max.x - box.min.x).toBeCloseTo(natural.widthM, 3)
    expect(box.max.y - box.min.y).toBeCloseTo(natural.heightM, 3)
  })

  it("keeps a stated-size object standing ON the ground rather than floating over it", () => {
    const box = new Box3().setFromObject(DecorSystem.build(building({ sizeM: { widthM: 3, lengthM: 4, heightM: 2.4 } }), false))
    expect(box.min.y).toBeCloseTo(0, 6)
  })

  it("moves the seat with the body, so a witness inside a longer car still looks out of it", () => {
    const natural = DecorSystem.naturalSize("vehicle")
    const plain = DecorSystem.occupantView(vehicle({ witnessSide: "front-left" }))
    const longer = DecorSystem.occupantView(
      vehicle({ witnessSide: "front-left", sizeM: { ...natural, lengthM: natural.lengthM * 2 } })
    )
    expect(longer.z).toBeCloseTo(plain.z * 2, 6)
    expect(longer.x).toBeCloseTo(plain.x, 6)
  })

  it("keeps a declared lamp its own real size and at its own real offset, whatever the body is stretched to", () => {
    const light = { id: "beacon", offsetM: { x: 0, y: 3, z: -2 }, color: "#ff0000", pattern: { kind: "steady" } as const }
    const group = DecorSystem.build(
      vehicle({ lights: [light], sizeM: { widthM: 6, lengthM: 12, heightM: 4 } }),
      false
    )
    // DecorLight.offsetM is already in meters on the real object; scaling it with the body would
    // walk a wingtip strobe off the wingtip.
    const lamp = group.children.find(child => (child.userData as { lightId?: string }).lightId === "beacon")
    expect(lamp?.position.toArray()).toEqual([0, 3, -2])
    expect(lamp?.scale.toArray()).toEqual([1, 1, 1])
  })
})

describe("DecorSystem.usesModel", () => {
  const model = { id: "some-model" }

  it("uses the model an object names", () => {
    expect(DecorSystem.usesModel(vehicle({ model }))).toBe(true)
  })

  it("does not, while the witness is inside the object", () => {
    // A downloaded model is a hull. From inside one, with front-facing materials, you see straight
    // through it and the object simply is not there — where what the recording placed the witness
    // to look at is the room the built-in shape builds around them, window openings and all.
    expect(DecorSystem.usesModel(vehicle({ model, witnessSide: "front-left" }))).toBe(false)
    expect(DecorSystem.usesModel(building({ model, witnessSide: "front" }))).toBe(false)
  })

  it("still does for a kind nobody can be inside of, whatever witnessSide says", () => {
    const tree: DecorObject = { id: "t", kind: "tree", eastM: 0, northM: 0, model, witnessSide: "front" }
    expect(DecorSystem.usesModel(tree)).toBe(true)
  })
})

describe("DecorSystem.applyModel", () => {
  /** A stand-in for a loaded glTF scene: a 2 x 1 x 4 box whose base sits at y=0, offset away from
   * the origin the way an exported model usually is. */
  function loadedModel(): Object3D {
    const mesh = new Mesh(new BoxGeometry(2, 1, 4))
    mesh.position.set(10, 0.5, -20)
    const scene = new Group()
    scene.add(mesh)
    return scene
  }

  it("scales the model uniformly to the stated LENGTH, keeping its own proportions", () => {
    const object = vehicle({ sizeM: { widthM: 3, lengthM: 8, heightM: 9 } })
    const group = DecorSystem.build(object, false)
    DecorSystem.applyModel(group, object, loadedModel())
    const box = new Box3().setFromObject(group)
    expect(box.max.z - box.min.z).toBeCloseTo(8, 5)
    // Uniform: the model is 2 wide and 1 tall for 4 of length, so doubling its length doubles
    // those too — it does NOT stretch to the stated 3 wide and 9 tall. A model whose proportions
    // disagree with the measurement is the wrong model, not something to squash into shape.
    expect(box.max.x - box.min.x).toBeCloseTo(4, 5)
    expect(box.max.y - box.min.y).toBeCloseTo(2, 5)
  })

  it("stands the model on the ground and centres it on its own axis, wherever the file put it", () => {
    const object = vehicle({ sizeM: { widthM: 2, lengthM: 4, heightM: 1 } })
    const group = DecorSystem.build(object, false)
    DecorSystem.applyModel(group, object, loadedModel())
    const box = new Box3().setFromObject(group)
    expect(box.min.y).toBeCloseTo(0, 5)
    expect((box.min.x + box.max.x) / 2).toBeCloseTo(0, 5)
    expect((box.min.z + box.max.z) / 2).toBeCloseTo(0, 5)
  })

  it("centres an aircraft vertically instead, because its height is its altitude and not the ground", () => {
    const object: DecorObject = { id: "a", kind: "aircraft", eastM: 0, northM: 0, sizeM: { widthM: 30, lengthM: 40, heightM: 8 } }
    const group = DecorSystem.build(object, false)
    DecorSystem.applyModel(group, object, loadedModel())
    const box = new Box3().setFromObject(group)
    expect((box.min.y + box.max.y) / 2).toBeCloseTo(0, 5)
  })

  it("fits to whichever axis the recording measured, not always the length", () => {
    // A witness who gave only the height of a lamp post measured the thing about it that matters.
    const object: DecorObject = { id: "l", kind: "streetlight", eastM: 0, northM: 0, sizeM: { heightM: 4.5 } }
    const group = DecorSystem.build(object, false)
    DecorSystem.applyModel(group, object, loadedModel())
    const box = new Box3().setFromObject(group)
    expect(box.max.y - box.min.y).toBeCloseTo(4.5, 5)
    expect(box.max.z - box.min.z).toBeCloseTo(4.5 * 4, 5) // the model's own 1:4 height:length kept
  })

  it("falls back to what the catalogue says the real thing measures, since a model file is in whatever unit its author worked in", () => {
    // Kenney's kits export a car as 2.9 UNITS long, not 2.9 metres. With nothing to fit to, an
    // unmeasured object would come out at an arbitrary scale that looks like a claim and is not one.
    const object = vehicle()
    const group = DecorSystem.build(object, false)
    DecorSystem.applyModel(group, object, loadedModel(), { depictedSizeM: { lengthM: 4.6 } })
    const box = new Box3().setFromObject(group)
    expect(box.max.z - box.min.z).toBeCloseTo(4.6, 5)
  })

  it("lets the recording's own measurement outrank the catalogue's", () => {
    const object = vehicle({ sizeM: { lengthM: 5.44 } })
    const group = DecorSystem.build(object, false)
    DecorSystem.applyModel(group, object, loadedModel(), { depictedSizeM: { lengthM: 4.6 } })
    const box = new Box3().setFromObject(group)
    expect(box.max.z - box.min.z).toBeCloseTo(5.44, 5)
  })

  it("turns the model by its own heading correction, on top of nothing else the object already carries", () => {
    const object = vehicle({ headingDeg: 90, sizeM: { widthM: 2, lengthM: 4, heightM: 1 } })
    const group = DecorSystem.build(object, false)
    DecorSystem.applyModel(group, object, loadedModel(), { headingOffsetDeg: 90 })
    // The object's own 90deg is on the outer group and the model's correction inside it, so a model
    // exported nose-right ends up facing the same way the primitive did — the two rotations must
    // never be added into one number a reader can only see half of.
    expect(group.rotation.y).toBeCloseTo((-90 * Math.PI) / 180, 6)
    const body = DecorSystem.bodyOf(group)
    expect((body.children[0] as Object3D).rotation.y).toBeCloseTo((-90 * Math.PI) / 180, 6)
  })

  it("replaces the built-in shape rather than hiding it behind the model", () => {
    const object = vehicle()
    const group = DecorSystem.build(object, false)
    const primitive = DecorSystem.bodyOf(group)
    DecorSystem.applyModel(group, object, loadedModel())
    expect(primitive.parent).toBeNull()
    expect(DecorSystem.bodyOf(group)).not.toBe(primitive)
  })

  it("makes the loaded model cast and receive shadows, which a glTF never says on its own", () => {
    // three.js defaults both to false and a file has no way to say otherwise, so a model was the
    // one thing in the scene throwing no shadow — a car in a low sun with nothing on the ground
    // beside it, which is exactly how a pasted-on object looks.
    const object = vehicle()
    const group = DecorSystem.build(object, false)
    DecorSystem.applyModel(group, object, loadedModel())
    const meshes: Mesh[] = []
    DecorSystem.bodyOf(group).traverse(child => {
      if (child instanceof Mesh) meshes.push(child)
    })
    expect(meshes.length).toBeGreaterThan(0)
    expect(meshes.every(mesh => mesh.castShadow && mesh.receiveShadow)).toBe(true)
  })

  it("leaves the object's lamps alone — they belong to the object, not to whatever draws its body", () => {
    const light = { id: "beacon", offsetM: { x: 0, y: 3, z: -2 }, color: "#ff0000", pattern: { kind: "steady" } as const }
    const object = vehicle({ lights: [light] })
    const group = DecorSystem.build(object, false)
    DecorSystem.applyModel(group, object, loadedModel())
    const lamp = group.children.find(child => (child.userData as { lightId?: string }).lightId === "beacon")
    expect(lamp?.position.toArray()).toEqual([0, 3, -2])
  })
})
