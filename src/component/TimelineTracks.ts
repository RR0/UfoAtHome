import { Icons } from "./Icons.js"

/** One track of the recording: what it is called, its colour, when its keyframes are, and what its name and its "+" do. */
export interface TimelineTrack {
  id: string
  label: string
  /** The track's own colour, the same in both schemes: the timeline is drawn over the scene's dark. */
  color: string
  times: readonly number[]
  /** Opens the section that edits this track. */
  open(): void
  /** Puts a keyframe of this track at the playhead, or edits the one already there. */
  add(): void
}

/** What the tracks say, beyond each track's own name. */
export interface TimelineTracksMessages {
  addKeyframeHere: string
  /** The "+"'s tooltip when a keyframe of the track is at the playhead already: pressing it edits that one. */
  keyframeHere: string
}

/**
 * The recording's tracks laid out under the scene, one row each: its name, which opens the section that edits it, its keyframes as
 * diamonds along the length of the recording (filled when the playhead is on one), and a "+" that keyframes the track at the
 * playhead (see the design handoff, §3.4). A press on a row moves the playhead there; on a diamond, exactly to it.
 *
 * Drawn again only when what it shows changes: the playhead moves every frame of a playback, and only the diamonds it reaches and the
 * line it stands on follow it then.
 */
export class TimelineTracks {
  static readonly CSS = `
.timeline-tracks { display: grid; grid-template-columns: max-content minmax(0, 1fr) auto; align-items: center; gap: 6px 10px; padding: 10px 14px 12px; }
.timeline-tracks[hidden] { display: none; }
.track-name { display: inline-block; justify-self: start; min-height: 0; padding: 2px 0; border: 0; background: none; color: var(--ink-dim, inherit); font: 600 12px/1.3 var(--sans, inherit); cursor: pointer; }
/* The tracks' names are the words the marks of the seek bar use inside a sentence ("Keyframe (shapes)"): capitalised here, where they stand alone. */
.track-name::first-letter { text-transform: uppercase; }
.track-name:hover { color: var(--ink, inherit); text-decoration: underline; background: none; }
.track-lane { position: relative; height: 24px; border-radius: 6px; background: var(--ground-sunken, rgba(127, 127, 127, .12)); cursor: pointer; }
.track-lane .kf { position: absolute; top: 50%; width: 9px; height: 9px; margin: -5px 0 0 -5px; border: 1.5px solid var(--track); background: transparent; transform: rotate(45deg); pointer-events: none; }
.track-lane .kf[aria-current="true"] { background: var(--track); }
.track-lane .playhead { position: absolute; top: -3px; bottom: -3px; width: 2px; margin-left: -1px; background: #f5c451; pointer-events: none; }
.track-add { width: 28px; height: 28px; min-width: 28px; min-height: 28px; padding: 0; border-radius: 8px; }
`

  private tracks: readonly TimelineTrack[] = []
  private duration = 0
  private drawn = ""
  private readonly lanes = new Map<string, HTMLElement>()
  private readonly adds = new Map<string, HTMLButtonElement>()

  constructor(private readonly host: HTMLElement, private readonly seek: (t: number) => void, private messages: TimelineTracksMessages) {
    host.classList.add("timeline-tracks")
  }

  setMessages(messages: TimelineTracksMessages): void {
    this.messages = messages
    this.drawn = ""
  }

  /** Shows `tracks` over a recording `duration` ms long, with the playhead at `currentTime`. */
  show(tracks: readonly TimelineTrack[], duration: number, currentTime: number): void {
    this.tracks = tracks
    this.duration = duration
    const signature = JSON.stringify([duration, tracks.map(track => [track.id, track.label, track.times])])
    if (signature !== this.drawn) {
      this.drawn = signature
      this.draw()
    }
    this.place(currentTime)
  }

  private draw(): void {
    this.host.replaceChildren()
    this.lanes.clear()
    this.adds.clear()
    const span = Math.max(1, this.duration)
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
      for (const t of track.times) {
        const diamond = document.createElement("span")
        diamond.className = "kf"
        diamond.dataset.t = String(t)
        diamond.style.left = `${(t / span) * 100}%`
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
      this.host.append(name, lane, add)
      this.lanes.set(track.id, lane)
      this.adds.set(track.id, add)
    }
  }

  /** A press within a diamond's reach lands on it; elsewhere, on the instant under the pointer. */
  private seekFrom(lane: HTMLElement, track: TimelineTrack, event: PointerEvent): void {
    const box = lane.getBoundingClientRect()
    if (box.width === 0) return
    const span = Math.max(1, this.duration)
    const reach = (6 / box.width) * span
    const t = Math.min(span, Math.max(0, ((event.clientX - box.left) / box.width) * span))
    const near = track.times.reduce<number | undefined>((best, k) => Math.abs(k - t) <= reach && (best === undefined || Math.abs(k - t) < Math.abs(best - t)) ? k : best, undefined)
    this.seek(Math.round(near ?? t))
  }

  private place(currentTime: number): void {
    const span = Math.max(1, this.duration)
    for (const track of this.tracks) {
      const lane = this.lanes.get(track.id)
      const add = this.adds.get(track.id)
      if (!lane || !add) continue
      const here = track.times.some(t => Math.abs(t - currentTime) < 1)
      for (const diamond of lane.querySelectorAll<HTMLElement>(".kf")) diamond.setAttribute("aria-current", String(Math.abs(Number(diamond.dataset.t) - currentTime) < 1))
      lane.querySelector<HTMLElement>(".playhead")!.style.left = `${(Math.min(span, currentTime) / span) * 100}%`
      const title = `${track.label} · ${here ? this.messages.keyframeHere : this.messages.addKeyframeHere}`
      add.title = title
      add.setAttribute("aria-label", title)
    }
  }
}
