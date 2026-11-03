/**
 * Text an author wrote into a recording (a description, a shape's name, a milestone), held either as one string or as one string per
 * language tag: RR0's own SaidText (see @rr0/data), which a recording shares with rr0.org's data, and its reader.
 *
 * What is NOT a SaidText in a recording: the case id and the tags, which are stored in English as the technical terms they are and named
 * by the components' own messages (see SightingTags).
 */
export { type SaidText, SaidTexts } from "@rr0/data"
