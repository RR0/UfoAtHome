/** One instant worth seeing on a seek bar — a keyframe of what is being edited, or a named moment. */
export interface TimelineMark {
  t: number
  kind: "keyframe" | "milestone"
  /** What the bar says when the pointer is over it. */
  label: string
}

/**
 * The editor's seek bar made to show where things happen on it: a tick under the bar for each
 * keyframe of whatever the open group edits, a taller one for each named moment — and a press
 * within a few pixels of one lands exactly on it, so an author can go back to a keyframe to change
 * it instead of creating a new one a few milliseconds away.
 *
 * Seen, never grabbed: the layer lets the pointer through to the bar under it, as the reader's own
 * milestone marks do (see UfoElement.snapSeekToMark), so dragging the thumb keeps working over them.
 */
export class TimelineMarks {
  /** Half the width of a mark's reach, in pixels of the bar. */
  private static readonly SNAP_PX = 6

  private marks: TimelineMark[] = []
  private duration = 0
  /** What is drawn, so a caller refreshing on every tick rebuilds nothing when nothing changed. */
  private drawn = ""
  /** Only the first seek of a press snaps: a drag that passes a mark does not stick to it. */
  private snapArmed = false

  constructor(private readonly seekInput: HTMLInputElement, private readonly layer: HTMLElement) {
    seekInput.addEventListener("pointerdown", event => {
      this.snapArmed = true
      this.nameMarkUnder(event)
    })
    seekInput.addEventListener("pointerup", () => (this.snapArmed = false))
    seekInput.addEventListener("pointermove", event => this.nameMarkUnder(event))
    seekInput.addEventListener("pointerleave", () => seekInput.removeAttribute("title"))
  }

  show(marks: ReadonlyArray<TimelineMark>, duration: number): void {
    const shown = duration > 0 ? [...marks].sort((a, b) => a.t - b.t) : []
    const drawn = `${duration}|${shown.map(mark => `${mark.kind}:${mark.t}:${mark.label}`).join("|")}`
    if (drawn === this.drawn) return
    this.drawn = drawn
    this.marks = shown
    this.duration = duration
    this.layer.replaceChildren(
      ...shown.map(mark => {
        const tick = document.createElement("span")
        tick.className = `timeline-mark ${mark.kind}`
        tick.style.left = `${Math.min(Math.max(mark.t / duration, 0), 1) * 100}%`
        return tick
      })
    )
  }

  /** Where a seek to `t` from the bar should land: on the mark within reach if the press just
   * started, where it was aimed otherwise. */
  snap(t: number): number {
    if (!this.snapArmed) return t
    this.snapArmed = false
    return this.markNear(t)?.t ?? t
  }

  /** The first mark strictly after `t` — a keyframe is where an author goes to change it. */
  next(t: number): number | undefined {
    return this.marks.find(mark => mark.t > t + TimelineMarks.SAME_INSTANT)?.t
  }

  previous(t: number): number | undefined {
    return [...this.marks].reverse().find(mark => mark.t < t - TimelineMarks.SAME_INSTANT)?.t
  }

  /** Under a millisecond is the same instant: a playhead left on a mark must not count as before it. */
  private static readonly SAME_INSTANT = 0.5

  private markNear(t: number): TimelineMark | undefined {
    const width = this.seekInput.getBoundingClientRect().width
    if (this.duration <= 0 || width <= 0) return undefined
    const reach = (TimelineMarks.SNAP_PX / width) * this.duration
    let nearest: TimelineMark | undefined
    for (const mark of this.marks) {
      if (Math.abs(mark.t - t) > reach) continue
      // A named moment wins a tie with a keyframe at the same place: it is the one with a name.
      if (!nearest || Math.abs(mark.t - t) < Math.abs(nearest.t - t) || (mark.t === nearest.t && mark.kind === "milestone")) nearest = mark
    }
    return nearest
  }

  private nameMarkUnder(event: PointerEvent): void {
    const rect = this.seekInput.getBoundingClientRect()
    if (rect.width <= 0 || this.duration <= 0) return
    const names = this.marksNear(((event.clientX - rect.left) / rect.width) * this.duration)
    if (names) this.seekInput.title = names
    else this.seekInput.removeAttribute("title")
  }

  /** Every mark at the nearest instant within reach — several tracks often share one. */
  private marksNear(t: number): string | undefined {
    const nearest = this.markNear(t)
    if (!nearest) return undefined
    return [...new Set(this.marks.filter(mark => mark.t === nearest.t).map(mark => mark.label))].join(" · ")
  }
}
