import { REENTRY_TYPE_SOURCES } from "./reentryTypeSources.js"
import type { ReentryType } from "./ReentryType.js"
import type { DataSource } from "../../../../engine/source/DataSource.js"

/** The types of re-entry of the registry (see ReentryType), and their names once loaded in a language. */
export class ReentryTypes {
  private static readonly built = new WeakMap<DataSource<ReentryType>, ReentryType>()
  /** The names last loaded, by type key (see load): what a list of choices, which is not awaited, shows. */
  private static names = new Map<string, string>()
  private static namesLanguage?: string

  /** Every type, in the registry's order: the built-in ones, then the modules'. */
  static all(): ReentryType[] {
    return REENTRY_TYPE_SOURCES.map(source => {
      let type = ReentryTypes.built.get(source)
      if (!type) ReentryTypes.built.set(source, type = source.create())
      return type
    })
  }

  static of(key: string | undefined): ReentryType | undefined {
    return key === undefined ? undefined : ReentryTypes.all().find(type => type.key === key)
  }

  /** Loads every type's name in `language`, kept for `nameOf`. */
  static async load(language: string): Promise<void> {
    const types = ReentryTypes.all()
    const names = await Promise.all(types.map(type => type.messages.load(language).then(texts => texts.name, () => type.key)))
    ReentryTypes.names = new Map(types.map((type, i) => [type.key, names[i]]))
    ReentryTypes.namesLanguage = language
  }

  /** A type's name in the language last loaded; its key when none was, or when it is not a type of the registry. */
  static nameOf(key: string): string {
    return ReentryTypes.names.get(key) ?? key
  }

  /** The language the names are in now. */
  static get language(): string | undefined {
    return ReentryTypes.namesLanguage
  }
}
