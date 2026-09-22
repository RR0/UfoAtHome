import { describe, expect, it } from "vitest"
import { NumberFields } from "../../src/component/NumberFields.js"

describe("A number field's width", () => {
  it("is what its own bounds and step can spell", () => {
    // An age: three digits, nothing else.
    expect(NumberFields.charsFor({ min: "0", max: "120", step: "1" })).toBe(3)
    // A roll: three digits and a sign.
    expect(NumberFields.charsFor({ min: "-180", max: "180", step: "1" })).toBe(4)
    // A latitude: two digits, a sign, a point and four decimals.
    expect(NumberFields.charsFor({ min: "-90", max: "90", step: "0.0001" })).toBe(8)
    // An albedo: one digit, a point and two decimals.
    expect(NumberFields.charsFor({ min: "0", max: "1", step: "0.01" })).toBe(4)
  })

  it("gives room for four digits to a field with no bound of its own", () => {
    expect(NumberFields.charsFor({ min: "0", max: "", step: "0.1" })).toBe(6)
  })

  it("sizes every number field it is given, and only those", () => {
    const form = document.createElement("div")
    form.innerHTML = `<input id="age" type="number" min="0" max="120" step="1"/>
      <input id="name" type="text"/>
      <input id="roll" type="number" min="-180" max="180" step="1"/>`
    expect(NumberFields.fit(form)).toBe(2)
    expect((form.querySelector("#age") as HTMLInputElement).style.width).toBe("calc(3ch + 2.6em)")
    expect((form.querySelector("#roll") as HTMLInputElement).style.width).toBe("calc(4ch + 2.6em)")
    expect((form.querySelector("#name") as HTMLInputElement).style.width).toBe("")
  })
})
