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
    return LineDiff.compare(before, after).changed
  }

  /**
   * What differs between two texts, line by line: the lines of `after` that are new or not what they were (`changed`), and the
   * places where lines were taken away (`removed`): the index of the line of `after` that now stands where they were, or
   * `after.length` when they were at the end. A line taken away is no line of the new text to mark, so it is the place that is.
   */
  static compare(before: readonly string[], after: readonly string[]): { changed: number[], removed: number[] } {
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
    if (a.length === 0) return { changed: range(start, start + b.length), removed: [] }
    if (b.length === 0) return { changed: [], removed: [start] }
    const matched = LineDiff.matchedOf(a, b)
    // Past the bound: the middle is called rewritten, and nothing in it is said to have been taken away.
    if (matched === undefined) return { changed: range(start, start + b.length), removed: [] }
    const changed: number[] = []
    const removed: number[] = []
    let previousA = -1
    let previousB = -1
    // Between two lines that are kept: more lines gone than lines that came is lines taken away, where as many came as went they
    // are lines changed, and the changed lines say it.
    const gap = (i: number, j: number): void => {
      if (i - previousA - 1 > j - previousB - 1) removed.push(start + j)
    }
    for (let j = 0; j < b.length; j++) {
      const i = matched.get(j)
      if (i === undefined) {
        changed.push(start + j)
        continue
      }
      gap(i, j)
      previousA = i
      previousB = j
    }
    gap(a.length, b.length)
    return { changed, removed }
  }

  /** The indexes of `b` that are part of a longest common subsequence with `a`, each with its index in `a`, or undefined past the bound. */
  private static matchedOf(a: readonly string[], b: readonly string[]): Map<number, number> | undefined {
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

  private static walkBack(trace: Int32Array[], last: number, n: number, m: number, offset: number): Map<number, number> {
    const matched = new Map<number, number>()
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
        matched.set(y, x)
      }
      x = previousX
      y = previousY
    }
    // What is left once every edit is walked back is the snake from the start.
    while (x > 0 && y > 0) {
      x--
      y--
      matched.set(y, x)
    }
    return matched
  }
}
