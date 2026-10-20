import { describe, expect, it } from "vitest"
import { mkdtemp, readFile, writeFile } from "node:fs/promises"
import { tmpdir } from "node:os"
import { join } from "node:path"
import { ArchivedPlaces } from "../../scripts/ArchivedPlaces.js"

describe("ArchivedPlaces.stampVersions", () => {
  it("points each entry of an index at its file with the hash of what it holds, so that a file frozen again is fetched again", async () => {
    const dir = await mkdtemp(join(tmpdir(), "archive-"))
    await writeFile(join(dir, "a.json"), "{\"lines\":[]}")
    await writeFile(join(dir, "index.json"), JSON.stringify({ version: 1, entries: [{ file: "a.json", about: "a" }] }))
    await ArchivedPlaces.stampVersions(dir)
    const first = JSON.parse(await readFile(join(dir, "index.json"), "utf8")).entries[0].file as string
    expect(first).toMatch(/^a\.json\?v=[0-9a-f]{10}$/)
    // Stamped again unchanged, the same; with the file changed, another.
    await ArchivedPlaces.stampVersions(dir)
    expect(JSON.parse(await readFile(join(dir, "index.json"), "utf8")).entries[0].file).toBe(first)
    await writeFile(join(dir, "a.json"), "{\"lines\":[{\"name\":\"Ligne K\"}]}")
    await ArchivedPlaces.stampVersions(dir)
    const second = JSON.parse(await readFile(join(dir, "index.json"), "utf8")).entries[0].file as string
    expect(second).toMatch(/^a\.json\?v=/)
    expect(second).not.toBe(first)
  })
})
