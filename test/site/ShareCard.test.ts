import { describe, expect, it } from "vitest"
import { ShareCard } from "../../site/ShareCard.js"

describe("ShareCard", () => {
  it("gives the logo as the image of the card, in a size and with a description", () => {
    expect(ShareCard.META).toContain('<meta property="og:image" content="https://ufoathome.org/logo.png">')
    expect(ShareCard.META).toContain('property="og:image:width" content="512"')
    expect(ShareCard.META).toContain(`property="og:image:alt" content="${ShareCard.LOGO_ALT}"`)
    expect(ShareCard.META).toContain('<meta name="twitter:card" content="summary">')
  })
})
