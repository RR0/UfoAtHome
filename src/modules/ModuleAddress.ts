/** How a recording writes the address of a module it names (see SightingRecordingJson.modules). */
export class ModuleAddress {
  /**
   * `url` as the recording at `base` writes it: relative to the recording when both are on the same host, so that a recording and its
   * module copied together elsewhere still find each other; absolute otherwise, or when the recording has no address yet.
   */
  static of(url: string, base: string | undefined): string {
    if (!base) return url
    let target: URL
    let from: URL
    try {
      target = new URL(url)
      from = new URL(base)
    } catch {
      return url
    }
    if (target.origin !== from.origin || !/^https?:$/.test(target.protocol)) return url
    const fromDirs = from.pathname.split("/").slice(0, -1)
    const toParts = target.pathname.split("/")
    let shared = 0
    while (shared < fromDirs.length && shared < toParts.length - 1 && fromDirs[shared] === toParts[shared]) shared++
    const up = fromDirs.length - shared
    const relative = [...Array(up).fill(".."), ...toParts.slice(shared)].join("/")
    return relative + target.search + target.hash
  }

  /** Whether the recording at `base` already names the module at `url`, however it wrote it. */
  static names(modules: readonly string[] | undefined, url: string, base: string | undefined): boolean {
    return (modules ?? []).some(named => {
      try {
        return new URL(named, base ?? url).href === url
      } catch {
        return false
      }
    })
  }
}
