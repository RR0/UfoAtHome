import { AdditiveBlending, BufferAttribute, BufferGeometry, Color, DoubleSide, Mesh, ShaderMaterial, SpotLight, Vector3 } from "three"
import type { Scene } from "three"
import { Headlights } from "../engine/model/Headlights.js"
import type { HeadlightMode } from "../engine/model/Headlights.js"

/** One vehicle's lights in the scene: a spot light to each lamp, and the light each throws into the air. */
interface Beams {
  lamps: SpotLight[]
  air: Mesh<BufferGeometry, ShaderMaterial>[]
}

/**
 * The beams of the vehicles of a scene: what a driver's lights do to the road, the verges, the trees and the walls, and to the air in front of them.
 *
 * Loaded only when a scene has a vehicle (see SceneRenderer.headlightSystem): a recording of an observer on foot, or of nothing that has lights, never
 * brings this code in.
 *
 * - A real SpotLight to each lamp (two to a vehicle, and four vehicles at most, since each is a light for every pixel of everything drawn). Off, a lamp keeps
 *   its place with no intensity: a different count of lights recompiles every material of the scene.
 * - The observer's own lamps cast a shadow, which is what makes a beam lie on the ground and not on the picture: a bank, a post, a bridge pier keeps the
 *   light from what is behind it. The decor's vehicles do not, at two more renders of the scene each.
 * - The air: a lit cone in front of each lamp, as dust, haze or fog show a beam. Faint in clear air, strong in fog.
 */
export class HeadlightSystem {
  /** How many vehicles get a real beam. */
  static readonly REAL_BEAMS = 4
  static readonly LAMPS = 2
  /** How far a beam is followed: past it a main beam leaves less than a Moon's light. */
  static readonly DISTANCE_M = 500
  /** How far the light in the air is drawn: it is a faint thing and ends in the dark well before the beam does. */
  private static readonly AIR_LENGTH_M = 90
  /** What the air always scatters of a beam, per metre, even clear: dust, insects, damp. A fog gives far more (see SceneRenderer.headlightScatter). */
  static readonly CLEAR_AIR_SCATTER_PER_M = 2e-4
  private static readonly SHADOW_MAP_PX = 1024

  private readonly beams = new Map<string, Beams>()
  private static airGeometry?: BufferGeometry

  constructor(private readonly scene: Scene) {}

  has(id: string): boolean {
    return this.beams.has(id)
  }

  get size(): number {
    return this.beams.size
  }

  lamps(id: string): SpotLight[] {
    return this.beams.get(id)?.lamps ?? []
  }

  airMeshes(id: string): Mesh<BufferGeometry, ShaderMaterial>[] {
    return this.beams.get(id)?.air ?? []
  }

  /** Adds the beams of a vehicle, one for each lamp, if the scene still has any to give. Off until aimed. */
  add(id: string): boolean {
    if (this.beams.has(id)) return true
    if (this.beams.size >= HeadlightSystem.REAL_BEAMS) return false
    const lamps: SpotLight[] = []
    const air: Mesh<BufferGeometry, ShaderMaterial>[] = []
    for (let lamp = 0; lamp < HeadlightSystem.LAMPS; lamp++) {
      const light = new SpotLight(0xffffff, 0, HeadlightSystem.DISTANCE_M, Math.PI / 8, 0.5, 2)
      // The observer's lamps cast a shadow for as long as they are in the scene: a light that begins to cast one is a new program for every material of the
      // scene, compiled in the middle of a frame (hundreds of milliseconds on a fast card, seconds on a slow one). Off, they stop being drawn into the map instead.
      light.castShadow = id === "observer"
      light.shadow.mapSize.set(HeadlightSystem.SHADOW_MAP_PX, HeadlightSystem.SHADOW_MAP_PX)
      light.shadow.camera.near = 0.4
      light.shadow.camera.far = 110
      // A beam is nearly flat to the ground it lights: without these the ground shades itself in stripes.
      light.shadow.bias = -0.0004
      light.shadow.normalBias = 0.04
      light.shadow.radius = 2
      this.scene.add(light)
      this.scene.add(light.target)
      lamps.push(light)
      const cone = new Mesh(HeadlightSystem.airCone(), HeadlightSystem.airMaterial())
      cone.visible = false
      cone.frustumCulled = false
      cone.renderOrder = 8
      cone.castShadow = false
      cone.receiveShadow = false
      cone.name = "headlight air"
      this.scene.add(cone)
      air.push(cone)
    }
    this.beams.set(id, { lamps, air })
    return true
  }

  remove(id: string): void {
    const beams = this.beams.get(id)
    if (!beams) return
    for (const light of beams.lamps) {
      light.removeFromParent()
      light.target.removeFromParent()
      light.dispose()
    }
    for (const cone of beams.air) {
      cone.removeFromParent()
      cone.material.dispose()
    }
    this.beams.delete(id)
  }

  /** Takes the beams down: all of them, or all but the observer's own. */
  clear(keepObserver: boolean): void {
    for (const id of [...this.beams.keys()]) {
      if (keepObserver && id === "observer") continue
      this.remove(id)
    }
  }

  dispose(): void {
    this.clear(false)
    HeadlightSystem.airGeometry?.dispose()
    HeadlightSystem.airGeometry = undefined
  }

  /**
   * Sets the beams of one vehicle: its setting (see HeadlightMode) says how strong, how wide and how low, and where it stands and faces says where. There is a
   * beam to each lamp, the two either side of the middle of the front and a little turned in, and the intensity of the setting (that of both lamps together,
   * as the regulations give it) is shared between them: two pools on the road in front of the vehicle that become one farther on.
   *
   * @param origin Where the middle of the front of the lamps is, in the scene's own metres.
   * @param forward The way the vehicle faces on the ground (unit, horizontal).
   * @param airExtinctionPerM The extinction of the air at the eye, per metre: what it scatters of a beam is that, and never less than CLEAR_AIR_SCATTER_PER_M
   *   (dust, insects), and the cone of light in the air is shown in proportion.
   */
  aim(id: string, mode: HeadlightMode, origin: Vector3, forward: Vector3, halfTrackM: number, relativeScale: number, airExtinctionPerM: number): void {
    const beams = this.beams.get(id)
    const scatterPerM = Math.max(airExtinctionPerM, HeadlightSystem.CLEAR_AIR_SCATTER_PER_M)
    if (!beams) return
    const beam = Headlights.BEAMS[mode]
    // To the right of the way it faces, on the ground.
    const right = new Vector3(-forward.z, 0, forward.x)
    const casts = id === "observer" && beam !== undefined
    beams.lamps.forEach((light, index) => {
      if (!beam) {
        light.intensity = 0
        beams.air[index].visible = false
        // Not drawn into a shadow map for nothing: the lamp is off.
        light.shadow.autoUpdate = false
        return
      }
      const side = index === 0 ? -1 : 1
      const pitch = beam.pitchDeg * Math.PI / 180
      const candela = beam.candela * Headlights.DISPLAY_GAIN * relativeScale / beams.lamps.length
      light.color.set(beam.color)
      light.intensity = candela
      light.angle = beam.halfAngleDeg * Math.PI / 180
      light.penumbra = beam.penumbra
      if (casts) {
        // Drawn again from the first frame it lights, from where it stands now.
        if (!light.shadow.autoUpdate) light.shadow.needsUpdate = true
        light.shadow.autoUpdate = true
      } else {
        light.shadow.autoUpdate = false
      }
      light.position.copy(origin).addScaledVector(right, side * halfTrackM)
      // Turned in by the lamps' own aim: the two axes cross far ahead of the vehicle.
      const aim = forward.clone().addScaledVector(right, -side * Math.tan(Headlights.TOE_IN_DEG * Math.PI / 180)).normalize()
      light.target.position.set(
        light.position.x + aim.x * Math.cos(pitch) * 50,
        light.position.y - Math.sin(pitch) * 50,
        light.position.z + aim.z * Math.cos(pitch) * 50
      )
      light.target.updateMatrixWorld()
      this.aimAir(beams.air[index], light, beam.color, candela, scatterPerM)
    })
  }

  /** The cone of lit air from one lamp: from the lamp, along its axis, as wide as its beam. */
  private aimAir(cone: Mesh<BufferGeometry, ShaderMaterial>, light: SpotLight, color: string, candela: number, scatterPerM: number): void {
    // Not drawn when there is next to nothing to see in it: its cost is its fill, which is the whole of the screen for a cone that starts at the eye.
    cone.visible = scatterPerM * candela > 1e-4
    if (!cone.visible) return
    const length = HeadlightSystem.AIR_LENGTH_M
    const radius = length * Math.tan(light.angle)
    cone.position.copy(light.position)
    cone.scale.set(radius, radius, length)
    cone.lookAt(light.target.position)
    cone.updateMatrixWorld()
    const uniforms = cone.material.uniforms
    uniforms.uColor.value.set(color)
    uniforms.uCandela.value = candela
    uniforms.uScatter.value = scatterPerM
    uniforms.uLength.value = length
    uniforms.uRadius.value = radius
  }

  /** A cone with its apex at the origin and its axis along +Z, a unit long and a unit across at its end: open, since only its sides are drawn. */
  private static airCone(): BufferGeometry {
    if (HeadlightSystem.airGeometry) return HeadlightSystem.airGeometry
    const segments = 24
    const positions = new Float32Array((segments + 1) * 3)
    for (let i = 0; i < segments; i++) {
      const angle = (i / segments) * Math.PI * 2
      positions.set([Math.cos(angle), Math.sin(angle), 1], (i + 1) * 3)
    }
    const indices: number[] = []
    for (let i = 0; i < segments; i++) indices.push(0, 1 + i, 1 + ((i + 1) % segments))
    const geometry = new BufferGeometry()
    geometry.setAttribute("position", new BufferAttribute(positions, 3))
    geometry.setIndex(indices)
    HeadlightSystem.airGeometry = geometry
    return geometry
  }

  /**
   * What a ray through the cone sees of it: the light the air scatters towards the eye, for a path through the beam as long as the cone is thick there, of
   * the intensity of the lamp over the square of the distance from it. The cone is drawn on its two sides and added, so a ray that goes through it adds its
   * front and its back; the path's thickness is taken from the angle the ray goes through the side at.
   */
  private static airMaterial(): ShaderMaterial {
    return new ShaderMaterial({
      transparent: true,
      depthWrite: false,
      depthTest: true,
      blending: AdditiveBlending,
      side: DoubleSide,
      uniforms: {
        uColor: { value: new Color(1, 1, 1) },
        uCandela: { value: 0 },
        uScatter: { value: 0 },
        uLength: { value: 90 },
        uRadius: { value: 20 }
      },
      vertexShader: `
        varying vec3 vLocal;
        varying vec3 vNormalView;
        varying vec3 vViewDir;
        void main() {
          vLocal = position;
          vec4 viewPosition = modelViewMatrix * vec4(position, 1.0);
          // The side's normal, out of the axis: the apex has none (its length is nought), and a normal of nought there would spread NaN over the whole cone.
          float ring = length(position.xy);
          vec3 outward = ring > 1e-5 ? vec3(position.xy / ring, 0.0) : vec3(0.0, 0.0, 1.0);
          vNormalView = normalize(normalMatrix * outward);
          vViewDir = -viewPosition.xyz;
          gl_Position = projectionMatrix * viewPosition;
        }`,
      fragmentShader: `
        uniform vec3 uColor;
        uniform float uCandela;
        uniform float uScatter;
        uniform float uLength;
        uniform float uRadius;
        varying vec3 vLocal;
        varying vec3 vNormalView;
        varying vec3 vViewDir;
        void main() {
          float t = clamp(vLocal.z, 0.0, 1.0);
          float distanceM = max(t * uLength, 1.5);
          // The chord a ray makes through a cone of this thickness: long going along the beam, short going across its edge.
          float facing = abs(dot(normalize(vNormalView), normalize(vViewDir + vec3(0.0, 0.0, 1e-4))));
          float chord = 2.0 * uRadius * t * (0.25 + 0.75 * facing);
          // The beam's own profile averaged over the chord: strongest on the axis, none at the edge of the cone.
          float profile = 0.55;
          float radiance = uScatter * uCandela * chord * profile / (distanceM * distanceM + 9.0);
          float ends = (1.0 - smoothstep(0.75, 1.0, t)) * smoothstep(0.0, 0.04, t);
          gl_FragColor = vec4(uColor * radiance * ends, 1.0);
        }`
    })
  }
}
