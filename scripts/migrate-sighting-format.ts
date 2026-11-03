/**
 * Brings recordings written in an older version of the format to the current one, in place (see FormatVersion, SightingMigration).
 *
 * A reader migrates an older file as it reads it, so nothing breaks if a file is left as it was; this is for the files this project
 * publishes, so that what is served is written as the format now says.
 *
 * The files are written by hand as much as by code (a keyframe on one line, a decor object on a few), so a file is not written back
 * from its parsed value: only the top-level values the migration changed are replaced in its text, each where it was.
 *
 * Run with:
 *   npx tsx scripts/migrate-sighting-format.ts public/demo-data/*.json
 */
import { readFileSync, writeFileSync } from "node:fs"
import { SightingMigration } from "../src/engine/persistence/SightingMigration.js"

/** Where a top-level value of a JSON text starts and ends. */
interface ValueSpan {
  start: number
  end: number
}

class SightingFormatMigrator {

  /** Migrates the file at `path`, and says whether it changed. */
  migrate(path: string): boolean {
    const text = readFileSync(path, "utf8")
    const json = JSON.parse(text) as Record<string, unknown>
    if (typeof json !== "object" || json === null || !("timeline" in json)) return false
    const migrated = SightingMigration.toCurrent(json) as Record<string, unknown>
    if (migrated === json) return false
    const spans = this.topLevelSpans(text)
    const replacements = Object.keys(spans)
      .filter(key => JSON.stringify(json[key]) !== JSON.stringify(migrated[key]))
      .map(key => ({ ...spans[key], key }))
      .sort((a, b) => b.start - a.start)
    let written = text
    for (const { start, end, key } of replacements) {
      if (!(key in migrated)) throw new Error(`${path}: ${key} would be removed`)
      written = written.slice(0, start) + this.serialize(migrated[key], text.slice(start, end), this.indentAt(text, start)) + written.slice(end)
    }
    if (JSON.stringify(JSON.parse(written)) !== JSON.stringify(migrated)) throw new Error(`${path}: the text written does not read back as migrated`)
    writeFileSync(path, written)
    return true
  }

  /** A value written as the one it replaces was: on one line if that one was, indented as the file is otherwise. */
  private serialize(value: unknown, replaced: string, indent: { line: string, step: string }): string {
    if (!replaced.includes("\n") || indent.step === "") return JSON.stringify(value).replace(/,"/g, ", \"").replace(/":/g, "\": ")
    return JSON.stringify(value, null, indent.step).split("\n").join(`\n${indent.line}`)
  }

  /** The indentation of the line `offset` is on, and the file's step of indentation. */
  private indentAt(text: string, offset: number): { line: string, step: string } {
    const lineStart = text.lastIndexOf("\n", offset) + 1
    const line = /^[ \t]*/.exec(text.slice(lineStart))![0]
    const step = /^\{\n([ \t]+)/.exec(text)?.[1] ?? ""
    return { line, step }
  }

  /** The values of the top-level keys of a JSON object's text, by key. */
  private topLevelSpans(text: string): Record<string, ValueSpan> {
    const spans: Record<string, ValueSpan> = {}
    let depth = 0
    let key: string | undefined
    let valueStart = -1
    for (let i = 0; i < text.length; i++) {
      const c = text[i]
      if (c === "\"") {
        const end = this.stringEnd(text, i)
        if (depth === 1 && valueStart < 0 && key === undefined) {
          key = JSON.parse(text.slice(i, end + 1)) as string
        } else if (depth === 1 && valueStart < 0 && key !== undefined) {
          spans[key] = { start: i, end: end + 1 }
          key = undefined
        }
        i = end
      } else if (c === ":" && depth === 1) {
        let j = i + 1
        while (/\s/.test(text[j])) j++
        if (text[j] !== "\"") valueStart = j
        i = j - 1
      } else if (c === "{" || c === "[") {
        depth++
      } else if (c === "}" || c === "]") {
        depth--
        if (depth === 0 && valueStart >= 0 && key !== undefined) {
          // The last key's value, a number, a boolean or null.
          spans[key] = { start: valueStart, end: this.trimmedEnd(text, i) }
        } else if (depth === 1 && valueStart >= 0 && key !== undefined) {
          spans[key] = { start: valueStart, end: i + 1 }
          key = undefined
          valueStart = -1
        }
      } else if (c === "," && depth === 1 && key !== undefined) {
        // A number, a boolean or null.
        spans[key] = { start: valueStart, end: this.trimmedEnd(text, i) }
        key = undefined
        valueStart = -1
      }
    }
    return spans
  }

  private stringEnd(text: string, start: number): number {
    for (let i = start + 1; i < text.length; i++) {
      if (text[i] === "\\") i++
      else if (text[i] === "\"") return i
    }
    throw new Error("Unterminated string")
  }

  private trimmedEnd(text: string, end: number): number {
    while (/\s/.test(text[end - 1])) end--
    return end
  }
}

const migrator = new SightingFormatMigrator()
const changed = process.argv.slice(2).filter(path => migrator.migrate(path))
console.log(`${changed.length} file(s) migrated`)
for (const path of changed) console.log(`  ${path}`)
