import { Icons } from "./Icons.js"
import { WindowClose } from "./WindowClose.js"
import type { InterviewMessages } from "./messages/InterviewMessages.js"
import type { InterviewJson, InterviewRecording } from "../engine/persistence/interviewJson.js"
import { InterviewFile } from "../engine/persistence/interviewJson.js"

/** What the player tells its editor: the transcript's time as it plays or is moved, and the recordings as they are edited. */
export interface InterviewPlayerHost {
  /** The playhead is at `t` seconds of the transcript. */
  timeChanged(t: number): void
  /** The recordings were edited: the transcript is to keep these. */
  recordingsChanged(recordings: InterviewRecording[]): void
}

/**
 * An interview's player, over its editor (see the design handoff, §5): Play, the time, a track coloured by who speaks — the witness
 * amber, the interviewer blue, what was taken out grey — on which a press moves the playhead, the end, and "Recordings (n)", a window
 * where the recordings are given (an audio or a video file, by its address or from the disk, checked as it is given, and how far ahead of
 * the transcript it starts). The first recording plays; a video shows over the bar. Without any, Play is off and the player says how to
 * get one.
 */
export class InterviewPlayer {
  static readonly CSS = `
.player { margin: 0 0 4px; border-radius: 12px; }
.player-video { aspect-ratio: 16 / 9; margin-bottom: 8px; border-radius: 10px; overflow: hidden; background: #0b1020; }
.player-video video { width: 100%; height: 100%; display: block; }
.player-bar { display: flex; align-items: center; gap: 10px; padding: 10px 12px; border: 1px solid var(--line); border-radius: 12px; background: var(--ground-sunken); }
.player-time { font: 500 13px/1 var(--mono); color: var(--ink-dim); font-variant-numeric: tabular-nums; }
.speaker-track { position: relative; flex: 1 1 auto; height: 28px; border-radius: 6px; cursor: pointer; overflow: hidden;
  background: repeating-linear-gradient(90deg, var(--line) 0 1px, transparent 1px 4px); }
.speaker-track .seg { position: absolute; top: 4px; bottom: 4px; border-radius: 2px; }
.speaker-track .seg[data-role="witness"] { background: #c9a14a; }
.speaker-track .seg[data-role="interviewer"] { background: #5b8fc4; }
.speaker-track .seg[data-role="other"] { background: var(--ink-faint); }
.speaker-track .seg.redacted { background: repeating-linear-gradient(135deg, var(--ink-faint) 0 3px, transparent 3px 6px); }
.speaker-track .head { position: absolute; top: 0; bottom: 0; width: 2px; margin-left: -1px; background: #f5c451; }
.player-empty { margin: 6px 2px 0; font-size: 13px; color: var(--ink-faint); }
.recordings-window { max-width: min(36em, 94vw); padding: 18px 20px; border: 1px solid var(--line-strong); border-radius: 12px; background: var(--ground-raised); color: var(--ink); }
.recordings-window::backdrop { background: rgba(7, 10, 18, .5); }
.recordings-window h3 { margin: 0 0 12px; font: 600 19px/1.3 var(--serif); }
.recording-row { display: grid; grid-template-columns: 8em minmax(0, 1fr) 6em auto; gap: 8px; align-items: end; margin-bottom: 10px; }
.recording-row label { display: flex; flex-direction: column; gap: 4px; font: 600 12px/1.3 var(--sans); color: var(--ink-dim); }
.recording-row input, .recording-row select { box-sizing: border-box; width: 100%; font-weight: 400; }
.recording-file { display: flex; gap: 6px; }
.recording-status { grid-column: 1 / -1; margin: -4px 0 0; font-size: 12px; color: var(--ink-faint); }
.recording-status.error { color: var(--error); }
`

  private json?: InterviewJson
  private base?: string
  private media?: HTMLMediaElement
  private mediaFor = ""
  /** Recordings given from the disk, playable in this session by what they were picked as. */
  private readonly picked = new Map<string, string>()
  private messages: InterviewMessages
  private readonly play: HTMLButtonElement
  private readonly time: HTMLElement
  private readonly end: HTMLElement
  private readonly track: HTMLElement
  private readonly video: HTMLElement
  private readonly empty: HTMLElement
  private readonly open: HTMLButtonElement
  private readonly window: HTMLDialogElement

  constructor(root: HTMLElement, private readonly host: InterviewPlayerHost, messages: InterviewMessages) {
    this.messages = messages
    root.classList.add("player")
    root.innerHTML = `<div class="player-video" hidden></div>
<div class="player-bar">
  <button type="button" class="icon-btn player-play" disabled>${Icons.PLAY}</button>
  <span class="player-time">0:00</span>
  <div class="speaker-track" role="slider" tabindex="0" aria-valuemin="0"></div>
  <span class="player-time player-end">0:00</span>
  <button type="button" class="pill-btn player-recordings"></button>
</div>
<p class="player-empty"></p>
<dialog class="recordings-window"><h3></h3><div class="recording-rows"></div><button type="button" class="pill-btn recording-add">${Icons.PLUS}<span></span></button></dialog>`
    this.play = root.querySelector(".player-play")!
    this.time = root.querySelector(".player-time")!
    this.end = root.querySelector(".player-end")!
    this.track = root.querySelector(".speaker-track")!
    this.video = root.querySelector(".player-video")!
    this.empty = root.querySelector(".player-empty")!
    this.open = root.querySelector(".player-recordings")!
    this.window = root.querySelector(".recordings-window")!
    this.play.addEventListener("click", () => {
      if (!this.media) return
      if (this.media.paused) void this.media.play().catch(() => undefined)
      else this.media.pause()
    })
    this.track.addEventListener("pointerdown", event => {
      const box = this.track.getBoundingClientRect()
      if (box.width > 0) this.seek(((event.clientX - box.left) / box.width) * this.duration)
    })
    this.track.addEventListener("keydown", event => {
      if (event.key === "ArrowRight" || event.key === "ArrowLeft") this.seek(this.now + (event.key === "ArrowRight" ? 5 : -5))
    })
    this.open.addEventListener("click", () => this.showWindow())
    root.querySelector(".recording-add")!.addEventListener("click", () => this.edit(list => list.push({ kind: "audio", src: "" })))
    WindowClose.dialog(this.window, messages.close, () => this.window.close())
  }

  setMessages(messages: InterviewMessages): void {
    this.messages = messages
    this.render()
  }

  /** Shows the interview `json`, whose recordings' addresses are relative to `base`. */
  show(json: InterviewJson | undefined, base: string | undefined): void {
    this.json = json
    this.base = base
    this.render()
  }

  /** The time of the transcript the playhead is at, in seconds. */
  get now(): number {
    return this.media ? Math.max(0, this.media.currentTime - (this.recordings[0]?.offset ?? 0)) : this.position
  }

  /** Moves the playhead to `t` seconds of the transcript. */
  seek(t: number): void {
    this.position = Math.min(this.duration, Math.max(0, t))
    if (this.media) this.media.currentTime = this.position + (this.recordings[0]?.offset ?? 0)
    this.placeHead()
    this.host.timeChanged(this.position)
  }

  private position = 0

  private get recordings(): InterviewRecording[] {
    return Array.isArray(this.json?.recordings) ? this.json!.recordings : []
  }

  /** How long the interview lasts: the recording's length when it is known, else the end of the last turn. */
  private get duration(): number {
    const media = this.media && Number.isFinite(this.media.duration) ? this.media.duration - (this.recordings[0]?.offset ?? 0) : 0
    const said = Math.max(0, ...(this.json?.segments ?? []).map(segment => segment.end ?? segment.start ?? 0))
    return Math.max(1, media, said)
  }

  private render(): void {
    const m = this.messages
    const recordings = this.recordings
    this.open.innerHTML = `<svg class="icon" viewBox="0 0 16 16" width="16" height="16" aria-hidden="true" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round"><path d="M6 12V3.5l7-1.5V10.5"/><circle cx="4.5" cy="12" r="1.5"/><circle cx="11.5" cy="10.5" r="1.5"/></svg>`
    this.open.append(m.recordings.replace("{n}", String(recordings.length)))
    this.empty.textContent = recordings.length === 0 ? m.noRecording : ""
    this.empty.hidden = recordings.length > 0
    this.play.title = m.play
    this.play.setAttribute("aria-label", m.play)
    this.track.setAttribute("aria-label", m.recordingsTitle)
    this.ensureMedia()
    this.drawTrack()
    if (this.window.open) this.drawRows()
  }

  /** The media element of the first recording, made again only when that recording changes. */
  private ensureMedia(): void {
    const first = this.recordings[0]
    const key = first ? `${first.kind}|${first.src}` : ""
    if (key === this.mediaFor) return
    this.mediaFor = key
    this.media?.pause()
    this.media = undefined
    this.video.replaceChildren()
    this.video.hidden = true
    this.play.disabled = true
    if (!first || first.src === "") return
    const media = document.createElement(first.kind === "video" ? "video" : "audio")
    media.preload = "metadata"
    media.src = this.urlOf(first.src)
    media.addEventListener("loadedmetadata", () => this.drawTrack())
    media.addEventListener("timeupdate", () => {
      this.placeHead()
      this.host.timeChanged(this.now)
    })
    const sync = () => {
      const playing = !media.paused
      this.play.innerHTML = playing ? Icons.PAUSE : Icons.PLAY
      const label = playing ? this.messages.pause : this.messages.play
      this.play.title = label
      this.play.setAttribute("aria-label", label)
    }
    media.addEventListener("play", sync)
    media.addEventListener("pause", sync)
    if (first.kind === "video") {
      this.video.append(media)
      this.video.hidden = false
    }
    this.media = media
    this.play.disabled = false
  }

  private urlOf(src: string): string {
    const picked = this.picked.get(src)
    if (picked) return picked
    try {
      return new URL(src, this.base ?? location.href).href
    } catch {
      return src
    }
  }

  /** The turns along the length of the interview, coloured by who speaks. */
  private drawTrack(): void {
    const json = this.json
    const span = this.duration
    const segments = (json?.segments ?? []).filter(segment => segment.start !== undefined)
    this.track.replaceChildren(...segments.map(segment => {
      const block = document.createElement("span")
      const role = json?.speakers?.[segment.speaker]?.role
      block.className = segment.redacted ? "seg redacted" : "seg"
      block.dataset.role = role === "witness" || role === "interviewer" ? role : "other"
      const start = segment.start ?? 0
      const end = segment.end ?? start + 1
      block.style.left = `${(start / span) * 100}%`
      block.style.width = `${Math.max(0.3, ((end - start) / span) * 100)}%`
      return block
    }))
    const head = document.createElement("span")
    head.className = "head"
    this.track.append(head)
    this.track.setAttribute("aria-valuemax", String(Math.round(span)))
    this.end.textContent = InterviewFile.clock(span)
    this.placeHead()
  }

  private placeHead(): void {
    const now = this.now
    const head = this.track.querySelector<HTMLElement>(".head")
    if (head) head.style.left = `${(Math.min(now, this.duration) / this.duration) * 100}%`
    this.time.textContent = InterviewFile.clock(Math.floor(now))
    this.track.setAttribute("aria-valuenow", String(Math.round(now)))
  }

  private showWindow(): void {
    this.drawRows()
    if (typeof this.window.showModal === "function") this.window.showModal()
    else this.window.setAttribute("open", "")
  }

  /** One row a recording: its kind, its file (an address, or one from the disk), its offset, its removal — and whether it reads. */
  private drawRows(): void {
    const m = this.messages
    this.window.querySelector("h3")!.textContent = m.recordingsTitle
    this.window.querySelector(".recording-add span")!.textContent = m.recordingAdd
    WindowClose.dialog(this.window, m.close, () => this.window.close())
    const rows = this.window.querySelector(".recording-rows")!
    rows.replaceChildren(...this.recordings.map((recording, index) => {
      const row = document.createElement("div")
      row.className = "recording-row"
      const kind = document.createElement("select")
      kind.append(new Option(m.recordingAudio, "audio"), new Option(m.recordingVideo, "video"))
      kind.value = recording.kind
      kind.addEventListener("change", () => this.edit(list => { list[index].kind = kind.value as InterviewRecording["kind"] }))
      const src = document.createElement("input")
      src.type = "text"
      src.value = recording.src
      src.placeholder = "interview.mp3"
      src.addEventListener("change", () => this.edit(list => { list[index].src = src.value.trim() }))
      const disk = document.createElement("input")
      disk.type = "file"
      disk.accept = "audio/*,video/*"
      disk.hidden = true
      disk.addEventListener("change", () => {
        const file = disk.files?.[0]
        if (!file) return
        // Kept by its name, beside the transcript where it is to be put; played from the disk meanwhile.
        this.picked.set(file.name, URL.createObjectURL(file))
        this.edit(list => {
          list[index].src = file.name
          if (file.type.startsWith("video/")) list[index].kind = "video"
        })
      })
      const browse = document.createElement("button")
      browse.type = "button"
      browse.className = "icon-btn"
      browse.title = m.recordingFile
      browse.setAttribute("aria-label", m.recordingFile)
      browse.innerHTML = `<svg class="icon" viewBox="0 0 16 16" width="16" height="16" aria-hidden="true" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round"><path d="M2.5 4.5h4l1.5 1.5h5.5v6.5h-11z"/></svg>`
      browse.addEventListener("click", () => disk.click())
      const file = document.createElement("span")
      file.className = "recording-file"
      file.append(src, browse, disk)
      const offset = document.createElement("input")
      offset.type = "number"
      offset.step = "0.1"
      offset.value = recording.offset !== undefined ? String(recording.offset) : ""
      offset.placeholder = "0"
      offset.addEventListener("change", () => this.edit(list => {
        const value = Number(offset.value)
        if (offset.value.trim() === "" || !Number.isFinite(value) || value === 0) delete list[index].offset
        else list[index].offset = value
      }))
      const remove = document.createElement("button")
      remove.type = "button"
      remove.className = "icon-btn"
      remove.innerHTML = Icons.TRASH
      remove.title = m.recordingRemove
      remove.setAttribute("aria-label", m.recordingRemove)
      remove.addEventListener("click", () => this.edit(list => { list.splice(index, 1) }))
      const status = document.createElement("p")
      status.className = "recording-status"
      this.check(recording, status)
      row.append(this.labelled(m.recordingKind, kind), this.labelled(m.recordingFile, file), this.labelled(m.recordingOffset, offset), remove, status)
      return row
    }))
  }

  private labelled(text: string, control: HTMLElement): HTMLElement {
    const label = document.createElement("label")
    const name = document.createElement("span")
    name.textContent = text
    label.append(name, control)
    return label
  }

  /** Says whether a recording's file can be read: its length when it can, a mistake when it cannot. */
  private check(recording: InterviewRecording, status: HTMLElement): void {
    if (recording.src === "") return
    const probe = document.createElement(recording.kind === "video" ? "video" : "audio")
    probe.preload = "metadata"
    probe.addEventListener("loadedmetadata", () => {
      status.textContent = InterviewFile.clock(Math.round(probe.duration))
      status.classList.remove("error")
    })
    probe.addEventListener("error", () => {
      status.textContent = this.messages.loadFailed
      status.classList.add("error")
    })
    probe.src = this.urlOf(recording.src)
  }

  private edit(change: (list: InterviewRecording[]) => void): void {
    const list = structuredClone(this.recordings)
    change(list)
    this.host.recordingsChanged(list)
  }
}
