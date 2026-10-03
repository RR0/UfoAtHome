import { Box3, DirectionalLight, Group, HemisphereLight, Mesh, MeshStandardMaterial, Object3D, PerspectiveCamera, Scene, Sphere, Vector3 } from "three"
import type { DecorKind, DecorObject } from "../../engine/model/Decor.js"
import type { BodyPrimitive } from "../../engine/interpretation/Interpretation.js"
import { BodySystem } from "../BodySystem.js"
import { DecorSystem } from "../DecorSystem.js"
import { loadGltfScene } from "./loadGltfScene.js"

/**
 * What a picture or a live view of a model is made from: a glTF file (with the catalogue's own
 * correction that turns its nose to -Z), one of the bodies' built-in shapes, or the built-in shape a
 * kind of decor object is drawn as when it names no model. Plain data, so the editor can say what to
 * show without loading anything of the renderer (see ModelPicker).
 */
export type ModelSource =
  | { url: string, headingOffsetDeg?: number }
  | { shape: BodyPrimitive }
  | { decorKind: DecorKind }

/** Builds what a ModelSource shows, and sets the stage it is shown on. Shared by the still pictures
 * (ModelThumbnails) and the live view (ModelViewer), so that they show the same thing. */
export class ModelSources {
  static key(source: ModelSource): string {
    return "url" in source ? `url:${source.url}|${source.headingOffsetDeg ?? 0}` : "shape" in source ? `shape:${source.shape}` : `decor:${source.decorKind}`
  }

  /** A fresh object for the source, in a group that carries the file's heading correction, so that
   * whoever turns it turns it about its own vertical axis. The caller owns it (see dispose). */
  static async build(source: ModelSource): Promise<Object3D> {
    const holder = new Group()
    if ("url" in source) {
      const model = await loadGltfScene(source.url)
      model.rotation.y = -(source.headingOffsetDeg ?? 0) * Math.PI / 180
      holder.add(model)
    } else if ("shape" in source) {
      holder.add(ModelSources.shapeOf(source.shape))
    } else {
      holder.add(DecorSystem.build({ id: "preview", kind: source.decorKind, eastM: 0, northM: 0 } as DecorObject, false))
    }
    return holder
  }

  /** The ellipsoid is the sphere flattened, as it is told apart from it once it is given its sizes. */
  private static shapeOf(primitive: BodyPrimitive): Object3D {
    if (primitive === "figure") return DecorSystem.build({ id: "preview", kind: "entity", eastM: 0, northM: 0 } as DecorObject, false)
    const mesh = new Mesh(BodySystem.unitGeometry(primitive), new MeshStandardMaterial({ color: 0xc8c8d0, roughness: 0.5, metalness: 0 }))
    if (primitive === "ellipsoid") mesh.scale.set(1, 0.55, 1)
    return mesh
  }

  /** Frees the geometry and materials of an object built here. */
  static dispose(object: Object3D): void {
    object.traverse(child => {
      const mesh = child as { isMesh?: boolean, geometry?: { dispose(): void }, material?: unknown }
      if (!mesh.isMesh) return
      mesh.geometry?.dispose()
      for (const material of [mesh.material].flat() as Array<{ dispose(): void }>) material.dispose()
    })
  }

  /**
   * The stage: the object about its own centre (so that turning the pivot turns it in place), two
   * lights, and a camera that sees it whole from three-quarters in front (a model's nose faces -Z). Undefined when the object
   * has nothing to show.
   */
  static stage(object: Object3D, aspect: number): { scene: Scene, camera: PerspectiveCamera, pivot: Group } | undefined {
    const box = new Box3().setFromObject(object)
    if (box.isEmpty()) return undefined
    const sphere = box.getBoundingSphere(new Sphere())
    const pivot = new Group()
    object.position.sub(sphere.center)
    pivot.add(object)
    const scene = new Scene()
    scene.add(pivot)
    scene.add(new HemisphereLight(0xffffff, 0x667788, 1.6))
    const sun = new DirectionalLight(0xffffff, 2.5)
    sun.position.set(1, 2, 1.5)
    scene.add(sun)
    const camera = new PerspectiveCamera(30, aspect, sphere.radius * 0.05, sphere.radius * 20)
    const distance = sphere.radius / Math.sin((camera.fov * Math.PI) / 360) * 1.05
    camera.position.copy(new Vector3(0.55, 0.3, -0.78).normalize().multiplyScalar(distance))
    camera.lookAt(0, 0, 0)
    return { scene, camera, pivot }
  }
}
