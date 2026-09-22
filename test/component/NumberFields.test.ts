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
    // A step of a tenth still leaves room for a hundredth: a shed paced at 5.44 m.
    expect(NumberFields.charsFor({ min: "0.1", max: "1000", step: "0.1" })).toBe(7)
  })

  it("gives room for four digits to a field with no bound of its own", () => {
    expect(NumberFields.charsFor({ min: "0", max: "", step: "0.1" })).toBe(7)
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

describe("What a number field takes", () => {
  const fov = { min: "1", max: "179", step: "0.1" }

  it("holds a value to its maximum as it is typed", () => {
    expect(NumberFields.heldValue("123456789", fov)).toBe("179")
    expect(NumberFields.heldValue("17", fov)).toBe("17")
  })

  it("keeps no more decimals than its step allows", () => {
    expect(NumberFields.heldValue("45.6789", fov)).toBe("45.67")
    expect(NumberFields.heldValue("45.6789", { min: "0", max: "120", step: "1" })).toBe("45")
  })

  it("holds it to its minimum only once the field is left, so a 5 can become a 50", () => {
    const distance = { min: "10", max: "30000", step: "0.1" }
    expect(NumberFields.heldValue("5", distance)).toBe("5")
    expect(NumberFields.heldValue("5", distance, true)).toBe("10")
  })

  it("leaves a number on its way to being one alone", () => {
    for (const typed of ["", "-", "1.", "1e"]) expect(NumberFields.heldValue(typed, fov)).toBe(typed)
  })

  it("sends the event again once it has brought a typed value back", () => {
    const field = document.createElement("input")
    field.type = "number"
    Object.assign(field, fov)
    const seen: string[] = []
    // Registered first, as the editor's own handlers are: it reads the typed value, then the held
    // one when the event comes round again.
    document.body.appendChild(field)
    field.addEventListener("input", () => seen.push(field.value))
    NumberFields.fit(document.body)
    field.value = "999999"
    field.dispatchEvent(new Event("input", { bubbles: true }))
    expect(field.value).toBe("179")
    expect(seen).toEqual(["999999", "179"])
    field.remove()
  })
})
