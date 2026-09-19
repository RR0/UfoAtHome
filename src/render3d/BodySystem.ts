import {
  Box3, BoxGeometry, BufferGeometry, Color, ConeGeometry, CylinderGeometry, Group, LatheGeometry, Mesh,
  MeshStandardMaterial, Object3D, SphereGeometry, TorusGeometry, Vector2, Vector3
} from "three"
import type { BodyState } from "../engine/interpretation/BodyPlacement.js"
import { BODY_PRIMITIVES } from "../engine/interpretation/Interpretation.js"
import type { BodyPrimitive } from "../engine/interpretation/Interpretation.js"
import type { DecorModelRef } from "../engine/model/Decor.js"

const DEG_TO_RAD = Math.PI / 180

/** Loads the glTF scene a model reference names, with the credit it must be shown with — or nothing,
 * when it cannot be had. Supplied by the renderer, which already resolves the decor's. */
export type BodyModelLoader = (ref: DecorModelRef) => Promise<{ scene: Object3D, credit: unknown, headingOffsetDeg?: number } | undefined>

/** Where the frame bodies are placed in stands in the scene: its origin's position, and the ground
 * height there that the bodies' own heights are counted from (see BodyPlacement.Ground). */
export interface BodyFrame {
  originX: number
  originZ: number
  originGroundY: number
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
  private readonly built = new Map<string, { holder: Group, signature: string, material?: MeshStandardMaterial }>()
  /** Bumped whenever the set of bodies is replaced, so a model arriving for a previous one is
   * dropped. */
  private token = 0
  private readonly credits = new Map<string, unknown>()

  constructor(private readonly loadModel: BodyModelLoader, private readonly onModelArrived: () => void) {
    this.group.name = "bodies"
  }

  /** The credits of every model on show — beside the decor's in the info panel. */
  get modelCredits(): unknown[] {
    return [...this.credits.values()]
  }

  /** Stands every body where its state says, building what is new and removing what is gone. */
  set(states: BodyState[], frame: BodyFrame): void {
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
      const { holder, material } = entry
      holder.position.set(frame.originX + state.eastM, frame.originGroundY + state.upM, frame.originZ - state.northM)
      holder.rotation.set(state.attitude.pitchDeg * DEG_TO_RAD, -state.attitude.headingDeg * DEG_TO_RAD, -state.attitude.rollDeg * DEG_TO_RAD, "YXZ")
      holder.scale.set(state.sizeM.widthM, state.sizeM.heightM, state.sizeM.lengthM)
      if (material) BodySystem.paint(material, state)
    }
    for (const id of [...this.built.keys()]) {
      if (!seen.has(id)) this.remove(id)
    }
  }

  /** How far the furthest body stands from `from` — what the camera's far plane must reach. */
  furthestFrom(from: Vector3): number {
    let furthest = 0
    for (const { holder } of this.built.values()) furthest = Math.max(furthest, holder.position.distanceTo(from))
    return furthest
  }

  get any(): boolean {
    return this.built.size > 0
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
      holder.add(BodySystem.fit(loaded.scene, loaded.headingOffsetDeg ?? state.model.headingOffsetDeg ?? 0))
      this.credits.set(state.id, loaded.credit)
      const entry = this.built.get(state.id)
      if (entry) entry.material = undefined
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
  private static paint(material: MeshStandardMaterial, state: BodyState): void {
    const color = new Color(state.appearance.color)
    const luminance = 0.2126 * color.r + 0.7152 * color.g + 0.0722 * color.b
    if (luminance > 0) color.multiplyScalar(state.appearance.albedo / luminance)
    color.r = Math.min(1, color.r)
    color.g = Math.min(1, color.g)
    color.b = Math.min(1, color.b)
    if (!material.color.equals(color)) material.color.copy(color)
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
  }
}
