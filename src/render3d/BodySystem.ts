import {
  Box3, BoxGeometry, BufferGeometry, Color, ConeGeometry, CylinderGeometry, Group, LatheGeometry, Mesh,
  MeshPhysicalMaterial, MeshStandardMaterial, Object3D, Quaternion, SphereGeometry, TorusGeometry, Vector2, Vector3
} from "three"
import type { BodyState } from "../engine/interpretation/BodyPlacement.js"
import { BODY_PRIMITIVES } from "../engine/interpretation/Interpretation.js"
import type { BodyPrimitive } from "../engine/interpretation/Interpretation.js"
import type { DecorModelRef } from "../engine/model/Decor.js"
import { FlameEffect } from "./FlameEffect.js"
import { DecorSystem } from "./DecorSystem.js"
import type { DecorObject } from "../engine/model/Decor.js"
import { GroundPlume } from "./GroundPlume.js"
import { Photometry } from "./Photometry.js"
import { Veil } from "./Veil.js"
import { GlassMaterial } from "./GlassMaterial.js"
import type { Reflector } from "./Reflections.js"
import type { LuminanceDisplay } from "./Photometry.js"
export type { LuminanceDisplay } from "./Photometry.js"
import type { SmokeSource } from "../engine/interpretation/Interpretation.js"

const DEG_TO_RAD = Math.PI / 180

/** Loads the glTF scene a model reference names, with the credit it must be shown with — or nothing,
 * when it cannot be had. Supplied by the renderer, which already resolves the decor's. */
export type BodyModelLoader = (ref: DecorModelRef) => Promise<{ scene: Object3D, credit: unknown, headingOffsetDeg?: number } | undefined>


/** A material of a loaded model that glows of itself: what a body's stated luminance sets the
 * brightness of (see BodyAppearance.luminanceCdM2). */
interface Glow {
  material: MeshStandardMaterial
  /** The colour the model gave it, which is read for its hue alone. */
  hue: readonly [number, number, number]
  /**
   * How bright it is beside the brightest thing this model says glows, 0-1 — and so what share of
   * the ONE luminance the recording states is its own. A model saying its windows are lit and its
   * hull faintly aglow keeps saying it: the recording states the windows' luminance, and the hull
   * burns at its own fraction of it.
   */
  share: number
}

/** Where the frame bodies are placed in stands in the scene: its origin's position, and the ground
 * height there that the bodies' own heights are counted from (see BodyPlacement.Ground). */
export interface BodyFrame {
  originX: number
  originZ: number
  originGroundY: number
  /** Where the eye is, for what depends on how far away a body is (a flame's glare). */
  eye?: Vector3
  /** The ground's height at a point of the scene — where a flame's dust rises from. */
  groundYAt?: (x: number, z: number) => number
  /** The wind, m/s along the scene's x (east) and z (south) — what carries dust and smoke. */
  wind?: { x: number, z: number }
  /** What the scene's lights make of a white matt surface, linear — what dust and smoke, which
   * are not lit by the scene's own shading, are multiplied by (see SceneRenderer.plumeLight). */
  light?: readonly [number, number, number]
  /** How much of a light at a point of the scene reaches the eye, per channel — the air between
   * (see AerialFog). What draws itself additively, outside the fog, is dimmed by it here: a flame
   * and a glare take their airlight from what is already behind them, and need only lose theirs. */
  transmittance?: (x: number, y: number, z: number) => readonly [number, number, number]
}

/**
 * The bodies of an interpretation, standing in the scene — see InterpretationJson.
 *
 * Unlike the testimony's phenomena (PhenomenonSystem), these are real objects of the scene: they
 * are drawn in the main pass, lit by the sun, casting shadows and receiving them, and hidden by
 * whatever stands in front of them, the ground included. That is the point of them. A plane facing
 * the witness asserts nothing about what is behind it; a body in metres asserts everything, and the
 * scene gets to say what follows.
 *
 * Every body is built at one metre in each direction and stretched to its size each frame, so a
 * body whose size changes along its track is the same mesh throughout. A model is fitted into that
 * same metre (see fit), and so obeys the size stated like a primitive does.
 *
 * Axes: across is +X, up is +Y and forward is -Z, as for the decor; heading turns about Y clockwise
 * from north, pitch raises the nose, roll lowers the right side.
 */
export class BodySystem {
  readonly group = new Group()
  private readonly built = new Map<string, { holder: Group, signature: string, material?: MeshStandardMaterial, glowing?: Glow[] }>()
  /** Bumped whenever the set of bodies is replaced, so a model arriving for a previous one is
   * dropped. */
  private token = 0
  private readonly credits = new Map<string, unknown>()
  /** The flames being thrown, by body id — see BodyFlame. */
  private readonly flames = new Map<string, FlameEffect>()
  /** The bloom round each body that gives out light of its own — see BodyAppearance.luminanceCdM2. */
  private readonly glares = new Map<string, Veil>()
  /** The dust each flame raises, by body id. */
  private readonly dust = new Map<string, GroundPlume>()
  /** The smoke of what burns on the ground, one plume per source. */
  private smoke: GroundPlume[] = []
  private readonly scratch = new Vector3()
  /** Which way a flame's node points, and the direction it was read from, reused frame after frame. */
  private readonly aim = new Quaternion()
  private readonly down = new Vector3()
  /** The frame of the last `set` — what turns the scene's coordinates back into the bodies' own. */
  private frame?: BodyFrame

  /**
   * @param sceneUnitsPerLux What a lux of illuminance is in this scene's own light units — how the
   *   luminous intensity of a flame becomes a light of the same scene as the sun's (see throwFlame).
   */
  constructor(private readonly loadModel: BodyModelLoader, private readonly onModelArrived: () => void, private readonly sceneUnitsPerLux: () => number = () => 0) {
    this.group.name = "bodies"
  }

  /** The credits of every model on show — beside the decor's in the info panel. */
  get modelCredits(): unknown[] {
    return [...this.credits.values()]
  }

  /**
   * Stands every body where its state says, lights the flames they throw at `seconds` into the
   * recording, as bright as `display` says, and builds what is new.
   *
   * `ids` are ALL the bodies of the interpretation, including those that do not exist at this
   * instant (before their first keyframe): those are hidden, not taken down, so that a body whose
   * model took a second to arrive does not fetch and build it again every time the playhead crosses
   * the instant it appears. Only a body the interpretation no longer has is removed.
   */
  set(states: BodyState[], frame: BodyFrame, seconds = 0, display?: LuminanceDisplay, ids: readonly string[] = states.map(state => state.id)): void {
    this.frame = frame
    const seen = new Set<string>()
    for (const state of states) {
      seen.add(state.id)
      const signature = BodySystem.signatureOf(state.model)
      let entry = this.built.get(state.id)
      if (!entry || entry.signature !== signature) {
        if (entry) this.remove(state.id)
        entry = this.build(state)
        this.built.set(state.id, entry)
        this.group.add(entry.holder)
      }
      const { holder, material, glowing } = entry
      holder.visible = true
      holder.position.set(frame.originX + state.eastM, frame.originGroundY + state.upM, frame.originZ - state.northM)
      holder.rotation.set(state.attitude.pitchDeg * DEG_TO_RAD, -state.attitude.headingDeg * DEG_TO_RAD, -state.attitude.rollDeg * DEG_TO_RAD, "YXZ")
      holder.scale.set(state.sizeM.widthM, state.sizeM.heightM, state.sizeM.lengthM)
      if (material) BodySystem.paint(material, state, display)
      if (glowing) BodySystem.light(glowing, state, display)
      this.shine(state, holder, glowing, display, frame.eye)
      this.throwFlame(state, holder, seconds, display, frame.eye)
    }
    const kept = new Set(ids)
    for (const [id, { holder }] of [...this.built]) {
      if (seen.has(id)) continue
      if (kept.has(id)) {
        holder.visible = false
        this.flames.get(id)?.putOut()
        this.glares.get(id)?.hide()
      } else {
        this.remove(id)
      }
    }
  }

  /**
   * The bloom round a body that gives out light of its own, or none.
   *
   * The same glare a flame wears, and for the same reason: what reaches an eye from something
   * bright is its glare as much as its outline, and a sphere as bright as the Sun with a hard edge
   * and nothing around it does not read as bright at all, it reads as a white disc.
   *
   * How far it reaches is what says HOW bright, because the screen cannot: past a certain luminance
   * every colour is already at the top of the scale and a brighter thing cannot be painted brighter,
   * only wider. So the bloom runs from about the body's own size, where what it gives out barely
   * tells against the sky, out to the width that carries its whole light at the cap, where it is
   * all the eye has left — which is what a witness means by "we could not look at it".
   */
  private shine(state: BodyState, holder: Group, glowing: Glow[] | undefined, display: LuminanceDisplay | undefined, eye: Vector3 | undefined): void {
    const luminanceCdM2 = state.appearance.luminanceCdM2
    let veil = this.glares.get(state.id)
    // Only a body that glows WHOLE throws a veil from its middle. A model whose windows alone are
    // lit would wear one at the centre of its hull, where nothing glows: its parts are too small to
    // matter at the distances they are seen from.
    if (!(luminanceCdM2 > 0) || !eye || (glowing && glowing.length > 0)) {
      veil?.hide()
      return
    }
    if (!veil) {
      veil = new Veil(`body-veil:${state.id}`)
      this.glares.set(state.id, veil)
      this.group.add(veil.mesh)
    }
    // The veiling glare in the eye (see Veil): what the body sends, its luminance over the solid
    // angle it fills, as an illuminance at the eye — held over the body's own disc, which is drawn
    // for itself at its luminance. It used to be a bloom whose width grew with how close to white
    // the body was, and in light that bloom was a white ball several times the body's size.
    const radiusM = Math.max(state.sizeM.widthM, state.sizeM.heightM) / 2
    const distanceM = Math.max(holder.position.distanceTo(eye), radiusM * 1.01)
    const angularRadius = Math.asin(radiusM / distanceM)
    const solidAngle = 2 * Math.PI * (1 - Math.cos(angularRadius))
    // A model's own brightest glowing part says what colour the veil is; a primitive's own colour does.
    const hue = glowing?.find(glow => glow.share >= 1)?.hue ?? BodySystem.rgbOf(state.appearance.color)
    const light = this.throughAir(BodySystem.shown(hue, luminanceCdM2, display), holder.position)
    veil.shine(holder.position, [light[0] * solidAngle, light[1] * solidAngle, light[2] * solidAngle], (angularRadius * 180) / Math.PI)
  }


  /**
   * Draws as glass whatever a model says transmits light (KHR_materials_transmission, which three
   * reads into a MeshPhysicalMaterial's `transmission`) — see GlassMaterial on why not three's own.
   * Glass that thin casts next to no shadow, so it casts none.
   */
  private static glaze(scene: Object3D): void {
    scene.traverse(child => {
      if (!(child instanceof Mesh)) return
      const material = child.material
      if (!(material instanceof MeshPhysicalMaterial) || !(material.transmission > 0)) return
      child.material = new GlassMaterial(material.ior)
      material.dispose()
      child.castShadow = false
    })
  }

  /** A colour a light at `at` gives out, as it arrives at the eye through the air. */
  private throughAir(rgb: readonly [number, number, number], at: Vector3): [number, number, number] {
    const transmittance = this.frame?.transmittance?.(at.x, at.y, at.z) ?? [1, 1, 1]
    return [rgb[0] * transmittance[0], rgb[1] * transmittance[1], rgb[2] * transmittance[2]]
  }

  private static rgbOf(css: string): [number, number, number] {
    const colour = new Color(css)
    return [colour.r, colour.g, colour.b]
  }

  /**
   * Puts a body's flame on the node its model names for it, pointing the way the body points — or
   * puts it out. Not a child of the body: the body is stretched to its size axis by axis, and a
   * flame stated in metres must not be stretched with it.
   */
  private throwFlame(state: BodyState, holder: Group, seconds: number, display: LuminanceDisplay | undefined, eye: Vector3 | undefined): void {
    let effect = this.flames.get(state.id)
    if (!effect && state.throwsFlame) {
      effect = new FlameEffect()
      this.flames.set(state.id, effect)
      this.group.add(effect.mesh, effect.light, effect.glow)
    }
    if (!effect) return
    const flame = state.flame
    if (!flame) {
      effect.putOut()
      this.dust.get(state.id)?.set(0, 0, 0, seconds, { x: 0, z: 0 }, 0)
      return
    }
    holder.updateMatrixWorld(true)
    const node = holder.getObjectByName(flame.node ?? BodySystem.EXHAUST_NODE)
    if (node) node.getWorldPosition(this.scratch)
    else holder.localToWorld(this.scratch.set(0, -0.5, 0))
    // A flame leaves its node the way that node points: a model whose exhaust faces astern throws
    // its flame astern, where one that says nothing throws it down the body, as an underside does.
    // Taken as the direction the node's own down comes out at rather than as its rotation, because
    // a body stretched to a size its model was not built at has no rotation to read.
    effect.place(this.scratch, node ? BodySystem.pointing(node, this.down, this.aim) : holder.quaternion, flame.lengthM, flame.widthM)
    const light = (css: string): readonly [number, number, number] => {
      const colour = new Color(css)
      return this.throughAir(BodySystem.shown([colour.r, colour.g, colour.b], flame.luminanceCdM2, display), this.scratch)
    }
    effect.set(light(flame.color), light(flame.tipColor ?? flame.color), seconds)
    effect.illuminate(BodySystem.luminousIntensityCd(flame) * this.sceneUnitsPerLux(), BodySystem.lightColourOf(flame))
    const glow = FlameEffect.glowFor(flame, eye ? effect.mesh.position.distanceTo(eye) : 0)
    const mixed = new Color(flame.color).lerp(new Color(flame.tipColor ?? flame.color), 0.5)
    effect.shine(glow.radiusM, this.throughAir(BodySystem.shown([mixed.r, mixed.g, mixed.b], glow.luminanceCdM2, display), this.scratch))
    this.raiseDust(state.id, flame, seconds)
  }

  /**
   * Dust where a flame meets the ground: from the point under its nozzle, as thick as the flame is
   * near — none at all when the ground is further than the flame reaches and a metre more.
   */
  private raiseDust(id: string, flame: { lengthM: number, raisesDust?: boolean }, seconds: number): void {
    const frame = this.frame
    if (!flame.raisesDust || !frame?.groundYAt) {
      this.dust.get(id)?.set(0, 0, 0, seconds, { x: 0, z: 0 }, 0)
      return
    }
    let plume = this.dust.get(id)
    if (!plume) {
      plume = new GroundPlume(GroundPlume.DUST)
      this.dust.set(id, plume)
      this.group.add(plume.points)
    }
    const { x, y, z } = this.scratch
    const groundY = frame.groundYAt(x, z)
    const strength = Math.max(0, Math.min(1, 1 - (y - groundY) / (flame.lengthM + 1)))
    plume.set(x, groundY, z, seconds, frame.wind ?? { x: 0, z: 0 }, strength, frame.light)
  }

  /**
   * The smoke of what an interpretation sets burning, at `seconds` into the recording — each source
   * a plume from its own instant on (see SmokeSource).
   */
  setSmoke(sources: readonly SmokeSource[], seconds: number): void {
    const frame = this.frame
    while (this.smoke.length < sources.length) {
      const plume = new GroundPlume(GroundPlume.SMOKE)
      this.smoke.push(plume)
      this.group.add(plume.points)
    }
    this.smoke.forEach((plume, index) => {
      const source = sources[index]
      const t = seconds * 1000
      const burning = source !== undefined && frame !== undefined && t >= source.fromT && (source.untilT === undefined || t < source.untilT)
      if (!burning) {
        plume.set(0, 0, 0, seconds, { x: 0, z: 0 }, 0)
        return
      }
      const x = frame.originX + source.eastM
      const z = frame.originZ - source.northM
      // Catching over its first two seconds, then dying down to a smoulder.
      const ageS = (t - source.fromT) / 1000
      const strength = Math.min(1, ageS / 2) * (0.1 + 0.9 * Math.pow(2, -ageS / (source.halfLifeS ?? 20)))
      plume.set(x, frame.groundYAt ? frame.groundYAt(x, z) : frame.originGroundY, z, seconds, frame.wind ?? { x: 0, z: 0 }, strength, frame.light)
    })
  }

  /**
   * A flame's luminous intensity, candela: its luminance times the area it shows, which for a plume
   * of this outline (see FlameEffect) is some seven tenths of the width-by-length rectangle around
   * it. Seen side-on, which is how the ground around it sees it.
   */
  static luminousIntensityCd(flame: { lengthM: number, widthM: number, luminanceCdM2: number }): number {
    return flame.luminanceCdM2 * 0.7 * flame.widthM * flame.lengthM
  }

  /** The colour of the light a flame gives: its two colours averaged, scaled to a luminance of one
   * so that the intensity alone says how much. */
  private static lightColourOf(flame: { color: string, tipColor?: string }): [number, number, number] {
    const a = new Color(flame.color)
    const b = new Color(flame.tipColor ?? flame.color)
    const rgb: [number, number, number] = [(a.r + b.r) / 2, (a.g + b.g) / 2, (a.b + b.b) / 2]
    const luminance = 0.2126 * rgb[0] + 0.7152 * rgb[1] + 0.0722 * rgb[2]
    return luminance > 0 ? [rgb[0] / luminance, rgb[1] / luminance, rgb[2] / luminance] : [1, 1, 1]
  }

  /** Which way a node's own downward axis comes out in the world, as a turn from straight down. */
  private static pointing(node: Object3D, direction: Vector3, into: Quaternion): Quaternion {
    direction.set(0, -1, 0).transformDirection(node.matrixWorld).normalize()
    return into.setFromUnitVectors(BodySystem.DOWN, direction)
  }

  private static readonly DOWN = new Vector3(0, -1, 0)

  /** Where a model says a flame comes out, unless the flame names another node. */
  static readonly EXHAUST_NODE = "exhaust"

  /** Takes a body's bloom out of the scene — only when the body itself goes. */
  private dropGlare(id: string): void {
    const glare = this.glares.get(id)
    if (!glare) return
    this.group.remove(glare.mesh)
    glare.dispose()
    this.glares.delete(id)
  }

  /** Takes a body's flame and its light out of the scene — only when the body itself goes. */
  private dropFlame(id: string): void {
    const effect = this.flames.get(id)
    if (!effect) return
    effect.mesh.removeFromParent()
    effect.light.removeFromParent()
    effect.glow.removeFromParent()
    effect.dispose()
    this.flames.delete(id)
    const dust = this.dust.get(id)
    if (dust) {
      dust.points.removeFromParent()
      dust.dispose()
      this.dust.delete(id)
    }
  }

  /**
   * Points of the surface of `node` of a body's model, in the frame bodies are placed in (east,
   * north, up from the origin's ground) — what the confrontation measures its outline by. Undefined
   * until the model is there, or when it has no such node. Thinned to a few hundred points: an
   * outline needs its extremes, not every vertex.
   */
  outlineOf(id: string, node: string): { eastM: number, northM: number, upM: number }[] | undefined {
    const holder = this.built.get(id)?.holder
    const frame = this.frame
    const part = holder?.getObjectByName(node)
    if (!holder || !frame || !part) return undefined
    holder.updateMatrixWorld(true)
    const points: { eastM: number, northM: number, upM: number }[] = []
    part.traverse(child => {
      if (!(child instanceof Mesh)) return
      const position = child.geometry.getAttribute("position")
      const step = Math.max(1, Math.floor(position.count / 400))
      for (let i = 0; i < position.count; i += step) {
        this.scratch.fromBufferAttribute(position, i).applyMatrix4(child.matrixWorld)
        points.push({ eastM: this.scratch.x - frame.originX, northM: frame.originZ - this.scratch.z, upM: this.scratch.y - frame.originGroundY })
      }
    })
    return points.length > 0 ? points : undefined
  }

  /** How far the furthest body on show stands from `from` — what the camera's far plane must reach. */
  furthestFrom(from: Vector3): number {
    let furthest = 0
    for (const { holder } of this.built.values()) {
      if (holder.visible) furthest = Math.max(furthest, holder.position.distanceTo(from))
    }
    return furthest
  }

  /** Every body on show, for the reflections to photograph its surroundings from (see Reflections). */
  get reflectors(): Reflector[] {
    return [...this.built.entries()].filter(([, { holder }]) => holder.visible)
      .map(([id, { holder }]) => ({ id, holder, shiny: BodySystem.isShiny(holder) }))
  }

  /** Glass, or a surface smooth or metallic enough to mirror a shape rather than a blur — see
   * Reflector.shiny. */
  private static isShiny(holder: Object3D): boolean {
    let shiny = false
    holder.traverse(child => {
      const material = (child as { material?: unknown }).material
      for (const each of Array.isArray(material) ? material : [material]) {
        if (each instanceof GlassMaterial) shiny = true
        else if (each instanceof MeshStandardMaterial && (each.roughness < BodySystem.SHINY_ROUGHNESS || each.metalness > BodySystem.SHINY_METALNESS)) shiny = true
      }
    })
    return shiny
  }

  /** Below this roughness a mirrored lamp or cloud keeps a shape; above this metalness a surface is
   * mostly mirror whatever its roughness. */
  private static readonly SHINY_ROUGHNESS = 0.6
  private static readonly SHINY_METALNESS = 0.3

  /** Whether any body is on show. */
  get any(): boolean {
    return [...this.built.values()].some(({ holder }) => holder.visible)
  }

  clear(): void {
    this.token++
    for (const id of [...this.built.keys()]) this.remove(id)
  }

  private build(state: BodyState): { holder: Group, signature: string, material?: MeshStandardMaterial } {
    const holder = new Group()
    holder.name = `body:${state.id}`
    const signature = BodySystem.signatureOf(state.model)
    const primitive = BodySystem.primitiveOf(state.model)
    if (primitive === "figure") {
      // The decor's own figure, fitted into the unit cube like a model and painted in one colour:
      // what a witness saw at a distance is a silhouette in coveralls, not a face.
      const material = new MeshStandardMaterial({ roughness: 0.7, metalness: 0 })
      BodySystem.paint(material, state)
      const figure = DecorSystem.build({ id: state.id, kind: "entity", eastM: 0, northM: 0 } as DecorObject, false)
      figure.traverse(child => {
        if (!(child instanceof Mesh)) return
        child.material = material
        child.castShadow = true
        child.receiveShadow = true
      })
      holder.add(BodySystem.fit(figure, 0))
      return { holder, signature, material }
    }
    if (primitive) {
      const material = new MeshStandardMaterial({ roughness: 0.45, metalness: 0 })
      BodySystem.paint(material, state)
      const mesh = new Mesh(BodySystem.unitGeometry(primitive), material)
      mesh.castShadow = true
      mesh.receiveShadow = true
      holder.add(mesh)
      return { holder, signature, material }
    }
    // A model arrives later; until then (and if it never does) the body is its bounding ellipsoid,
    // which is what the confrontation measures it by anyway.
    const material = new MeshStandardMaterial({ roughness: 0.45, metalness: 0 })
    BodySystem.paint(material, state)
    const placeholder = new Mesh(BodySystem.unitGeometry("ellipsoid"), material)
    placeholder.castShadow = true
    placeholder.receiveShadow = true
    holder.add(placeholder)
    const token = this.token
    void this.loadModel(state.model).then(loaded => {
      if (!loaded || token !== this.token || this.built.get(state.id)?.holder !== holder) return
      holder.remove(placeholder)
      placeholder.geometry.dispose()
      material.dispose()
      BodySystem.glaze(loaded.scene)
      holder.add(BodySystem.fit(loaded.scene, loaded.headingOffsetDeg ?? state.model.headingOffsetDeg ?? 0))
      this.credits.set(state.id, loaded.credit)
      const entry = this.built.get(state.id)
      if (entry) {
        entry.material = undefined
        entry.glowing = BodySystem.glowingOf(loaded.scene)
      }
      this.onModelArrived()
    }).catch(error => console.warn(`Keeping the ellipsoid for body "${state.id}":`, error))
    return { holder, signature, material }
  }

  /**
   * The model, turned so its nose faces -Z and fitted into a one-metre cube centred on the origin:
   * the holder's scale then stretches it to the size stated, axis by axis, like a primitive.
   */
  private static fit(scene: Object3D, headingOffsetDeg: number): Object3D {
    const turned = new Group()
    scene.rotation.y = -headingOffsetDeg * DEG_TO_RAD
    turned.add(scene)
    turned.updateMatrixWorld(true)
    const box = new Box3().setFromObject(turned)
    const size = box.getSize(new Vector3())
    const centre = box.getCenter(new Vector3())
    const fitted = new Group()
    turned.position.sub(centre)
    fitted.add(turned)
    fitted.scale.set(1 / Math.max(size.x, 1e-6), 1 / Math.max(size.y, 1e-6), 1 / Math.max(size.z, 1e-6))
    scene.traverse(child => {
      if (!(child instanceof Mesh)) return
      child.castShadow = true
      child.receiveShadow = true
    })
    return fitted
  }

  /**
   * Its colour as a hue and its albedo as how much light it sends back: the colour is scaled so
   * that its luminance IS the albedo. A white albedo 0.1 hull is a dark grey, and a red one is a
   * dark red, which is what a reflectance means.
   */
  private static paint(material: MeshStandardMaterial, state: BodyState, display?: LuminanceDisplay): void {
    const color = new Color(state.appearance.color)
    const luminance = 0.2126 * color.r + 0.7152 * color.g + 0.0722 * color.b
    if (luminance > 0) color.multiplyScalar(state.appearance.albedo / luminance)
    color.r = Math.min(1, color.r)
    color.g = Math.min(1, color.g)
    color.b = Math.min(1, color.b)
    if (!material.color.equals(color)) material.color.copy(color)
    // And what it gives out of itself, if it gives out anything: its own colour at the brightness
    // stated, read through the scene's photometry exactly as a flame's is.
    const hue = new Color(state.appearance.color)
    const brightest = Math.max(hue.r, hue.g, hue.b)
    BodySystem.glow(material, brightest > 0 ? [hue.r / brightest, hue.g / brightest, hue.b / brightest] : [1, 1, 1],
      state.appearance.luminanceCdM2, display)
  }

  /** The brightness a body's stated luminance gives whatever its model already says glows. */
  private static light(glowing: Glow[], state: BodyState, display?: LuminanceDisplay): void {
    for (const { material, hue, share } of glowing) BodySystem.glow(material, hue, state.appearance.luminanceCdM2 * share, display)
  }

  /** Sets what a surface gives out: nothing at all below a candela, and otherwise its own colour at
   * the brightness the scene's photometry makes of that many candela per square metre. A part that
   * glows less than another is given less LUMINANCE, never a darker colour: the colour is the
   * account's. */
  private static glow(material: MeshStandardMaterial, hue: readonly [number, number, number], luminanceCdM2: number, display?: LuminanceDisplay): void {
    if (!(luminanceCdM2 > 0)) {
      if (material.emissive.r !== 0 || material.emissive.g !== 0 || material.emissive.b !== 0) material.emissive.setRGB(0, 0, 0)
      return
    }
    const rgb = BodySystem.shown(hue, luminanceCdM2, display)
    material.emissive.setRGB(rgb[0], rgb[1], rgb[2])
  }

  /** See Photometry.shown — kept here under its old name for the callers of this class. */
  static shown(colour: readonly [number, number, number], luminanceCdM2: number, display?: LuminanceDisplay): [number, number, number] {
    return Photometry.shown(colour, luminanceCdM2, display)
  }

  /**
   * Every material of a loaded model that glows of itself, with the colour the model gave it,
   * scaled against the brightest of them.
   *
   * Each with its share of the brightest, because the photometry keeps a colour's HUE and decides
   * its brightness itself: handing it a darker blue would not make the hull glow less than the
   * windows, only make it bluer. What makes it glow less is being given less of the luminance.
   */
  private static glowingOf(scene: Object3D): Glow[] {
    const materials: MeshStandardMaterial[] = []
    const seen = new Set<MeshStandardMaterial>()
    scene.traverse(child => {
      if (!(child instanceof Mesh)) return
      for (const material of Array.isArray(child.material) ? child.material : [child.material]) {
        if (!(material instanceof MeshStandardMaterial) || seen.has(material)) continue
        seen.add(material)
        if (Math.max(material.emissive.r, material.emissive.g, material.emissive.b) > 0) materials.push(material)
      }
    })
    const magnitude = (m: MeshStandardMaterial) => Math.max(m.emissive.r, m.emissive.g, m.emissive.b)
    const brightest = Math.max(...materials.map(magnitude), 0)
    if (brightest <= 0) return []
    return materials.map(material => ({
      material,
      hue: [material.emissive.r, material.emissive.g, material.emissive.b] as const,
      share: magnitude(material) / brightest
    }))
  }

  private static primitiveOf(model: DecorModelRef): BodyPrimitive | undefined {
    return model.url === undefined && (BODY_PRIMITIVES as readonly string[]).includes(model.id ?? "")
      ? model.id as BodyPrimitive
      : undefined
  }

  private static signatureOf(model: DecorModelRef): string {
    return `${model.id ?? ""}|${model.url ?? ""}`
  }

  /** A primitive, one metre along each axis and centred on the origin. */
  private static unitGeometry(primitive: BodyPrimitive): BufferGeometry {
    let geometry: BufferGeometry
    switch (primitive) {
      case "ellipsoid":
      case "sphere":
        geometry = new SphereGeometry(0.5, 48, 24)
        break
      case "disc": {
        // A lens: two shallow caps meeting at a sharp rim, the saucer of a thousand drawings.
        const profile: Vector2[] = []
        const steps = 24
        for (let i = 0; i <= steps; i++) {
          const r = 0.5 * Math.sin((i / steps) * Math.PI)
          const y = 0.5 * Math.cos((i / steps) * Math.PI)
          profile.push(new Vector2(r, Math.sign(y) * y * y * 2))
        }
        geometry = new LatheGeometry(profile.reverse(), 64)
        break
      }
      case "cylinder":
        geometry = new CylinderGeometry(0.5, 0.5, 1, 48)
        break
      case "cone":
        geometry = new ConeGeometry(0.5, 1, 48)
        break
      case "box":
        geometry = new BoxGeometry(1, 1, 1)
        break
      case "torus":
        geometry = new TorusGeometry(0.35, 0.15, 24, 64)
        geometry.rotateX(Math.PI / 2)
        break
      case "figure":
        // Built from the decor's own (see build); an ellipsoid wherever a bare geometry is asked for.
        geometry = new SphereGeometry(0.5, 24, 12)
        break
    }
    geometry.computeBoundingBox()
    const box = geometry.boundingBox!
    const size = box.getSize(new Vector3())
    const centre = box.getCenter(new Vector3())
    geometry.translate(-centre.x, -centre.y, -centre.z)
    geometry.scale(1 / size.x, 1 / size.y, 1 / size.z)
    geometry.computeVertexNormals()
    return geometry
  }

  private remove(id: string): void {
    const entry = this.built.get(id)
    if (!entry) return
    entry.holder.removeFromParent()
    entry.holder.traverse(child => {
      if (!(child instanceof Mesh)) return
      child.geometry.dispose()
      const materials = Array.isArray(child.material) ? child.material : [child.material]
      for (const material of materials) material.dispose()
    })
    this.built.delete(id)
    this.credits.delete(id)
    this.dropFlame(id)
    this.dropGlare(id)
  }
}
