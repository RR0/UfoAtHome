/**
 * Which lines of a text are not the lines of the one it came from.
 *
 * What the File group's editor marks in its margin: the lines changed since the recording was last saved or
 * exported. A line that is new, or that is not what it was, is changed; a line that only moved with the ones
 * round it is not. Works on lines, not on characters, since a recording is a text one reads a line at a time.
 *
 * The common beginning and end are set aside first, which is nearly all of a text after a form edit (the form
 * rewrites the same recording with a value changed), and what is left goes through the shortest-edit-script
 * search of Myers, bounded: past {@link MAX_EDITS} edits the whole middle is called changed rather than worked
 * out, which is as true of it as of any text that was rewritten.
 */
export class LineDiff {
  /** The most edits looked for in what is left once the ends are set aside. */
  static readonly MAX_EDITS = 1500

  /** The indexes (0-based) of the lines of `after` that are not matched to a line of `before`. */
  static changed(before: readonly string[], after: readonly string[]): number[] {
    let start = 0
    while (start < before.length && start < after.length && before[start] === after[start]) start++
    let endBefore = before.length
    let endAfter = after.length
    while (endBefore > start && endAfter > start && before[endBefore - 1] === after[endAfter - 1]) {
      endBefore--
      endAfter--
    }
    const a = before.slice(start, endBefore)
    const b = after.slice(start, endAfter)
    const range = (from: number, to: number) => Array.from({ length: Math.max(0, to - from) }, (_, i) => from + i)
    if (a.length === 0) return range(start, start + b.length)
    if (b.length === 0) return []
    const matched = LineDiff.matchedOf(a, b)
    if (matched === undefined) return range(start, start + b.length)
    const out: number[] = []
    for (let j = 0; j < b.length; j++) if (!matched.has(j)) out.push(start + j)
    return out
  }

  /** The indexes of `b` that are part of a longest common subsequence with `a`, or undefined past the bound. */
  private static matchedOf(a: readonly string[], b: readonly string[]): Set<number> | undefined {
    const n = a.length
    const m = b.length
    const max = Math.min(n + m, LineDiff.MAX_EDITS)
    const offset = max + 1
    const v = new Int32Array(2 * max + 3)
    const trace: Int32Array[] = []
    for (let d = 0; d <= max; d++) {
      // The furthest reach of each diagonal as it stood before this many edits: what walking back needs.
      trace.push(v.slice())
      for (let k = -d; k <= d; k += 2) {
        const down = k === -d || (k !== d && v[offset + k - 1] < v[offset + k + 1])
        let x = down ? v[offset + k + 1] : v[offset + k - 1] + 1
        let y = x - k
        while (x < n && y < m && a[x] === b[y]) {
          x++
          y++
        }
        v[offset + k] = x
        if (x >= n && y >= m) return LineDiff.walkBack(trace, d, n, m, offset)
      }
    }
    return undefined
  }

  private static walkBack(trace: Int32Array[], last: number, n: number, m: number, offset: number): Set<number> {
    const matched = new Set<number>()
    let x = n
    let y = m
    for (let d = last; d > 0; d--) {
      const v = trace[d]
      const k = x - y
      const down = k === -d || (k !== d && v[offset + k - 1] < v[offset + k + 1])
      const previousK = down ? k + 1 : k - 1
      const previousX = v[offset + previousK]
      const previousY = previousX - previousK
      while (x > previousX && y > previousY) {
        x--
        y--
        matched.add(y)
      }
      x = previousX
      y = previousY
    }
    // What is left once every edit is walked back is the snake from the start.
    while (x > 0 && y > 0) {
      x--
      y--
      matched.add(y)
    }
    return matched
  }
}
