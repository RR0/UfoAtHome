import type { Group, Vector3 } from "three"
import type { SkyEventFrame, SkyEventHit, SkyEventPickContext, SkyEventSimulation } from "../SkyEventKind.js"
import { LaunchPlumeSighting } from "./LaunchPlume.js"
import type { LaunchJson } from "./LaunchPlume.js"
import { PlumeSystem } from "./PlumeSystem.js"

/**
 * The exhaust plumes of rocket launches, as the observer sees them at an instant (see LaunchPlumeSighting.viewsAt): light the ground has
 * lost and the plume has not, scattered towards the eye through the air above it and the clouds. Lit by the Sun at the real date and hour,
 * so a recording with no date has no light to put on them, and none is drawn.
 */
export class LaunchSimulation implements SkyEventSimulation<LaunchJson> {
  readonly inSky = true
  private readonly plumes = new PlumeSystem()

  get object(): Group {
    return this.plumes.object
  }

  get drawnCount(): number {
    return this.plumes.count
  }

  update(launches: readonly LaunchJson[], t: number, frame: SkyEventFrame): void {
    const views = launches.length === 0 || !frame.date ? []
      : LaunchPlumeSighting.viewsAt(launches, t, frame.observer, LaunchPlumeSighting.sunDirectionAt(frame.date))
    if (views.length === 0 && this.plumes.count === 0) return
    this.plumes.set(views, frame.relativeScale, position => frame.transmittanceFromSpace(position), position => frame.cloudTransmission(position))
  }

  /** The puff under the pointer, where it stands out from the sky behind it, or a few pixels round a puff too small to land on (see PlumeSystem.pickAt). */
  pick(_origin: Vector3, direction: Vector3, context: SkyEventPickContext): SkyEventHit | undefined {
    const puff = this.plumes.pickAt(direction, context.toleranceRad, context.skyLightTowards(direction))
    return puff && { id: puff.launchId, detail: puff }
  }

  dispose(): void {
    this.plumes.dispose()
  }
}
