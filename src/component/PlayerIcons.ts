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

  /** A toggle is drawn as an outline while off and solid while on — the way the video sites show
   * theirs — so the state reads from the glyph itself, with nothing added around it. */
  private static outline(path: string): string {
    return `<svg viewBox="0 0 24 24" width="1.5em" height="1.5em" aria-hidden="true" focusable="false"><path d="${path}" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linejoin="round" stroke-linecap="round"/></svg>`
  }

  private static solid(path: string): string {
    return `<svg viewBox="0 0 24 24" width="1.5em" height="1.5em" aria-hidden="true" focusable="false"><path d="${path}" fill="currentColor" fill-rule="evenodd"/></svg>`
  }

  private static readonly BOOKMARK = "M6 3.5h12a.5.5 0 0 1 .5.5v16.5L12 16.8l-6.5 3.7V4a.5.5 0 0 1 .5-.5z"
  private static readonly PICTURE = "M5 4h14a2 2 0 0 1 2 2v12a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2z"
  private static readonly PICTURE_HILLS = "M4.5 17.5l4.5-6 3 4 2.5-3 5 5z"
  private static readonly PIN = "M12 21.5s-6.5-5.7-6.5-10.8a6.5 6.5 0 0 1 13 0c0 5.1-6.5 10.8-6.5 10.8z"
  private static readonly PIN_HOLE = "M12 8.4a2.4 2.4 0 1 0 0 4.8 2.4 2.4 0 0 0 0-4.8z"

  static readonly MILESTONES_OFF = PlayerIcons.outline(PlayerIcons.BOOKMARK)
  static readonly MILESTONES_ON = PlayerIcons.solid(PlayerIcons.BOOKMARK)
  static readonly PICTURES_OFF = PlayerIcons.outline(`${PlayerIcons.PICTURE}${PlayerIcons.PICTURE_HILLS}`)
  static readonly PICTURES_ON = PlayerIcons.solid(`${PlayerIcons.PICTURE}${PlayerIcons.PICTURE_HILLS}`)
  static readonly MAP_OFF = PlayerIcons.outline(`${PlayerIcons.PIN}${PlayerIcons.PIN_HOLE}`)
  static readonly MAP_ON = PlayerIcons.solid(`${PlayerIcons.PIN}${PlayerIcons.PIN_HOLE}`)

  /** The triangle sits a little left of where its box would centre it: its mass is at the wide
   * end, and a triangle centred by its box looks pushed to the right. */
  static readonly SHARE = PlayerIcons.outline("M14 4l7 7-7 7v-4.2C8.6 13.8 5.4 15.6 3.5 19c.6-5.6 3.4-9.6 10.5-10.8V4z")
  /** The chevrons of the fold-out that holds the buttons a narrow player has no room for. */
  static readonly FOLDED = PlayerIcons.svg("M15.4 7.4 14 6l-6 6 6 6 1.4-1.4L10.8 12z")
  static readonly UNFOLDED = PlayerIcons.svg("M8.6 16.6 10 18l6-6-6-6-1.4 1.4 4.6 4.6z")

  static readonly PLAY = PlayerIcons.svg("M7.4 5v14l11-7z")
  static readonly PAUSE = PlayerIcons.svg("M6 5h4v14H6zM14 5h4v14h-4z")
  static readonly VOLUME = PlayerIcons.svg("M2 9.5v5h3.5l4.5 4.5V5L5.5 9.5H2zm12.5 2.5A4 4 0 0 0 12.5 8.5v7A4 4 0 0 0 14.5 12zM12.5 4.2v2.1a6.5 6.5 0 0 1 0 11.4v2.1a8.6 8.6 0 0 0 0-15.6z")
  /** The speaker drawn smaller and to the left, so that the cross has a place of its own. */
  static readonly MUTED = PlayerIcons.svg("M2 9.5v5h3.5l4.5 4.5V5L5.5 9.5H2zM15 9.8l1.4-1.4 2.6 2.6 2.6-2.6 1.4 1.4-2.6 2.6 2.6 2.6-1.4 1.4-2.6-2.6-2.6 2.6-1.4-1.4 2.6-2.6z")
  /** Four corners pointing out, then in — not the diagonal arrows the ⛶ character and the video
   * sites' own "expand" used to be confused with. */
  static readonly ENTER_FULLSCREEN = PlayerIcons.svg("M5 5h5v2H7v3H5V5zm9 0h5v5h-2V7h-3V5zM5 14h2v3h3v2H5v-5zm12 0h2v5h-5v-2h3v-3z")
  static readonly EXIT_FULLSCREEN = PlayerIcons.svg("M8 5h2v5H5V8h3V5zm6 0h2v3h3v2h-5V5zM5 14h5v5H8v-3H5v-2zm9 0h5v2h-3v3h-2v-5z")
}
