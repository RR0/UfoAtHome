import type { SceneElement } from "./SceneElement.js"

/**
 * The thunder recording every scene carries, bundled whether or not a storm is drawn — see
 * CREDITS.md.
 */
const THUNDER_CREDIT_TEXT = "“Thunder” by Jerimee"
const THUNDER_CREDIT_LICENSE_URL = "https://creativecommons.org/licenses/by/3.0/"
const THUNDER_CREDIT_LICENSE = "CC BY 3.0"

/**
 * Every credit a scene owes for what it is showing, as a list — the one place it is written, read
 * by `<rr0-sighting>`'s info panel and by the panel a bare `<rr0-scene>` opens from its own button:
 * a licence is honoured by being shown, and one printed in small type over the observer's map was in
 * the way of the thing the map is for.
 */
export class SceneCredits {
  /** Empties `list` and fills it with the credits of what `scene` shows now. */
  static fill(list: HTMLElement, scene: SceneElement): void {
    list.innerHTML = ""
    const add = (item: HTMLLIElement) => list.appendChild(item)
    const terrainAttribution = scene.currentTerrainAttribution
    if (terrainAttribution) add(SceneCredits.text(terrainAttribution))
    // The roads, whose credit carries the warning as well as the licence: they are today's network,
    // and the account is of another day (see RoadProvider.contemporary).
    const roadAttribution = scene.currentRoadAttribution
    if (roadAttribution) add(SceneCredits.text(roadAttribution))
    // The observer map's own tiles, once a reader has opened it and they have arrived — the same
    // licence, owed for a second use of the same service. Skipped when the terrain's line already
    // carries those words: the ground patch and the map are normally drawn from the same provider,
    // and a credits list that says one thing twice reads as a bug rather than as diligence.
    const mapCredit = scene.ufoElement.observerMapCredit
    if (mapCredit && !terrainAttribution?.includes(mapCredit)) add(SceneCredits.text(mapCredit))
    // Every 3D model currently standing in the decor, each named with its author and licence — the
    // condition on which they are shown at all (see DecorModelRef.credit, and DataSource's own doc
    // comment on why a credit that isn't displayed isn't a licence).
    for (const credit of scene.decorModelCredits) {
      const author = credit.author ? ` — ${credit.author}` : ""
      const item = document.createElement("li")
      if (credit.sourceUrl) item.append(SceneCredits.link(credit.sourceUrl, credit.title), document.createTextNode(`${author} (${credit.license})`))
      else item.textContent = `${credit.title}${author} (${credit.license})`
      add(item)
    }
    // Every picture of the place the recording lays over the scene, credited on the terms it was
    // given on — see SceneReference.credit, and the same rule as the models above.
    for (const reference of scene.ufoElement.sighting.references) {
      if (!reference.credit) continue
      const item = document.createElement("li")
      if (reference.creditUrl) item.appendChild(SceneCredits.link(reference.creditUrl, reference.credit))
      else item.textContent = reference.credit
      add(item)
    }
    // The orbital elements the satellites in this sky were propagated from, once they have arrived:
    // an archive somebody kept for years so that exactly this could be done.
    const satellites = scene.satelliteState
    if (satellites.status === "ready" && satellites.credit) {
      const item = document.createElement("li")
      item.appendChild(SceneCredits.link(satellites.creditUrl ?? "", satellites.credit))
      add(item)
    }
    const thunder = SceneCredits.text(`${THUNDER_CREDIT_TEXT} (`)
    thunder.append(SceneCredits.link(THUNDER_CREDIT_LICENSE_URL, THUNDER_CREDIT_LICENSE), document.createTextNode(")"))
    add(thunder)
  }

  private static text(text: string): HTMLLIElement {
    const item = document.createElement("li")
    item.textContent = text
    return item
  }

  private static link(href: string, text: string): HTMLAnchorElement {
    const link = document.createElement("a")
    link.href = href
    link.target = "_blank"
    link.rel = "noopener"
    link.textContent = text
    return link
  }
}
