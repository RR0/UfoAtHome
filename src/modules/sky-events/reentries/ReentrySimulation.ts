import type { Group, Vector3 } from "three"
import type { SkyEventFrame, SkyEventHit, SkyEventPickContext, SkyEventSimulation } from "../SkyEventKind.js"
import { ReentrySighting } from "./Reentry.js"
import type { ReentryJson } from "./Reentry.js"
import { ReentrySystem } from "./ReentrySystem.js"

/**
 * The burning pieces of re-entries and fireballs, as the observer sees them at an instant from where they really stand on the Earth (see
 * ReentrySighting.viewsAt): against the same magnitude limit, clouds and air as the satellites. Their heads light the ground as the Moon
 * does, and dazzle the eye as a star or the Moon does: a superbolide brighter than the Sun was a few dots without it.
 */
export class ReentrySimulation implements SkyEventSimulation<ReentryJson> {
  readonly inSky = true
  readonly hiddenFromEye = true
  private readonly pieces = new ReentrySystem()

  get object(): Group {
    return this.pieces.object
  }

  get drawnCount(): number {
    return this.pieces.count
  }

  update(reentries: readonly ReentryJson[], t: number, frame: SkyEventFrame): void {
    const views = reentries.length === 0 ? [] : ReentrySighting.viewsAt(reentries, t, frame.observer)
    if (views.length === 0 && this.pieces.count === 0) return
    this.pieces.set(views, frame.magnitudeLimit, position => frame.cloudTransmission(position),
      (position, magnitude) => frame.arrivingIlluminance(position, magnitude, 1))
    frame.lightFrom(views.map(view => ({ position: view.head, magnitude: view.magnitude })))
    // Its dazzle goes out with it (see ReentryFragmentView.fade): the veil of a dazzling piece saturates as its dot does.
    frame.glareFrom(views.map(view => ({ key: `${view.reentryId}:${view.fragmentId}`, position: view.head, magnitude: view.magnitude, fade: view.fade })))
  }

  /** The drawn piece nearest the pointer, as a star is found (see ReentrySystem.nearest). */
  pick(_origin: Vector3, direction: Vector3, context: SkyEventPickContext): SkyEventHit | undefined {
    const piece = this.pieces.nearest(direction, context.nearestCos)
    return piece && { id: piece.view.reentryId, detail: piece }
  }

  dispose(): void {
    this.pieces.dispose()
  }
}
