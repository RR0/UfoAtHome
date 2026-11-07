/**
 * What tells whether every word a component shows comes from its messages: its English replaced by pseudo-words (`§` and the key's path),
 * and what it then shows read back. A text still readable as words did not come from the messages: it is written in the component, in no
 * language but the one it was written in.
 */
export class WordsAudit {
  /** `messages` with every text replaced by `§` and its path; numbers, booleans and functions kept. */
  static pseudo<T>(messages: T, path = ""): T {
    if (typeof messages === "string") return `§${path}` as T
    if (Array.isArray(messages)) return messages.map((item, index) => WordsAudit.pseudo(item, `${path}[${index}]`)) as T
    if (messages && typeof messages === "object") {
      return Object.fromEntries(Object.entries(messages).map(([key, value]) => [key, WordsAudit.pseudo(value, path ? `${path}.${key}` : key)])) as T
    }
    return messages
  }

  /** The texts under `root` (its shadow roots included) and the words of its attributes a reader is told, that came from no message. */
  static leftovers(root: Node, ignore: (text: string) => boolean = () => false): string[] {
    const found = new Set<string>()
    const words = (text: string | null | undefined): void => {
      const trimmed = text?.replace(/\s+/g, " ").trim()
      if (!trimmed || trimmed.includes("§") || !/[A-Za-z]{3,}/.test(trimmed) || ignore(trimmed)) return
      found.add(trimmed)
    }
    const visit = (node: Node): void => {
      if (node.nodeType === Node.TEXT_NODE) {
        const parent = node.parentElement
        if (!parent || !["STYLE", "SCRIPT", "TEMPLATE"].includes(parent.tagName)) words(node.textContent)
        return
      }
      if (node instanceof Element) {
        for (const attribute of ["title", "aria-label", "placeholder", "alt"]) words(node.getAttribute(attribute))
        if (node.shadowRoot) visit(node.shadowRoot)
        if (node instanceof HTMLTemplateElement) return
      }
      for (const child of node.childNodes) visit(child)
    }
    visit(root)
    return [...found]
  }
}
