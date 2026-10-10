import { ensureSyntaxTree } from "@codemirror/language"
import type { EditorState } from "@codemirror/state"
import type { SyntaxNode } from "@lezer/common"

/** A place in a JSON document: the keys and indexes from its root down. */
export type JsonPath = ReadonlyArray<string | number>

/**
 * Where a place of a JSON text is, and what is at a place: the two ways the File group's editor and the
 * picture talk to each other (put the caret in the text of a decor object and it is selected on the picture;
 * select it on the picture and its text is shown).
 *
 * Read off the syntax tree the editor already keeps for its colours and its folding, so it follows the text as
 * it is typed, mistakes and all: a text that does not parse still has a place under the caret, as far as it
 * parses.
 */
export class JsonPaths {
  /** The path of what is under `position`: `["decor", 3, "eastM"]` for the east of the fourth decor object. */
  static at(state: EditorState, position: number): JsonPath {
    const tree = ensureSyntaxTree(state, state.doc.length, 50)
    if (tree === null) return []
    const path: Array<string | number> = []
    let child: SyntaxNode | null = null
    for (let node: SyntaxNode | null = tree.resolveInner(position, -1); node !== null; child = node, node = node.parent) {
      if (node.name === "Property") {
        const name = node.getChild("PropertyName")
        if (name !== null) path.unshift(JSON.parse(state.sliceDoc(name.from, name.to)) as string)
      } else if (node.name === "Array" && child !== null) {
        path.unshift(JsonPaths.indexOf(node, child))
      }
    }
    return path
  }

  /** The range of what is at `path` — a property from its key to the end of its value, an array's element
   * whole — or undefined when the text has nothing there. */
  static range(state: EditorState, path: JsonPath): { from: number, to: number } | undefined {
    const tree = ensureSyntaxTree(state, state.doc.length, 50)
    if (tree === null) return undefined
    let node: SyntaxNode | null = tree.topNode.firstChild
    let range: { from: number, to: number } | undefined
    for (const step of path) {
      if (node === null) return undefined
      if (typeof step === "number") {
        if (node.name !== "Array") return undefined
        const elements = JsonPaths.elements(node)
        node = elements[step] ?? null
        if (node === null) return undefined
        range = { from: node.from, to: node.to }
      } else {
        if (node.name !== "Object") return undefined
        let found: SyntaxNode | null = null
        for (let property = node.firstChild; property !== null; property = property.nextSibling) {
          if (property.name !== "Property") continue
          const name = property.getChild("PropertyName")
          if (name !== null && JSON.parse(state.sliceDoc(name.from, name.to)) === step) {
            found = property
            break
          }
        }
        if (found === null) return undefined
        range = { from: found.from, to: found.to }
        node = found.lastChild
      }
    }
    return range
  }

  /** The values of an array, leaving out its brackets, commas and comments. */
  private static elements(array: SyntaxNode): SyntaxNode[] {
    const elements: SyntaxNode[] = []
    for (let element = array.firstChild; element !== null; element = element.nextSibling) {
      if (!["[", "]", ",", "LineComment", "BlockComment"].includes(element.name)) elements.push(element)
    }
    return elements
  }

  private static indexOf(array: SyntaxNode, element: SyntaxNode): number {
    return JsonPaths.elements(array).findIndex(candidate => candidate.from === element.from && candidate.to === element.to)
  }
}
