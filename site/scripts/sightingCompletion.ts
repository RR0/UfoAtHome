import { syntaxTree } from "@codemirror/language"
import type { CompletionContext, CompletionResult, Completion } from "@codemirror/autocomplete"
import type { SyntaxNode } from "@lezer/common"
import schema from "../generated/sightingSchema.json"

/** One key of the format, as scripts/build-sighting-schema.ts writes it out of the TypeScript. */
interface SchemaField {
  doc?: string
  type: string
  values?: string[]
  fields?: Record<string, SchemaField>
}

/**
 * What the Player page's JSON editor offers as a recording is typed into it.
 *
 * The schema it reads is generated from `SightingRecordingJson` itself (see the build script), so
 * this knows every key the format has, which of them may hold only certain words, and what the
 * model's own doc comment says about each — which is the part that makes the editor a way to LEARN
 * the format rather than only a way to type one you already know.
 *
 * Two questions decide everything below: where in the document the cursor is, and whether it is
 * standing where a key goes or where a value goes.
 */
export class SightingCompletion {

  private static readonly FIELDS = schema as Record<string, SchemaField>

  /** Fields of the object at `path`, or undefined when the path leads nowhere the format knows —
   * a misspelt key, or one of the Record-typed objects whose keys are the author's own. */
  private fieldsAt(path: string[]): Record<string, SchemaField> | undefined {
    let fields: Record<string, SchemaField> | undefined = SightingCompletion.FIELDS
    for (const step of path) {
      const field: SchemaField | undefined = fields?.[step]
      fields = field?.fields
    }
    return fields
  }

  /** The keys of every Property this node is inside, outermost first. An Array contributes
   * nothing: the schema stores an array's element fields on the array itself, so `place` names
   * the same thing whether one place is written or four. */
  private pathTo(node: SyntaxNode | null, text: string): string[] {
    const path: string[] = []
    for (let step = node; step; step = step.parent) {
      if (step.name === "Property") {
        const name = step.getChild("PropertyName")
        if (name) {
          path.unshift(text.slice(name.from, name.to).replace(/^"|"$/g, ""))
        }
      }
    }
    return path
  }

  private keyCompletions(fields: Record<string, SchemaField>): Completion[] {
    return Object.entries(fields).map(([name, field]) => ({
      label: `"${name}"`,
      // The word alone would leave the reader to type the colon and the quotes; a key is never
      // wanted without them.
      apply: `"${name}": `,
      type: field.type === "enum" ? "enum" : field.type === "object" || field.type === "array" ? "class" : "property",
      detail: field.type === "enum" ? field.values?.join(" | ") : field.type,
      ...(field.doc === undefined ? {} : { info: field.doc })
    }))
  }

  private valueCompletions(field: SchemaField): Completion[] {
    return (field.values ?? []).map(value => ({ label: `"${value}"`, apply: `"${value}"`, type: "enum" }))
  }

  get source(): (context: CompletionContext) => CompletionResult | null {
    return context => {
      const text = context.state.doc.toString()
      const node = syntaxTree(context.state).resolveInner(context.pos, -1)
      // The one thing the tree cannot say. A caret in the gap after a colon resolves to whatever
      // encloses it — the Property when it has no value yet, the Object when the last property is
      // complete — and neither name distinguishes "a value goes here" from "another key does".
      // The colon behind the caret does.
      const before = text.slice(0, context.pos)

      // A key being typed: replace the whole token, quotes included, so completing over a
      // half-written "wit" leaves "witness" and not "wit"witness".
      if (node.name === "PropertyName") {
        return this.keys(this.pathTo(node.parent?.parent ?? null, text), node.from, node.to)
      }
      // A value already written as a string. Only a fixed set of words is ever worth offering, so
      // anything but an enum declines rather than guessing at prose.
      if (node.name === "String" && node.parent?.name === "Property") {
        return this.values(this.fieldAt(this.pathTo(node.parent, text)), node.from, node.to)
      }
      if (/:\s*$/.test(before)) {
        const property = node.name === "Property" ? node : this.propertyBefore(node, context.pos)
        return this.values(property ? this.fieldAt(this.pathTo(property, text)) : undefined, context.pos)
      }
      // Anywhere else in an object, the next key goes. Unasked, only where one obviously follows:
      // just inside a brace or after a comma. A popup over the middle of a line nobody asked about
      // is in the way.
      if (!context.explicit && !/[{,[]\s*$/.test(before)) {
        return null
      }
      const object = node.name === "Object" ? node : node.parent?.name === "Object" ? node.parent : node
      return this.keys(this.pathTo(object, text), context.pos)
    }
  }

  private keys(path: string[], from: number, to?: number): CompletionResult | null {
    const fields = this.fieldsAt(path)
    return fields === undefined
      ? null
      : { from, ...(to === undefined ? {} : { to }), options: this.keyCompletions(fields), validFor: SightingCompletion.WORD }
  }

  private values(field: SchemaField | undefined, from: number, to?: number): CompletionResult | null {
    return field?.values === undefined
      ? null
      : { from, ...(to === undefined ? {} : { to }), options: this.valueCompletions(field), validFor: SightingCompletion.WORD }
  }

  /** What CodeMirror may go on filtering against without asking again: the word being typed, with
   * or without the quotes around it. */
  private static readonly WORD = /^"?[\w-]*"?$/

  /** The field a path names, as against the fields it contains. */
  private fieldAt(path: string[]): SchemaField | undefined {
    const parent = this.fieldsAt(path.slice(0, -1))
    return parent?.[path[path.length - 1]]
  }

  /** The Property whose colon the cursor is sitting after: the last one to start before it. */
  private propertyBefore(node: SyntaxNode, pos: number): SyntaxNode | undefined {
    let found: SyntaxNode | undefined
    for (let child = node.firstChild; child; child = child.nextSibling) {
      if (child.name === "Property" && child.from < pos) {
        found = child
      }
    }
    return found
  }
}
