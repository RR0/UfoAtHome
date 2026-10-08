import { EditorView, keymap, highlightSpecialChars, drawSelection } from "@codemirror/view"
import { defaultKeymap, history, historyKeymap } from "@codemirror/commands"
import { HighlightStyle, syntaxHighlighting } from "@codemirror/language"
import { html } from "@codemirror/lang-html"
import { tags } from "@lezer/highlight"

/**
 * The embed code of the share dialog: HTML that wraps its lines, so that all of it can be read, and
 * that can be edited before it is copied.
 *
 * Its own chunk, fetched the first time the embed view is shown (see SightingElement.loadShareCode):
 * most readers never open the dialog, and CodeMirror is the heaviest thing a player could carry.
 * What it takes is picked piece by piece, as SightingFileEditor does, rather than `basicSetup`.
 */
export class ShareCodeEditor {

  private static readonly COLOURS = HighlightStyle.define([
    { tag: tags.tagName, color: "#1a5fb4" },
    { tag: tags.angleBracket, color: "#777" },
    { tag: tags.attributeName, color: "#8a4b00" },
    { tag: [tags.string, tags.attributeValue], color: "#1a7f37" }
  ])

  private readonly view: EditorView
  private changing = false

  /** `changed` is told the text after each edit made BY THE USER; replacing it from the model ({@link text}) does not. */
  constructor(parent: HTMLElement, text: string, changed: (text: string) => void, label: string) {
    this.view = new EditorView({
      parent,
      doc: text,
      extensions: [
        highlightSpecialChars(),
        history(),
        drawSelection(),
        keymap.of([...defaultKeymap, ...historyKeymap]),
        EditorView.lineWrapping,
        syntaxHighlighting(ShareCodeEditor.COLOURS, { fallback: true }),
        html(),
        EditorView.contentAttributes.of({ "aria-label": label }),
        EditorView.updateListener.of(update => {
          if (update.docChanged && !this.changing) changed(update.state.doc.toString())
        })
      ]
    })
  }

  get text(): string {
    return this.view.state.doc.toString()
  }

  set text(text: string) {
    const current = this.view.state.doc.toString()
    if (text === current) return
    this.changing = true
    try {
      this.view.dispatch({ changes: { from: 0, to: current.length, insert: text } })
    } finally {
      this.changing = false
    }
  }

  destroy(): void {
    this.view.destroy()
  }
}
