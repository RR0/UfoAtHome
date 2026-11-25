/**
 * The sites the reader agreed to run module code from (see ConsentDialog), kept in this browser so that they are asked once: by origin, since a
 * site's code is the site's whoever names it. A module of this page's own site needs no agreement: it is the page's word. Every access in a try:
 * storage may be refused (a private window), and then the reader is asked again.
 */
export class ModuleConsent {
  static readonly KEY = "rr0-module-consent"

  /** The origin of `url`: what an agreement is given to. */
  static originOf(url: string): string {
    try {
      return new URL(url, typeof location === "undefined" ? undefined : location.href).origin
    } catch {
      return url
    }
  }

  /** Whether the code of the module at `url` may run: from this page's own site, or from one the reader agreed to. */
  static granted(url: string, storage: Storage | undefined = ModuleConsent.storage()): boolean {
    const origin = ModuleConsent.originOf(url)
    if (typeof location !== "undefined" && origin === location.origin) return true
    return ModuleConsent.list(storage).includes(origin)
  }

  /** The sites agreed to, in the order they were. */
  static list(storage: Storage | undefined = ModuleConsent.storage()): string[] {
    try {
      const kept = JSON.parse(storage?.getItem(ModuleConsent.KEY) ?? "[]") as unknown
      return Array.isArray(kept) ? kept.filter((origin): origin is string => typeof origin === "string") : []
    } catch {
      return []
    }
  }

  /** Records the reader's agreement to the code of `urls`' sites. */
  static grant(urls: readonly string[], storage: Storage | undefined = ModuleConsent.storage()): void {
    const origins = [...new Set([...ModuleConsent.list(storage), ...urls.map(url => ModuleConsent.originOf(url))])]
    try {
      storage?.setItem(ModuleConsent.KEY, JSON.stringify(origins))
    } catch {
      // Not kept: asked again next time.
    }
  }

  /** Withdraws the agreement to the code of `url`'s site. */
  static revoke(url: string, storage: Storage | undefined = ModuleConsent.storage()): void {
    const origin = ModuleConsent.originOf(url)
    try {
      storage?.setItem(ModuleConsent.KEY, JSON.stringify(ModuleConsent.list(storage).filter(kept => kept !== origin)))
    } catch {
      // Nothing kept.
    }
  }

  /** Withdraws the agreement to the sites of `removed`, those of `kept` (what the reader still has, from the same sites) excepted. */
  static revokeUnused(removed: readonly string[], kept: readonly string[], storage: Storage | undefined = ModuleConsent.storage()): void {
    const still = new Set(kept.map(url => ModuleConsent.originOf(url)))
    for (const url of removed) if (!still.has(ModuleConsent.originOf(url))) ModuleConsent.revoke(url, storage)
  }

  private static storage(): Storage | undefined {
    try {
      return typeof localStorage === "undefined" ? undefined : localStorage
    } catch {
      return undefined
    }
  }
}
