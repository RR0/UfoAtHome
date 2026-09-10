import { Color, Mesh, Vector3 } from "three"
import type { Group, ShaderMaterial, SphereGeometry } from "three"
import type { CloudInstance, CloudLayer } from "../engine/model/CloudLayer.js"
import { resolveCloudLayers } from "../engine/model/CloudLayer.js"
import type { CloudPick } from "./CloudManipulation.js"
import type { Weather } from "../engine/model/Weather.js"
import { buildCloudGeometry, buildCloudMaterial, CloudField } from "./CloudSystem.js"
import type { CloudUniforms } from "./CloudSystem.js"
import { cloudSeed, createCloudNoise, VolumetricCloudLayer } from "./VolumetricClouds.js"

export type CloudRendering = "surface" | "volume"
type Deck = { layer: CloudLayer; parentId: string; instance?: CloudInstance; volume?: VolumetricCloudLayer; surface?: Mesh<SphereGeometry, ShaderMaterial>; uniforms?: CloudUniforms }

/** Owns a stable render object per layer. Timeline interpolation only changes uniforms. */
export class LayeredCloudSystem {
  private readonly decks = new Map<string, Deck>()
  private noise?: ReturnType<typeof createCloudNoise>

  constructor(private readonly group: Group, private readonly radius: number, private readonly mode: CloudRendering) {}

  update(weather: Weather, eyeM: number): void {
    const layers = resolveCloudLayers(weather).flatMap(sourceLayer => {
      const layer = { ...sourceLayer, darkness: sourceLayer.darkness ?? weather.cloudDarkness }
      return [
      { layer, parentId: layer.id, key: JSON.stringify([layer.id]), instance: undefined as CloudInstance | undefined },
      ...(layer.instances ?? []).map(instance => ({ parentId: layer.id, key: JSON.stringify([layer.id, instance.id]), instance,
        layer: { ...layer, id: `${layer.id}/${instance.id}`, type: "cumulus" as const, baseM: instance.baseM,
          thicknessM: instance.thicknessM, sizeM: Math.max(instance.widthM, instance.depthM) / 2,
          coverage: 1, density: instance.density, darkness: instance.darkness ?? layer.darkness,
          seed: instance.seed ?? layer.seed, instances: undefined } }))
    ]})
    const wanted = new Set(layers.map(entry => entry.key))
    for (const [id, deck] of this.decks) if (!wanted.has(id)) {
      this.disposeDeck(deck)
      this.decks.delete(id)
    }
    // Back-to-front for disjoint layers. Overlapping volumes require joint integration in a later pass.
    const sorted = [...layers].sort((a, b) => Math.abs(b.layer.baseM + b.layer.thicknessM / 2 - eyeM) - Math.abs(a.layer.baseM + a.layer.thicknessM / 2 - eyeM))
    sorted.forEach(({ layer, key, instance, parentId }, index) => {
      // Explicit masses are volumes in both comparison modes; the global field can stay lightweight.
      const volumetric = instance !== undefined || (this.mode === "volume" && layer.type !== "cirrus")
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
      const order = 4 + index / Math.max(1, layers.length)
      if (deck.volume) {
        deck.volume.update(layer, eyeM, instance)
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

  setLighting(direction: Vector3, sunlight: Color, ambient: Color, haze: Color): void {
    for (const deck of this.decks.values()) {
      const uniforms = deck.volume?.uniforms ?? deck.uniforms!
      uniforms.sunDir.value.copy(direction)
      uniforms.sunColor.value.copy(sunlight)
      uniforms.ambientColor.value.copy(ambient)
      deck.volume?.uniforms.hazeColor.value.copy(haze)
    }
  }

  /** The strongest cirrus veil drives the existing single-veil halo approximation. */
  get cirrusMask(): { cover: number; layerHeight: number; offset: Vector3; iceCrystalAlignment?: number } | undefined {
    const deck = [...this.decks.values()].filter(deck => deck.layer.type === "cirrus" && deck.uniforms)
      .sort((a, b) => b.layer.coverage - a.layer.coverage)[0]
    return deck?.uniforms ? { cover: deck.layer.coverage, layerHeight: deck.uniforms.layerHeight.value,
      offset: deck.uniforms.fieldOffset.value, iceCrystalAlignment: deck.layer.iceCrystalAlignment } : undefined
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

  transmissionAt(direction: { x: number; y: number; z: number }): number {
    let through = 1
    for (const deck of this.decks.values()) {
      if (deck.volume) through *= deck.volume.transmissionAt(direction)
      else if (deck.uniforms) through *= 1 - CloudField.alphaAt(direction,
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
    for (const deck of this.decks.values()) this.disposeDeck(deck)
    this.decks.clear()
    this.noise?.dispose()
  }
}
