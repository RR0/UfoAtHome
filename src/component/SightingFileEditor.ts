import { EditorView, keymap, lineNumbers, highlightSpecialChars, drawSelection, type KeyBinding } from "@codemirror/view"
import { EditorState } from "@codemirror/state"
import { defaultKeymap, history, historyKeymap, indentWithTab } from "@codemirror/commands"
import { bracketMatching, foldGutter, foldKeymap, HighlightStyle, indentOnInput, syntaxHighlighting } from "@codemirror/language"
import { autocompletion, closeBrackets, closeBracketsKeymap, completionKeymap } from "@codemirror/autocomplete"
import { json, jsonLanguage, jsonParseLinter } from "@codemirror/lang-json"
import { linter, lintGutter, lintKeymap } from "@codemirror/lint"
import { tags } from "@lezer/highlight"
import { SightingCompletion } from "./SightingCompletion.js"

/**
 * The recording as text, in the editor's File group: a JSON editor that knows the format.
 *
 * Its own chunk, fetched the first time the group is opened (see SightingEditorElement.loadFileEditor):
 * most authors never leave the form, and CodeMirror is the heaviest thing the editor could carry.
 * What it imports is picked piece by piece for the same reason, rather than taken through the
 * `codemirror` package's `basicSetup`, which also brings search, rectangular selection, crosshair,
 * the highlight of every matching word and a panel for each — none of which editing a recording
 * has any use for. What stays is what a JSON editor is for: the keys the format has and what the
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

  /** `changed` is called with the text after each edit made BY THE USER; replacing the text from
   * the model (see {@link text}) does not call it, or the two would answer each other forever. */
  constructor(parent: HTMLElement, text: string, changed: (text: string) => void, label: string) {
    const keys: KeyBinding[] = [...closeBracketsKeymap, ...defaultKeymap, ...historyKeymap, ...foldKeymap, ...completionKeymap,
      ...lintKeymap, indentWithTab]
    this.view = new EditorView({
      parent,
      doc: text,
      extensions: [
        lineNumbers(),
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
          ".cm-gutters": { backgroundColor: "transparent", color: "color-mix(in srgb, currentColor 55%, transparent)", border: "none" }
        }),
        EditorView.updateListener.of(update => {
          if (update.docChanged && !this.changing) changed(update.state.doc.toString())
        })
      ]
    })
  }

  get text(): string {
    return this.view.state.doc.toString()
  }

  /** Puts the model's text in, keeping the caret where it was when it still makes sense. Silent. */
  set text(text: string) {
    const current = this.view.state.doc.toString()
    if (text === current) return
    this.changing = true
    try {
      const head = Math.min(this.view.state.selection.main.head, text.length)
      this.view.dispatch({ changes: { from: 0, to: current.length, insert: text }, selection: { anchor: head } })
    } finally {
      this.changing = false
    }
  }

  get focused(): boolean {
    return this.view.hasFocus
  }

  destroy(): void {
    this.view.destroy()
  }
}
