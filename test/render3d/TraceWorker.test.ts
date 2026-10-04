import { describe, expect, it } from "vitest"
import { MilkyWay } from "../../src/engine/astronomy/MilkyWay.js"
import { ZodiacalLight } from "../../src/engine/astronomy/ZodiacalLight.js"
import { HaloSky } from "../../src/engine/atmosphere/HaloSky.js"
import { GlowTexels } from "../../src/render3d/GlowTexels.js"
import { HaloTexels } from "../../src/render3d/HaloTexels.js"
import { TraceWorker, type TraceRequest, type TraceResult, type TraceWorkerScope } from "../../src/render3d/TraceWorker.js"

/** What the worker answers must be what the page would have worked out itself, to the bit: the same
 * texels, whichever thread did the walk. */
describe("TraceWorker", () => {
  const scope = () => {
    const answers: TraceResult[] = []
    const port: TraceWorkerScope = {
      onmessage: null,
      postMessage: message => { answers.push(message) }
    }
    new TraceWorker(port)
    const send = (request: TraceRequest) => port.onmessage!({ data: request } as MessageEvent<TraceRequest>)
    const answered = async (id: number) => {
      for (let waited = 0; waited < 60_000; waited += 20) {
        const found = answers.find(answer => answer.id === id)
        if (found) return found
        await new Promise(resolve => setTimeout(resolve, 20))
      }
      throw new Error("no answer")
    }
    return { send, answered, answers }
  }

  it("walks the glow maps to the same texels as the page does", async () => {
    const { send, answered } = scope()
    send({ type: "glow", id: 1 })
    const result = await answered(1) as { milkyWay: Uint16Array, zodiacal: Uint16Array }
    const galaxy = new MilkyWay()
    const dust = new ZodiacalLight()
    while (!(galaxy.done && dust.done)) { galaxy.walk(1); dust.walk(1) }
    const milkyWay = new Uint16Array(MilkyWay.LONGITUDE_STEPS * MilkyWay.LATITUDE_STEPS * 4)
    const zodiacal = new Uint16Array(ZodiacalLight.LONGITUDE_STEPS * ZodiacalLight.LATITUDE_STEPS * 4)
    GlowTexels.fromMap(galaxy.harvest(), milkyWay)
    GlowTexels.fromMap(dust.harvest(), zodiacal)
    expect(result.milkyWay).toEqual(milkyWay)
    expect(result.zodiacal).toEqual(zodiacal)
  }, 60_000)

  it("traces a halo display to the same texels as the page does, and says nothing of one called off", async () => {
    const { send, answered, answers } = scope()
    const rays = 150_000
    send({ type: "halo", id: 1, altitudeDeg: 22, alignment: 0.9, rays })
    send({ type: "halo", id: 2, altitudeDeg: 40, alignment: 0.5, rays })
    send({ type: "cancel", id: 2 })
    const result = await answered(1) as { texels: Uint16Array }
    const sky = new HaloSky()
    const expected = new Uint16Array(HaloSky.AZIMUTH_BINS * HaloSky.ALTITUDE_BINS * 4)
    HaloTexels.fromRadiance(sky.compute(22, 0.9, rays).data, expected)
    expect(result.texels).toEqual(expected)
    await new Promise(resolve => setTimeout(resolve, 200))
    expect(answers.map(answer => answer.id)).toEqual([1])
  }, 60_000)
})
