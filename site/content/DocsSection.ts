import type { PageMeta, Said, SiteLanguage, SitePage } from "../SitePage.js"

/**
 * One page of the documentation, under the hub at `/docs/`.
 *
 * The documentation used to be a single page, and the trouble with it was not its length but that
 * length was the only way through it: someone who had a recording and wanted a link to send had to
 * scroll past the component bundles and the whole recording format to find two sentences. These
 * are split by the QUESTION being asked rather than by subject matter, which is why "share a link"
 * and "put it on a page" are separate pages although both are two lines long — they are asked by
 * different people on different days.
 *
 * The shared parts are here: the way back to the hub, and the hero every one of them opens with.
 */
export abstract class DocsSection implements SitePage {

  abstract readonly meta: PageMeta

  abstract render(language: SiteLanguage): string

  /**
   * One component's section in the technical part of the page about what it edits: its tag, what it is for, how it is put in a page, and what it
   * takes and says, one row per member. The tags the site documents more fully (the observation's) have their own writing; this is for the
   * smaller ones.
   */
  protected componentSection(
    language: SiteLanguage, tag: string, lede: Said<string>, example: string, note: Said<string>,
    rows: ReadonlyArray<readonly [string, "attribute" | "property" | "method" | "event", Said<string>]>
  ): string {
    const kinds: Said<Record<"attribute" | "property" | "method" | "event", string>> = {
      en: { attribute: "attribute", property: "property", method: "method", event: "event" },
      fr: { attribute: "attribut", property: "propriété", method: "méthode", event: "événement" },
      es: { attribute: "atributo", property: "propiedad", method: "método", event: "evento" },
      it: { attribute: "attributo", property: "proprietà", method: "metodo", event: "evento" }
    }
    const columns: Said<[string, string, string]> = {
      en: ["Member", "Kind", "What it does"], fr: ["Membre", "Genre", "Ce qu'il fait"], es: ["Miembro", "Tipo", "Qué hace"], it: ["Membro", "Tipo", "Cosa fa"]
    }
    const escape = (text: string): string => text.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;")
    return `
    <h3 id="${tag}"><code>&lt;${tag}&gt;</code></h3>
    <p>${lede[language]}</p>
    <pre><code>${escape(example)}</code></pre>
    <p>${note[language]}</p>
    <div class="table-scroll"><table>
      <tr>${columns[language].map(column => `<th>${column}</th>`).join("")}</tr>
      ${rows.map(([member, kind, text]) => `<tr><td><code>${member}</code></td><td>${kinds[language][kind]}</td><td>${text[language]}</td></tr>`).join("\n      ")}
    </table></div>`
  }

  /** The way back up, which is the page this one was reached from — the documentation hub for
   * most, the components hub for a component's own page. The top navigation names only the
   * documentation hub, so without this a reader has nothing but the browser's own Back. */
  protected hero(
    language: SiteLanguage, title: Said<string>, lede: Said<string>,
    crumb: { href: string, label: Said<string> } = { href: "/docs/", label: { en: "Documentation", fr: "Documentation", es: "Documentación", it: "Documentazione" } }
  ): string {
    // Escaped: a component's page is titled `<rr0-scene>`, which a browser reads as a tag if it is
    // put in the heading raw — see Layout.text.
    const heading = title[language].replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;")
    const back = crumb.label[language]
    return `
<section class="band hero">
  <div class="wrap">
    <p class="eyebrow"><a class="crumb" href="${crumb.href}">← ${back}</a></p>
    <h1>${heading}</h1>
    <p class="lede">${lede[language]}</p>
  </div>
</section>`
  }

  /**
   * Shows every JSON excerpt on the page — the whole example and each fragment — in the site's code
   * view: coloured, numbered, foldable, and checked. Read-only, because nothing here plays what
   * would be typed (the Player is where a recording is changed and seen at once), but each still
   * lists, on demand, every key that could go where the caret stands.
   *
   * The <pre> stays until CodeMirror arrives and stays for good if it never does, so a reader
   * without it still has the excerpts.
   */
  protected excerptsScript(): string {
    return `const excerpts = [...document.querySelectorAll("pre[data-json], pre[data-schema]")]
if (excerpts.length > 0) {
  void (async () => {
    try {
      const { JsonEditor } = await import(SITE_LIB + "/site-json-editor.mjs")
      // One module for them all: once it is in, each further excerpt is an editor for nothing.
      for (const pre of excerpts) {
        const mount = document.createElement("div")
        mount.className = "code-view"
        pre.after(mount)
        // Where in a recording the excerpt stands, for what its completion lists; "none" for JSON that
        // is not a recording. data-schema names the format the excerpt is in: a case's or an interview's, when it is not a recording's. Read-only: nothing on this page plays what would be typed (see JsonEditor).
        const at = pre.dataset.json
        new JsonEditor(mount, pre.textContent.trimEnd(), { at: at === "none" ? null : at ? at.split(".") : [], readOnly: true, schema: pre.dataset.schema || "sighting" })
        pre.hidden = true
      }
    } catch {
      /* No editor, then. The listings are still there and still say the same thing. */
    }
  })()
}`
  }

  /** What to say once above the first excerpt of a page whose excerpts know their format: read-only, and the caret asks for the keys. */
  protected excerptNote(language: SiteLanguage): string {
    return ({
      en: "Every excerpt below is read-only, and each knows the format: put the caret inside an object and press <kbd>Ctrl</kbd>+<kbd>Space</kbd> (<kbd>⌥</kbd>+<kbd>I</kbd> on a Mac) to list every key that could go there, with what the model says of each.",
      fr: "Chaque extrait ci-dessous est en lecture seule, et chacun connaît le format : placez le curseur dans un objet et faites <kbd>Ctrl</kbd>+<kbd>Espace</kbd> (<kbd>⌥</kbd>+<kbd>I</kbd> sur Mac) pour lister toutes les clés qui pourraient y figurer, avec ce que le modèle dit de chacune.",
      es: "Cada extracto de abajo es de solo lectura, y cada uno conoce el formato: pon el cursor dentro de un objeto y pulsa <kbd>Ctrl</kbd>+<kbd>Espacio</kbd> (<kbd>⌥</kbd>+<kbd>I</kbd> en Mac) para listar todas las claves que podrían ir ahí, con lo que el modelo dice de cada una.",
      it: "Ogni estratto qui sotto è in sola lettura, e ognuno conosce il formato: metti il cursore dentro un oggetto e premi <kbd>Ctrl</kbd>+<kbd>Spazio</kbd> (<kbd>⌥</kbd>+<kbd>I</kbd> su Mac) per elencare tutte le chiavi che potrebbero andarci, con ciò che il modello dice di ciascuna."
    } satisfies Said<string>)[language]
  }
}