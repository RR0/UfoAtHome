import { DirectionalLight, PointLight, type Object3D, Vector3 } from "three"

/**
 * Something that gives out light near enough to light what is round it from where it is: a sky lantern, a craft's flame. What it is, where
 * it is and how much it gives, nothing about how it is drawn.
 */
export interface NearEmitter {
  /** Where its light comes from, in the scene. */
  readonly position: Vector3
  /** Its luminous intensity, candela: its luminance times the area it shows. */
  readonly candela: number
  /** The colour of its light, any scale (only the hue is kept). */
  readonly colour: readonly [number, number, number]
}

/**
 * Something that gives out light from so far that only its direction and the light it gives the observer count: a bolide, a re-entry, a
 * hundred kilometres up. It lights the ground as the Moon does.
 */
export interface FarEmitter {
  /** Towards it, from the observer, a unit vector in the scene. */
  readonly direction: Vector3
  /** The illuminance it gives at the observer, lux, per channel, through the air already. */
  readonly lux: readonly [number, number, number]
  /** Where it is in the sky and its magnitude above the air: what the sky is lit with (see ScatteredSkyState.flare). */
  readonly sky: { readonly altitudeDeg: number; readonly azimuthDeg: number; readonly magnitude: number }
}

/** The box a far light's shadow is drawn in, as the Sun's is: half its side and half its depth, metres, the bias, and the map's side. */
export interface FarShadow {
  readonly halfExtentM: number
  readonly depthHalfRangeM: number
  readonly biasM: number
  readonly normalBiasM: number
  readonly mapSize: number
}

/**
 * Every light in the scene that is not the sky's, the Sun's or the Moon's: what gives out light lights what is round it, whatever it is,
 * without anybody having to say so.
 *
 * A renderer such as three.js draws a luminous surface luminous but lights nothing with it: only its lights light. So every system that
 * draws something luminous used to need a light of its own, wired by hand, and one that was not wired lit nothing: a lantern let go from a
 * terrace drew orange and left the terrace dark. Here each such system states what it gives out (see set), and all of it is lit by one
 * pool of lights: point lights for what is near, given to the ones that light the observer most, and directional ones for what is far.
 * EmitterLights.SYSTEMS says, for every system that draws, how its light reaches the scene, and a test holds every system to saying it.
 * What states its light here is kept out of the photograph the eye's probe takes of the surroundings (see SceneRenderer.refreshReflections):
 * photographed as well, it would light the scene a second time, spread round the observer.
 *
 * The pools are a fixed number of lights, built once, the first time anything glows, and never taken out of the scene again but put out:
 * three.js compiles every material for the number of lights, and a light that came and went would recompile the scene each time.
 *
 * The brightest far emitter also lights the sky (see brightestInSky and ScatteredSky): the air scatters its light as it does the Sun's.
 *
 * The brightest far emitter casts a shadow, as the Sun does: a far light is a directional one, so its shadow is the scene drawn once more,
 * not six times as a point light's is — and a bolide brighter than the Sun swings every shadow round as it crosses the sky (Chelyabinsk). Its
 * shadow is always there, for the same reason as the lights (turning one on recompiles the scene), but drawn only while something far is
 * alight. The near ones cast none yet: each would be a cube of six more drawings.
 */
export class EmitterLights {
  /** How many near emitters light the scene at once: the ones that light the observer most. Past them, a further one lights it a hundredth as much. */
  static readonly NEAR = 4
  /** How many far ones: a bolide and a re-entry at the same instant is already rare. */
  static readonly FAR = 2
  /** How far off a far emitter's light is put, in the direction it comes from: past anything it lights. */
  private static readonly FAR_DISTANCE = 1000

  /**
   * How every system that draws reaches the scene with its light, by its file name: "emitters" when it states its emitters here, otherwise
   * why not. A system that draws and is not here fails the test that holds this list (EmitterLights.test).
   */
  static readonly SYSTEMS: Readonly<Record<string, string>> = {
    BodySystem: "emitters: the bodies that glow whole, the named lights of a model (a craft's lights), and their flames",
    MeteorSystem: "emitters: the heads of meteors, far, from their magnitude",
    ReentrySystem: "emitters: the heads of re-entries, far, from their magnitude",
    PhenomenonSystem: "none yet: a phenomenon states no luminance, only a colour as seen and a 0..1 dazzle, which say nothing of the light it gives",
    BeamSystem: "none: a laser beam is a thread of scattered light, too faint to light the ground; where it ends lit is in the sky",
    PlumeSystem: "none: a launch plume is lit by the Sun, it gives out no light of its own",
    CloudSystem: "none: clouds are lit, they do not give out light",
    LayeredCloudSystem: "none: clouds are lit, they do not give out light",
    DecorSystem: "own lights: the streetlamps, with shadows for the nearest (SceneRenderer.addStreetlightLight); NOT YET its lesser lamps (traffic lights, a car's rear lights), drawn lit but lighting nothing",
    RoadSystem: "own lights: the lamps it places along a street are the decor's streetlamps (see DecorSystem)",
    RailwaySystem: "none: rails mirror the lamps, they give out no light",
    ContrailSystem: "none: a contrail is lit by the Sun, it gives out no light",
    WaterSystem: "none: water mirrors, it gives out no light",
    TraceSystem: "none: a trace on the ground is lit, it gives out no light",
    ReferenceSystem: "none: a photograph laid over the scene, not in it",
    HeadlightSystem: "own lights: a vehicle's headlamps are spot lights, aimed",
    FlameEffect: "emitters: through BodySystem, which states each flame",
    LensFlareEffect: "none: a dazzle in the eye, nothing in the world",
    IceHaloEffect: "none: sunlight bent by ice, seen, not cast on the ground",
    RainbowEffect: "none: sunlight bent by drops, seen, not cast on the ground",
    SkyGlowEffect: "none: the Milky Way and the zodiacal light are in the sky's own light (ScatteredSky)",
    RainSystem: "none: rain gives out no light",
    SatelliteField: "none: a satellite is a speck of reflected sunlight, far too faint to light anything"
  }

  private near?: PointLight[]
  private far?: DirectionalLight[]
  private readonly nearBy = new Map<string, readonly NearEmitter[]>()
  private readonly farBy = new Map<string, readonly FarEmitter[]>()

  /**
   * @param parent Where the lights are put: the scene.
   * @param sceneUnitsPerLux What a lux of illuminance is in this scene's own light units (see SceneRenderer.relativeScale): a candela at a metre.
   * @param shadow The box the brightest far light's shadow is drawn in, round the observer, as the Sun's (see SceneRenderer).
   */
  constructor(private readonly parent: Object3D, private readonly sceneUnitsPerLux: () => number, private readonly shadow: FarShadow = EmitterLights.NO_SHADOW) {}

  /** No shadow box: what a scene with nothing to cast or receive one passes (and a test). */
  static readonly NO_SHADOW: FarShadow = { halfExtentM: 0, depthHalfRangeM: 0, biasM: 0, normalBiasM: 0, mapSize: 0 }

  /** What `source` gives out now, replacing what it gave before: kept until it says otherwise, whatever the frames drawn meanwhile. */
  set(source: string, near: readonly NearEmitter[], far: readonly FarEmitter[] = []): void {
    this.nearBy.set(source, near.filter(emitter => emitter.candela > 0))
    this.farBy.set(source, far.filter(emitter => Math.max(...emitter.lux) > 0))
  }

  /** Lights the scene with what every source gives out, the near ones that light `eye` most first. */
  cast(eye: Vector3 | undefined): void {
    const near = [...this.nearBy.values()].flat()
    const far = [...this.farBy.values()].flat()
    const perLux = this.sceneUnitsPerLux()
    if (near.length > 0 || this.near) {
      this.near ??= this.build(EmitterLights.NEAR, () => new PointLight(0xffffff, 0, 0, 2))
      const atEye = (emitter: NearEmitter) => eye ? emitter.candela / Math.max(emitter.position.distanceToSquared(eye), 1e-6) : emitter.candela
      const ranked = near.sort((a, b) => atEye(b) - atEye(a))
      this.near.forEach((light, index) => {
        const emitter = ranked[index]
        if (!emitter) {
          light.intensity = 0
          return
        }
        light.position.copy(emitter.position)
        const luminance = EmitterLights.luminanceOf(emitter.colour)
        light.color.setRGB(emitter.colour[0] / luminance, emitter.colour[1] / luminance, emitter.colour[2] / luminance)
        light.intensity = emitter.candela * perLux
      })
    }
    if (far.length > 0 || this.far) {
      this.far ??= this.buildFar()
      const ranked = far.sort((a, b) => EmitterLights.luminanceOf(b.lux) - EmitterLights.luminanceOf(a.lux))
      this.far.forEach((light, index) => {
        const emitter = ranked[index]
        // Its shadow drawn only while it lights anything.
        if (light.castShadow) light.shadow.autoUpdate = emitter !== undefined
        if (!emitter) {
          light.intensity = 0
          return
        }
        light.position.copy(emitter.direction).multiplyScalar(EmitterLights.FAR_DISTANCE).add(eye ?? EmitterLights.ORIGIN)
        light.target.position.copy(eye ?? EmitterLights.ORIGIN)
        light.target.updateMatrixWorld()
        const luminance = EmitterLights.luminanceOf(emitter.lux)
        light.color.setRGB(emitter.lux[0] / luminance, emitter.lux[1] / luminance, emitter.lux[2] / luminance)
        light.intensity = luminance * perLux
      })
    }
  }

  /**
   * How bright, magnitude above the air, a far emitter has to be to light the sky: past it, its sky is fainter than a moonless night's
   * own glow, and drawing it again as it moves would cost a frame something for nothing to see.
   */
  static readonly SKY_LIGHTING_MAGNITUDE = -8

  /** Every far emitter now stated, whatever its source. */
  get farEmitters(): readonly FarEmitter[] {
    return [...this.farBy.values()].flat()
  }

  /** The brightest far emitter, as the sky sees it, if it is bright enough to light it (see SKY_LIGHTING_MAGNITUDE). */
  get brightestInSky(): FarEmitter["sky"] | undefined {
    let brightest: FarEmitter["sky"] | undefined
    for (const emitter of [...this.farBy.values()].flat()) {
      if (emitter.sky.magnitude < (brightest?.magnitude ?? EmitterLights.SKY_LIGHTING_MAGNITUDE)) brightest = emitter.sky
    }
    return brightest
  }

  /** The lights, for what has to leave them out (none until something glowed). */
  get all(): readonly (PointLight | DirectionalLight)[] {
    return [...(this.near ?? []), ...(this.far ?? [])]
  }

  /** The far lights, the first of which (the brightest, once ranked) casts the shadow. */
  private buildFar(): DirectionalLight[] {
    const lights = this.build(EmitterLights.FAR, () => new DirectionalLight(0xffffff, 0))
    const box = this.shadow
    if (box.mapSize > 0) {
      const shadow = lights[0].shadow
      lights[0].castShadow = true
      shadow.mapSize.set(box.mapSize, box.mapSize)
      const camera = shadow.camera
      camera.left = -box.halfExtentM
      camera.right = box.halfExtentM
      camera.top = box.halfExtentM
      camera.bottom = -box.halfExtentM
      camera.near = EmitterLights.FAR_DISTANCE - box.depthHalfRangeM
      camera.far = EmitterLights.FAR_DISTANCE + box.depthHalfRangeM
      camera.updateProjectionMatrix()
      shadow.bias = -box.biasM / (2 * box.depthHalfRangeM)
      shadow.normalBias = box.normalBiasM
      shadow.autoUpdate = false
    }
    return lights
  }

  private build<T extends PointLight | DirectionalLight>(count: number, make: () => T): T[] {
    return Array.from({ length: count }, () => {
      const light = make()
      light.name = "emitter-light"
      this.parent.add(light)
      if (light instanceof DirectionalLight) this.parent.add(light.target)
      return light
    })
  }

  private static luminanceOf(rgb: readonly [number, number, number]): number {
    return 0.2126 * rgb[0] + 0.7152 * rgb[1] + 0.0722 * rgb[2] || 1
  }

  private static readonly ORIGIN = new Vector3()
}
