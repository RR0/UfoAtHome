import { describe, expect, it } from "vitest"
import { DemoCatalogue } from "../../site/content/DemoCatalogue.js"
import { DemoIndex } from "../../site/content/DemoIndex.js"

// Here and not beside DemosPage's: the index reads the recordings off disk, which the browser-typed
// tests of test/ are not checked for (see tsconfig).
describe("DemoIndex", () => {
  it("takes dates and tags from the recordings, and leaves no demo untagged", async () => {
    const index = await new DemoIndex(process.cwd(), new DemoCatalogue()).build()
    const entries = index.en
    expect(entries.find(entry => entry.id === "valensole")!.date).toBe("1965-07-01")
    expect(entries.find(entry => entry.id === "halos")!.tags).toContain("halo")
    expect(entries.filter(entry => entry.tags.length === 0).map(entry => entry.id)).toEqual([])
  })
})
