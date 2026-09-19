import { basicSetup, EditorView } from "codemirror"
import { EditorState } from "@codemirror/state"
import { json, jsonLanguage, jsonParseLinter } from "@codemirror/lang-json"
import { linter, lintGutter } from "@codemirror/lint"
import { SiteCodeTheme } from "./codeTheme.js"
import { SightingCompletion } from "./sightingCompletion.js"
import type { CompletionContext, CompletionResult } from "@codemirror/autocomplete"

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

  /**
   * `at` says where in a recording the text stands — see SightingCompletion — for an excerpt of one
   * rather than a whole one; `null` for JSON that is not a recording at all (a case), which is then
   * checked but offered nothing.
   *
   * `readOnly` for text with nothing to show what a change would do: an excerpt on a page of
   * documentation is read, copied and folded, and changing it would only have misled the reader into
   * thinking something had taken effect. Its completion still opens — asked for, with the caret in
   * an object — because the list of what could go there, with what the model says of each, is
   * worth reading; picking from it changes nothing.
   */
  constructor(parent: HTMLElement, initialValue: string,
              { at = [], readOnly = false }: { at?: readonly string[] | null, readOnly?: boolean } = {}) {
    this.view = new EditorView({
      parent,
      doc: initialValue,
      extensions: [
        ...new SiteCodeTheme("22rem").extensions,
        basicSetup,
        json(),
        // What turns this from a text box into a way of LEARNING the format: every key the model
        // has, the words a key will accept, and the model's own comment about it — read out of the
        // TypeScript at build time, so it says what the code says. See SightingCompletion.
        ...(at ? [jsonLanguage.data.of({ autocomplete: JsonEditor.completionSource(new SightingCompletion(at), readOnly) })] : []),
        // Unlike the Share page's HtmlView, still focusable: the caret is how a reader points at
        // the object whose possible keys they want listed.
        ...(readOnly ? [EditorState.readOnly.of(true)] : []),
        // The whole reason a code editor earns its place here: a mistyped comma is reported ON the
        // line that has it, instead of as "Unexpected token at position 1487".
        lintGutter(),
        linter(jsonParseLinter())
      ]
    })
  }

  /** The completion, made inert for a read-only text: CodeMirror refuses to accept one from the
   * keyboard there, but a click on an option still inserts it. */
  private static completionSource(completion: SightingCompletion, readOnly: boolean): (context: CompletionContext) => CompletionResult | null {
    if (!readOnly) return completion.source
    return context => {
      const result = completion.source(context)
      return result && { ...result, options: result.options.map(option => ({ ...option, apply: () => undefined })) }
    }
  }

  get value(): string {
    return this.view.state.doc.toString()
  }

  /** Replaces the whole document — this is only ever used to put a WHOLE recording in, never to
   * patch one, so there is no smaller change to make. */
  set value(text: string) {
    this.view.dispatch({ changes: { from: 0, to: this.view.state.doc.length, insert: text } })
  }

  focus(): void {
    this.view.focus()
  }
}
