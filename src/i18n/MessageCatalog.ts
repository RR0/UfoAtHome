/** The languages UFO@home's interface is written in. */
export const UFO_LANGUAGES = ["en", "fr", "es", "it"] as const
export type UfoInterfaceLanguage = (typeof UFO_LANGUAGES)[number]

/**
 * The texts of one part of the interface (a component, a kind of event, a set of parameters), one module per language, loaded only for the
 * language asked: a French reader never downloads the English.
 *
 * The one way this project gives an interface its words. Whatever shows text to a reader takes a catalog (see SkyEventKind.messages,
 * ParameterSet, the editors' constructors) rather than words written inline, however few: the day it needs one more, nothing has to be
 * decided. `T` is the interface of the texts, and each language's module is checked against it (`satisfies T`): a language that lacks a
 * text does not compile.
 */
export interface MessageCatalog<T> {
  /** The texts in `language` (a tag such as "fr" or "fr-CA"), or in English when the interface is not written in it. Loaded once. */
  load(language: string): Promise<T>
}

/** Builds catalogs, and says which interface language a reader gets. */
export class Messages {
  /**
   * A catalog from one loader per language, each a dynamic `import()` of that language's module, so that the bundler makes it a chunk of
   * its own: `Messages.catalog<BeamEditorMessages>({ en: () => import("./BeamEditorMessages_en.js").then(m => m.beamEditorMessages_en), … })`.
   */
  static catalog<T>(loaders: Readonly<Record<UfoInterfaceLanguage, () => Promise<T>>>): MessageCatalog<T> {
    const loaded = new Map<UfoInterfaceLanguage, Promise<T>>()
    return {
      load(language: string): Promise<T> {
        const supported = Messages.languageOf(language)
        let texts = loaded.get(supported)
        if (!texts) {
          texts = loaders[supported]()
          loaded.set(supported, texts)
          // A chunk that failed (a page offline, a deployment replaced under it) is asked again next time rather than failing for good.
          texts.catch(() => loaded.delete(supported))
        }
        return texts
      }
    }
  }

  /**
   * What stands for flat texts that have not come yet: every one of them empty. For an interface built before its words arrive and filled
   * in by them (see CloudEditorTemplate), never for words to show.
   */
  static none<T extends object>(): T {
    return new Proxy({}, { get: () => "" }) as T
  }

  /**
   * What stands for texts of any depth that have not come yet (objects of texts, lists, texts with placeholders): every text in them
   * empty, every object or list in them blank too, so that an interface built before its words arrive draws nothing rather than failing.
   * For a component that redraws all it shows once its words have come (see SightingEditorElement.applyMessages, and the audits of
   * test/i18n that check it does), never for words to show. Unlike `none`, a blank text is no string: compare nothing to it.
   */
  static blank<T extends object>(): T {
    const blank: object = new Proxy(() => blank, {
      get: (_, key) => key === Symbol.toPrimitive ? () => ""
        : key === Symbol.iterator ? function* () {}
          : key === "toString" || key === "valueOf" ? () => ""
            : key === "then" ? undefined
              : blank,
      apply: () => blank,
      has: () => false,
      ownKeys: () => [],
      getOwnPropertyDescriptor: () => undefined
    })
    return blank as T
  }

  /** The interface language for a language tag: its base ("fr" of "fr-CA") when the interface is written in it, English otherwise. */
  static languageOf(language: string): UfoInterfaceLanguage {
    const base = language.toLowerCase().split("-")[0]
    return (UFO_LANGUAGES as readonly string[]).includes(base) ? base as UfoInterfaceLanguage : "en"
  }
}
