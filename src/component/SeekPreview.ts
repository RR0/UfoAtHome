import type { SightingRecordingJson } from "../engine/persistence/sightingJson.js"
import type { InterpretationJson } from "../engine/interpretation/Interpretation.js"

/** What a second scene has to offer to be drawn from — the part of SceneElement this needs. */
export interface PreviewableScene extends HTMLElement {
  sightingData: SightingRecordingJson
  documentUrl: string | undefined
  interpretation: InterpretationJson | undefined
  compareAccount: boolean
  accountInTheRound: boolean
  /** Puts the scene at that instant of the recording. */
  showAt(t: number): void
  /** Draws the scene into the canvas if a frame could be drawn since it last was told an instant;
   * false while it is still waiting for what a frame needs (its shaders, its ground). */
  snapshotTo(target: HTMLCanvasElement): boolean
}

/**
 * The picture over the seek bar's pointer: what the scene looks like at the instant it is over.
 *
 * Drawn by a SECOND scene, kept out of sight at a small size, so that the picture on show is never
 * moved to an instant it was not at and back again — that would flicker, and restate the sky, the
 * weather and the sound at every pixel the pointer crosses. Built when the pointer first comes to
 * the bar and not before: most readers never do, and a second scene is a second graphics context.
 *
 * Requests are coalesced. A scene takes a good while to draw, the pointer asks for a new instant
 * sixty times a second, and only the last one asked for is worth drawing: while one is being
 * drawn the others replace each other, and the picture follows the pointer a few frames late
 * rather than falling further behind it.
 */
export class SeekPreview {
  private scene?: PreviewableScene
  private wanted?: { t: number; canvas: HTMLCanvasElement }
  private pumping = false
  private disposed = false

  /** How long a frame is waited for, in animation frames, before giving the request up. */
  private static readonly PATIENCE_FRAMES = 600
  /** The width of the hidden scene, in CSS pixels: what the preview is drawn from. */
  private static readonly SCENE_WIDTH_PX = 320

  constructor(private readonly source: PreviewableScene, private readonly create: () => PreviewableScene) {
  }

  paint(t: number, canvas: HTMLCanvasElement): void {
    if (this.disposed) return
    this.wanted = { t, canvas }
    if (!this.pumping) void this.pump()
  }

  /** The recording on show changed: the hidden scene follows, once it exists. */
  recordingChanged(json: SightingRecordingJson): void {
    if (this.scene) this.scene.sightingData = json
  }

  dispose(): void {
    this.disposed = true
    this.scene?.remove()
    this.scene = undefined
  }

  private ensureScene(): PreviewableScene {
    if (this.scene) return this.scene
    const scene = this.create()
    scene.setAttribute("max-pixel-ratio", "1")
    // Laid out, so that it has a size to draw at, but out of the page and out of the pointer's way.
    Object.assign(scene.style, {
      position: "fixed", left: "-10000px", top: "0", width: `${SeekPreview.SCENE_WIDTH_PX}px`,
      visibility: "hidden", pointerEvents: "none"
    })
    document.body.appendChild(scene)
    // Before the recording, which resolves what it loads against it.
    scene.documentUrl = this.source.documentUrl
    scene.accountInTheRound = this.source.accountInTheRound
    scene.sightingData = this.source.sightingData
    this.scene = scene
    return scene
  }

  private async pump(): Promise<void> {
    this.pumping = true
    try {
      while (this.wanted && !this.disposed) {
        const { t, canvas } = this.wanted
        this.wanted = undefined
        const scene = this.ensureScene()
        // What the interpretation on show is, and whether the account stands beside it: the picture
        // has to show the world the reader is looking at.
        if (scene.interpretation !== this.source.interpretation) scene.interpretation = this.source.interpretation
        if (scene.compareAccount !== this.source.compareAccount) scene.compareAccount = this.source.compareAccount
        scene.showAt(t)
        for (let frames = 0; frames < SeekPreview.PATIENCE_FRAMES && !this.wanted && !this.disposed; frames++) {
          await new Promise<void>(resolve => requestAnimationFrame(() => resolve()))
          if (this.wanted) break
          if (scene.snapshotTo(canvas)) {
            canvas.dataset.ready = "true"
            break
          }
        }
      }
    } finally {
      this.pumping = false
    }
  }
}
