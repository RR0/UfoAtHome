/**
 * The glyphs of the playback bar, drawn as SVG rather than typed as characters: the characters look
 * different on every platform (▶ is an emoji on some), and a player whose buttons change shape from
 * one phone to the next is not one whose buttons a reader has learnt. Same family of shapes as the
 * video sites' own, on purpose — see the bar's markup in ufoTemplate.
 */
export class PlayerIcons {
  private static svg(path: string): string {
    return `<svg viewBox="0 0 24 24" width="1.5em" height="1.5em" aria-hidden="true" focusable="false"><path d="${path}" fill="currentColor"/></svg>`
  }

  static readonly PLAY = PlayerIcons.svg("M8 5v14l11-7z")
  static readonly PAUSE = PlayerIcons.svg("M6 5h4v14H6zM14 5h4v14h-4z")
  static readonly VOLUME = PlayerIcons.svg("M3 9v6h4l5 5V4L7 9H3zm13.5 3A4.5 4.5 0 0 0 14 8v8a4.5 4.5 0 0 0 2.5-4zM14 3.2v2.1a7 7 0 0 1 0 13.4v2.1a9 9 0 0 0 0-17.6z")
  static readonly MUTED = PlayerIcons.svg("M3 9v6h4l5 5V4L7 9H3zm13.6 3 2.4-2.4-1.4-1.4-2.4 2.4-2.4-2.4-1.4 1.4 2.4 2.4-2.4 2.4 1.4 1.4 2.4-2.4 2.4 2.4 1.4-1.4z")
  /** Four corners pointing out, then in — not the diagonal arrows the ⛶ character and the video
   * sites' own "expand" used to be confused with. */
  static readonly ENTER_FULLSCREEN = PlayerIcons.svg("M5 5h5v2H7v3H5V5zm9 0h5v5h-2V7h-3V5zM5 14h2v3h3v2H5v-5zm12 0h2v5h-5v-2h3v-3z")
  static readonly EXIT_FULLSCREEN = PlayerIcons.svg("M8 5h2v5H5V8h3V5zm6 0h2v3h3v2h-5V5zM5 14h5v5H8v-3H5v-2zm9 0h5v2h-3v3h-2v-5z")
}
