import { Messages } from "../../i18n/MessageCatalog.js"

/** What the kit for a video generator says to its reader (see GenerativeKit), in their language. */
export interface GenerativeKitMessages {
  /** The name of the kit's instructions file, extension included. */
  readmeFile: string
  /**
   * The kit's instructions, as Markdown: {title} of the observation, {source} its address, {date} the kit was made, {fps} and {duration}
   * (seconds) of the reference video, {near} and {far} metres the depth spans, {margin} pixels the phenomenon's mask is grown by, {label}
   * to burn into the generated video.
   */
  readme: string
  /** What is burned into every frame of a generated video: what it is. */
  label: string
}

export const generativeKitMessages = Messages.catalog<GenerativeKitMessages>({
  en: () => import("./GenerativeKitMessages_en.js").then(module => module.generativeKitMessages_en),
  fr: () => import("./GenerativeKitMessages_fr.js").then(module => module.generativeKitMessages_fr),
  es: () => import("./GenerativeKitMessages_es.js").then(module => module.generativeKitMessages_es),
  it: () => import("./GenerativeKitMessages_it.js").then(module => module.generativeKitMessages_it)
})
