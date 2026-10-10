import { Decoration, EditorView, GutterMarker, gutter, keymap, lineNumbers, highlightSpecialChars, drawSelection, type KeyBinding } from "@codemirror/view"
import { EditorState, RangeSetBuilder, StateEffect, StateField } from "@codemirror/state"
import { openSearchPanel, search, searchKeymap } from "@codemirror/search"
import { defaultKeymap, history, historyKeymap, indentWithTab, isolateHistory, redo, redoDepth, undo, undoDepth } from "@codemirror/commands"
import { bracketMatching, foldGutter, foldKeymap, HighlightStyle, indentOnInput, syntaxHighlighting } from "@codemirror/language"
import { autocompletion, closeBrackets, closeBracketsKeymap, completionKeymap } from "@codemirror/autocomplete"
import { json, jsonLanguage, jsonParseLinter } from "@codemirror/lang-json"
import { linter, lintGutter, lintKeymap } from "@codemirror/lint"
import { tags } from "@lezer/highlight"
import { SightingCompletion } from "./SightingCompletion.js"
import { JsonPaths, type JsonPath } from "./JsonPaths.js"
import { LineDiff } from "./LineDiff.js"

/** What the editor is told besides the text it starts with. */
export interface SightingFileEditorOptions {
  /** The text the changed lines are changed from: what the recording was when it was last saved or exported. Default: the text it starts with. */
  baseline?: string
  /** The words of the search panel in the reader's language, by CodeMirror's own English ones. */
  phrases?: Record<string, string>
  /** Called with the place of the caret, when the author moves it — what the picture selects. */
  caretMoved?: (path: JsonPath) => void
}

/**
 * The recording as text, in the editor's File group: a JSON editor that knows the format.
 *
 * Its own chunk, fetched the first time the group is opened (see SightingEditorElement.loadFileEditor):
 * most authors never leave the form, and CodeMirror is the heaviest thing the editor could carry.
 * What it imports is picked piece by piece for the same reason, rather than taken through the
 * `codemirror` package's `basicSetup`, which also brings search, rectangular selection, crosshair,
 * the highlight of every matching word and a panel for each — none of which editing a recording
 * has any use for, except the search, which is added back (Ctrl/Cmd+F, with replace). What stays is what a JSON editor is for: the keys the format has and what the
 * model says about each (SightingCompletion, read from the same schema the site's Player page
 * uses), a mistake reported on the line that has it, brackets that close themselves, and folding,
 * since a recording runs to hundreds of lines.
 *
 * It lives in the editor's shadow DOM, so its colours are the editor's own custom properties
 * (set in the editor's stylesheet, light and dark) and not the site's.
 */
export class SightingFileEditor {

  private static readonly COLOURS = HighlightStyle.define([
    { tag: tags.propertyName, color: "var(--file-key)" },
    { tag: [tags.string, tags.attributeValue], color: "var(--file-string)" },
    { tag: [tags.number, tags.bool, tags.null], color: "var(--file-literal)" },
    { tag: tags.invalid, color: "var(--rr0-alert)" }
  ])

  private readonly view: EditorView
  private changing = false

  private readonly changedField: StateField<{ baseline: string[], changed: ReadonlySet<number> }>

  /** Set when the text is put in the editor's own hands by the caller (a reveal), so that its caret does not report itself. */
  private silent = false

  /**
   * What the margin and the tint of a line say about it: whether it is changed since the text last saved. Re-worked at
   * every edit from the baseline and the text (see LineDiff), the baseline replaced by {@link markSaved}.
   */
  private static readonly SET_BASELINE = StateEffect.define<string>()
  private static readonly CHANGED_MARKER = new (class extends GutterMarker {
    override toDOM(): Node {
      const bar = document.createElement("div")
      bar.className = "cm-changed-bar"
      return bar
    }
  })()

  /**
   * The lines the picture has shown the author (see {@link reveal}): tinted and edged in the margin whether or not the
   * editor has the focus, where a selection is drawn pale and disappears with the focus. The text's own caret and
   * selection are left where the author had them.
   */
  private static readonly REVEAL = StateEffect.define<{ from: number, to: number } | null>()
  private static readonly revealed = StateField.define<{ from: number, to: number } | null>({
    create: () => null,
    update: (value, transaction) => {
      for (const effect of transaction.effects) if (effect.is(SightingFileEditor.REVEAL)) return effect.value
      return value === null ? null : { from: transaction.changes.mapPos(value.from, 1), to: transaction.changes.mapPos(value.to, -1) }
    },
    provide: field => EditorView.decorations.compute([field], state => {
      const range = state.field(field)
      const builder = new RangeSetBuilder<Decoration>()
      if (range !== null) {
        for (let n = state.doc.lineAt(range.from).number; n <= state.doc.lineAt(Math.min(range.to, state.doc.length)).number; n++) {
          builder.add(state.doc.line(n).from, state.doc.line(n).from, Decoration.line({ class: "cm-revealed-line" }))
        }
      }
      return builder.finish()
    })
  })

  private static changeMarks(initial: string): { field: StateField<{ baseline: string[], changed: ReadonlySet<number> }>, extensions: import("@codemirror/state").Extension[] } {
    const field = StateField.define<{ baseline: string[], changed: ReadonlySet<number> }>({
      create: state => ({ baseline: initial.split("\n"), changed: new Set(LineDiff.changed(initial.split("\n"), state.doc.toString().split("\n"))) }),
      update: (value, transaction) => {
        let baseline = value.baseline
        for (const effect of transaction.effects) if (effect.is(SightingFileEditor.SET_BASELINE)) baseline = effect.value.split("\n")
        if (!transaction.docChanged && baseline === value.baseline) return value
        return { baseline, changed: new Set(LineDiff.changed(baseline, transaction.state.doc.toString().split("\n"))) }
      }
    })
    const tint = EditorView.decorations.compute([field], state => {
      const builder = new RangeSetBuilder<Decoration>()
      for (const index of [...state.field(field).changed].sort((a, b) => a - b)) {
        if (index < state.doc.lines) builder.add(state.doc.line(index + 1).from, state.doc.line(index + 1).from, Decoration.line({ class: "cm-changed-line" }))
      }
      return builder.finish()
    })
    const margin = gutter({
      class: "cm-changed-gutter",
      lineMarker: (view, line) => view.state.field(field).changed.has(view.state.doc.lineAt(line.from).number - 1) ? SightingFileEditor.CHANGED_MARKER : null,
      lineMarkerChange: update => update.docChanged || update.transactions.some(transaction => transaction.effects.some(effect => effect.is(SightingFileEditor.SET_BASELINE))),
      initialSpacer: () => SightingFileEditor.CHANGED_MARKER
    })
    return { field, extensions: [field, tint, margin] }
  }

  /** `changed` is called with the text after each edit made BY THE USER; replacing the text from
   * the model (see {@link text}) does not call it, or the two would answer each other forever. */
  constructor(parent: HTMLElement, text: string, changed: (text: string) => void, label: string, options: SightingFileEditorOptions = {}) {
    const keys: KeyBinding[] = [...closeBracketsKeymap, ...defaultKeymap, ...historyKeymap, ...foldKeymap, ...completionKeymap,
      ...lintKeymap, ...searchKeymap, indentWithTab]
    const marks = SightingFileEditor.changeMarks(options.baseline ?? text)
    this.changedField = marks.field
    keys.unshift({ key: "F7", run: () => this.gotoChange(1), preventDefault: true }, { key: "Shift-F7", run: () => this.gotoChange(-1), preventDefault: true })
    this.view = new EditorView({
      parent,
      doc: text,
      extensions: [
        ...marks.extensions,
        SightingFileEditor.revealed,
        lineNumbers(),
        search({ top: true }),
        EditorState.phrases.of(options.phrases ?? {}),
        foldGutter(),
        highlightSpecialChars(),
        history(),
        drawSelection(),
        indentOnInput(),
        bracketMatching(),
        closeBrackets(),
        autocompletion(),
        keymap.of(keys),
        EditorState.tabSize.of(2),
        syntaxHighlighting(SightingFileEditor.COLOURS, { fallback: true }),
        json(),
        jsonLanguage.data.of({ autocomplete: new SightingCompletion().source }),
        lintGutter(),
        linter(jsonParseLinter()),
        EditorView.contentAttributes.of({ "aria-label": label }),
        EditorView.theme({
          "&": { maxHeight: "28rem", fontSize: "0.82em", border: "1px solid color-mix(in srgb, currentColor 25%, transparent)", borderRadius: "4px" },
          "&.cm-focused": { outline: "2px solid color-mix(in srgb, currentColor 45%, transparent)" },
          ".cm-scroller": { overflow: "auto", fontFamily: "ui-monospace, SFMono-Regular, Menlo, monospace" },
          // A pair that is always legible together, whatever the page around the editor is painted:
          // the lists inherit the page's text colour, which on a dark page is white on their own
          // light ground.
          ".cm-tooltip": { backgroundColor: "Canvas", color: "CanvasText", border: "1px solid color-mix(in srgb, CanvasText 30%, transparent)" },
          ".cm-tooltip-autocomplete > ul > li[aria-selected]": { backgroundColor: "Highlight", color: "HighlightText" },
          // The caret and the selection in the page's own colours: the caret is black by default, and invisible on a dark page.
          ".cm-cursor, .cm-dropCursor": { borderLeftColor: "CanvasText" },
          "&.cm-focused > .cm-scroller > .cm-selectionLayer .cm-selectionBackground, .cm-selectionBackground": { backgroundColor: "color-mix(in srgb, Highlight 35%, transparent)" },
          ".cm-gutters": { backgroundColor: "transparent", color: "color-mix(in srgb, currentColor 55%, transparent)", border: "none" },
          // The lines changed since the last save: a bar in the margin and a light tint, in the blue of a selection.
          ".cm-changed-gutter": { width: "4px" },
          ".cm-changed-bar": { width: "3px", height: "100%", backgroundColor: "#2f81f7" },
          ".cm-changed-line": { backgroundColor: "color-mix(in srgb, #2f81f7 13%, transparent)" },
          // What the picture showed: warmer and edged, over the changed lines' tint when both are there.
          ".cm-revealed-line": { backgroundColor: "color-mix(in srgb, #f2cc60 30%, transparent)", boxShadow: "inset 3px 0 0 #f2cc60" },
          // The search panel's colours are the page's own, in the dark as in the light.
          ".cm-panels": { backgroundColor: "Canvas", color: "CanvasText", borderColor: "color-mix(in srgb, CanvasText 25%, transparent)" },
          // Fields and buttons in the colours of the system's own, light or dark: left to the search panel's defaults they took the
          // page's text colour on a white ground, and the text typed was not legible (white on white on a light page).
          ".cm-panel.cm-search input, .cm-panel.cm-search button": { fontSize: "inherit" },
          ".cm-panel.cm-search input[type=text], .cm-panel.cm-search input:not([type])": {
            backgroundColor: "Field", color: "FieldText", border: "1px solid color-mix(in srgb, CanvasText 35%, transparent)", borderRadius: "3px", padding: "2px 5px"
          },
          ".cm-panel.cm-search button": {
            backgroundImage: "none", backgroundColor: "ButtonFace", color: "ButtonText", border: "1px solid color-mix(in srgb, CanvasText 35%, transparent)", borderRadius: "3px"
          },
          ".cm-panel.cm-search label, .cm-panel.cm-search [name=close]": { color: "CanvasText" },
          ".cm-searchMatch": { backgroundColor: "color-mix(in srgb, #f2cc60 40%, transparent)" },
          ".cm-searchMatch-selected": { backgroundColor: "color-mix(in srgb, #f2cc60 75%, transparent)" }
        }),
        EditorView.updateListener.of(update => {
          if (update.docChanged && !this.changing) changed(update.state.doc.toString())
          // The caret of the author, not the one this class moves itself (see reveal), nor one that is not in the text.
          if (update.selectionSet && !this.silent && !this.changing && update.view.hasFocus) {
            // The author has the caret now: what the picture showed is no longer what is shown.
            if (update.state.field(SightingFileEditor.revealed) !== null) {
              queueMicrotask(() => this.view.dispatch({ effects: SightingFileEditor.REVEAL.of(null) }))
            }
            options.caretMoved?.(JsonPaths.at(update.state, update.state.selection.main.head))
          }
        })
      ]
    })
  }

  get text(): string {
    return this.view.state.doc.toString()
  }

  /**
   * Puts the model's text in, keeping the caret where it was when it still makes sense. Silent.
   *
   * Each one is a step of its own in the editor's history, however close to the last: that history is the
   * recording's undo (see {@link undo}), and the model changes the form makes are the steps an author wants
   * to take back one by one, not merged because they came within half a second of each other.
   */
  set text(text: string) {
    this.replaceText(text, false)
  }

  /**
   * As {@link text}, and with `show`, showing where the text changed (see revealChange): what an author edited on the
   * form or on the picture is then shown where it was written, with the text on show. Not for a rewrite so wide
   * (a weather worked out, the whole recording re-ordered) that it would show a screenful of lines and say nothing.
   */
  replaceText(text: string, show: boolean): void {
    const current = this.view.state.doc.toString()
    if (text === current) return
    this.changing = true
    try {
      const head = Math.min(this.view.state.selection.main.head, text.length)
      this.view.dispatch({
        changes: { from: 0, to: current.length, insert: text }, selection: { anchor: head }, annotations: isolateHistory.of("full")
      })
    } finally {
      this.changing = false
    }
    if (show) this.revealChange(current, SightingFileEditor.MOST_LINES_SHOWN)
  }

  /** The widest change shown as an edit: past it the text was rewritten rather than edited. */
  private static readonly MOST_LINES_SHOWN = 120

  /**
   * The next zone changed since the last save, from the caret (F7), or the previous one (Shift-F7): the caret goes to its first
   * line and the zone is selected, going round from the last to the first. A zone is lines changed one after the other. False
   * when nothing is changed.
   */
  gotoChange(direction: 1 | -1): boolean {
    const lines = [...this.view.state.field(this.changedField).changed].sort((a, b) => a - b)
    if (lines.length === 0) return false
    const zones: Array<{ first: number, last: number }> = []
    for (const line of lines) {
      const zone = zones[zones.length - 1]
      if (zone !== undefined && zone.last === line - 1) zone.last = line
      else zones.push({ first: line, last: line })
    }
    const doc = this.view.state.doc
    const here = doc.lineAt(this.view.state.selection.main.head).number - 1
    const current = zones.find(zone => zone.first <= here && here <= zone.last)
    const target = direction === 1
      ? zones.find(zone => zone.first > here) ?? zones[0]
      : [...zones].reverse().find(zone => zone.first < (current?.first ?? here)) ?? zones[zones.length - 1]
    const from = doc.line(Math.min(target.first, doc.lines - 1) + 1).from
    const to = doc.line(Math.min(target.last, doc.lines - 1) + 1).to
    this.view.dispatch({ selection: { anchor: from, head: to }, scrollIntoView: true })
    return true
  }

  /** The text as it stands is the one the changed lines are changed from — called when the recording is saved or exported. */
  markSaved(): void {
    this.view.dispatch({ effects: SightingFileEditor.SET_BASELINE.of(this.view.state.doc.toString()) })
  }

  /** Opens the search panel (with replace) over the text. */
  openSearch(): void {
    this.view.focus()
    openSearchPanel(this.view)
  }

  /**
   * Shows what a place of the recording is in the text: its lines tinted and scrolled to the top, and whether the text had it.
   * Neither focused nor selected: the author is working on the picture, the caret stays where it was, and the lines are shown
   * the same with the focus elsewhere (see REVEAL).
   */
  reveal(path: JsonPath): boolean {
    const range = JsonPaths.range(this.view.state, path)
    if (range === undefined) return false
    this.silent = true
    try {
      this.view.dispatch({ effects: SightingFileEditor.REVEAL.of(range) })
    } finally {
      this.silent = false
    }
    this.scrollTo(range.from)
    return true
  }

  /**
   * Scrolls the text's own box to a position, and nothing else. The editor's `scrollIntoView` also scrolls every
   * ancestor, the page included: each selection made on the picture then took the page up to the text above it, and
   * away from the picture the author was working on. The text's lines are placed by their measured height, which for
   * those far from the ones on show is an estimate until they have been shown: so once more when they have.
   */
  private scrollTo(position: number): void {
    const place = (): void => {
      this.view.scrollDOM.scrollTop = Math.max(0, this.view.lineBlockAt(position).top - SightingFileEditor.SCROLL_MARGIN_PX)
    }
    place()
    this.view.requestMeasure({ read: () => undefined, write: () => requestAnimationFrame(place) })
  }

  private static readonly SCROLL_MARGIN_PX = 24

  /** The text of what was last revealed, or undefined — for a test, which cannot see the tint. */
  get revealedText(): string | undefined {
    const range = this.view.state.field(SightingFileEditor.revealed)
    return range === null ? undefined : this.view.state.doc.sliceString(range.from, range.to)
  }

  /** Takes back the last change to the text — the form's own as much as the author's typing, since the
   * form is written into this text as it changes. False when there is nothing left to take back. The
   * caller applies the result: this does not tell the model (see SightingEditorElement.undo). */
  undo(show = false): boolean {
    return this.step(undo, show)
  }

  redo(show = false): boolean {
    return this.step(redo, show)
  }

  get canUndo(): boolean {
    return undoDepth(this.view.state) > 0
  }

  get canRedo(): boolean {
    return redoDepth(this.view.state) > 0
  }

  /** Silent too, as {@link text} is: the caller applies the text it leaves, at once. */
  private step(command: (target: { state: EditorState, dispatch: (transaction: any) => void }) => boolean, show: boolean): boolean {
    const before = this.view.state.doc.toString()
    this.changing = true
    let done: boolean
    try {
      done = command(this.view)
    } finally {
      this.changing = false
    }
    if (done && show) this.revealChange(before)
    return done
  }

  /**
   * Shows where a step of the history changed the text: the lines that are not what they were, or the one where lines were
   * taken away, so that an undo done from the picture's side says what it undid.
   */
  private revealChange(before: string, atMostLines = Infinity): void {
    const doc = this.view.state.doc
    const was = before.split("\n")
    const now = doc.toString().split("\n")
    let start = 0
    while (start < was.length && start < now.length && was[start] === now[start]) start++
    let endWas = was.length
    let endNow = now.length
    while (endWas > start && endNow > start && was[endWas - 1] === now[endNow - 1]) {
      endWas--
      endNow--
    }
    if (endNow - start > atMostLines) return
    const first = Math.min(start, doc.lines - 1) + 1
    const last = Math.min(Math.max(first, endNow), doc.lines)
    const range = { from: doc.line(first).from, to: doc.line(last).to }
    this.silent = true
    try {
      this.view.dispatch({ effects: SightingFileEditor.REVEAL.of(range) })
    } finally {
      this.silent = false
    }
    this.scrollTo(range.from)
  }

  get focused(): boolean {
    return this.view.hasFocus
  }

  destroy(): void {
    this.view.destroy()
  }
}
