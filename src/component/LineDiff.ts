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
  /**
   * The most lines compared in looking for them: the search costs the lines times the edits, and a recording of half a million
   * lines all of whose shapes moved (the observer turned) took most of a second before reaching the bound above.
   */
  static readonly MAX_WORK = 1_000_000

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
    if (matched === undefined) {
      // Past the bound: walked through once, each difference read as lines that came or went if the line looked for is met again
      // a little further on, as a line changed in place otherwise. Not the shortest edit, but what a text changed here and there
      // is (every shape moved, a field added to each): calling the whole middle rewritten marked half a million lines, which cost
      // more than the edit.
      const near = LineDiff.nearOf(a, b)
      return { changed: near.changed.map(index => start + index), removed: near.removed.map(index => start + index) }
    }
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

  /** How far ahead a line is looked for again, past the bound (see nearOf). */
  static readonly LOOKAHEAD = 64

  /** What differs, found in one walk through both: see compare, past the bound. */
  private static nearOf(a: readonly string[], b: readonly string[]): { changed: number[], removed: number[] } {
    const changed: number[] = []
    const removed: number[] = []
    let i = 0
    let j = 0
    const ahead = (lines: readonly string[], from: number, line: string) => {
      for (let k = 1; k <= LineDiff.LOOKAHEAD && from + k < lines.length; k++) if (lines[from + k] === line) return k
      return 0
    }
    while (i < a.length && j < b.length) {
      if (a[i] === b[j]) {
        i++
        j++
        continue
      }
      const came = ahead(b, j, a[i])
      const went = ahead(a, i, b[j])
      if (came > 0 && (went === 0 || came <= went)) {
        for (let k = 0; k < came; k++) changed.push(j + k)
        j += came
      } else if (went > 0) {
        removed.push(j)
        i += went
      } else {
        changed.push(j)
        i++
        j++
      }
    }
    for (; j < b.length; j++) changed.push(j)
    if (i < a.length) removed.push(b.length)
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
    let work = 0
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
        work += 1 + x - (down ? v[offset + k + 1] : v[offset + k - 1] + 1)
        if (work > LineDiff.MAX_WORK) return undefined
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
