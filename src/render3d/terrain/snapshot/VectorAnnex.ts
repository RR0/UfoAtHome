import type { GeoBounds } from "../GeoBounds.js"
import type { RoadProvider, RoadWay } from "../RoadProvider.js"
import type { WaterProvider, WaterSurface } from "../WaterProvider.js"
import type { RailwayLine, RailwayProvider } from "../RailwayProvider.js"
import { SnapshotPatches, type SnapshotPatch } from "./SnapshotPatches.js"

/** What was laid on one patch: its ways, its water or its tracks. */
export interface SnapshotVectorPatch<T> extends SnapshotPatch {
  items: T[]
}

/**
 * A roads, water or railways annex (`<recording>.roads.json`…): plain JSON, as the archives of public/roads are, so that what a recording
 * stands on can be read by anybody who opens it.
 */
export interface VectorAnnexData<T> {
  version: 1
  takenOn: string
  attribution: string
  /** For roads and railways: whether they are today's (see RoadProvider.contemporary), which freezing them does not change. */
  contemporary?: boolean
  patches: SnapshotVectorPatch<T>[]
}

/** The items of the patch asked for, of an annex still on its way. */
class SnapshotVectorReader<T> {
  attributionRead?: string
  contemporaryRead?: boolean

  constructor(private readonly annex: Promise<VectorAnnexData<T>>) {
  }

  /** What the patch of `bounds` holds, and nothing for a square no patch was taken for: nobody else is asked. */
  async itemsFor(bounds: GeoBounds): Promise<T[]> {
    const annex = await this.annex
    this.attributionRead = annex.attribution
    this.contemporaryRead = annex.contemporary
    return annex.patches.find(patch => SnapshotPatches.sameBounds(SnapshotPatches.boundsOf(patch), bounds))?.items ?? []
  }
}

export class SnapshotRoadProvider implements RoadProvider {
  private readonly reader: SnapshotVectorReader<RoadWay>

  constructor(annex: Promise<VectorAnnexData<RoadWay>>, private readonly attributionStated = "") {
    this.reader = new SnapshotVectorReader(annex)
  }

  get attribution(): string {
    return this.reader.attributionRead ?? this.attributionStated
  }

  get contemporary(): boolean {
    return this.reader.contemporaryRead ?? true
  }

  getRoads(bounds: GeoBounds): Promise<RoadWay[]> {
    return this.reader.itemsFor(bounds)
  }
}

export class SnapshotWaterProvider implements WaterProvider {
  private readonly reader: SnapshotVectorReader<WaterSurface>

  constructor(annex: Promise<VectorAnnexData<WaterSurface>>, private readonly attributionStated = "") {
    this.reader = new SnapshotVectorReader(annex)
  }

  get attribution(): string {
    return this.reader.attributionRead ?? this.attributionStated
  }

  getWater(bounds: GeoBounds): Promise<WaterSurface[]> {
    return this.reader.itemsFor(bounds)
  }
}

export class SnapshotRailwayProvider implements RailwayProvider {
  private readonly reader: SnapshotVectorReader<RailwayLine>

  constructor(annex: Promise<VectorAnnexData<RailwayLine>>, private readonly attributionStated = "") {
    this.reader = new SnapshotVectorReader(annex)
  }

  get attribution(): string {
    return this.reader.attributionRead ?? this.attributionStated
  }

  get contemporary(): boolean {
    return this.reader.contemporaryRead ?? true
  }

  getRailways(bounds: GeoBounds): Promise<RailwayLine[]> {
    return this.reader.itemsFor(bounds)
  }
}
