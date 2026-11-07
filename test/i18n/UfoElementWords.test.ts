import { describe, expect, it, beforeAll, vi } from "vitest"
import { WordsAudit } from "./WordsAudit.js"

vi.mock("../../src/component/messages/UfoMessages_en.js", async original => {
  const { WordsAudit } = await import("./WordsAudit.js")
  const actual = await original<typeof import("../../src/component/messages/UfoMessages_en.js")>()
  return { ufoMessages_en: WordsAudit.pseudo(actual.ufoMessages_en) }
})

const { registerUfo, UFO_ELEMENT_NAME } = await import("../../src/component/UfoElement.js")
registerUfo()

beforeAll(() => {
  const noop = (): void => {}
  HTMLCanvasElement.prototype.getContext = function (this: HTMLCanvasElement) {
    return new Proxy({ canvas: this, measureText: (text: string) => ({ width: text.length * 5 }), createRadialGradient: () => ({ addColorStop: noop }) },
      { get: (target, key) => key in target ? (target as Record<string | symbol, unknown>)[key] : noop })
  } as unknown as typeof HTMLCanvasElement.prototype.getContext
})

describe("the words of <rr0-ufo>", () => {
  it("all come from its messages", async () => {
    const element = document.createElement(UFO_ELEMENT_NAME)
    document.body.appendChild(element)
    await new Promise(resolve => setTimeout(resolve, 200))
    expect(WordsAudit.leftovers(element)).toEqual([])
  })
})
