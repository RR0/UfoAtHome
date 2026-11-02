import {
  BufferGeometry, HalfFloatType, Raycaster, LinearFilter, Material, Matrix3, Matrix4, Mesh, Object3D, PerspectiveCamera, Plane, Scene, ShaderMaterial, Vector3,
  Vector4, WebGLRenderTarget, WebGLRenderer
} from "three"

/** One flat mirror: the glass, where it is in its own frame, and what it shows. */
interface Mirror {
  mesh: Mesh
  /** The glass's centre and the side it faces, in the mesh's own frame. */
  centre: Vector3
  normal: Vector3
  /** How far its rim is from its centre, in the mesh's own frame. */
  radius: number
  target: WebGLRenderTarget
  material: ShaderMaterial
}

/**
 * The mirrors of the scene: what a driver sees behind him in the glass of his door's mirror.
 *
 * WHAT IT IS. A flat mirror shows what an eye placed behind it, at the eye's own image through its plane, sees through it: so the scene is drawn
 * from that image of the eye, through the glass only (its plane is the near plane of that view, the oblique one of Lengyel's paper, so that
 * nothing between the image and the glass stands in it), into a picture of its own that the glass then shows where each of its points
 * projects. That is three's own Reflector, here because the picture has to be drawn as light like the rest of the scene (half floats, the
 * eye's response applied to the whole frame once, see FinishPass) and because the phenomena are drawn in their own pass (see
 * SceneRenderer.renderPhenomenaPass): a phenomenon seen in a mirror is a phenomenon seen, the one thing the mirror is there for.
 *
 * WHICH. A model says which of its surfaces is a mirror by the name of their material: MATERIAL_NAME (the van's door mirror, see
 * scripts/extract-iveco-daily-van.py). The glass is taken as flat: its triangles' normal, weighted by their area.
 *
 * WHEN. Only a mirror in view, near enough to be seen (NEAR_M), and facing the eye is drawn, before the frame that shows it. Its view is
 * narrowed to the glass, so that the PIXELS of the picture all land on it. What it costs is the drawing calls, not the pixels: a mirror
 * looking back along a road sees its trees and houses, 590 calls more than the cab the eye is looking from at Silly-le-Long (15 ms a
 * frame without it, 22 with it, at 128 as at 512 pixels). So on screen it is drawn at most every INTERVAL_MS, the frames between showing
 * the last picture: a mirror is a small thing seen out of the corner of the eye, and thirty pictures a second is what a film gives it.
 */
export class MirrorSystem {
  static readonly MATERIAL_NAME = "Mirror"
  /** How much of the light a car's mirror sends back: silvered glass, a few per cent lost in the glass and its back. */
  static readonly REFLECTANCE = 0.85
  /** Pixels on a side of a mirror's picture. */
  static readonly SIZE = 512
  /** Past this, in metres, a mirror is too small to be worth drawing. */
  static readonly NEAR_M = 12
  /** On screen, the least time between two pictures of the mirrors, ms. */
  static readonly INTERVAL_MS = 30

  private readonly mirrors: Mirror[] = []
  /** When the mirrors were last drawn, ms of performance.now(). */
  private drawnAtMs = -Infinity
  private readonly camera = new PerspectiveCamera()
  private readonly eye = new Vector3()
  private readonly centre = new Vector3()
  private readonly normal = new Vector3()
  private readonly image = new Vector3()
  private readonly up = new Vector3()
  private readonly normalMatrix = new Matrix3()
  private readonly plane = new Plane()
  private readonly clip = new Vector4()
  private readonly q = new Vector4()
  private readonly bias = new Matrix4().set(0.5, 0, 0, 0.5, 0, 0.5, 0, 0.5, 0, 0, 0.5, 0.5, 0, 0, 0, 1)

  get any(): boolean {
    return this.mirrors.length > 0
  }

  /** Makes a mirror of every mesh under `object` whose material says it is one. */
  adopt(object: Object3D): void {
    object.traverse(child => {
      const mesh = child as Mesh
      if (!mesh.isMesh || Array.isArray(mesh.material) || (mesh.material as Material).name !== MirrorSystem.MATERIAL_NAME) return
      if (this.mirrors.some(mirror => mirror.mesh === mesh)) return
      const flat = MirrorSystem.flatten(mesh.geometry)
      if (!flat) return
      const target = new WebGLRenderTarget(MirrorSystem.SIZE, MirrorSystem.SIZE, { type: HalfFloatType, minFilter: LinearFilter, magFilter: LinearFilter })
      const material = new ShaderMaterial({
        name: MirrorSystem.MATERIAL_NAME,
        uniforms: {
          uReflection: { value: target.texture },
          uTextureMatrix: { value: new Matrix4() },
          uReflectance: { value: MirrorSystem.REFLECTANCE }
        },
        vertexShader: `
          uniform mat4 uTextureMatrix;
          varying vec4 vUv;
          void main() {
            vUv = uTextureMatrix * vec4(position, 1.0);
            gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
          }
        `,
        fragmentShader: `
          uniform sampler2D uReflection;
          uniform float uReflectance;
          varying vec4 vUv;
          void main() {
            gl_FragColor = vec4(texture2DProj(uReflection, vUv).rgb * uReflectance, 1.0);
          }
        `,
        fog: false
      })
      // The model's own material is shared with every other copy of the model (see SceneRenderer.applyLoadedDecorModel): replaced, not disposed.
      mesh.material = material
      this.mirrors.push({ mesh, ...flat, target, material })
    })
  }

  /**
   * Sends `raycaster`'s ray on through the mirror it meets, if it meets one before `distanceLimit` (whatever stands nearer, a door
   * pillar, hides it): from the glass, turned about the same plane the mirror is drawn with. What is pointed at in a mirror is what it
   * shows, not the van it is on.
   *
   * @returns Whether the ray was turned.
   */
  reflect(raycaster: Raycaster, nearerThan: (distance: number) => boolean = () => true): boolean {
    if (this.mirrors.length === 0) return false
    const hit = raycaster.intersectObjects(this.mirrors.map(mirror => mirror.mesh), false)[0]
    if (!hit || !nearerThan(hit.distance)) return false
    const mirror = this.mirrors.find(each => each.mesh === hit.object)!
    mirror.mesh.updateWorldMatrix(true, false)
    this.normal.copy(mirror.normal).applyMatrix3(this.normalMatrix.getNormalMatrix(mirror.mesh.matrixWorld)).normalize()
    raycaster.ray.origin.copy(hit.point).addScaledVector(this.normal, 1e-3 * Math.sign(-raycaster.ray.direction.dot(this.normal)))
    raycaster.ray.direction.reflect(this.normal).normalize()
    return true
  }

  /** Whether `object` is the glass of one of the mirrors. */
  isMirror(object: Object3D): boolean {
    return this.mirrors.some(mirror => mirror.mesh === object)
  }

  /** Forgets every mirror, as the decor they belong to is taken down. */
  clear(): void {
    for (const mirror of this.mirrors) {
      mirror.target.dispose()
      mirror.material.dispose()
    }
    this.mirrors.length = 0
  }

  /**
   * Draws what each mirror in view shows, from `camera`: the scene's own layers, then each of `afterLayers` over them (the phenomena), into
   * the mirror's picture.
   *
   * @param onScreen Whether the frame is for the screen, where a mirror drawn less than INTERVAL_MS ago keeps its picture; a frame of a film
   *   or of an export is an instant of its own and always gets its own.
   * @returns false if the mirrors kept a picture older than this frame: the caller draws again once INTERVAL_MS are up, or a scene that has
   *   stopped would keep it.
   */
  render(renderer: WebGLRenderer, scene: Scene, camera: PerspectiveCamera, afterLayers: readonly number[] = [], onScreen = false): boolean {
    if (this.mirrors.length === 0) return true
    const now = performance.now()
    if (onScreen && now - this.drawnAtMs < MirrorSystem.INTERVAL_MS) return false
    camera.updateMatrixWorld()
    this.eye.setFromMatrixPosition(camera.matrixWorld)
    for (const mirror of this.mirrors) {
      if (!MirrorSystem.inScene(mirror.mesh, scene) || !MirrorSystem.shown(mirror.mesh)) continue
      const { mesh } = mirror
      mesh.updateWorldMatrix(true, false)
      this.centre.copy(mirror.centre).applyMatrix4(mesh.matrixWorld)
      this.normal.copy(mirror.normal).applyMatrix3(this.normalMatrix.getNormalMatrix(mesh.matrixWorld)).normalize()
      const toEye = this.image.subVectors(this.eye, this.centre)
      const distance = toEye.length()
      // Turned away, or too far to matter, or out of the view: nothing to show.
      if (toEye.dot(this.normal) <= 0 || distance > MirrorSystem.NEAR_M) continue
      const radius = mirror.radius * mesh.matrixWorld.getMaxScaleOnAxis()
      if (!MirrorSystem.inView(camera, this.centre, radius)) continue
      // The eye's image through the plane of the glass, looking at the glass.
      this.image.copy(this.eye).addScaledVector(this.normal, -2 * this.plane.setFromNormalAndCoplanarPoint(this.normal, this.centre).distanceToPoint(this.eye))
      const view = this.camera
      view.position.copy(this.image)
      this.up.set(0, 1, 0).applyMatrix3(this.normalMatrix.getNormalMatrix(camera.matrixWorld)).reflect(this.normal)
      view.up.copy(this.up)
      view.lookAt(this.centre)
      const reach = this.image.distanceTo(this.centre)
      view.fov = (2 * Math.atan(radius / Math.max(reach, radius * 1.01)) * 180) / Math.PI
      view.aspect = 1
      view.near = 0.05
      view.far = camera.far
      view.updateProjectionMatrix()
      view.updateMatrixWorld()
      mirror.material.uniforms.uTextureMatrix.value.copy(this.bias).multiply(view.projectionMatrix).multiply(view.matrixWorldInverse).multiply(mesh.matrixWorld)
      this.clipAtGlass(view)
      this.draw(renderer, scene, view, mirror, afterLayers)
      this.drawnAtMs = now
    }
    return true
  }

  /** Moves the near plane of `view` onto the glass (Lengyel's oblique near plane): what is between the eye's image and the glass is not seen. */
  private clipAtGlass(view: PerspectiveCamera): void {
    this.plane.setFromNormalAndCoplanarPoint(this.normal, this.centre).applyMatrix4(view.matrixWorldInverse)
    this.clip.set(this.plane.normal.x, this.plane.normal.y, this.plane.normal.z, this.plane.constant)
    const m = view.projectionMatrix.elements
    this.q.set((Math.sign(this.clip.x) + m[8]) / m[0], (Math.sign(this.clip.y) + m[9]) / m[5], -1, (1 + m[10]) / m[14])
    this.clip.multiplyScalar(2 / this.clip.dot(this.q))
    m[2] = this.clip.x
    m[6] = this.clip.y
    m[10] = this.clip.z + 1
    m[14] = this.clip.w
  }

  private draw(renderer: WebGLRenderer, scene: Scene, view: PerspectiveCamera, mirror: Mirror, afterLayers: readonly number[]): void {
    const previousTarget = renderer.getRenderTarget()
    const autoClear = renderer.autoClear
    const shadows = renderer.shadowMap.autoUpdate
    mirror.mesh.visible = false
    renderer.shadowMap.autoUpdate = false
    renderer.setRenderTarget(mirror.target)
    renderer.state.buffers.depth.setMask(true)
    renderer.autoClear = true
    view.layers.set(0)
    renderer.render(scene, view)
    renderer.autoClear = false
    for (const layer of afterLayers) {
      view.layers.set(layer)
      renderer.render(scene, view)
    }
    view.layers.set(0)
    renderer.setRenderTarget(previousTarget)
    renderer.autoClear = autoClear
    renderer.shadowMap.autoUpdate = shadows
    mirror.mesh.visible = true
  }

  /** The glass's centre, the side it faces and its radius, from the triangles of `geometry`, or undefined if it has none. */
  private static flatten(geometry: BufferGeometry): Pick<Mirror, "centre" | "normal" | "radius"> | undefined {
    const position = geometry.getAttribute("position")
    const index = geometry.getIndex()
    const count = index ? index.count : position.count
    const a = new Vector3(), b = new Vector3(), c = new Vector3(), ab = new Vector3(), ac = new Vector3()
    const normal = new Vector3(), centre = new Vector3()
    let area = 0
    for (let i = 0; i + 2 < count; i += 3) {
      const at = (k: number) => (index ? index.getX(i + k) : i + k)
      a.fromBufferAttribute(position, at(0))
      b.fromBufferAttribute(position, at(1))
      c.fromBufferAttribute(position, at(2))
      const cross = ab.subVectors(b, a).cross(ac.subVectors(c, a))
      const twice = cross.length()
      if (twice === 0) continue
      // Every triangle facing the same side as the first: a mesh whose winding is mixed still has one face of glass.
      if (area > 0 && cross.dot(normal) < 0) cross.negate()
      normal.add(cross)
      centre.addScaledVector(a.add(b).add(c), twice / 6)
      area += twice / 2
    }
    if (area === 0) return undefined
    centre.divideScalar(area)
    normal.normalize()
    // The side the glass faces is the side its vertices' normals say, when they say one.
    const normals = geometry.getAttribute("normal")
    if (normals) {
      const stated = new Vector3()
      for (let i = 0; i < count; i++) stated.add(a.fromBufferAttribute(normals, index ? index.getX(i) : i))
      if (stated.dot(normal) < 0) normal.negate()
    }
    let radius = 0
    for (let i = 0; i < count; i++) radius = Math.max(radius, a.fromBufferAttribute(position, index ? index.getX(i) : i).distanceTo(centre))
    return { centre, normal, radius }
  }

  private static inScene(object: Object3D, scene: Scene): boolean {
    let node: Object3D | null = object
    while (node && node !== scene) node = node.parent
    return node === scene
  }

  private static shown(object: Object3D): boolean {
    for (let node: Object3D | null = object; node; node = node.parent) if (!node.visible) return false
    return true
  }

  private static inView(camera: PerspectiveCamera, centre: Vector3, radius: number): boolean {
    const local = centre.clone().applyMatrix4(camera.matrixWorldInverse)
    if (local.z > radius) return false
    const half = (camera.fov * Math.PI) / 360
    const depth = Math.max(-local.z, 1e-3)
    const slack = radius / depth
    return Math.abs(local.y) / depth <= Math.tan(half) + slack && Math.abs(local.x) / depth <= Math.tan(half) * camera.aspect + slack
  }
}
