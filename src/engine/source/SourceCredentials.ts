/**
 * The keys typed on this page for the sources that ask for one, by source id: held in memory until the page is reloaded, shared by
 * every editor of the page, and never written anywhere. Whatever else runs on this origin (a module loaded from a URL) could read
 * what the browser stores, so a key is not stored; typing it again after a reload is the price of that. Same rule as the key of a
 * narrative provider (see NarrativeSetting.remembered).
 */
export class SourceCredentials {
  private static readonly typed = new Map<string, string>()

  static of(sourceId: string): string | undefined {
    return SourceCredentials.typed.get(sourceId)
  }

  /** An empty value is no key. */
  static set(sourceId: string, value: string): void {
    const key = value.trim()
    if (key === "") SourceCredentials.typed.delete(sourceId)
    else SourceCredentials.typed.set(sourceId, key)
  }

  /** Forgets them all, as a reload does. */
  static forget(): void {
    SourceCredentials.typed.clear()
  }
}
