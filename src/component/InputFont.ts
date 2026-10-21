/**
 * How a field reads, in every component that holds fields: the same size for all of them, and what is typed by hand with nothing to constrain it
 * (a name, a place, a date said as EDTF, an address, a description) in a monospaced font, read letter by letter as the file editor is. A
 * number or a list has its own control and keeps the font the browser gives it.
 *
 * A list to pick from is drawn the same everywhere too (`InputFont.PICKER`): a little room above and below its text, and its arrow set apart
 * from its right edge. The browser's own select has neither (its arrow touches the border, and its padding cannot be set), so its look is
 * drawn here, the arrow in the colour of the text, which a dark panel and a light one both read. A button that opens a list of its own (see
 * PopoverPickerElement) takes the same class and looks the same.
 *
 * Each shadow root puts `InputFont.CSS` in its style: a rule of a page does not cross into it. `--rr0-input-font-size` changes the size.
 */
export class InputFont {

  /** The fields typed by hand with nothing to constrain what is typed. */
  static readonly FREE = `input:not([type]), input[type="text"], input[type="url"], input[type="search"], input[type="email"], input[type="tel"], input[type="password"], textarea`

  static readonly FAMILY = `ui-monospace, SFMono-Regular, Menlo, Consolas, monospace`

  /** What is drawn as a list to pick from: every select of one line, and the buttons that open one (see PopoverPickerElement). */
  static readonly PICKER = `select:not([multiple]):not([size]), .rr0-select`

  static readonly CSS = `
/* Every field the same size; what is typed freely in a monospaced font (see InputFont). */
input, textarea, select, .rr0-select { font-size: var(--rr0-input-font-size, 13px); }
:is(${InputFont.FREE}) { font-family: ${InputFont.FAMILY}; }
/* Every list to pick from alike: room above and below its text, and its arrow drawn apart from its right edge (see InputFont). */
:is(${InputFont.PICKER}) {
  -webkit-appearance: none; appearance: none; box-sizing: border-box;
  padding: .3em 1.9em .3em .5em; line-height: 1.2;
  border: 1px solid color-mix(in srgb, CanvasText 40%, transparent); border-radius: 4px;
  background-color: Field; color: FieldText;
  background-image: linear-gradient(45deg, transparent 50%, currentColor 50%), linear-gradient(135deg, currentColor 50%, transparent 50%);
  background-position: calc(100% - 1em) 55%, calc(100% - .65em) 55%;
  background-size: .35em .35em, .35em .35em;
  background-repeat: no-repeat;
  cursor: pointer;
}
:is(${InputFont.PICKER}):disabled { opacity: .55; cursor: default; }
`
}
