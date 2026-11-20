import { describe, expect, it } from "vitest"
import { RecentFiles } from "../../src/component/RecentFiles.js"

describe("RecentFiles", () => {
  it("lists nothing and keeps nothing, without failing, where the browser keeps nothing", async () => {
    // jsdom has no IndexedDB, as a browser that refuses storage has none to give.
    await expect(RecentFiles.add({ kind: "address", name: "case.json", openedAt: 1, url: "https://example.org/case.json" })).resolves.toBeUndefined()
    await expect(RecentFiles.list()).resolves.toEqual([])
  })

  it("gives the files of a copy back as they were opened, and none for an address, which is read there", async () => {
    const files = await RecentFiles.files({ kind: "copy", name: "case.json", openedAt: 1, copies: [{ name: "case.json", text: "{}" }, { name: "a.json", text: "[]" }] })
    const textOf = (file: File) => new Promise<string>(resolve => {
      const reader = new FileReader()
      reader.onload = () => resolve(reader.result as string)
      reader.readAsText(file)
    })
    expect(await Promise.all(files!.map(textOf))).toEqual(["{}", "[]"])
    expect(files!.map(file => file.name)).toEqual(["case.json", "a.json"])
    expect(await RecentFiles.files({ kind: "address", name: "case.json", openedAt: 1, url: "https://example.org/case.json" })).toBeUndefined()
  })
})
