import { Material, MeshStandardMaterial, Object3D, PMREMGenerator, Scene, ShaderChunk, Texture, Vector3, WebGLRenderer } from "three"
import { ReflectionProbe } from "./ReflectionProbe.js"
import { GlassMaterial } from "./GlassMaterial.js"

/** A body of an interpretation, as the reflections need it: where it stands, and what to hide. */
export interface Reflector {
  id: string
  holder: Object3D
  /** Whether anything of it is smooth enough for a reflection to show a SHAPE — glass, a polish, a
   * metal. A matt body mirrors only a blur that the eye's own probe gives as well as its own would,
   * and is not worth six renders of the scene. */
  shiny: boolean
}

/**
 * The reflections of the scene: one probe at the witness's eye for the decor, and one at the centre
 * of each body of the interpretation (see ReflectionProbe).
 *
 * EVERYTHING REFLECTS. A share of the light that meets any surface leaves at the mirror angle, by
 * Fresnel's law — a few per cent head-on for paint, stone or glass, most of it at grazing incidence,
 * nearly all of it from a metal, in the metal's colour — and the rougher the surface, the more that
 * mirror image is blurred. three.js works that out for its physical materials if it is handed
 * something to mirror; it is handed the probe's photograph, filtered for every roughness, per
 * material. Not as the scene's environment: three hands that to its Lambert materials too — the
 * ground, the relief, the roads, the decor's own shapes — whose colour it then MULTIPLIES by the
 * environment's. And the specular part only: an environment also lights a surface diffusely, which
 * the hemisphere light built from the same sky already does, so three's line that adds it is taken
 * out rather than counted twice. Glass is the far end of it and mirrors the sharp photograph itself
 * (GlassMaterial).
 *
 * WHEN: a probe is six renders of the scene, so one probe is photographed a frame, the stalest, and
 * none twice in REFRESH_MS — a quarter of a second behind at worst, and nothing at all while the
 * scene is still. A street lamp's own glint on a shiny surface does not wait for it: the lamp is a
 * light of the scene, and three draws its highlight at every frame.
 */
export class Reflections {
  /** How long a probe's photograph is good for while the scene moves. */
  static readonly REFRESH_MS = 250

  private readonly generator: PMREMGenerator
  private readonly eye: ReflectionProbe
  private readonly probes = new Map<string, ReflectionProbe>()

  constructor(renderer: WebGLRenderer) {
    Reflections.install()
    this.generator = new PMREMGenerator(renderer)
    this.eye = new ReflectionProbe(this.generator)
  }

  /** What the decor mirrors: the eye's probe, once it has been taken. */
  static decor?: Texture

  /**
   * Photographs the stalest probe that has not yet seen the scene as it is now (`version`, see
   * SceneRenderer.render), if its REFRESH_MS are up.
   *
   * @param screenOnly What is drawn with the scene but belongs to the screen (the compass, the lens
   *   flare), hidden from every probe.
   * @returns In how many ms another probe will be due, if one is still waiting for this version of
   *   the scene — the caller asks for a frame then, since a still scene asks for none — or
   *   undefined once every probe has seen it.
   */
  refresh(renderer: WebGLRenderer, scene: Scene, eye: Vector3, reflectors: readonly Reflector[], screenOnly: readonly Object3D[],
    decor: readonly Object3D[], version: number): number | undefined {
    for (const id of [...this.probes.keys()]) {
      if (reflectors.some(reflector => reflector.id === id && reflector.shiny)) continue
      this.probes.get(id)!.dispose()
      this.probes.delete(id)
    }
    const all: { probe: ReflectionProbe, reflector?: Reflector }[] = [{ probe: this.eye }]
    for (const reflector of reflectors) {
      if (!reflector.shiny) continue
      let probe = this.probes.get(reflector.id)
      if (!probe) {
        probe = new ReflectionProbe(this.generator)
        this.probes.set(reflector.id, probe)
      }
      all.push({ probe, reflector })
    }
    const now = performance.now()
    const behind = () => all.filter(({ probe }) => probe.capturedVersion !== version)
    const ready = behind().filter(({ probe }) => now - probe.capturedAtMs >= Reflections.REFRESH_MS)
    if (ready.length > 0) {
      const stalest = ready.reduce((a, b) => (b.probe.capturedAtMs < a.probe.capturedAtMs ? b : a))
      if (stalest.reflector) {
        const position = stalest.reflector.holder.getWorldPosition(this.scratch)
        stalest.probe.capture(renderer, scene, position, [stalest.reflector.holder, ...screenOnly])
        Reflections.reflectOn(stalest.reflector.holder, stalest.probe)
      } else {
        stalest.probe.capture(renderer, scene, eye, screenOnly)
        Reflections.decor = stalest.probe.filtered
        for (const object of decor) Reflections.reflectOn(object, stalest.probe)
        for (const reflector of reflectors) if (!reflector.shiny) Reflections.reflectOn(reflector.holder, stalest.probe)
      }
      stalest.probe.capturedVersion = version
    }
    const waiting = behind()
    if (waiting.length === 0) return undefined
    return Math.max(16, Math.min(...waiting.map(({ probe }) => Reflections.REFRESH_MS - (now - probe.capturedAtMs))))
  }

  private readonly scratch = new Vector3()

  /** Hands a probe's photographs to every material under `object`: the sharp one to glass, the
   * filtered one to every physical material. */
  static reflectOn(object: Object3D, probe: { sharp?: Texture, filtered?: Texture } = { filtered: Reflections.decor }): void {
    object.traverse(child => {
      const material = (child as { material?: Material | Material[] }).material
      for (const each of Array.isArray(material) ? material : material ? [material] : []) {
        if (each instanceof GlassMaterial) {
          if (probe.sharp) each.setSurroundings(probe.sharp)
        } else if (each instanceof MeshStandardMaterial && probe.filtered && each.envMap !== probe.filtered) {
          each.envMap = probe.filtered
          each.needsUpdate = true
        }
      }
    })
  }

  dispose(): void {
    this.eye.dispose()
    for (const probe of this.probes.values()) probe.dispose()
    this.generator.dispose()
  }

  private static installed = false

  /** Takes the diffuse part out of what a physical material's environment gives it — see the class
   * comment. Once for the page: three's chunks are global. */
  private static install(): void {
    if (Reflections.installed) return
    Reflections.installed = true
    const diffuse = "iblIrradiance += getIBLIrradiance( geometryNormal );"
    if (!ShaderChunk.lights_fragment_maps.includes(diffuse)) {
      console.warn("Reflections: three's lights_fragment_maps changed; the environment will light diffusely too")
      return
    }
    ShaderChunk.lights_fragment_maps = ShaderChunk.lights_fragment_maps.replace(diffuse,
      "// The sky's diffuse light is the hemisphere light's (see Reflections).")
  }
}
