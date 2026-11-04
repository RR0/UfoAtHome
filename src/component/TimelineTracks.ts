import { Icons } from "./Icons.js"

/** One track of the recording: what it is called, its colour, when its keyframes are, and what its name and its "+" do. */
export interface TimelineTrack {
  id: string
  label: string
  /** The track's own colour, the same in both schemes: the timeline is drawn over the scene's dark. */
  color: string
  times: readonly number[]
  /** The events that give this track its values, as bars from their start to their end (see RecordingEvents): shown instead of keyframes. */
  spans?: readonly TimelineSpan[]
  /** Opens the section that edits this track. */
  open(): void
  /** Puts a keyframe of this track at the playhead, or edits the one already there. */
  add(): void
}

/** An event on a track, from when to when, ms. */
export interface TimelineSpan {
  t: number
  until: number
  label: string
}

/** What the tracks say, beyond each track's own name. */
export interface TimelineTracksMessages {
  addKeyframeHere: string
  /** The "+"'s tooltip when a keyframe of the track is at the playhead already: pressing it edits that one. */
  keyframeHere: string
  /** The scroll bar's tooltip, shown once zoomed in: how to zoom and scroll. */
  zoomHint: string
}

/**
 * The recording's tracks laid out under the scene, one row each: its name, which opens the section that edits it, its keyframes as
 * diamonds along the length of the recording (filled when the playhead is on one), and a "+" that keyframes the track at the
 * playhead (see the design handoff, §3.4). A press on a row moves the playhead there; on a diamond, exactly to it.
 *
 * The lanes show a window of the recording, the whole of it at first. As in the performance panel of a browser's developer tools, a
 * pinch (or a wheel with Ctrl or ⌘) zooms in and out around the pointer, and a sideways swipe (or a wheel with Shift) scrolls; a bar
 * under the lanes, shown once zoomed in, says which part is shown and drags it along.
 *
 * Drawn again only when what it shows changes: the playhead moves every frame of a playback, and only the diamonds it reaches and the
 * line it stands on follow it then. A zoom or a scroll places what is drawn again, without drawing it anew (a focused track stays unfolded).
 */
export class TimelineTracks {
  static readonly CSS = `
.timeline-tracks { display: grid; grid-template-columns: max-content minmax(0, 1fr) auto; align-items: center; gap: 6px 10px; padding: 10px 14px 12px; }
.timeline-tracks[hidden] { display: none; }
.track-name { display: inline-block; justify-self: start; min-height: 0; padding: 2px 0; border: 0; background: none; color: var(--ink-dim, inherit); font: 600 12px/1.3 var(--sans, inherit); cursor: pointer; }
/* The tracks' names are the words the marks of the seek bar use inside a sentence ("Keyframe (shapes)"): capitalised here, where they stand alone. */
.track-name::first-letter { text-transform: uppercase; }
.track-name:hover { color: var(--ink, inherit); text-decoration: underline; background: none; }
.track-row { display: contents; }
.track-lane { position: relative; height: 24px; border-radius: 6px; background: var(--ground-sunken, rgba(127, 127, 127, .12)); cursor: pointer; transition: height .15s ease; touch-action: pan-y; }
.track-lane:focus-visible { outline: 2px solid var(--track); outline-offset: 1px; }
/* A track focused (its name, its lane or its "+") unfolds to show all its events, each row at a readable height; it folds back when the focus leaves. */
.track-row:focus-within .track-lane { height: max(24px, calc(var(--rows, 1) * 18px + 4px)); }
.track-row:focus-within .track-lane .span { font-size: 11px; }
.track-lane .kf { position: absolute; top: 50%; width: 9px; height: 9px; margin: -5px 0 0 -5px; border: 1.5px solid var(--track); background: transparent; transform: rotate(45deg); pointer-events: none; }
.track-lane .kf[aria-current="true"] { background: var(--track); }
.track-lane .span { position: absolute; box-sizing: border-box; min-width: 3px; border: 1px solid var(--track); border-radius: 4px; background: color-mix(in srgb, var(--track) 30%, transparent);
  overflow: hidden; padding: 0 4px; font: 600 10px/1 var(--sans, inherit); color: var(--ink, inherit); white-space: nowrap; text-overflow: ellipsis; display: flex; align-items: center; pointer-events: none; }
.track-lane .playhead { position: absolute; top: -3px; bottom: -3px; width: 2px; margin-left: -1px; background: #f5c451; pointer-events: none; }
.track-lane [hidden] { display: none; }
.track-add { width: 28px; height: 28px; min-width: 28px; min-height: 28px; padding: 0; border-radius: 8px; }
.track-scroll { grid-column: 2; position: relative; height: 8px; border-radius: 4px; background: var(--ground-sunken, rgba(127, 127, 127, .12)); cursor: pointer; touch-action: none; }
.track-scroll[hidden] { display: none; }
.track-scroll .thumb { position: absolute; top: 0; bottom: 0; min-width: 12px; border-radius: 4px; background: color-mix(in srgb, currentColor 35%, transparent); cursor: grab; }
.track-scroll .thumb:active { cursor: grabbing; }
`

  /** The narrowest window a zoom reaches, ms: a few frames of a playback. */
  private static readonly MIN_WINDOW_MS = 200

  private tracks: readonly TimelineTrack[] = []
  private duration = 0
  private currentTime = 0
  private drawn = ""
  /** The part of the recording the lanes show, ms. */
  private windowStart = 0
  private windowLength = 0
  private readonly lanes = new Map<string, HTMLElement>()
  private readonly adds = new Map<string, HTMLButtonElement>()
  private readonly scroll: HTMLElement
  private readonly thumb: HTMLElement

  constructor(private readonly host: HTMLElement, private readonly seek: (t: number) => void, private messages: TimelineTracksMessages) {
    host.classList.add("timeline-tracks")
    this.scroll = document.createElement("div")
    this.scroll.className = "track-scroll"
    this.scroll.hidden = true
    this.thumb = document.createElement("div")
    this.thumb.className = "thumb"
    this.scroll.append(this.thumb)
    this.scroll.addEventListener("pointerdown", event => this.dragWindow(event))
    host.addEventListener("wheel", event => this.wheel(event), { passive: false })
  }

  setMessages(messages: TimelineTracksMessages): void {
    this.messages = messages
    this.drawn = ""
  }

  /** Shows `tracks` over a recording `duration` ms long, with the playhead at `currentTime`. */
  show(tracks: readonly TimelineTrack[], duration: number, currentTime: number): void {
    this.tracks = tracks
    // Another length is another recording, or one cut: it is shown whole again.
    if (duration !== this.duration || this.windowLength === 0) {
      this.windowStart = 0
      this.windowLength = Math.max(1, duration)
    }
    this.duration = duration
    this.currentTime = currentTime
    const signature = JSON.stringify([duration, tracks.map(track => [track.id, track.label, track.times, track.spans])])
    if (signature !== this.drawn) {
      this.drawn = signature
      this.draw()
    }
    this.place(currentTime)
  }

  /** Whether part of the recording is out of the lanes. */
  get zoomed(): boolean {
    return this.windowLength < Math.max(1, this.duration)
  }

  /**
   * Shows `length` ms of the recording from `start`, kept within it: the instant `anchor` stays under the same point of the lanes when
   * the window narrows or widens around it.
   */
  zoomTo(length: number, anchor = this.windowStart + this.windowLength / 2): void {
    const whole = Math.max(1, this.duration)
    const next = Math.min(whole, Math.max(Math.min(whole, TimelineTracks.MIN_WINDOW_MS), length))
    const share = (anchor - this.windowStart) / this.windowLength
    this.windowLength = next
    this.scrollTo(anchor - share * next)
  }

  /** Shows the window from `start`, kept within the recording. */
  scrollTo(start: number): void {
    this.windowStart = Math.min(Math.max(1, this.duration) - this.windowLength, Math.max(0, start))
    this.layout()
    this.place(this.currentTime)
  }

  private wheel(event: WheelEvent): void {
    const lane = (event.target as Element).closest?.(".track-lane, .track-scroll")
    if (!lane) return
    const box = lane.getBoundingClientRect()
    if (box.width === 0) return
    if (event.ctrlKey || event.metaKey) {
      // A pinch on a trackpad comes as a wheel with Ctrl: the page would zoom instead.
      event.preventDefault()
      const anchor = this.windowStart + ((event.clientX - box.left) / box.width) * this.windowLength
      this.zoomTo(this.windowLength * Math.exp(event.deltaY * 0.01), anchor)
      return
    }
    const sideways = event.shiftKey && event.deltaX === 0 ? event.deltaY : event.deltaX
    // A scroll up or down is the page's; a sideways one moves the window, while there is somewhere to move it.
    if (!this.zoomed || Math.abs(sideways) <= Math.abs(event.shiftKey ? 0 : event.deltaY)) return
    event.preventDefault()
    this.scrollTo(this.windowStart + (sideways / box.width) * this.windowLength)
  }

  /** A press on the bar: on the thumb it drags the window along, elsewhere it centres the window there first. */
  private dragWindow(event: PointerEvent): void {
    const box = this.scroll.getBoundingClientRect()
    if (box.width === 0) return
    const whole = Math.max(1, this.duration)
    if (event.target !== this.thumb) this.scrollTo(((event.clientX - box.left) / box.width) * whole - this.windowLength / 2)
    const from = event.clientX
    const start = this.windowStart
    this.scroll.setPointerCapture?.(event.pointerId)
    const move = (moved: PointerEvent) => this.scrollTo(start + ((moved.clientX - from) / box.width) * whole)
    const end = () => {
      this.scroll.removeEventListener("pointermove", move)
      this.scroll.removeEventListener("pointerup", end)
      this.scroll.removeEventListener("pointercancel", end)
    }
    this.scroll.addEventListener("pointermove", move)
    this.scroll.addEventListener("pointerup", end)
    this.scroll.addEventListener("pointercancel", end)
  }

  /** Where an instant is along the lanes, as a share of their width. */
  private x(t: number): number {
    return ((t - this.windowStart) / this.windowLength) * 100
  }

  private draw(): void {
    this.host.replaceChildren()
    this.lanes.clear()
    this.adds.clear()
    for (const track of this.tracks) {
      const name = document.createElement("button")
      name.type = "button"
      name.className = "track-name"
      name.textContent = track.label
      name.addEventListener("click", () => track.open())
      const lane = document.createElement("div")
      lane.className = "track-lane"
      lane.style.setProperty("--track", track.color)
      lane.setAttribute("role", "group")
      lane.setAttribute("aria-label", track.label)
      lane.tabIndex = 0
      // The events in rows, each in the first where it overlaps none: a drive under the looks it carries.
      const rows: number[] = []
      const placed = (track.spans ?? []).map(event => {
        let row = rows.findIndex(end => end <= event.t)
        if (row < 0) row = rows.push(0) - 1
        rows[row] = event.until
        return { event, row }
      })
      lane.style.setProperty("--rows", String(Math.max(1, rows.length)))
      for (const { event, row } of placed) {
        const bar = document.createElement("span")
        bar.className = "span"
        bar.textContent = event.label
        bar.title = event.label
        bar.dataset.t = String(event.t)
        bar.dataset.until = String(event.until)
        bar.style.top = `${(row / rows.length) * 100}%`
        bar.style.height = `${100 / rows.length}%`
        lane.append(bar)
      }
      for (const t of track.times) {
        const diamond = document.createElement("span")
        diamond.className = "kf"
        diamond.dataset.t = String(t)
        lane.append(diamond)
      }
      const playhead = document.createElement("span")
      playhead.className = "playhead"
      lane.append(playhead)
      lane.addEventListener("pointerdown", event => this.seekFrom(lane, track, event))
      const add = document.createElement("button")
      add.type = "button"
      add.className = "icon-btn track-add"
      add.innerHTML = Icons.PLUS
      add.addEventListener("click", () => track.add())
      // One row of the grid, kept together so that a focus anywhere in it unfolds its lane.
      const row = document.createElement("div")
      row.className = "track-row"
      row.append(name, lane, add)
      this.host.append(row)
      this.lanes.set(track.id, lane)
      this.adds.set(track.id, add)
    }
    this.host.append(this.scroll)
    this.layout()
  }

  /** Puts what is drawn where the window shows it: a bar cut to the part in view, so that its name starts where it can be read. */
  private layout(): void {
    const end = this.windowStart + this.windowLength
    for (const lane of this.lanes.values()) {
      for (const bar of lane.querySelectorAll<HTMLElement>(".span")) {
        const from = Math.max(this.windowStart, Number(bar.dataset.t))
        const until = Math.min(end, Math.max(1, this.duration), Number(bar.dataset.until))
        bar.hidden = until <= from
        bar.style.left = `${this.x(from)}%`
        bar.style.width = `${this.x(until) - this.x(from)}%`
      }
      for (const diamond of lane.querySelectorAll<HTMLElement>(".kf")) {
        const t = Number(diamond.dataset.t)
        diamond.hidden = t < this.windowStart || t > end
        diamond.style.left = `${this.x(t)}%`
      }
    }
    const whole = Math.max(1, this.duration)
    this.scroll.hidden = !this.zoomed
    this.scroll.title = this.messages.zoomHint
    this.thumb.style.left = `${(this.windowStart / whole) * 100}%`
    this.thumb.style.width = `${(this.windowLength / whole) * 100}%`
  }

  /** A press within a diamond's reach lands on it; elsewhere, on the instant under the pointer. */
  private seekFrom(lane: HTMLElement, track: TimelineTrack, event: PointerEvent): void {
    const box = lane.getBoundingClientRect()
    if (box.width === 0) return
    const reach = (6 / box.width) * this.windowLength
    const t = Math.min(Math.max(1, this.duration), Math.max(0, this.windowStart + ((event.clientX - box.left) / box.width) * this.windowLength))
    const near = track.times.reduce<number | undefined>((best, k) => Math.abs(k - t) <= reach && (best === undefined || Math.abs(k - t) < Math.abs(best - t)) ? k : best, undefined)
    this.seek(Math.round(near ?? t))
  }

  private place(currentTime: number): void {
    const end = this.windowStart + this.windowLength
    for (const track of this.tracks) {
      const lane = this.lanes.get(track.id)
      const add = this.adds.get(track.id)
      if (!lane || !add) continue
      const here = track.times.some(t => Math.abs(t - currentTime) < 1)
      for (const diamond of lane.querySelectorAll<HTMLElement>(".kf")) diamond.setAttribute("aria-current", String(Math.abs(Number(diamond.dataset.t) - currentTime) < 1))
      const playhead = lane.querySelector<HTMLElement>(".playhead")!
      playhead.hidden = currentTime < this.windowStart || currentTime > end
      playhead.style.left = `${this.x(Math.min(Math.max(1, this.duration), currentTime))}%`
      const title = `${track.label} · ${here ? this.messages.keyframeHere : this.messages.addKeyframeHere}`
      add.title = title
      add.setAttribute("aria-label", title)
    }
  }
}
