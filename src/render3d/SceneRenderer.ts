// Named imports (not `import * as THREE`) so Rollup can tree-shake the unused 95% of
// three.js — a namespace import defeats tree-shaking since property access on it isn't
// statically analyzable, which was the difference between an ~850KB and an ~180KB bundle here.
import {
  AdditiveBlending,
  BackSide,
  BufferAttribute,
  BufferGeometry,
  CanvasTexture,
  CircleGeometry,
  Color,
  Fog,
  Float32BufferAttribute,
  Mesh,
  MeshBasicMaterial,
  PerspectiveCamera,
  Points,
  PointsMaterial,
  Raycaster,
  Scene,
  SphereGeometry,
  Sprite,
  SpriteMaterial,
  Vector2,
  WebGLRenderer
} from "three"
import type { Material } from "three"
import {
  atmosphericTint,
  cartesianToHorizontal,
  glareOpacity,
  glareRadius,
  glareStrength,
  horizontalToCartesian,
  magnitudeToBrightness,
  skyColorForPosition,
  skyColorsForAltitude,
  starBrightnessTierIndex,
  starColorScale,
  twinkleIntensity,
  visibleMagnitudeLimit,
  STAR_BRIGHTNESS_TIERS
} from "./skyColors.js"
import { equatorialToHorizontal } from "../engine/astronomy/CelestialPositions.js"
import type { CelestialBody, HorizontalPosition, MoonPhase, ObserverGeo } from "../engine/astronomy/CelestialPositions.js"
import type { ObserverPose } from "../engine/model/ObserverTrack.js"
import type { StarCatalog } from "./StarCatalog.js"

const SKY_RADIUS = 900
const GROUND_RADIUS = 900
const STAR_RADIUS = 850
const BODY_PLACEMENT_RADIUS = 850
/** Sized to match the Sun/Moon's real ~0.53deg angular diameter at BODY_PLACEMENT_RADIUS
 * (radius = R*tan(0.265deg) =~ 3.9) — this is a simulation, not an illustration: rendering them
 * bigger or artificially brighter than they'd really appear would defeat the actual point (e.g.
 * judging whether a reported light could realistically have been Venus). If they end up small and
 * easy to miss on screen, that's accurate, not a bug — a real witness can misjudge/miss them too. */
const SUN_MOON_VISUAL_RADIUS = 4
/** Real planets are angularly far smaller than this (arcseconds, genuinely point-like to the naked
 * eye) — this is already a floor for basic renderability (three.js can't usefully rasterize a
 * true-to-scale sub-pixel sphere), not a stylistic choice, so it's kept as small as still renders. */
const PLANET_VISUAL_RADIUS = 1.5
const BELOW_HORIZON_CUTOFF_DEG = -1
/** How much bigger than its visual disc a body's raycasting hit-test target is — real Sun/Moon/
 * planet discs are too small to reliably point at exactly, so hover/click detection (see
 * pickBodyAt) uses a more forgiving invisible radius without changing what's actually drawn. */
const HOVER_HIT_RADIUS_SCALE = 6
/** Sun/Moon/planet meshes stop being built once this far below the horizon — well past the point
 * the opaque ground plane would occlude them anyway, so there's no point paying for the geometry. */
const BODY_HIDE_BELOW_DEG = -4

/** French abbreviations, clockwise from north — matches this project's own azimuth convention
 * (0deg = north, increasing clockwise). Shown on the horizon in "edit mode" (see
 * SceneElement's show-compass attribute, set by UfoRecorderElement) so a witness's heading can be
 * set/checked against a real compass reference instead of a bare number. */
const COMPASS_DIRECTIONS: ReadonlyArray<{ azimuthDeg: number; label: string }> = [
  { azimuthDeg: 0, label: "N" },
  { azimuthDeg: 45, label: "NE" },
  { azimuthDeg: 90, label: "E" },
  { azimuthDeg: 135, label: "SE" },
  { azimuthDeg: 180, label: "S" },
  { azimuthDeg: 225, label: "SO" },
  { azimuthDeg: 270, label: "O" },
  { azimuthDeg: 315, label: "NO" }
]
const COMPASS_PLACEMENT_RADIUS = 880 // just inside the sky dome, reading as "on the horizon"
const COMPASS_SPRITE_SIZE = 40

const PLANET_COLORS: Partial<Record<CelestialBody, Color>> = {
  Venus: new Color(1, 0.96, 0.85),
  Mars: new Color(1, 0.55, 0.4),
  Jupiter: new Color(0.95, 0.87, 0.72),
  Saturn: new Color(0.92, 0.86, 0.68)
}

interface StarTier {
  readonly points: Points
  readonly colorAttribute: BufferAttribute
  readonly brightness: Float32Array
  readonly phase: Float32Array
  readonly speedFactor: Float32Array
}

export interface ScenePlanet {
  body: CelestialBody
  position: HorizontalPosition
  /** Real apparent visual magnitude — scales how large/bright the planet's marker renders, the
   * same way star magnitude drives the starfield, so e.g. Venus reads as distinctly more
   * prominent than Saturn instead of both being identical dots. */
  magnitude: number
}

/** Everything needed to render one instant's sky: real Sun/Moon/planet positions (already
 * resolved by SceneElement via engine/astronomy/CelestialPositions.ts) plus the star catalog and
 * the date/observer needed to place its fixed RA/dec entries in the sky right now. `stars` is
 * undefined until the (lazily fetched) catalog asset has loaded — the sky renders without stars
 * until then. */
export interface SceneAstronomy {
  sun: HorizontalPosition & { magnitude: number }
  moon: HorizontalPosition & { phase: MoonPhase; magnitude: number }
  planets: ReadonlyArray<ScenePlanet>
  stars?: { catalog: StarCatalog; date: Date; observer: ObserverGeo }
}

/**
 * Renders the "decor" (sky, horizon, sun/moon/planets, stars) behind a sighting's 2D shape
 * layer — see SceneElement, which composites this underneath a transparent-background
 * <rr0-ufo>. A vertex-colored sky dome (now azimuth-aware, not just altitude-aware — see
 * skyColorForPosition), a flat haze-blended ground plane (an aeronautical horizon, not a literal
 * terrain), self-illuminated Sun/Moon/planet discs (no THREE.Light: astronomically the Sun isn't
 * "lit by" anything, and a self-illuminated MeshBasicMaterial disc is already visible without
 * one — see the milestone plan for why a real light is deliberately out of scope here), and a
 * real star field from a catalog once loaded.
 */
export class SceneRenderer {
  private readonly renderer: WebGLRenderer
  private readonly scene = new Scene()
  private readonly camera: PerspectiveCamera

  private skyMesh?: Mesh
  private groundMesh?: Mesh
  private starTiers: StarTier[] = []
  private readonly bodyMeshes = new Map<string, Mesh | Sprite>()
  /** Invisible (opacity 0), larger-than-the-real-disc proxies used only for pickBodyAt's hover/
   * click hit-testing — see HOVER_HIT_RADIUS_SCALE. Never rendered/visible, so this doesn't
   * change how anything looks, only how forgiving it is to point at. */
  private readonly hitAreas = new Map<string, Sprite>()
  /** Additive-blended glare halos — real ocular/lens dazzle around a very bright body, driven by
   * its true magnitude (see glareStrength in skyColors.ts). Only ever non-empty for the Sun,
   * a bright-enough Moon, or Venus at its historical brightest — everything else's glareStrength
   * is 0, so no sprite is built for it at all. */
  private readonly glareSprites = new Map<string, Sprite>()
  private compassSprites: Sprite[] = []
  private showCompass = false
  private animationFrameId: number | null = null
  private readonly raycaster = new Raycaster()

  constructor(canvas: HTMLCanvasElement) {
    this.renderer = new WebGLRenderer({ canvas, antialias: true })
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2))
    this.camera = new PerspectiveCamera(60, canvas.width / Math.max(canvas.height, 1), 0.1, SKY_RADIUS * 1.2)
    this.camera.position.set(0, 1.6, 0)
  }

  resize(width: number, height: number): void {
    this.renderer.setSize(width, height, false)
    this.camera.aspect = width / Math.max(height, 1)
    this.camera.updateProjectionMatrix()
    this.render()
  }

  /** Orients the camera to the observer's current heading/pitch/field of view — turning the
   * witness's head changes what part of the (fixed, real-world-positioned) sky is in view, it
   * never moves any of the sky/star/body positions themselves. `elevationM` nudges the camera's
   * own world-space height, since a witness standing higher up plausibly sees a lower horizon.
   * `headingDeg` undefined (unknown heading) leaves the camera's current yaw untouched rather
   * than snapping it to a default. */
  setObserverPose(pose: ObserverPose): void {
    if (pose.headingDeg !== undefined) {
      this.camera.rotation.set(pose.pitchDeg * DEG_TO_RAD, -pose.headingDeg * DEG_TO_RAD, 0, "YXZ")
    } else {
      this.camera.rotation.set(pose.pitchDeg * DEG_TO_RAD, this.camera.rotation.y, 0, "YXZ")
    }
    this.camera.position.y = 1.6 + pose.elevationM
    if (this.camera.fov !== pose.fovDeg) {
      this.camera.fov = pose.fovDeg
      this.camera.updateProjectionMatrix()
    }
  }

  /** Toggles the N/NE/E/SE/S/SO/O/NO horizon labels — a fixed compass reference, unrelated to
   * astronomy/time, so it's built once and left alone rather than rebuilt on every setAstronomy()
   * call the way the sky/stars are. */
  setShowCompass(show: boolean): void {
    if (this.showCompass === show) return
    this.showCompass = show
    this.disposeCompassLabels()
    if (show) this.buildCompassLabels()
    this.render()
  }

  setAstronomy(astronomy: SceneAstronomy): void {
    const groundColor = skyColorsForAltitude(astronomy.sun.altitudeDeg).horizon
    this.buildSky(astronomy.sun)
    this.buildGround(groundColor)
    this.buildStars(astronomy.stars, astronomy.sun.altitudeDeg)
    this.setBodyMesh("sun", astronomy.sun, SUN_MOON_VISUAL_RADIUS, new Color(1, 0.96, 0.88), astronomy.sun.magnitude)
    this.setMoonMesh(astronomy.moon)
    this.buildPlanets(astronomy.planets)
    this.scene.fog = new Fog(new Color(...groundColor), SKY_RADIUS * 0.2, SKY_RADIUS)
    this.render()
  }

  render(): void {
    this.renderer.render(this.scene, this.camera)
  }

  /** Finds which celestial body (if any) sits under normalized device coordinates (each in
   * [-1,1], as THREE.Raycaster.setFromCamera expects) — for hover/click identification, not
   * anything that changes rendering. Tests against the invisible, larger-than-the-real-disc
   * hitAreas (see HOVER_HIT_RADIUS_SCALE), not the tiny true-scale visible meshes themselves,
   * which would be impractical to point at exactly. Returns the same key setBodyMesh/setMoonMesh
   * were called with (e.g. "sun", "moon", "Venus"). */
  pickBodyAt(ndcX: number, ndcY: number): string | undefined {
    this.raycaster.setFromCamera(new Vector2(ndcX, ndcY), this.camera)
    const entries = [...this.hitAreas.entries()]
    const intersection = this.raycaster.intersectObjects(entries.map(([, sprite]) => sprite))[0]
    if (!intersection) return undefined
    return entries.find(([, sprite]) => sprite === intersection.object)?.[0]
  }

  dispose(): void {
    this.stopTwinkle()
    this.disposeMesh(this.skyMesh)
    this.disposeMesh(this.groundMesh)
    this.disposeStarTiers()
    for (const mesh of this.bodyMeshes.values()) {
      this.disposeMesh(mesh)
    }
    this.bodyMeshes.clear()
    for (const key of [...this.hitAreas.keys()]) {
      this.disposeHitArea(key)
    }
    for (const key of [...this.glareSprites.keys()]) {
      this.disposeGlare(key)
    }
    this.disposeCompassLabels()
    this.renderer.dispose()
  }

  /** Starts the atmospheric twinkle loop — idempotent, and a no-op with no stars built. Called
   * automatically by buildStars() whenever it builds a non-empty field; exposed so
   * SceneElement can still call stopTwinkle() on disconnect without needing its own timer. */
  startTwinkle(): void {
    if (this.animationFrameId !== null || this.starTiers.length === 0) return
    const tick = (timeMs: number) => {
      this.updateTwinkle(timeMs / 1000)
      this.render()
      this.animationFrameId = requestAnimationFrame(tick)
    }
    this.animationFrameId = requestAnimationFrame(tick)
  }

  stopTwinkle(): void {
    if (this.animationFrameId !== null) {
      cancelAnimationFrame(this.animationFrameId)
      this.animationFrameId = null
    }
  }

  private buildSky(sun: HorizontalPosition): void {
    this.disposeMesh(this.skyMesh)
    const geometry = new SphereGeometry(SKY_RADIUS, 32, 16)
    const position = geometry.attributes.position
    const colors: number[] = []
    for (let i = 0; i < position.count; i++) {
      const { altitudeDeg, azimuthDeg } = cartesianToHorizontal(position.getX(i), position.getY(i), position.getZ(i))
      const color = skyColorForPosition(altitudeDeg, azimuthDeg, sun.azimuthDeg, sun.altitudeDeg)
      colors.push(color[0], color[1], color[2])
    }
    geometry.setAttribute("color", new Float32BufferAttribute(colors, 3))
    const material = new MeshBasicMaterial({ vertexColors: true, side: BackSide, fog: false })
    this.skyMesh = new Mesh(geometry, material)
    this.scene.add(this.skyMesh)
  }

  private buildGround(horizon: [number, number, number]): void {
    this.disposeMesh(this.groundMesh)
    const geometry = new CircleGeometry(GROUND_RADIUS, 48)
    const groundColor = new Color(horizon[0] * 0.35, horizon[1] * 0.35, horizon[2] * 0.35)
    const material = new MeshBasicMaterial({ color: groundColor, fog: true })
    this.groundMesh = new Mesh(geometry, material)
    this.groundMesh.rotation.x = -Math.PI / 2
    this.groundMesh.position.y = -0.5
    this.scene.add(this.groundMesh)
  }

  /** Places (or updates) a single self-illuminated, true-to-scale disc mesh, keyed by name so
   * repeated calls (Sun each update, or one call per tracked planet) reuse/replace the same slot
   * instead of accumulating duplicates. Also places a matching invisible hitArea (see
   * HOVER_HIT_RADIUS_SCALE) and, when the body is bright enough, a real glare halo (see setGlare)
   * so it stays practical to hover/click despite being small, and reads with the same dazzle a
   * human witness would actually perceive. `color` is tinted by the body's own current altitude
   * (see atmosphericTint) before being applied, so it warms near the horizon the same way a real
   * low Sun/bright planet does — independent of the sky's own ambient color. */
  private setBodyMesh(key: string, position: HorizontalPosition, visualRadius: number, color: Color, magnitude: number): void {
    this.disposeMesh(this.bodyMeshes.get(key))
    this.disposeHitArea(key)
    this.disposeGlare(key)
    if (position.altitudeDeg < BODY_HIDE_BELOW_DEG) {
      // Well below the horizon: skip building a mesh at all rather than pay for geometry that
      // the opaque ground plane would occlude anyway.
      this.bodyMeshes.delete(key)
      return
    }
    const { x, y, z } = horizontalToCartesian(position.altitudeDeg, position.azimuthDeg, BODY_PLACEMENT_RADIUS)
    const tint = atmosphericTint(position.altitudeDeg)
    const tintedColor = new Color(color.r * tint[0], color.g * tint[1], color.b * tint[2])
    const geometry = new SphereGeometry(visualRadius, 16, 16)
    const material = new MeshBasicMaterial({ color: tintedColor, fog: false })
    const mesh = new Mesh(geometry, material)
    mesh.position.set(x, y, z)
    this.scene.add(mesh)
    this.bodyMeshes.set(key, mesh)
    this.setHitArea(key, x, y, z, visualRadius)
    this.setGlare(key, x, y, z, magnitude, tintedColor)
  }

  /** The Moon needs a real crescent/gibbous *shape*, not just a dimmed flat color — a sphere lit
   * from an arbitrary angle can't produce that without a real light (deliberately out of scope,
   * see this class's own doc comment), so it's a camera-facing Sprite with a procedurally-drawn
   * phase texture instead (see createMoonPhaseTexture) — accurate for how the Moon actually looks
   * from Earth (its phase doesn't meaningfully depend on the camera's viewing angle around it).
   * `material.color` (which multiplies against the texture) carries the same altitude-based
   * atmospheric tint as setBodyMesh, so a low Moon reddens the same way a real moonrise does. */
  private setMoonMesh(position: HorizontalPosition & { phase: MoonPhase; magnitude: number }): void {
    const key = "moon"
    this.disposeMesh(this.bodyMeshes.get(key))
    this.disposeHitArea(key)
    this.disposeGlare(key)
    if (position.altitudeDeg < BODY_HIDE_BELOW_DEG) {
      this.bodyMeshes.delete(key)
      return
    }
    const { x, y, z } = horizontalToCartesian(position.altitudeDeg, position.azimuthDeg, BODY_PLACEMENT_RADIUS)
    const tint = atmosphericTint(position.altitudeDeg)
    const tintColor = new Color(tint[0], tint[1], tint[2])
    const material = new SpriteMaterial({ map: createMoonPhaseTexture(position.phase), color: tintColor, fog: false })
    const sprite = new Sprite(material)
    sprite.position.set(x, y, z)
    const diameter = SUN_MOON_VISUAL_RADIUS * 2
    sprite.scale.set(diameter, diameter, 1)
    this.scene.add(sprite)
    this.bodyMeshes.set(key, sprite)
    this.setHitArea(key, x, y, z, SUN_MOON_VISUAL_RADIUS)
    this.setGlare(key, x, y, z, position.magnitude, tintColor)
  }

  private setHitArea(key: string, x: number, y: number, z: number, visualRadius: number): void {
    const material = new SpriteMaterial({ transparent: true, opacity: 0, depthTest: false, depthWrite: false, fog: false })
    const hitArea = new Sprite(material)
    hitArea.position.set(x, y, z)
    const size = visualRadius * HOVER_HIT_RADIUS_SCALE
    hitArea.scale.set(size, size, 1)
    this.scene.add(hitArea)
    this.hitAreas.set(key, hitArea)
  }

  private disposeHitArea(key: string): void {
    const hitArea = this.hitAreas.get(key)
    if (!hitArea) return
    this.scene.remove(hitArea)
    hitArea.material.dispose()
    this.hitAreas.delete(key)
  }

  /** Builds (or removes) a body's additive-blended glare halo — see glareStrength's own doc
   * comment in skyColors.ts for why this is a realism concern, not an artistic one. A no-op
   * (removes any existing halo and returns) whenever the body isn't bright enough to produce real
   * glare at all, which is true for every ordinary star/planet. `color` is the body's own already
   * atmosphere-tinted color, so the halo warms near the horizon along with the disc itself. */
  private setGlare(key: string, x: number, y: number, z: number, magnitude: number, color: Color): void {
    this.disposeGlare(key)
    const strength = glareStrength(magnitude)
    if (strength <= 0) return
    const radius = glareRadius(strength)
    const material = new SpriteMaterial({
      map: getGlareTexture(),
      color,
      transparent: true,
      opacity: glareOpacity(strength),
      blending: AdditiveBlending,
      depthWrite: false,
      fog: false
    })
    const sprite = new Sprite(material)
    sprite.position.set(x, y, z)
    sprite.scale.set(radius * 2, radius * 2, 1)
    this.scene.add(sprite)
    this.glareSprites.set(key, sprite)
  }

  private disposeGlare(key: string): void {
    const sprite = this.glareSprites.get(key)
    if (!sprite) return
    this.scene.remove(sprite)
    sprite.material.dispose()
    this.glareSprites.delete(key)
  }

  private buildPlanets(planets: ReadonlyArray<ScenePlanet>): void {
    const seen = new Set<string>(["sun", "moon"])
    for (const planet of planets) {
      seen.add(planet.body)
      const brightness = magnitudeToBrightness(planet.magnitude)
      const scale = starColorScale(brightness)
      const baseColor = PLANET_COLORS[planet.body] ?? new Color(1, 1, 1)
      const color = new Color(baseColor.r * scale, baseColor.g * scale, baseColor.b * scale)
      const radius = PLANET_VISUAL_RADIUS * (0.5 + 0.5 * brightness)
      this.setBodyMesh(planet.body, planet.position, radius, color, planet.magnitude)
    }
    for (const key of [...this.bodyMeshes.keys()]) {
      if (!seen.has(key)) {
        this.disposeMesh(this.bodyMeshes.get(key))
        this.bodyMeshes.delete(key)
        this.disposeHitArea(key)
        this.disposeGlare(key)
      }
    }
  }

  /** Builds the real star field: filters the catalog to what's actually visible right now (above
   * the horizon, and brighter than visibleMagnitudeLimit's sky-glare threshold), transforms each
   * surviving star's fixed RA/dec to today's alt/az via equatorialToHorizontal, and buckets by
   * magnitudeToBrightness into the same size tiers/twinkle machinery as before — only the source
   * of positions/brightness changed, not how they're rendered. */
  private buildStars(stars: SceneAstronomy["stars"], sunAltitudeDeg: number): void {
    this.disposeStarTiers()
    if (!stars || stars.catalog.count === 0) {
      this.stopTwinkle()
      return
    }
    const { catalog, date, observer } = stars
    const magnitudeLimit = visibleMagnitudeLimit(sunAltitudeDeg)
    // Seeds only the twinkle jitter now (real positions/brightness come from the catalog) — kept
    // deterministic so a star's twinkle phase doesn't jump around between renders.
    const jitterRandom = mulberry32(1337)

    const visibleStars: { x: number; y: number; z: number; brightness: number; phase: number; speedFactor: number }[] = []
    for (let i = 0; i < catalog.count; i++) {
      const mag = catalog.mag[i]
      if (mag > magnitudeLimit) continue
      const { altitudeDeg, azimuthDeg } = equatorialToHorizontal(catalog.ra[i], catalog.dec[i], date, observer)
      if (altitudeDeg < BELOW_HORIZON_CUTOFF_DEG) continue
      const { x, y, z } = horizontalToCartesian(altitudeDeg, azimuthDeg, STAR_RADIUS)
      visibleStars.push({
        x,
        y,
        z,
        brightness: magnitudeToBrightness(mag),
        phase: jitterRandom() * Math.PI * 2,
        speedFactor: 0.7 + jitterRandom() * 0.6
      })
    }

    this.starTiers = STAR_BRIGHTNESS_TIERS.map((tier, tierIndex) => {
      const tierStars = visibleStars.filter(star => starBrightnessTierIndex(star.brightness) === tierIndex)
      const positions = new Float32Array(tierStars.length * 3)
      const brightness = new Float32Array(tierStars.length)
      const phase = new Float32Array(tierStars.length)
      const speedFactor = new Float32Array(tierStars.length)
      tierStars.forEach((star, i) => {
        positions[i * 3] = star.x
        positions[i * 3 + 1] = star.y
        positions[i * 3 + 2] = star.z
        brightness[i] = star.brightness
        phase[i] = star.phase
        speedFactor[i] = star.speedFactor
      })
      const geometry = new BufferGeometry()
      geometry.setAttribute("position", new BufferAttribute(positions, 3))
      const colorAttribute = new BufferAttribute(new Float32Array(tierStars.length * 3), 3)
      geometry.setAttribute("color", colorAttribute)
      const material = new PointsMaterial({ vertexColors: true, size: tier.size, sizeAttenuation: false, fog: false })
      const points = new Points(geometry, material)
      this.scene.add(points)
      return { points, colorAttribute, brightness, phase, speedFactor }
    })
    // Populates real initial colors synchronously (single source of truth for the color
    // formula — see updateTwinkle) before the very first render(), which setAstronomy() calls
    // right after buildStars() returns — otherwise that first frame would show default black.
    this.updateTwinkle(0)
    this.startTwinkle()
  }

  /** Rewrites each star tier's per-vertex color buffer for the current time — the CPU-side
   * "twinkle": no shader needed at these star counts (a few thousand Math.sin calls and a
   * small buffer re-upload per frame, well under a millisecond of work). */
  private updateTwinkle(timeSeconds: number): void {
    for (const tier of this.starTiers) {
      const colors = tier.colorAttribute.array as Float32Array
      for (let i = 0; i < tier.brightness.length; i++) {
        const intensity = twinkleIntensity(
          tier.brightness[i],
          { phase: tier.phase[i], speedFactor: tier.speedFactor[i] },
          timeSeconds
        )
        const scale = starColorScale(tier.brightness[i]) * intensity
        colors[i * 3] = scale
        colors[i * 3 + 1] = scale
        colors[i * 3 + 2] = scale
      }
      tier.colorAttribute.needsUpdate = true
    }
  }

  private buildCompassLabels(): void {
    this.compassSprites = COMPASS_DIRECTIONS.map(({ azimuthDeg, label }) => {
      // depthTest/fog off: these are a fixed HUD-like reference, not part of the astronomically
      // positioned scene — they should read clearly against the sky/fog regardless of altitude.
      const material = new SpriteMaterial({ map: createCompassLabelTexture(label), depthTest: false, fog: false })
      const sprite = new Sprite(material)
      const { x, y, z } = horizontalToCartesian(0, azimuthDeg, COMPASS_PLACEMENT_RADIUS)
      sprite.position.set(x, y, z)
      sprite.scale.set(COMPASS_SPRITE_SIZE, COMPASS_SPRITE_SIZE, 1)
      this.scene.add(sprite)
      return sprite
    })
  }

  private disposeCompassLabels(): void {
    for (const sprite of this.compassSprites) {
      this.scene.remove(sprite)
      sprite.material.map?.dispose()
      sprite.material.dispose()
    }
    this.compassSprites = []
  }

  private disposeStarTiers(): void {
    for (const tier of this.starTiers) {
      this.disposeMesh(tier.points)
    }
    this.starTiers = []
  }

  /** Sprite has no `.geometry` of its own (three.js shares one internally, not ours to dispose) —
   * only its material (and, for Sprites we built with a per-instance texture, that texture) needs
   * cleanup. */
  private disposeMesh(object?: Mesh | Points | Sprite): void {
    if (!object) return
    this.scene.remove(object)
    if ("geometry" in object) {
      object.geometry.dispose()
    }
    const material = object.material as Material | Material[]
    if (Array.isArray(material)) {
      material.forEach(m => m.dispose())
    } else {
      material.dispose()
    }
  }
}

const DEG_TO_RAD = Math.PI / 180

function clamp(value: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, value))
}

let sharedGlareTexture: CanvasTexture | undefined

/** One shared soft radial-gradient sprite texture for every body's glare halo (see setGlare) —
 * unlike the Moon's phase texture, its drawn content never differs between bodies/instants, only
 * the SpriteMaterial's own color/scale/opacity do, so a single cached canvas suffices instead of
 * generating one per body per update. */
function getGlareTexture(): CanvasTexture {
  if (sharedGlareTexture) return sharedGlareTexture
  const size = 128
  const canvas = document.createElement("canvas")
  canvas.width = size
  canvas.height = size
  const context = canvas.getContext("2d")!
  const gradient = context.createRadialGradient(size / 2, size / 2, 0, size / 2, size / 2, size / 2)
  gradient.addColorStop(0, "rgba(255,255,255,1)")
  gradient.addColorStop(0.4, "rgba(255,255,255,0.35)")
  gradient.addColorStop(1, "rgba(255,255,255,0)")
  context.fillStyle = gradient
  context.fillRect(0, 0, size, size)
  sharedGlareTexture = new CanvasTexture(canvas)
  return sharedGlareTexture
}

/**
 * Draws the Moon's real crescent/gibbous silhouette (not just a dimmed flat disc) using the
 * standard two-arc terminator technique: a fixed half-circle for the permanently-facing-the-
 * illuminated-side edge, and an ellipse (whose width tracks illuminatedFraction) for the other,
 * curved edge — concave for a crescent (illuminatedFraction < 0.5), convex for a gibbous (> 0.5).
 * `phaseFraction < 0.5` (waxing, i.e. growing toward full) picks which side is lit; real accuracy
 * of *which compass direction* the bright limb faces (a function of the Sun-Moon-observer
 * geometry, not just waxing/waning) is a further-out follow-up, not attempted here.
 */
function createMoonPhaseTexture(phase: MoonPhase): CanvasTexture {
  const size = 128
  const canvas = document.createElement("canvas")
  canvas.width = size
  canvas.height = size
  const context = canvas.getContext("2d")!
  const r = size / 2 - 2
  const cx = size / 2
  const cy = size / 2
  const DARK = "#2e2b26"
  const LIGHT = "#f4f1e2"

  context.fillStyle = DARK
  context.beginPath()
  context.arc(cx, cy, r, 0, Math.PI * 2)
  context.fill()

  const k = clamp(phase.illuminatedFraction, 0, 1)
  const waxing = phase.phaseFraction < 0.5
  const rx = r * Math.abs(1 - 2 * k)
  const crescent = k < 0.5

  context.save()
  context.beginPath()
  context.arc(cx, cy, r, 0, Math.PI * 2)
  context.clip()
  context.fillStyle = LIGHT
  context.beginPath()
  if (waxing) {
    context.arc(cx, cy, r, -Math.PI / 2, Math.PI / 2, false)
    context.ellipse(cx, cy, rx, r, 0, Math.PI / 2, -Math.PI / 2, crescent)
  } else {
    context.arc(cx, cy, r, Math.PI / 2, -Math.PI / 2, false)
    context.ellipse(cx, cy, rx, r, 0, -Math.PI / 2, Math.PI / 2, crescent)
  }
  context.fill()
  context.restore()

  return new CanvasTexture(canvas)
}

/** Procedurally draws a compass direction label (e.g. "NE") onto a small canvas, the same way
 * everything else in this renderer is generated rather than loaded from an image/font asset. A
 * translucent dark disc behind the text keeps it legible against both a bright day sky and a dark
 * night one. */
function createCompassLabelTexture(label: string): CanvasTexture {
  const canvas = document.createElement("canvas")
  canvas.width = 128
  canvas.height = 128
  const context = canvas.getContext("2d")!
  context.fillStyle = "rgba(0, 0, 0, 0.55)"
  context.beginPath()
  context.arc(64, 64, 60, 0, Math.PI * 2)
  context.fill()
  context.fillStyle = "#ffffff"
  context.font = "bold 52px sans-serif"
  context.textAlign = "center"
  context.textBaseline = "middle"
  context.fillText(label, 64, 68)
  return new CanvasTexture(canvas)
}

/** Small deterministic PRNG (no dependency) so star twinkle jitter looks the same across re-renders. */
function mulberry32(seed: number): () => number {
  let a = seed
  return function random(): number {
    a |= 0
    a = (a + 0x6d2b79f5) | 0
    let t = Math.imul(a ^ (a >>> 15), 1 | a)
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
}
