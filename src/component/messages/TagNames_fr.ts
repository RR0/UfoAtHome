import type { TagNames } from "./TagNames.js"

/**
 * French names for the tags the recordings actually use — see TagNames for why the file holds the
 * English one.
 *
 * Not a controlled vocabulary and not meant to become one: it holds what has been needed, and
 * anything absent is shown as stored. Classification codes ("RR3", "NL") and case references
 * ("Blue Book 8729") are deliberately not here — they read the same in both languages, and
 * translating a code is how a code stops being one.
 */
export const tagNames_fr: TagNames = {
  landing: "atterrissage",
  trace: "trace",
  "aerial observation": "observation aérienne",
  "project sign": "Projet Sign",
  paralysis: "paralysie",
  contact: "contact",
  occupants: "occupants",
  "close encounter": "rencontre rapprochée",
  photograph: "photographie",
  radar: "radar",
  "electromagnetic effect": "effet électromagnétique"
}
