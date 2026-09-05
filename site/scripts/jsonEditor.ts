import { basicSetup, EditorView } from "codemirror"
import { json, jsonParseLinter } from "@codemirror/lang-json"
import { linter, lintGutter } from "@codemirror/lint"
import { SiteCodeTheme } from "./codeTheme.js"

/**
 * The JSON editor behind the Player page's "paste a recording" panel.
 *
 * Its own bundle, loaded only when that panel is opened: a page whose main job is to REPLAY a
 * reconstruction should not carry an editor's worth of code to do it, and most visitors arrive
 * with a link rather than with a file to paste.
 *
 * Its colours and its frame are the site's, shared with the Share page's read-only view — see
 * SiteCodeTheme, which is also where the reason not to use a packaged theme is written down.
 */
export class JsonEditor {

  private readonly view: EditorView

  constructor(parent: HTMLElement, initialValue: string) {
    this.view = new EditorView({
      parent,
      doc: initialValue,
      extensions: [
        ...new SiteCodeTheme("22rem").extensions,
        basicSetup,
        json(),
        // The whole reason a code editor earns its place here: a mistyped comma is reported ON the
        // line that has it, instead of as "Unexpected token at position 1487".
        lintGutter(),
        linter(jsonParseLinter())
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
