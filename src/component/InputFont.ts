/**
 * How a field reads, in every component that holds fields: the same size for all of them, and what is typed by hand with nothing to constrain it
 * (a name, a place, a date said as EDTF, an address, a description) in a monospaced font, read letter by letter as the file editor is. A
 * number or a list has its own control and keeps the font the browser gives it.
 *
 * Each shadow root puts `InputFont.CSS` in its style: a rule of a page does not cross into it. `--rr0-input-font-size` changes the size.
 */
export class InputFont {

  /** The fields typed by hand with nothing to constrain what is typed. */
  static readonly FREE = `input:not([type]), input[type="text"], input[type="url"], input[type="search"], input[type="email"], input[type="tel"], input[type="password"], textarea`

  static readonly FAMILY = `ui-monospace, SFMono-Regular, Menlo, Consolas, monospace`

  static readonly CSS = `
/* Every field the same size; what is typed freely in a monospaced font (see InputFont). */
input, textarea { font-size: var(--rr0-input-font-size, 13px); }
:is(${InputFont.FREE}) { font-family: ${InputFont.FAMILY}; }
`
}
