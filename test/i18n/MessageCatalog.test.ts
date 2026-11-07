import { describe, expect, it } from "vitest"
import { Messages } from "../../src/i18n/MessageCatalog.js"

describe("MessageCatalog", () => {
  it("loads only the language asked, once, and English for a language the interface is not written in", async () => {
    const asked: string[] = []
    const loader = (language: string) => async () => {
      asked.push(language)
      return { hello: language }
    }
    const catalog = Messages.catalog({ en: loader("en"), fr: loader("fr"), es: loader("es"), it: loader("it") })

    expect(await catalog.load("fr-CA")).toEqual({ hello: "fr" })
    expect(await catalog.load("fr")).toEqual({ hello: "fr" })
    expect(asked).toEqual(["fr"])
    expect(await catalog.load("de")).toEqual({ hello: "en" })
    expect(asked).toEqual(["fr", "en"])
  })

  it("asks again for a language whose module could not be loaded", async () => {
    let attempts = 0
    const catalog = Messages.catalog({
      en: async () => ({}), es: async () => ({}), it: async () => ({}),
      fr: async () => {
        attempts++
        if (attempts === 1) throw new Error("offline")
        return { hello: "bonjour" }
      }
    })
    await expect(catalog.load("fr")).rejects.toThrow("offline")
    await new Promise(resolve => setTimeout(resolve, 0))
    expect(await catalog.load("fr")).toEqual({ hello: "bonjour" })
  })
})
