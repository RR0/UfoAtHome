/** The licences the site speaks of, and where their text is: every mention of the MIT licence is a link to it, never a bare word. */
export class Licence {
  /** The text of UFO@home's own licence, in its repository. */
  static readonly OWN_URL = "https://github.com/RR0/UfoAtHome/blob/master/LICENSE"

  /** Sitrec's, which it was under before it was archived. */
  static readonly SITREC_URL = "https://github.com/MickWest/Sitrec/blob/HEAD/LICENSE"

  /** "MIT" as a link to the text of the licence at `url`: UFO@home's own unless said otherwise. */
  static mit(url: string = Licence.OWN_URL): string {
    return `<a href="${url}">MIT</a>`
  }
}
