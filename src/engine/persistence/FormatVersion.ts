/** The three kinds of file UFO@home reads, each with its own schema and its own version. */
export type FormatName = "sighting" | "case" | "interview"

/** A file states a version of its format that this engine does not read: a newer one, or no version at all. */
export class FormatVersionError extends Error {

  constructor(readonly format: FormatName, readonly found: unknown, readonly supported: number) {
    super(typeof found === "number" && Number.isInteger(found) && found > supported
      ? `This ${format} file is in version ${found} of its format; this UFO@home reads up to version ${supported}. Read it with a newer UFO@home.`
      : `This ${format} file states ${JSON.stringify(found)} as its format version, which is not a version.`)
    this.name = "FormatVersionError"
  }

  /** `template` (an editor's message) with `{found}` and `{supported}` filled in. */
  said(template: string): string {
    return template.replace("{found}", typeof this.found === "number" ? String(this.found) : JSON.stringify(this.found)).replace("{supported}", String(this.supported))
  }
}

/**
 * Which version of its format a file is written in, and whether this engine reads it.
 *
 * The version of a FORMAT, not of the engine: it changes only when a file written to the new format would be misread by an engine
 * that reads the old one (a field changing meaning or shape, a field removed). A field added does not change it: an older engine
 * ignores what it does not know, which is how every file of version 1 has stayed readable since the format began. So a release of
 * UFO@home rarely changes it, and its schema is published under it, at a path that names it (`schemaUrl`): a file can say which
 * schema it was written against, and a validator can check it against that one rather than against whatever is current.
 *
 * A file that leaves `version` out is version 1, the only one there was before files were checked: a case never had one.
 *
 * Reading a newer version is refused rather than attempted: the engine would play something other than what the file says, and
 * nothing on screen would say so. When a version 2 exists, reading version 1 will go through a migration here, so that the rest of
 * the engine only ever sees the current version.
 */
export class FormatVersion {

  /** The version of each format this engine reads and writes. */
  static readonly CURRENT: Record<FormatName, number> = { sighting: 1, case: 1, interview: 1 }

  /** Where the schemas are published, one directory per version. */
  static readonly SCHEMA_BASE = "https://ufoathome.org/schema"

  /** The address of the schema of `format` in `version`: `https://ufoathome.org/schema/1/sighting.schema.json`. */
  static schemaUrl(format: FormatName, version: number = FormatVersion.CURRENT[format]): string {
    return `${FormatVersion.SCHEMA_BASE}/${version}/${format}.schema.json`
  }

  /** The version `json` states, which may be wrapped with its provenance (`{ value }`), 1 when it states none. */
  static of(json: unknown): unknown {
    if (typeof json !== "object" || json === null) return 1
    const stated = (json as { version?: unknown }).version
    if (stated === undefined) return 1
    if (typeof stated === "object" && stated !== null && "value" in stated) return (stated as { value: unknown }).value
    return stated
  }

  /**
   * Throws a FormatVersionError unless `json` is in a version of `format` this engine reads.
   *
   * @return `json` itself, to be read.
   */
  static check<T>(json: T, format: FormatName): T {
    const found = FormatVersion.of(json)
    const supported = FormatVersion.CURRENT[format]
    if (typeof found !== "number" || !Number.isInteger(found) || found < 1 || found > supported) {
      throw new FormatVersionError(format, found, supported)
    }
    return json
  }
}
