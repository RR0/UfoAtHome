/**
 * Turns the TypeScript type of a recording into the completion data the Player page's JSON editor
 * offers, and writes it to site/generated/sightingSchema.json.
 *
 * Read from the types and not written by hand, for the reason every other derived thing in this
 * project is: a schema typed out beside the model is a second statement of it, free to fall behind
 * the day a field is added. This one cannot — a field that exists is offered, a field that is
 * renamed is offered under its new name, and a string union is offered as its own list of values.
 *
 * The doc comments come with them. That is most of the point: `precipitationIntensity` completing
 * is a convenience, but completing with "0-1; meaningless while precipitationType is none" beside
 * it is the thing that lets somebody discover the format by typing in it.
 *
 * Run with: npm run build:schema (and by build:site, which needs it before the bundle).
 */
import ts from "typescript"
import { mkdirSync, writeFileSync } from "node:fs"
import { fileURLToPath } from "node:url"
import path from "node:path"

/** One key the editor can offer, and what is known about what may follow it. */
interface SchemaField {
  /** What the doc comment says, first sentence only — a completion list is not a manual. */
  doc?: string
  /** "string" | "number" | "boolean" | "object" | "array" | "enum", for the icon and the snippet. */
  type: string
  /** The values, when the type is a union of string literals. */
  values?: string[]
  /** The keys of the object this holds, or of an array's element when it holds objects. */
  fields?: Record<string, SchemaField>
}

class SchemaBuilder {

  private readonly checker: ts.TypeChecker

  /** Types already being described further up the stack. A recording's own types are not
   * recursive, but nothing stops one becoming so, and an unguarded walk would not survive it. */
  private readonly open = new Set<ts.Type>()

  constructor(private readonly program: ts.Program) {
    this.checker = program.getTypeChecker()
  }

  /** The type of `name` as declared in the program, by its declaration rather than by a global
   * lookup: two interfaces of one name in different files would otherwise resolve arbitrarily. */
  typeNamed(name: string): ts.Type {
    for (const file of this.program.getSourceFiles()) {
      if (file.isDeclarationFile) {
        continue
      }
      for (const statement of file.statements) {
        if ((ts.isInterfaceDeclaration(statement) || ts.isTypeAliasDeclaration(statement)) && statement.name.text === name) {
          return this.checker.getTypeAtLocation(statement.name)
        }
      }
    }
    throw new Error(`No interface or type alias named ${name} in the program`)
  }

  fieldsOf(type: ts.Type): Record<string, SchemaField> {
    const fields: Record<string, SchemaField> = {}
    for (const property of this.checker.getPropertiesOfType(type)) {
      const declaration = property.valueDeclaration ?? property.declarations?.[0]
      if (!declaration) {
        continue
      }
      fields[property.name] = this.describe(this.checker.getTypeOfSymbolAtLocation(property, declaration), property)
    }
    return fields
  }

  private describe(type: ts.Type, property?: ts.Symbol): SchemaField {
    const doc = property && this.docOf(property)
    const field: SchemaField = { type: "string", ...(doc === undefined ? {} : { doc }) }
    // undefined is what optionality looks like in a union; it says nothing about what may be
    // written there, so it goes before anything else is decided.
    const parts = (type.isUnion() ? type.types : [type]).filter(part => !(part.flags & ts.TypeFlags.Undefined))
    const literals = parts.filter(part => part.isStringLiteral())
    if (literals.length > 0 && literals.length === parts.length) {
      return { ...field, type: "enum", values: literals.map(part => (part as ts.StringLiteralType).value) }
    }
    const single = parts.length === 1 ? parts[0] : undefined
    if (single === undefined) {
      return field
    }
    if (single.flags & ts.TypeFlags.NumberLike) {
      return { ...field, type: "number" }
    }
    if (single.flags & ts.TypeFlags.BooleanLike) {
      return { ...field, type: "boolean" }
    }
    if (single.flags & ts.TypeFlags.StringLike) {
      return { ...field, type: "string" }
    }
    if (this.checker.isArrayType(single)) {
      const element = this.checker.getTypeArguments(single as ts.TypeReference)[0]
      // An array of objects is offered as its element: what a reader needs inside `place: [{…}]`
      // is the keys of one place, and the array itself has no keys of its own to complete.
      return { ...field, type: "array", ...(element && this.isObject(element) ? { fields: this.nestedFieldsOf(element) } : {}) }
    }
    if (this.isObject(single)) {
      return { ...field, type: "object", fields: this.nestedFieldsOf(single) }
    }
    return field
  }

  /** An index-signature-only type (Record<string, …>) has no properties to name, so it is left as
   * a plain object rather than described as an empty one — which would read as "nothing goes
   * here" in the editor, the opposite of the truth. */
  private isObject(type: ts.Type): boolean {
    return (type.flags & ts.TypeFlags.Object) !== 0 && this.checker.getPropertiesOfType(type).length > 0
  }

  private nestedFieldsOf(type: ts.Type): Record<string, SchemaField> {
    if (this.open.has(type)) {
      return {}
    }
    this.open.add(type)
    const fields = this.fieldsOf(type)
    this.open.delete(type)
    return fields
  }

  /** The first sentence of the doc comment, flattened. The comments in this project are long by
   * design — they carry the reasoning — and a completion popup is not where that is read. */
  private docOf(property: ts.Symbol): string | undefined {
    const text = ts.displayPartsToString(property.getDocumentationComment(this.checker)).replace(/\s+/g, " ").trim()
    if (text === "") {
      return undefined
    }
    const stop = text.search(/\.(\s|$)/)
    return stop === -1 ? text : text.slice(0, stop + 1)
  }
}

const scriptDir = path.dirname(fileURLToPath(import.meta.url))
const root = path.join(scriptDir, "..")
const program = ts.createProgram([path.join(root, "src", "engine", "persistence", "sightingJson.ts")], {
  target: ts.ScriptTarget.ES2022,
  module: ts.ModuleKind.ESNext,
  moduleResolution: ts.ModuleResolutionKind.Bundler,
  strict: true,
  skipLibCheck: true,
  noEmit: true
})
const builder = new SchemaBuilder(program)
const schema = builder.fieldsOf(builder.typeNamed("SightingRecordingJson"))

const outDir = path.join(root, "site", "generated")
mkdirSync(outDir, { recursive: true })
const outPath = path.join(outDir, "sightingSchema.json")
writeFileSync(outPath, `${JSON.stringify(schema, null, 2)}\n`)

const count = (fields: Record<string, SchemaField>): number =>
  Object.values(fields).reduce((total, field) => total + 1 + (field.fields ? count(field.fields) : 0), 0)
console.log(`${path.relative(root, outPath)}: ${count(schema)} keys, ${Object.keys(schema).length} at the top level`)
