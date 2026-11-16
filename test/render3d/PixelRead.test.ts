import { describe, expect, it, vi } from "vitest"
import type { WebGLRenderer, WebGLRenderTarget } from "three"
import { PixelRead } from "../../src/render3d/PixelRead.js"

describe("PixelRead", () => {
  it("unbinds the pixel-pack buffer an asynchronous read-back left bound before reading synchronously", () => {
    const calls: string[] = []
    class FakeGl2 {
      readonly PIXEL_PACK_BUFFER = 0x88eb
      bindBuffer(target: number, buffer: unknown) { calls.push(`bind ${target} ${buffer}`) }
    }
    vi.stubGlobal("WebGL2RenderingContext", FakeGl2)
    const renderer = {
      getContext: () => new FakeGl2(),
      readRenderTargetPixels: () => calls.push("read")
    } as unknown as WebGLRenderer
    PixelRead.now(renderer, {} as WebGLRenderTarget, 0, 0, 1, 1, new Uint8Array(4))
    expect(calls).toEqual([`bind ${0x88eb} null`, "read"])
    vi.unstubAllGlobals()
  })
})
