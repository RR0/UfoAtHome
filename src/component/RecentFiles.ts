/**
 * A file opened before, as it can be opened again: at its address; by the handles the browser gave for the files picked (Chromium), read
 * again as they are now; or, where it gives none (Safari, Firefox), by a copy of what they held when they were opened.
 */
export type RecentFile = {
  /** What it is called in the list: the file's name. */
  readonly name: string
  /** When it was last opened, in ms since 1970. */
  readonly openedAt: number
} & (
  | { readonly kind: "address", readonly url: string }
  | { readonly kind: "handles", readonly handles: readonly FileSystemFileHandle[] }
  | { readonly kind: "copy", readonly copies: readonly { readonly name: string, readonly text: string }[] }
)

/** What a handle offers to be read again: Chromium's, not in every type library yet. */
interface PermittedHandle {
  queryPermission?(descriptor: { mode: "read" }): Promise<PermissionState>
  requestPermission?(descriptor: { mode: "read" }): Promise<PermissionState>
}

/**
 * The files opened lately, most recent first, kept in this browser (IndexedDB) and nowhere else.
 *
 * Kept for the reader's convenience only: a browser that keeps nothing (a private window, storage refused) lists none, and opening still
 * works. A file opened again moves to the top rather than being listed twice: the same address, or the same names picked together.
 */
export class RecentFiles {

  static readonly MAX = 12
  private static readonly DATABASE = "rr0-ufoathome"
  private static readonly STORE = "recent"

  /** The files opened lately, most recent first; none where the browser keeps nothing. */
  static async list(): Promise<RecentFile[]> {
    try {
      const all = await RecentFiles.request<RecentFile[]>("readonly", store => store.getAll())
      return all.sort((a, b) => b.openedAt - a.openedAt)
    } catch {
      return []
    }
  }

  /** Puts `file` at the top of the list, in place of what was the same file, keeping the MAX most recent. */
  static async add(file: RecentFile): Promise<void> {
    try {
      const kept = (await RecentFiles.list()).filter(other => RecentFiles.key(other) !== RecentFiles.key(file)).slice(0, RecentFiles.MAX - 1)
      await RecentFiles.request("readwrite", store => {
        store.clear()
        for (const one of [file, ...kept]) store.put(one, RecentFiles.key(one))
        return store.count()
      })
    } catch {
      // Not kept: the file is open all the same.
    }
  }

  /** Takes `file` off the list. */
  static async remove(file: RecentFile): Promise<void> {
    try {
      await RecentFiles.request("readwrite", store => store.delete(RecentFiles.key(file)))
    } catch {
      // Nothing kept, nothing to take off.
    }
  }

  /**
   * The files a recent one gives, read now: by its handles, once the browser lets them be read again (it may ask, which needs the click
   * that asked to open it); else from its copies. Undefined for one opened at an address, which is read there.
   */
  static async files(file: RecentFile): Promise<File[] | undefined> {
    if (file.kind === "copy") return file.copies.map(copy => new File([copy.text], copy.name, { type: "application/json" }))
    if (file.kind === "address") return undefined
    for (const handle of file.handles as readonly (FileSystemFileHandle & PermittedHandle)[]) {
      const state = await handle.queryPermission?.({ mode: "read" })
      if (state !== undefined && state !== "granted" && await handle.requestPermission?.({ mode: "read" }) !== "granted") {
        throw new Error(`${handle.name} may not be read again`)
      }
    }
    return Promise.all(file.handles.map(handle => handle.getFile()))
  }

  /** What makes two entries the same file. */
  private static key(file: RecentFile): string {
    if (file.kind === "address") return `address ${file.url}`
    const names = file.kind === "handles" ? file.handles.map(handle => handle.name) : file.copies.map(copy => copy.name)
    return `files ${[...names].sort().join("\n")}`
  }

  private static request<T>(mode: IDBTransactionMode, run: (store: IDBObjectStore) => IDBRequest<T>): Promise<T> {
    return new Promise<T>((resolve, reject) => {
      const opening = indexedDB.open(RecentFiles.DATABASE, 1)
      opening.onupgradeneeded = () => opening.result.createObjectStore(RecentFiles.STORE)
      opening.onerror = () => reject(opening.error)
      opening.onsuccess = () => {
        const database = opening.result
        const transaction = database.transaction(RecentFiles.STORE, mode)
        const request = run(transaction.objectStore(RecentFiles.STORE))
        transaction.oncomplete = () => {
          database.close()
          resolve(request.result)
        }
        transaction.onerror = () => {
          database.close()
          reject(transaction.error)
        }
      }
    })
  }
}
