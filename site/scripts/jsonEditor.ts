import { basicSetup, EditorView } from "codemirror"
import { json, jsonParseLinter } from "@codemirror/lang-json"
import { linter, lintGutter } from "@codemirror/lint"

/**
 * The JSON editor behind the Player page's "paste a recording" panel.
 *
 * Its own bundle, loaded only when that panel is opened: a page whose main job is to REPLAY a
 * reconstruction should not carry an editor's worth of code to do it, and most visitors arrive
 * with a link rather than with a file to paste.
 *
 * Colours come from the site's own tokens rather than from a packaged theme, so the editor follows
 * the page into light or dark without a second source of truth for either.
 */
export class JsonEditor {

  private readonly view: EditorView

  constructor(parent: HTMLElement, initialValue: string) {
    const dark = matchMedia("(prefers-color-scheme: dark)").matches
    this.view = new EditorView({
      parent,
      doc: initialValue,
      extensions: [
        basicSetup,
        json(),
        // The whole reason a code editor earns its place here: a mistyped comma is reported ON the
        // line that has it, instead of as "Unexpected token at position 1487".
        lintGutter(),
        linter(jsonParseLinter()),
        EditorView.theme({
          "&": {
            color: "var(--ink)",
            backgroundColor: "var(--ground-sunken)",
            fontSize: "0.82rem",
            maxHeight: "22rem"
          },
          ".cm-content": { fontFamily: "var(--mono)" },
          ".cm-gutters": {
            backgroundColor: "var(--ground-sunken)",
            color: "var(--ink-faint)",
            border: "none"
          },
          ".cm-activeLine, .cm-activeLineGutter": { backgroundColor: "transparent" },
          "&.cm-focused": { outline: "none" },
          ".cm-scroller": { overflow: "auto" }
        }, { dark })
      ]
    })
  }

  get value(): string {
    return this.view.state.doc.toString()
  }

  focus(): void {
    this.view.focus()
  }
}
