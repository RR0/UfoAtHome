/**
 * Where a recording's annexes are read from (see FrozenData): beside its file, or from the editor that has just taken them and not saved
 * them yet.
 *
 * One page-wide table, by absolute address, because a page may hold several scenes of the same recording (the scene, its seek preview, a
 * case's other observers) and each would otherwise fetch and unpack the same files again.
 */
export class FrozenAnnexes {
  /** What an editor holds and has not saved, by the address the annex will have: read before the network. */
  private static readonly held = new Map<string, Uint8Array>()
  private static readonly loaded = new Map<string, Promise<Uint8Array>>()
  /** Changes at every change of what is held, so that a scene can tell its annexes are not the ones it read. */
  static generation = 0

  /** The annex's absolute address, `src` read against the recording's (the page's, for a recording with no address of its own). */
  static address(src: string, documentUrl: string | undefined): string {
    const base = documentUrl ?? (typeof location === "undefined" ? "http://localhost/" : location.href)
    return new URL(src, base).href
  }

  /** Holds `bytes` as the annex at `url`, in place of anything read there before. */
  static hold(url: string, bytes: Uint8Array): void {
    FrozenAnnexes.held.set(url, bytes)
    FrozenAnnexes.loaded.delete(url)
    FrozenAnnexes.generation++
  }

  /** Forgets every annex held: a new recording is open. */
  static release(): void {
    if (FrozenAnnexes.held.size === 0) return
    for (const url of FrozenAnnexes.held.keys()) FrozenAnnexes.loaded.delete(url)
    FrozenAnnexes.held.clear()
    FrozenAnnexes.generation++
  }

  static bytes(url: string, fetchImpl: typeof fetch = fetch.bind(globalThis)): Promise<Uint8Array> {
    const held = FrozenAnnexes.held.get(url)
    if (held) return Promise.resolve(held)
    let loading = FrozenAnnexes.loaded.get(url)
    if (!loading) {
      loading = fetchImpl(url).then(async response => {
        if (!response.ok) throw new Error(`Frozen data not found (${response.status}): ${url}`)
        return new Uint8Array(await response.arrayBuffer())
      })
      FrozenAnnexes.loaded.set(url, loading)
      // A failure is not kept: the page may have been offline for a moment.
      loading.catch(() => FrozenAnnexes.loaded.delete(url))
    }
    return loading
  }

  static async json<T>(url: string): Promise<T> {
    return JSON.parse(new TextDecoder().decode(await FrozenAnnexes.bytes(url))) as T
  }

  /** The files of a zip annex, by name. fflate is fetched with the first one: a recording without one never needs it. */
  static async zip(url: string): Promise<Record<string, Uint8Array>> {
    const bytes = await FrozenAnnexes.bytes(url)
    const { unzipSync } = await import("fflate")
    return unzipSync(bytes)
  }
}
