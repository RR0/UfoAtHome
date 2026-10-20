import type { GeoBounds } from "../GeoBounds.js"
import { geoToLocalMeters } from "../GeoProjection.js"
import { boundsAroundObserver } from "../TerrainMeshBuilder.js"

/** One patch of ground a scene builds: centred on a place, `radiusM` to each side (see SceneRenderer.setTerrainOrigin). */
export interface FrozenPatch {
  lat: number
  lng: number
  radiusM: number
}

/**
 * Where the scene builds its patches of ground when what they hold was frozen: on the patches that were, and nowhere else.
 *
 * A scene asks for the ground round wherever the observer is when it last moved far enough, which depends on how it was played (from the
 * start, or sought to the middle). What was frozen is the ground of the patches the recording plays through (see TerrainPatchPlan), so the
 * scene builds the frozen patch nearest the observer instead of one of its own: its every request is then one that was answered.
 * Live, the observer is up to the rebuild distance off the centre of the patch under them already, so this changes nothing anyone could see.
 */
export interface TerrainPatchIndex {
  /** Whether the list is in hand: until it is, no patch can be chosen, and the scene waits (see `ready`). */
  readonly loaded: boolean
  /** Settles once the list is in hand, or could not be read. */
  readonly ready: Promise<void>
  /** The frozen patch nearest (lat, lng), undefined when there is none (or the list is not in hand yet). */
  nearest(lat: number, lng: number): FrozenPatch | undefined
}

/** A list of patches, and the questions asked of one. */
export class FrozenPatches implements TerrainPatchIndex {
  /** Degrees: two bounds computed from the same patch are equal to the last bit, this only forgives a round trip through text. */
  private static readonly SAME_BOUNDS_DEG = 1e-9

  loaded = false
  readonly ready: Promise<void>
  private list: readonly FrozenPatch[] = []

  constructor(patches: Promise<readonly FrozenPatch[]>) {
    this.ready = patches.then(list => {
      this.list = list
    }, () => undefined).finally(() => {
      this.loaded = true
    })
  }

  nearest(lat: number, lng: number): FrozenPatch | undefined {
    let best: FrozenPatch | undefined
    let bestM = Infinity
    for (const patch of this.list) {
      const { x, z } = geoToLocalMeters(patch.lat, patch.lng, lat, lng)
      const distanceM = Math.hypot(x, z)
      if (distanceM < bestM) {
        bestM = distanceM
        best = patch
      }
    }
    return best
  }

  /** The square of ground a patch is asked for — the same function the scene asks with, so the same numbers. */
  static boundsOf(patch: FrozenPatch): GeoBounds {
    return boundsAroundObserver(patch.lat, patch.lng, patch.radiusM)
  }

  static sameBounds(a: GeoBounds, b: GeoBounds): boolean {
    const near = (x: number, y: number) => Math.abs(x - y) <= FrozenPatches.SAME_BOUNDS_DEG
    return near(a.north, b.north) && near(a.south, b.south) && near(a.east, b.east) && near(a.west, b.west)
  }

  static contains(outer: GeoBounds, inner: GeoBounds): boolean {
    return outer.north >= inner.north && outer.south <= inner.south && outer.east >= inner.east && outer.west <= inner.west
  }

  static samePatches(a: readonly FrozenPatch[], b: readonly FrozenPatch[]): boolean {
    return a.length === b.length && a.every((patch, i) => patch.lat === b[i].lat && patch.lng === b[i].lng && patch.radiusM === b[i].radiusM)
  }
}
