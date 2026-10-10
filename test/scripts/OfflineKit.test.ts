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

  it("follows what a module names, static imports, later chunks and assets alike", async () => {
    const dir = await mkdtemp(join(tmpdir(), "offline-kit-"))
    await writeFile(join(dir, "entry.mjs"), `import{a}from"./a.js";const lazy=()=>import("./lazy-AbCd1234.js");new URL("stars-Zz9.bin",import.meta.url)`)
    await writeFile(join(dir, "a.js"), `import { b } from './b.js'`)
    await writeFile(join(dir, "b.js"), `export const b=2`)
    await writeFile(join(dir, "lazy-AbCd1234.js"), `export const messages="fr"`)
    await writeFile(join(dir, "stars-Zz9.bin"), "binary")
    await writeFile(join(dir, "unrelated.js"), `export {}`)
    expect((await kit.closure(dir, "entry.mjs")).sort())
      .toEqual(["a.js", "b.js", "entry.mjs", "lazy-AbCd1234.js", "stars-Zz9.bin"])
  })

  it("leaves a big optional file to be kept when it is used", async () => {
    const dir = await mkdtemp(join(tmpdir(), "offline-kit-"))
    await writeFile(join(dir, "entry.mjs"), `fetch("thunder-X1.wav");fetch("small-X1.ogg")`)
    await writeFile(join(dir, "thunder-X1.wav"), Buffer.alloc(OfflineKit.MAX_PRECACHED_BYTES + 1))
    await writeFile(join(dir, "small-X1.ogg"), "ok")
    expect((await kit.closure(dir, "entry.mjs")).sort()).toEqual(["entry.mjs", "small-X1.ogg"])
  })

  it("survives a module that names itself", async () => {
    const dir = await mkdtemp(join(tmpdir(), "offline-kit-"))
    await writeFile(join(dir, "loop.js"), `import"./loop.js"`)
    expect(await kit.closure(dir, "loop.js")).toEqual(["loop.js"])
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
