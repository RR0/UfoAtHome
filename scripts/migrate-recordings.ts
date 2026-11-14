/**
 * Brings recordings written in an older version of the format to the current one, in place.
 *
 * Run with: npx tsx scripts/migrate-recordings.ts <file…>
 *
 * Six scripts that build the demo cases were written against version 1 of the format and still write it, while every recording in the
 * repository has long been at the current version: run one of them and its case goes BACKWARDS, which the schema then rejects (see
 * test/site). Rather than teaching six builders what each version changed, each pipes what it wrote through here, which knows nothing of
 * the format itself and asks SightingMigration — the one place that says what a version change means, and the same one the editor and the
 * player read a file with.
 *
 * The version is not the only thing such a builder can lag behind: it may also write nothing of what was added to its files afterwards
 * (a share card, the frozen annexes of a survey, a group of shapes drawn in the editor). This brings a file's VERSION forward and
 * nothing else, so a builder that drops content is still a builder that drops content — see the warning in build_duboc.py.
 *
 * Files are written as the builders write them (one space of indent, a closing newline). A file already at the current version is not
 * touched at all, so running this over a whole case rewrites only what it moves.
 */
import { readFileSync, writeFileSync } from "node:fs"
import { SightingMigration } from "./migration/SightingMigration.js"
import type { ReadableSightingJson } from "./migration/SightingMigration.js"

export class RecordingMigration {

  /** How the demo recordings are written: what the builders do, and what the repository holds. */
  private static readonly INDENT = 1

  /**
   * Brings each file to the current version, and says which ones moved. A file that is already current is left untouched, so this can be
   * run over a whole case without rewriting what has not changed.
   */
  static migrate(paths: readonly string[]): { path: string, from: unknown, to: unknown }[] {
    const moved: { path: string, from: unknown, to: unknown }[] = []
    for (const path of paths) {
      const before = readFileSync(path, "utf8")
      const json = JSON.parse(before) as ReadableSightingJson
      const migrated = SightingMigration.toCurrent(json)
      // The same object back means it was already current: left alone, rather than rewritten through a JSON round-trip that would drop
      // the trailing zero of every whole number a Python builder wrote (332.0 for a heading) without meaning anything by it.
      if (migrated === (json as object)) continue
      writeFileSync(path, JSON.stringify(migrated, undefined, RecordingMigration.INDENT) + "\n")
      moved.push({ path, from: RecordingMigration.versionOf(json), to: RecordingMigration.versionOf(migrated) })
    }
    return moved
  }

  /** What a file says its version is, bare or with its provenance beside it (see Provenance). */
  private static versionOf(json: object): unknown {
    const version = (json as { version?: unknown }).version
    return typeof version === "object" && version !== null && "value" in version ? (version as { value: unknown }).value : version
  }

  static main(paths: readonly string[]): void {
    if (paths.length === 0) {
      console.error("Usage: npx tsx scripts/migrate-recordings.ts <file…>")
      process.exitCode = 1
      return
    }
    const moved = RecordingMigration.migrate(paths)
    for (const { path, from, to } of moved) console.log(`migrated ${path}: version ${String(from)} to ${String(to)}`)
    console.log(`${moved.length} of ${paths.length} recordings migrated`)
  }
}

// Only when it is what was run: a test reads the class itself (see test/scripts/RecordingMigration.test.ts).
if (process.argv[1]?.endsWith("migrate-recordings.ts")) RecordingMigration.main(process.argv.slice(2))
