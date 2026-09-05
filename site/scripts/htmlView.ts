import { EditorState } from "@codemirror/state"
import { EditorView, lineNumbers } from "@codemirror/view"
import { html } from "@codemirror/lang-html"
import { SiteCodeTheme } from "./codeTheme.js"

/**
 * A read-only CodeMirror showing the snippet the Share page writes as the reader types an address.
 *
 * Read-only and not an editor: the code is generated from the field above it, so typing into it
 * would produce something the copy button then disagreed with. What CodeMirror is here for is the
 * highlighting alone — three lines of HTML in which the reader has to tell the two parts apart at
 * a glance: the script tag that loads the component, and the element that shows the recording.
 *
 * `basicSetup` is deliberately not used, unlike the JSON editor beside it: it brings history,
 * autocompletion, bracket matching, a search panel and a dozen key bindings, none of which mean
 * anything in a document nobody can edit.
 */
export class HtmlView {

  private readonly view: EditorView

  constructor(parent: HTMLElement, initialValue: string) {
    this.view = new EditorView({
      parent,
      doc: initialValue,
      extensions: [
        ...new SiteCodeTheme().extensions,
        html(),
        lineNumbers(),
        EditorView.editable.of(false),
        // The caret would blink in a document nobody can change.
        EditorState.readOnly.of(true),
        EditorView.lineWrapping,
        EditorView.theme({ ".cm-content": { padding: "0.6rem 0" } })
      ]
    })
  }

  /** Replaces the whole document — the snippet is rewritten wholesale on every keystroke in the
   * address field, so there is no smaller change to make. */
  set value(code: string) {
    this.view.dispatch({ changes: { from: 0, to: this.view.state.doc.length, insert: code } })
  }
}
