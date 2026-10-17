import { describe, expect, it } from "vitest"
import { ScenePoster } from "../../src/component/ScenePoster.js"

describe("ScenePoster", () => {
  function make(): { poster: ScenePoster, image: HTMLImageElement, changes: number[] } {
    const image = document.createElement("img")
    image.hidden = true
    const changes: number[] = []
    const poster = new ScenePoster(image, () => changes.push(1))
    return { poster, image, changes }
  }

  it("stands at once over a picture relative to the file stating it", () => {
    const { poster, image, changes } = make()
    poster.show("cover.jpg", "https://example.test/cases/a/sighting.json")
    expect(poster.up).toBe(true)
    expect(image.hidden).toBe(false)
    expect(image.src).toBe("https://example.test/cases/a/cover.jpg")
    expect(changes).toHaveLength(1)
  })

  it("reads an RR0 path from the site root", () => {
    const { poster, image } = make()
    poster.show("/time/1/9/6/5/cover.jpg", "https://rr0.org/time/1/9/6/5/case.json")
    expect(image.src).toBe("https://rr0.org/time/1/9/6/5/cover.jpg")
  })

  it("does not announce a change when a picture replaces another", () => {
    const { poster, changes } = make()
    poster.show("a.jpg", "https://example.test/x.json")
    poster.show("b.jpg", "https://example.test/x.json")
    expect(changes).toHaveLength(1)
  })

  it("is not up without a picture, or for an address that is no web picture", () => {
    const { poster, changes } = make()
    poster.show(undefined)
    poster.show("   ")
    poster.show("javascript:alert(1)")
    expect(poster.up).toBe(false)
    expect(changes).toHaveLength(0)
  })

  it("goes when released, and once", () => {
    const { poster, image, changes } = make()
    poster.show("a.jpg", "https://example.test/x.json")
    poster.release()
    poster.release()
    expect(poster.up).toBe(false)
    expect(image.hidden).toBe(true)
    expect(changes).toHaveLength(2)
  })

  it("gives way when the picture cannot be read", () => {
    const { poster, image } = make()
    poster.show("a.jpg", "https://example.test/x.json")
    image.dispatchEvent(new Event("error"))
    expect(poster.up).toBe(false)
  })

  it("goes when a recording without a picture is shown after one with", () => {
    const { poster } = make()
    poster.show("a.jpg", "https://example.test/x.json")
    poster.show(undefined)
    expect(poster.up).toBe(false)
  })
})
