// What each screenshot of ufoathome.org shows: the page it is taken on and how to get the interface into the state
// worth showing. Where it is placed on the site is site/Shots.ts, by the same `name`.

const EDIT = "/edit/"

/** A recording, for what a recording's editor shows: given a case, the editor opens the case's own, whose tabs come first. */
const RECORDING = "?file=/demo-data/observer-socorro.json"
const CASE = "?file=/demo-data/case-socorro.json"

/** The panel each of the editor's group tabs opens. By that and not by rank: the tabs have been reordered and the editor of a case put before them. */
const GROUPS = {
  summary: "group-observation", observer: "group-observer", location: "group-location", moment: "group-temporal", environment: "group-decor",
  weather: "group-weather", phenomenon: "group-shape", sound: "group-sound", pictures: "group-reference", file: "group-file"
}
const groupTab = (page, name) => page.locator(`.group-tab[aria-controls="${GROUPS[name]}"]`)

/** Opens a group of the editor and frames its tab bar and panel together. */
const group = (name) => ({
  name: `edit-${name}`,
  page: EDIT,
  query: RECORDING,
  async take(tools) {
    const { page } = tools
    // Wide enough for what the fields hold: at the width of the text column they are cut off.
    await page.setViewportSize({ width: 1000, height: 1100 })
    // A click on a group already open closes it, and one is open from the start.
    if (await groupTab(page, name).getAttribute("aria-expanded") !== "true") await groupTab(page, name).click()
    await page.waitForTimeout(800)
    const panel = page.locator(`#${GROUPS[name]}`)
    // Taken from a local copy of the site, whose address the field would show.
    if (name === "file") await panel.locator("input").evaluateAll(inputs => {
      for (const input of inputs) if (input.value.includes("localhost")) input.value = new URL(input.value).pathname.replace(/^/, "https://ufoathome.org")
    })
    await tools.highlight(page, groupTab(page, name))
    return { region: [groupTab(page, name).locator(".."), panel], pad: 0 }
  }
})

/** Opens the Phenomenon group, then the editor of a shape by clicking its chip, which is how one is reached. */
const shapeEditor = async (page) => {
  await groupTab(page, "phenomenon").click()
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

const SAINT_LO = "?file=/demo-data/case-saint-lo.json"

/** Chooses an event of the case in the picker by its place in the list (0 the observation, 1 the interview). */
const choose = async (page, index) => {
  await page.locator("rr0-case-editor #track").selectOption(String(index))
  await page.waitForTimeout(1500)
}

/** An interview's editor, opened on the case of Saint-Lô, one of its three groups shown and its tab outlined. */
const interviewGroup = (name, index) => ({
  name: `interview-${name}`,
  page: EDIT,
  query: SAINT_LO,
  async take({ page, highlight }) {
    await choose(page, 1)
    const tabs = page.locator("rr0-interview #tabs .group-tab")
    await tabs.nth(index).click()
    await page.waitForTimeout(2500)
    if (name === "exchanges") {
      // Scrolled to a turn that tells of a moment of the observation: its link, outlined, is what the page talks about.
      const turn = page.locator("rr0-interview .turn:has(.ref)").first()
      await turn.scrollIntoViewIfNeeded()
      await page.waitForTimeout(400)
      await highlight(page, turn.locator(".ref").first())
    }
    await highlight(page, tabs.nth(index))
    return { region: [page.locator("rr0-interview #tabs"), page.locator("rr0-interview section.group-panel:visible").first()] }
  }
})

/** The dialog of the "+" button, with the type chosen, over the case of Saint-Lô. */
const addDialog = (name, fill) => ({
  name,
  page: EDIT,
  query: SAINT_LO,
  async take({ page }) {
    await page.locator("rr0-case-editor #add").click()
    await page.waitForTimeout(600)
    await fill(page)
    await page.waitForTimeout(400)
    return { region: [page.locator("rr0-case-editor #dialog form")] }
  }
})

export const SHOTS = [
  {
    // The events of a case as cards, each with what can be done to it, and the "+" that adds one.
    name: "case-events",
    page: EDIT,
    query: SAINT_LO,
    settle: 14000,
    async take({ page, highlight }) {
      // The events of the case are cards now, not a picker: what is shown is the button that adds one and the list itself,
      // where each card carries what can be done to it (clone, padlock, bin).
      await highlight(page, page.locator("rr0-case-editor #add"))
      return { region: [page.locator("rr0-case-editor #add"), page.locator("rr0-case-editor #event-list")], pad: 10 }
    }
  },
  addDialog("case-add-interview", async page => {
    await page.locator("rr0-case-editor #kind").selectOption("interview")
  }),
  addDialog("case-add-interpretation", async page => {
    await page.locator("rr0-case-editor #of").selectOption({ index: 1 })
  }),
  {
    // The case file as text, in the case editor's own File group.
    name: "case-file",
    page: EDIT,
    query: SAINT_LO,
    settle: 14000,
    async take({ page, highlight }) {
      const tabs = page.locator("rr0-case-editor > div .group-tab, rr0-case-editor .case-panel .group-tab").first()
      await page.locator("rr0-case-editor [aria-controls=group-case-file]").click()
      await page.waitForTimeout(2500)
      await highlight(page, page.locator("rr0-case-editor [aria-controls=group-case-file]"))
      return { region: [page.locator("rr0-case-editor [aria-controls=group-events]"), page.locator("rr0-case-editor #group-case-file")] }
    }
  },
  interviewGroup("summary", 0),
  interviewGroup("exchanges", 1),
  interviewGroup("file", 2),
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
  ...Object.keys(GROUPS).map(group),
  {
    // "Say when and where": the place field and what it fills in.
    name: "edit-locate",
    page: EDIT,
    query: RECORDING,
    async take({ page, highlight, boxOf }) {
      await groupTab(page, "location").click()
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
    query: RECORDING,
    async take({ page, highlight }) {
      const panel = await shapeEditor(page)
      await highlight(page, panel.locator("button", { hasText: /Oval|Ovale|Óvalo/ }).first())
      await highlight(page, panel.locator("button", { hasText: /Polygon|Polygone|Polígono|Poligono/ }).first())
      return { region: [panel] }
    }
  },
  {
    // "Give it a movement": the playback bar, a tick for each keyframe of what the open group edits.
    name: "edit-keyframes",
    page: EDIT,
    query: RECORDING,
    async take({ page, highlight, boxOf }) {
      await groupTab(page, "phenomenon").click()
      await page.waitForTimeout(1500)
      // The playback bar, which shows while the picture is pointed at; the Phenomenon group has sliders of its own.
      await page.locator("canvas:visible").first().hover()
      await page.waitForTimeout(400)
      const bar = page.locator("#seek")
      await highlight(page, bar)
      const row = await boxOf([bar], 14)
      const scene = await boxOf([page.locator("rr0-sighting-editor canvas:visible, canvas:visible").first()], 0)
      return { clip: { x: scene.x - 6, y: row.y, width: scene.width + 12, height: row.height } }
    }
  },
  {
    // A case: its identifier, title and the events it gathers.
    name: "edit-case",
    page: EDIT,
    query: CASE,
    settle: 14000,
    async take({ page }) {
      // The case itself: what it is called and when, and the events it gathers.
      return { region: [page.locator("rr0-case-editor .case-panel"), page.locator("rr0-case-editor #event-list")], pad: 8 }
    }
  }
]
