/** What a film of the recording is made with, as the reader chose it before it is made (see VideoButton). */
export interface FilmOptions {
  /** The film's height in pixels, its width following the picture's proportions; undefined, the picture's own size on screen. */
  readonly height?: number
  /** Where the film starts and ends, in seconds of the observation from its start, as the player's counter reads it: undefined, its start
   * and its end. */
  readonly fromS?: number
  readonly toS?: number
  /** Whether the account's moment is written under the picture, as the player writes it. */
  readonly caption: boolean
  /** Whether the time the player shows is written in a corner. */
  readonly time: boolean
  /** Whether the map of where the witness stood is laid in its corner, as the player lays it. */
  readonly map: boolean
}

/** What is laid over one frame of a film, at its instant (see UfoElement.filmChrome). */
export interface FilmChromeAt {
  /** The account's moment: its label, written bold, and what it says. */
  readonly caption?: { readonly label: string, readonly note?: string }
  readonly time?: string
  /** The map as painted at this instant, and where it stands over the picture, as shares of the picture's width and height. */
  readonly map?: { readonly canvas: CanvasImageSource, readonly left: number, readonly top: number, readonly width: number, readonly height: number }
}

/**
 * Writes over a frame of a film what the reader asked to keep of what the player lays over its picture: the account's moment, the
 * time, the map; and the project's logo, faint, in a corner. Never its controls: a film is watched, not operated.
 *
 * Drawn rather than captured: the player's words are elements laid over the canvas, not in it, and are sized for the screen, not for the
 * film. Here they are sized from the film's own height, so a film made at 2160 lines reads as one made at 720.
 */
export class FilmChrome {
  /** The caption's letters, as a share of the film's height: the player's 0.85 em over a picture some 600 px high. */
  static readonly TEXT_SHARE = 0.032
  /** The margin round what is written, in letter heights. */
  static readonly MARGIN = 0.8
  /** How much of the film's width a line of the caption may take. */
  static readonly LINE_SHARE = 0.9
  static readonly FONT = "system-ui, -apple-system, 'Segoe UI', Roboto, sans-serif"
  /** The project's logo, laid faint in the bottom-right corner of every frame: where the film was made, wherever it is passed on to. */
  static readonly LOGO_URL = new URL("../../site/assets/logo.png", import.meta.url).href
  /** Its side, as a share of the film's height, and how much of it shows over the picture. */
  static readonly LOGO_SHARE = 0.08
  static readonly LOGO_OPACITY = 0.45

  private static logo?: Promise<ImageBitmap | undefined>

  /** The logo, fetched once: undefined where it cannot be, and the film is then made without it rather than not at all. */
  static loadLogo(): Promise<ImageBitmap | undefined> {
    return FilmChrome.logo ??= fetch(FilmChrome.LOGO_URL)
      .then(response => response.ok ? response.blob() : Promise.reject(new Error(`Logo: ${response.status}`)))
      .then(blob => createImageBitmap(blob))
      .catch(error => {
        console.warn("UFO@home: the film's logo could not be loaded:", error)
        return undefined
      })
  }

  static paint(target: OffscreenCanvasRenderingContext2D, chrome: FilmChromeAt, logo?: CanvasImageSource): void {
    const { width, height } = target.canvas
    const size = Math.max(10, Math.round(height * FilmChrome.TEXT_SHARE))
    // The caption keeps clear of the logo on either side, so as to stay centred.
    let captionWidth = width * FilmChrome.LINE_SHARE
    target.save()
    try {
      if (logo) {
        const side = Math.round(height * FilmChrome.LOGO_SHARE)
        const margin = size * FilmChrome.MARGIN
        target.globalAlpha = FilmChrome.LOGO_OPACITY
        target.imageSmoothingQuality = "high"
        target.drawImage(logo, width - margin - side, height - margin - side, side, side)
        target.globalAlpha = 1
        captionWidth = Math.min(captionWidth, width - 2 * (side + 2 * margin))
      }
      if (chrome.map) {
        const map = chrome.map
        target.drawImage(map.canvas, map.left * width, map.top * height, map.width * width, map.height * height)
      }
      target.fillStyle = "#fff"
      target.shadowColor = "rgba(0, 0, 0, 0.9)"
      target.shadowBlur = size * 0.3
      target.shadowOffsetY = size * 0.06
      if (chrome.time) {
        target.font = `600 ${size}px ${FilmChrome.FONT}`
        target.textBaseline = "top"
        target.textAlign = "left"
        target.fillText(chrome.time, size * FilmChrome.MARGIN, size * FilmChrome.MARGIN)
      }
      if (chrome.caption) FilmChrome.paintCaption(target, chrome.caption, size, captionWidth)
    } finally {
      target.restore()
    }
  }

  /** The caption centred at the bottom, on as many lines as it needs, its label bold as the player writes it. */
  private static paintCaption(target: OffscreenCanvasRenderingContext2D, caption: NonNullable<FilmChromeAt["caption"]>, size: number, lineWidth: number): void {
    const { width, height } = target.canvas
    const bold = `700 ${size}px ${FilmChrome.FONT}`
    const regular = `400 ${size}px ${FilmChrome.FONT}`
    const words = [
      ...caption.label.split(/\s+/).filter(Boolean).map(text => ({ text, font: bold })),
      ...(caption.note ? `— ${caption.note}`.split(/\s+/).filter(Boolean).map(text => ({ text, font: regular })) : [])
    ]
    const measured = words.map(word => {
      target.font = word.font
      return { ...word, width: target.measureText(word.text).width }
    })
    target.font = regular
    const space = target.measureText(" ").width
    const lines: { words: typeof measured, width: number }[] = []
    let line: { words: typeof measured, width: number } = { words: [], width: 0 }
    for (const word of measured) {
      const wider = line.width + (line.words.length > 0 ? space : 0) + word.width
      if (line.words.length > 0 && wider > lineWidth) {
        lines.push(line)
        line = { words: [], width: 0 }
      }
      line.width += (line.words.length > 0 ? space : 0) + word.width
      line.words.push(word)
    }
    if (line.words.length > 0) lines.push(line)
    const lineHeight = size * 1.3
    target.textBaseline = "alphabetic"
    target.textAlign = "left"
    let y = height - size * FilmChrome.MARGIN - (lines.length - 1) * lineHeight
    for (const each of lines) {
      let x = (width - each.width) / 2
      for (const word of each.words) {
        target.font = word.font
        target.fillText(word.text, x, y)
        x += word.width + space
      }
      y += lineHeight
    }
  }
}
