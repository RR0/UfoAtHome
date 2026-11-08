import { describe, expect, it } from "vitest"

/*
 * What the components ask or say is in their own DOM: a host can refuse a native dialog, as a sandboxed iframe does, and then an alert says
 * nothing and a confirm answers no in the name of nobody. A test that stubs window.alert would only try the one place where it works.
 */
describe("the components", () => {
  it("use no native dialog", () => {
    const sources = import.meta.glob<string>("/src/**/*.ts", { query: "?raw", import: "default", eager: true })
    const using = Object.entries(sources).filter(([, text]) => /\bwindow\.(alert|confirm|prompt)\(/.test(text)).map(([path]) => path)
    expect(using).toEqual([])
  })
})
