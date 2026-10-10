/**
 * What a link to this site shows where it is shared: the project's logo, a flying saucer holding a play
 * button, whichever page the link is to.
 *
 * One block, used by every page the build writes — the generated ones (Layout), the 404 and the offline
 * page — so that no page can be shared without it. It is its own file because Layout reads OfflineKit and
 * OfflineKit needs it too: a constant in either would make them import one another.
 */
export class ShareCard {

  static readonly ORIGIN = "https://ufoathome.org"

  /** The logo is a flying saucer holding a play button: what the project does, replaying an account. */
  static readonly LOGO_ALT = "UFO@home logo: a flying saucer with a play button"

  /** The image of the card, its size (square, 512 px) and what it shows, for those who cannot see it. */
  static readonly META = `<meta property="og:site_name" content="UFO@home">
  <meta property="og:image" content="${ShareCard.ORIGIN}/logo.png">
  <meta property="og:image:width" content="512">
  <meta property="og:image:height" content="512">
  <meta property="og:image:alt" content="${ShareCard.LOGO_ALT}">
  <meta name="twitter:card" content="summary">`
}
