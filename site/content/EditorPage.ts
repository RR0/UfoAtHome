import type { PageMeta, SiteLanguage, SitePage } from "../SitePage.js"
import { RecordingTitle } from "./RecordingTitle.js"

/** The editor itself, followed by its manual: what each of the eight groups is for. */
export class EditorPage implements SitePage {

  readonly meta: PageMeta = {
    slug: "edit",
    navLabel: { en: "Editor", fr: "Éditeur", es: "Editor", it: "Editor" },
    title: {
      en: "The editor, and how to use it",
      fr: "L'éditeur, et comment s'en servir",
      es: "El editor, y cómo usarlo",
      it: "L'editor, e come usarlo"
    },
    description: {
      en: "Record a sighting: draw the shape, state the date, the place and the instrument, and let "
        + "the sky, the weather and the ground be looked up. The full manual of the UFO@home editor.",
      fr: "Enregistrer une observation : dessiner la forme, énoncer la date, le lieu et l'instrument, "
        + "et laisser le ciel, la météo et le sol être relevés. Le manuel complet de l'éditeur UFO@home.",
      es: "Registrar un avistamiento: dibujar la forma, indicar la fecha, el lugar y el instrumento, y "
        + "dejar que se consulten el cielo, el tiempo y el terreno. El manual completo del editor de UFO@home.",
      it: "Registrare un avvistamento: disegnare la forma, indicare la data, il luogo e lo strumento, e "
        + "lasciare che il cielo, il meteo e il terreno vengano ricavati. Il manuale completo dell'editor di UFO@home."
    },
    modules: ["/lib/rr0-sighting-editor.mjs"]
  }

  /**
   * `?sighting=` opens the editor on an existing recording — the parameter every "edit this
   * observation" link in a published reconstruction carries.
   *
   * A bare name with no slash is resolved against this site's own demo recordings first, then
   * against rr0.org's case directories, which is where the `ufoathome.org/Socorro` links that
   * predate this site pointed. Anything else is taken as a URL and loaded as given: this is a tool
   * meant to open recordings hosted anywhere, and the editor's own "load from URL" field would do
   * exactly the same thing by hand.
   */
  script(language: SiteLanguage): string {
    const demoTitles = JSON.stringify(RecordingTitle.demoTitles(language))
    const editing = JSON.stringify(({ en: "Editing {title}", fr: "Éditer {title}", es: "Editar {title}", it: "Modifica {title}" })[language])
    return `const editor = document.getElementById("editor")
const requested = new URLSearchParams(location.search).get("sighting")
/* Which recording of a case it opens on, when what is asked for is a case. */
const requestedTrack = new URLSearchParams(location.search).get("track")
const demoTitles = ${demoTitles}
const editing = ${editing}
const heading = document.querySelector(".hero h1")
const generalHeading = heading && heading.textContent
const generalTitle = document.title

${RecordingTitle.SCRIPT}

/* Names the observation being edited, as the Player names the one it plays: "Record a sighting" says what the editor is for, and
   once it holds one in particular the heading says which. Nothing is renamed for a new, unnamed recording. */
const announce = title => {
  if (!heading) return
  if (!title) {
    heading.textContent = generalHeading
    document.title = generalTitle
    return
  }
  const sentence = editing.replace("{title}", title)
  heading.textContent = sentence + "."
  document.title = sentence + " — UFO@home"
}
/* The recording arrives after its address is set, so the name is asked again until the editor holds it (its own id or its observer, which
   is what names it) or the wait is long enough to say it never will. A demo is named at once, by this site's own name for it. */
const announceWhenLoaded = src => {
  announce(titleOf(undefined, src))
  let tries = 0
  const timer = setInterval(() => {
    const sighting = editor.sightingData
    const named = sighting && (sighting.id || sighting.observer || sighting.title)
    if (named) announce(titleOf(sighting, src))
    if (named || ++tries > 50) clearInterval(timer)
  }, 200)
}

/* The example under the editor is the recording being edited, when it came from an address, and
   the link that replays it beside it: the one a reader wants to hand on once they are done. Socorro
   until then. It follows a recording loaded from the editor's own address field too, which sets
   the same src; one read from a file has no address, and leaves the example as it was. */
const showExample = value => {
  for (const [id, path] of [["sighting-edit", "/edit/"], ["sighting-play", "/play/"]]) {
    const link = document.getElementById(id)
    if (!link) continue
    link.href = path + "?sighting=" + encodeURIComponent(value)
    link.querySelector("code").textContent = path + "?sighting=" + value
  }
}
showExample(requested || "Socorro")
if (editor) {
  new MutationObserver(() => {
    const src = editor.getAttribute("src")
    if (!src) return
    announceWhenLoaded(src)
    // A demo's own file is named back by its name, as it was asked for.
    const prefix = "/demo-data/observer-"
    const demo = src.startsWith(prefix) && src.endsWith(".json") ? src.slice(prefix.length, -".json".length) : undefined
    showExample(demo && requested && requested.toLowerCase() === demo ? requested : src)
  }).observe(editor, { attributes: true, attributeFilter: ["src"] })
}
if (editor && requested) {
  const url = requested.includes("/")
    ? requested
    : \`/demo-data/observer-\${requested.toLowerCase()}.json\`
  const fallback = \`https://rr0.org/science/crypto/ufo/enquete/dossier/\${requested}/sighting.json\`
  const load = async () => {
    if (requestedTrack) editor.setAttribute("track", requestedTrack)
    if (!requested.includes("/")) {
      const local = await fetch(url, { method: "HEAD" }).catch(() => null)
      editor.setAttribute("src", local && local.ok ? url : fallback)
    } else {
      editor.setAttribute("src", url)
    }
    editor.scrollIntoView({ block: "start" })
  }
  load()
}

/* The manual for a strip of eight panels is itself a strip of eight panels: the section below
   turns into the same one-open-at-a-time control the editor above it uses, so the shape of the
   page teaches the shape of the tool. Built here rather than written into the HTML so that a
   reader without this script still gets all eight descriptions, one after another. */
const docs = document.querySelector(".group-docs")
if (docs) {
  const panels = [...docs.querySelectorAll(".group-doc")]
  const tabs = document.createElement("div")
  tabs.className = "group-docs-tabs"
  tabs.setAttribute("role", "tablist")
  const buttons = panels.map((panel, index) => {
    const heading = panel.querySelector("h3")
    const button = document.createElement("button")
    button.type = "button"
    button.className = "group-docs-tab"
    button.setAttribute("role", "tab")
    /* The heading's own text, so the eight names cannot drift from the eight sections, and its own
       id as the target, so the anchor beside it still leads here. */
    button.textContent = heading.textContent.replace("#", "").trim()
    button.dataset.target = heading.id
    button.addEventListener("click", () => show(index))
    tabs.append(button)
    return button
  })
  const show = index => {
    panels.forEach((panel, i) => (panel.hidden = i !== index))
    buttons.forEach((button, i) => button.setAttribute("aria-selected", String(i === index)))
  }
  docs.before(tabs)
  docs.classList.add("is-tabbed")
  /* A link to one group's own heading has to open the panel holding it, or it would scroll to
     something hidden — which is the whole failure mode of putting prose behind tabs. */
  const fromHash = () => {
    const target = decodeURIComponent(location.hash.slice(1))
    const index = buttons.findIndex(button => button.dataset.target === target)
    show(index === -1 ? 0 : index)
    if (index !== -1) panels[index].scrollIntoView({ block: "start" })
  }
  addEventListener("hashchange", fromHash)
  fromHash()
}`
  }

  render(language: SiteLanguage): string {
    switch (language) {
      case "fr":
        return this.fr()
      case "es":
        return this.es()
      case "it":
        return this.it()
      default:
        return this.en()
    }
  }

  private en(): string {
    return `
<section class="band hero">
  <div class="wrap">
    <p class="eyebrow">The editor</p>
    <h1>Record a sighting.</h1>
    <p class="lede">Everything below is live. Nothing you do here is uploaded anywhere — the
      recording exists in your browser until you press <strong>Export</strong>, which hands you a JSON
      file that is yours.</p>
  </div>
</section>

<section class="band">
  <div class="wrap">
    <div class="stage stage-padded">
      <rr0-sighting-editor id="editor"></rr0-sighting-editor>
    </div>
    <p class="small">Opening it on an existing recording: add <code>?sighting=</code> and a URL, or
      the name of one of <a href="/demos/">the demos</a> (a name that is none of them is looked for as an
      rr0.org case, by its <code>sighting.json</code>) — for instance
      <a id="sighting-edit" href="/edit/?sighting=Socorro"><code>/edit/?sighting=Socorro</code></a>,
      which replays at <a id="sighting-play" href="/play/?sighting=Socorro"><code>/play/?sighting=Socorro</code></a>.</p>
    <p class="small">The address may be a case's <code>case.json</code>: the editor then lists the recordings the case holds, the observers' accounts and the readings of them, each a recording of its own, with a picker to open one, a button to add a reading and one to delete it, and one to export the case and what changed as a zip. <code>&amp;track=</code> names the recording it opens on.</p>
  </div>
</section>

<section class="band">
  <div class="wrap">
    <h2 id="manual">Three gestures to a first recording</h2>
    <ol class="steps">
      <li>
        <h3>Say when and where</h3>
        <p>Fill <strong>Moment</strong> and <strong>Location</strong>. That is the moment the
          sky appears: the Sun, the Moon and its phase, the planets, the stars of that night — and
          the weather record for that hour is fetched on its own. Doing it first means drawing
          against the real sky rather than on an empty canvas.</p>
      </li>
      <li>
        <h3>Draw it</h3>
        <p>Open the <strong>Phenomenon</strong> group. Pick <em>Oval</em> or <em>Polygon</em>, set its
          colour, its transparency, its halo, how dazzling it was and how blurred its edges looked.
          Drag its handles on the canvas to size it; a polygon's vertices can be added, moved and
          deleted individually.</p>
      </li>
      <li>
        <h3>Record the movement</h3>
        <p>Press <strong>Record</strong> and move the pointer over the canvas along the path the
          object took, then <strong>Stop</strong>. Playback replays it over the observation's own
          <em>real</em> duration — a five-minute sighting takes five minutes, not the second the
          drag took.</p>
      </li>
    </ol>
    <p class="small">Under the playback bar, a tick marks each keyframe of what the open group edits
      (the selected shapes, the observer, the weather, the sound; all of them from the other groups),
      and a taller amber one each named moment. A press within a few pixels of one lands on it
      exactly, the bar names it under the pointer, and <strong>◂◆</strong> / <strong>◆▸</strong> go
      to the previous or next one — so an existing keyframe is changed rather than a new one made a
      few milliseconds beside it.</p>
    <p class="small">A row of chips under the render lists everything the recording actually
      asserts — and only that. Click one to jump to the field it came from. A value a data source
      supplied rather than you is marked as such.</p>
  </div>
</section>

<section class="band">
  <div class="wrap">
    <h2>The ten groups</h2>
    <p class="lede prose-wide">One panel opens at a time, so the render stays on screen while you
      edit.</p>

    <div class="group-docs">
      <div class="group-doc">
      <h3>Observation</h3>
      <p>State what this recording is about: an
        <strong>ID</strong>, a <strong>description</strong>, <strong>tags</strong>. The ID is this
        account's own, the day and then who saw it (<code>1964-04-24-ZamoraLonnie</code>); a recording
        does not name its case, it is <a href="/docs/format/#several-observers-the-case">the case</a>
        that names its accounts and gives a page its observer picker.</p>
    </div>

    <div class="group-doc">
      <h3>Observer</h3>
      <p>Who gave the account — and, just as importantly, <strong>what they observed it
        through</strong>. An eye is not a lens: naked-eye vision maps an angle to an angle, a camera
        maps it to <code>f·tan θ</code>, and the two draw genuinely different frames. Pick a camera
        and its <strong>focal length</strong>, <strong>aperture</strong>, <strong>exposure</strong>
        and <strong>focus distance</strong> become available — each disabled where the device fixed
        it, because the owner of a fixed-focus snapshot camera had nothing to choose. Instruments
        outside the observation's own date are left out of the list, except the one the recording
        already names, which is kept and flagged.</p>
      <p>A camera's frame is letterboxed inside the element at its own proportions, and its field
        becomes the default one; the eye, or a camera of unknown make, is drawn 16:9 with a 60°
        vertical field. Changing the instrument re-projects the shapes: they keep their angles, so
        they move as well as change size. The exposure stays within what the device allowed (1/1000
        to 8 s for an unknown camera, 10 s for a phone); only the 35 mm SLRs have a B setting, up to
        an hour. A long pose is drawn at once as the viewfinder showed it, then fills in into the
        photograph as the scene settles.</p>
      <p><strong>Roll</strong> sits here rather than with the place, because it is how the device
        was <em>held</em> — a camera askew, a head leaned over — not where the observer stood.</p>
    </div>

    <div class="group-doc">
      <h3>Location</h3>
      <p>Account names a place, it does not give coordinates. So type the name and press
        <strong>Locate</strong>: latitude and longitude are filled from OpenStreetMap's own
        geocoder, every candidate stays listed, and picking another moves the observer. What is
        stored is the <em>qualified</em> name that was resolved, so a later reader lands on the same
        spot. Move a coordinate by hand and a name that came from a search is re-derived, or cleared — a
        name describing somewhere the sighting is no longer at would be a written false statement. A
        name you typed yourself is kept as typed and never replaced, even when no lookup finds it.</p>
      <p><strong>Heading</strong> is the direction faced, <strong>Tilt</strong> how far up or down,
        and <strong>Altitude</strong> is above sea level, floored by the ground's own height at that
        location: an observer in the Alps is not at 0 m. Relief and imagery sources are chosen right
        here, under the coordinates whose ground they describe.</p>
      <p>Position, heading and tilt are written at the playhead, as a keyframe of the observer's
        track: set them at another moment and the observer moves or turns between the two.</p>
      <p>The <strong>map</strong> over the render does the same for the position: click bare ground
        and the observer stands there at the playhead, exactly as if both coordinates had been typed.
        The wheel zooms around the pointer, a drag moves the ground, and <strong>+</strong>,
        <strong>−</strong> and <strong>⤢</strong> (back to the whole path) are there for whoever has
        neither.</p>
    </div>

    <div class="group-doc">
      <h3>Environment</h3>
      <p>What stood around the observer, at a real distance east and north: buildings with their
        floors and windows, trees, streetlights, vehicles, aircraft — and <strong>other
        observers</strong>. This is the only thing that can put a number on a distance: if the object
        passed <em>behind</em> that hangar it was at least that far, if <em>in front of</em> that
        tree, at most. Each crossing narrows the object's real width from one side for the whole
        recording; the result appears under the apparent size, and reads “unknown” when nothing
        crosses its line of sight, which is the honest answer for most sightings.</p>
      <p><strong>Several observers, and their points of view.</strong> An observer placed here can
        carry the URL of their <em>own</em> recording, and right-clicking them in the scene offers
        to view it — which loads their account and puts you where they stood, looking the way they
        looked. Two people a hundred metres apart did not see the same thing, and being able to step
        from one to the other is how that stops being an assertion and becomes something to check.
        The <strong>🎯</strong> button does the smaller version of the same thing: it turns the
        current observer to face whatever is selected.</p>
      <p>Published together, those recordings become the observer picker a reader gets — see
        <a href="/docs/format/#several-observers-the-case">the case</a> that lists them.</p>
      <p>Decor can also <strong>move</strong> (an aircraft crossing the sky, a car driving past) and
        carry <strong>lights</strong> with real, regulated flash rates — anticollision beacons at
        40–100 a minute, hazard flashers at 60–120. On a long exposure that rate is drawn: steady
        lamps leave lines, flashing ones leave dots at regular intervals, which is exactly how a
        photograph of an airliner is told from a photograph of something that does not blink.</p>
    </div>

    <div class="group-doc">
      <h3>Moment</h3>
      <p>A start, an end, a duration — and a <strong>time zone</strong>, which is the rule, not the
        number. Pick the observer's own zone and the offset is derived from that zone's rules
        <em>at the observation's date</em>: Valensole in July 1965 resolves to UTC+1, not today's
        UTC+2, because France only reintroduced summer time in 1976.</p>
      <p>The zone is filled in from the coordinates, and never replaces one you chose. Zone
        boundaries are coarse (Montgomery, Alabama falls in America/Chicago, which kept summer time
        in 1948 when Alabama did not), so a plain offset can still be typed with the <em>offset entered</em> choice. An offset that
        no clock at that longitude could have kept is flagged, the meridian's solar time in its
        tooltip. Editing either date drops an explicit duration once the two dates give an exact
        length of their own.</p>
      <p>The <strong>EDTF</strong> button switches both date fields to text, for everything a
        calendar picker cannot say: a bare year, a month, a time with no date, and the qualifiers
        <em>uncertain</em> (<code>?</code>) and <em>approximate</em> (<code>~</code>). Most archives
        need it — of 241 case files on rr0.org, 43% state a bare year and only 17% a date with a
        time.</p>
      <p><strong>Moments</strong> names the instant at the playhead (A, B, C… as case sketches do),
        with a sentence of what happens then. Picking one in the list goes there; <strong>🎯</strong>
        goes back to the one shown, which the list cannot do once playback has moved on past it.</p>
    </div>

    <div class="group-doc">
      <h3>Weather</h3>
      <p>The one group that is not account. Weather is a measurable fact about a place at an
        instant, and the two groups above already state both — so it is looked up from ERA5, the
        ECMWF reanalysis, and shown <em>read-only</em> above a line naming the dataset and the exact
        UTC instant described. A wrong time zone shows up there before it shows up in the sky.</p>
      <p>Unchecking <strong>From weather records</strong> hands the fields back to the observer: the
        looked-up values stay as a starting point, the source is dropped, and no later lookup may
        overwrite them. A recording that names a source is replayed exactly as authored and never
        looked up again, so a published case file reads identically offline.</p>
      <p>A lookup writes a weather keyframe at the start, at each whole hour and at the end of the
        recording, each at wherever the observer stands at that moment; the track is laid out again
        when the recording's length changes.</p>
      <p>The group has three handles of its own, one part open at a time like the groups
        themselves: <strong>Precipitation</strong> — its type and intensity, and the
        <strong>Storm</strong> box, which is where a weather code reports a thunderstorm, beside
        rain and hail, and which turns on the lightning and the thunder at its real delay —
        <strong>Clouds</strong>, and <strong>Wind</strong>, the direction it blows toward and its
        speed, which is what carries every cloud that has no wind of its own.</p>
      <p>The clouds are the <strong>Clouds</strong> part of this group. A looked-up sky
        arrives as three of them, the low, middle and high bands of the record; a sky the observer
        described is as many as they saw. Every number in the panel is written into the recording
        the moment it is valid, and the first edit pauses playback, so nothing is committed at a
        moving playhead.</p>
      <p><strong>Edit scope</strong> decides what an edit is about. <em>Current time</em> writes a
        weather keyframe at the playhead, or updates the one that is there: this is how a sky
        changes during the observation — set the deck at the start, seek, set it again. <em>Whole
        observation</em> applies the one property you change to every keyframe there is, leaving
        the others as they were, which is what you want for “it was cumulus, not stratus”.</p>
      <p><strong>Layer</strong> lists them by rank, type and base. <strong>Add layer</strong> puts a
        half-covered cumulus deck at 1 500 m for you to reshape; <strong>Delete layer</strong> removes
        the one selected. A layer keeps its identity across keyframes, so adding one at 40 seconds
        fades it in from the previous keyframe rather than popping it.</p>
      <p>Then the layer's own fields: <strong>Cloud type</strong> (cumulus, stratus, stratocumulus,
        cirrus, unknown — it shapes the tops, and a cirrus is the deck that makes haloes),
        <strong>Base</strong> and <strong>Thickness</strong> in metres above the reference ground,
        <strong>Coverage</strong> as the percentage of sky it really covers, <strong>Cloud size</strong>
        as the width of one cloud in metres — separate from coverage, so the same percentage can be
        many small clouds or a few large ones — <strong>Density</strong> (0 transparent to 2) and
        <strong>Darkness</strong> (0 white to 1). <strong>Layer wind direction</strong> and
        <strong>speed</strong> are for a deck that moves differently from the ground wind, which the
        high one usually does; left empty they mean the general wind. <strong>Pattern seed</strong>
        picks another arrangement of the same numbers, when the one drawn puts a cloud where the
        account says there was none.</p>
      <p><strong>Individual clouds</strong> is for the one the account places: the one the phenomenon
        went behind, the one that was there and nowhere else. <strong>Add individual cloud</strong>
        puts one in the layer, ahead of where you are looking, at the layer's own base. It is drawn
        as one of the layer's own — the same texture, the same edges — and differs from its
        neighbours only in standing exactly where you say, even with the layer's coverage at 0 %.
        <strong>Point at cloud</strong> turns the observer to it. <strong>Delete cloud</strong> removes
        it.</p>
      <p>Tick <strong>Select and drag clouds in the sky</strong> and the picture itself becomes the
        control: click a cloud to select it, drag to move it — in the plane facing you, so it
        keeps its distance while its bearing and its altitude follow the pointer, and it never goes
        below the ground. Untick it and clicks are the player's again. The numeric fields do the
        rest, and do it exactly: <strong>East</strong> and <strong>North position</strong> in metres
        from where the observer started, its own <strong>base</strong>, <strong>thickness</strong>,
        <strong>width</strong>, <strong>depth</strong> and <strong>rotation</strong>, its
        <strong>density</strong> and a <strong>darkness</strong> that, left empty, is the layer's.
        Keyframe it twice and it drifts, grows or darkens between the two; on top of that it rides
        the layer's wind like every other cloud.</p>
      <p>Any cloud edit takes the weather away from the record: the source is dropped and no later
        lookup may overwrite what you set. Tick <strong>From weather records</strong> again and the
        record's three layers come back, replacing yours. The one exception is
        <strong>Crystal alignment</strong>, offered on a cirrus layer only: no weather record
        measures it, so it stays editable with ERA5 selected. Tumbling crystals give a bare ring;
        level plates and rolling columns give sundogs, arcs and a pillar.</p>
      <p>Below sits the <strong>“Sky:”</strong> line — read-only, and not a lookup at all. A meteor
        shower is a position in Earth's orbit and a comet's orbit is a solved problem, so the date
        and the place alone decide both. It states what else was in that patch of sky: the shower
        and its rate over the sporadic background, the comet and its magnitude, any nova or
        supernova whose recorded light curve covers that night (the 🌟 button turns the observer
        towards it), whether low orbit
        was still sunlit, whether the Milky Way or the zodiacal light could have been seen at all.
        From February 2021 it also names the satellites that really crossed that sky bright enough
        to be seen, the brightest with the time of its pass on the observer's clock, and says when
        some of them were a Starlink train; the 🛰 button moves the playhead to each pass in turn,
        brightest first, and turns the observer towards it. 🌠 and ☄ do the same for the next meteor
        and for the comet. Where the instrument reaches deeper than magnitude 9, the line says the
        stars are drawn only as far as this project's catalogue goes; and a rainbow is mentioned only
        when rain was reported.
        Whether any of it explains anything is the reader's conclusion, never the file's claim.</p>
    </div>

    <div class="group-doc">
      <h3>Sound</h3>
      <p>Half of what makes these accounts strange is the sound — most often its absence. A
        <strong>kind</strong> (hum, whistle, rumble, crackle, or none), a <strong>loudness</strong>
        and a <strong>pitch</strong>, keyframed on the same clock as the shape: a craft sitting
        silently on the ground and heard only as it lifts off is two keyframes.</p>
      <p>The sound is <em>synthesized</em> from that description, exactly as the shape is drawn from
        its own, at no cost in bundled audio. A recording that actually captured the sound can point
        at the audio file instead. Note the difference between the two silences: <em>none</em> means
        the observer reported hearing nothing; no sound track at all means nobody was asked.</p>
      <p>Loudness and pitch glide from one keyframe to the next; the kind and the audio file change
        at the keyframe. An audio file on another site must be served to any origin (CORS), and a
        browser plays nothing until the reader has clicked the page once.</p>
    </div>

    <div class="group-doc">
      <h3>Pictures</h3>
      <p>Photographs of the place, laid over the scene so the two can be compared. <strong>Add from
        an address</strong> takes a picture served to any origin (rr0.org's case pictures are);
        <strong>Add a file</strong> embeds one from your disk in the recording, with a word about its
        weight. Give it a <strong>name</strong>, a <strong>credit</strong> and its link, say whether it
        was <strong>taken at</strong> an instant of the observation and whether somebody <strong>drew
        on</strong> it, and set its starting <strong>opacity</strong> — the reader slides it afterwards.</p>
      <p>While this group is open the canvas belongs to the selected picture, its frame dashed in
        blue: <strong>drag</strong> on it to turn it (a drag outside it still turns the observer),
        <strong>wheel</strong> to change its field, or type
        <strong>heading</strong>, <strong>pitch</strong>, <strong>roll</strong> and <strong>vertical
        field</strong>, or <strong>use the observer's pose</strong> as a start. To measure rather than
        eyeball, <strong>Add a landmark</strong> arms two clicks: a detail on the picture, then the same
        detail in the render. Two landmarks turn the picture to fit them, three or more fit its field
        too; each has a name and a residual, green within a degree, orange within three, red beyond,
        and either end of one can be dragged. <strong>Adopt as the observer's pose</strong> then writes
        the fitted heading, pitch and roll into the pose at the playhead as a measurement, with its
        provenance. <strong>Street-level pictures nearby</strong> asks Panoramax for pictures taken
        within 300 m of the observer's spot, each arriving already lined up in heading.</p>
      <p><strong>Investigator's lines (KML, KMZ)</strong> reads a Google Earth file and adds what it
        draws: lines of sight, axes, outlines and markers, with their names, colours and heights. They
        are drawn over the scene and on the map in their own colour, dashed on the map, as the
        investigator's and not the reconstruction's: nothing is fitted to them, and each is credited to
        the file it came from until you say better. Rename one, set its <strong>source</strong>, or
        delete it; the player offers a button to hide them all. Names stand beside what they name, in the scene as on the map; the map widens to frame what lies near the observer (a line running off to the horizon is left to run off), and each source is listed in the credits. GPS tracks (<code>gx:Track</code>) are read as lines.</p>
      <p>A picture holds from one point only, so lining it up also records <em>where</em> it was
        lined up from: the observer's position at the playhead. Playing, it fades out as the observer
        walks away from that point (fully shown within 2 m, gone beyond 20 m) and back in as they
        return, rather than show a comparison that no longer holds.</p>
    </div>

    <div class="group-doc">
      <h3>Phenomenon</h3>
      <p>The object itself. Oval or polygon, colour, transparency, halo, <strong>brilliance</strong>
        (how dazzling it was — a light you cannot look at washes out the field around it, throws the
        spikes its aperture makes, and clips to white, which no halo does) and <strong>blur</strong>
        (how indistinct its edges looked). Several shapes can share one timeline — a craft, a
        trailing flame, a second object — each with its own name, and grouped, reordered or deleted
        from the canvas's own context menu.</p>
      <p><strong>Apparent width</strong>, <strong>real width</strong> and <strong>distance</strong>
        are three readings of one relation, kept in step: edit any one and one of the other two
        follows — the one <strong>Hold</strong> pins never moves. Only the angle is the recording's;
        the real width is derived, and the distance is where the scene draws the shape, a hypothesis
        to try rather than a statement. Through an eye at 60° across a 360-pixel canvas, one degree
        is exactly 6 pixels and the full Moon about 3 — so an object 3.5 m wide at 90 m is 13 pixels
        across, not the 90 an author reaches for unaided. Getting this wrong is the single most
        common way a reconstruction ends up false.</p>
      <p>That distance is never saved with the recording, and <strong>Withdraw the distance
        hypothesis</strong> takes it back. A shape drawn inside a larger visible one
        stands at that one's distance, just in front of it, so a light on a craft stays on the
        craft.</p>
      <p><strong>Sampling rate</strong> is how often the pointer is read while recording.</p>
      <p>Those are the group's <strong>Shapes</strong>: what the observer drew. Its
        <strong>Bodies</strong> are what the observer said those shapes were, in 3D: each body names
        the shapes it stands for and the model it is drawn as, a built-in shape, a model of the
        catalogue, or a glTF file at an address. The address can be relative to the recording's own
        file, so a <code>sighting.json</code> and the <code>craft.gltf</code> beside it work together
        from any page; its credit (name and licence) is required before it is drawn.
        <strong>+</strong> adds a body (and the interpretation, when the recording has none): it
        stands for the selected shape, in its direction, at the distance the scene draws it and as
        big as its apparent width makes it there, in a single keyframe at the playhead; on the ground
        at that distance when the line of sight goes into it first; with no shape, where the observer
        is looking. 🎯 turns the observer towards the body. A recording may hold only bodies: its
        last shape can be deleted. <strong>At</strong> the playhead, the body's position (from the
        observer, or in the world), size and attitude are shown as they are at that instant; editing
        one writes a keyframe there, which is how a body is given its movement: move the playhead,
        edit again. Such a keyframe states nothing else, so the body's light, flame and moving parts
        go on as before. With this part open, a body can also be taken on the picture itself: dragging
        it moves it by as much as the pointer turns (over the relief when it stands on the ground,
        at the same distance when it flies), and the wheel over it takes it nearer or further. The
        body on show is framed with handles: a corner sizes it as a whole, a side stretches it level,
        the top or bottom raises it, and the stem above turns it as the pointer goes left or right, and with Shift held pitches it
        as the pointer goes up or down and rolls it as it goes sideways.
        All of these write the same keyframe as the fields, which show where it went. A body's
        movement is stated in the file, and shown here. The picture draws the bodies, with the shapes
        beside them as outlines to read them against, whichever group is open, except in the Shapes
        part, where the shapes are drawn alone and in full.</p>
    </div>
    </div>
  </div>
</section>

<section class="band">
  <div class="wrap prose-wide">
    <h2>Point at anything and it names itself</h2>
    <p>Hovering the scene names what is under the pointer. A star gives its name, its magnitude and
      how high it stood — “Venus, mag −4, 8° above the horizon” answers a report of a bright light
      near the horizon on its own, where a bare name would not. The Sun, the Moon, the planets and
      any comet up that night answer the same way, and so does everything in the environment: a
      building, a tree, another observer.</p>
    <p>What the ground hides does not answer. A star behind a hill is as unseeable as one below the
      horizon, so neither is offered — a reconstruction is not a list of what is in the sky, it is
      what could have been seen from where the observer stood.</p>
  </div>
</section>

<section class="band">
  <div class="wrap">
    <h2>Rules worth knowing</h2>
    <div class="prose-wide">
      <ul class="plain">
        <li><strong>A keyframe is held, not faded.</strong> A shape left out of a later keyframe
          stays as it was; one whose first keyframe is at five seconds is already painted, in that
          state, from zero. To make something stop being visible, keyframe it at transparency 1.</li>
        <li><strong>Declared outranks deduced.</strong> “It went into a cloud” is stated by the
          observer, never worked out by geometry — this format describes an appearance on a field of
          view, not a position in space, so nothing in it <em>can</em> know whether cloud came
          between them.</li>
        <li><strong>Paused is paused.</strong> Falling rain, twinkling stars, lightning, lens flare,
          ambient sound — all stop with the player. A paused replay is one instant of a sighting;
          weather still going on over it would be your own room, not the observer's evening.</li>
        <li><strong>Out of sight, nothing runs.</strong> A scene scrolled past, or in a panel that is
          closed, draws and computes nothing, and a replay that was playing is paused. It is
          drawn again when it comes back, and the play button starts the replay again.</li>
        <li><strong>Nothing is invented.</strong> Where a record does not exist — before 1940 for
          the weather, before 1957 for satellites, orbital elements before 2021 — the field
          stays editable and the interface says which of the two it is.</li>
      </ul>
    </div>

    <div class="group-doc">
      <h3>File</h3>
      <p>The recording itself. <strong>Load JSON file</strong> and <strong>Or load from URL</strong>
        bring an existing recording in, and <strong>Export</strong> hands you the file. Under them,
        the same recording as JSON text, kept in step both ways: what you change in the form or on
        the render appears in it, and a text that parses becomes the recording as soon as you stop
        typing (the playhead stays where it was). A text that does not parse is flagged on its own
        line and changes nothing until it does.</p>
      <p>The editor knows the format: <kbd>Ctrl</kbd>+<kbd>Space</kbd> lists the keys an object can
        take, with what the model says of each, and the words a key accepts. It is fetched only the
        first time this group is opened, so it costs nothing to those who never leave the form.</p>
    </div>
  </div>
</section>

<section class="band">
  <div class="wrap">
    <h2>What Export gives you</h2>
    <div class="prose-wide">
      <p><strong>Export</strong> gives you a JSON file. That file <em>is</em> the whole recording —
        there is no account, no database, and no copy kept here. Host it wherever you like. What is
        in it, field by field, is on <a href="/docs/format/">the sighting file</a>'s page.</p>
      <p>What to do with it next has its own pages, with examples you can run and copy:
        <a href="/docs/share/">sharing an observation</a>, which is a link to send or two lines of
        HTML in a page of your own, and <a href="/docs/components/">the components</a>, if you want
        to choose which one that page loads.</p>
    </div>
  </div>
  </section>
`
  }

  private fr(): string {
    return `
<section class="band hero">
  <div class="wrap">
    <p class="eyebrow">L'éditeur</p>
    <h1>Enregistrer une observation.</h1>
    <p class="lede">Tout ce qui suit est en état de marche. Rien de ce que vous faites ici n'est
      envoyé nulle part : l'enregistrement n'existe que dans votre navigateur jusqu'à ce que vous
      appuyiez sur <strong>Exporter</strong>, qui vous remet un fichier JSON qui est le vôtre.</p>
  </div>
</section>

<section class="band">
  <div class="wrap">
    <div class="stage stage-padded">
      <rr0-sighting-editor id="editor"></rr0-sighting-editor>
    </div>
    <p class="small">Pour l'ouvrir sur un enregistrement existant : ajoutez <code>?sighting=</code>
      suivi d'une URL, ou du nom d'une <a href="/demos/">démo</a> (un nom qui n'en est pas une est
      cherché comme dossier de rr0.org, par son <code>sighting.json</code>) — par exemple
      <a id="sighting-edit" href="/edit/?sighting=Socorro"><code>/edit/?sighting=Socorro</code></a>,
      qui se rejoue à <a id="sighting-play" href="/play/?sighting=Socorro"><code>/play/?sighting=Socorro</code></a>.</p>
    <p class="small">L'adresse peut être le <code>case.json</code> d'un dossier : l'éditeur liste alors les enregistrements qu'il contient, les comptes rendus des observateurs et les lectures qu'on en fait, chacune un enregistrement à part, avec un sélecteur pour en ouvrir un, un bouton pour ajouter une lecture et un pour la supprimer, et un pour exporter le dossier et ce qui a changé en zip. <code>&amp;track=</code> nomme l'enregistrement sur lequel il s'ouvre.</p>
  </div>
</section>

<section class="band">
  <div class="wrap">
    <h2 id="manual">Trois gestes pour un premier enregistrement</h2>
    <ol class="steps">
      <li>
        <h3>Dire quand et où</h3>
        <p>Remplissez <strong>Moment</strong> et <strong>Lieu</strong>. C'est là que le ciel
          apparaît : le Soleil, la Lune et sa phase, les planètes, les étoiles de cette nuit-là — et
          le relevé météo de cette heure-là est cherché tout seul. Commencer par là, c'est dessiner
          sur le ciel réel plutôt que sur un canevas vide.</p>
      </li>
      <li>
        <h3>Dessiner</h3>
        <p>Ouvrez le groupe <strong>Phénomène</strong>. Choisissez <em>Ovale</em> ou <em>Polygone</em>,
          réglez couleur, transparence, halo, éclat et flou des contours. Les poignées sur le canevas
          en donnent la taille ; les sommets d'un polygone s'ajoutent, se déplacent et se
          suppriment un par un.</p>
      </li>
      <li>
        <h3>Enregistrer le mouvement</h3>
        <p>Appuyez sur <strong>Enregistrer</strong> et déplacez le curseur sur le canevas le long du
          trajet suivi par l'objet, puis <strong>Arrêter</strong>. La lecture le rejoue sur la durée
          <em>réelle</em> de l'observation : une observation de cinq minutes prend cinq minutes, pas
          la seconde qu'a duré le geste.</p>
      </li>
    </ol>
    <p class="small">Sous la barre de lecture, un trait marque chaque image clé de ce que le groupe
      ouvert modifie (les formes sélectionnées, l'observateur, la météo, le son ; toutes depuis les
      autres groupes), et un trait ambre plus haut chaque moment nommé. Un appui à quelques pixels de
      l'un d'eux tombe exactement dessus, la barre le nomme sous le pointeur, et
      <strong>◂◆</strong> / <strong>◆▸</strong> vont au précédent ou au suivant : on modifie ainsi
      une image clé existante au lieu d'en créer une nouvelle à quelques millisecondes.</p>
    <p class="small">Une bande d'étiquettes sous le rendu énumère tout ce que l'enregistrement
      affirme réellement — et rien d'autre. Cliquez-en une pour aller au champ dont elle vient. Une
      valeur fournie par une source de données plutôt que par vous est signalée comme telle.</p>
  </div>
</section>

<section class="band">
  <div class="wrap">
    <h2>Les dix groupes</h2>
    <p class="lede prose-wide">Un seul panneau s'ouvre à la fois, pour que le rendu reste à l'écran
      pendant que vous éditez.</p>

    <div class="group-docs">
      <div class="group-doc">
      <h3>Observation</h3>
      <p>Énoncer ce dont il s'agit :
        <strong>identifiant</strong>, <strong>description</strong>, <strong>mots-clés</strong>.
        L'identifiant est celui de ce compte rendu, le jour puis qui a vu
        (<code>1964-04-24-ZamoraLonnie</code>) ; un enregistrement ne nomme pas son dossier, c'est
        <a href="/docs/format/#several-observers-the-case">le dossier</a> qui nomme ses comptes rendus
        et donne à une page son sélecteur d'observateur.</p>
    </div>

    <div class="group-doc">
      <h3>Observateur</h3>
      <p>Qui a livré le récit — et, tout aussi important, <strong>à travers quoi il a
        observé</strong>. Un œil n'est pas un objectif : à l'œil nu un angle reste un angle, un
        appareil le projette en <code>f·tan θ</code>, et les deux dessinent des images réellement
        différentes. Choisissez un appareil et sa <strong>focale</strong>, son
        <strong>diaphragme</strong>, son <strong>temps de pose</strong> et sa <strong>mise au
        point</strong> deviennent accessibles — chacun désactivé là où l'appareil le fixait, car le
        propriétaire d'un appareil à mise au point fixe n'avait rien à choisir. Les instruments
        étrangers à la date de l'observation ne sont pas proposés, sauf celui que l'enregistrement
        nomme déjà, gardé et signalé.</p>
      <p>Le cadre d'un appareil est inscrit dans l'élément à ses propres proportions, bandes noires
        comprises, et son champ devient celui par défaut ; l'œil, ou un appareil de modèle inconnu,
        est dessiné en 16:9 avec un champ vertical de 60°. Changer d'instrument reprojette les formes :
        elles gardent leurs angles, donc se déplacent autant qu'elles changent de taille. Le temps de
        pose reste dans ce que permettait l'appareil (de 1/1000 à 8 s pour un appareil inconnu, 10 s
        pour un téléphone) ; seuls les reflex 24×36 ont une pose B, jusqu'à une heure. Une pose longue
        est dessinée d'emblée telle que la montrait le viseur, puis s'accumule en photographie à
        mesure que la scène se pose.</p>
      <p>Le <strong>roulis</strong> est ici et non avec le lieu, parce qu'il dit comment l'appareil
        était <em>tenu</em> — un appareil de travers, une tête penchée — et non où se tenait le
        observateur.</p>
    </div>

    <div class="group-doc">
      <h3>Lieu</h3>
      <p>Un compte rendu nomme un lieu, il ne donne pas de coordonnées. Tapez donc le nom et appuyez
        sur <strong>Localiser</strong> : latitude et longitude sont remplies par le géocodeur
        d'OpenStreetMap, tous les candidats restent listés, et en choisir un autre déplace le
        observateur. Ce qui est stocké est le nom <em>qualifié</em> qui a été résolu, pour qu'un lecteur
        ultérieur retombe au même endroit. Déplacez une coordonnée à la main et un nom venu d'une
        recherche est redérivé, ou effacé — un nom décrivant un endroit où l'observation n'a plus
        lieu serait une fausse déclaration écrite. Un nom que vous avez tapé vous-même est gardé tel
        quel et jamais remplacé, même si aucune recherche ne le trouve.</p>
      <p><strong>Cap</strong> est la direction regardée, <strong>Inclinaison</strong> de combien
        vers le haut ou le bas, et <strong>Altitude</strong> s'entend au-dessus du niveau de la mer,
        plancher fixé par la hauteur du sol à cet endroit : un observateur dans les Alpes n'est pas à
        0 m. Les sources de relief et d'imagerie se choisissent ici même, sous les coordonnées dont
        elles décrivent le sol.</p>
      <p>Position, cap et inclinaison s'écrivent à la tête de lecture, comme une image clé de la
        trajectoire de l'observateur : réglez-les à un autre moment et l'observateur se déplace ou se
        tourne entre les deux.</p>
      <p>La <strong>carte</strong> posée sur le rendu fait de même pour la position : cliquez sur le
        sol et l'observateur s'y tient à la tête de lecture, exactement comme si les deux coordonnées
        avaient été saisies. La molette zoome autour du pointeur, un glisser déplace le terrain, et
        <strong>+</strong>, <strong>−</strong> et <strong>⤢</strong> (retour au trajet entier) sont là
        pour qui n'a ni l'un ni l'autre.</p>
    </div>

    <div class="group-doc">
      <h3>Environnement</h3>
      <p>Ce qui se tenait autour de l'observateur, à une distance réelle vers l'est et vers le nord :
        bâtiments avec leurs étages et leurs fenêtres, arbres, lampadaires, véhicules, aéronefs —
        et <strong>d'autres observateurs</strong>. C'est la seule chose qui puisse mettre un nombre sur
        une distance : si l'objet est passé <em>derrière</em> ce hangar il était au moins aussi
        loin, <em>devant</em> cet arbre, au plus. Chaque croisement resserre d'un côté la largeur
        réelle de l'objet, pour tout l'enregistrement ; le résultat s'affiche sous la taille
        apparente, et dit « inconnue » quand rien ne croise sa ligne de visée — la réponse honnête
        pour la plupart des observations.</p>
      <p><strong>Plusieurs observateurs, et leurs points de vue.</strong> Un observateur placé ici peut porter
        l'URL de son <em>propre</em> enregistrement, et un clic droit sur lui dans la scène propose
        de le consulter — ce qui charge son récit et vous place là où il se tenait, regardant où il
        regardait. Deux personnes à cent mètres l'une de l'autre n'ont pas vu la même chose, et
        pouvoir passer de l'une à l'autre est ce qui fait cesser d'être une affirmation pour devenir
        quelque chose à vérifier. Le bouton <strong>🎯</strong> en fait la version réduite : il
        tourne l'observateur courant vers ce qui est sélectionné.</p>
      <p>Publiés ensemble, ces enregistrements deviennent le sélecteur d'observateur que voit un
        lecteur — voir <a href="/docs/format/#several-observers-the-case">le dossier</a> qui les liste.</p>
      <p>Un décor peut aussi <strong>se déplacer</strong> (un avion qui traverse le ciel, une
        voiture qui passe) et porter des <strong>feux</strong> aux cadences réelles et
        réglementaires : anticollision de 40 à 100 éclats par minute, feux de détresse de 60 à 120.
        Sur une pose longue, cette cadence est dessinée : les lampes fixes laissent des traits, les
        clignotantes des points à intervalles réguliers — c'est exactement ce qui distingue la photo
        d'un avion de ligne de celle d'un objet qui ne clignote pas.</p>
    </div>

    <div class="group-doc">
      <h3>Moment</h3>
      <p>Un début, une fin, une durée — et un <strong>fuseau horaire</strong>, qui est la règle et
        non le nombre. Choisissez le fuseau de l'observateur et le décalage est dérivé des règles de ce
        fuseau <em>à la date de l'observation</em> : Valensole en juillet 1965 donne UTC+1, pas
        l'UTC+2 d'aujourd'hui, la France n'ayant rétabli l'heure d'été qu'en 1976.</p>
      <p>Le fuseau est rempli d'après les coordonnées, et ne remplace jamais celui que vous avez
        choisi. Les frontières de fuseaux sont grossières (Montgomery, en Alabama, tombe dans
        America/Chicago, qui avait l'heure d'été en 1948 quand l'Alabama ne l'avait pas) : un décalage simple peut donc toujours
        être saisi par le choix <em>décalage saisi</em>. Un décalage qu'aucune horloge à cette longitude
        n'aurait pu suivre est signalé, l'heure solaire du méridien dans son infobulle. Modifier l'une
        des deux dates retire une durée explicite dès que les deux dates donnent une durée exacte à
        elles seules.</p>
      <p>Le bouton <strong>EDTF</strong> bascule les deux champs de date en texte, pour tout ce
        qu'un sélecteur de calendrier ne sait pas dire : une année seule, un mois, une heure sans
        date, et les qualificatifs <em>incertain</em> (<code>?</code>) et <em>approximatif</em>
        (<code>~</code>). La plupart des archives en ont besoin : sur 241 dossiers de rr0.org, 43 %
        n'énoncent qu'une année et 17 % seulement une date avec une heure.</p>
      <p><strong>Moments</strong> nomme l'instant de la tête de lecture (A, B, C… comme les croquis
        des enquêtes), avec une phrase de ce qui s'y passe. En choisir un dans la liste y va ;
        <strong>🎯</strong> retourne à celui affiché, ce que la liste ne peut pas faire une fois la
        lecture passée au-delà.</p>
    </div>

    <div class="group-doc">
      <h3>Météo</h3>
      <p>Le seul groupe qui ne soit pas un compte rendu. La météo est un fait mesurable en un lieu à
        un instant, et les deux groupes ci-dessus énoncent déjà les deux — elle est donc relevée
        dans ERA5, la réanalyse de l'ECMWF, et affichée <em>en lecture seule</em> au-dessus d'une
        ligne nommant le jeu de données et l'instant UTC exact décrit. Un mauvais fuseau horaire s'y
        voit avant de se voir dans le ciel.</p>
      <p>Décocher <strong>D'après les relevés</strong> rend les champs à l'observateur : les valeurs
        relevées restent comme point de départ, la source est retirée, et aucune consultation
        ultérieure ne peut les écraser. Un enregistrement qui nomme une source est rejoué tel qu'il
        a été composé et n'est jamais reconsulté : un dossier publié se lit à l'identique hors
        ligne.</p>
      <p>Une consultation écrit un point météo au début, à chaque heure pleine et à la fin de
        l'enregistrement, chacun là où se tient l'observateur à ce moment ; la piste est redisposée
        quand la durée de l'enregistrement change.</p>
      <p>Le groupe a trois onglets à lui, une partie ouverte à la fois comme les groupes eux-mêmes :
        <strong>Précipitations</strong> — leur type et leur intensité, et la case
        <strong>Orage</strong>, qui est là où un code météo signale un orage, à côté de la pluie et
        de la grêle, et qui allume les éclairs et le tonnerre à son vrai retard —
        <strong>Nuages</strong>, et <strong>Vent</strong>, la direction vers laquelle il souffle et
        sa force, qui est ce qui porte tout nuage sans vent propre.</p>
      <p>Les nuages sont la partie <strong>Nuages</strong> de ce groupe. Un ciel relevé
        arrive en trois couches, les bandes basse, moyenne et haute du relevé ; un ciel décrit par
        l'observateur en compte autant qu'il en a vu. Chaque nombre du panneau est écrit dans
        l'enregistrement dès qu'il est valide, et la première modification met la lecture en pause :
        rien n'est enregistré sous une tête de lecture qui bouge.</p>
      <p>La <strong>portée des modifications</strong> décide de quoi parle une modification.
        <em>Instant courant</em> écrit un point météo à la tête de lecture, ou met à jour celui qui
        s'y trouve : c'est ainsi qu'un ciel change pendant l'observation — régler la nappe au
        début, avancer, la régler à nouveau. <em>Toute l'observation</em> applique la seule
        propriété que vous changez à chaque point existant, en laissant les autres telles quelles,
        ce qu'il faut pour « c'était du cumulus, pas du stratus ».</p>
      <p><strong>Couche</strong> les liste par rang, type et base. <strong>Ajouter une couche</strong>
        pose une nappe de cumulus à moitié couvrante à 1 500 m, à remodeler ; <strong>Supprimer la
        couche</strong> retire celle qui est sélectionnée. Une couche garde son identité d'un point
        à l'autre : en ajouter une à 40 secondes la fait apparaître en fondu depuis le point
        précédent plutôt que d'un coup.</p>
      <p>Puis les champs propres à la couche : <strong>Type de nuage</strong> (cumulus, stratus,
        stratocumulus, cirrus, inconnu — il forme les sommets, et un cirrus est la nappe qui fait
        les halos), <strong>Base</strong> et <strong>Épaisseur</strong> en mètres au-dessus du sol de
        référence, <strong>Couverture</strong> en pourcentage du ciel réellement couvert,
        <strong>Taille des nuages</strong> comme largeur d'un nuage en mètres — indépendante de la
        couverture, si bien qu'un même pourcentage peut être beaucoup de petits nuages ou quelques
        gros — <strong>Densité</strong> (0 transparent à 2) et <strong>Obscurité</strong> (0 blanc à
        1). <strong>Direction</strong> et <strong>vitesse du vent de la couche</strong> servent à une
        nappe qui ne va pas comme le vent au sol, ce qui est le cas de la haute d'ordinaire ; vides,
        elles signifient le vent général. La <strong>graine du motif</strong> choisit un autre
        arrangement des mêmes nombres, quand celui qui est dessiné met un nuage là où le récit dit
        qu'il n'y en avait pas.</p>
      <p><strong>Nuages individuels</strong> sert à celui que le récit place : celui derrière lequel
        le phénomène est passé, celui qui était là et nulle part ailleurs. <strong>Ajouter un nuage
        individuel</strong> en pose un dans la couche, devant votre regard, à la base de la couche.
        Il est dessiné comme un nuage de la couche — même texture, mêmes bords — et ne diffère de
        ses voisins qu'en se tenant exactement où vous le dites, même avec la couverture de la
        couche à 0 %. <strong>Pointer le nuage</strong> tourne l'observateur vers lui.
        <strong>Supprimer ce nuage</strong> le retire.</p>
      <p>Cochez <strong>Sélectionner et déplacer les nuages dans le ciel</strong> et l'image
        elle-même devient la commande : cliquez un nuage pour le sélectionner, faites-le glisser pour
        le déplacer — dans le plan qui vous fait face, si bien qu'il garde sa distance pendant que
        son cap et son altitude suivent le pointeur, et il ne passe jamais sous le sol. Décochez, et
        les clics redeviennent ceux du lecteur. Les champs numériques font le reste, et le font
        exactement : <strong>position est</strong> et <strong>nord</strong> en mètres depuis le point
        de départ de l'observateur, sa propre <strong>base</strong>, son <strong>épaisseur</strong>, sa
        <strong>largeur</strong>, sa <strong>profondeur</strong> et sa <strong>rotation</strong>, sa
        <strong>densité</strong> et une <strong>obscurité</strong> qui, vide, est celle de la couche.
        Posez-le à deux instants et il dérive, grossit ou s'assombrit entre les deux ; par-dessus,
        il suit le vent de la couche comme tout autre nuage.</p>
      <p>Toute modification des nuages retire la météo au relevé : la source est abandonnée et
        aucune consultation ultérieure ne peut écraser ce que vous avez réglé. Recochez
        <strong>D'après les relevés</strong> et les trois couches du relevé reviennent, à la place des
        vôtres. La seule exception est l'<strong>alignement des cristaux</strong>, proposé sur une
        couche de cirrus seulement : aucun relevé météo ne le mesure, il reste donc modifiable avec
        ERA5. Des cristaux culbutant donnent un anneau nu ; des plaquettes à plat et des colonnes
        roulantes donnent parhélies, arcs et pilier.</p>
      <p>Dessous se trouve la ligne <strong>« Ciel : »</strong> — en lecture seule, et qui n'est même
        pas un relevé. Une pluie de météores est une position sur l'orbite terrestre et l'orbite
        d'une comète est un problème résolu : la date et le lieu suffisent à décider des deux. Elle
        énonce ce qu'il y avait d'autre dans ce coin de ciel : la pluie et son taux au-dessus du fond
        sporadique, la comète et sa magnitude, toute nova ou supernova dont la courbe de lumière
        relevée couvre cette nuit-là (le bouton 🌟 tourne l'observateur vers elle), si l'orbite basse
        était encore éclairée, si la Voie
        lactée ou la lumière zodiacale pouvaient seulement être vues. À partir de février 2021, elle
        nomme aussi les satellites qui ont réellement traversé ce ciel assez brillants pour être vus,
        le plus brillant avec l'heure de son passage à la montre de l'observateur, et dit quand certains
        formaient un train de Starlink ; le bouton 🛰 amène la tête de lecture sur chaque passage tour
        à tour, du plus brillant au plus faible, et tourne l'observateur vers lui. 🌠 et ☄ font de
        même pour le prochain météore et pour la comète. Quand l'instrument va plus loin que la
        magnitude 9, la ligne précise que les étoiles ne sont dessinées que jusqu'où va le catalogue
        de ce projet ; et un arc-en-ciel n'est mentionné que si de la pluie a été signalée.
        Que cela explique ou non quelque chose est la conclusion du lecteur, jamais l'affirmation du
        fichier.</p>
    </div>

    <div class="group-doc">
      <h3>Son</h3>
      <p>La moitié de ce qui rend ces récits étranges tient au son — le plus souvent à son absence.
        Un <strong>timbre</strong> (bourdonnement, sifflement, grondement, crépitement, ou aucun),
        une <strong>intensité</strong> et une <strong>hauteur</strong>, keyframés sur la même
        horloge que la forme : un engin posé silencieux au sol et entendu seulement au décollage,
        cela fait deux keyframes.</p>
      <p>Le son est <em>synthétisé</em> à partir de cette description, exactement comme la forme est
        dessinée à partir de la sienne, sans un octet d'audio embarqué. Un enregistrement qui a
        réellement capté le son peut pointer vers le fichier audio. Notez la différence entre les
        deux silences : <em>aucun</em> signifie que l'observateur a déclaré n'avoir rien entendu ;
        l'absence totale de piste sonore signifie que personne ne le lui a demandé.</p>
      <p>Intensité et hauteur glissent d'une image clé à l'autre ; le timbre et le fichier audio
        changent à l'image clé. Un fichier audio sur un autre site doit être servi à toute origine
        (CORS), et un navigateur ne joue rien tant que le lecteur n'a pas cliqué une fois dans la
        page.</p>
    </div>

    <div class="group-doc">
      <h3>Photos</h3>
      <p>Des photos des lieux, posées sur la scène pour comparer les deux. <strong>Ajouter depuis une
        adresse</strong> prend une photo servie à tout site (celles des dossiers de rr0.org le sont) ;
        <strong>Ajouter un fichier</strong> en embarque une de votre disque dans l'enregistrement, en
        vous disant son poids. Donnez-lui un <strong>nom</strong>, un <strong>crédit</strong> et son
        lien, dites si elle a été <strong>prise à</strong> un instant de l'observation et si quelqu'un a
        fait un <strong>dessin par-dessus</strong>, et réglez son <strong>opacité</strong> de départ — le
        lecteur la fera glisser ensuite.</p>
      <p>Tant que ce groupe est ouvert, le canvas appartient à la photo sélectionnée, son cadre en
        pointillés bleus : <strong>glissez</strong> dessus pour la tourner (glisser à côté tourne toujours
        l'observateur), <strong>molette</strong> pour son
        champ, ou saisissez <strong>cap</strong>, <strong>assiette</strong>, <strong>roulis</strong> et
        <strong>champ vertical</strong>, ou <strong>prenez la pose de l'observateur</strong> comme point de
        départ. Pour mesurer plutôt qu'estimer, <strong>Ajouter un repère</strong> arme deux clics : un
        détail sur la photo, puis le même détail dans le rendu. Deux repères tournent la photo pour les
        faire coïncider, trois ou plus ajustent aussi son champ ; chacun a un nom et un écart, vert
        jusqu'à un degré, orange jusqu'à trois, rouge au-delà, et chaque extrémité se déplace.
        <strong>Adopter comme pose de l'observateur</strong> écrit alors cap, assiette et roulis ajustés dans
        la pose au point de lecture, comme une mesure, avec sa provenance. <strong>Photos de rue à
        proximité</strong> demande à Panoramax les photos prises à moins de 300 m de l'observateur, chacune
        arrivant déjà recalée en cap.</p>
      <p><strong>Tracés d'enquêteur (KML, KMZ)</strong> lit un fichier Google Earth et ajoute ce qu'il
        dessine : lignes de visée, axes, contours et repères, avec leurs noms, couleurs et hauteurs. Ils
        sont affichés sur la scène et sur la carte dans leur couleur propre, en pointillés sur la carte,
        comme ceux de l'enquêteur et non de la reconstitution : rien n'est ajusté sur eux, et chacun est
        crédité au fichier d'où il vient tant que vous n'avez pas mieux à dire. Renommez-en un, indiquez sa
        <strong>source</strong>, ou supprimez-le ; le lecteur offre un bouton pour les masquer tous. Les noms s'affichent à côté de ce qu'ils nomment, sur la scène comme sur la carte ; la carte s'élargit pour cadrer ce qui est proche de l'observateur (une ligne qui file vers l'horizon est laissée filer), et chaque source figure dans les crédits. Les traces GPS (<code>gx:Track</code>) sont lues comme des lignes.</p>
      <p>Une photo ne vaut que depuis un point : la recaler enregistre donc aussi <em>d'où</em> elle a
        été recalée, la position de l'observateur à la tête de lecture. En lecture, elle s'efface en
        fondu quand l'observateur s'éloigne de ce point (entière à moins de 2 m, disparue au-delà de
        20 m) et revient quand il y retourne, plutôt que de montrer une comparaison qui ne tient plus.</p>
    </div>

    <div class="group-doc">
      <h3>Phénomène</h3>
      <p>L'objet lui-même. Ovale ou polygone, couleur, transparence, halo, <strong>éclat</strong>
        (à quel point il éblouissait — une lumière qu'on ne peut pas regarder délave le champ autour
        d'elle, projette les aigrettes du diaphragme et sature au blanc, ce qu'aucun halo ne fait)
        et <strong>flou</strong> (à quel point ses contours paraissaient indistincts). Plusieurs
        formes peuvent partager une même chronologie — un engin, une flamme qui traîne, un second
        objet — chacune avec son nom, groupées, réordonnées ou supprimées depuis le menu contextuel
        du canevas.</p>
      <p><strong>Largeur apparente</strong>, <strong>largeur réelle</strong> et
        <strong>distance</strong> sont trois lectures d'une même relation, tenues en accord : modifiez
        l'une et l'une des deux autres suit — celle que <strong>Maintenir</strong> retient ne bouge
        jamais. Seul l'angle appartient à l'enregistrement ; la largeur réelle en découle, et la
        distance est celle à laquelle la scène dessine la forme, une hypothèse à essayer plutôt qu'un
        énoncé. À l'œil nu sur 60° répartis sur un canevas de
        360 pixels, un degré fait exactement 6 pixels et la pleine Lune environ 3 — un objet de
        3,5 m à 90 m fait donc 13 pixels de large, et non les 90 vers lesquels va la main. S'y
        tromper est la première cause de reconstitution fausse.</p>
      <p>Cette distance n'est jamais enregistrée avec l'observation, et <strong>Retirer l'hypothèse
        de distance</strong> la reprend. Une forme dessinée dans une forme
        visible plus grande se tient à la distance de celle-ci, juste devant, pour qu'un feu sur un
        engin reste sur l'engin.</p>
      <p>La <strong>fréquence d'échantillonnage</strong> est la cadence à laquelle le curseur est lu
        pendant l'enregistrement.</p>
      <p>Voilà pour les <strong>Formes</strong> du groupe : ce que l'observateur a dessiné. Ses
        <strong>Corps</strong> sont ce que l'observateur a dit que ces formes étaient, en 3D : chaque
        corps désigne les formes qu'il représente et le modèle qui le dessine, une forme de base, un
        modèle du catalogue, ou un fichier glTF à une adresse. Cette adresse peut être relative au
        fichier de l'enregistrement : un <code>sighting.json</code> et le <code>craft.gltf</code> posé
        à côté fonctionnent ensemble depuis n'importe quelle page ; son crédit (nom et licence) est
        exigé avant qu'il soit dessiné. <strong>+</strong> ajoute un corps (et l'interprétation, si
        l'enregistrement n'en a pas) : il représente la forme sélectionnée, dans sa direction, à la
        distance où la scène la dessine et à la taille que sa largeur apparente donne là, en une
        seule image clé à la tête de lecture ; posé au sol à cette distance quand la ligne de visée y
        entre avant ; sans forme, là où l'observateur regarde. 🎯 tourne l'observateur vers le corps. Un
        enregistrement peut ne tenir que des corps : sa dernière forme se supprime.
        <strong>À</strong> la tête de lecture, la position du corps (depuis l'observateur, ou dans le
        monde), sa taille et son attitude sont affichées telles qu'elles sont à cet instant ; en
        modifier une écrit une image clé là, et c'est ainsi qu'un corps reçoit son mouvement :
        déplacer la tête de lecture, modifier de nouveau. Une telle image clé ne dit rien d'autre :
        la lumière, la flamme et les parties mobiles du corps continuent comme avant. Cette partie ouverte, un corps se prend aussi sur l'image : le glisser le
        déplace d'autant que le pointeur tourne (sur le relief s'il est au sol, à la même distance
        s'il vole), et la molette au-dessus de lui le rapproche ou l'éloigne. Le corps affiché
        est encadré de poignées : un coin le dimensionne en entier, un côté l'étire à l'horizontale,
        le haut ou le bas le grandit, et la tige au-dessus le tourne quand le pointeur va à gauche ou
        à droite ; avec Maj, elle le cabre quand le pointeur monte ou descend et le fait rouler
        quand il va de côté. Tout cela écrit la même image clé que les champs, qui montrent où il est allé. Le mouvement d'un corps est donné par le fichier, et
        affiché ici. L'image dessine les corps, avec les formes à côté en contours pour les
        confronter, quel que soit le groupe ouvert, sauf dans la partie Formes, où les formes sont
        dessinées seules et en entier.</p>
    </div>
    </div>
  </div>
</section>

<section class="band">
  <div class="wrap prose-wide">
    <h2>Pointez n'importe quoi, cela se nomme</h2>
    <p>Survoler la scène nomme ce qui est sous le curseur. Une étoile donne son nom, sa magnitude et
      sa hauteur — « Vénus, mag −4, 8° au-dessus de l'horizon » répond à lui seul à un signalement
      de lumière vive près de l'horizon, là où un nom seul ne répondrait pas. Le Soleil, la Lune, les
      planètes et toute comète levée cette nuit-là répondent de même, et tout l'environnement
      aussi : un bâtiment, un arbre, un autre observateur.</p>
    <p>Ce que le sol cache ne répond pas. Une étoile derrière une colline est aussi invisible qu'une
      étoile sous l'horizon : ni l'une ni l'autre n'est proposée — une reconstitution n'est pas la
      liste de ce qu'il y a dans le ciel, c'est ce qui pouvait être vu d'où se tenait l'observateur.</p>
  </div>
</section>

<section class="band">
  <div class="wrap">
    <h2>Quelques règles à connaître</h2>
    <div class="prose-wide">
      <ul class="plain">
        <li><strong>Un keyframe est tenu, pas fondu.</strong> Une forme absente d'un keyframe
          ultérieur reste dans son état ; une forme dont le premier keyframe est à cinq secondes est
          déjà peinte, dans cet état, dès zéro. Pour qu'une chose cesse d'être visible, posez-lui un
          keyframe à transparence 1.</li>
        <li><strong>L'énoncé l'emporte sur le déduit.</strong> « Il est entré dans un nuage » est
          énoncé par l'observateur, jamais calculé par la géométrie : ce format décrit une apparence
          dans un champ de vision, pas une position dans l'espace, donc rien en lui <em>ne peut</em>
          savoir si un nuage s'est interposé.</li>
        <li><strong>En pause, tout est en pause.</strong> Pluie qui tombe, scintillement des étoiles,
          éclairs, reflets d'objectif, ambiances sonores — tout s'arrête avec le lecteur. Une lecture
          en pause est un instant d'observation ; une météo qui continuerait par-dessus serait votre
          pièce, pas la soirée de l'observateur.</li>
        <li><strong>Hors de vue, rien ne tourne.</strong> Une scène qu'on a fait défiler, ou dans un
          panneau fermé, ne dessine ni ne calcule rien, et une lecture en cours est mise en pause.
          Elle est redessinée à son retour, et c'est le bouton de lecture qui relance la lecture.</li>
        <li><strong>Rien n'est inventé.</strong> Là où le relevé n'existe pas — avant 1940 pour la
          météo, avant 1957 pour les satellites, avant 2021 pour les éléments orbitaux —
          le champ reste modifiable et l'interface dit lequel des deux cas s'applique.</li>
      </ul>
    </div>

    <div class="group-doc">
      <h3>Fichier</h3>
      <p>L'enregistrement lui-même. <strong>Charger un fichier JSON</strong> et <strong>Ou charger
        depuis une URL</strong> font entrer un enregistrement existant, et <strong>Exporter</strong>
        vous remet le fichier. Dessous, le même enregistrement en texte JSON, tenu à jour dans les
        deux sens : ce que vous changez dans le formulaire ou sur le rendu y apparaît, et un texte
        qui s'analyse devient l'enregistrement dès que vous cessez de taper (la tête de lecture
        reste où elle était). Un texte qui ne s'analyse pas est signalé sur sa ligne et ne change
        rien tant qu'il ne s'analyse pas.</p>
      <p>L'éditeur connaît le format : <kbd>Ctrl</kbd>+<kbd>Espace</kbd> liste les clés qu'un objet
        peut prendre, avec ce que le modèle en dit, et les mots qu'une clé accepte. Il n'est chargé
        qu'à la première ouverture de ce groupe, donc il ne coûte rien à qui ne quitte pas le
        formulaire.</p>
    </div>
  </div>
</section>

<section class="band">
  <div class="wrap">
    <h2>Ce qu'Exporter vous remet</h2>
    <div class="prose-wide">
      <p><strong>Exporter</strong> vous remet un fichier JSON. Ce fichier <em>est</em>
        l'enregistrement complet : il n'y a ni compte, ni base de données, ni copie conservée ici.
        Hébergez-le où vous voulez. Ce qu'il contient, champ par champ, est sur la page du
        <a href="/docs/format/">fichier d'observation</a>.</p>
      <p>Ce que vous en faites ensuite a ses propres pages, avec des exemples à essayer et à
        copier : <a href="/docs/share/">partager une observation</a>, c'est-à-dire un lien à envoyer
        ou deux lignes de HTML dans votre page, et <a href="/docs/components/">les composants</a>,
        si vous voulez choisir celui que cette page charge.</p>
    </div>
  </div>
  </section>
`
  }

  private es(): string {
    return `
<section class="band hero">
  <div class="wrap">
    <p class="eyebrow">El editor</p>
    <h1>Registrar un avistamiento.</h1>
    <p class="lede">Todo lo que sigue funciona de verdad. Nada de lo que hagas aquí se envía a ningún
      sitio: el registro existe en tu navegador hasta que pulses <strong>Exportar</strong>, que te entrega
      un archivo JSON que es tuyo.</p>
  </div>
</section>

<section class="band">
  <div class="wrap">
    <div class="stage stage-padded">
      <rr0-sighting-editor id="editor"></rr0-sighting-editor>
    </div>
    <p class="small">Para abrirlo sobre un registro existente: añade <code>?sighting=</code> y una URL, o
      el nombre de una de <a href="/demos/">las demos</a> (un nombre que no sea ninguna de ellas se busca
      como caso de rr0.org, por su <code>sighting.json</code>); por ejemplo
      <a id="sighting-edit" href="/edit/?sighting=Socorro"><code>/edit/?sighting=Socorro</code></a>,
      que se reproduce en <a id="sighting-play" href="/play/?sighting=Socorro"><code>/play/?sighting=Socorro</code></a>.</p>
    <p class="small">La dirección puede ser el <code>case.json</code> de un caso: el editor lista entonces las grabaciones que contiene, los relatos de los observadores y las lecturas que se hacen de ellos, cada una una grabación aparte, con un selector para abrir una, un botón para añadir una lectura y otro para eliminarla, y otro para exportar el caso y lo que cambió en un zip. <code>&amp;track=</code> nombra la grabación en la que se abre.</p>
  </div>
</section>

<section class="band">
  <div class="wrap">
    <h2 id="manual">Tres gestos para un primer registro</h2>
    <ol class="steps">
      <li>
        <h3>Decir cuándo y dónde</h3>
        <p>Rellena <strong>Momento</strong> y <strong>Lugar</strong>. En ese momento aparece el
          cielo: el Sol, la Luna y su fase, los planetas, las estrellas de aquella noche; y el
          registro meteorológico de esa hora se obtiene por sí solo. Empezar por ahí significa dibujar
          sobre el cielo real y no sobre un lienzo vacío.</p>
      </li>
      <li>
        <h3>Dibujarlo</h3>
        <p>Abre el grupo <strong>Fenómeno</strong>. Elige <em>Óvalo</em> o <em>Polígono</em>, ajusta su
          color, su transparencia, su halo, lo deslumbrante que era y lo difuminados que parecían sus
          bordes. Arrastra sus tiradores sobre el lienzo para darle tamaño; los vértices de un polígono
          pueden añadirse, moverse y eliminarse uno a uno.</p>
      </li>
      <li>
        <h3>Grabar el movimiento</h3>
        <p>Pulsa <strong>Grabar</strong> y mueve el puntero sobre el lienzo siguiendo la trayectoria
          del objeto, y luego <strong>Detener</strong>. La reproducción lo repite a lo largo de la
          duración <em>real</em> de la observación: un avistamiento de cinco minutos dura cinco minutos,
          no el segundo que duró el gesto.</p>
      </li>
    </ol>
    <p class="small">Bajo la barra de reproducción, una marca señala cada fotograma clave de lo que
      edita el grupo abierto (las formas seleccionadas, el observador, el tiempo, el sonido; todos ellos
      desde los demás grupos), y una marca ámbar más alta cada momento con nombre. Una pulsación a pocos
      píxeles de una de ellas cae exactamente sobre ella, la barra la nombra bajo el puntero, y
      <strong>◂◆</strong> / <strong>◆▸</strong> van a la anterior o a la siguiente: así se modifica un
      fotograma clave existente en lugar de crear uno nuevo a pocos milisegundos de él.</p>
    <p class="small">Una fila de etiquetas bajo el render enumera todo lo que el registro afirma
      realmente, y solo eso. Haz clic en una para ir al campo del que procede. Un valor aportado por
      una fuente de datos y no por ti aparece marcado como tal.</p>
  </div>
</section>

<section class="band">
  <div class="wrap">
    <h2>Los diez grupos</h2>
    <p class="lede prose-wide">Se abre un solo panel a la vez, para que el render siga en pantalla
      mientras editas.</p>

    <div class="group-docs">
      <div class="group-doc">
      <h3>Observación</h3>
      <p>Indica de qué trata este registro: un
        <strong>ID</strong>, una <strong>Descripción</strong>, unas <strong>Etiquetas</strong>. El ID es
        el propio de este relato, el día y luego quién lo vio (<code>1964-04-24-ZamoraLonnie</code>); un
        registro no nombra su caso, es <a href="/docs/format/#several-observers-the-case">el caso</a>
        el que nombra sus relatos y da a una página su selector de observador.</p>
    </div>

    <div class="group-doc">
      <h3>Observador</h3>
      <p>Quién dio el relato y, no menos importante, <strong>a través de qué lo
        observó</strong>. Un ojo no es un objetivo: la visión a simple vista transforma un ángulo en un
        ángulo, una cámara lo transforma en <code>f·tan θ</code>, y ambos dibujan encuadres realmente
        distintos. Elige una cámara y quedan disponibles los campos <strong>Distancia focal</strong>,
        <strong>Apertura</strong>, <strong>Exposición</strong> y <strong>Enfocado a</strong>, cada uno desactivado donde el aparato lo fijaba, porque el dueño de una
        cámara compacta de foco fijo no tenía nada que elegir. Los instrumentos ajenos a la fecha de la
        observación quedan fuera de la lista, salvo el que el registro ya nombra, que se conserva y se
        señala.</p>
      <p>El encuadre de una cámara se inscribe en el elemento con sus propias proporciones, con bandas
        negras, y su campo pasa a ser el predeterminado; el ojo, o una cámara de modelo desconocido, se
        dibuja en 16:9 con un campo vertical de 60°. Cambiar de instrumento reproyecta las formas:
        conservan sus ángulos, así que se desplazan además de cambiar de tamaño. La exposición se
        mantiene dentro de lo que permitía el aparato (de 1/1000 a 8 s para una cámara desconocida,
        10 s para un teléfono); solo las réflex de 35 mm tienen posición B, hasta una hora. Una pose
        larga se dibuja de inmediato tal como la mostraba el visor, y luego se va completando en
        fotografía a medida que la escena se asienta.</p>
      <p>El <strong>Alabeo</strong> está aquí y no con el lugar, porque indica cómo se
        <em>sostenía</em> el aparato (una cámara torcida, una cabeza inclinada), no dónde estaba el
        observador.</p>
    </div>

    <div class="group-doc">
      <h3>Lugar</h3>
      <p>Un relato nombra un lugar, no da coordenadas. Así que escribe el nombre y pulsa
        <strong>Localizar</strong>: la latitud y la longitud se rellenan con el geocodificador de
        OpenStreetMap, todos los candidatos siguen en la lista, y elegir otro desplaza al observador. Lo
        que se guarda es el nombre <em>completo</em> que se resolvió, para que un lector posterior
        llegue al mismo punto. Mueve una coordenada a mano y un nombre procedente de una búsqueda se
        vuelve a derivar, o se borra: un nombre que describiera un sitio donde el avistamiento ya no
        está sería una afirmación falsa por escrito. Un nombre que tú mismo hayas escrito se conserva
        tal cual y nunca se sustituye, aunque ninguna búsqueda lo encuentre.</p>
      <p>La <strong>Orientación</strong> es la dirección hacia la que se mira, la <strong>Inclinación</strong>,
        cuánto hacia arriba o hacia abajo, y la <strong>Altitud</strong> se mide sobre el nivel del mar,
        con el suelo de ese lugar como mínimo: un observador en los Alpes no está a 0 m. Las fuentes de
        relieve y de imágenes se eligen aquí mismo, bajo las coordenadas cuyo terreno describen.</p>
      <p>Posición, rumbo e inclinación se escriben en el cabezal de reproducción, como un fotograma
        clave de la trayectoria del observador: ajústalos en otro momento y el observador se desplaza o
        gira entre ambos.</p>
      <p>El <strong>mapa</strong> sobre el render hace lo mismo con la posición: haz clic en el
        terreno y el observador se sitúa allí en el cabezal de reproducción, exactamente como si se
        hubieran escrito ambas coordenadas. La rueda hace zoom alrededor del puntero, un arrastre mueve
        el terreno, y <strong>+</strong>, <strong>−</strong> y <strong>⤢</strong> (volver a la
        trayectoria completa) están ahí para quien no tenga ni lo uno ni lo otro.</p>
    </div>

    <div class="group-doc">
      <h3>Entorno</h3>
      <p>Lo que había alrededor del observador, a una distancia real hacia el este y el norte:
        edificios con sus plantas y ventanas, árboles, farolas, vehículos, aeronaves y <strong>otros
        observadores</strong>. Es lo único que puede poner una cifra a una distancia: si el objeto pasó
        <em>por detrás</em> de ese hangar, estaba al menos así de lejos; si pasó <em>por delante</em>
        de ese árbol, como mucho. Cada cruce acota por un lado la anchura real del objeto para todo el
        registro; el resultado aparece bajo el tamaño aparente, y dice «desconocida» cuando nada cruza
        su línea de visión, que es la respuesta honesta para la mayoría de los avistamientos.</p>
      <p><strong>Varios observadores y sus puntos de vista.</strong> Un observador colocado aquí puede
        llevar la URL de su <em>propio</em> registro, y un clic derecho sobre él en la escena ofrece
        verlo: eso carga su relato y te sitúa donde él estaba, mirando hacia donde él miraba.
        Dos personas a cien metros una de otra no vieron lo mismo, y poder pasar de una a otra es lo que
        hace que eso deje de ser una afirmación y se convierta en algo que comprobar. El botón
        <strong>🎯</strong> hace la versión reducida de lo mismo: gira al observador actual hacia lo
        que esté seleccionado.</p>
      <p>Publicados juntos, esos registros se convierten en el selector de observador que recibe un
        lector: véase <a href="/docs/format/#several-observers-the-case">el caso</a> que los enumera.</p>
      <p>El decorado también puede <strong>moverse</strong> (un avión que cruza el cielo, un coche que
        pasa) y llevar <strong>luces</strong> con cadencias de destello reales y reglamentarias: balizas
        anticolisión de 40 a 100 por minuto, luces de emergencia de 60 a 120. En una exposición larga
        esa cadencia se dibuja: las lámparas fijas dejan líneas, las intermitentes dejan puntos a
        intervalos regulares, y así es exactamente como se distingue la fotografía de un avión de línea
        de la de algo que no parpadea.</p>
    </div>

    <div class="group-doc">
      <h3>Momento</h3>
      <p>Un inicio, un final, una duración y una <strong>Zona horaria</strong>, que es la regla y no
        la cifra. Elige la zona propia del observador y el desfase se deriva de las reglas de esa zona
        <em>en la fecha de la observación</em>: Valensole en julio de 1965 da UTC+1, no el UTC+2 de hoy,
        porque Francia no reintrodujo el horario de verano hasta 1976.</p>
      <p>La zona se rellena a partir de las coordenadas, y nunca sustituye a una que tú hayas
        elegido. Los límites de las zonas son toscos (Montgomery, Alabama, cae en America/Chicago, que
        tenía horario de verano en 1948 cuando Alabama no lo tenía), así que aún puede escribirse un
        simple desfase con la opción <em>desfase introducido</em>. Un desfase que ningún reloj a esa longitud habría
        podido llevar se señala, con la hora solar del meridiano en su información emergente. Editar
        cualquiera de las dos fechas elimina una duración explícita en cuanto ambas fechas dan por sí
        solas una duración exacta.</p>
      <p>El botón <strong>EDTF</strong> cambia ambos campos de fecha a texto, para todo lo que un
        selector de calendario no sabe decir: un año solo, un mes, una hora sin fecha, y los
        calificativos <em>incierto</em> (<code>?</code>) y <em>aproximado</em> (<code>~</code>). La
        mayoría de los archivos lo necesitan: de 241 casos de rr0.org, el 43 % indica solo un año y
        apenas el 17 % una fecha con hora.</p>
      <p><strong>Momentos</strong> nombra el instante del cabezal de reproducción (A, B, C…, como hacen
        los croquis de los casos), con una frase sobre lo que ocurre entonces. Elegir uno en la lista
        lleva hasta él; <strong>🎯</strong> vuelve al que se muestra, cosa que la lista no puede hacer
        una vez que la reproducción lo ha dejado atrás.</p>
    </div>

    <div class="group-doc">
      <h3>Meteorología</h3>
      <p>El único grupo que no es relato. El tiempo atmosférico es un hecho medible en un lugar y un
        instante, y los dos grupos anteriores ya indican ambos; por eso se consulta en ERA5, el
        reanálisis del ECMWF, y se muestra <em>en solo lectura</em> sobre una línea que nombra el
        conjunto de datos y el instante UTC exacto descrito. Una zona horaria equivocada se nota ahí
        antes de notarse en el cielo.</p>
      <p>Desmarcar <strong>Según los registros</strong> devuelve los campos al
        observador: los valores consultados se quedan como punto de partida, la fuente se retira, y
        ninguna consulta posterior puede sobrescribirlos. Un registro que nombra una fuente se reproduce
        exactamente como se compuso y nunca se vuelve a consultar, así que un caso publicado se lee
        igual sin conexión.</p>
      <p>Una consulta escribe un fotograma clave meteorológico al inicio, en cada hora en punto y al
        final del registro, cada uno allí donde está el observador en ese momento; la pista se vuelve a
        disponer cuando cambia la duración del registro.</p>
      <p>El grupo tiene tres pestañas propias, con una parte abierta a la vez como los propios grupos:
        <strong>Precipitación</strong> (su tipo y su intensidad, y la casilla
        <strong>Tormenta</strong>, que es donde un código meteorológico indica una tormenta eléctrica,
        junto a la lluvia y el granizo, y que activa los rayos y el trueno con su retardo real),
        <strong>Nubes</strong>, y <strong>Viento</strong>, la dirección hacia la que sopla y su
        velocidad, que es lo que arrastra toda nube que no tenga viento propio.</p>
      <p>Las nubes son la parte <strong>Nubes</strong> de este grupo. Un cielo consultado llega como
        tres capas, las bandas baja, media y alta del registro; un cielo descrito por el observador
        tiene tantas como vio. Cada número del panel se escribe en el registro en cuanto es válido, y la
        primera edición pone en pausa la reproducción, de modo que nada se consigna con el cabezal en
        movimiento.</p>
      <p><strong>Alcance de los cambios</strong> decide a qué se refiere una edición. <em>Instante actual</em> escribe un fotograma clave meteorológico en el cabezal de reproducción, o actualiza
        el que ya está ahí: así cambia un cielo durante la observación (ajustar la capa al inicio,
        avanzar, volver a ajustarla). <em>Toda la observación</em> aplica la única propiedad que
        cambias a todos los fotogramas clave existentes, dejando los demás como estaban, que es lo que se
        quiere para «era cúmulo, no estrato».</p>
      <p><strong>Capa</strong> las enumera por rango, tipo y base. <strong>Añadir capa</strong> coloca
        una capa de cúmulos a medio cubrir a 1 500 m para que la remodeles; <strong>Eliminar capa</strong> quita la seleccionada. Una capa conserva su identidad de un fotograma clave a
        otro, así que añadir una a los 40 segundos la hace aparecer en fundido desde el fotograma clave
        anterior en lugar de surgir de golpe.</p>
      <p>Luego vienen los campos propios de la capa: <strong>Tipo de nube</strong> (cúmulo, estrato,
        estratocúmulo, cirro, desconocido; da forma a las cimas, y un cirro es la capa que produce
        halos), <strong>Base</strong> y <strong>Espesor</strong> en metros sobre el terreno de
        referencia, <strong>Cobertura</strong> como el porcentaje de cielo que realmente cubre,
        <strong>Tamaño de las nubes</strong> como la anchura de una nube en metros (independiente de la
        cobertura, de modo que un mismo porcentaje puede ser muchas nubes pequeñas o unas pocas
        grandes), <strong>Densidad</strong> (de 0, transparente, a 2) y <strong>Oscuridad</strong> (de
        0, blanca, a 1). <strong>Dirección del viento de la capa</strong> y <strong>Velocidad del viento de la capa</strong>
        sirven para una capa que se mueve de forma distinta al viento en superficie, como suele hacer
        la alta; vacías, significan el viento general. <strong>Semilla del patrón</strong> elige otra
        disposición de los mismos números, cuando la dibujada pone una nube donde el relato dice que no
        la había.</p>
      <p><strong>Nubes individuales</strong> sirve para la que el relato sitúa: aquella tras la que
        pasó el fenómeno, la que estaba allí y en ningún otro sitio. <strong>Añadir nube individual</strong> coloca una en la capa, delante de donde miras, a la base de la capa.
        Se dibuja como una más de la capa (la misma textura, los mismos bordes) y solo se diferencia de
        sus vecinas en que está exactamente donde tú dices, incluso con la cobertura de la capa al
        0 %. <strong>Apuntar a la nube</strong> gira al observador hacia ella. <strong>Eliminar nube</strong> la quita.</p>
      <p>Marca <strong>Seleccionar y arrastrar nubes en el cielo</strong> y la propia imagen se
        convierte en el control: haz clic en una nube para seleccionarla, arrástrala para moverla (en
        el plano que tienes enfrente, de modo que conserva su distancia mientras su rumbo y su altitud
        siguen al puntero, y nunca baja por debajo del suelo). Desmárcalo y los clics vuelven a ser del
        reproductor. Los campos numéricos hacen el resto, y lo hacen con exactitud: <strong>Posición este</strong> y <strong>Posición norte</strong> en metros desde donde empezó el observador;
        <strong>Base de la nube</strong>, <strong>Espesor de la nube</strong>, <strong>Anchura de la nube</strong>,
        <strong>Profundidad de la nube</strong> y <strong>Rotación de la nube</strong>; <strong>Densidad de la nube</strong>, y una
        <strong>Oscuridad</strong> que, vacía, es la de la capa. Ponle dos fotogramas clave y deriva,
        crece o se oscurece entre ambos; además, se deja llevar por el viento de la capa como cualquier
        otra nube.</p>
      <p>Cualquier edición de nubes aparta el tiempo del registro meteorológico: la fuente se retira y
        ninguna consulta posterior puede sobrescribir lo que has ajustado. Vuelve a marcar
        <strong>Según los registros</strong> y regresan las tres capas del registro, en
        lugar de las tuyas. La única excepción es <strong>Alineación de los cristales</strong>, que
        solo se ofrece en una capa de cirros: ningún registro meteorológico la mide, así que sigue siendo
        editable con ERA5 seleccionado. Los cristales que dan tumbos producen un anillo desnudo; las
        placas horizontales y las columnas que ruedan producen parhelios, arcos y un pilar.</p>
      <p>Debajo está la línea <strong>«Cielo:»</strong>, en solo lectura, y que ni siquiera es una
        consulta. Una lluvia de meteoros es una posición en la órbita terrestre y la órbita de un cometa
        es un problema resuelto, así que la fecha y el lugar bastan para decidir ambas cosas. Indica qué
        más había en ese trozo de cielo: la lluvia y su tasa sobre el fondo esporádico, el cometa y su
        magnitud, cualquier nova o supernova cuya curva de luz registrada cubra esa noche (el botón 🌟
        gira al observador hacia ella), si la órbita baja
        seguía iluminada por el Sol, si la Vía Láctea o la luz zodiacal podían siquiera verse.
        A partir de febrero de 2021 también nombra los satélites que realmente cruzaron ese cielo con
        brillo suficiente para ser vistos, el más brillante con la hora de su paso en el reloj del
        observador, y dice cuándo algunos formaban un tren de Starlink; el botón 🛰 lleva el cabezal a
        cada paso por turno, del más brillante al más débil, y gira al observador hacia él. 🌠 y ☄
        hacen lo mismo con el siguiente meteoro y con el cometa. Cuando el instrumento alcanza más allá
        de la magnitud 9, la línea indica que las estrellas solo se dibujan hasta donde llega el
        catálogo de este proyecto; y un arcoíris solo se menciona si se registró lluvia.
        Que algo de ello explique algo es la conclusión del lector, nunca la afirmación del archivo.</p>
    </div>

    <div class="group-doc">
      <h3>Sonido</h3>
      <p>La mitad de lo que hace extraños estos relatos es el sonido, y muy a menudo su ausencia. Un
        <strong>tipo</strong> (zumbido, silbido, retumbo, crepitación o ninguno), un
        <strong>Volumen</strong> y un <strong>Tono</strong>, con fotogramas clave en el mismo reloj
        que la forma: un aparato posado en silencio en el suelo y que solo se oye al despegar son dos
        fotogramas clave.</p>
      <p>El sonido se <em>sintetiza</em> a partir de esa descripción, exactamente como la forma se
        dibuja a partir de la suya, sin coste alguno de audio incluido. Un registro que realmente captó
        el sonido puede apuntar en su lugar al archivo de audio. Observa la diferencia entre los dos
        silencios: <em>ninguno</em> significa que el observador declaró no haber oído nada; la ausencia
        total de pista sonora significa que nadie se lo preguntó.</p>
      <p>La intensidad y el tono se deslizan de un fotograma clave al siguiente; el tipo y el archivo
        de audio cambian en el fotograma clave. Un archivo de audio alojado en otro sitio debe servirse
        a cualquier origen (CORS), y un navegador no reproduce nada hasta que el lector ha hecho clic
        una vez en la página.</p>
    </div>

    <div class="group-doc">
      <h3>Fotos</h3>
      <p>Fotografías del lugar, superpuestas a la escena para poder comparar ambas. <strong>Añadir desde una dirección</strong> toma una imagen servida a cualquier origen (las de los casos de
        rr0.org lo están); <strong>Añadir un archivo</strong> incrusta una de tu disco en el registro,
        con un aviso sobre su peso. Dale un <strong>Nombre</strong>, un <strong>Crédito</strong> y su
        enlace, indica si fue tomada en un instante (<strong>Tomada en</strong>) de la observación y si alguien dibujó encima
        (<strong>Dibujo encima</strong>), y ajusta su <strong>Opacidad</strong> inicial: el lector la
        deslizará después.</p>
      <p>Mientras este grupo está abierto, el lienzo pertenece a la foto seleccionada, con su marco en
        azul discontinuo: <strong>arrastra</strong> sobre ella para girarla (un arrastre fuera de ella
        sigue girando al observador), usa la <strong>rueda</strong> para cambiar su campo, o escribe
        <strong>Rumbo</strong>, <strong>Cabeceo</strong>, <strong>Alabeo</strong> y <strong>Campo vertical</strong>, o pulsa <strong>Usar la pose del observador</strong> para partir de ella. Para
        medir en lugar de calcular a ojo, <strong>Añadir un punto de referencia</strong> prepara dos
        clics: un detalle en la foto y luego el mismo detalle en el render. Dos puntos de referencia
        giran la foto para ajustarla a ellos, tres o más ajustan también su campo; cada uno tiene un
        nombre y un residuo, verde hasta un grado, naranja hasta tres, rojo por encima, y cualquiera de
        sus extremos puede arrastrarse. <strong>Adoptar como pose del observador</strong> escribe
        entonces el rumbo, el cabeceo y el alabeo ajustados en la pose del cabezal de reproducción, como
        una medición, con su procedencia. <strong>Fotos a pie de calle cercanas</strong> pide a
        Panoramax las imágenes tomadas a menos de 300 m del punto del observador, cada una ya alineada en
        rumbo.</p>
      <p><strong>Trazos del investigador (KML, KMZ)</strong> lee un archivo de Google Earth y añade lo que
        dibuja: líneas de visión, ejes, contornos y marcadores, con sus nombres, colores y alturas. Se
        muestran sobre la escena y en el mapa con su propio color, discontinuos en el mapa, como del
        investigador y no de la reconstrucción: nada se ajusta a ellos, y cada uno se atribuye al archivo
        de donde viene mientras no diga algo mejor. Renombre uno, indique su <strong>fuente</strong> o
        elimínelo; el reproductor ofrece un botón para ocultarlos todos. Los nombres se muestran junto a lo que nombran, en la escena y en el mapa; el mapa se ensancha para encuadrar lo que queda cerca del observador (una línea que corre hasta el horizonte se deja correr) y cada fuente figura en los créditos. Las trazas GPS (<code>gx:Track</code>) se leen como líneas.</p>
      <p>Una foto solo vale desde un punto, así que alinearla registra también <em>desde dónde</em> se
        alineó: la posición del observador en el cabezal de reproducción. Durante la reproducción se
        desvanece cuando el observador se aleja de ese punto (visible del todo a menos de 2 m,
        desaparecida más allá de 20 m) y vuelve cuando regresa, en lugar de mostrar una comparación que
        ya no se sostiene.</p>
    </div>

    <div class="group-doc">
      <h3>Fenómeno</h3>
      <p>El objeto en sí. Óvalo o polígono, color, transparencia, halo, <strong>Brillo</strong> (lo
        deslumbrante que era: una luz que no se puede mirar lava el campo que la rodea, proyecta las
        puntas que produce su apertura y satura en blanco, cosa que ningún halo hace) y
        <strong>Desenfoque</strong> (lo difusos que parecían sus bordes). Varias formas pueden compartir
        una misma línea de tiempo (un aparato, una llama que lo sigue, un segundo objeto), cada una con
        su propio nombre, y agruparse, reordenarse o eliminarse desde el menú contextual del propio
        lienzo.</p>
      <p><strong>Anchura aparente</strong>, <strong>Anchura real</strong> y <strong>Distancia</strong>
        son tres lecturas de una misma relación, que se mantienen acordes: edita una cualquiera y una de
        las otras dos la sigue; la que fija <strong>Mantener</strong> nunca se mueve. Solo el ángulo
        pertenece al registro; la anchura real se deriva, y la distancia es aquella a la que la escena
        dibuja la forma, una hipótesis que probar y no una afirmación. A través de un ojo con 60° sobre
        un lienzo de 360 píxeles, un grado son exactamente 6 píxeles y la Luna llena unos 3; así, un
        objeto de 3,5 m de ancho a 90 m mide 13 píxeles, no los 90 que un autor dibujaría sin ayuda.
        Equivocarse en esto es la causa más común de que una reconstrucción acabe siendo falsa.</p>
      <p>Esa distancia nunca se guarda con el registro, y <strong>Retirar la hipótesis de distancia</strong> la anula. Una forma dibujada dentro de otra visible más grande
        se sitúa a la distancia de esta, justo delante, para que una luz de un aparato siga sobre el
        aparato.</p>
      <p><strong>Frecuencia de muestreo</strong> es la frecuencia con que se lee el puntero durante la
        grabación.</p>
      <p>Esas son las <strong>Formas</strong> del grupo: lo que dibujó el observador. Sus
        <strong>Cuerpos</strong> son lo que el observador dijo que eran esas formas, en 3D: cada cuerpo
        nombra las formas que representa y el modelo con que se dibuja, una forma integrada, un modelo
        del catálogo o un archivo glTF en una dirección. La dirección puede ser relativa al propio
        archivo del registro, de modo que un <code>sighting.json</code> y el <code>craft.gltf</code>
        situado a su lado funcionan juntos desde cualquier página; su crédito (nombre y licencia) es
        obligatorio antes de que se dibuje.
        <strong>+</strong> añade un cuerpo (y la interpretación, si el registro no tiene ninguna):
        representa la forma seleccionada, en su dirección, a la distancia a la que la escena la dibuja
        y tan grande como allí la hace su anchura aparente, en un único fotograma clave en el cabezal de
        reproducción; sobre el suelo a esa distancia cuando la línea de visión entra antes en él; sin
        forma, allí donde mira el observador. 🎯 gira al observador hacia el cuerpo. Un registro puede
        contener solo cuerpos: su última forma puede eliminarse. En el recuadro <strong>En</strong>, seguido del instante del cabezal de
        reproducción, la posición del cuerpo (desde el observador, o en el mundo), su tamaño y su
        actitud se muestran tal como son en ese instante; editar una escribe allí un fotograma clave, y
        así es como un cuerpo recibe su movimiento: mover el cabezal, editar de nuevo. Un fotograma clave
        así no indica nada más, de modo que la luz, la llama y las partes móviles del cuerpo siguen como
        antes. Con esta parte abierta, un cuerpo también puede tomarse en la propia imagen: arrastrarlo
        lo desplaza tanto como gira el puntero (sobre el relieve cuando está en el suelo, a la misma
        distancia cuando vuela), y la rueda sobre él lo acerca o lo aleja. El
        cuerpo mostrado queda enmarcado con tiradores: una esquina lo dimensiona entero, un lado lo
        estira en horizontal, la parte superior o inferior lo eleva, y el vástago de arriba lo gira
        cuando el puntero va a izquierda o derecha, y con Mayús pulsada lo cabecea
        cuando el puntero sube o baja y lo alabea cuando va de lado.
        Todo esto escribe el mismo fotograma clave que los campos, que muestran adónde fue. El
        movimiento de un cuerpo se indica en el archivo, y se muestra aquí. La imagen dibuja los
        cuerpos, con las formas a su lado como contornos para leerlos frente a ellas, sea cual sea el
        grupo abierto, salvo en la parte Formas, donde las formas se dibujan solas y enteras.</p>
    </div>
    </div>
  </div>
</section>

<section class="band">
  <div class="wrap prose-wide">
    <h2>Señala cualquier cosa y dirá su nombre</h2>
    <p>Pasar el puntero por la escena nombra lo que hay debajo. Una estrella da su nombre, su magnitud
      y a qué altura estaba: «Venus, mag −4, 8° sobre el horizonte» responde por sí sola a un informe
      de una luz brillante cerca del horizonte, donde un nombre a secas no lo haría. El Sol, la Luna,
      los planetas y cualquier cometa visible aquella noche responden igual, y también todo lo del
      entorno: un edificio, un árbol, otro observador.</p>
    <p>Lo que oculta el terreno no responde. Una estrella tras una colina es tan imposible de ver como
      una bajo el horizonte, así que no se ofrece ninguna de las dos: una reconstrucción no es una lista
      de lo que hay en el cielo, es lo que podía verse desde donde estaba el observador.</p>
  </div>
</section>

<section class="band">
  <div class="wrap">
    <h2>Reglas que conviene conocer</h2>
    <div class="prose-wide">
      <ul class="plain">
        <li><strong>Un fotograma clave se mantiene, no se funde.</strong> Una forma ausente de un
          fotograma clave posterior sigue como estaba; una cuyo primer fotograma clave está a los cinco
          segundos ya aparece pintada, en ese estado, desde cero. Para que algo deje de verse, ponle un
          fotograma clave con transparencia 1.</li>
        <li><strong>Lo declarado prevalece sobre lo deducido.</strong> «Entró en una nube» lo afirma el
          observador, nunca lo calcula la geometría: este formato describe una apariencia en un campo de
          visión, no una posición en el espacio, así que nada en él <em>puede</em> saber si una nube se
          interpuso entre ambos.</li>
        <li><strong>En pausa es en pausa.</strong> La lluvia que cae, el centelleo de las estrellas, los
          rayos, los destellos del objetivo, el sonido ambiente: todo se detiene con el reproductor. Una
          reproducción en pausa es un instante de un avistamiento; un tiempo que siguiera corriendo
          encima sería tu propia habitación, no la tarde del observador.</li>
        <li><strong>Fuera de la vista, nada funciona.</strong> Una escena que se ha dejado atrás, o en
          un panel cerrado, no dibuja ni calcula nada, y una reproducción en curso se pone en pausa.
          Se vuelve a dibujar cuando regresa, y el botón de reproducción reanuda la reproducción.</li>
        <li><strong>Nada se inventa.</strong> Donde no existe registro (antes de 1940 para el tiempo,
          antes de 1957 para los satélites, antes de 2021 para los elementos orbitales), el campo
          sigue siendo editable y la interfaz dice cuál de los dos casos es.</li>
      </ul>
    </div>

    <div class="group-doc">
      <h3>Archivo</h3>
      <p>El registro en sí. <strong>Cargar archivo JSON</strong> y <strong>O cargar desde una
        URL</strong> traen un registro existente, y <strong>Exportar</strong> te entrega el archivo.
        Debajo, el mismo registro como texto JSON, mantenido al día en los dos sentidos: lo que
        cambias en el formulario o en el render aparece en él, y un texto que se analiza pasa a ser
        el registro en cuanto dejas de teclear (el cabezal se queda donde estaba). Un texto que no
        se analiza se señala en su línea y no cambia nada mientras tanto.</p>
      <p>El editor conoce el formato: <kbd>Ctrl</kbd>+<kbd>Espacio</kbd> lista las claves que puede
        llevar un objeto, con lo que el modelo dice de cada una, y las palabras que admite una
        clave. Solo se descarga la primera vez que se abre este grupo, así que no cuesta nada a quien
        no sale del formulario.</p>
    </div>
  </div>
</section>

<section class="band">
  <div class="wrap">
    <h2>Lo que te entrega Exportar</h2>
    <div class="prose-wide">
      <p><strong>Exportar</strong> te entrega un archivo JSON. Ese archivo <em>es</em> el registro
        completo: no hay cuenta, ni base de datos, ni copia guardada aquí. Alójalo donde quieras. Lo que
        contiene, campo por campo, está en la página del <a href="/docs/format/">archivo de
        avistamiento</a>.</p>
      <p>Qué hacer después con él tiene sus propias páginas, con ejemplos que puedes ejecutar y copiar:
        <a href="/docs/share/">compartir una observación</a>, que es un enlace que enviar o dos líneas
        de HTML en una página tuya, y <a href="/docs/components/">los componentes</a>, si quieres
        elegir cuál carga esa página.</p>
    </div>
  </div>
  </section>
`
  }

  private it(): string {
    return `
<section class="band hero">
  <div class="wrap">
    <p class="eyebrow">L'editor</p>
    <h1>Registrare un avvistamento.</h1>
    <p class="lede">Tutto ciò che segue funziona davvero. Niente di ciò che fai qui viene inviato da
      nessuna parte: la registrazione esiste nel tuo browser finché non premi
      <strong>Esporta</strong>, che ti consegna un file JSON che è tuo.</p>
  </div>
</section>

<section class="band">
  <div class="wrap">
    <div class="stage stage-padded">
      <rr0-sighting-editor id="editor"></rr0-sighting-editor>
    </div>
    <p class="small">Per aprirlo su una registrazione esistente: aggiungi <code>?sighting=</code> e un
      URL, oppure il nome di una delle <a href="/demos/">demo</a> (un nome che non corrisponde a nessuna
      di esse viene cercato come caso di rr0.org, tramite il suo <code>sighting.json</code>); per esempio
      <a id="sighting-edit" href="/edit/?sighting=Socorro"><code>/edit/?sighting=Socorro</code></a>,
      che si riproduce in <a id="sighting-play" href="/play/?sighting=Socorro"><code>/play/?sighting=Socorro</code></a>.</p>
    <p class="small">L'indirizzo può essere il <code>case.json</code> di un caso: l'editor elenca allora le registrazioni che contiene, i resoconti degli osservatori e le letture che se ne fanno, ciascuna una registrazione a sé, con un selettore per aprirne una, un pulsante per aggiungere una lettura e uno per eliminarla, e uno per esportare il caso e ciò che è cambiato in uno zip. <code>&amp;track=</code> indica la registrazione su cui si apre.</p>
  </div>
</section>

<section class="band">
  <div class="wrap">
    <h2 id="manual">Tre gesti per una prima registrazione</h2>
    <ol class="steps">
      <li>
        <h3>Dire quando e dove</h3>
        <p>Compila <strong>Momento</strong> e <strong>Luogo</strong>. È in quel momento che compare
          il cielo: il Sole, la Luna e la sua fase, i pianeti, le stelle di quella notte; e i dati
          meteorologici di quell'ora vengono recuperati da soli. Cominciare da qui significa disegnare
          sul cielo reale invece che su una tela vuota.</p>
      </li>
      <li>
        <h3>Disegnarlo</h3>
        <p>Apri il gruppo <strong>Fenomeno</strong>. Scegli <em>Ovale</em> o <em>Poligono</em>,
          impostane il colore, la trasparenza, l'alone, quanto era abbagliante e quanto apparivano
          sfumati i contorni. Trascina le maniglie sulla tela per dargli le dimensioni; i vertici di
          un poligono si possono aggiungere, spostare ed eliminare uno per uno.</p>
      </li>
      <li>
        <h3>Registrare il movimento</h3>
        <p>Premi <strong>Registra</strong> e muovi il puntatore sulla tela lungo il percorso
          seguito dall'oggetto, poi <strong>Ferma</strong>. La riproduzione lo ripete sulla durata
          <em>reale</em> dell'osservazione: un avvistamento di cinque minuti dura cinque minuti, non il
          secondo che è durato il trascinamento.</p>
      </li>
    </ol>
    <p class="small">Sotto la barra di riproduzione, una tacca segna ogni fotogramma chiave di ciò che
      il gruppo aperto modifica (le forme selezionate, l'osservatore, il meteo, il suono; tutti dagli
      altri gruppi), e una tacca ambra più alta ogni momento con un nome. Un clic a pochi pixel da una di
      esse cade esattamente su di essa, la barra la nomina sotto il puntatore, e
      <strong>◂◆</strong> / <strong>◆▸</strong> vanno alla precedente o alla successiva: così si modifica
      un fotogramma chiave esistente invece di crearne uno nuovo a pochi millisecondi di distanza.</p>
    <p class="small">Una fila di etichette sotto il rendering elenca tutto ciò che la registrazione
      afferma davvero, e solo quello. Fai clic su una per andare al campo da cui proviene. Un valore
      fornito da una fonte di dati anziché da te è indicato come tale.</p>
  </div>
</section>

<section class="band">
  <div class="wrap">
    <h2>I dieci gruppi</h2>
    <p class="lede prose-wide">Si apre un solo pannello alla volta, così il rendering resta sullo
      schermo mentre modifichi.</p>

    <div class="group-docs">
      <div class="group-doc">
      <h3>Osservazione</h3>
      <p>Indica di cosa tratta questa registrazione:
        un <strong>ID</strong>, una <strong>Descrizione</strong>, delle <strong>Etichette</strong>. L'ID è quello
        proprio di questo resoconto, il giorno e poi chi ha visto (<code>1964-04-24-ZamoraLonnie</code>);
        una registrazione non nomina il suo caso, è <a href="/docs/format/#several-observers-the-case">il
        caso</a> a nominare i suoi resoconti e a dare a una pagina il suo selettore di osservatore.</p>
      <p><strong>Momenti</strong> dà un nome all'istante della testina di riproduzione (A, B, C…, come
        fanno gli schizzi dei casi), con una frase su ciò che accade in quel momento. Sceglierne uno
        nell'elenco porta lì; <strong>🎯</strong> torna a quello mostrato, cosa che l'elenco non può fare
        una volta che la riproduzione l'ha superato.</p>
    </div>

    <div class="group-doc">
      <h3>Osservatore</h3>
      <p>Chi ha fornito il resoconto e, altrettanto importante, <strong>attraverso che cosa ha
        osservato</strong>. Un occhio non è un obiettivo: la visione a occhio nudo trasforma un angolo in
        un angolo, una fotocamera lo trasforma in <code>f·tan θ</code>, e i due disegnano inquadrature
        davvero diverse. Scegli una fotocamera e diventano disponibili la sua <strong>Lunghezza focale</strong>, l'<strong>Apertura</strong>, l'<strong>Esposizione</strong> e il campo
        <strong>Messa a fuoco a</strong>, ciascuno disattivato dove l'apparecchio lo fissava,
        perché il proprietario di una compatta a fuoco fisso non aveva nulla da scegliere. Gli strumenti
        estranei alla data dell'osservazione sono esclusi dall'elenco, tranne quello che la
        registrazione nomina già, che viene mantenuto e segnalato.</p>
      <p>L'inquadratura di una fotocamera è inscritta nell'elemento con le sue proporzioni, bande nere
        comprese, e il suo campo diventa quello predefinito; l'occhio, o una fotocamera di modello
        sconosciuto, è disegnato in 16:9 con un campo verticale di 60°. Cambiare strumento riproietta le
        forme: mantengono i loro angoli, quindi si spostano oltre a cambiare dimensione. L'esposizione
        resta entro ciò che l'apparecchio consentiva (da 1/1000 a 8 s per una fotocamera sconosciuta,
        10 s per un telefono); solo le reflex 35 mm hanno la posa B, fino a un'ora. Una posa lunga viene
        disegnata subito come la mostrava il mirino, poi si riempie fino a diventare la fotografia man
        mano che la scena si assesta.</p>
      <p>Il <strong>Rollio</strong> sta qui e non con il luogo, perché dice come era
        <em>tenuto</em> l'apparecchio (una fotocamera storta, una testa inclinata), non dove si trovava
        l'osservatore.</p>
    </div>

    <div class="group-doc">
      <h3>Luogo</h3>
      <p>Un resoconto nomina un luogo, non fornisce coordinate. Quindi scrivi il nome e premi
        <strong>Localizza</strong>: latitudine e longitudine vengono compilate dal geocodificatore di
        OpenStreetMap, tutti i candidati restano in elenco, e sceglierne un altro sposta l'osservatore.
        Ciò che viene salvato è il nome <em>completo</em> che è stato risolto, così che un lettore
        successivo arrivi nello stesso punto. Sposta una coordinata a mano e un nome venuto da una
        ricerca viene ricavato di nuovo, o cancellato: un nome che descrivesse un posto in cui
        l'avvistamento non si trova più sarebbe una dichiarazione falsa messa per iscritto. Un nome che
        hai scritto tu viene mantenuto così com'è e mai sostituito, anche quando nessuna ricerca lo
        trova.</p>
      <p>L'<strong>Orientamento</strong> è la direzione verso cui si guarda, l'<strong>Inclinazione</strong>
        quanto in alto o in basso, e l'<strong>Altitudine</strong> è sul livello del mare, con l'altezza
        del terreno in quel punto come minimo: un osservatore sulle Alpi non sta a 0 m. Le fonti del
        rilievo e delle immagini si scelgono proprio qui, sotto le coordinate di cui descrivono il
        terreno.</p>
      <p>Posizione, direzione e inclinazione vengono scritte alla testina di riproduzione, come un
        fotogramma chiave della traccia dell'osservatore: impostale in un altro momento e
        l'osservatore si sposta o si gira tra i due.</p>
      <p>La <strong>mappa</strong> sopra il rendering fa lo stesso per la posizione: fai clic sul
        terreno e l'osservatore si mette lì alla testina di riproduzione, esattamente come se entrambe le
        coordinate fossero state digitate. La rotellina zooma attorno al puntatore, un trascinamento
        sposta il terreno, e <strong>+</strong>, <strong>−</strong> e <strong>⤢</strong> (di nuovo
        all'intero percorso) ci sono per chi non ha né l'una né l'altro.</p>
    </div>

    <div class="group-doc">
      <h3>Ambiente</h3>
      <p>Ciò che c'era intorno all'osservatore, a una distanza reale verso est e verso nord: edifici con
        i loro piani e le loro finestre, alberi, lampioni, veicoli, aeromobili e <strong>altri
        osservatori</strong>. È l'unica cosa che possa dare un numero a una distanza: se l'oggetto è
        passato <em>dietro</em> quell'hangar era almeno così lontano, se <em>davanti</em> a
        quell'albero, al massimo. Ogni incrocio restringe da un lato la larghezza reale dell'oggetto per
        tutta la registrazione; il risultato compare sotto la dimensione apparente, e dice «sconosciuta»
        quando nulla attraversa la sua linea di vista, che è la risposta onesta per la maggior parte
        degli avvistamenti.</p>
      <p><strong>Più osservatori, e i loro punti di vista.</strong> Un osservatore posizionato qui può
        portare l'URL della sua <em>propria</em> registrazione, e un clic destro su di lui nella scena
        propone di vederla: questo carica il suo resoconto e ti mette dove si trovava lui, guardando
        dove guardava lui. Due persone a cento metri l'una dall'altra non hanno visto la stessa cosa, e
        poter passare dall'una all'altra è ciò che trasforma un'affermazione in qualcosa da verificare.
        Il pulsante <strong>🎯</strong> fa la versione ridotta della stessa cosa: gira l'osservatore
        corrente verso ciò che è selezionato.</p>
      <p>Pubblicate insieme, quelle registrazioni diventano il selettore di osservatore che riceve un
        lettore: vedere <a href="/docs/format/#several-observers-the-case">il caso</a> che le elenca.</p>
      <p>Anche il decoro può <strong>muoversi</strong> (un aereo che attraversa il cielo, un'auto che
        passa) e portare <strong>luci</strong> con frequenze di lampeggio reali e regolamentari: luci
        anticollisione da 40 a 100 al minuto, luci di emergenza da 60 a 120. In una posa lunga quella
        frequenza viene disegnata: le lampade fisse lasciano linee, quelle lampeggianti punti a
        intervalli regolari, ed è esattamente così che la fotografia di un aereo di linea si distingue
        da quella di qualcosa che non lampeggia.</p>
    </div>

    <div class="group-doc">
      <h3>Momento</h3>
      <p>Un inizio, una fine, una durata e un <strong>Fuso orario</strong>, che è la regola e non il
        numero. Scegli il fuso dell'osservatore e lo scarto viene ricavato dalle regole di quel fuso
        <em>alla data dell'osservazione</em>: Valensole nel luglio 1965 dà UTC+1, non l'UTC+2 di oggi,
        perché la Francia ha reintrodotto l'ora legale solo nel 1976.</p>
      <p>Il fuso viene compilato a partire dalle coordinate, e non sostituisce mai quello che hai
        scelto tu. I confini dei fusi sono approssimativi (Montgomery, in Alabama, ricade in
        America/Chicago, che nel 1948 aveva l'ora legale quando l'Alabama non l'aveva), quindi si può
        ancora digitare un semplice scarto con la scelta <em>scarto inserito</em>. Uno scarto che nessun
        orologio a quella longitudine avrebbe potuto tenere viene segnalato, con l'ora solare del
        meridiano nel suo suggerimento. Modificare una delle due date elimina una durata esplicita non
        appena le due date danno da sole una durata esatta.</p>
      <p>Il pulsante <strong>EDTF</strong> trasforma entrambi i campi data in testo, per tutto ciò che
        un selettore di calendario non sa esprimere: un anno da solo, un mese, un'ora senza data, e i
        qualificatori <em>incerto</em> (<code>?</code>) e <em>approssimativo</em> (<code>~</code>). La
        maggior parte degli archivi ne ha bisogno: su 241 casi di rr0.org, il 43 % indica solo un anno e
        appena il 17 % una data con un'ora.</p>
    </div>

    <div class="group-doc">
      <h3>Meteo</h3>
      <p>L'unico gruppo che non è resoconto. Il meteo è un fatto misurabile in un luogo a un istante, e
        i due gruppi precedenti indicano già entrambi; per questo viene ricavato da ERA5, la rianalisi
        dell'ECMWF, e mostrato <em>in sola lettura</em> sopra una riga che nomina il set di dati e
        l'istante UTC esatto descritto. Un fuso orario sbagliato si vede lì prima di vedersi nel
        cielo.</p>
      <p>Togliere la spunta a <strong>Dai rilevamenti</strong> restituisce i campi
        all'osservatore: i valori ricavati restano come punto di partenza, la fonte viene tolta, e
        nessuna consultazione successiva può sovrascriverli. Una registrazione che nomina una fonte viene
        riprodotta esattamente come è stata composta e mai più consultata, così un caso pubblicato si
        legge identico anche offline.</p>
      <p>Una consultazione scrive un fotogramma chiave meteorologico all'inizio, a ogni ora esatta e alla
        fine della registrazione, ciascuno dove si trova l'osservatore in quel momento; la traccia viene
        ridisposta quando la durata della registrazione cambia.</p>
      <p>Il gruppo ha tre schede proprie, con una parte aperta alla volta come i gruppi stessi:
        <strong>Precipitazioni</strong> (il loro tipo e la loro intensità, e la casella
        <strong>Temporale</strong>, che è dove un codice meteorologico segnala un temporale, accanto
        alla pioggia e alla grandine, e che accende i fulmini e il tuono con il loro ritardo reale),
        <strong>Nuvole</strong>, e <strong>Vento</strong>, la direzione verso cui soffia e la sua
        velocità, che è ciò che trasporta ogni nuvola che non ha un vento proprio.</p>
      <p>Le nuvole sono la parte <strong>Nuvole</strong> di questo gruppo. Un cielo ricavato arriva
        come tre strati, le fasce bassa, media e alta dei dati; un cielo descritto dall'osservatore ne
        ha quanti lui ne ha visti. Ogni numero del pannello viene scritto nella registrazione non appena
        è valido, e la prima modifica mette in pausa la riproduzione, così nulla viene salvato con la
        testina in movimento.</p>
      <p><strong>Ambito delle modifiche</strong> decide a cosa si riferisce una modifica. <em>Istante corrente</em> scrive un fotogramma chiave meteorologico alla testina di riproduzione, o aggiorna
        quello che c'è già: è così che un cielo cambia durante l'osservazione (impostare lo strato
        all'inizio, spostarsi, impostarlo di nuovo). <em>Tutta l’osservazione</em> applica l'unica
        proprietà che cambi a tutti i fotogrammi chiave esistenti, lasciando le altre come erano, che
        è ciò che serve per «erano cumuli, non strati».</p>
      <p><strong>Strato</strong> li elenca per rango, tipo e base. <strong>Aggiungi strato</strong>
        mette uno strato di cumuli a metà copertura a 1 500 m da rimodellare; <strong>Elimina strato</strong> rimuove quello selezionato. Uno strato mantiene la sua identità da un fotogramma
        chiave all'altro, quindi aggiungerne uno a 40 secondi lo fa comparire in dissolvenza dal
        fotogramma chiave precedente invece che di colpo.</p>
      <p>Poi i campi propri dello strato: <strong>Tipo di nuvola</strong> (cumulo, strato,
        stratocumulo, cirro, sconosciuto; dà forma alle sommità, e un cirro è lo strato che produce gli
        aloni), <strong>Base</strong> e <strong>Spessore</strong> in metri sopra il terreno di
        riferimento, <strong>Copertura</strong> come percentuale di cielo realmente coperta,
        <strong>Dimensione delle nuvole</strong> come larghezza di una nuvola in metri (indipendente
        dalla copertura, così la stessa percentuale può essere molte nuvole piccole o poche grandi),
        <strong>Densità</strong> (da 0, trasparente, a 2) e <strong>Oscurità</strong> (da 0, bianca, a
        1). <strong>Direzione del vento dello strato</strong> e <strong>Velocità del vento dello strato</strong> servono per
        uno strato che si muove diversamente dal vento al suolo, come di solito fa quello alto; lasciate
        vuote indicano il vento generale. <strong>Seme del motivo</strong> sceglie un'altra
        disposizione degli stessi numeri, quando quella disegnata mette una nuvola dove il resoconto dice
        che non ce n'erano.</p>
      <p><strong>Nuvole singole</strong> serve per quella che il resoconto colloca: quella dietro cui è
        passato il fenomeno, quella che era lì e da nessun'altra parte. <strong>Aggiungi nuvola singola</strong> ne mette una nello strato, davanti a dove stai guardando, alla base dello
        strato. È disegnata come una delle nuvole dello strato (la stessa texture, gli stessi bordi) e si
        distingue dalle vicine solo perché sta esattamente dove dici tu, anche con la copertura dello
        strato allo 0 %. <strong>Punta la nuvola</strong> gira l'osservatore verso di essa.
        <strong>Elimina nuvola</strong> la rimuove.</p>
      <p>Spunta <strong>Seleziona e trascina le nuvole nel cielo</strong> e l'immagine stessa diventa
        il comando: fai clic su una nuvola per selezionarla, trascinala per spostarla (nel piano che
        ti sta di fronte, così mantiene la sua distanza mentre la sua direzione e la sua altitudine
        seguono il puntatore, e non scende mai sotto il suolo). Togli la spunta e i clic tornano al
        lettore. I campi numerici fanno il resto, e lo fanno con esattezza: <strong>Posizione est</strong> e <strong>Posizione nord</strong> in metri dal punto di partenza dell'osservatore, la sua
        <strong>Base della nuvola</strong>, il suo <strong>Spessore della nuvola</strong>, la sua <strong>Larghezza della nuvola</strong>, la
        sua <strong>Profondità della nuvola</strong> e la sua <strong>Rotazione della nuvola</strong>, la sua
        <strong>Densità della nuvola</strong> e un'<strong>Oscurità</strong> che, lasciata vuota, è quella dello
        strato. Assegnale due fotogrammi chiave e deriva, cresce o si scurisce tra i due; in più, segue il
        vento dello strato come ogni altra nuvola.</p>
      <p>Qualsiasi modifica delle nuvole sottrae il meteo ai dati: la fonte viene tolta e nessuna
        consultazione successiva può sovrascrivere ciò che hai impostato. Rimetti la spunta a
        <strong>Dai rilevamenti</strong> e i tre strati dei dati tornano, al posto dei tuoi.
        L'unica eccezione è <strong>Allineamento dei cristalli</strong>, proposto solo su uno strato
        di cirri: nessun dato meteorologico lo misura, quindi resta modificabile con ERA5 selezionato. I
        cristalli che ruotano in modo casuale danno un anello semplice; le piastrine orizzontali e le
        colonne che rotolano danno pareli, archi e una colonna di luce.</p>
      <p>Sotto c'è la riga <strong>«Cielo:»</strong>, in sola lettura, e che non è nemmeno una
        consultazione. Uno sciame meteorico è una posizione sull'orbita terrestre e l'orbita di una
        cometa è un problema risolto, quindi la data e il luogo bastano a decidere entrambe. Indica
        cos'altro c'era in quella porzione di cielo: lo sciame e il suo tasso sopra il fondo sporadico,
        la cometa e la sua magnitudine, qualsiasi nova o supernova la cui curva di luce registrata copra
        quella notte (il pulsante 🌟 gira l'osservatore verso di essa), se l'orbita bassa
        era ancora illuminata dal Sole, se la Via Lattea o la luce zodiacale potevano essere viste.
        Da febbraio 2021 nomina anche i satelliti che hanno davvero attraversato quel cielo abbastanza
        luminosi da essere visti, il più luminoso con l'ora del suo passaggio sull'orologio
        dell'osservatore, e dice quando alcuni formavano un treno di Starlink; il pulsante 🛰 porta la
        testina a ogni passaggio a turno, dal più luminoso, e gira l'osservatore verso di esso. 🌠 e ☄
        fanno lo stesso per la meteora successiva e per la cometa. Quando lo strumento arriva oltre la
        magnitudine 9, la riga precisa che le stelle sono disegnate solo fin dove arriva il catalogo di
        questo progetto; e un arcobaleno viene citato solo se è stata segnalata pioggia.
        Che qualcosa di tutto ciò spieghi qualcosa è la conclusione del lettore, mai l'affermazione del
        file.</p>
    </div>

    <div class="group-doc">
      <h3>Suono</h3>
      <p>Metà di ciò che rende strani questi resoconti è il suono, il più delle volte la sua assenza.
        Un <strong>tipo</strong> (ronzio, fischio, rombo, crepitio, o nessuno), un
        <strong>Volume</strong> e un <strong>Tono</strong>, con fotogrammi chiave sullo stesso
        orologio della forma: un velivolo posato in silenzio al suolo e udito solo al decollo sono due
        fotogrammi chiave.</p>
      <p>Il suono è <em>sintetizzato</em> a partire da quella descrizione, esattamente come la forma è
        disegnata a partire dalla sua, senza alcun costo di audio incluso. Una registrazione che ha
        davvero catturato il suono può invece puntare al file audio. Nota la differenza tra i due
        silenzi: <em>nessuno</em> significa che l'osservatore ha dichiarato di non aver sentito nulla;
        nessuna traccia sonora significa che nessuno gliel'ha chiesto.</p>
      <p>Volume e altezza scorrono da un fotogramma chiave al successivo; il tipo e il file audio
        cambiano al fotogramma chiave. Un file audio su un altro sito deve essere servito a qualsiasi
        origine (CORS), e un browser non riproduce nulla finché il lettore non ha fatto clic una volta
        sulla pagina.</p>
    </div>

    <div class="group-doc">
      <h3>Foto</h3>
      <p>Fotografie del luogo, sovrapposte alla scena per poterle confrontare. <strong>Aggiungi da un indirizzo</strong> prende un'immagine servita a qualsiasi origine (lo sono quelle dei casi di
        rr0.org); <strong>Aggiungi un file</strong> ne incorpora una dal tuo disco nella
        registrazione, con un'indicazione sul suo peso. Assegnale un <strong>Nome</strong>, dei
        <strong>Crediti</strong> e il loro link, di' se è stata scattata in un istante (<strong>Scattata a</strong>)
        dell'osservazione e se qualcuno ci ha disegnato sopra (<strong>Disegno sopra</strong>), e impostane
        l'<strong>Opacità</strong> iniziale: il lettore la farà scorrere in seguito.</p>
      <p>Finché questo gruppo è aperto, la tela appartiene alla foto selezionata, con la cornice
        tratteggiata in blu: <strong>trascina</strong> su di essa per girarla (un trascinamento fuori
        da essa gira ancora l'osservatore), usa la <strong>rotellina</strong> per cambiarne il campo,
        oppure digita <strong>Direzione</strong>, <strong>Beccheggio</strong>, <strong>Rollio</strong>
        e <strong>Campo verticale</strong>, oppure premi <strong>Usa la posa dell'osservatore</strong> per
        partire da quella. Per misurare invece di andare a occhio, <strong>Aggiungi un punto di riferimento</strong> prepara due clic: un dettaglio sulla foto, poi lo stesso dettaglio nel
        rendering. Due punti di riferimento girano la foto per farli coincidere, tre o più ne adattano
        anche il campo; ciascuno ha un nome e un residuo, verde entro un grado, arancione entro tre,
        rosso oltre, e ciascuna delle sue estremità si può trascinare. <strong>Adotta come posa dell'osservatore</strong> scrive allora direzione, beccheggio e rollio adattati nella posa alla
        testina di riproduzione, come una misura, con la sua provenienza. <strong>Foto stradali nei dintorni</strong> chiede a Panoramax le immagini scattate entro 300 m dal punto dell'osservatore,
        ciascuna già allineata in direzione.</p>
      <p><strong>Tracciati dell'investigatore (KML, KMZ)</strong> legge un file Google Earth e aggiunge ciò
        che disegna: linee di vista, assi, contorni e segnaposto, con i loro nomi, colori e altezze. Sono
        mostrati sulla scena e sulla mappa nel loro colore, tratteggiati sulla mappa, come
        dell'investigatore e non della ricostruzione: nulla vi si adatta, e ciascuno è attribuito al file da
        cui proviene finché non si dice di meglio. Rinominane uno, indica la sua <strong>fonte</strong> o
        eliminalo; il lettore offre un pulsante per nasconderli tutti. I nomi compaiono accanto a ciò che nominano, sulla scena come sulla mappa; la mappa si allarga per inquadrare ciò che è vicino all'osservatore (una linea che fila verso l'orizzonte è lasciata filare) e ogni fonte figura nei crediti. Le tracce GPS (<code>gx:Track</code>) sono lette come linee.</p>
      <p>Una foto vale da un solo punto, quindi allinearla registra anche <em>da dove</em> è stata
        allineata: la posizione dell'osservatore alla testina di riproduzione. Durante la riproduzione
        svanisce in dissolvenza quando l'osservatore si allontana da quel punto (piena entro 2 m,
        scomparsa oltre 20 m) e ricompare quando lui ritorna, invece di mostrare un confronto che non
        regge più.</p>
    </div>

    <div class="group-doc">
      <h3>Fenomeno</h3>
      <p>L'oggetto stesso. Ovale o poligono, colore, trasparenza, alone, <strong>Brillantezza</strong>
        (quanto era abbagliante: una luce che non si riesce a guardare sbiadisce il campo intorno a sé,
        proietta le punte create dal diaframma e satura al bianco, cosa che nessun alone fa) e
        <strong>Sfocatura</strong> (quanto indistinti apparivano i contorni). Più forme possono
        condividere una stessa linea temporale (un velivolo, una fiamma che lo segue, un secondo
        oggetto), ciascuna con il proprio nome, e possono essere raggruppate, riordinate o eliminate dal
        menu contestuale della tela stessa.</p>
      <p><strong>Larghezza apparente</strong>, <strong>Larghezza reale</strong> e
        <strong>Distanza</strong> sono tre letture di una stessa relazione, tenute in accordo:
        modificane una qualsiasi e una delle altre due la segue; quella fissata da
        <strong>Mantieni</strong> non si muove mai. Solo l'angolo appartiene alla registrazione; la
        larghezza reale ne deriva, e la distanza è quella a cui la scena disegna la forma, un'ipotesi da
        provare e non un'affermazione. Attraverso un occhio con 60° su una tela di 360 pixel, un grado
        corrisponde esattamente a 6 pixel e la Luna piena a circa 3; così un oggetto largo 3,5 m a 90 m
        misura 13 pixel, non i 90 che un autore disegnerebbe senza aiuto. Sbagliare su questo è il modo
        più comune in cui una ricostruzione finisce per essere falsa.</p>
      <p>Quella distanza non viene mai salvata con la registrazione, e <strong>Ritira l'ipotesi di distanza</strong> la annulla. Una forma disegnata dentro una forma visibile più grande
        sta alla distanza di quest'ultima, appena davanti, così una luce su un velivolo resta sul
        velivolo.</p>
      <p><strong>Frequenza di campionamento</strong> è quanto spesso viene letto il puntatore durante la
        registrazione.</p>
      <p>Queste sono le <strong>Forme</strong> del gruppo: ciò che l'osservatore ha disegnato. I suoi
        <strong>Corpi</strong> sono ciò che l'osservatore ha detto che quelle forme erano, in 3D: ogni
        corpo nomina le forme che rappresenta e il modello con cui è disegnato, una forma predefinita, un
        modello del catalogo o un file glTF a un indirizzo. L'indirizzo può essere relativo al file della
        registrazione stessa, così un <code>sighting.json</code> e il <code>craft.gltf</code> accanto a
        esso funzionano insieme da qualsiasi pagina; il suo credito (nome e licenza) è obbligatorio
        prima che venga disegnato.
        <strong>+</strong> aggiunge un corpo (e l'interpretazione, quando la registrazione non ne ha):
        rappresenta la forma selezionata, nella sua direzione, alla distanza a cui la scena la disegna e
        grande quanto la rende lì la sua larghezza apparente, in un unico fotogramma chiave alla testina
        di riproduzione; sul terreno a quella distanza quando la linea di vista vi entra prima; senza
        forma, dove l'osservatore sta guardando. 🎯 gira l'osservatore verso il corpo. Una registrazione
        può contenere solo corpi: la sua ultima forma si può eliminare. Nel riquadro <strong>A</strong>, seguito dall'istante della testina di
        riproduzione, la posizione del corpo (dall'osservatore, o nel mondo), la dimensione e l'assetto
        sono mostrati come sono in quell'istante; modificarne uno scrive lì un fotogramma chiave, ed è
        così che un corpo riceve il suo movimento: spostare la testina, modificare di nuovo. Un tale
        fotogramma chiave non indica nient'altro, quindi la luce, la fiamma e le parti mobili del corpo
        proseguono come prima. Con questa parte aperta, un corpo si può anche prendere sull'immagine
        stessa: trascinarlo lo sposta di quanto gira il puntatore (sul rilievo quando sta al suolo, alla
        stessa distanza quando vola), e la rotellina sopra di esso lo avvicina o lo allontana. Il
        corpo mostrato è incorniciato da maniglie: un angolo lo ridimensiona nel suo insieme, un lato lo
        allunga in orizzontale, la parte superiore o inferiore lo alza, e lo stelo in alto lo gira quando
        il puntatore va a sinistra o a destra, e con Maiusc premuto lo fa beccheggiare
        quando il puntatore sale o scende e rollare quando va di lato.
        Tutto ciò scrive lo stesso fotogramma chiave dei campi, che mostrano dove è andato. Il movimento
        di un corpo è indicato nel file, e mostrato qui. L'immagine disegna i corpi, con le forme
        accanto come contorni con cui confrontarli, qualunque sia il gruppo aperto, tranne nella parte
        Forme, dove le forme sono disegnate da sole e per intero.</p>
    </div>
    </div>
  </div>
</section>

<section class="band">
  <div class="wrap prose-wide">
    <h2>Indica qualsiasi cosa e dirà il suo nome</h2>
    <p>Passare sopra la scena nomina ciò che sta sotto il puntatore. Una stella dà il suo nome, la sua
      magnitudine e quanto era alta: «Venere, mag −4, 8° sopra l'orizzonte» risponde da sola a una
      segnalazione di una luce brillante vicino all'orizzonte, dove un semplice nome non lo farebbe. Il
      Sole, la Luna, i pianeti e qualsiasi cometa visibile quella notte rispondono allo stesso modo, e
      così tutto ciò che è nell'ambiente: un edificio, un albero, un altro osservatore.</p>
    <p>Ciò che il terreno nasconde non risponde. Una stella dietro una collina è invisibile quanto una
      sotto l'orizzonte, quindi nessuna delle due viene proposta: una ricostruzione non è un elenco di
      ciò che c'è nel cielo, è ciò che poteva essere visto da dove si trovava l'osservatore.</p>
  </div>
</section>

<section class="band">
  <div class="wrap">
    <h2>Regole da conoscere</h2>
    <div class="prose-wide">
      <ul class="plain">
        <li><strong>Un fotogramma chiave si mantiene, non sfuma.</strong> Una forma assente da un
          fotogramma chiave successivo resta com'era; una il cui primo fotogramma chiave è a cinque
          secondi è già dipinta, in quello stato, da zero. Per far smettere di vedere qualcosa, dagli
          un fotogramma chiave con trasparenza 1.</li>
        <li><strong>Il dichiarato prevale sul dedotto.</strong> «È entrato in una nuvola» è affermato
          dall'osservatore, mai calcolato dalla geometria: questo formato descrive un'apparenza in un
          campo visivo, non una posizione nello spazio, quindi nulla in esso <em>può</em> sapere se una
          nuvola si è frapposta.</li>
        <li><strong>In pausa è in pausa.</strong> La pioggia che cade, lo scintillio delle stelle, i
          fulmini, i riflessi dell'obiettivo, il suono ambientale: tutto si ferma con il lettore. Una
          riproduzione in pausa è un istante di un avvistamento; un meteo che continuasse sopra di esso
          sarebbe la tua stanza, non la serata dell'osservatore.</li>
        <li><strong>Fuori dalla vista, nulla gira.</strong> Una scena che è stata superata scorrendo, o
          in un pannello chiuso, non disegna né calcola nulla, e una riproduzione in corso viene messa
          in pausa. Viene ridisegnata al ritorno, e il pulsante di riproduzione riavvia la riproduzione.</li>
        <li><strong>Nulla è inventato.</strong> Dove i dati non esistono (prima del 1940 per il meteo,
          prima del 1957 per i satelliti, prima del 2021 per gli elementi orbitali), il campo
          resta modificabile e l'interfaccia dice quale dei due casi si applica.</li>
      </ul>
    </div>

    <div class="group-doc">
      <h3>File</h3>
      <p>La registrazione stessa. <strong>Carica file JSON</strong> e <strong>Oppure carica da
        URL</strong> portano dentro una registrazione esistente, ed <strong>Esporta</strong> ti
        consegna il file. Sotto, la stessa registrazione come testo JSON, tenuta allineata nei due
        sensi: ciò che cambi nel modulo o nel rendering vi compare, e un testo che si interpreta
        diventa la registrazione appena smetti di digitare (il cursore di lettura resta dov'era). Un
        testo che non si interpreta è segnalato sulla sua riga e non cambia nulla finché non lo fa.</p>
      <p>L'editor conosce il formato: <kbd>Ctrl</kbd>+<kbd>Spazio</kbd> elenca le chiavi che un
        oggetto può avere, con ciò che il modello dice di ciascuna, e le parole che una chiave
        accetta. Viene scaricato solo alla prima apertura di questo gruppo, quindi non costa nulla a
        chi non lascia il modulo.</p>
    </div>
  </div>
</section>

<section class="band">
  <div class="wrap">
    <h2>Che cosa ti consegna Esporta</h2>
    <div class="prose-wide">
      <p><strong>Esporta</strong> ti consegna un file JSON. Quel file <em>è</em> l'intera
        registrazione: non c'è nessun account, nessun database e nessuna copia conservata qui. Ospitalo
        dove vuoi. Ciò che contiene, campo per campo, è sulla pagina del <a href="/docs/format/">file
        di avvistamento</a>.</p>
      <p>Cosa farne dopo ha le sue pagine, con esempi che puoi eseguire e copiare:
        <a href="/docs/share/">condividere un'osservazione</a>, cioè un link da inviare o due righe di
        HTML in una tua pagina, e <a href="/docs/components/">i componenti</a>, se vuoi scegliere
        quale carica quella pagina.</p>
    </div>
  </div>
  </section>
`
  }
}
