import { Color, CustomBlending, Mesh, NormalBlending, OneFactor, OneMinusSrcAlphaFactor, Vector3 } from "three"
import type { Group, ShaderMaterial, SphereGeometry } from "three"
import type { CloudInstance, CloudLayer } from "../engine/model/CloudLayer.js"
import { resolveCloudLayers } from "../engine/model/CloudLayer.js"
import type { CloudPick } from "./CloudManipulation.js"
import type { Weather } from "../engine/model/Weather.js"
import { buildCloudGeometry, buildCloudMaterial, CloudField } from "./CloudSystem.js"
import type { CloudUniforms } from "./CloudSystem.js"
import { CLOUD_EARTH_RADIUS_M, cloudSeed, createCloudNoise, VolumetricCloudLayer } from "./VolumetricClouds.js"
import { RainbowEffect } from "./RainbowEffect.js"
import type { IceHaloEffect } from "./IceHaloEffect.js"

export type CloudRendering = "surface" | "volume"
type Deck = { layer: CloudLayer; parentId: string; instance?: CloudInstance; volume?: VolumetricCloudLayer; surface?: Mesh<SphereGeometry, ShaderMaterial>; uniforms?: CloudUniforms }

/** Owns a stable render object per layer. Timeline interpolation only changes uniforms. */
export class LayeredCloudSystem {
  private readonly decks = new Map<string, Deck>()
  private noise?: ReturnType<typeof createCloudNoise>
  private halo?: IceHaloEffect

  constructor(private readonly group: Group, private readonly radius: number, private readonly mode: CloudRendering) {}

  update(weather: Weather, eyeM: number): void {
    const layers = resolveCloudLayers(weather).flatMap(sourceLayer => {
      const layer = { ...sourceLayer, darkness: sourceLayer.darkness ?? weather.cloudDarkness }
      return [
      { layer, parentId: layer.id, key: JSON.stringify([layer.id]), instance: undefined as CloudInstance | undefined },
      // An individual cloud is a piece of its layer's field — the layer's type, noise scale, seed
      // and coverage threshold, so that it is one of its neighbours and not a mass of another
      // texture set among them (see VolumetricClouds' densityAt). Its own are where it stands, its
      // base and thickness, its density and its darkness.
      ...(layer.instances ?? []).map(instance => ({ parentId: layer.id, key: JSON.stringify([layer.id, instance.id]), instance,
        layer: { ...layer, id: `${layer.id}/${instance.id}`, baseM: instance.baseM, thicknessM: instance.thicknessM,
          density: instance.density, darkness: instance.darkness ?? layer.darkness,
          seed: instance.seed ?? cloudSeed(layer), instances: undefined } }))
    ]})
    const wanted = new Set(layers.map(entry => entry.key))
    for (const [id, deck] of this.decks) if (!wanted.has(id)) {
      this.disposeDeck(deck)
      this.decks.delete(id)
    }
    // Back-to-front for disjoint layers. Overlapping volumes require joint integration in a later pass.
    const sorted = [...layers].sort((a, b) => Math.abs(b.layer.baseM + b.layer.thicknessM / 2 - eyeM) - Math.abs(a.layer.baseM + a.layer.thicknessM / 2 - eyeM))
    sorted.forEach(({ layer, key, instance, parentId }, index) => {
      // Explicit masses are volumes in both comparison modes — and so is a layer that holds any,
      // whatever the mode: a volume set among a surface's flat texture is a thing of another kind
      // (which is exactly how the catalogue page, which never asks for volumes, showed it).
      const volumetric = instance !== undefined
        || (layer.type !== "cirrus" && (this.mode === "volume" || (layer.instances?.length ?? 0) > 0))
      let deck = this.decks.get(key)
      if (deck && !!deck.volume !== volumetric) {
        this.disposeDeck(deck)
        this.decks.delete(key)
        deck = undefined
      }
      if (!deck) {
        deck = { layer, parentId, instance }
        if (volumetric) {
          this.noise ??= createCloudNoise()
          deck.volume = new VolumetricCloudLayer(this.noise, this.radius)
          this.group.add(deck.volume.mesh)
        } else {
          const built = buildCloudMaterial(new Color(1, 1, 1), layer.coverage, Math.max(1, Math.abs(layer.baseM - eyeM) * 0.25 * 1400 / Math.max(50, layer.sizeM)), layer.type === "cirrus" ? 1 : 0)
          deck.uniforms = built.uniforms
          deck.surface = new Mesh(buildCloudGeometry(this.radius), built.material)
          this.group.add(deck.surface)
        }
        this.decks.set(key, deck)
      }
      deck.layer = layer
      deck.instance = instance
      const order = LayeredCloudSystem.deckOrder(layer.baseM < eyeM, index, layers.length)
      if (deck.volume) {
        // A layer's deck leaves room for its own individual clouds, each drawn by its own deck.
        deck.volume.update(layer, eyeM, instance, instance ? [] : layer.instances ?? [])
        deck.volume.mesh.renderOrder = order
      }
      if (deck.surface && deck.uniforms) {
        deck.surface.renderOrder = order
        deck.surface.scale.y = layer.baseM < eyeM ? -1 : 1
        deck.surface.visible = layer.coverage > 0 && layer.density > 0
        deck.uniforms.coverage.value = layer.coverage
        deck.uniforms.opticalDensity.value = layer.type === "cirrus" ? layer.density / 0.35 : layer.density
        deck.uniforms.darkness.value = Math.max(0, Math.min(1, layer.darkness ?? weather.cloudDarkness))
        deck.uniforms.layerHeight.value = Math.max(1, Math.abs(layer.baseM - eyeM) * 0.25 * 1400 / Math.max(50, layer.sizeM))
        deck.uniforms.fibrous.value = layer.type === "cirrus" ? 1 : 0
      }
    })
    // The strongest ice deck may be another one now, or a new one.
    if (this.halo) this.hostHalo(this.halo)
  }

  /**
   * Has the ice deck an ice display is refracted through draw that display itself — see
   * IceHaloEffect.hosted for why. The deck is the one the display is masked by (cirrusMask): the
   * strongest cirrus. Without one, the display keeps drawing itself.
   *
   * Drawn in the same drawing as the veil, the display has to be added as light and the veil laid
   * over it at once, which PREMULTIPLIED blending does: `veil·α + display·(1 − α) + behind·(1 − α)`
   * is what the display drawn first and the veil laid over it gave. The one difference is what was
   * drawn between the two: the stars and the Sun's and Moon's discs now lie under the display's
   * light, as they lie behind the crystals that make it, where before they covered it.
   */
  hostHalo(halo: IceHaloEffect | undefined): void {
    this.halo = halo
    const host = halo ? this.cirrusDeck : undefined
    for (const deck of this.decks.values()) {
      if (deck.surface) LayeredCloudSystem.carryHalo(deck.surface.material, deck === host ? halo : undefined)
    }
    if (halo) halo.hosted = host !== undefined
  }

  private static carryHalo(material: ShaderMaterial, halo: IceHaloEffect | undefined): void {
    const uniforms = material.uniforms
    if (halo) {
      if (uniforms.uHaloShown === halo.deckUniforms.uHaloShown) return
      Object.assign(uniforms, halo.deckUniforms)
      uniforms.uPremultiplied.value = 1
      material.blending = CustomBlending
      material.blendSrc = material.blendSrcAlpha = OneFactor
      material.blendDst = material.blendDstAlpha = OneMinusSrcAlphaFactor
    } else {
      if (uniforms.uPremultiplied.value === 0) return
      uniforms.uHaloShown = { value: 0 }
      uniforms.uPremultiplied.value = 0
      material.blending = NormalBlending
    }
  }

  /**
   * Where a deck sits among the sky's transparent draws. Decks above the eye stand behind the
   * rainbow, which is rain fallen from them; a deck below the eye stands between the eye and that
   * rain, and is drawn over the bow — see RainbowEffect.RENDER_ORDER. Within each group the layers
   * keep the timeline's own order, and every deck stays under the precipitation (6).
   */
  static deckOrder(belowEye: boolean, index: number, count: number): number {
    const rank = index / Math.max(1, count)
    return belowEye ? RainbowEffect.RENDER_ORDER + 0.1 + 0.3 * rank : 4 + rank
  }

  setOffsets(globalM: { x: number; z: number }, layersM: Record<string, { x: number; z: number }>): void {
    for (const deck of this.decks.values()) {
      const offset = layersM[deck.parentId] ?? globalM
      deck.volume?.uniforms.offsetM.value.set(offset.x, 0, offset.z)
      const scale = 0.25 * 1400 / Math.max(50, deck.layer.sizeM)
      const seed = cloudSeed(deck.layer)
      deck.uniforms?.fieldOffset.value.set(offset.x * scale + seed % 97, 0, offset.z * scale + seed % 37)
    }
  }

  /**
   * How much of the Sun a cloud `heightM` above the ground sees, from 0 (set for it) to 1.
   *
   * NOT the sine of the Sun's altitude: that is how much light a horizontal ground takes, and a
   * cloud's side faces the Sun whatever its height. Scaled by it, a setting Sun lit Valensole's
   * clouds with 3% of its light, and they were one flat brown on the side facing it as on the other.
   * What really takes a low Sun away from a cloud is the Earth's own curve: from its height the
   * horizon dips (a degree at a kilometre), so a cloud keeps its sunset glow after the ground has
   * lost it. The fade spans the disc (0.27°) and the horizon refraction (0.57°).
   */
  static sunVisibility(sunAltitudeDeg: number, heightM: number): number {
    const dipDeg = Math.acos(CLOUD_EARTH_RADIUS_M / (CLOUD_EARTH_RADIUS_M + Math.max(0, heightM))) * 180 / Math.PI
    const t = Math.min(1, Math.max(0, (sunAltitudeDeg + dipDeg + 0.84) / 1.14))
    return t * t * (3 - 2 * t)
  }

  /** `sunlight` is the Sun's colour on a surface facing it, NOT scaled by its altitude: each deck
   * takes from it what its own height sees (see sunVisibility). */
  setLighting(direction: Vector3, sunlight: Color, ambient: Color, haze: Color): void {
    const sunAltitudeDeg = Math.asin(Math.max(-1, Math.min(1, direction.y / Math.max(1e-9, direction.length())))) * 180 / Math.PI
    for (const deck of this.decks.values()) {
      const uniforms = deck.volume?.uniforms ?? deck.uniforms!
      uniforms.sunDir.value.copy(direction)
      // A volume gates each of its samples by its own height (see VolumetricClouds); a surface by its base.
      uniforms.sunColor.value.copy(sunlight)
      if (!deck.volume) uniforms.sunColor.value.multiplyScalar(LayeredCloudSystem.sunVisibility(sunAltitudeDeg, deck.layer.baseM))
      uniforms.ambientColor.value.copy(ambient)
      deck.volume?.uniforms.hazeColor.value.copy(haze)
    }
  }

  /** The strongest cirrus veil drives the existing single-veil halo approximation. */
  get cirrusMask(): { cover: number; layerHeight: number; offset: Vector3; iceCrystalAlignment?: number } | undefined {
    const deck = this.cirrusDeck
    return deck?.uniforms ? { cover: deck.layer.coverage, layerHeight: deck.uniforms.layerHeight.value,
      offset: deck.uniforms.fieldOffset.value, iceCrystalAlignment: deck.layer.iceCrystalAlignment } : undefined
  }

  private get cirrusDeck(): Deck | undefined {
    return [...this.decks.values()].filter(deck => deck.layer.type === "cirrus" && deck.uniforms)
      .sort((a, b) => b.layer.coverage - a.layer.coverage)[0]
  }

  get volumes(): VolumetricCloudLayer[] {
    return [...this.decks.values()].flatMap(deck => deck.volume?.mesh.visible ? [deck.volume] : [])
  }

  /** Hit-test the visible density, not the much larger proxy sphere used for rendering. */
  pickInstance(direction: Vector3): CloudPick | undefined {
    let closest = Infinity, picked: CloudPick | undefined
    for (const deck of this.decks.values()) {
      if (!deck.instance || !deck.volume?.mesh.visible) continue
      const u = deck.volume.uniforms
      const center = u.localCenter.value.clone().sub(u.offsetM.value)
      center.y -= u.eyeM.value + (center.x ** 2 + center.z ** 2) / (2 * 6371000)
      const distance = center.dot(direction)
      if (distance <= 0 || distance >= closest || deck.volume.transmissionAt(direction) > 0.98) continue
      closest = distance
      picked = { layerId: deck.parentId, instanceId: deck.instance.id, center }
    }
    return picked
  }

  /** @param waterOnly Through the water decks alone, leaving the cirrus out. */
  transmissionAt(direction: { x: number; y: number; z: number }, waterOnly = false): number {
    let through = 1
    for (const deck of this.decks.values()) {
      if (waterOnly && deck.layer.type === "cirrus") continue
      if (deck.volume) through *= deck.volume.transmissionAt(direction)
      else if (deck.uniforms) through *= 1 - (deck.layer.type === "cirrus" ? CloudField.iceAlphaAt : CloudField.alphaAt)(direction,
        deck.uniforms.layerHeight.value, deck.layer.coverage, deck.uniforms.fieldOffset.value) * (deck.layer.type === "cirrus" ? 0.2 : 0.95)
    }
    return through
  }

  private disposeDeck(deck: Deck): void {
    deck.volume?.dispose()
    if (deck.surface) {
      deck.surface.removeFromParent()
      deck.surface.geometry.dispose()
      deck.surface.material.dispose()
    }
  }

  dispose(): void {
    // The display draws itself again, whatever deck replaces this system.
    if (this.halo) this.halo.hosted = false
    this.halo = undefined
    for (const deck of this.decks.values()) this.disposeDeck(deck)
    this.decks.clear()
    this.noise?.dispose()
  }
}
