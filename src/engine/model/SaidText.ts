/**
 * Text an author wrote into a recording — a description, a shape's name, a milestone — held either
 * as one string or as one string per language tag.
 *
 * A recording is passed between readers the way a link is (see the site's Layout for the same rule
 * on addresses): a French investigator publishes a case, an English one opens it, and the file has
 * to be able to speak to both. Which the format could not do at all — every one of these fields was
 * a single string, and the demo recordings are almost entirely French, so an English reader got an
 * English interface around "Zamora entend un rugissement". The site worked around it by carrying
 * its own translations of the same sentences, which is the duplication a format should make
 * unnecessary.
 *
 * A bare string stays valid and means "in whatever language it was written in" — every recording
 * ever made is one, and there is no migration. The map form states the language:
 *
 *     "description": { "fr": "Tout le témoignage de Lonnie Zamora…", "en": "Lonnie Zamora's…" }
 *
 * Keys are language tags as `navigator.languages` gives them ("fr", "en", "pt-BR"), and no set of
 * them is required: a file that has only French is a file that has only French, and a reader whose
 * languages are none of the ones present reads what is there rather than nothing.
 *
 * What is NOT in here: the witness's name and the case id (proper nouns and identifiers), and the
 * tags, which are stored in English as the technical terms they are and named by the components'
 * own messages (see SightingTags).
 */
export type SaidText = string | Readonly<Record<string, string>>

/**
 * Reads and writes `SaidText` for one reader.
 *
 * Built once per element, from `HostLocale.preferencesFor(element)`, and asked for each field —
 * rather than each caller passing the same preference list to a function every time, which is the
 * same reason every other reader-facing lookup in this codebase holds its language.
 *
 * The preferences are the reader's WHOLE list, not the two languages the interface is translated
 * into: a recording may carry Spanish, and a Spanish reader should get it even though the buttons
 * around it are in English.
 */
export class SaidTexts {

  constructor(private readonly preferences: readonly string[]) {
  }

  /**
   * What this reader reads: their best language, else — deliberately — whatever the recording does
   * have, in the order it was written.
   *
   * Falling back to another language rather than to nothing is the whole point. A missing
   * translation must never turn a stated fact into an unstated one: an English reader in front of
   * a French-only account is a reader who can copy it into a translator, while an empty field
   * tells them the witness said nothing.
   */
  read(text: SaidText | undefined): string | undefined {
    if (text === undefined || typeof text === "string") {
      return text === "" ? undefined : text
    }
    for (const preference of this.preferences) {
      const said = text[preference] ?? text[SaidTexts.base(preference)]
      if (said) {
        return said
      }
    }
    // A regional key ("pt-BR") for a reader who asked for the base tag ("pt"), and then simply the
    // first thing there is.
    const base = new Set(this.preferences.map(preference => SaidTexts.base(preference)))
    for (const [tag, said] of Object.entries(text)) {
      if (said && base.has(SaidTexts.base(tag))) {
        return said
      }
    }
    return Object.values(text).find(said => said) ?? undefined
  }

  /**
   * `text` with what this reader just typed put back where they read it from.
   *
   * A map keeps its other languages: an editor open in French must not silently delete the English
   * an author wrote last week, and it cannot translate what it was just given either. A bare
   * string is replaced by a bare string — it is the only text there is, and it is exactly what the
   * editor was showing.
   *
   * `language` is the editor's own, which is the language its user is writing in.
   */
  write(text: SaidText | undefined, written: string | undefined, language: string): SaidText | undefined {
    const value = written?.trim() ? written.trim() : undefined
    if (text === undefined || typeof text === "string") {
      return value
    }
    const said: Record<string, string> = { ...text }
    // The key that was READ is the key that is written, so editing a "pt-BR" entry does not leave
    // it behind next to a new "pt" one.
    const key = Object.keys(said).find(tag => tag === language)
      ?? Object.keys(said).find(tag => SaidTexts.base(tag) === SaidTexts.base(language))
      ?? language
    if (value === undefined) {
      delete said[key]
    } else {
      said[key] = value
    }
    // Down to one language it stays a map, rather than collapsing to a bare string: `{"fr": …}`
    // says which language that is, and a bare string is precisely the statement that nobody knows.
    return Object.keys(said).length === 0 ? undefined : said
  }

  private static base(tag: string): string {
    return tag.toLowerCase().split("-")[0]
  }
}
