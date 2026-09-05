import { HighlightStyle, syntaxHighlighting } from "@codemirror/language"
import { EditorView } from "@codemirror/view"
import { tags } from "@lezer/highlight"
import type { Extension } from "@codemirror/state"

/**
 * How code looks on this site, in both editors: the colours of its parts, and the frame around it.
 *
 * Every colour is one of the page's own custom properties rather than a fixed value, so one style
 * follows the reader into dark mode with no second definition to keep in step. That is not a
 * nicety. CodeMirror's packaged `defaultHighlightStyle` is written for a light ground and puts its
 * strings at #aa1111, which on this site's dark ground measures 2.7:1 — a colour you cannot read,
 * on the very part of a snippet the reader came to copy. Custom properties resolve where they are
 * used and both editors are mounted in the page's light DOM, so `var(--sky)` here is the same blue
 * as the prose around it.
 */
export class SiteCodeTheme {

  /** The parts worth telling apart, in the two languages this site shows: a tag and its attributes
   * in the Share page's snippet, a key and the four kinds of value in a recording. */
  private static readonly COLOURS = HighlightStyle.define([
    { tag: tags.tagName, color: "var(--sky)" },
    { tag: tags.angleBracket, color: "var(--ink-dim)" },
    { tag: tags.attributeName, color: "var(--code-attr)" },
    { tag: tags.propertyName, color: "var(--sky)" },
    { tag: [tags.string, tags.attributeValue], color: "var(--ok)" },
    { tag: [tags.number, tags.bool, tags.null], color: "var(--error)" },
    { tag: tags.comment, color: "var(--ink-faint)", fontStyle: "italic" },
    { tag: tags.invalid, color: "var(--error)" }
  ])

  /** `maxHeight` for an editor that can grow past the screen (a pasted recording is hundreds of
   * lines); left out for one showing a snippet of three. */
  constructor(private readonly maxHeight?: string) {
  }

  get extensions(): Extension[] {
    return [
      // Ahead of anything a preset brings: for highlighters, the first one to match a token wins,
      // so this has to be added before basicSetup rather than after it.
      syntaxHighlighting(SiteCodeTheme.COLOURS, { fallback: true }),
      EditorView.theme({
        "&": {
          color: "var(--ink)",
          backgroundColor: "var(--ground-sunken)",
          fontSize: "0.82rem",
          ...(this.maxHeight === undefined ? {} : { maxHeight: this.maxHeight })
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
      }, { dark: matchMedia("(prefers-color-scheme: dark)").matches })
    ]
  }
}
