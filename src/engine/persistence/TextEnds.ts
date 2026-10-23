/** What two texts begin and end with in common, found by comparing large chunks at once: in a text of fourteen million characters, a loop on each one is the cost. */
export class TextEnds {
  /** Characters compared at once by the engine before going one by one. */
  private static readonly CHUNK = 1 << 16

  /** How many characters `a` and `b` begin with in common. */
  static commonPrefix(a: string, b: string): number {
    const max = Math.min(a.length, b.length)
    const chunk = TextEnds.CHUNK
    let i = 0
    while (i + chunk <= max && a.slice(i, i + chunk) === b.slice(i, i + chunk)) i += chunk
    while (i < max && a.charCodeAt(i) === b.charCodeAt(i)) i++
    return i
  }

  /** How many characters `a` and `b` end with in common, at most `max`. */
  static commonSuffix(a: string, b: string, max: number): number {
    const chunk = TextEnds.CHUNK
    let i = 0
    while (i + chunk <= max && a.slice(a.length - i - chunk, a.length - i) === b.slice(b.length - i - chunk, b.length - i)) i += chunk
    while (i < max && a.charCodeAt(a.length - 1 - i) === b.charCodeAt(b.length - 1 - i)) i++
    return i
  }
}
