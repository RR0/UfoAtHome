/** The layout a kind of event's editor brings with it (see SkyEventKind.editor): the editor it stands in knows nothing of the kind. */
export class SkyEventEditorStyle {
  /** Marks `container` with `className`, and puts `css` beside it once, written for that class. */
  static attach(container: HTMLElement, className: string, css: string): void {
    container.classList.add(className)
    const marker = `${className}-style`
    if (container.parentElement?.querySelector(`:scope > style.${marker}`)) return
    const style = container.ownerDocument.createElement("style")
    style.className = marker
    style.textContent = css
    container.before(style)
  }
}
