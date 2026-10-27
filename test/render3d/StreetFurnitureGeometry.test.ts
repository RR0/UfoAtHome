import { describe, expect, it } from "vitest"
import { Box3, Mesh, Vector3 } from "three"
import { StreetFurnitureGeometry } from "../../src/render3d/StreetFurnitureGeometry.js"
import { DecorSystem } from "../../src/render3d/DecorSystem.js"
import { SurveyedDecor } from "../../src/render3d/terrain/SurveyedDecor.js"
import { TrafficSignals } from "../../src/engine/model/LightRig.js"

const meshes = (group: ReturnType<typeof StreetFurnitureGeometry.crossing>) => group.children.filter(child => (child as Mesh).isMesh) as Mesh[]

describe("StreetFurnitureGeometry", () => {
  it("lays half-metre bands half a metre apart across the road, clear of its kerbs, along it", () => {
    const [mesh] = meshes(StreetFurnitureGeometry.crossing(6, 2.5))
    // 5.5 m between the kerbs' clearances: six bands and their five gaps fill it.
    expect(mesh.geometry.getAttribute("position").count).toBe(6 * 6)
    const box = new Box3().setFromObject(mesh)
    expect(box.max.x - box.min.x).toBeCloseTo(5.5)
    expect(box.max.z - box.min.z).toBeCloseTo(2.5)
  })

  it("shows a pedestrian's lenses as a figure standing in the red and walking in the green, the lens tall, looking toward the front", () => {
    const [red, green] = TrafficSignals.pedestrianLights(0)
    expect([TrafficSignals.figureOf(red), TrafficSignals.figureOf(green)]).toEqual(["standing", "walking"])
    for (const light of TrafficSignals.vehicleLights(0)) expect(TrafficSignals.figureOf(light)).toBeUndefined()
    for (const figure of ["standing", "walking"] as const) {
      const geometry = StreetFurnitureGeometry.pedestrianFigure(figure, 0.18)
      geometry.computeBoundingBox()
      expect(geometry.boundingBox!.max.y - geometry.boundingBox!.min.y).toBeCloseTo(0.18 * 0.98, 2)
      expect(geometry.getAttribute("normal").getZ(0)).toBeCloseTo(-1)
    }
  })

  it("drapes the bands on the ground under them", () => {
    const group = StreetFurnitureGeometry.crossing(6, 2.5)
    StreetFurnitureGeometry.drape(group, x => x * 0.1)
    const position = meshes(group)[0].geometry.getAttribute("position")
    for (let i = 0; i < position.count; i++) expect(position.getY(i)).toBeCloseTo(StreetFurnitureGeometry.CROSSING_LIFT_M + position.getX(i) * 0.1)
  })

  it("builds a traffic light, a crossing and a sign as one mesh each, around the lamps of the light", () => {
    for (const group of [StreetFurnitureGeometry.trafficLight(false), StreetFurnitureGeometry.trafficLight(true), StreetFurnitureGeometry.roadSign({ face: "stop" }), StreetFurnitureGeometry.roadSign(undefined)]) expect(meshes(group)).toHaveLength(1)
    const box = new Box3().setFromObject(StreetFurnitureGeometry.trafficLight(false))
    for (const light of TrafficSignals.vehicleLights(0)) {
      expect(light.offsetM.y).toBeGreaterThan(box.min.y)
      expect(light.offsetM.y).toBeLessThan(box.max.y)
    }
  })

  it("draws a traffic light's lamps the size of a lens, lit from its front and dark from behind", () => {
    const light = TrafficSignals.vehicleLights(0)[2]
    const lamp = new Vector3(light.offsetM.x, light.offsetM.y, light.offsetM.z)
    // In front is −z, where the object's heading points.
    expect(DecorSystem.beamShare(light.beamDeg!, lamp, new Vector3(0, light.offsetM.y, -50))).toBeCloseTo(1)
    const atBeam = new Vector3(50 * Math.sin(light.beamDeg! * Math.PI / 180), light.offsetM.y, light.offsetM.z - 50 * Math.cos(light.beamDeg! * Math.PI / 180))
    expect(DecorSystem.beamShare(light.beamDeg!, lamp, atBeam)).toBeCloseTo(0.5)
    expect(DecorSystem.beamShare(light.beamDeg!, lamp, new Vector3(0, light.offsetM.y, 50))).toBe(0)
    const group = DecorSystem.build({ id: "f", kind: "trafficlight", eastM: 0, northM: 0, lights: TrafficSignals.vehicleLights(0) }, false)
    const lamps: Mesh[] = []
    group.traverse(child => { if ((child as Mesh).isMesh && child.userData.lightId) lamps.push(child as Mesh) })
    expect(lamps).toHaveLength(3)
    const lens = new Box3().setFromObject(lamps[0])
    expect(lens.max.y - lens.min.y).toBeCloseTo(2 * TrafficSignals.LENS_RADIUS_M)
  })
})

describe("SurveyedDecor's street furniture", () => {
  it("plants the lights, the crossings and the signs a survey found, a light with its lamps in its phase", () => {
    const { planted } = SurveyedDecor.of("osm", {
      trees: [], buildings: [], bridges: [], lines: [],
      signals: [{ eastM: 1, northM: 2, headingDeg: 90, for: "vehicles", phase: 1 }, { eastM: 3, northM: 4, headingDeg: 0, for: "pedestrians", phase: 0 }],
      crossings: [{ eastM: 5, northM: 6, headingDeg: 45, widthM: 7 }],
      signs: [{ eastM: 7, northM: 8, headingDeg: 180, face: "speed-limit", code: "FR:B14[30]", value: 30 }],
      dates: { lamps: "2026-10-18" }
    }, { kept: [], kindName: kind => kind })
    expect(planted.map(object => object.kind)).toEqual(["trafficlight", "trafficlight", "crossing", "roadsign"])
    expect(planted[0].lights).toEqual(TrafficSignals.vehicleLights(1))
    expect(planted[1].lights).toEqual(TrafficSignals.pedestrianLights(0))
    expect(planted[2].sizeM).toEqual({ widthM: 7, lengthM: SurveyedDecor.CROSSING_LENGTH_M })
    expect(planted[3].sign).toEqual({ face: "speed-limit", code: "FR:B14[30]", value: 30 })
    expect(planted.every(object => object.surveyedOn === "2026-10-18" && object.origin === "osm")).toBe(true)
  })

  it("plants a supposed lamp as supposed, and a surveyed one as it was", () => {
    const { planted } = SurveyedDecor.of("osm", {
      trees: [], buildings: [], bridges: [], lines: [], lamps: [{ eastM: 1, northM: 2 }, { eastM: 3, northM: 4, supposed: true }]
    }, { kept: [], kindName: kind => kind })
    expect(planted.map(object => object.lamp?.supposed)).toEqual([undefined, true])
  })

  it("brings none of a kind the author already placed one of", () => {
    const { planted, handPlaced } = SurveyedDecor.of("osm", { trees: [], buildings: [], bridges: [], lines: [], crossings: [{ eastM: 5, northM: 6, headingDeg: 45, widthM: 7 }] },
      { kept: [{ id: "mine", kind: "crossing", eastM: 0, northM: 0 }], kindName: kind => kind })
    expect(planted).toEqual([])
    expect(handPlaced).toBe(true)
  })
})
