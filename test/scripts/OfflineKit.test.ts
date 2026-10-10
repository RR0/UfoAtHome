import { mkdtemp, writeFile } from "node:fs/promises"
import { tmpdir } from "node:os"
import { join } from "node:path"
import { describe, expect, it } from "vitest"
import { OfflineKit } from "../../site/OfflineKit.js"

describe("OfflineKit", () => {

  const kit = new OfflineKit()

  it("describes an app that opens on the home page, in its own window", () => {
    const manifest = JSON.parse(kit.manifest())
    expect(manifest).toMatchObject({start_url: "/", scope: "/", display: "standalone"})
    expect(manifest.icons.map((icon: { sizes: string }) => icon.sizes)).toEqual(["192x192", "512x512"])
  })

  it("follows the static imports of a module all the way down, and not the ones it loads later", async () => {
    const dir = await mkdtemp(join(tmpdir(), "offline-kit-"))
    await writeFile(join(dir, "entry.mjs"), `import{a}from"./a.js";import"./side.js";const lazy=()=>import("./lazy.js");export{a}`)
    await writeFile(join(dir, "a.js"), `export const a=1;import { b } from './b.js'`)
    await writeFile(join(dir, "b.js"), `export const b=2`)
    await writeFile(join(dir, "side.js"), ``)
    await writeFile(join(dir, "lazy.js"), `import"./never.js"`)
    expect((await kit.staticClosure(dir, "entry.mjs")).sort()).toEqual(["a.js", "b.js", "entry.mjs", "side.js"])
  })

  it("survives a module that imports itself", async () => {
    const dir = await mkdtemp(join(tmpdir(), "offline-kit-"))
    await writeFile(join(dir, "loop.js"), `import"./loop.js"`)
    expect(await kit.staticClosure(dir, "loop.js")).toEqual(["loop.js"])
  })

  it("keeps the heavy data out of an installation", () => {
    const list = kit.precache(["/", "/play/"], ["rr0-sighting.mjs"], "1.2.3")
    expect(list).toContain("/lib/1.2.3/rr0-sighting.mjs")
    expect(list.filter(path => /tle|models|light-pollution|demo-data/.test(path))).toEqual([])
  })

  it("gives the same build the same identity, and a changed one another", () => {
    expect(kit.buildId(["a", "b"])).toBe(kit.buildId(["a", "b"]))
    expect(kit.buildId(["a", "b"])).not.toBe(kit.buildId(["a", "c"]))
  })

  it("fills both placeholders of the worker", async () => {
    const worker = await kit.worker("/* __BUILD__ */ const list = __PRECACHE__", ["/x"], "abc")
    expect(worker).toContain("abc")
    expect(worker).toContain(`"/x"`)
    expect(worker).not.toContain("__")
  })
})
