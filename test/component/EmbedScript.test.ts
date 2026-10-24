import { describe, expect, it } from "vitest"
import { EmbedScript } from "../../src/component/EmbedScript.js"

describe("EmbedScript", () => {
  it("gives the current component without the version directory the site's own pages load it from", () => {
    expect(EmbedScript.current("rr0-sighting", "https://ufoathome.org/lib/0.134.0/rr0-sighting.mjs", "https://ufoathome.org"))
      .toBe("https://ufoathome.org/lib/rr0-sighting.mjs")
  })

  it("points back at the copy it runs from", () => {
    expect(EmbedScript.current("rr0-sighting-editor", "http://localhost:3003/lib/rr0-sighting.mjs", "http://localhost:3003"))
      .toBe("http://localhost:3003/lib/rr0-sighting-editor.mjs")
  })

  it("gives the site's current component when it runs from a frozen copy", () => {
    expect(EmbedScript.current("rr0-sighting", EmbedScript.frozen("rr0-sighting", "0.134.0"), "https://ufoathome.org"))
      .toBe("https://ufoathome.org/lib/rr0-sighting.mjs")
  })

  it("freezes a version as published on npm", () => {
    expect(EmbedScript.frozen("rr0-sighting", "0.134.0"))
      .toBe("https://cdn.jsdelivr.net/npm/@rr0/ufoathome@0.134.0/dist-embed-sighting/rr0-sighting.mjs")
    expect(EmbedScript.frozen("rr0-sighting-editor", "0.134.0"))
      .toBe("https://cdn.jsdelivr.net/npm/@rr0/ufoathome@0.134.0/dist-embed-sighting-editor/rr0-sighting-editor.mjs")
  })
})
