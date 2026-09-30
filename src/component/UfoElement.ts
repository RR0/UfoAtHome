import { html, css } from "./ufoTemplate.js"
import { SightingFetch } from "../engine/net/SightingFetch.js"
import { Instruments } from "../engine/instrument/Instrument.js"
import { Gait } from "../engine/place/Gait.js"
import type { GaitOffset } from "../engine/place/Gait.js"
import { resolveObserverPoseAt, Sighting, resolveSoundAt, sightingDurationMs, sightingTimeToMs } from "../engine/model/Sighting.js"
import type { SightingTime } from "../engine/model/Sighting.js"
import { Player } from "../engine/playback/Player.js"
import type { PlaybackState } from "../engine/playback/Player.js"
import { CanvasRenderer } from "../render/CanvasRenderer.js"
import { SightingAudio } from "../audio/SightingAudio.js"
import { PlayerIcons } from "./PlayerIcons.js"
import { fromSightingJson, toSightingJson } from "../engine/persistence/sightingJson.js"
import type { SightingRecordingJson } from "../engine/persistence/sightingJson.js"
import { RecordingIssues } from "../engine/persistence/RecordingIssue.js"
import type { RecordingIssue } from "../engine/persistence/RecordingIssue.js"
import { RecordingCheck } from "../engine/persistence/RecordingCheck.js"
import type { FormatField } from "../engine/persistence/RecordingCheck.js"
import { resolveMilestoneAt, sortedMilestones } from "../engine/model/Milestone.js"
import { ExposureSampling } from "../engine/model/ExposureSampling.js"
import type { Shape } from "../engine/shape/Shape.js"
import type { SightingSound } from "../engine/model/Sound.js"
import { ShapeHandles } from "../engine/shape/ShapeHandles.js"
import { HostLocale, selectLocale } from "../i18n/locale.js"
import { SaidTexts } from "../engine/model/SaidText.js"
import { loadUfoMessages, UFO_SUPPORTED_LANGUAGES } from "./messages/index.js"
import type { UfoLanguage } from "./messages/index.js"
import { ufoMessages_en } from "./messages/UfoMessages_en.js"
import { ObserverPath } from "../engine/place/ObserverPath.js"
import { resolveDecorPlacementAt } from "../engine/model/Decor.js"
import { localMetersToGeo } from "../render3d/terrain/GeoProjection.js"
import { ObserverMapRenderer } from "../render/ObserverMapRenderer.js"
import { ObserverMapView } from "../render/ObserverMapView.js"
import type { ObserverMapMarker, ObserverMapDecor, ObserverMapTarget } from "../render/ObserverMapRenderer.js"
import { defaultImageryProvider } from "../render3d/terrain/defaultTerrainProviders.js"
import type { ImageryTexture } from "../render3d/terrain/ImageryProvider.js"
import type { GeoBounds } from "../render3d/terrain/GeoBounds.js"
import { ImageProjection } from "../engine/instrument/ImageProjection.js"
import type { UfoMessages } from "./messages/UfoMessages.js"

/**
 * Vanilla Web Component (no framework/library) for read-only playback of a
 * recorded sighting — canvas + Play/Pause/seek only, no recording or
 * appearance-editing UI. This is the lightweight bundle meant for embedding
 * in real site pages (e.g. an rr0.org case dossier): a page that only needs
 * to *play* a sighting shouldn't have to download the Recorder engine,
 * SamplingClock, or appearance toolbar — see SightingEditorElement, which
 * composes this element (as a nested `<rr0-ufo>` in its own shadow DOM) for
 * the authoring/editing experience instead of duplicating the canvas/
 * playback machinery. SceneElement (`<rr0-scene>`) composes it too, for the
 * 3D-decor variant.
 *
 * All wiring happens in the constructor rather than connectedCallback: this
 * element only needs its own shadow DOM to exist (not to be connected to a
 * live document), which is exactly what lets SightingEditorElement/SceneElement
 * rely on `document.createElement(UFO_ELEMENT_NAME)` — synchronous
 * construction for an already-defined custom element — to get a
 * fully-usable instance (`canvasElement`/`renderer`/`sighting` all ready)
 * immediately, with no dependency on connection/upgrade timing. Only the
 * `src` attribute's auto-fetch is inherently attribute/connection
 * dependent, so that alone stays in connectedCallback/attributeChangedCallback.
 */
const EMPTY_SELECTION: ReadonlySet<string> = new Set()

/**
 * The attribute a page sets to say whether the map of where the observer stood starts OPEN:
 * present (or any value but "false") opens it, "false" keeps it closed.
 *
 * Absent, the recording decides: the map starts open when the observer went somewhere — drove,
 * walked, flew, far enough for a map to show it (see ObserverPath.travels) — and closed when they
 * stayed where they were, where a map says nothing the scene does not (dictated rule). The page's
 * own word always wins over that default.
 *
 * It decides the starting state, not whether the map exists: the button is there for every
 * recording that states a place, and a reader can always open or close it.
 *
 * Named the way `show-compass` and `show-labels` already are: a page deciding what its readers see.
 */
export const OBSERVER_MAP_ATTRIBUTE = "show-observer-map"

/**
 * The attribute a page sets to take the account's named moments (see Milestone) OFF the player.
 *
 * NEGATIVE, unlike every other attribute here, and that is deliberate: the marks and the caption
 * are the recording's own words about itself, so they belong wherever they exist. A page that wants
 * the picture alone — a hero image, a thumbnail, a page whose own prose already tells the story beat
 * by beat — has to say so.
 *
 * The button follows the same rule as the map's: it is there when there is something for it to
 * show, which for this means a recording that names at least one moment. Most name none.
 */
export const MILESTONES_ATTRIBUTE = "hide-milestones"

export class UfoElement extends HTMLElement {
  static get observedAttributes(): string[] {
    return ["src", OBSERVER_MAP_ATTRIBUTE, MILESTONES_ATTRIBUTE]
  }

  private readonly shadow: ShadowRoot
  private readonly stageElement: HTMLElement
  private readonly canvas: HTMLCanvasElement
  private readonly canvasRenderer: CanvasRenderer
  private readonly tooltip: HTMLElement
  private readonly toolbar: HTMLElement
  private readonly issuesBox: HTMLElement
  private readonly issuesButton: HTMLButtonElement
  private readonly issuesPanel: HTMLElement
  private readonly playPauseButton: HTMLButtonElement
  /** The smallest piece of ground the map will ever show, metres across. A observer who never moved
   * has a path of zero span, and this is what stands in for it — about two city blocks, enough to
   * recognise a road, a building and a field, which is what "where was this" means. */
  private static readonly OBSERVER_MAP_MIN_SPAN_M = 400
  /** How much room to leave around the path itself, as a fraction of its own span — a track drawn
   * edge to edge shows the journey and none of what it went past. */
  private static readonly OBSERVER_MAP_MARGIN = 0.6
  /** The photograph is fetched once at this size and then drawn at whatever size the panel is: a
   * request per resize would be a request per fullscreen toggle. */
  private static readonly OBSERVER_MAP_IMAGERY_PX = 768

  private readonly fullscreenButton: HTMLButtonElement
  /** The picture's top-right row — see showToolbar. */
  private readonly cornerButtons: HTMLElement
  private readonly observerMapButton: HTMLButtonElement
  /** The pictures of the place: on or off, and how much of them shows — see SceneReference. The
   * reader's own choice, kept across recordings; the slider starts where the recording's first
   * picture asks until the reader moves it. */
  private readonly referencesButton: HTMLButtonElement
  private readonly referenceOpacityInput: HTMLInputElement
  private referencesShownState = true
  private referenceOpacityTouched = false
  private readonly milestonesButton: HTMLButtonElement
  private readonly observerMapPanel: HTMLElement
  private readonly observerMapCanvas: HTMLCanvasElement
  private readonly observerMapRenderer: ObserverMapRenderer
  private readonly mapZoomInButton: HTMLButtonElement
  private readonly mapZoomOutButton: HTMLButtonElement
  private readonly mapFitButton: HTMLButtonElement
  /** What part of the ground the reader has zoomed or dragged to — see ObserverMapView. */
  private readonly observerMapView = new ObserverMapView()
  /** A drag across the map, from the press that started it — undefined between drags. Only becomes
   * a drag past a few pixels, so a click that wobbles still goes where it was aimed. */
  private observerMapDrag?: { pointerId: number; startX: number; startY: number; lastX: number; lastY: number; moved: boolean }
  /** The click a finished drag releases is not a click on whatever it ended over. */
  private suppressObserverMapClick = false
  private observerMapImageryTimer?: ReturnType<typeof setTimeout>
  /**
   * Whether a click on bare ground of the map moves the observer there — set by the editor, which
   * is the only place the observer's position is the reader's to change. It hears it as an
   * `observerplace` event with the coordinate; a reader's player never offers it, since where the
   * observer stood is what the recording says, not something to be clicked elsewhere.
   */
  observerPlacing = false
  private readonly seekInput: HTMLInputElement
  private readonly playbackFlash: HTMLElement
  private readonly milestoneMarks: HTMLElement
  private readonly milestoneCaption: HTMLElement
  private readonly timeStartLabel: HTMLElement
  private readonly timeEndLabel: HTMLElement
  /** The one shape the position and the length share, and the one thing to click to switch them. */
  private readonly timePill: HTMLElement
  private readonly muteButton: HTMLButtonElement
  private readonly volumeInput: HTMLInputElement
  private readonly controlsRow: HTMLElement
  private readonly moreButton: HTMLButtonElement
  private readonly controlsRight: HTMLElement
  private readonly seekSegments: HTMLElement
  private readonly seekDot: HTMLElement
  private readonly seekPreview: HTMLElement
  private readonly seekPreviewCanvas: HTMLCanvasElement
  private readonly seekPreviewTitle: HTMLElement
  private readonly seekPreviewTime: HTMLElement

  /** The observer's own path, rebuilt whenever the recording changes — undefined for a recording
   * that states no coordinates, which is what hides the map button entirely. */
  private observerPath?: ObserverPath
  /** The ground the map covers, fixed for the whole recording rather than recentred on the observer
   * every frame: a map that slides under a moving observer makes it impossible to see that they
   * moved, which is the one thing it exists to show. */
  private observerMapBounds?: GeoBounds
  /** The photograph, fetched at most once per recording and only once the reader asks for the map —
   * an embed nobody opens it on costs nothing. Stays undefined when the tiles cannot be had. */
  private observerMapImagery?: ImageryTexture
  /** The ground the photograph was last asked for — the whole fitted box at first, then whatever
   * the reader zooms into once the one held is too coarse for it or does not reach that far. */
  private observerMapImageryBounds?: GeoBounds
  /** How wide the VIEW was when that photograph was asked for — what "zoomed far enough into it
   * that its pixels would show" is measured against, the ground asked for being wider than the view
   * once the map is zoomed (see loadObserverMapImagery). */
  private observerMapImageryViewWidth = 0
  /** A photograph is on its way: a second request for the same ground would only race it. */
  private observerMapImageryLoading = false
  /** The licence line the map has to carry — the provider's own while its tiles are shown, and what
   * says they are missing when they are not. */
  private observerMapImageryCredit?: string
  /** Whether the tiles were asked for and did not come. Kept apart from the credit above because
   * they are different kinds of line: one is a licence somebody is owed, the other is the map
   * saying what it is missing. Only the first can be moved somewhere else. */
  private observerMapImageryFailed = false
  /**
   * Set by a composing element that shows the licence line somewhere of its own — see
   * `<rr0-sighting>`, which lists it among the credits in its info panel.
   *
   * The licence has to be shown, not shown TWICE. A map whose 8-pixel footer repeats what the panel
   * beside it already says is spending the reader's smallest text on the one line they can read
   * elsewhere, and covering ground they came to look at. What stays on the map either way is
   * "aerial imagery unavailable": that is not a credit, it is the map explaining itself.
   */
  creditShownExternally = false
  /**
   * How far a reader has turned the view away from the pose, degrees — set by a composing element
   * (see SceneElement, which does the turning in 3D) so that what is painted over the scene turns
   * with it.
   *
   * The overlay is the observer's own field of view, so it has to follow the eye: leaving the
   * phenomenon painted at the same pixels while the world swings behind it is exactly the fault
   * BaseShape.aim was added to end, and a look-around must not bring it back.
   */
  private lookYawDeg = 0
  private lookPitchDeg = 0

  /** Whether the account's named moments are being shown — see MILESTONES_ATTRIBUTE. On unless a
   * page or a reader says otherwise, which is what a recording that took the trouble to name its
   * moments deserves. */
  private milestonesShown = true

  private currentSighting: Sighting = Sighting.create()
  /** What the last recording loaded had wrong with it — see reportIssues. */
  private issues: ReadonlyArray<RecordingIssue> = []
  /** Counts loads, so a check that finishes after another recording was loaded is dropped. */
  private issueCheck = 0
  /** The sighting's own sound (see SoundTrack), owned here rather than by SceneElement: it is part
   * of the recording, so it must be heard in the plain 2D embed too, not only in the 3D one that
   * happens to own the weather's audio. */
  private readonly sightingAudio = new SightingAudio()
  /** A sound being auditioned while paused (see previewSound), held rather than played and
   * forgotten: every repaint would otherwise silence it, and a repaint follows within a frame or
   * two of any edit on a real case page — which is precisely when a preview is asked for. */
  private soundPreview?: SightingSound
  private player: Player
  /** Off by default: a replay plays once and stops, and a page that wants a loop (a kiosk, a
   * background) turns it on through autoReplayEnabled. There is no button for it. */
  private loopEnabled = false

  /** Where playback stood before the click pair that a double-click is made of — see
   * restorePlayback. */
  private playbackBeforeClick?: { state: PlaybackState; time: number }
  private highlightedSourceIds: Set<string> = new Set()
  /**
   * Whether this overlay paints the shapes themselves, or only what edits them.
   *
   * A composing `<rr0-scene>` sets this false: it stands every phenomenon IN its three.js scene
   * (see PhenomenonSystem), where the decor's own depth hides it per pixel and the instrument's own
   * projection places it, and a flat copy painted here on top would put an unoccluded ghost over
   * the very thing that was meant to be hidden. What stays on this layer is the pointer's business
   * — selection handles, outlines, hit-testing — because an outline is an editing affordance and
   * belongs where the pointer works, whatever is drawn under it.
   *
   * A bare `<rr0-ufo>` keeps painting, as it always has: it has no scene to hand the picture to.
   */
  paintsShapes = true
  /**
   * Whether the observer's body is held perfectly still when they are not walking, rather than
   * swaying the way a living one does (see Stance). False for a replay; the editor sets it, since an
   * author lining a shape up on the scene needs the scene to hold still under the pointer.
   */
  steadyObserver = false
  /**
   * Whether the selected shapes' handles are drawn at all. Off when the canvas is not editing
   * the shapes (see SightingEditorElement.canvasMode): a handle is a promise that dragging it
   * does something, and a promise the canvas is not keeping is worse than no handle.
   */
  selectionShown = true
  /**
   * Something else to draw over the finished picture, after the handles — what the editor shows
   * of the thing the canvas is editing when that thing is not a shape (a picture's own frame and
   * landmarks, see SightingEditorElement.paintPictureOverlay). Painted at every frame, so it
   * follows the observer's turn.
   */
  overlayPainter?: (renderer: CanvasRenderer) => void

  /** Set to false by composing elements that need the canvas's own click for something else
   * instead of toggling playback — see SightingEditorElement, which uses pointerdown/pointermove on
   * this same canvas to place shapes while recording. */
  enableClickToPlay = true
  /** The element the fullscreen button requests fullscreen on — defaults to this component's own
   * stage. SceneElement overrides this to its own (outer) stage, since fullscreening just the
   * nested <rr0-ufo>'s stage would hide the 3D backdrop canvas (a sibling outside it). */
  fullscreenTarget: HTMLElement
  /** Matches the template's baked-in English defaults until (if ever) loadLocaleMessages()
   * resolves a better match — see its doc comment. */
  private messages: UfoMessages = ufoMessages_en

  /** The sighting's real reported duration/start, cached by updateTimeLabels() so onFrame doesn't
   * recompute them every animation frame — see formatPosition, which turns a `Timeline` position
   * (ms since recording start) into what's actually displayed. */
  private realDurationMs: number | undefined
  private realStartMs: number | undefined

  /**
   * Whether the two counters read as a time of day or as time elapsed.
   *
   * Both are wanted, and which one is wanted changes with the question being asked. "The object
   * crossed the road at 17:50:12" is how a account is written and how it is checked against
   * anything else that happened that evening; "eight seconds in" is how a recording is discussed
   * while it is being edited. Deriving one from the other in one's head means holding the start
   * time and doing arithmetic on every glance.
   *
   * Clock time stays the default wherever there is one, which is what this element already did.
   */
  private showClockTime = true

  /** Bound once so document.removeEventListener (disconnectedCallback) can actually find it. */
  private readonly handleFullscreenChange = () => {
    this.updateFullscreenButton()
    this.updateMuteButton()
    // Entering or leaving fullscreen resizes the stage under the map, and a canvas whose backing
    // store stays at the old size comes back as a blurred enlargement of itself.
    this.resizeObserverMap()
  }

  /** Kept so the map follows any change of the stage's size, not only the two this element causes
   * itself: a responsive page column, a rotated phone, a sidebar opening beside the embed. */
  /** Keeps the row of buttons what fits: refitted when the player is resized, or when a button comes
   * or goes (a recording with no map has no map button). */
  private readonly controlsFitObserver = typeof ResizeObserver === "undefined" ? undefined : new ResizeObserver(() => this.fitControls())
  private controlsMutations?: MutationObserver

  /**
   * Makes the row of buttons fit, by degrees, stopping at the first that does:
   * 1. everything showing;
   * 2. the right-hand buttons folded behind a chevron (the fullscreen button staying in sight);
   * 3. and the time reduced to the position, its length dropped — a clock reads "00:50:34 / 00:53:58",
   *    and that alone is wider than a small player;
   * 4. and the sound gone: last, since it is the one control nobody is stranded without.
   * Measured on the row itself (does its content overflow it?) rather than estimated from the
   * buttons' widths, which a folded button no longer has. Only a resize or a button coming or going
   * triggers it, so it costs nothing per frame.
   */
  private fitControls(): void {
    const row = this.controlsRow
    const wasOpen = row.classList.contains("more-open")
    const overflows = () => row.scrollWidth > row.clientWidth + 1
    row.classList.remove("narrow", "more-open", "compact", "tiny")
    if (row.clientWidth > 0 && overflows()) {
      row.classList.add("narrow")
      for (const step of ["compact", "tiny"]) {
        if (!overflows()) break
        row.classList.add(step)
      }
      // What the reader unfolded stays unfolded through a resize, for as long as it is still needed.
      if (wasOpen) row.classList.add("more-open")
    }
    this.updateMoreButton()
  }

  private setControlsFolded(folded: boolean): void {
    this.controlsRow.classList.toggle("more-open", !folded)
    this.updateMoreButton()
  }

  private updateMoreButton(): void {
    const open = this.controlsRow.classList.contains("more-open")
    UfoElement.setIcon(this.moreButton, open ? PlayerIcons.UNFOLDED : PlayerIcons.FOLDED)
    const label = open ? this.messages.fewerControls : this.messages.moreControls
    this.moreButton.title = label
    this.moreButton.setAttribute("aria-label", label)
    this.moreButton.setAttribute("aria-expanded", String(open))
  }

  /** Puts a button of the composing element among the player's own, before the fullscreen button
   * that closes the row — as SightingElement does with its share button. */
  addControl(button: HTMLButtonElement): void {
    this.controlsRight.insertBefore(button, this.fullscreenButton.parentElement === this.controlsRight ? this.fullscreenButton : null)
    this.fitControls()
  }

  private readonly observerMapResizeObserver =
    typeof ResizeObserver === "undefined" ? undefined : new ResizeObserver(() => this.resizeObserverMap())

  private resizeObserverMap(): void {
    if (this.observerMapPanel.hidden) return
    this.sizeObserverMapCanvas()
    this.paintObserverMap(this.currentTime)
  }

  /** Whether the CSS stand-in for fullscreen is currently on — see enterSimulatedFullscreen. */
  private simulatedFullscreen = false
  /** The target's own inline styles as they were before the stand-in overwrote them, so leaving
   * puts back exactly what the page had rather than a guess at it. */
  private styleBeforeSimulatedFullscreen?: string
  private bodyOverflowBeforeSimulatedFullscreen?: string
  /** Escape leaves the stand-in, the way it leaves real fullscreen. Bound once, listened to only
   * while the stand-in is on. */
  private readonly handleSimulatedFullscreenKey = (event: KeyboardEvent) => {
    if (event.key === "Escape") this.exitSimulatedFullscreen()
  }

  /** Identifies whatever VISIBLE shape (if any) is under the pointer and shows/moves/hides a text
   * label next to it, but only when that shape actually has a title — an untitled shape's raw
   * sourceId (e.g. "ufo-2") is an internal authoring detail, not something an end-user-facing
   * tooltip should ever surface (contrast SightingEditorElement's own shapeLabel(), which deliberately
   * does fall back to the sourceId for its own source-picker dropdown). Mirrors SceneElement's
   * near-identical hoverTooltip/handlePointerMove for celestial bodies/decor. Excludes
   * occludedSourceIds from the hit test (see Timeline.hitTest's own doc comment) — a shape hidden
   * behind decor isn't visually there for the pointer to be hovering, so its name shouldn't surface
   * either; SceneElement's own handlePointerMove instead shows whatever decor actually occludes it
   * there (see its hasVisibleShapeAt check). */
  private readonly handlePointerMove = (event: PointerEvent): void => {
    const point = this.canvasPointFromEvent(event)
    const hit = point && this.shapeAt(point.x, point.y)
    const title = this.said.read(hit?.shape.title)
    if (!title) {
      this.tooltip.hidden = true
      return
    }
    this.tooltip.textContent = title
    this.tooltip.hidden = false
    // Positioned relative to #stage (the tooltip's own offsetParent), not the page — clientX/Y
    // are page-relative, so subtracting the stage's own origin converts them to that local frame.
    const stageRect = this.stageElement.getBoundingClientRect()
    this.tooltip.style.left = `${event.clientX - stageRect.left + 12}px`
    this.tooltip.style.top = `${event.clientY - stageRect.top + 12}px`
  }

  /**
   * Names whatever the pointer is over on the map, in the same tooltip the picture itself uses.
   *
   * The same tooltip on purpose: a reader hovering a thing and being answered in one style over the
   * canvas and another over the map would be told, wrongly, that these are two different kinds of
   * thing. They are the same recording, seen twice.
   */
  private readonly handleObserverMapPointerMove = (event: PointerEvent): void => {
    if (this.dragObserverMap(event)) return
    const target = this.observerMapTargetFrom(event)
    if (!target) {
      if (!this.observerPlacing) {
        this.tooltip.hidden = true
        this.observerMapCanvas.style.cursor = "grab"
        return
      }
      this.observerMapCanvas.style.cursor = "crosshair"
      this.showObserverMapTooltip(event, this.messages.placeObserverHere)
      return
    }
    this.observerMapCanvas.style.cursor = "pointer"
    this.showObserverMapTooltip(event, target.label)
  }

  private showObserverMapTooltip(event: PointerEvent, label: string): void {
    this.tooltip.textContent = label
    this.tooltip.hidden = false
    const stageRect = this.stageElement.getBoundingClientRect()
    this.tooltip.style.left = `${event.clientX - stageRect.left + 12}px`
    this.tooltip.style.top = `${event.clientY - stageRect.top + 12}px`
  }

  /**
   * Takes the recording to whatever was clicked on the map.
   *
   * A named moment IS an instant, so going to it means moving the playhead — the same thing its
   * mark on the seek bar already does. Anything else is a PLACE, and going to it means turning the
   * view until it is in front of the reader (see lookToward), which is a reader looking round and
   * not an edit of what the observer said they faced.
   */
  private readonly handleObserverMapClick = (event: MouseEvent): void => {
    if (this.suppressObserverMapClick) {
      this.suppressObserverMapClick = false
      return
    }
    const target = this.observerMapTargetFrom(event)
    if (!target) {
      if (this.observerPlacing) this.placeObserverFrom(event)
      return
    }
    if (target.kind === "milestone" && target.t !== undefined) {
      this.player.seek(target.t)
      return
    }
    this.dispatchEvent(
      new CustomEvent("lookat", { detail: { lat: target.lat, lng: target.lng, kind: target.kind }, bubbles: true, composed: true })
    )
  }

  /** Which drawn mark the pointer is over, in the canvas's own pixels — the panel is displayed at
   * whatever size CSS gives it, which is rarely the backing store's. */
  private observerMapTargetFrom(event: MouseEvent): ObserverMapTarget | undefined {
    const rect = this.observerMapCanvas.getBoundingClientRect()
    if (rect.width === 0 || rect.height === 0) return undefined
    return this.observerMapRenderer.hitTest(
      ((event.clientX - rect.left) / rect.width) * this.observerMapCanvas.width,
      ((event.clientY - rect.top) / rect.height) * this.observerMapCanvas.height
    )
  }

  private readonly handlePointerLeave = (): void => {
    this.tooltip.hidden = true
  }

  private readonly handleObserverMapPointerDown = (event: PointerEvent): void => {
    if (event.button !== 0) return
    this.suppressObserverMapClick = false
    this.observerMapDrag = {
      pointerId: event.pointerId, startX: event.clientX, startY: event.clientY, lastX: event.clientX, lastY: event.clientY, moved: false
    }
  }

  private readonly handleObserverMapPointerUp = (event: PointerEvent): void => {
    const drag = this.observerMapDrag
    if (!drag || drag.pointerId !== event.pointerId) return
    this.observerMapDrag = undefined
    this.observerMapCanvas.classList.remove("dragging")
    if (!drag.moved) return
    this.suppressObserverMapClick = true
    // Dragged off the observer: the map takes them back in now that the hand has let go.
    this.paintObserverMap(this.currentTime)
    if (this.observerMapCanvas.hasPointerCapture?.(event.pointerId)) this.observerMapCanvas.releasePointerCapture(event.pointerId)
  }

  /** Moves the ground under a pressed pointer. False when there is no drag to follow, so hovering
   * goes on naming what is under the pointer. */
  private dragObserverMap(event: PointerEvent): boolean {
    const drag = this.observerMapDrag
    if (!drag || drag.pointerId !== event.pointerId) return false
    if (!drag.moved) {
      if (Math.hypot(event.clientX - drag.startX, event.clientY - drag.startY) < UfoElement.OBSERVER_MAP_DRAG_PX) return false
      drag.moved = true
      this.tooltip.hidden = true
      this.observerMapCanvas.classList.add("dragging")
      this.observerMapCanvas.setPointerCapture?.(event.pointerId)
    }
    const rect = this.observerMapCanvas.getBoundingClientRect()
    if (rect.width > 0 && rect.height > 0) {
      this.observerMapView.panBy((event.clientX - drag.lastX) / rect.width, (event.clientY - drag.lastY) / rect.height)
      this.observerMapViewChanged()
    }
    drag.lastX = event.clientX
    drag.lastY = event.clientY
    return true
  }

  /** How far a press has to travel before it is a drag rather than a click. */
  private static readonly OBSERVER_MAP_DRAG_PX = 4

  /** The wheel zooms around the pointer, the way every map a reader has used does. */
  private readonly handleObserverMapWheel = (event: WheelEvent): void => {
    event.preventDefault()
    const rect = this.observerMapCanvas.getBoundingClientRect()
    if (rect.width === 0 || rect.height === 0) return
    // Lines and pages are a mouse's notches; pixels are a trackpad's continuous stream.
    const delta = event.deltaMode === 0 ? event.deltaY : event.deltaY * 40
    this.zoomObserverMap((event.clientX - rect.left) / rect.width, (event.clientY - rect.top) / rect.height, Math.exp(-delta * 0.002))
  }

  private zoomObserverMap(x: number, y: number, factor: number): void {
    this.observerMapView.zoomAt(x, y, factor)
    this.observerMapViewChanged()
  }

  private observerMapViewChanged(): void {
    this.mapFitButton.hidden = !this.observerMapView.changed
    this.mapZoomInButton.disabled = this.observerMapView.zoomFactor >= ObserverMapView.MAX_ZOOM
    this.mapZoomOutButton.disabled = this.observerMapView.zoomFactor <= ObserverMapView.MIN_ZOOM
    this.paintObserverMap(this.currentTime)
    this.scheduleObserverMapImagery()
  }

  /**
   * Not on every step of a drag, every notch of a wheel or every frame of a followed walk: at most
   * one look every few hundred milliseconds. Not restarted by each change either — a map that
   * follows an observer changes on every frame, and a wait restarted every frame never ended: the
   * photograph was only asked for once they stopped.
   */
  private scheduleObserverMapImagery(): void {
    if (this.observerMapImageryTimer !== undefined) return
    this.observerMapImageryTimer = setTimeout(() => {
      this.observerMapImageryTimer = undefined
      void this.loadObserverMapImagery()
    }, UfoElement.OBSERVER_MAP_IMAGERY_DELAY_MS)
  }

  /** How close to an edge of a zoomed map the observer may come before it recentres on them, as a
   * fraction of its width: the dot and its cone's first stretch are still readable there. */
  private static readonly OBSERVER_MAP_FOLLOW_MARGIN = 0.1

  private static readonly OBSERVER_MAP_IMAGERY_DELAY_MS = 300

  /** The ground the map is showing now — the fitted box, zoomed and moved as the reader left it. */
  private get observerMapViewBounds(): GeoBounds | undefined {
    return this.observerMapBounds && this.observerMapView.boundsWithin(this.observerMapBounds)
  }

  /** Tells whoever lets the observer be moved (see observerPlacing) where on the ground the click
   * landed. */
  private placeObserverFrom(event: MouseEvent): void {
    const bounds = this.observerMapViewBounds
    const rect = this.observerMapCanvas.getBoundingClientRect()
    if (!bounds || rect.width === 0 || rect.height === 0) return
    const at = ObserverMapView.pointAt(bounds, (event.clientX - rect.left) / rect.width, (event.clientY - rect.top) / rect.height)
    this.dispatchEvent(new CustomEvent("observerplace", { detail: at, bubbles: true, composed: true }))
  }

  constructor() {
    super()
    this.shadow = this.attachShadow({ mode: "open" })
    const template = document.createElement("template")
    template.innerHTML = `<style>${css}</style>${html}`
    this.shadow.appendChild(template.content.cloneNode(true))

    this.stageElement = this.shadow.getElementById("stage")!
    this.canvas = this.shadow.getElementById("canvas") as HTMLCanvasElement
    this.canvasRenderer = new CanvasRenderer(this.canvas.getContext("2d")!)
    this.tooltip = this.shadow.getElementById("tooltip")!
    this.toolbar = this.shadow.getElementById("toolbar")!
    this.issuesBox = this.shadow.getElementById("issues")!
    this.issuesButton = this.shadow.getElementById("issues-button") as HTMLButtonElement
    this.issuesPanel = this.shadow.getElementById("issues-panel")!
    this.issuesButton.addEventListener("click", event => {
      // Not a click on the picture, which plays.
      event.stopPropagation()
      this.issuesPanel.hidden = !this.issuesPanel.hidden
      this.issuesButton.setAttribute("aria-expanded", String(!this.issuesPanel.hidden))
    })
    this.playPauseButton = this.shadow.getElementById("play-pause") as HTMLButtonElement
    this.fullscreenButton = this.shadow.getElementById("fullscreen") as HTMLButtonElement
    this.cornerButtons = this.shadow.getElementById("corner-buttons")!
    this.observerMapButton = this.shadow.getElementById("observer-map") as HTMLButtonElement
    this.referencesButton = this.shadow.getElementById("references") as HTMLButtonElement
    this.referenceOpacityInput = this.shadow.getElementById("reference-opacity") as HTMLInputElement
    this.milestonesButton = this.shadow.getElementById("milestones") as HTMLButtonElement
    this.observerMapPanel = this.shadow.getElementById("observer-map-panel")!
    this.observerMapCanvas = this.shadow.getElementById("observer-map-canvas") as HTMLCanvasElement
    this.observerMapRenderer = new ObserverMapRenderer(this.observerMapCanvas.getContext("2d")!)
    this.mapZoomInButton = this.shadow.getElementById("map-zoom-in") as HTMLButtonElement
    this.mapZoomOutButton = this.shadow.getElementById("map-zoom-out") as HTMLButtonElement
    this.mapFitButton = this.shadow.getElementById("map-fit") as HTMLButtonElement
    this.seekInput = this.shadow.getElementById("seek") as HTMLInputElement
    this.playbackFlash = this.shadow.getElementById("playback-flash")!
    this.milestoneMarks = this.shadow.getElementById("milestone-marks")!
    this.milestoneCaption = this.shadow.getElementById("milestone-caption")!
    this.timeStartLabel = this.shadow.getElementById("time-start")!
    this.timeEndLabel = this.shadow.getElementById("time-end")!
    this.timePill = this.shadow.getElementById("time")!
    this.muteButton = this.shadow.getElementById("mute") as HTMLButtonElement
    this.controlsRight = this.shadow.getElementById("controls-right")!
    this.seekSegments = this.shadow.getElementById("seek-segments")!
    this.seekDot = this.shadow.getElementById("seek-dot")!
    this.seekPreview = this.shadow.getElementById("seek-preview")!
    this.seekPreviewCanvas = this.shadow.getElementById("seek-preview-canvas") as HTMLCanvasElement
    this.seekPreviewTitle = this.shadow.getElementById("seek-preview-title")!
    this.seekPreviewTime = this.shadow.getElementById("seek-preview-time")!
    this.timePill.addEventListener("click", () => this.toggleTimeDisplay())
    // Reachable from the keyboard too, since role="button" promises as much. Space is guarded
    // against its own default, which would scroll the page out from under the toolbar.
    this.timePill.addEventListener("keydown", event => {
      if (event.key !== "Enter" && event.key !== " ") return
      event.preventDefault()
      this.toggleTimeDisplay()
    })
    this.volumeInput = this.shadow.getElementById("volume") as HTMLInputElement
    this.controlsRow = this.shadow.querySelector(".controls") as HTMLElement
    this.moreButton = this.shadow.getElementById("controls-more") as HTMLButtonElement
    this.moreButton.addEventListener("click", () => this.setControlsFolded(this.controlsRow.classList.contains("more-open")))
    this.muteButton.addEventListener("click", () => this.toggleMuted())
    this.volumeInput.addEventListener("input", () => {
      // Dragging down to nothing is muting, and dragging up from it is not: as on the video sites.
      this.setVolume(Number(this.volumeInput.value))
    })
    this.fullscreenTarget = this.stageElement

    this.playPauseButton.addEventListener("click", () => this.togglePlayPause())
    this.fullscreenButton.addEventListener("click", () => this.toggleFullscreen())
    // F, as on the video sites — from wherever the focus is within the player.
    this.addEventListener("keydown", this.handleFullscreenKey)
    this.observerMapButton.addEventListener("click", () => this.toggleObserverMap())
    this.referencesButton.addEventListener("click", () => this.toggleReferences())
    this.referenceOpacityInput.addEventListener("input", () => {
      this.referenceOpacityTouched = true
      this.dispatchReferenceView()
    })
    this.milestonesButton.addEventListener("click", () => this.toggleMilestones())
    this.observerMapCanvas.addEventListener("pointermove", this.handleObserverMapPointerMove)
    this.observerMapCanvas.addEventListener("pointerleave", this.handlePointerLeave)
    this.observerMapCanvas.addEventListener("click", this.handleObserverMapClick)
    this.observerMapCanvas.addEventListener("pointerdown", this.handleObserverMapPointerDown)
    this.observerMapCanvas.addEventListener("pointerup", this.handleObserverMapPointerUp)
    this.observerMapCanvas.addEventListener("pointercancel", this.handleObserverMapPointerUp)
    this.observerMapCanvas.addEventListener("wheel", this.handleObserverMapWheel, { passive: false })
    this.mapZoomInButton.addEventListener("click", () => this.zoomObserverMap(0.5, 0.5, 2))
    this.mapZoomOutButton.addEventListener("click", () => this.zoomObserverMap(0.5, 0.5, 0.5))
    this.mapFitButton.addEventListener("click", () => {
      this.observerMapView.reset()
      this.observerMapViewChanged()
    })
    this.seekInput.addEventListener("input", () => this.player.seek(this.snapSeekToMark(Number(this.seekInput.value))))
    this.seekInput.addEventListener("pointerdown", event => { this.seekSnapArmed = true; this.nameMarkUnder(event) })
    this.seekInput.addEventListener("pointerup", () => { this.seekSnapArmed = false })
    this.seekInput.addEventListener("pointermove", event => { this.nameMarkUnder(event); this.hoverSeek(event) })
    this.seekInput.addEventListener("pointerleave", () => { this.seekInput.removeAttribute("title"); this.leaveSeek() })
    this.seekInput.addEventListener("keydown", this.handleSeekKey)
    // A touch screen has no hover to show the controls by, nor to take them away by: they show on a
    // touch and go after a few seconds of playing — see revealControls.
    this.stageElement.addEventListener("pointerdown", () => { this.handlePointerDown(); this.touchedStage() }, true)
    this.stageElement.addEventListener("pointermove", () => this.touchedStage())
    this.canvas.addEventListener("click", event => {
      if (!this.enableClickToPlay) return
      // The touch that brought the controls back is not also a request to pause what is playing.
      if (this.tapRevealedOnly) {
        this.tapRevealedOnly = false
        return
      }
      // Where playback stood before this click, in case it turns out to be the first half of a
      // double-click — see the dblclick handler below. `detail` is the click count, so this
      // records the state once per pair rather than overwriting it with the halfway state.
      if (event.detail <= 1) this.playbackBeforeClick = { state: this.playbackState, time: this.currentTime }
      this.togglePlayPause()
    })
    this.canvas.addEventListener("dblclick", event => {
      // Gated on the same flag as the click above, and for the same reason: where a composing
      // element has taken the canvas over for something else (the editor edits shapes on it),
      // this is one of its gestures and not ours.
      if (!this.enableClickToPlay) return
      // Selecting the surrounding page is never what a double-click on a picture meant.
      event.preventDefault()
      this.restorePlayback()
      this.toggleFullscreen()
    })
    this.canvas.addEventListener("pointermove", this.handlePointerMove)
    this.canvas.addEventListener("pointerleave", this.handlePointerLeave)
    document.addEventListener("fullscreenchange", this.handleFullscreenChange)
    document.addEventListener("pointerup", this.handlePointerRelease, true)
    document.addEventListener("pointercancel", this.handlePointerRelease, true)
    this.observerMapResizeObserver?.observe(this.observerMapPanel)
    this.controlsFitObserver?.observe(this.controlsRow)
    // The time grows when the recording's length arrives (a clock reads "10:30 / 10:30:27"), which
    // resizes neither the row nor the buttons.
    this.controlsFitObserver?.observe(this.controlsRow.querySelector(".controls-left")!)
    if (typeof MutationObserver !== "undefined") {
      this.controlsMutations = new MutationObserver(() => this.fitControls())
      this.controlsMutations.observe(this.controlsRight, { attributes: true, attributeFilter: ["hidden"], childList: true, subtree: true })
    }

    // Out of the picture from the start — see hostControls.
    this.hostControls(undefined)
    this.player = this.createPlayer()
    this.updateTimeLabels()
    this.updatePlayPauseButton()
    this.updateFullscreenButton()
    this.updateMuteButton()
    this.updateObserverMapButton()
    this.updateReferencesButton()
    this.updateMilestonesButton()
    this.refresh()
  }

  connectedCallback(): void {
    this.saidTexts = undefined
    // Here and not in the constructor: the page's declared language is read off the ancestors, and
    // an element being constructed has none yet — it fell back to the browser's languages, so the
    // phenomenon inside a Spanish page's editor spoke the browser's French.
    void this.loadLocaleMessages()
    const src = this.getAttribute("src")
    if (src) {
      void this.loadFromSrc(src)
    }
  }

  disconnectedCallback(): void {
    document.removeEventListener("fullscreenchange", this.handleFullscreenChange)
    document.removeEventListener("pointerup", this.handlePointerRelease, true)
    document.removeEventListener("pointercancel", this.handlePointerRelease, true)
    window.clearTimeout(this.controlsIdleTimer)
    this.observerMapResizeObserver?.disconnect()
    this.controlsFitObserver?.disconnect()
    this.controlsMutations?.disconnect()
    // Leaves the page as it was found: the stand-in holds document.body's own overflow, and an
    // element removed while it is on would otherwise leave the page unable to scroll.
    this.exitSimulatedFullscreen()
    this.sightingAudio.dispose()
  }

  attributeChangedCallback(name: string, oldValue: string, newValue: string): void {
    if (name === "src" && newValue && newValue !== oldValue && this.isConnected) {
      void this.loadFromSrc(newValue)
    }
    if (name === OBSERVER_MAP_ATTRIBUTE) {
      this.applyObserverMapDefault()
    }
    if (name === MILESTONES_ATTRIBUTE) {
      this.setMilestonesShown(!this.hasAttribute(MILESTONES_ATTRIBUTE))
    }
  }

  /** Fetches a SightingRecordingJson from `url` and loads it — what the `src` attribute uses. */
  async loadFromSrc(url: string): Promise<void> {
    this.sightingData = (await SightingFetch.json(url)) as SightingRecordingJson
  }

  get sightingData(): SightingRecordingJson {
    return toSightingJson(this.currentSighting)
  }

  set sightingData(json: SightingRecordingJson) {
    // Without this, switching sightings mid-playback (e.g. SightingElement's observer picker)
    // orphans the old Player: its requestAnimationFrame loop was never cancelled, so it keeps
    // ticking in the background — calling this same onFrame with the *old* timeline's positions
    // and fighting the new player for the canvas/seek bar/labels. Symptom: after switching
    // observers mid-play, clicking to pause only pauses the new player while the old one keeps
    // looping underneath it, which looks exactly like "pause resets to the start" since the old
    // player's loop keeps repainting frame 0 onward.
    this.player.stop()
    // The outgoing sighting's sound would otherwise keep playing over the incoming one — stop()
    // paints no further frame, same as pause(). A preview belongs to that same outgoing recording.
    this.soundPreview = undefined
    this.sightingAudio.silence()
    this.currentSighting = fromSightingJson(json)
    this.issuesPanel.hidden = true
    this.issuesButton.setAttribute("aria-expanded", "false")
    void this.reportIssues(json, this.currentSighting)
    // Another recording is another piece of ground: where a reader had zoomed on the last one says
    // nothing about this one.
    this.observerMapView.reset()
    this.mapFitButton.hidden = true
    this.observerMapAsked = false
    this.player = this.createPlayer()
    this.updateTimeLabels()
    this.updatePlayPauseButton()
    this.refresh()
    // After refresh, which is where the new recording's own path is worked out: a page's "start
    // with the map open" is about the recording being loaded, not the one just replaced.
    this.applyObserverMapDefault()
  }

  /** What the recording on show has wrong with it: keys nothing reads, values of the wrong kind,
   * and what loading had to make up. Also sent as the `recordingissues` event once known. */
  get recordingIssues(): ReadonlyArray<RecordingIssue> {
    return this.issues
  }

  /**
   * Says what in a recording was not played as written, instead of letting a file that loads pass
   * for one that says what its author meant: to the console, and as the `recordingissues` event
   * (bubbling out of every shadow root) that the player page and the editor show.
   *
   * Loading's own issues are known at once; the check against the format needs the format's
   * description, fetched the first time and only then, which is why this is asynchronous.
   */
  private async reportIssues(json: SightingRecordingJson, sighting: Sighting): Promise<void> {
    const turn = ++this.issueCheck
    let checked: RecordingIssue[] = []
    try {
      const { default: format } = await import("../generated/sightingSchema.json")
      checked = new RecordingCheck(format as unknown as Record<string, FormatField>).issues(json)
    } catch {
      // The description could not be had (offline, blocked): what loading itself saw still stands.
    }
    if (turn !== this.issueCheck) return
    this.issues = [...checked, ...sighting.loadIssues]
    RecordingIssues.warn(this.issues, sighting.id)
    this.renderIssues()
    this.dispatchEvent(new CustomEvent(RECORDING_ISSUES_EVENT, { detail: { issues: this.issues }, bubbles: true, composed: true }))
  }

  /** The ⚠ over the picture, in the reader's language, or nothing when the recording has nothing
   * to say. A new recording starts with its list closed. */
  private renderIssues(): void {
    const count = this.issues.length
    this.issuesBox.hidden = count === 0
    this.shadow.getElementById("issues-count")!.textContent = String(count)
    const title = this.messages.recordingIssues.replace("{count}", String(count))
    this.issuesButton.title = title
    this.issuesButton.setAttribute("aria-label", title)
    this.shadow.getElementById("issues-title")!.textContent = title
    this.shadow.getElementById("issues-list")!.replaceChildren(...this.issues.map(issue => {
      const item = document.createElement("li")
      item.textContent = RecordingIssues.text(issue, this.messages.issueTemplates)
      return item
    }))
  }

  /**
   * The live Sighting/Timeline, exposed so SightingEditorElement/SceneElement
   * (which compose this element) can add keyframes to it directly as it
   * records, or read its time/place for lighting.
   */
  get sighting(): Sighting {
    return this.currentSighting
  }

  /**
   * Plays a sound right now, outside playback — how SightingEditorElement lets a observer HEAR the
   * sound they are describing while they tune its kind/loudness/pitch. Tuning a synthesized sound
   * blind would be like drawing a shape with the canvas covered.
   *
   * Only ever call this from a real user gesture (an input event on a sound field is one): it
   * unlocks the AudioContext, which nothing else in this element can do while paused.
   *
   * It survives repaints, and only stopSoundPreview() or playback itself ends it. That is not a
   * detail: onFrame silences any sound whenever playback isn't running, and an edit on a real case
   * page triggers a repaint within a frame or two — so a preview that didn't outlive them was
   * audible for about a tenth of a second, exactly where it was needed most. How long one lasts is
   * the caller's own business (see the editor's timer).
   */
  previewSound(sound: SightingSound): void {
    this.soundPreview = sound
    this.sightingAudio.resume()
    this.sightingAudio.setSound(sound)
  }

  /** Ends a previewSound(). Callers own how long one lasts — nothing here expires it. */
  stopSoundPreview(): void {
    this.soundPreview = undefined
    this.sightingAudio.silence()
  }

  /** Exposed so SightingEditorElement can paint a live drag preview on the same canvas. */
  get canvasElement(): HTMLCanvasElement {
    return this.canvas
  }

  get renderer(): CanvasRenderer {
    return this.canvasRenderer
  }

  /** Exposed so SightingEditorElement can write an appearance edit at the exact instant the
   * (already-visible) seek bar is currently scrubbed to. */
  get currentTime(): number {
    return this.player.time
  }

  /** Exposed so a composing element with its own external scrub control (see SightingEditorElement,
   * which hides this element's own overlay toolbar and drives an external one instead) can seek
   * without reaching into the private `player`. */
  set currentTime(t: number) {
    this.player.seek(t)
  }

  /** Exposed for the same reason as the `currentTime` setter — an external seek control needs the
   * same range (`0..seekableDuration`) the internal seek `<input>` itself uses (see `refresh()`). */
  get seekableDuration(): number {
    return this.player.seekableDuration
  }

  /** Exposed for the same reason as the `currentTime` setter — an external Auto-replay button
   * needs to read/reflect the current loop state. Named to avoid colliding with the private
   * `loopEnabled` field this mirrors. */
  get autoReplayEnabled(): boolean {
    return this.loopEnabled
  }

  /** Settable for the case the getter's own comment did not cover: a page that plays several
   * recordings in sequence has to turn looping OFF to ever reach the `ended` event that tells it
   * to move on. Goes through the same path the button does, so the button reflects it. */
  set autoReplayEnabled(enabled: boolean) {
    if (enabled !== this.loopEnabled) this.toggleLoop()
  }

  /**
   * Starts playback. Public alongside `togglePlayPause` because a caller sequencing recordings
   * needs to say WHICH state it wants, not flip whatever the current one happens to be — and a
   * toggle called on an already-playing element would stop it.
   */
  play(): void {
    if (this.player.seekableDuration <= 0 || this.playbackState === "playing") return
    this.togglePlayPause()
  }

  /** Stops playback where it stands. See `play()` for why this is not just the toggle. */
  pause(): void {
    if (this.playbackState !== "playing") return
    this.togglePlayPause()
  }

  /** The already-computed, human-readable elapsed-position/total-duration text this element's own
   * (possibly hidden, see showToolbar) time labels show — exposed so a composing element's
   * external playback row (see SightingEditorElement) can display the same text instead of re-
   * deriving it. This is NOT just a convenience: `currentTime`/`seekableDuration` are `Player`'s
   * own TIMELINE-position units, which advance at `playbackRate`× real wall-clock speed — that
   * rate is exactly `timelineDuration / realDurationMs` (see updateTimeLabels), so it's almost
   * never 1. Formatting those raw values directly as if they were real milliseconds shows a
   * duration that doesn't match the declared real observation length and ticks at the wrong
   * real-time speed. `formatPosition`/`formatEndOfTimeline` already do this scaling correctly;
   * reading their last-computed output is simpler and safer than duplicating that math
   * externally. */
  get positionLabel(): string {
    return this.timeStartLabel.textContent ?? ""
  }

  get durationLabel(): string {
    return this.timeEndLabel.textContent ?? ""
  }

  /** Whether the counters are currently showing a clock. False when they show elapsed time, and
   * also false when the observation has no start time at all — there is then no clock to show. */
  get showingClockTime(): boolean {
    return this.canShowClockTime
  }

  /** Whether switching is offered at all: an observation with no recorded start time has only one
   * of the two readings available, so its counters are plain text rather than a control. */
  get canSwitchTimeDisplay(): boolean {
    return this.realStartMs !== undefined
  }

  /**
   * Swaps the counters between the time of day and time elapsed.
   *
   * Public because the editor shows the same two values in its own toolbar (see
   * SightingEditorElement.updateTimeLabels) and its counters must switch the same way — one piece of
   * state, read by both, rather than each keeping its own idea of what is being displayed.
   */
  toggleTimeDisplay(): void {
    if (!this.canSwitchTimeDisplay) return
    this.showClockTime = !this.showClockTime
    this.updateTimeLabels()
    this.updateTimeLabelTitles()
    this.dispatchEvent(new CustomEvent("timedisplaychange", { bubbles: true, composed: true }))
  }

  /** True only when a clock is both wanted and available. */
  private get canShowClockTime(): boolean {
    return this.realStartMs !== undefined && this.showClockTime
  }

  /** Hides this element's own overlaid play/seek/loop bar — set by a composing element that
   * drives an external playback UI of its own instead (see SightingEditorElement, which needs the
   * bottom of the canvas free for dragging/resizing shapes; the overlay's seek `<input>` is
   * `flex: 1` and would otherwise intercept nearly the full width of that area). Only `.toolbar`
   * is affected — except the fullscreen button at its end, which goes back to the picture's
   * top-right corner rather than disappearing with it: once fullscreen, the picture is all there
   * is, and a way out has to stand on it. */
  set showToolbar(show: boolean) {
    this.toolbar.classList.toggle("hidden", !show)
    if (show) {
      this.controlsRight.appendChild(this.fullscreenButton)
    } else {
      this.cornerButtons.appendChild(this.fullscreenButton)
    }
  }

  /** Exposed so SightingEditorElement can avoid editing/resyncing appearance while actively
   * playing, when the playhead is a moving target rather than a specific instant. */
  get playbackState(): PlaybackState {
    return this.player.playbackState
  }

  get selectedSourceIds(): ReadonlySet<string> {
    return this.highlightedSourceIds
  }

  /** The sighting's reported real-world duration in seconds (event.durationSeconds) — takes
   * precedence over endTime/time when computing playback speed (see sightingDurationMs).
   * Exposed so SightingEditorElement can offer a duration input in its own editor UI, patching
   * just this field rather than reconstructing the whole Sighting/Timeline via sightingData. */
  get durationSeconds(): number | undefined {
    return this.currentSighting.event.durationSeconds
  }

  set durationSeconds(seconds: number | undefined) {
    this.currentSighting.event.durationSeconds = seconds
    this.updateTimeLabels()
    // updateTimeLabels() alone doesn't touch the seek bar's own range — without this, the
    // slider stayed capped at timeline.duration (e.g. 0 on a still-empty recording) even
    // though a longer real duration is now known and seekable (see Player.seekableDuration).
    this.refresh()
    // Declaring a real duration (or clearing one back to nothing recorded) changes
    // seekableDuration, which is what decides whether Play is even enabled — see
    // updatePlayPauseButton().
    this.updatePlayPauseButton()
  }

  /** Exposed so SightingEditorElement can visually flag the shape(s) currently selected in its own
   * editor UI, reusing CanvasRenderer's existing selection-handle rendering — purely a
   * paint-time hint, never persisted (Shape.selected is never written by any Timeline/JSON
   * code path, so this can't leak into a saved sighting). A single selected id gets the same
   * per-shape handle treatment as before; multiple ids get individual outlines plus one shared
   * group-bbox handle overlay — see onFrame. */
  set selectedSourceIds(ids: ReadonlySet<string> | Iterable<string>) {
    const next = new Set(ids)
    const unchanged =
      next.size === this.highlightedSourceIds.size && [...next].every(id => this.highlightedSourceIds.has(id))
    if (unchanged) return
    this.highlightedSourceIds = next
    this.refresh()
  }

  /** True when a shape — titled or not — sits at (x, y) in this element's own fixed 640x360 canvas
   * drawing space, at the current playhead. Exposed so a composing SceneElement's own hover
   * tooltip (handlePointerMove) can check this first before falling through to a celestial body
   * or decor object's name — whenever a shape is there, it (not whatever's behind it) is what the
   * pointer is actually hovering; this element's own tooltip already handles that case (title-only,
   * see handlePointerMove's own doc comment). A shape the decor hides in the scene still answers
   * here: what is hidden per pixel is not known to this layer, and a name for a thing just out of
   * sight behind a car is not a wrong answer. */
  hasVisibleShapeAt(x: number, y: number): boolean {
    return this.shapeAt(x, y) !== undefined
  }

  /**
   * Re-reads the timeline's duration into the seek slider and repaints the
   * current frame — call after externally mutating `sighting.timeline`
   * (e.g. SightingEditorElement adding keyframes while recording).
   */
  refresh(): void {
    this.applyFrameFormat()
    // Re-derives the real start/duration too: editing the observation's own start time (an EDTF
    // field in the editor) mutates event.time in place, and the clock the player shows is built
    // from a cached copy of it — without this, changing "Observation start" left the seek bar's
    // own labels reading the previous time until the whole recording was reloaded.
    this.updateTimeLabels()
    this.seekInput.max = String(this.player.seekableDuration)
    this.refreshMilestoneMarks()
    this.updateMilestonesButton()
    this.updateObserverMap()
    this.updateReferences()
    this.player.seek(this.player.time)
  }

  /**
   * Puts the toggles — the account's moments, the pictures of the place and their opacity, the
   * observer's map — into `host`, or, when `host` is undefined, into this element's own playback
   * bar, just before the fullscreen button that ends it. Never over the picture: its top-right
   * corner is the observer's map's. A composing element with a
   * toolbar of its own (see SightingElement, and the editor) hosts them there so that they stand
   * with the rest of what that element says about the observation. The buttons are the same
   * elements wherever they stand, so every listener and every state they carry move with them;
   * a host styles them, the playback bar already does.
   */
  hostControls(host: HTMLElement | undefined): void {
    const controls = [this.milestonesButton, this.referenceOpacityInput, this.referencesButton, this.observerMapButton]
    if (host) {
      for (const control of controls) host.appendChild(control)
    } else {
      const end = this.fullscreenButton.parentElement === this.controlsRight ? this.fullscreenButton : null
      for (const control of controls) this.controlsRight.insertBefore(control, end)
    }
  }

  /** Whether the reader has the pictures of the place on — see SceneReference. */
  get referencesShown(): boolean {
    return this.referencesShownState
  }

  /** How much of them the reader is showing, 0 to 1. */
  get referenceOpacity(): number {
    return Number(this.referenceOpacityInput.value)
  }

  toggleReferences(): void {
    this.referencesShownState = !this.referencesShownState
    this.updateReferencesButton()
    this.dispatchReferenceView()
  }

  /**
   * Offers the pictures for every recording that carries any, and starts the slider where the
   * recording's first picture asks — until the reader has moved it, after which it is theirs.
   */
  private updateReferences(): void {
    const references = this.currentSighting.references
    if (!this.referenceOpacityTouched && references.length > 0) {
      this.referenceOpacityInput.value = String(references[0]!.opacity)
    }
    this.updateReferencesButton()
  }

  private updateReferencesButton(): void {
    const any = this.currentSighting.references.length > 0
    this.referencesButton.hidden = !any
    this.referenceOpacityInput.hidden = !any || !this.referencesShownState
    this.referencesButton.setAttribute("aria-pressed", String(this.referencesShownState))
    UfoElement.setIcon(this.referencesButton, this.referencesShownState ? PlayerIcons.PICTURES_ON : PlayerIcons.PICTURES_OFF)
    const label = this.referencesShownState ? this.messages.hideReferences : this.messages.showReferences
    this.referencesButton.title = label
    this.referencesButton.setAttribute("aria-label", label)
    this.referenceOpacityInput.title = this.messages.referenceOpacity
    this.referenceOpacityInput.setAttribute("aria-label", this.messages.referenceOpacity)
  }

  /** Tells whoever draws the scene what the reader wants of the pictures — see SceneElement. */
  private dispatchReferenceView(): void {
    this.dispatchEvent(new CustomEvent("referenceview", { detail: { shown: this.referencesShown, opacity: this.referenceOpacity } }))
  }

  /**
   * Draws one mark per named moment on the seek bar, at its own position along the recording.
   *
   * Marks, not cuts: the recording plays straight through them (see Milestone). Each is a real
   * button so it can be reached by keyboard and jumped to, and carries the account's own sentence
   * as its accessible name — a bar of unlabelled ticks would say only that something happens here.
   */
  private refreshMilestoneMarks(): void {
    const duration = this.player.seekableDuration
    const milestones = duration > 0 ? sortedMilestones(this.sighting.milestones) : []
    this.milestoneMarks.replaceChildren(
      ...milestones.map(milestone => {
        const mark = document.createElement("button")
        mark.type = "button"
        mark.className = "milestone-mark"
        mark.style.left = `${Math.min(Math.max(milestone.t / duration, 0), 1) * 100}%`
        const label = this.said.read(milestone.label) ?? ""
        const note = this.said.read(milestone.note)
        const name = note ? `${label} — ${note}` : label
        mark.title = name
        mark.setAttribute("aria-label", name)
        mark.dataset.t = String(milestone.t)
        mark.addEventListener("click", () => this.player.seek(milestone.t))
        return mark
      })
    )
    this.refreshSeekSegments(duration, milestones.map(milestone => milestone.t))
  }

  /** The bar's segments, one per stretch between two moments (or the one whole bar, without any),
   * and what each is filled with — see paintSeekProgress. */
  private seekSegmentList: Array<{ start: number; end: number; element: HTMLElement; played: HTMLElement; hover: HTMLElement }> = []

  /**
   * Cuts the bar where the moments begin. A moment at the very start, or past the end, cuts nothing:
   * an empty first segment would be a bar that begins with a gap. Turned off with the moments
   * themselves (see setMilestonesShown), which leaves the bar whole.
   */
  private refreshSeekSegments(duration: number, moments: readonly number[]): void {
    const cuts = this.milestonesShown && duration > 0
      ? [...new Set(moments.filter(t => t > 0 && t < duration))].sort((a, b) => a - b)
      : []
    const bounds = [0, ...cuts, Math.max(duration, 0)]
    this.seekSegmentList = []
    const segments: HTMLElement[] = []
    for (let i = 0; i < bounds.length - 1; i++) {
      const segment = document.createElement("div")
      segment.className = "seek-segment"
      segment.style.flexGrow = String(Math.max(bounds[i + 1]! - bounds[i]!, 1))
      const hover = document.createElement("i")
      hover.className = "seek-hover"
      const played = document.createElement("i")
      played.className = "seek-played"
      segment.append(hover, played)
      segments.push(segment)
      this.seekSegmentList.push({ start: bounds[i]!, end: bounds[i + 1]!, element: segment, played, hover })
    }
    this.seekSegments.replaceChildren(...segments)
    this.paintSeekProgress(this.player.time)
  }

  /** How much of a segment a position has reached, as a CSS percentage. */
  private static fillOf(segment: { start: number; end: number }, t: number): string {
    const span = segment.end - segment.start
    const share = span > 0 ? (t - segment.start) / span : t >= segment.end ? 1 : 0
    return `${Math.min(Math.max(share, 0), 1) * 100}%`
  }

  /** Fills the segments up to the playhead and moves the dot to it. Cheap enough for every frame:
   * a handful of style writes, no layout read. */
  private paintSeekProgress(t: number): void {
    for (const segment of this.seekSegmentList) segment.played.style.width = UfoElement.fillOf(segment, t)
    const duration = this.player.seekableDuration
    this.seekDot.style.left = `${duration > 0 ? Math.min(Math.max(t / duration, 0), 1) * 100 : 0}%`
  }

  /**
   * What the pointer is over on the bar: the bar lit up to it, and the preview above — the moment's
   * name and time, and the picture when whoever composes this element can draw one.
   */
  private hoverSeek(event: PointerEvent): void {
    const rect = this.seekInput.getBoundingClientRect()
    const duration = this.player.seekableDuration
    if (rect.width <= 0 || duration <= 0) return
    const share = Math.min(Math.max((event.clientX - rect.left) / rect.width, 0), 1)
    const t = share * duration
    const last = this.seekSegmentList.length - 1
    this.seekSegmentList.forEach((segment, index) => {
      segment.hover.style.width = UfoElement.fillOf(segment, t)
      segment.element.classList.toggle("hovered", t >= segment.start && (t < segment.end || index === last))
    })
    const milestones = this.milestonesShown ? this.sighting.milestones : []
    const moment = milestones.length > 0 ? resolveMilestoneAt(milestones, t) : undefined
    // The label AND the account's sentence: "D" alone says nothing to whoever has not read the list.
    const label = moment ? this.said.read(moment.label) ?? "" : ""
    const note = moment ? this.said.read(moment.note) : undefined
    const title = note ? `${label} — ${note}` : label
    this.seekPreviewTitle.textContent = title
    this.seekPreviewTime.textContent = this.formatPosition(t)
    this.seekPreview.hidden = false
    const width = this.seekPreview.offsetWidth
    this.seekPreview.style.left = `${Math.min(Math.max(share * rect.width - width / 2, 0), Math.max(rect.width - width, 0))}px`
    this.paintSeekPreview(t)
  }

  private leaveSeek(): void {
    for (const segment of this.seekSegmentList) {
      segment.hover.style.width = "0"
      segment.element.classList.remove("hovered")
    }
    this.seekPreview.hidden = true
  }

  /**
   * Draws what the picture is at `t` into the given canvas, or nothing — set by a composing element
   * that can (see SceneElement). Without one, the preview is the moment's name and time alone.
   * Called on every move of the pointer over the bar, so it answers for itself how much it draws.
   */
  seekPreviewPainter?: (t: number, canvas: HTMLCanvasElement) => void

  private paintSeekPreview(t: number): void {
    const painter = this.seekPreviewPainter
    this.seekPreviewCanvas.hidden = painter === undefined
    painter?.(t, this.seekPreviewCanvas)
  }

  /** Whether the next seek from the bar may snap to a mark: only the first one of a press, so that
   * a drag that passes a mark does not stick to it. */
  private seekSnapArmed = false

  /** Half the width of a mark's own hit area, in pixels of the bar. */
  private static readonly MARK_SNAP_PX = 6

  /** The moment whose mark stands within reach of a position along the bar, if any. */
  private markNear(t: number): { t: number; name: string } | undefined {
    const duration = this.player.seekableDuration
    const width = this.seekInput.getBoundingClientRect().width
    if (duration <= 0 || width <= 0) return undefined
    const reachMs = (UfoElement.MARK_SNAP_PX / width) * duration
    let nearest: { t: number; name: string } | undefined
    for (const mark of this.milestoneMarks.children as HTMLCollectionOf<HTMLElement>) {
      const markT = Number(mark.dataset.t)
      if (Math.abs(markT - t) > reachMs) continue
      if (!nearest || Math.abs(markT - t) < Math.abs(nearest.t - t)) nearest = { t: markT, name: mark.title }
    }
    return nearest
  }

  /** A press on the bar within a few pixels of a mark lands exactly on that moment — what
   * clicking the mark used to do, now that the bar keeps the pointer (see .milestone-mark). */
  private snapSeekToMark(t: number): number {
    if (!this.seekSnapArmed) return t
    this.seekSnapArmed = false
    return this.markNear(t)?.t ?? t
  }

  /** The bar says which moment the pointer is over, as the mark's own tooltip used to. */
  private nameMarkUnder(event: PointerEvent): void {
    const rect = this.seekInput.getBoundingClientRect()
    const duration = this.player.seekableDuration
    if (rect.width <= 0 || duration <= 0) return
    const t = ((event.clientX - rect.left) / rect.width) * duration
    const mark = this.markNear(t)
    if (mark) this.seekInput.title = mark.name
    else this.seekInput.removeAttribute("title")
  }

  /** Names the moment the recording is currently in — the last one reached, held until the next,
   * which is how every other keyframed field in this model resolves (see resolveMilestoneAt). */
  private showMilestoneAt(t: number): void {
    const current =
      this.milestonesShown && this.sighting.milestones.length > 0 ? resolveMilestoneAt(this.sighting.milestones, t) : undefined
    this.milestoneCaption.hidden = current === undefined
    if (!current) return
    const label = document.createElement("b")
    label.textContent = this.said.read(current.label) ?? ""
    // A real separator in the DOM, not a CSS margin: the caption is read as text as often as it is
    // looked at (a screen reader, a copied line), and "AZamora entend un rugissement" is not a
    // sentence.
    const said = this.said.read(current.note)
    const note = said ? ` — ${said}` : ""
    this.milestoneCaption.replaceChildren(label, document.createTextNode(note))
  }

  /**
   * The instants this frame is made of — one, unless the shutter was open long enough to matter.
   *
   * A photograph is not a moment: it is everything that crossed the frame while the shutter was
   * open, added together. A light that moved becomes a STREAK, and one that was blinking becomes a
   * dashed streak — which is how an aircraft's strobe signs its own picture, and one of the
   * commonest things a observer's photograph turns out to show. So a long exposure is drawn as what
   * it is: the object painted at every instant the shutter was open, each contributing its share.
   *
   * Only for exposures long enough to be seen — a thousandth of a second moves nothing, and paying
   * for sixteen paintings of the same pixel would be waste. And only from the recording's own
   * timeline, which is what actually holds the movement; the sky behind is drawn once, since over
   * these spans nothing celestial moves far (a star crosses a hundredth of a degree in a quarter of
   * a second) — a MINUTES-long pose, which would draw star trails, is a different piece of work.
   */
  private exposureInstants(t: number): { shapes: Map<string, Shape>; share: number }[] {
    const times = this.exposureTimes(t)
    const share = 1 / times.length
    return times.map(instant => ({ shapes: this.shapesAt(instant), share }))
  }

  /**
   * The instants a picture taken at `t` is made of, as times.
   *
   * Public because WHAT IS ON SCREEN is what a pointer is aimed at: a long pose draws the object
   * everywhere it went, and anything hit-testing the single instant `t` would answer "nothing
   * there" over most of a streak the reader can plainly see — which is how an object became
   * impossible to select once it had a pose long enough to move.
   *
   * How many: enough that consecutive paintings OVERLAP, which is a distance and not a duration.
   * The old rule counted time alone (one painting per fiftieth of a second, up to 48) and that is
   * what leaves a long pose visibly BEADED — a ten-second pose across three hundred pixels puts its
   * 48 paintings six pixels apart, and a reader sees the paintings rather than the streak. So the
   * object's own travel across the frame decides it, one instant per couple of pixels, and the
   * old count stands as a floor for a pose in which nothing moved but something changed (a light
   * brightening, a colour turning).
   */
  exposureTimes(t: number = this.currentTime): number[] {
    // The pose BEHIND the instant, ending on it — see ExposureSampling.windowEndingAt.
    const window = ExposureSampling.windowEndingAt(t, this.currentSighting.exposure ?? 0)
    if (window.ms < UfoElement.SHORTEST_VISIBLE_EXPOSURE_MS) return [t]
    const byTime = Math.min(
      UfoElement.MAX_EXPOSURE_STEPS,
      Math.max(2, Math.round(window.ms / UfoElement.SHORTEST_VISIBLE_EXPOSURE_MS))
    )
    const byTravel = Math.ceil(this.travelPxOver(window.fromMs, window.ms) / UfoElement.EXPOSURE_STEP_PX)
    const steps = Math.min(UfoElement.MAX_TRAVEL_STEPS, Math.max(byTime, byTravel))
    const times: number[] = []
    for (let step = 0; step < steps; step++) {
      // From the shutter's opening to the instant itself, that last one included: the object's
      // present place is the end of its own streak, and the one a pointer aimed at it must find.
      times.push(window.fromMs + (window.ms * step) / (steps - 1))
    }
    return times
  }

  /** How far the furthest-travelling shape moved across the canvas while the shutter was open —
   * measured between the two ends of the pose, which is what the streak's own length is. */
  private travelPxOver(fromMs: number, exposureMs: number): number {
    const start = this.shapesAt(fromMs)
    const end = this.shapesAt(fromMs + exposureMs)
    let furthest = 0
    for (const [sourceId, from] of start) {
      const to = end.get(sourceId)
      if (!to) continue
      const dx = to.bounds.x + to.bounds.width / 2 - (from.bounds.x + from.bounds.width / 2)
      const dy = to.bounds.y + to.bounds.height / 2 - (from.bounds.y + from.bounds.height / 2)
      furthest = Math.max(furthest, Math.hypot(dx, dy))
    }
    return furthest
  }

  /** Whichever shape a pointer at (x, y) is aimed at in the picture now on screen — the object at
   * any instant of the pose, not only at the playhead. See exposureTimes. */
  shapeAt(
    x: number,
    y: number,
    excludeSourceIds?: ReadonlySet<string>
  ): { sourceId: string; shape: Shape } | undefined {
    for (const instant of this.exposureTimes()) {
      const hit = this.currentSighting.timeline.hitTest(instant, x, y, excludeSourceIds)
      if (hit) return hit
    }
    return undefined
  }

  /** Every shape the recording holds at that instant, the way the player resolves them. */
  private shapesAt(t: number): Map<string, Shape> {
    const shapes = new Map<string, Shape>()
    for (const sourceId of this.currentSighting.timeline.sourceIds) {
      const shape = this.currentSighting.timeline.getInterpolatedShapeAt(t, sourceId)
      if (shape) shapes.set(sourceId, shape)
    }
    return shapes
  }

  /** Below this the shutter froze whatever it saw, and the streak is not worth painting — a
   * fiftieth of a second is about where a hand-held photograph stops showing movement. */
  private static readonly SHORTEST_VISIBLE_EXPOSURE_MS = 20
  /** However long the pose, this many paintings of it. Set by looking: at two dozen, an eight-second
   * streak came out visibly STRIPED — the object moves further than its own width between steps, and
   * a reader sees the steps rather than the streak. Twice that closes it up, and painting one shape
   * fifty times costs nothing worth counting. */
  private static readonly MAX_EXPOSURE_STEPS = 48
  /** How far apart two paintings of the object may land before the streak reads as beads. Two
   * pixels: at six (what a ten-second pose across the frame was getting) the scalloped edges of
   * each painting are plainly visible in the trail. */
  private static readonly EXPOSURE_STEP_PX = 2
  /** The ceiling on that, so a pose across the whole frame cannot ask for a thousand paintings.
   * 320 covers the widest travel this canvas can hold at two pixels a step. */
  private static readonly MAX_TRAVEL_STEPS = 320

  /**
   * Gives the canvas the shape of the picture this recording was actually made in — see
   * Instruments.frameWidthPx.
   *
   * The height never moves, so one degree stays the same number of pixels and nothing a observer
   * drew shifts up or down; only how much sky stands to either side changes. A square 126 frame is
   * as tall as an eye's and half as wide; a phone held upright is narrower still.
   *
   * ONLY WHEN IT ACTUALLY CHANGES: assigning to canvas.width resets the drawing surface, so doing
   * it unconditionally would clear the canvas on every single frame of playback.
   */
  private applyFrameFormat(): void {
    const width = Instruments.frameWidthPx(this.currentSighting.instrument, this.canvas.height)
    if (this.canvas.width === width) return
    this.canvas.width = width
    // The displayed box has to follow, or a 360-wide canvas would be stretched back out to the
    // sixteen-by-nine the CSS was holding it at, and the square frame would not look square.
    const frame = this.canvas.parentElement as HTMLElement | null
    frame?.style.setProperty("--frame-aspect", `${width} / ${this.canvas.height}`)
  }

  /** Converts a pointer event's CSS-pixel position into the canvas's fixed internal 640x360
   * drawing space (where Shape.bounds/Timeline.hitTest operate), correcting for the canvas being
   * displayed responsively at a different CSS size. Mirrors SightingEditorElement's own identical
   * (but private-to-that-class) canvasPointFromEvent — this is the only other call site. */
  private canvasPointFromEvent(event: PointerEvent): { x: number; y: number } | undefined {
    const rect = this.canvas.getBoundingClientRect()
    if (rect.width === 0 || rect.height === 0) return undefined
    return {
      x: ((event.clientX - rect.left) / rect.width) * this.canvas.width,
      y: ((event.clientY - rect.top) / rect.height) * this.canvas.height
    }
  }

  private onFrame(t: number, shapesBySource: Map<string, Shape>): void {
    this.canvasRenderer.clear(this.canvas.width, this.canvas.height)
    // Selection handles are an editing affordance — hidden while actively playing.
    const selectedIds = this.playbackState !== "playing" ? this.highlightedSourceIds : EMPTY_SELECTION
    // The instrument's own aperture decides whether a dazzling light wears a star — the same
    // statement SceneRenderer.setInstrument makes about the Sun, made here about the observer's own
    // object, which is painted on this overlay instead of in that scene.
    this.canvasRenderer.setStarPoints(Instruments.starPointsOf(this.sighting.instrument))
    // The observer's own walk turns the instrument a little as it carries it — a fraction of a degree
    // through an eye, the whole of it through a camera in a walking hand (see Gait, and
    // Instrument.stabilization). Added to the recorded roll here and to the scene's own camera in
    // SceneRenderer.setObserverPose, from the same numbers, so the two layers cannot drift apart.
    const roll = (resolveObserverPoseAt(this.sighting, t)?.rollDeg ?? 0) + this.gaitAt(t).rollDeg
    this.canvasRenderer.setRoll((roll * Math.PI) / 180)
    const instants = this.exposureInstants(t)
    const shift = this.frameShift
    if (this.paintsShapes) {
      for (const instant of instants) {
        for (const [, shape] of instant.shapes) {
          const share = instant.share
          const exposed = share === 1 ? shape : { ...shape, transparency: 1 - (1 - shape.transparency) * share }
          this.canvasRenderer.paintShape(this.shifted(exposed, shift))
        }
      }
    }
    // Drawn ONCE, over the finished picture, and always at the playhead's own instant — not once
    // per painting, which is both a stack of outlines and, since a share below one used to
    // disqualify a painting from being "the selected one", no outline at all on a long pose: a
    // shape stayed selectable and simply stopped LOOKING selected. Where the handles sit against
    // the streak is itself the answer to "which moment am I editing".
    for (const [sourceId, shape] of instants[0].shapes) {
      if (!this.selectionShown || !selectedIds.has(sourceId)) continue
      // A shape standing in the scene gets its handles and nothing else — paintShape would paint
      // the fill too, a flat unoccluded copy over the solid it is meant to be selecting.
      if (!this.paintsShapes) this.canvasRenderer.paintSelectionOnly(this.shifted(shape, shift))
      else if (selectedIds.size === 1) this.canvasRenderer.paintShape({ ...shape, selected: true })
      else this.canvasRenderer.paintMemberOutline(shape)
    }
    void shapesBySource
    if (this.selectionShown && selectedIds.size > 1) {
      const bounds = ShapeHandles.groupBoundsFor(
        [...shapesBySource].filter(([sourceId]) => selectedIds.has(sourceId)).map(([, shape]) => shape.bounds)
      )
      this.canvasRenderer.paintGroupHandles(bounds)
    }
    this.overlayPainter?.(this.canvasRenderer)
    this.mapShapeBounds = instants.flatMap(instant => [...instant.shapes.values()]
      .filter(shape => shape.transparency < 1).map(shape => this.shifted(shape, shift).bounds))
    this.keepObserverMapClear()
    this.seekInput.value = String(t)
    this.paintSeekProgress(t)
    this.timeStartLabel.textContent = this.formatPosition(t)
    this.showMilestoneAt(t)
    this.paintObserverMap(t)
    // The track is heard only while actually playing: onFrame is also the seek sink, and a observer
    // dragging the bar through a keyframe shouldn't fire a burst of sound at every position they
    // pass through. A preview outlives repaints on purpose (see previewSound), and playing ends it
    // — the recording itself is what should be heard from then on.
    if (this.playbackState === "playing") {
      this.soundPreview = undefined
      this.sightingAudio.setSound(resolveSoundAt(this.currentSighting, t))
    } else if (this.soundPreview) {
      this.sightingAudio.setSound(this.soundPreview)
    } else {
      this.sightingAudio.silence()
    }
    // Catches the player stopping on its own (reaching the end without loop), not just clicks —
    // safe to read playbackState here since Player.play() flips it before painting the last frame.
    this.updatePlayPauseButton()
    // Mirrors <video>'s own timeupdate event/semantics — fires on every playback tick AND every
    // seek, since both funnel through this one onFrame sink. Lets SightingEditorElement know when
    // to resync its appearance toolbar to whatever's at the current playhead.
    this.dispatchEvent(new CustomEvent("timeupdate", { detail: { time: t } }))
  }

  /** The same shape, moved by however far the frame has moved off the recorded pose — see
   * frameShift. */
  private shifted(shape: Shape, shift: { x: number; y: number }): Shape {
    if (shift.x === 0 && shift.y === 0) return shape
    return { ...shape, bounds: { ...shape.bounds, x: shape.bounds.x + shift.x, y: shape.bounds.y + shift.y } }
  }

  private createPlayer(): Player {
    const player = new Player(this.currentSighting.timeline, (t, shapesBySource) => this.onFrame(t, shapesBySource))
    player.loop = this.loopEnabled
    // Composed and bubbling, unlike timeupdate: this one exists for the PAGE around the element
    // — a page replaying several recordings in turn (see the carousel on ufoathome.org) sits
    // outside the shadow root of every element composing this one, and has no other way to know
    // that one reconstruction is over.
    player.onEnded = () => {
      this.updatePlayPauseButton()
      this.dispatchEvent(new CustomEvent("ended", { bubbles: true, composed: true }))
    }
    return player
  }

  /** How far the arrow keys move the seek bar, as on a video site. */
  private static readonly SEEK_KEY_STEP_MS = 5000

  /** The seek bar focused, the keys of a video player: left/right go back/forward 5 s, space plays
   * or pauses. The range input's own arrows would move it by its 1 ms step, and its space nothing. */
  /**
   * F toggles fullscreen while the focus is anywhere in the player. Not while typing: a field, a
   * select or an editable area keeps its letters — the editor is full of them, and it is not a
   * player anyway (it takes the canvas for drawing, see enableClickToPlay).
   */
  private readonly handleFullscreenKey = (event: KeyboardEvent): void => {
    if (event.key.toLowerCase() !== "f" || event.altKey || event.ctrlKey || event.metaKey) return
    if (!this.enableClickToPlay) return
    const typing = event.composedPath().some(node =>
      node instanceof HTMLElement && (node.isContentEditable || ["INPUT", "TEXTAREA", "SELECT"].includes(node.tagName)
        && (node as HTMLInputElement).type !== "range"))
    if (typing) return
    event.preventDefault()
    this.toggleFullscreen()
  }

  private readonly handleSeekKey = (event: KeyboardEvent): void => {
    if (event.altKey || event.ctrlKey || event.metaKey) return
    const step = event.key === "ArrowLeft" ? -1 : event.key === "ArrowRight" ? 1 : 0
    if (step) {
      event.preventDefault()
      const duration = this.player.seekableDuration
      this.player.seek(Math.min(duration, Math.max(0, this.player.time + step * UfoElement.SEEK_KEY_STEP_MS)))
    } else if (event.key === " ") {
      event.preventDefault()
      this.togglePlayPause()
    }
  }

  /** Public (not just used by this element's own overlay button) so a composing element's
   * external Play/Pause control — see SightingEditorElement/showToolbar — can trigger exactly this
   * same guarded behavior instead of reimplementing it. */
  togglePlayPause(): void {
    // Nothing to play — the button is already disabled for this case, but the canvas's own
    // click-to-play (enableClickToPlay) has no native "disabled" state of its own, so this guard
    // is what actually stops it there.
    if (this.player.seekableDuration <= 0) return
    if (this.player.playbackState === "playing") {
      this.player.pause()
      // pause() fires no further frame, so nothing else would ever stop the sound.
      this.soundPreview = undefined
      this.sightingAudio.silence()
      // pause() doesn't itself trigger a repaint — force one so the selection highlight
      // (hidden while playing) reappears immediately instead of staying hidden until some
      // unrelated repaint happens to occur.
      this.refresh()
    } else {
      // This call is only ever reached from a real user gesture (the Play button, the canvas's own
      // click-to-play, or a composing element's external button) — exactly what AudioContext.
      // resume() requires, and the only place this element has one.
      this.sightingAudio.resume()
      this.player.play()
    }
    this.updatePlayPauseButton()
    this.flashPlayback()
  }

  /** Shows for a moment, over the picture, what the reader just did — ▶ when it now plays, ⏸ when it
   * now pauses — as a video site does, since the toolbar that says so may well be hidden. */
  private flashPlayback(): void {
    const flash = this.playbackFlash
    flash.innerHTML = this.player.playbackState === "playing" ? PlayerIcons.PLAY : PlayerIcons.PAUSE
    // Restarted on every toggle, even one within the last: the class is taken off, a reflow read,
    // and put back, or the browser would see no change and not replay the animation.
    flash.classList.remove("flashing")
    void flash.offsetWidth
    flash.classList.add("flashing")
  }

  private static readonly icons = new WeakMap<HTMLElement, string>()

  /**
   * Puts a glyph in a button, unless it already wears it. Not a nicety: the play button is redrawn on
   * every tick of playback, and a click is a press and a release on the SAME element — replacing the
   * glyph between the two left the release on a node that was gone, and pausing by clicking the very
   * button that says "pause" did nothing.
   */
  private static setIcon(button: HTMLElement, icon: string): void {
    if (UfoElement.icons.get(button) === icon) return
    UfoElement.icons.set(button, icon)
    button.innerHTML = icon
  }

  /** How long the controls stay after the last touch, while playing, on a screen with no hover. */
  private static readonly CONTROLS_IDLE_MS = 3000

  private controlsIdleTimer?: number
  private wasPlaying = false
  /** Set by a touch that found the controls hidden over a playing recording: it shows them and does
   * nothing else — the click that follows it must not pause. */
  private tapRevealedOnly = false

  private get hoverless(): boolean {
    return typeof matchMedia === "function" && matchMedia("(hover: none)").matches
  }

  private touchedStage(): void {
    if (!this.hoverless) return
    const isPlaying = this.player.playbackState === "playing"
    if (isPlaying && !this.stageElement.classList.contains("touched")) this.tapRevealedOnly = true
    this.revealControls()
  }

  /** Whether a finger is down on the stage — a drag of the seek bar, above all. Controls being used
   * are never taken away: only a touch that has ended starts the few seconds. */
  private pointerHeld = false

  private readonly handlePointerDown = (): void => {
    this.pointerHeld = true
  }

  private readonly handlePointerRelease = (): void => {
    if (!this.pointerHeld) return
    this.pointerHeld = false
    if (this.hoverless && this.stageElement.classList.contains("touched")) this.revealControls()
  }

  /** Shows the controls, and takes them away again after CONTROLS_IDLE_MS if the recording is
   * playing. Paused, they stay: there is nothing behind them to see. */
  private revealControls(): void {
    this.stageElement.classList.add("touched")
    window.clearTimeout(this.controlsIdleTimer)
    if (this.player.playbackState !== "playing") return
    // Held down, they are in use: released, and only then, the few seconds begin (see handlePointerRelease).
    if (this.pointerHeld) return
    this.controlsIdleTimer = window.setTimeout(() => {
      this.stageElement.classList.remove("touched")
      this.tapRevealedOnly = false
    }, UfoElement.CONTROLS_IDLE_MS)
  }

  private updatePlayPauseButton(): void {
    const isPlaying = this.player.playbackState === "playing"
    this.stageElement.classList.toggle("paused", !isPlaying)
    // Playing begins with the controls in sight, and their few seconds start there. Only when it
    // begins: this runs on every tick, and would keep them there for ever.
    if (isPlaying !== this.wasPlaying && isPlaying && this.hoverless) this.revealControls()
    this.wasPlaying = isPlaying
    UfoElement.setIcon(this.playPauseButton, isPlaying ? PlayerIcons.PAUSE : PlayerIcons.PLAY)
    // Nothing to play with zero observation duration (no declared duration and nothing recorded
    // yet) — disabled rather than silently doing nothing on click, which otherwise briefly
    // flickers into "playing" and straight back out again every time (see Player.play()'s
    // immediate-stop branch when seekableDuration is 0). The title/label explain *why* it's
    // disabled instead of just showing a stale "Play" that gives no hint anything's wrong.
    const hasDuration = this.player.seekableDuration > 0
    this.playPauseButton.disabled = !hasDuration
    const label = !hasDuration ? this.messages.noDuration : isPlaying ? this.messages.pause : this.messages.play
    this.playPauseButton.title = label
    this.playPauseButton.setAttribute("aria-label", label)
  }

  /** Public for the same reason as togglePlayPause — see its own doc comment. */
  toggleLoop(): void {
    this.loopEnabled = !this.loopEnabled
    this.player.loop = this.loopEnabled
  }

  /**
   * Undoes what the two clicks inside a double-click did to playback.
   *
   * A double-click is two clicks first, so click-to-play has already fired twice by the time it
   * arrives. Twice is usually a round trip and looks like nothing happened — but not always: a
   * recording sitting stopped at its own end is RESTARTED by the first of them (standard media
   * behaviour, see Player.play), so the pair would leave it paused at the beginning. Going
   * fullscreen is not a request to rewind, so the position goes back, and the state with it as
   * nearly as this element can put it — a recording that was stopped at its end comes back paused
   * there, which shows the same frame and the same button.
   *
   * Restoring rather than suppressing, because suppressing means waiting to find out whether a
   * second click is coming, and that delay would be paid by every ordinary play/pause on the
   * canvas — the gesture people actually use — to smooth over the rarer one.
   */
  private restorePlayback(): void {
    const before = this.playbackBeforeClick
    if (!before) return
    this.currentTime = before.time
    if (before.state === "playing") this.play()
    else this.pause()
  }

  /**
   * Whether the real Fullscreen API can be used here at all.
   *
   * On an iPhone it cannot, in ANY browser: every iOS browser is WebKit underneath, and WebKit on
   * the phone exposes no Element.requestFullscreen at all (only a video can go fullscreen, through
   * its own method). Calling it there does not reject — it throws, because the method does not
   * exist — so the button simply did nothing, which is exactly how it was reported.
   *
   * `document.fullscreenEnabled` catches the other case with the same answer: an embedding
   * <iframe> without allow="fullscreen", or a Permissions-Policy that disables it. In both, the
   * CSS stand-in below is what the reader should get instead of a dead button.
   */
  private get canUseNativeFullscreen(): boolean {
    return typeof this.fullscreenTarget.requestFullscreen === "function" && document.fullscreenEnabled
  }

  private toggleFullscreen(): void {
    if (!this.canUseNativeFullscreen) {
      if (this.simulatedFullscreen) this.exitSimulatedFullscreen()
      else this.enterSimulatedFullscreen()
      return
    }
    if (document.fullscreenElement) {
      void document.exitFullscreen()
    } else {
      // Logged (not silently swallowed): the most common real-world rejection reasons — an
      // embedding <iframe> missing allow="fullscreen", or a Permissions-Policy header disabling
      // it — give no other visible symptom otherwise.
      this.fullscreenTarget.requestFullscreen().catch(err => {
        console.error("<rr0-ufo>: requestFullscreen() failed —", err)
      })
    }
  }

  /**
   * Fills the viewport with the stage using ordinary CSS, where the real thing is unavailable.
   *
   * Inline styles rather than a class, because the target is not necessarily in THIS component's
   * shadow tree: a composing element hands over its own stage (see SceneElement, which sets
   * fullscreenTarget so the sky goes fullscreen along with the shapes drawn over it), and a class
   * defined in this component's stylesheet would never reach it.
   *
   * `100dvh` over `100vh` for the phone this exists for: on iOS the visible height changes as the
   * browser's own bars slide away, and the dynamic unit is the one that follows it. The plain unit
   * is written first and stays as the fallback wherever the dynamic one is not understood.
   *
   * Nothing else has to be told: the composing element already watches its frame with a
   * ResizeObserver (see SceneElement), so the 3D canvas and its camera follow this by themselves.
   */
  private enterSimulatedFullscreen(): void {
    const target = this.fullscreenTarget
    this.styleBeforeSimulatedFullscreen = target.getAttribute("style") ?? ""
    this.bodyOverflowBeforeSimulatedFullscreen = document.body.style.overflow
    const style = target.style
    style.setProperty("position", "fixed")
    style.setProperty("inset", "0")
    style.setProperty("margin", "0")
    style.setProperty("max-width", "none")
    style.setProperty("max-height", "none")
    // The stage carries an aspect-ratio (see sceneTemplate/ufoTemplate) and it wins here even
    // against an explicit width AND height: measured, the box came out 1541 px wide inside a 601 px
    // viewport — its own 640:360 taken from the height. Real fullscreen is spared this because the
    // stylesheet has a :fullscreen rule; the stand-in has to say it itself. Letterboxing is not
    // lost: .frame keeps its own ratio and stays centred, which is what that rule does too.
    style.setProperty("aspect-ratio", "auto")
    style.setProperty("z-index", "2147483647")
    style.setProperty("background", "#000")
    // The plain unit first and the dynamic one over it: setProperty with a value the engine does
    // not understand does nothing, so a browser without dvh/dvw simply keeps the line before.
    style.setProperty("width", "100vw")
    style.setProperty("width", "100dvw")
    style.setProperty("height", "100vh")
    style.setProperty("height", "100dvh")
    // Otherwise the page keeps scrolling behind a stage that now covers it, which on a phone reads
    // as the reconstruction sliding about under the finger.
    document.body.style.overflow = "hidden"
    this.simulatedFullscreen = true
    document.addEventListener("keydown", this.handleSimulatedFullscreenKey)
    this.updateFullscreenButton()
    this.updateMuteButton()
  }

  private exitSimulatedFullscreen(): void {
    if (!this.simulatedFullscreen) return
    const target = this.fullscreenTarget
    // Restored from what was there, not by deleting the properties this set: the page may have had
    // inline styles of its own on that element.
    if (this.styleBeforeSimulatedFullscreen) target.setAttribute("style", this.styleBeforeSimulatedFullscreen)
    else target.removeAttribute("style")
    document.body.style.overflow = this.bodyOverflowBeforeSimulatedFullscreen ?? ""
    this.simulatedFullscreen = false
    document.removeEventListener("keydown", this.handleSimulatedFullscreenKey)
    this.updateFullscreenButton()
    this.updateMuteButton()
  }

  /**
   * Opens or closes the map of where the observer stood — see ObserverMapRenderer for what it draws
   * and why the cone is the part that matters.
   *
   * Public, like togglePlayPause and toggleFullscreen, so a composing element (SceneElement's own
   * outer stage, a case page's own control) can offer the same thing without reaching into the
   * shadow DOM.
   */
  toggleObserverMap(): void {
    const open = this.observerMapPanel.hidden
    // Asked for, so shown: a map that stepped aside for the phenomenon would otherwise answer the
    // reader's click with nothing at all — see keepObserverMapClear.
    this.observerMapAsked = open
    this.setObserverMapOpen(open)
    this.keepObserverMapClear()
  }

  /** Whether the reader opened the map themselves, which outranks its stepping aside. */
  private observerMapAsked = false

  /**
   * Puts the map where the page said it should START — see OBSERVER_MAP_ATTRIBUTE.
   *
   * A DEFAULT, applied when the page states one and when a new recording arrives, and nowhere else.
   * In particular not on every `refresh()`: the editor calls that on every keystroke, and a default
   * re-applied there would reopen a map the author had just closed, over and over. What a reader or
   * an author does with the map afterwards is theirs until the page or the recording changes.
   */
  private applyObserverMapDefault(): void {
    const stated = this.getAttribute(OBSERVER_MAP_ATTRIBUTE)
    const open = stated === null ? this.observerPath?.travels === true : stated !== "false"
    this.setObserverMapOpen(open && this.observerPath !== undefined)
  }

  private setObserverMapOpen(open: boolean): void {
    this.observerMapPanel.hidden = !open
    // No native title on the panel: it said "hide the map", which stopped being true the moment a
    // click started going somewhere instead of closing it — and a browser tooltip would in any case
    // fight the map's own, which names whatever mark the pointer is actually on.
    this.observerMapPanel.removeAttribute("title")
    this.observerMapButton.setAttribute("aria-pressed", String(open))
    this.updateObserverMapButton()
    if (!open) return
    this.sizeObserverMapCanvas()
    void this.loadObserverMapImagery()
    this.paintObserverMap(this.currentTime)
  }

  private updateObserverMapButton(): void {
    const open = !this.observerMapPanel.hidden
    UfoElement.setIcon(this.observerMapButton, open ? PlayerIcons.MAP_ON : PlayerIcons.MAP_OFF)
    const label = open ? this.messages.hideObserverMap : this.messages.showObserverMap
    this.observerMapButton.title = label
    this.observerMapButton.setAttribute("aria-label", label)
    const zoomLabels: Array<[HTMLButtonElement, string]> = [
      [this.mapZoomInButton, this.messages.zoomMapIn],
      [this.mapZoomOutButton, this.messages.zoomMapOut],
      [this.mapFitButton, this.messages.fitMap]
    ]
    for (const [button, text] of zoomLabels) {
      button.title = text
      button.setAttribute("aria-label", text)
    }
  }

  /**
   * Offers the map for every recording that actually states where it happened, works out the ground
   * it will cover, and leaves the open state to applyObserverMapDefault.
   *
   * The BUTTON depends on the recording, the OPEN STATE on the page — two different questions, and
   * conflating them was the first version's mistake. A recording with no coordinates gets no button
   * rather than a button onto an empty map; one that has them gets a button whether or not any page
   * thought to ask, because a reader wanting to know where this happened is not a thing a page can
   * predict. What a page can say is which of its own reconstructions are worth opening it on from
   * the first frame — see OBSERVER_MAP_ATTRIBUTE.
   */
  private updateObserverMap(): void {
    const hadPath = this.observerPath !== undefined
    this.observerPath = ObserverPath.of(this.currentSighting)
    this.observerMapButton.hidden = this.observerPath === undefined
    // A recording that has just BECOME mappable is the editor's ordinary case: an author types the
    // first latitude and longitude, and the map they asked for has somewhere to point at last. That
    // is a new answer to the page's question, not a re-application of its default over a reader's
    // own choice — which is why it is a transition and not something refresh() does every time.
    if (!hadPath && this.observerPath) this.applyObserverMapDefault()
    if (!this.observerPath) {
      this.setObserverMapOpen(false)
      this.observerMapBounds = undefined
      return
    }
    const bounds = this.observerPath.boundsAround(UfoElement.OBSERVER_MAP_MIN_SPAN_M, UfoElement.OBSERVER_MAP_MARGIN)
    // Only a real change of ground throws the photograph away. An editor nudging a coordinate moves
    // these bounds by a metre on every keystroke, and refetching a tile grid for that would be one
    // request per keypress for an image indistinguishable from the one already held.
    if (!this.observerMapBounds || !this.sameGround(this.observerMapBounds, bounds)) {
      if (this.observerMapBounds) this.observerMapView.refit(this.observerMapBounds, bounds)
      this.observerMapBounds = bounds
      this.observerMapImagery = undefined
      this.observerMapImageryCredit = undefined
      this.observerMapImageryFailed = false
      this.observerMapImageryBounds = undefined
      this.observerMapImageryLoading = false
      if (!this.observerMapPanel.hidden) void this.loadObserverMapImagery()
    }
  }

  /** Whether two boxes are the same piece of country for a reader's purposes — within a twentieth
   * of their own width on every edge. */
  private sameGround(a: GeoBounds, b: GeoBounds): boolean {
    const tolerance = Math.abs(a.east - a.west) / 20
    return (
      Math.abs(a.north - b.north) < tolerance &&
      Math.abs(a.south - b.south) < tolerance &&
      Math.abs(a.west - b.west) < tolerance &&
      Math.abs(a.east - b.east) < tolerance
    )
  }

  /**
   * Fetches the aerial photograph for the current map bounds, once.
   *
   * Only ever from the reader opening the map, never from loading a recording: these are real tile
   * requests to a third party, and an embedded player that fired them for every case dossier a page
   * happens to list would be spending someone else's quota on maps nobody asked to see.
   *
   * A failure is not an error state here. The path, the cone and the scale are drawn from the
   * recording itself and need no network at all; the photograph is context. So a refused,
   * offline or blocked fetch leaves the map standing and says what is missing.
   */
  private async loadObserverMapImagery(): Promise<void> {
    const view = this.observerMapViewBounds
    if (!view || this.observerMapPanel.hidden || this.observerMapImageryLoading || !this.observerMapImageryNeededFor(view)) return
    // Zoomed, the map moves — the reader drags it, and it follows the observer — so it is asked for
    // with half a view of ground on every side, at twice the pixels to keep the same sharpness:
    // the next stretch is already there when the map slides onto it. The fitted box never moves
    // and is asked for as it is.
    const zoomed = this.observerMapView.changed
    const bounds = zoomed ? ObserverMapView.expand(view, UfoElement.OBSERVER_MAP_IMAGERY_AHEAD) : view
    const pixels = UfoElement.OBSERVER_MAP_IMAGERY_PX * (zoomed ? 1 + 2 * UfoElement.OBSERVER_MAP_IMAGERY_AHEAD : 1)
    this.observerMapImageryBounds = bounds
    this.observerMapImageryViewWidth = view.east - view.west
    this.observerMapImageryLoading = true
    const provider = defaultImageryProvider()
    try {
      const imagery = await provider.getImageryTexture(bounds, { width: pixels, height: pixels })
      // The recording may have been swapped while this was in flight — a page playing several in
      // turn does exactly that — and painting one observer's ground under another's path is worse
      // than painting no ground at all.
      if (this.observerMapImageryBounds !== bounds) return
      this.observerMapImagery = imagery
      this.observerMapImageryCredit = provider.attribution
      this.observerMapImageryFailed = false
    } catch {
      if (this.observerMapImageryBounds !== bounds) return
      // A coarser photograph already held is still the right ground: only say it is missing when
      // there is none.
      this.observerMapImageryFailed = this.observerMapImagery === undefined
    } finally {
      if (this.observerMapImageryBounds === bounds) this.observerMapImageryLoading = false
    }
    this.paintObserverMap(this.currentTime)
    // The map may have moved on while this was in flight.
    this.scheduleObserverMapImagery()
  }

  /** How much ground a zoomed map asks for beyond its view, per side, as a fraction of the view. */
  private static readonly OBSERVER_MAP_IMAGERY_AHEAD = 0.5
  /** How much of that it keeps in hand: the next photograph is asked for while a quarter of a view
   * is still covered ahead, not once the gap is on screen. */
  private static readonly OBSERVER_MAP_IMAGERY_LOOKAHEAD = 0.25

  /**
   * Whether the ground now shown needs a photograph of its own — never asked for, not covered by the
   * one held, or zoomed far enough into it that its pixels would show. Asked once per piece of
   * ground, failed or not: a refused request is not retried until the reader moves on.
   */
  private observerMapImageryNeededFor(view: GeoBounds): boolean {
    const asked = this.observerMapImageryBounds
    if (!asked) return true
    const held = this.observerMapImagery?.bounds ?? asked
    const ahead = this.observerMapView.changed ? ObserverMapView.expand(view, UfoElement.OBSERVER_MAP_IMAGERY_LOOKAHEAD) : view
    const covered = ahead.west >= held.west && ahead.east <= held.east && ahead.south >= held.south && ahead.north <= held.north
    const sharp = view.east - view.west > this.observerMapImageryViewWidth / 2
    return !covered || !sharp
  }

  /**
   * What the imagery provider's licence requires be shown wherever its tiles are — undefined until
   * a map has actually fetched some.
   *
   * Public so a composing element can put it where a reader will find it (see
   * `<rr0-sighting>`'s credits, and creditShownExternally, which is how this element then stops
   * printing it over the map itself).
   */
  get observerMapCredit(): string | undefined {
    return this.observerMapImageryCredit
  }

  /** The line along the bottom of the map: the licence where nowhere else carries it, and the
   * missing-imagery note either way. */
  private get observerMapFooterLine(): string | undefined {
    if (this.observerMapImageryFailed) return this.messages.mapImageryUnavailable
    return this.creditShownExternally ? undefined : this.observerMapImageryCredit
  }

  /** Matches the drawing surface to the size CSS gave the panel, at the display's own pixel
   * density — a map drawn at CSS resolution and scaled up is a map whose road markings are guesses.
   * Read here rather than on every frame: this is a layout read, and the panel only changes size
   * when the stage does. */
  /**
   * Moves the map out from in front of the phenomenon.
   *
   * The top-right corner is the emptiest part of nearly every sky this project draws, which is why
   * the map lives there — but "nearly" is not "always", and a map that covers the very thing the
   * reader opened it to place is worse than no map. When the drawn phenomenon reaches under it, it
   * goes to the other corner; when both corners are covered it temporarily disappears.
   *
   * The two thresholds are not the same number on purpose. It leaves as soon as anything touches
   * it and only comes back once the sky is clear by a margin, so an object drifting along its edge
   * does not make it hop from corner to corner.
   */
  private mapShapeBounds: Array<{ x: number; y: number; width: number; height: number }> = []
  private mapSceneBounds: Array<{ x: number; y: number; width: number; height: number }> = []

  /** Scene subjects (including an aircraft's accumulated trail), in normalized picture coordinates. */
  setMapSubjectBounds(bounds: ReadonlyArray<{ x: number; y: number; width: number; height: number }>): void {
    this.mapSceneBounds = bounds.map(box => ({ x: box.x * this.canvas.width, y: box.y * this.canvas.height,
      width: box.width * this.canvas.width, height: box.height * this.canvas.height }))
    this.keepObserverMapClear()
  }

  private keepObserverMapClear(): void {
    if (this.observerMapPanel.hidden) return
    const box = this.observerMapBoxPx
    if (!box) return
    const subjects = [...this.mapShapeBounds, ...this.mapSceneBounds]
    const covers = (left: number, right: number, slack: number): boolean => {
      for (const bounds of subjects) {
        if (bounds.x + bounds.width < left - slack || bounds.x > right + slack) continue
        if (bounds.y > box.bottom + slack || bounds.y + bounds.height < box.top - slack) continue
        return true
      }
      return false
    }
    const rightCorner: [number, number] = [this.canvas.width - box.width, this.canvas.width]
    const leftCorner: [number, number] = [0, box.width]
    const margin = UfoElement.OBSERVER_MAP_CLEARANCE_PX
    const rightCovered = covers(...rightCorner, 0)
    const leftCovered = covers(...leftCorner, 0)
    this.observerMapPanel.classList.toggle("subject-overlap", rightCovered && leftCovered && !this.observerMapAsked)
    if (this.observerMapPanel.classList.contains("on-the-left")) {
      // Back to the corner it prefers, but only once that corner is clear by the margin — the
      // asymmetry IS the anti-flicker: leaving costs nothing, returning has to be sure.
      if (!rightCovered && (leftCovered || !covers(rightCorner[0], rightCorner[1], margin))) this.observerMapPanel.classList.remove("on-the-left")
      return
    }
    if (covers(rightCorner[0], rightCorner[1], 0) && !covers(leftCorner[0], leftCorner[1], 0)) {
      this.observerMapPanel.classList.add("on-the-left")
    }
  }

  /** Where the map panel sits over the picture, in the fixed pixels shapes are drawn in — measured
   * when the stage is sized rather than every frame, which would be a layout read per tick. */
  private observerMapBoxPx?: { width: number; top: number; bottom: number }

  /** How far the phenomenon has to clear the map before it comes back to the corner it prefers. */
  private static readonly OBSERVER_MAP_CLEARANCE_PX = 24

  private sizeObserverMapCanvas(): void {
    const side = this.observerMapPanel.clientWidth
    if (side === 0) return
    const pixels = Math.round(side * (globalThis.devicePixelRatio ?? 1))
    this.measureObserverMapBox()
    if (this.observerMapCanvas.width === pixels) return
    this.observerMapCanvas.width = pixels
    this.observerMapCanvas.height = pixels
  }

  /** The panel's own rectangle, expressed in the canvas's fixed drawing pixels — see
   * observerMapBoxPx. Both are laid out inside the same stage, so one pair of rects converts. */
  private measureObserverMapBox(): void {
    const panel = this.observerMapPanel.getBoundingClientRect()
    const picture = this.canvas.getBoundingClientRect()
    if (picture.width === 0 || picture.height === 0) return
    const scaleX = this.canvas.width / picture.width
    const scaleY = this.canvas.height / picture.height
    this.observerMapBoxPx = {
      width: panel.width * scaleX,
      top: (panel.top - picture.top) * scaleY,
      bottom: (panel.bottom - picture.top) * scaleY
    }
  }

  /**
   * Draws the map at the instant now on screen — called from onFrame, so it advances with playback
   * and follows the seek bar, which is what makes it a reading of the recording rather than an
   * illustration beside it.
   */
  private paintObserverMap(t: number): void {
    if (this.observerMapPanel.hidden || !this.observerPath || !this.observerMapBounds) return
    const pose = resolveObserverPoseAt(this.currentSighting, t)
    // A zoomed map recentres on the observer rather than let them walk off it — but not while the reader
    // is dragging it, which would fight their hand; the release brings them back.
    if (pose?.lat !== undefined && pose.lng !== undefined && !this.observerMapDrag?.moved &&
      this.observerMapView.keepInView(this.observerMapBounds, { lat: pose.lat, lng: pose.lng }, UfoElement.OBSERVER_MAP_FOLLOW_MARGIN)) {
      this.scheduleObserverMapImagery()
    }
    const instrument = this.currentSighting.instrument
    const markers: ObserverMapMarker[] = []
    const current = this.currentSighting.milestones.length > 0 ? resolveMilestoneAt(this.currentSighting.milestones, t) : undefined
    for (const milestone of this.milestonesShown ? sortedMilestones(this.currentSighting.milestones) : []) {
      const at = resolveObserverPoseAt(this.currentSighting, milestone.t)
      if (at?.lat === undefined || at.lng === undefined) continue
      markers.push({
        label: this.said.read(milestone.label) ?? "",
        note: this.said.read(milestone.note),
        t: milestone.t,
        lat: at.lat,
        lng: at.lng,
        current: milestone === current
      })
    }
    this.observerMapRenderer.paint({
      bounds: this.observerMapViewBounds!,
      imagery: this.observerMapImagery,
      path: this.observerPath,
      position: pose?.lat !== undefined && pose.lng !== undefined ? { lat: pose.lat, lng: pose.lng } : undefined,
      // Where the VIEW points, not merely where the record says he faced — see ObserverMapFrame.
      headingDeg: pose?.headingDeg === undefined ? undefined : pose.headingDeg + this.lookYawDeg,
      // The instrument's real field, through its own projection — the wedge is only evidence if it
      // is the wedge this device actually took in. See ImageProjection.halfWidthAngleDeg.
      coneHalfAngleDeg: pose
        ? ImageProjection.of(instrument, this.canvas.height, pose.fovDeg).halfWidthAngleDeg(Instruments.aspectOf(instrument))
        : undefined,
      markers,
      decor: this.observerMapDecorAt(t),
      observerLabel: this.said.read(this.currentSighting.observer?.title) ?? this.messages.observerHere,
      nightFraction: this.observerMapNightFraction,
      attribution: this.observerMapFooterLine
    })
  }

  /**
   * Shows or hides the account's own named moments — the marks along the bar, the caption naming the
   * one being played, and the lettered points on the map, which are three views of the same few
   * facts and so go together.
   *
   * Public for the same reason as toggleObserverMap.
   */
  toggleMilestones(): void {
    this.setMilestonesShown(!this.milestonesShown)
  }

  private setMilestonesShown(shown: boolean): void {
    this.milestonesShown = shown
    this.milestoneMarks.hidden = !shown
    this.refreshSeekSegments(this.player.seekableDuration, sortedMilestones(this.sighting.milestones).map(milestone => milestone.t))
    this.milestonesButton.setAttribute("aria-pressed", String(shown))
    this.updateMilestonesButton()
    // The caption is driven by the playhead, not by this — asking it again is what makes it appear
    // and disappear on the spot instead of at the next frame.
    this.showMilestoneAt(this.currentTime)
    this.paintObserverMap(this.currentTime)
  }

  /** The button is there when there is something for it to show. A recording that names no moment
   * gets none — most name none. */
  private updateMilestonesButton(): void {
    this.milestonesButton.hidden = this.currentSighting.milestones.length === 0
    UfoElement.setIcon(this.milestonesButton, this.milestonesShown ? PlayerIcons.MILESTONES_ON : PlayerIcons.MILESTONES_OFF)
    const label = this.milestonesShown ? this.messages.hideMilestones : this.messages.showMilestones
    this.milestonesButton.title = label
    this.milestonesButton.setAttribute("aria-label", label)
  }

  /**
   * Where the recording's own scenery stands, on the ground rather than in front of the camera.
   *
   * `DecorObject.eastM`/`northM` are metres from the observer's pose at **t=0**, not from wherever
   * they happen to be now — the same reference the 3D scene anchors to (see
   * SceneRenderer.updateDecorAnchoring, which exists because treating them as an offset from the
   * CURRENT pose made every building follow the observer around). Resolving them against that one
   * pose is what leaves the shack where the shack was while the observer drives past it.
   *
   * Empty for a recording whose t=0 pose has no coordinates at all: a metre offset from nowhere is
   * not a place, and guessing one would put scenery on ground it was never on.
   *
   * A cultivated field is left off it entirely (see DecorKind's own "crop"). What this map draws is
   * what the observer's own view is checked AGAINST — was the shack inside what they could see, was
   * the car between them and it — and the ground they walked over is neither. It is also a matter of
   * counting: Masse's field is a hundred and forty rows, and a hundred and forty markers along his
   * path drew two solid blue bars either side of it, which read as walls he was walking between
   * rather than as the field he was walking through.
   */
  private observerMapDecorAt(t: number): ObserverMapDecor[] {
    const reference = resolveObserverPoseAt(this.currentSighting, 0)
    if (reference?.lat === undefined || reference.lng === undefined) return []
    return this.currentSighting.decor.filter(object => object.kind !== "crop").map(object => {
      const placement = resolveDecorPlacementAt(object, t)
      const { lat, lng } = localMetersToGeo(placement.eastM, -placement.northM, reference.lat!, reference.lng!)
      return { lat, lng, headingDeg: placement.headingDeg, label: this.said.read(object.title) ?? this.messages.decorHere }
    })
  }

  /**
   * How dark it was where the map is looking, 0 to 1 — undefined until something tells this element
   * where the Sun was.
   *
   * Nothing here works it out. This player carries no astronomy at all and must not start: the
   * library that answers "where was the Sun at 02:45 on 24 July 1948" costs more than this whole
   * bundle, and the point of `<rr0-ufo>` is that a page can drop it into an article for the price of
   * a picture. `<rr0-scene>` already computes the real Sun for its own sky, so it is the one that
   * says (see its updateAstronomy). A bare player is left with the photograph as it came, which is
   * honest: it has not been told anything about the light.
   */
  private observerMapNightFraction?: number

  /**
   * Told by a composing element that knows where the Sun was — see observerMapNightFraction.
   *
   * Fully dark by −12°, the end of nautical twilight, rather than by 0°: the ground is still lit
   * for a while after the Sun has set, and a map that went black the instant it crossed the horizon
   * would be wrong about every dusk sighting this project has.
   */
  setSunAltitude(altitudeDeg: number | undefined): void {
    const night = altitudeDeg === undefined ? undefined : Math.max(0, Math.min(1, -altitudeDeg / 12))
    if (night === this.observerMapNightFraction) return
    this.observerMapNightFraction = night
    this.paintObserverMap(this.currentTime)
  }

  /** Turns what is painted over the scene along with the scene — see lookYawDeg. Called by a
   * composing element; a bare player has no way to turn the view and so never leaves zero. */
  setLookOffset(yawDeg: number, pitchDeg: number): void {
    if (yawDeg === this.lookYawDeg && pitchDeg === this.lookPitchDeg) return
    this.lookYawDeg = yawDeg
    this.lookPitchDeg = pitchDeg
    // refresh() repaints both the picture and the map, which is what keeps the cone pointing where
    // the picture is actually looking.
    this.refresh()
  }

  /** How far the reader's own turn moves the overlay, in the pixels shapes are drawn in — public
   * because a composing element testing what the decor hides has to ask about the point a shape is
   * actually PAINTED at, not the one the timeline stores (see SceneElement.pushPhenomenaAt). */
  get frameShiftPx(): { x: number; y: number } {
    return this.frameShift
  }

  /**
   * How far everything painted on this overlay has moved off the recorded pose, pixels — a reader
   * having turned the view (see setLookOffset), and the observer's own walk having turned the
   * instrument under them (see Gait).
   *
   * Read by whoever tests those shapes against the 3D scenery behind them as well as by whoever
   * paints them (see SceneElement's occlusion sampling), which is the whole reason it is one value
   * and not two: a shape drawn a centimetre to the left of where it is tested for occlusion comes
   * out in front of a wall it is behind.
   */
  private get frameShift(): { x: number; y: number } {
    const gait = this.gaitAt(this.currentTime)
    const yawDeg = this.lookYawDeg + gait.yawDeg
    const pitchDeg = this.lookPitchDeg + gait.pitchDeg
    if (yawDeg === 0 && pitchDeg === 0) return { x: 0, y: 0 }
    const pose = resolveObserverPoseAt(this.currentSighting, this.currentTime)
    const projection = ImageProjection.of(this.currentSighting.instrument, this.canvas.height, pose?.fovDeg ?? 60)
    return { x: -projection.angleDegToRadiusPx(yawDeg), y: projection.angleDegToRadiusPx(pitchDeg) }
  }

  /** What the observer's own walking is doing to the instrument at t — nothing for a observer who
   * stood still, which is most of them. Rebuilt on demand rather than cached, for the reason
   * Gait.of gives: an editor moves keyframes without the recording ever changing identity. */
  private gaitAt(t: number): GaitOffset {
    return Gait.bodyAt(this.currentSighting, t, this.steadyObserver)
  }

  /** Whether the recording's sound is silenced — by the reader, with the button beside play. Kept
   * here and told to whoever else makes sound over it (see SceneElement's weather) by an event. */
  private mutedState = false

  get muted(): boolean {
    return this.mutedState
  }

  set muted(muted: boolean) {
    if (muted === this.mutedState) return
    this.mutedState = muted
    // Unmuting from nothing has nothing to restore: back to a heard level.
    if (!muted && this.volumeState === 0) this.volumeState = UfoElement.RESTORED_VOLUME
    this.applyLevel()
  }

  /** How loud, 0 to 1, when not muted. Kept while muted, so that unmuting gives it back. */
  private volumeState = 1

  private static readonly RESTORED_VOLUME = 0.5

  get volume(): number {
    return this.volumeState
  }

  set volume(volume: number) {
    this.setVolume(volume)
  }

  private setVolume(volume: number): void {
    this.volumeState = Math.min(Math.max(volume, 0), 1)
    this.mutedState = this.volumeState === 0
    this.applyLevel()
  }

  /** What is actually heard: nothing when muted, the volume otherwise. */
  get level(): number {
    return this.mutedState ? 0 : this.volumeState
  }

  private applyLevel(): void {
    this.sightingAudio.setLevel(this.level)
    this.updateMuteButton()
    this.dispatchEvent(new CustomEvent("mutedchange", { bubbles: true, composed: true, detail: { muted: this.mutedState, volume: this.volumeState } }))
  }

  toggleMuted(): void {
    this.muted = !this.mutedState
  }

  private updateMuteButton(): void {
    UfoElement.setIcon(this.muteButton, this.mutedState ? PlayerIcons.MUTED : PlayerIcons.VOLUME)
    const label = this.mutedState ? this.messages.unmute : this.messages.mute
    this.muteButton.title = label
    this.muteButton.setAttribute("aria-label", label)
    this.muteButton.setAttribute("aria-pressed", String(this.mutedState))
    this.volumeInput.value = String(this.level)
  }

  private updateFullscreenButton(): void {
    const isFullscreen = this.simulatedFullscreen || document.fullscreenElement === this.fullscreenTarget
    UfoElement.setIcon(this.fullscreenButton, isFullscreen ? PlayerIcons.EXIT_FULLSCREEN : PlayerIcons.ENTER_FULLSCREEN)
    this.fullscreenButton.title = isFullscreen ? this.messages.exitFullscreen : this.messages.fullscreen
    this.fullscreenButton.setAttribute("aria-label", this.fullscreenButton.title)
  }

  /**
   * Auto-detects the visitor's preferred UI language from `navigator.languages`, falling back to
   * English (already baked into the template) when none of their preferences are supported —
   * see selectLocale. There is deliberately no language-picker UI: this is the only mechanism.
   */
  /**
   * Which of a recording's languages this reader reads — see SaidText.
   *
   * Built on demand and cached, not at construction: it reads the nearest `[lang]` ancestor, and
   * an element still being upgraded has no ancestors yet. Dropped on connection so that moving
   * this element into a section declaring another language is honoured.
   */
  private get said(): SaidTexts {
    return this.saidTexts ??= new SaidTexts(HostLocale.preferencesFor(this))
  }

  private saidTexts?: SaidTexts

  private async loadLocaleMessages(): Promise<void> {
    const language = selectLocale(HostLocale.preferencesFor(this), UFO_SUPPORTED_LANGUAGES) as UfoLanguage
    // Connected again in the same language (moved within one page): nothing to fetch. English is
    // baked into the template, so it needs a module only to replace another language shown before.
    if (language === this.messagesLanguage || (language === "en" && this.messagesLanguage === undefined)) return
    this.messagesLanguage = language
    const messages = await loadUfoMessages(language)
    if (this.messagesLanguage === language) {
      this.applyMessages(messages)
    }
  }

  private messagesLanguage?: UfoLanguage

  /**
   * Both counters' titles: what the value is, and — when there is a second reading to switch to —
   * what clicking will do.
   *
   * A control that looks exactly like static text has to say so somewhere, and the title is the
   * only place a counter this small can say it. With no start time recorded there is nothing to
   * switch to, so it stays plain text and says nothing it cannot do.
   */
  private updateTimeLabelTitles(): void {
    const hint = this.showClockTime ? this.messages.switchToElapsed : this.messages.switchToClockTime
    const suffix = this.canSwitchTimeDisplay ? ` — ${hint}` : ""
    this.timeStartLabel.title = this.messages.currentPosition + suffix
    this.timeEndLabel.title = this.messages.duration + suffix
    this.timePill.classList.toggle("switchable", this.canSwitchTimeDisplay)
    if (this.canSwitchTimeDisplay) {
      this.timePill.setAttribute("role", "button")
      this.timePill.setAttribute("tabindex", "0")
    } else {
      this.timePill.removeAttribute("role")
      this.timePill.removeAttribute("tabindex")
    }
  }

  private applyMessages(messages: UfoMessages): void {
    this.messages = messages
    this.updateTimeLabelTitles()
    this.updatePlayPauseButton()
    this.updateFullscreenButton()
    this.updateMuteButton()
    this.updateObserverMapButton()
    this.updateReferencesButton()
    this.updateMilestonesButton()
    this.renderIssues()
  }

  /**
   * Caches the sighting's real-world reported duration/start (see sightingDurationMs) and sets
   * the player's playback rate and the seek bar's end label from them, rather than from
   * `timeline.duration` (how long the recording itself took to author).
   */
  private updateTimeLabels(): void {
    const event = this.currentSighting.event
    const durationMs = sightingDurationMs(event)
    this.realDurationMs = durationMs !== undefined && durationMs > 0 ? durationMs : undefined
    this.realStartMs = event.time ? sightingTimeToMs(event.time) : undefined

    const timelineDuration = this.currentSighting.timeline.duration
    // Only stretches when there's actually some raw recorded motion to stretch (preserves the
    // original "quick drag, auto-stretched" behavior exactly). When timelineDuration is 0 —
    // nothing recorded yet, e.g. a duration was just declared before any motion was placed —
    // dividing by realDurationMs would give playbackRate 0, freezing Play the instant it's
    // pressed; falling back to 1 (real-time pace) instead lets it actually advance.
    this.player.playbackRate =
      this.realDurationMs !== undefined && timelineDuration > 0 ? timelineDuration / this.realDurationMs : 1
    // Lets an editor scrub to and place a keyframe anywhere across the full real declared
    // duration before anything's been recorded there yet (see Player.seekableDuration's own doc
    // comment) — but ONLY while there's nothing recorded to stretch, the exact same condition
    // playbackRate uses just above, and for the same reason: once motion exists, the stretch
    // already maps the timeline's whole [0, timelineDuration] range onto the full real duration,
    // so every real instant is reachable within it and extending the range beyond only adds
    // positions with two conflicting meanings. Extending it anyway is what made a real
    // observation's clock run FORWARDS to the declared end at t=timelineDuration and then jump
    // BACKWARDS for the rest of the bar (Socorro on rr0.org: 17:50:20 at 30% of the bar, then
    // 17:50:07 just after, the same 20 seconds shown twice with the object frozen throughout) —
    // formatPosition reads t <= timelineDuration as stretched timeline-ms and anything beyond as
    // raw real-ms, two different time bases on one slider.
    this.player.durationOverrideMs = timelineDuration > 0 ? 0 : (this.realDurationMs ?? 0)

    this.timeEndLabel.textContent = this.formatEndOfTimeline()
    this.timeStartLabel.textContent = this.formatPosition(this.player.time)
    // Whether there is a second reading to switch to is decided by realStartMs, which was only
    // just recomputed a few lines above: a sighting loaded after construction changes the answer.
    this.updateTimeLabelTitles()
  }

  /**
   * Turns a `Timeline` position (ms since recording start, i.e. what Player deals in) into what's
   * actually displayed: a real clock time (e.g. "02:47") when a real start/duration are both
   * known, an elapsed real duration ("0:00" based) when only the duration is known, or the
   * recording's own elapsed time when neither is known — see updateTimeLabels.
   */
  private formatPosition(t: number): string {
    if (this.realDurationMs === undefined) return formatElapsed(t)
    const timelineDuration = this.currentSighting.timeline.duration
    // Only rescales within what's actually been recorded so far (the original "stretch a
    // finished recording to match its real reported length" behavior). Beyond that — scrubbed
    // into not-yet-recorded territory, made reachable by Player.durationOverrideMs — there's no
    // recorded pacing to stretch, so t is already a real-ms position (1 timeline-ms == 1 real-ms
    // is the natural default until real recorded data establishes a different scale).
    const realElapsedMs = timelineDuration > 0 && t <= timelineDuration ? (t / timelineDuration) * this.realDurationMs : t
    return this.canShowClockTime
      ? formatClockTime(msToTimeOfDay(this.realStartMs! + realElapsedMs))
      : formatElapsed(realElapsedMs)
  }

  /**
   * The fixed end-of-timeline label — always the *full* real declared duration (clock time or
   * elapsed), or the recording's own length when no real duration is known. Unlike
   * formatPosition, doesn't scale by `timeline.duration`: a single-keyframe/static recording
   * (timeline.duration === 0) still has a full declared real duration to show as its end.
   */
  private formatEndOfTimeline(): string {
    if (this.realDurationMs === undefined) return formatElapsed(this.currentSighting.timeline.duration)
    return this.canShowClockTime
      ? formatClockTime(msToTimeOfDay(this.realStartMs! + this.realDurationMs))
      : formatElapsed(this.realDurationMs)
  }
}

function msToTimeOfDay(ms: number): SightingTime {
  const date = new Date(ms)
  return { hour: date.getUTCHours(), minute: date.getUTCMinutes(), second: date.getUTCSeconds() }
}

function formatClockTime(time: SightingTime): string {
  if (time.hour === undefined) return "0:00"
  const pad = (n: number) => String(n).padStart(2, "0")
  // A truthy check (not `!== undefined`): a computed end time always has a `second` field (even
  // when it's exactly 0, e.g. a whole-minute duration), which shouldn't force ":00" onto a
  // display otherwise matching the source data's minute-level precision.
  return time.second
    ? `${pad(time.hour)}:${pad(time.minute ?? 0)}:${pad(time.second)}`
    : `${pad(time.hour)}:${pad(time.minute ?? 0)}`
}

function formatElapsed(ms: number): string {
  const totalSeconds = Math.round(ms / 1000)
  const minutes = Math.floor(totalSeconds / 60)
  const seconds = totalSeconds % 60
  return `${minutes}:${String(seconds).padStart(2, "0")}`
}

export const UFO_ELEMENT_NAME = "rr0-ufo"

export function registerUfo(): void {
  if (!customElements.get(UFO_ELEMENT_NAME)) {
    customElements.define(UFO_ELEMENT_NAME, UfoElement)
  }
}

/** Fired by <rr0-ufo> (and so through every component that holds one) once a loaded recording has
 * been checked: `detail.issues` is the list of RecordingIssue, empty when there is nothing to say. */
export const RECORDING_ISSUES_EVENT = "recordingissues"
