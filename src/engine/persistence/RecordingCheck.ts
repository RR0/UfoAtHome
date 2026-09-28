import type { RecordingIssue } from "./RecordingIssue.js"

/** One key of the generated format description (src/generated/sightingSchema.json) — the shape
 * scripts/build-sighting-schema.ts writes. */
export interface FormatField {
  doc?: string
  type: string
  values?: string[]
  fields?: Record<string, FormatField>
  loose?: true
}

/**
 * Checks a recording against the format as the types declare it: keys nothing reads, values of the
 * wrong JSON type, words a closed list does not have.
 *
 * The loader reads the keys it knows and nothing else, so before this a misspelt `utcOffsetHour`
 * was simply never read, and the recording played on the offset guessed from the longitude with
 * nothing to say why. The same walk as the published JSON Schema and the skill's validator, over
 * the same generated description, so the three agree on what a valid file is.
 *
 * The description is passed in rather than imported: it is 50 KB that only a loaded recording needs,
 * so the component fetches it lazily (see UfoElement.reportIssues).
 */
export class RecordingCheck {

  constructor(private readonly format: Record<string, FormatField>) {
  }

  issues(recording: unknown): RecordingIssue[] {
    const issues: RecordingIssue[] = []
    this.object(recording, this.format, "", issues)
    return issues
  }

  private object(value: unknown, fields: Record<string, FormatField>, path: string, issues: RecordingIssue[]): void {
    if (!RecordingCheck.isObject(value)) {
      issues.push({ kind: "wrong-type", path: path || "(the file)", expected: "object", found: RecordingCheck.typeOf(value) })
      return
    }
    for (const [key, inner] of Object.entries(value)) {
      const at = path ? `${path}.${key}` : key
      const field = fields[key]
      if (field) {
        this.field(inner, field, at, issues)
      } else {
        issues.push({ kind: "unknown-key", path: at })
      }
    }
  }

  private field(value: unknown, field: FormatField, path: string, issues: RecordingIssue[]): void {
    // Any value may be written with its provenance beside it (see Provenance): what is checked is
    // the value inside.
    if (RecordingCheck.isStated(value)) {
      this.field(value.value, field, path, issues)
      return
    }
    if (field.loose || value === undefined || value === null) return
    switch (field.type) {
      case "enum":
        if (typeof value !== "string" || !field.values?.includes(value)) {
          issues.push({ kind: "not-in-list", path, expected: (field.values ?? []).map(word => `"${word}"`).join(", "), found: JSON.stringify(value) })
        }
        return
      case "object":
        if (field.fields) {
          this.object(value, field.fields, path, issues)
        } else if (!RecordingCheck.isObject(value)) {
          issues.push({ kind: "wrong-type", path, expected: "object", found: RecordingCheck.typeOf(value) })
        }
        return
      case "array":
        if (!Array.isArray(value)) {
          issues.push({ kind: "wrong-type", path, expected: "array", found: RecordingCheck.typeOf(value) })
        } else if (field.fields) {
          value.forEach((element, index) => {
            const inner = RecordingCheck.isStated(element) ? element.value : element
            this.object(inner, field.fields!, `${path}.${index}`, issues)
          })
        }
        return
      default:
        if (typeof value !== field.type) {
          issues.push({ kind: "wrong-type", path, expected: field.type, found: RecordingCheck.typeOf(value) })
        }
    }
  }

  private static isObject(value: unknown): value is Record<string, unknown> {
    return typeof value === "object" && value !== null && !Array.isArray(value)
  }

  /** `{ value, basis?, rationale? }` and nothing else — see StatedValue. */
  private static isStated(value: unknown): value is { value: unknown } {
    return RecordingCheck.isObject(value) && "value" in value
      && Object.keys(value).every(key => key === "value" || key === "basis" || key === "rationale")
  }

  private static typeOf(value: unknown): string {
    return Array.isArray(value) ? "array" : value === null ? "null" : typeof value
  }
}
