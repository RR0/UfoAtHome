import { describe, expect, it } from "vitest"
import { DirectionalLight, Group, PointLight, Vector3 } from "three"
import { EmitterLights } from "../../src/render3d/EmitterLights.js"

/** Every file of the renderer, by name, without loading any (see Vite's import.meta.glob). */
const render3d = Object.keys(import.meta.glob("../../src/render3d/*.ts")).map(file => file.split("/").pop()!)

describe("EmitterLights", () => {
  it("knows, for every system that draws, how its light reaches the scene", () => {
    // What gives out light lights what is round it, whatever it is: a system that draws something and says nothing of its light is how a
    // lantern let go from a terrace came to leave the terrace dark. A new system fails here until it says.
    const systems = render3d.filter(file => /(System|Effect|Field)\.ts$/.test(file)).map(file => file.replace(/\.ts$/, ""))
    const unsaid = systems.filter(system => !(system in EmitterLights.SYSTEMS))
    expect(unsaid).toEqual([])
    const gone = Object.keys(EmitterLights.SYSTEMS).filter(system => !systems.includes(system))
    expect(gone).toEqual([])
  })

  it("lights the near emitters that light the observer most, with their luminous intensity", () => {
    const scene = new Group()
    const lights = new EmitterLights(scene, () => 0.5)
    const eye = new Vector3()
    const far = Array.from({ length: EmitterLights.NEAR }, (_, i) => ({ position: new Vector3(0, 0, 100 + i), candela: 100, colour: [1, 1, 1] as const }))
    const near = { position: new Vector3(0, 2, 0), candela: 50, colour: [1, 0.5, 0] as const }
    lights.set("a", far)
    lights.set("b", [near])
    lights.cast(eye)
    const point = lights.all.filter((light): light is PointLight => light instanceof PointLight)
    expect(point).toHaveLength(EmitterLights.NEAR)
    // 50 cd at 2 m outshines 100 cd at 100 m: it is the one lit first, at its candela in the scene's units.
    expect(point[0].position.y).toBe(2)
    expect(point[0].intensity).toBeCloseTo(25, 9)
  })

  it("keeps what a source said until it says otherwise, and puts its lights out when it says nothing", () => {
    const scene = new Group()
    const lights = new EmitterLights(scene, () => 1)
    lights.set("lanterns", [{ position: new Vector3(0, 1, 0), candela: 10, colour: [1, 1, 1] }])
    lights.cast(new Vector3())
    // Drawn again with nothing new said: still lit.
    lights.cast(new Vector3())
    expect(Math.max(...lights.all.map(light => light.intensity))).toBeCloseTo(10, 9)
    lights.set("lanterns", [])
    lights.cast(new Vector3())
    expect(Math.max(...lights.all.map(light => light.intensity))).toBe(0)
    // Put out, not taken away: the scene keeps its number of lights.
    expect(scene.children.filter(child => child instanceof PointLight)).toHaveLength(EmitterLights.NEAR)
  })

  it("lights the ground from far emitters as the Moon does, from their direction, with their illuminance", () => {
    const scene = new Group()
    const lights = new EmitterLights(scene, () => 2)
    lights.set("meteors", [], [{ direction: new Vector3(0, 1, 0), lux: [0.01, 0.01, 0.01], sky: { altitudeDeg: 90, azimuthDeg: 0, magnitude: -12 } }])
    lights.cast(new Vector3())
    const directional = lights.all.filter((light): light is DirectionalLight => light instanceof DirectionalLight)
    expect(directional).toHaveLength(EmitterLights.FAR)
    expect(directional[0].intensity).toBeCloseTo(0.02, 9)
    expect(directional[0].position.y).toBeGreaterThan(0)
  })

  it("lights the sky with the brightest far emitter, when it is bright enough to", () => {
    const lights = new EmitterLights(new Group(), () => 1)
    const far = (magnitude: number) => ({ direction: new Vector3(0, 1, 0), lux: [1, 1, 1] as const, sky: { altitudeDeg: 40, azimuthDeg: 220, magnitude } })
    lights.set("meteors", [], [far(-3)])
    // A shower's meteor lights nothing of the sky an eye could see.
    expect(lights.brightestInSky).toBeUndefined()
    lights.set("reentries", [], [far(-20), far(-29)])
    expect(lights.brightestInSky?.magnitude).toBe(-29)
    lights.set("reentries", [])
    expect(lights.brightestInSky).toBeUndefined()
  })
})
