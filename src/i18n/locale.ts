/**
 * Picks the first of `preferences` (typically `navigator.languages`) whose base language tag
 * (before any `-region` suffix, e.g. "fr" from "fr-FR") is in `supported`, falling back to "en"
 * when none match — see https://javarome.medium.com/vanilla-programming-internationalization-7f07443a951a,
 * the pattern this follows across RR0's vanilla (no-framework) components.
 */
export function selectLocale(preferences: readonly string[], supported: readonly string[]): string {
  for (const tag of preferences) {
    const language = tag.toLowerCase().split("-")[0]
    if (supported.includes(language)) return language
  }
  return "en"
}
