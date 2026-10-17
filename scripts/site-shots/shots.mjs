// What each screenshot of ufoathome.org shows: the page it is taken on and how to get the interface into the state
// worth showing. Where it is placed on the site is site/Shots.ts, by the same `name`.

const EDIT = "/edit/"
const CASE = "?file=/demo-data/case-socorro.json"

/** The editor's group tabs, in the order the manual lists them. */
const GROUPS = ["summary", "observer", "location", "environment", "moment", "weather", "sound", "pictures", "phenomenon", "file"]

/** Opens a group of the editor and frames its tab bar and panel together. */
const group = (name) => ({
  name: `edit-${name}`,
  page: EDIT,
  query: CASE,
  async take(tools) {
    const { page } = tools
    const index = GROUPS.indexOf(name)
    await page.locator(".group-tab").nth(index).click()
    await page.waitForTimeout(800)
    // The phenomenon group is the scene itself: framed down to its playback bar.
    const panel = name === "phenomenon" ? page.locator("input[type=range]:visible").last() : page.locator("section.group-panel:visible").first()
    const active = page.locator(".group-tab").nth(index)
    await tools.highlight(page, active)
    return { region: [page.locator(".group-tabs").first(), panel] }
  }
})

/** Opens the Phenomenon group, then the editor of a shape by clicking its chip, which is how one is reached. */
const shapeEditor = async (page) => {
  await page.locator(".group-tab").nth(GROUPS.indexOf("phenomenon")).click()
  await page.waitForTimeout(1500)
  await page.locator("button.param-chip", { hasText: /Object|Objet|Objeto|Oggetto/ }).first().click()
  await page.waitForTimeout(1500)
  return page.locator("section.group-panel:visible").first()
}

/** A recording played in the player, the picture alone (no summary chips): the scene a documentation section talks about. */
const scene = (name, file) => ({
  name,
  page: "/play/",
  query: `?file=/demo-data/${file}.json&labels=0`,
  settle: 9000,
  async take({ page }) {
    return { region: [page.locator("rr0-sighting canvas:visible").first()], pad: 0 }
  }
})

export const SHOTS = [
  {
    // A photograph of the place laid over the render, the observer's hand-drawn sphere on it.
    name: "scene-pictures",
    page: "/play/",
    query: "?file=/demo-data/observer-cussac.json&labels=0&t=30",
    settle: 10000,
    async take({ page }) {
      return { region: [page.locator("rr0-sighting canvas:visible").first()], pad: 0 }
    }
  },
  {
    // The player with the strip of chips under the picture, each a statement the recording makes.
    name: "player-chips",
    page: "/play/",
    query: "?file=/demo-data/sky-test-halos.json",
    settle: 9000,
    async take({ page }) {
      return { region: [page.locator("rr0-sighting").first()], pad: 0 }
    }
  },
  scene("scene-sky", "sky-test-supermoon"),
  scene("scene-light", "sky-test-milkyway"),
  scene("scene-space", "sky-test-comet"),
  scene("scene-ice", "sky-test-halos"),
  scene("scene-weather", "sky-test-storm"),
  scene("scene-ground", "observer-socorro"),
  scene("scene-instrument", "instrument-instamatic"),
  ...GROUPS.map(group),
  {
    // "Say when and where": the place field and what it fills in.
    name: "edit-locate",
    page: EDIT,
    query: CASE,
    async take({ page, highlight, boxOf }) {
      await page.locator(".group-tab").nth(GROUPS.indexOf("location")).click()
      await page.waitForTimeout(600)
      const panel = page.locator("section.group-panel:visible").first()
      const inputs = panel.locator("input")
      await highlight(page, inputs.nth(0))
      await highlight(page, panel.locator("button").first())
      const across = await boxOf([panel], 0)
      const rows = await boxOf([inputs.nth(0), inputs.nth(5)], 14)
      return { clip: { x: across.x - 6, y: rows.y, width: across.width + 12, height: rows.height } }
    }
  },
  {
    // "Draw it": the shape editor, an oval or a polygon to choose first.
    name: "edit-draw",
    page: EDIT,
    query: CASE,
    async take({ page, highlight }) {
      const panel = await shapeEditor(page)
      await highlight(page, panel.locator("button", { hasText: /Oval|Ovale|Óvalo/ }).first())
      await highlight(page, panel.locator("button", { hasText: /Polygon|Polygone|Polígono|Poligono/ }).first())
      return { region: [panel] }
    }
  },
  {
    // "Record the movement": the record button and its sampling rate, at the foot of the same editor.
    name: "edit-record",
    page: EDIT,
    query: CASE,
    async take({ page, highlight, boxOf }) {
      const panel = await shapeEditor(page)
      const record = panel.locator("button").last()
      const rate = panel.locator("input[type=number], input").last()
      await highlight(page, record)
      const across = await boxOf([panel], 0)
      const row = await boxOf([record, rate], 12)
      return { clip: { x: across.x - 6, y: row.y, width: across.width + 12, height: row.height } }
    }
  },
  {
    // A case: its identifier, title and the observations it holds, above the editor proper.
    name: "edit-case",
    page: EDIT,
    query: CASE,
    async take({ page, boxOf }) {
      // From the case's own title down to where the editor of one observation begins.
      const whole = await boxOf([page.locator("rr0-case-editor")], 0)
      const tabs = await boxOf([page.locator(".group-tabs").first()], 0)
      const pad = 8
      return { clip: { x: whole.x, y: whole.y, width: whole.width, height: tabs.y - whole.y - 4 } }
    }
  }
]
