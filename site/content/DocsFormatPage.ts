import { DocsSection } from "./DocsSection.js"
import type { PageMeta, Said, SiteLanguage } from "../SitePage.js"

/**
 * "What is in the file?" — the recording format, field by field.
 *
 * Its own page because every other one refers to it: the editor exports one, the player and the
 * components read one, sharing is putting one at an address. It used to be the second half of
 * creating an observation, which left the others nothing to link to but a page about something else.
 */
export class DocsFormatPage extends DocsSection {

  readonly meta: PageMeta = {
    slug: "docs/format",
    navLabel: { en: "The sighting file", fr: "Le fichier d'observation" },
    title: { en: "The sighting file", fr: "Le fichier d'observation" },
    description: {
      en: "What a recording file holds, field by field: the observation, what was seen, the weather "
        + "and its clouds, the case that lists several observers, and a whole working example to type in.",
      fr: "Ce que contient un fichier d'enregistrement, champ par champ : l'observation, ce qui a été "
        + "vu, la météo et ses nuages, le dossier qui liste plusieurs observateurs, et un exemple entier à taper."
    },
    asideFromNav: true
  }

  private readonly lede: Said<string> = {
    en: "One recording is one JSON file, whether the editor wrote it or you did. This is what it can "
      + "hold, and what each field means.",
    fr: "Un enregistrement est un fichier JSON, que l'éditeur l'ait écrit ou vous. Voici ce qu'il peut "
      + "contenir, et ce que veut dire chaque champ."
  }

  /** The whole of `public/demo-data/example-minimal.json`, read at build time and quoted verbatim
   * below — see SiteBuilder.pages for why it is passed in rather than written out here. */
  constructor(private readonly example: string) {
    super()
  }

  render(language: SiteLanguage): string {
    return this.hero(language, this.meta.title, this.lede) + (language === "fr" ? this.fr() : this.en())
  }

  /**
   * Shows every JSON excerpt on the page — the whole example and each fragment — in the site's code
   * view: coloured, numbered, foldable, and checked. Read-only, because nothing here plays what
   * would be typed (the Player is where a recording is changed and seen at once), but each still
   * lists, on demand, every key that could go where the caret stands.
   *
   * The <pre> stays until CodeMirror arrives and stays for good if it never does, so a reader
   * without it still has the excerpts.
   */
  script(): string {
    return `const excerpts = [...document.querySelectorAll("pre[data-json]")]
if (excerpts.length > 0) {
  void (async () => {
    try {
      const { JsonEditor } = await import(SITE_LIB + "/site-json-editor.mjs")
      // One module for them all: once it is in, each further excerpt is an editor for nothing.
      for (const pre of excerpts) {
        const mount = document.createElement("div")
        mount.className = "code-view"
        pre.after(mount)
        // Where in a recording the excerpt stands, for what its completion lists; "none" for JSON that
        // is not a recording. Read-only: nothing on this page plays what would be typed (see JsonEditor).
        const at = pre.dataset.json
        new JsonEditor(mount, pre.textContent.trimEnd(), { at: at === "none" ? null : at ? at.split(".") : [], readOnly: true })
        pre.hidden = true
      }
    } catch {
      /* No editor, then. The listings are still there and still say the same thing. */
    }
  })()
}`
  }

  /** The example is quoted inside a `<pre>`, so its angle brackets and ampersands have to stop
   * being markup. */
  private escape(text: string): string {
    return text.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;")
  }

  private en(): string {
    return `
<section class="band">
  <div class="wrap prose-wide">
    <p>A recording is a plain JSON file. Nothing in it is a binary blob, an id into a database, or a
      reference to this site — you can write one by hand, generate one from your own archive, or diff
      two of them in a code review.</p>
    <p class="small">Every excerpt below is read-only, and each knows the format: put the caret inside
      an object and press <kbd>Ctrl</kbd>+<kbd>Space</kbd> (<kbd>⌥</kbd>+<kbd>I</kbd> on a Mac) to
      list every key that could go there, with what the model says of each.</p>

    <h2>The observation</h2>
    <div class="table-scroll">
    <table>
      <tr><th>Field</th><th>Meaning</th></tr>
      <tr><td><code>version</code></td><td>Always <code>1</code></td></tr>
      <tr><td><code>id</code></td><td>Which account this is, unique across every recording anywhere: the day, then who saw it (<code>"1964-04-24-ZamoraLonnie"</code>), or where for an anonymous observer (<code>"1964-04-24-Socorro"</code>). What a case names it by</td></tr>
      <tr><td><code>time</code>, <code>endTime</code></td><td><code>{ year, month, day, hour, minute, second, raw }</code>, every part optional — that is how the format states “1954” or “around 05:00”. <code>raw</code> is the date as written in <a href="https://www.loc.gov/standards/datetime/">EDTF</a>, and it is what the date means: <code>"1948-07-24T02:45~"</code> (approximate), <code>"2025-06?"</code> (uncertain), <code>"1965-07-01%"</code> (both), <code>"19XX"</code> (a masked year), or <code>"05:00"</code> alone for a time of day remembered without its date. The numbers are kept in step with it for what computes (the sky, the clock). It is a subset of EDTF (level 0, these qualifiers on the whole date, masked years); <a href="https://www.npmjs.com/package/@rr0/time"><code>@rr0/time</code></a> is RR0's full EDTF model, into which UFO@home's own tooling converts a recording's dates</td></tr>
      <tr><td><code>durationSeconds</code></td><td>An alternative to <code>endTime</code>, and it wins if both are given</td></tr>
      <tr><td><code>utcOffsetHours</code></td><td>The LEGAL time the observer's clock was on (+1 for France in 1965). Absent means it is approximated from the longitude, which cannot know legal time or a daylight-saving switch</td></tr>
      <tr><td><code>place</code></td><td><code>[{ lat, lng, name }]</code> — <code>name</code> is the fully qualified place name the coordinates were resolved from</td></tr>
      <tr><td><code>witness</code></td><td><code>{ id, title, lastName, firstNames }</code>, all optional; omit entirely for an anonymous observer. <code>id</code> is a reference to the person (on RR0, their directory: <code>"ZamoraLonnie"</code>); the other fields describe them when nobody has given them one</td></tr>
      <tr><td><code>description</code></td><td>The account in prose — one string, or one per language (see below)</td></tr>
      <tr><td><code>tags</code></td><td>A list of strings, written in English: they are technical terms, and two recordings that share one have to match on it. Each reader is shown them in their own language where a translation is known</td></tr>
    </table>
    </div>

    <h2>Several observers: the case</h2>
    <p>Each observer has a recording of their own, and a recording does not say which case it
      belongs to: an account stands on its own. What shows them together is the
      <strong>case</strong>, which names them: the
      <code>case.json</code> of an <a href="https://rr0.org">RR0</a> dossier, which states the case's
      title, date and classification, and lists everything that happened in it as
      <code>events</code>. Its events of type <code>sighting</code> are its accounts, each pointing
      at one observer's recording:</p>
    <pre data-json="none"><code>{
  "id": "ChilesWhitted",
  "title": "Chiles et Whitted",
  "time": "1948-07-24 02:45",
  "events": [
    { "type": "event", "eventType": "sighting", "url": "witness-chiles.json" },
    { "type": "event", "eventType": "sighting", "url": "witness-whitted.json" }
  ]
}</code></pre>
    <div class="table-scroll">
    <table>
      <tr><th>Field</th><th>Meaning</th></tr>
      <tr><td><code>id</code></td><td>The case's own identifier. On rr0.org it is the dossier's directory and may be left out; a case file standing alone states it</td></tr>
      <tr><td><code>title</code>, <code>time</code></td><td>The case's name, and when it happened as RR0 writes a time (<code>"1948-07-24 02:45"</code>, <code>"1954"</code>). The player names a case it opens by its title</td></tr>
      <tr><td><code>events</code></td><td>The case's chronology. Only the <code>sighting</code> ones are replayed, each by its <code>url</code>, read relative to the case file's own address (so the same case works from its dossier's page and from anywhere else); the others (an analysis, an article, a film, a confession) are RR0's</td></tr>
    </table>
    </div>
    <p>Give it to <code>&lt;rr0-sighting src&gt;</code> or to the player, and each observer can be
      picked from a list. One recording can be given directly, with no case, but a case with one
      sighting works the same way and names what it shows. Try it with
      <a href="/demo-data/case-chiles-whitted.json"><code>case-chiles-whitted.json</code></a>
      (<a href="/play/?sighting=/demo-data/case-chiles-whitted.json">play it</a>).</p>

    <h2>Saying it in more than one language</h2>
    <p>A recording is handed from one reader to another, so every field an author writes can hold
      one string per language instead of one: <code>description</code>, a shape's or a decor
      object's <code>title</code>, and a milestone's <code>label</code> and <code>note</code>.</p>
    <pre data-json=""><code>{
  "description": {
    "fr": "Tout le témoignage de Lonnie Zamora, d'un seul tenant…",
    "en": "Lonnie Zamora's whole testimony, of a piece…"
  }
}</code></pre>
    <p>Keys are language tags as a browser gives them (<code>fr</code>, <code>en</code>,
      <code>pt-BR</code>), and none of them is required. A plain string stays perfectly valid and
      means “in whatever language it was written in” — which every recording made before this
      is. A reader whose languages are none of the ones present gets what the file DOES have rather
      than an empty field: a missing translation must never turn something the observer said into
      something they did not.</p>
    <p>Which language a reader gets is their browser's, unless the page says otherwise: a
      <code>lang</code> on the element itself, or on anything around it, is taken first — an
      article that declares its own language has already stated what language its reader is reading
      it in. The browser's list is what follows, so declaring one forces a choice without throwing
      away the others.</p>
    <p>The editor shows one language, the reader's own, and writing back touches only that one —
      so opening a file in the other language and typing is how a translation gets added, and one
      author cannot delete another's.</p>

    <h2>What was seen</h2>
    <p><code>timeline.keyframes</code> is a list of <code>{ t, shapes }</code>, <code>t</code> in
      milliseconds from the start. Each shape carries a <code>sourceId</code> — several shapes can
      share one timeline (the phenomenon, a trailing flame, a second light) — and a <code>shape</code>:</p>
    <pre data-json="timeline.keyframes.shapes.shape"><code>{
  "kind": "oval",
  "bounds": { "x": 0, "y": 0, "width": 0, "height": 0 },
  "color": "#39ff14",
  "angle": 0,
  "transparency": 0,
  "haloScale": 1.5,
  "brightness": 0,
  "blur": 0,
  "selected": false,
  "title": "the phenomenon",
  "angular": { "widthDeg": 1.2, "heightDeg": 0.4 }
}</code></pre>
    <div class="table-scroll">
    <table>
      <tr><th>Field</th><th>Meaning</th></tr>
      <tr><td><code>kind</code></td><td><code>oval</code>, or <code>polygon</code>, which then also takes <code>points</code></td></tr>
      <tr><td><code>color</code></td><td>Any CSS colour</td></tr>
      <tr><td><code>angle</code></td><td>Radians</td></tr>
      <tr><td><code>transparency</code></td><td>0 opaque to 1 invisible</td></tr>
      <tr><td><code>haloScale</code></td><td>The glow around it; 0 is none</td></tr>
      <tr><td><code>brightness</code></td><td>How dazzling: a veil, aperture spikes, a core clipped to white</td></tr>
      <tr><td><code>blur</code></td><td>How indistinct the observer said the edges looked</td></tr>
      <tr><td><code>angular</code></td><td>Its apparent size in degrees — see below</td></tr>
    </table>
    </div>
    <p><strong><code>angular</code> is the authority.</strong> <code>bounds</code> is that angle
      projected onto the fixed 640×360 canvas at the pose's own field of view and through the
      recording's own instrument; it is re-derived on load, so a file survives a change of canvas,
      of field of view or of instrument. If the two ever disagree, the angle wins.</p>
    <p><code>timeline.order</code> is the back-to-front paint order, <code>timeline.groups</code> the
      grouped source ids. Both optional.</p>

    <h2>Everything around it</h2>
    <div class="table-scroll">
    <table>
      <tr><th>Field</th><th>Meaning</th></tr>
      <tr><td><code>witnessTrack</code></td><td><code>{ keyframes: [{ t, pose }] }</code> — <code>pose</code> holds <code>lat</code>, <code>lng</code>, <code>elevationM</code> (above the local ground), <code>headingDeg</code>, <code>pitchDeg</code>, <code>rollDeg</code>, <code>fovDeg</code>, and for a camera <code>fNumber</code> and <code>focusDistanceM</code></td></tr>
      <tr><td><code>weatherTrack</code></td><td><code>{ keyframes: [{ t, weather }] }</code> — the sky's conditions along the recording: precipitation, wind, storm, and the clouds as layers with real heights, each able to hold individual clouds placed in metres. Every field of a <code>weather</code> is in the next section</td></tr>
      <tr><td><code>weatherSource</code></td><td><code>{ id, name, url }</code> of the record the weather was looked up from. Its presence means the recording is replayed exactly as authored and never looked up again. Absent means the observer's own account</td></tr>
      <tr><td><code>soundTrack</code></td><td><code>{ keyframes: [{ t, sound }] }</code> — <code>kind</code> (none/hum/whistle/rumble/crackle), <code>volume</code>, <code>pitchHz</code>, optional <code>src</code> of a real recording</td></tr>
      <tr><td><code>references</code></td><td>Pictures of the place laid over the scene: <code>src</code> (an address, or a <code>data:</code> URL for a picture added from a disk), <code>kind</code> (photo/panorama), <code>registration</code> (<code>headingDeg</code>, <code>pitchDeg</code>, <code>rollDeg</code>, <code>fovDeg</code>), <code>opacity</code>, <code>credit</code>/<code>creditUrl</code>, optional <code>t</code> and <code>drawing</code>, and the <code>landmarks</code> it was lined up on (<code>id</code>, <code>label</code>, <code>picture</code> as <code>{ u, v }</code> from the top-left corner, <code>scene</code> as <code>{ azimuthDeg, altitudeDeg }</code>)</td></tr>
      <tr><td><code>instrument</code>, <code>exposureSeconds</code></td><td>What it was observed through, and how long the shutter was open. Absent means the naked eye</td></tr>
      <tr><td><code>decor</code></td><td>Scenery at a real <code>eastM</code>/<code>northM</code> from the observer: buildings (with <code>floors</code>, <code>windows</code>), trees, streetlights, vehicles, other observers, aircraft — optionally with a <code>track</code> and <code>lights</code> whose <code>pattern</code> carries a real flash rate</td></tr>
    </table>
    </div>

    <h2>What it was: interpretations</h2>
    <p>A recording states angles, and a body in metres is never part of what was seen. It is a
      claim about it, and it is tested by standing it in the scene and looking at it from where
      the observer stood: it casts its shadow, the ground can hide it, and its outline is measured
      against what the observer said at every instant. An interpretation is shown alone, as the
      world it claims; asked to compare (the ◌ button, or <code>compare-testimony</code> on
      <code>&lt;rr0-sighting&gt;</code>), the player draws everything the observer saw beside it as
      dashed outlines and lists how far off the direction is and how many times wider and taller
      each body looks, in red when an observer could not have been that far off.</p>
    <p>The observer's own reading goes in the recording, as <code>interpretation</code>. An
      analyst's goes in the case, as an event of type <code>interpretation</code> naming the
      recording by its <code>id</code>, with who claims it in <code>by</code>
      (<code>{ "people": id }</code>, <code>{ "org": id }</code>, or a person described in value)
      and its bodies inline or in a file at <code>url</code>. A account whose observer said what
      it was is drawn in the round, as they said; one that says nothing in metres is drawn as the
      angles it states. The player offers it and each analyst's interpretation, one at a time.</p>
    <pre data-json="none"><code>"interpretation": {
  "title": "A craft standing on its legs",
  "bodies": [{
    "id": "craft",
    "explains": ["ufo-1"],
    "model": { "id": "ellipsoid" },
    "track": [
      { "t": 52000, "eastM": -571.6, "northM": -965.5, "onGround": true,
        "sizeM": { "widthM": 3.36, "lengthM": 3.36, "heightM": 1.73 },
        "appearance": { "color": "#e8e6df", "albedo": 0.7 } },
      { "t": 83000, "azimuthDeg": 195.9, "altitudeDeg": 4.1, "distanceM": 44 }
    ]
  }]
}</code></pre>
    <div class="table-scroll">
    <table>
      <tr><th>Field</th><th>Meaning</th></tr>
      <tr><td><code>explains</code></td><td>The <code>sourceId</code>s of the phenomena this body claims to be</td></tr>
      <tr><td><code>model</code></td><td>A shape built here (<code>ellipsoid</code>, <code>sphere</code>, <code>disc</code>, <code>cylinder</code>, <code>cone</code>, <code>box</code>, <code>torus</code>, <code>figure</code>), a model of the catalogue by <code>id</code>, or a glTF file at <code>url</code> with its <code>credit</code>; a relative <code>url</code> is read from the file that states it, not from the page. Stretched to <code>sizeM</code> whichever it is</td></tr>
      <tr><td><code>track</code></td><td>Where it is and what it looks like at each <code>t</code>. A position is stated either in the world (<code>eastM</code>/<code>northM</code> from where the observer stood at the start, like the decor, with <code>onGround</code> or <code>altitudeAboveGroundM</code>) or from the observer at that instant (<code>azimuthDeg</code>, <code>altitudeDeg</code>, <code>distanceM</code>). A body <code>onGround</code> stands on the relief; a direction with no distance then meets the ground where that line does. <code>sizeM</code>, <code>attitude</code> (<code>headingDeg</code>, <code>pitchDeg</code>, <code>rollDeg</code>) and <code>appearance</code> (<code>color</code>, <code>albedo</code>) hold until a later keyframe restates them. A <code>flame</code> (<code>lengthM</code>, <code>widthM</code>, <code>color</code> at the nozzle, <code>tipColor</code>, <code>luminanceCdM2</code>) is lit at the keyframe that states it, comes out of the model's node named <code>exhaust</code> (or the one its <code>node</code> names), lights what is around it, raises dust where it meets the ground when <code>raisesDust</code> says so, and is put out by a <code>luminanceCdM2</code> of 0</td></tr>
      <tr><td><code>motions</code></td><td>In a keyframe: how far along each of its model's own movements it is, by the movement's name — the glTF file's animations. <code>0</code> is a movement's start, <code>1</code> its end, and one that repeats goes on past 1: <code>{ "legs-turn": 7 }</code> is seven turns. The model says what moves and how; the track says when. Each movement blends between the keyframes that state it, whatever other keyframes move the body in between, holds after the last and stands at 0 before the first. Valensole's departure is written so: <code>{ "t": 246000, "motions": { "pivot-retract": 0 } }</code>, <code>{ "t": 248000, "motions": { "pivot-retract": 1, "legs-turn": 0 } }</code>, … <code>{ "t": 262000, "motions": { "legs-turn": 7 } }</code></td></tr>
      <tr><td><code>outlineNode</code></td><td>The node of the model that is what the observer drew (<code>"hull"</code> for a craft whose legs are not in the drawing): what its outline is measured by</td></tr>
      <tr><td><code>smoke</code></td><td>On the interpretation itself: what it sets burning on the ground, as <code>{ eastM, northM, fromT, untilT? }</code>, seen by its smoke carried off by the recording's wind</td></tr>
    </table>
    </div>

    <h2>The weather, and its clouds</h2>
    <p>A <code>weather</code> keyframe states the sky's conditions at one moment of the recording's
      clock; between two keyframes every number is blended, and precipitation type and storm are
      held. It carries:</p>
    <div class="table-scroll">
    <table>
      <tr><th>Field</th><th>Meaning</th></tr>
      <tr><td><code>cloudLayers</code></td><td>The clouds, as a list of layers — see below. <strong>Absent</strong> means the older fields on this row's neighbours describe them, and they are adapted into one water layer and one cirrus veil; <strong>an empty list</strong> means a clear sky somebody looked at</td></tr>
      <tr><td><code>cloudCover</code>, <code>lowerCloudCover</code>, <code>highCloudCover</code></td><td>Fractions of sky (0–1): the total, the water decks alone, and the icy veil alone. Written by recordings made before there were layers, and still kept in step by the editor as a summary of them</td></tr>
      <tr><td><code>cloudBaseM</code>, <code>cloudDarkness</code></td><td>The same era's one base, in metres above the reference ground, and one shade (0 white, 1 very dark)</td></tr>
      <tr><td><code>iceCrystalAlignment</code></td><td>0–1, how steadily the ice crystals fell — what turns a bare ring into sundogs, arcs and a pillar. No record measures it; a cirrus layer carries its own</td></tr>
      <tr><td><code>relativeHumidity</code></td><td>0–1, near the ground. It decides how milky the clear sky is: haze swells with water as the air nears saturation. A looked-up record carries it (from ERA5's temperature and dew point); absent means a typical haze</td></tr>
      <tr><td><code>precipitationType</code>, <code>precipitationIntensity</code></td><td>none/rain/snow/hail, and 0–1</td></tr>
      <tr><td><code>windDirectionDeg</code>, <code>windSpeed</code></td><td>The general wind: the bearing it blows TOWARD, clockwise from north, and metres per second. It is what carries the clouds — from time zero, so seeking and replaying give the same sky</td></tr>
      <tr><td><code>storm</code></td><td>Lightning and thunder, at the right delay</td></tr>
    </table>
    </div>
    <p>Each <strong>layer</strong> of <code>cloudLayers</code> is a deck of clouds at a real
      height, and stays itself from one keyframe to the next:</p>
    <div class="table-scroll">
    <table>
      <tr><th>Field</th><th>Meaning</th></tr>
      <tr><td><code>id</code></td><td>Stable across keyframes — layers are matched by it, never by position in the list. A layer present in one keyframe and absent from the next fades out; reordering them changes nothing</td></tr>
      <tr><td><code>type</code></td><td><code>cumulus</code>, <code>stratus</code>, <code>stratocumulus</code>, <code>cirrus</code> or <code>unknown</code>. It decides the shape of the tops and how thin the veil is; a cirrus is also the one that refracts haloes. It switches at the keyframe, it is not blended</td></tr>
      <tr><td><code>baseM</code>, <code>thicknessM</code></td><td>Metres. The base is above the recording's REFERENCE ground, not above an observer who climbs; an observer above the base is inside or over the deck, and the sky is drawn accordingly</td></tr>
      <tr><td><code>coverage</code></td><td>0–1, and it means what it says: the fraction of the sky this layer covers, whatever the size of its clouds</td></tr>
      <tr><td><code>sizeM</code></td><td>The characteristic width of one cloud, in metres. Separate from coverage: the same fraction of sky can be many small clouds or a few large ones</td></tr>
      <tr><td><code>density</code></td><td>0–2, how opaque the cloud matter is; 0 is transparent. Separate from coverage too</td></tr>
      <tr><td><code>darkness</code></td><td>0 white to 1 very dark. Absent means the keyframe's <code>cloudDarkness</code></td></tr>
      <tr><td><code>seed</code></td><td>Which pattern, out of the endless ones the same numbers can draw. Absent means one derived from the id, which is why the id must not change</td></tr>
      <tr><td><code>windDirectionDeg</code>, <code>windSpeed</code></td><td>This layer's own wind, when it differs from the general one — the high deck usually does. Absent means the general wind</td></tr>
      <tr><td><code>iceCrystalAlignment</code></td><td>For a cirrus only</td></tr>
      <tr><td><code>instances</code></td><td>Individual clouds inside this layer — see below</td></tr>
    </table>
    </div>
    <p>An <strong>individual cloud</strong> in <code>instances</code> is one cloud of its layer that the
      file places exactly, because the account did: the one the phenomenon went behind, the one that
      was there and nowhere else. It is drawn as one of its layer's own — the same texture, the same
      threshold — told apart from its neighbours by nothing but where it stands and how big it is,
      and it stands even when the layer's <code>coverage</code> is nought. It rides the layer's wind
      like the rest, and it hides a phenomenon it passes in front of.</p>
    <div class="table-scroll">
    <table>
      <tr><th>Field</th><th>Meaning</th></tr>
      <tr><td><code>id</code></td><td>Stable across keyframes, same rule as a layer's</td></tr>
      <tr><td><code>eastM</code>, <code>northM</code></td><td>Where its centre was at time zero, in metres from the observer's starting point. The wind carries it from there</td></tr>
      <tr><td><code>baseM</code>, <code>thicknessM</code></td><td>Its own base and height, metres — a cloud can sit lower or stand taller than its deck</td></tr>
      <tr><td><code>widthM</code>, <code>depthM</code>, <code>rotationDeg</code></td><td>Its footprint, metres, and the bearing that footprint is turned to</td></tr>
      <tr><td><code>density</code>, <code>darkness</code></td><td>Its own; darkness absent means the layer's</td></tr>
    </table>
    </div>
    <pre data-json="weatherTrack.keyframes"><code>{
  "weather": {
    "cloudLayers": [
      {
        "id": "low", "type": "cumulus",
        "baseM": 1500, "thicknessM": 800,
        "coverage": 0.55, "sizeM": 1400, "density": 1, "darkness": 0.15,
        "instances": [
          { "id": "the-one", "eastM": 0, "northM": 4200,
            "baseM": 1500, "thicknessM": 800,
            "widthM": 1900, "depthM": 1300, "rotationDeg": 12, "density": 1 }
        ]
      },
      { "id": "high", "type": "cirrus", "baseM": 8000, "thicknessM": 400,
        "coverage": 0.2, "sizeM": 2200, "density": 0.35, "iceCrystalAlignment": 0.65 }
    ],
    "precipitationType": "none", "precipitationIntensity": 0,
    "windDirectionDeg": 90, "windSpeed": 5, "storm": false
  }
}</code></pre>
    <p>A recording whose weather was <strong>looked up</strong> (it has a <code>weatherSource</code>)
      holds the record's answer, not a link to it: ERA5 gives the low, middle and high bands as three
      layers named <code>record-low</code>, <code>record-mid</code> and <code>record-high</code>, the
      low base estimated from the spread between temperature and dew point, the other two at 3 500 m
      and 8 000 m. Their type is <code>unknown</code> (cirrus for the high one), their size and
      density are drawing assumptions: a reanalysis knows how much of each band was covered, not what
      the clouds looked like. Ask the record again from the editor and the layers are rewritten; edit
      a layer by hand and the recording becomes the author's, the source dropped.</p>

    <h2>A whole file</h2>
    <p>The smallest recording that still states something — one silent oval crossing the sky over
      twelve seconds, on a real date at a real place. Everything else in the format is optional, and
      everything below is doing work:</p>
    <pre data-json=""><code>${this.escape(this.example)}</code></pre>
    <p class="small">To change it and see it play, paste it into <a href="/play/">the player</a>,
      whose editor completes on every key the format has, offers the words each one accepts, and
      says what the model says about it.</p>
    <p>It is <a href="/demo-data/example-minimal.json"><code>/demo-data/example-minimal.json</code></a>
      on this site, so you can fetch it, and
      <a href="/play/?sighting=/demo-data/example-minimal.json">play it</a> before changing
      anything. Note that <code>angular</code> and <code>bounds</code> both appear: the angle is what
      the file MEANS, and the pixels are re-derived from it on load — write the angle, and let a
      wrong guess at the pixels be corrected for you.</p>

    <h2>Larger ones to read</h2>
    <p>Every demo on this site is a plain file you can open. These four are the ones worth reading
      to see how a real recording is put together:</p>
    <div class="table-scroll">
    <table>
      <tr><th>File</th><th>What to look at in it</th></tr>
      <tr><td><a href="/demo-data/witness-chiles.json"><code>witness-chiles.json</code></a></td><td>A real case: an observer, a case id shared with a second recording, ten keyframes, a looked-up <code>weatherTrack</code> with its <code>weatherSource</code></td></tr>
      <tr><td><a href="/demo-data/sky-test-halos.json"><code>sky-test-halos.json</code></a></td><td>No phenomenon at all — a sky set up by a <code>weatherTrack</code> whose keyframes change the crystals' alignment, the cirrus cover and a cumulus deck, watched through a <code>witnessTrack</code> that pans across the display and then holds</td></tr>
      <tr><td><a href="/demo-data/sky-test-clouds.json"><code>sky-test-clouds.json</code></a></td><td>Three cloud layers with metre-based altitude, thickness, size, density and wind, evolving on the weather timeline — and in the first one an <code>instances</code> entry: one cloud of the field, placed and sized in metres, that grows and darkens over the two minutes</td></tr>
      <tr><td><a href="/demo-data/sky-test-aircraft.json"><code>sky-test-aircraft.json</code></a></td><td>An <code>instrument</code> and an <code>exposureSeconds</code>, and a <code>decor</code> aircraft with a <code>track</code> and seven <code>lights</code> at their real flash rates</td></tr>
      <tr><td><a href="/demo-data/instrument-instamatic.json"><code>instrument-instamatic.json</code></a></td><td>The same sighting as <code>witness-socorro.json</code>, changed in one field. Diff the two</td></tr>
    </table>
    </div>

    <h2>Four rules that decide what a file means</h2>
    <ul class="plain">
      <li><strong>Discrete fields are held, continuous ones are blended.</strong> A shape left out of
        a later keyframe stays as it was; one whose first keyframe is at five seconds is already
        painted, in that state, from zero. To make something stop being visible, keyframe it at
        <code>transparency: 1</code>.</li>
      <li><strong>Angles only.</strong> No real size and no real distance is stored anywhere. Metres
        are derived, as inequalities, from what the phenomenon was stated to pass behind or in front of
        (<code>decor[].occludesSourceIds</code>).</li>
      <li><strong>Declared outranks deduced.</strong> <code>occludesSourceIds</code> records statements by the observer. Nothing in this format
        <em>can</em> deduce them: it describes an appearance on a field of view, not a position in
        space.</li>
      <li><strong>Absent is not zero.</strong> No sound track means nobody was asked;
        <code>kind: "none"</code> means the observer reported hearing nothing. The same distinction
        runs through the weather and the ice cloud.</li>
    </ul>
    <p class="small">The <a href="https://github.com/RR0/UfoAtHome#data-format">README</a> carries the
      full field-by-field reference, including the reasoning behind each choice, and is the canonical
      source if this page and it ever disagree.</p>
  </div>
</section>
`
  }

  private fr(): string {
    return `
<section class="band">
  <div class="wrap prose-wide">
    <p>Un enregistrement est un simple fichier JSON. Rien dedans n'est un blob binaire, un
      identifiant dans une base de données, ni une référence à ce site — vous pouvez en écrire un à
      la main, en engendrer depuis vos propres archives, ou en comparer deux dans une relecture de
      code.</p>
    <p class="small">Chaque extrait ci-dessous est en lecture seule, et chacun connaît le format :
      placez le curseur dans un objet et faites <kbd>Ctrl</kbd>+<kbd>Espace</kbd>
      (<kbd>⌥</kbd>+<kbd>I</kbd> sur Mac) pour lister toutes les clés qui pourraient y figurer, avec ce
      que le modèle dit de chacune.</p>

    <h2>L'observation</h2>
    <div class="table-scroll">
    <table>
      <tr><th>Champ</th><th>Sens</th></tr>
      <tr><td><code>version</code></td><td>Toujours <code>1</code></td></tr>
      <tr><td><code>id</code></td><td>Quel compte rendu c'est, unique parmi tous les enregistrements : le jour, puis qui l'a vu (<code>"1964-04-24-ZamoraLonnie"</code>), ou le lieu pour un observateur anonyme (<code>"1964-04-24-Socorro"</code>). Ce par quoi un dossier le désigne</td></tr>
      <tr><td><code>time</code>, <code>endTime</code></td><td><code>{ year, month, day, hour, minute, second, raw }</code>, chaque partie facultative — c'est ainsi que le format énonce « 1954 » ou « vers 05:00 ». <code>raw</code> est la date telle qu'écrite en <a href="https://www.loc.gov/standards/datetime/">EDTF</a>, et c'est elle qui fait foi : <code>"1948-07-24T02:45~"</code> (approximative), <code>"2025-06?"</code> (incertaine), <code>"1965-07-01%"</code> (les deux), <code>"19XX"</code> (une année masquée), ou <code>"05:00"</code> seul pour une heure dont on a oublié la date. Les nombres sont tenus en accord avec elle pour ce qui calcule (le ciel, l'horloge). C'est un sous-ensemble d'EDTF (niveau 0, ces qualificatifs sur la date entière, années masquées) ; <a href="https://www.npmjs.com/package/@rr0/time"><code>@rr0/time</code></a> est le modèle EDTF complet de RR0, dans lequel l'outillage d'UFO@home convertit les dates d'un enregistrement</td></tr>
      <tr><td><code>durationSeconds</code></td><td>Une alternative à <code>endTime</code>, et c'est elle qui l'emporte si les deux sont là</td></tr>
      <tr><td><code>utcOffsetHours</code></td><td>L'heure LÉGALE de la montre de l'observateur (+1 pour la France en 1965). Absent, elle est approchée depuis la longitude, qui ne peut connaître ni l'heure légale ni un changement d'heure</td></tr>
      <tr><td><code>place</code></td><td><code>[{ lat, lng, name }]</code> — <code>name</code> est le nom qualifié depuis lequel les coordonnées ont été résolues</td></tr>
      <tr><td><code>witness</code></td><td><code>{ id, title, lastName, firstNames }</code>, tous facultatifs ; à omettre entièrement pour un observateur anonyme. <code>id</code> est une référence à la personne (sur RR0, son répertoire : <code>"ZamoraLonnie"</code>) ; les autres champs la décrivent quand personne ne lui en a encore donné</td></tr>
      <tr><td><code>description</code></td><td>Le récit en prose — une chaîne, ou une par langue (voir plus bas)</td></tr>
      <tr><td><code>tags</code></td><td>Une liste de chaînes, écrites en anglais : ce sont des termes techniques, et deux enregistrements qui en partagent un doivent s'y égaler. Chaque lecteur les voit dans sa langue lorsqu'une traduction est connue</td></tr>
    </table>
    </div>

    <h2>Plusieurs observateurs : le dossier</h2>
    <p>Chaque observateur a son propre enregistrement, et un enregistrement ne dit pas à quel dossier il
      appartient : un compte rendu se suffit à lui-même. Ce qui les montre ensemble est le
      <strong>dossier</strong>, qui les désigne :
      le <code>case.json</code> d'un dossier <a href="https://rr0.org">RR0</a>, qui énonce le titre,
      la date et la classification du cas, et liste tout ce qui lui est arrivé en
      <code>events</code>. Ses événements de type <code>sighting</code> sont ses comptes rendus, chacun
      pointant vers l'enregistrement d'un observateur :</p>
    <pre data-json="none"><code>{
  "id": "ChilesWhitted",
  "title": "Chiles et Whitted",
  "time": "1948-07-24 02:45",
  "events": [
    { "type": "event", "eventType": "sighting", "url": "witness-chiles.json" },
    { "type": "event", "eventType": "sighting", "url": "witness-whitted.json" }
  ]
}</code></pre>
    <div class="table-scroll">
    <table>
      <tr><th>Champ</th><th>Sens</th></tr>
      <tr><td><code>id</code></td><td>L'identifiant du dossier lui-même. Sur rr0.org c'est le répertoire du dossier, et il peut être omis ; un fichier de cas isolé l'énonce</td></tr>
      <tr><td><code>title</code>, <code>time</code></td><td>Le nom du cas, et sa date comme RR0 l'écrit (<code>"1948-07-24 02:45"</code>, <code>"1954"</code>). Le lecteur nomme un cas qu'il ouvre par son titre</td></tr>
      <tr><td><code>events</code></td><td>La chronologie du cas. Seuls les <code>sighting</code> sont rejoués, chacun par son <code>url</code>, lue relativement à l'adresse du fichier de cas (si bien que le même cas marche depuis la page de son dossier comme depuis n'importe où) ; les autres (une analyse, un article, un film, un aveu) sont ceux de RR0</td></tr>
    </table>
    </div>
    <p>Donnez-le à <code>&lt;rr0-sighting src&gt;</code> ou au lecteur, et chaque observateur se choisit
      dans une liste. Un enregistrement peut être donné directement, sans dossier, mais un dossier à
      un seul compte rendu marche de la même façon et nomme ce qu'il montre. Essayez avec
      <a href="/demo-data/case-chiles-whitted.json"><code>case-chiles-whitted.json</code></a>
      (<a href="/play/?sighting=/demo-data/case-chiles-whitted.json">le jouer</a>).</p>

    <h2>Le dire en plusieurs langues</h2>
    <p>Un enregistrement se transmet d'un lecteur à un autre : chaque champ écrit par un auteur peut
      donc porter une chaîne par langue au lieu d'une seule — <code>description</code>, le
      <code>title</code> d'une forme ou d'un élément de décor, le <code>label</code> et la
      <code>note</code> d'un repère.</p>
    <pre data-json=""><code>{
  "description": {
    "fr": "Tout le témoignage de Lonnie Zamora, d'un seul tenant…",
    "en": "Lonnie Zamora's whole testimony, of a piece…"
  }
}</code></pre>
    <p>Les clés sont des étiquettes de langue telles qu'un navigateur les donne (<code>fr</code>,
      <code>en</code>, <code>pt-BR</code>), et aucune n'est obligatoire. Une chaîne simple reste
      parfaitement valide et signifie « dans la langue où cela a été écrit » — ce qu'est tout
      enregistrement antérieur. Un lecteur dont aucune langue n'est présente reçoit ce que le
      fichier A, plutôt qu'un champ vide : une traduction manquante ne doit jamais transformer ce
      qu'un observateur a dit en ce qu'il n'a pas dit.</p>
    <p>La langue reçue est celle du navigateur, sauf si la page en dit autre chose : un
      <code>lang</code> sur l'élément lui-même, ou sur ce qui l'entoure, est pris d'abord — un
      article qui déclare sa langue a déjà énoncé dans quelle langue son lecteur le lit. La liste du
      navigateur vient ensuite : déclarer une langue force donc un choix sans jeter les autres.</p>
    <p>L'éditeur montre une langue, celle du lecteur, et n'écrit que dans celle-là — ouvrir le
      fichier dans l'autre langue et taper est donc la façon d'ajouter une traduction, et un auteur
      ne peut pas effacer celle d'un autre.</p>

    <h2>Ce qui a été vu</h2>
    <p><code>timeline.keyframes</code> est une liste de <code>{ t, shapes }</code>, <code>t</code> en
      millisecondes depuis le début. Chaque forme porte un <code>sourceId</code> — plusieurs formes
      peuvent partager une chronologie (le phénomène, une flamme qui traîne, une seconde lumière) — et
      une <code>shape</code> :</p>
    <pre data-json="timeline.keyframes.shapes.shape"><code>{
  "kind": "oval",
  "bounds": { "x": 0, "y": 0, "width": 0, "height": 0 },
  "color": "#39ff14",
  "angle": 0,
  "transparency": 0,
  "haloScale": 1.5,
  "brightness": 0,
  "blur": 0,
  "selected": false,
  "title": "le phénomène",
  "angular": { "widthDeg": 1.2, "heightDeg": 0.4 }
}</code></pre>
    <div class="table-scroll">
    <table>
      <tr><th>Champ</th><th>Sens</th></tr>
      <tr><td><code>kind</code></td><td><code>oval</code>, ou <code>polygon</code>, qui prend alors aussi <code>points</code></td></tr>
      <tr><td><code>color</code></td><td>N'importe quelle couleur CSS</td></tr>
      <tr><td><code>angle</code></td><td>En radians</td></tr>
      <tr><td><code>transparency</code></td><td>De 0 opaque à 1 invisible</td></tr>
      <tr><td><code>haloScale</code></td><td>La lueur autour ; 0 pour aucune</td></tr>
      <tr><td><code>brightness</code></td><td>L'éblouissement : un voile, les aigrettes du diaphragme, un cœur saturé au blanc</td></tr>
      <tr><td><code>blur</code></td><td>À quel point l'observateur a dit les contours indistincts</td></tr>
      <tr><td><code>angular</code></td><td>Sa taille apparente en degrés — voir plus bas</td></tr>
    </table>
    </div>
    <p><strong>C'est <code>angular</code> qui fait foi.</strong> <code>bounds</code> est cet angle
      projeté sur le canevas fixe de 640×360 au champ de la pose et à travers l'instrument de
      l'enregistrement ; il est redérivé au chargement, si bien qu'un fichier survit à un changement
      de canevas, de champ ou d'instrument. Si les deux divergent, c'est l'angle qui gagne.</p>
    <p><code>timeline.order</code> est l'ordre de tracé de l'arrière vers l'avant,
      <code>timeline.groups</code> les identifiants groupés. Les deux sont facultatifs.</p>

    <h2>Tout ce qu'il y a autour</h2>
    <div class="table-scroll">
    <table>
      <tr><th>Champ</th><th>Sens</th></tr>
      <tr><td><code>witnessTrack</code></td><td><code>{ keyframes: [{ t, pose }] }</code> — <code>pose</code> porte <code>lat</code>, <code>lng</code>, <code>elevationM</code> (au-dessus du sol local), <code>headingDeg</code>, <code>pitchDeg</code>, <code>rollDeg</code>, <code>fovDeg</code>, et pour un appareil <code>fNumber</code> et <code>focusDistanceM</code></td></tr>
      <tr><td><code>weatherTrack</code></td><td><code>{ keyframes: [{ t, weather }] }</code> — l'état du ciel le long de l'enregistrement : précipitation, vent, orage, et les nuages en couches à hauteur réelle, chacune pouvant porter des nuages individuels placés en mètres. Chaque champ d'un <code>weather</code> est dans la section suivante</td></tr>
      <tr><td><code>weatherSource</code></td><td><code>{ id, name, url }</code> du relevé d'où vient la météo. Sa présence signifie que l'enregistrement est rejoué tel qu'il a été composé et n'est jamais reconsulté. Absent : le récit de l'observateur lui-même</td></tr>
      <tr><td><code>soundTrack</code></td><td><code>{ keyframes: [{ t, sound }] }</code> — <code>kind</code> (none/hum/whistle/rumble/crackle), <code>volume</code>, <code>pitchHz</code>, et un <code>src</code> facultatif vers un vrai enregistrement</td></tr>
      <tr><td><code>references</code></td><td>Photos des lieux posées sur la scène : <code>src</code> (une adresse, ou une URL <code>data:</code> pour une photo ajoutée depuis un disque), <code>kind</code> (photo/panorama), <code>registration</code> (<code>headingDeg</code>, <code>pitchDeg</code>, <code>rollDeg</code>, <code>fovDeg</code>), <code>opacity</code>, <code>credit</code>/<code>creditUrl</code>, <code>t</code> et <code>drawing</code> facultatifs, et les <code>landmarks</code> sur lesquels elle a été recalée (<code>id</code>, <code>label</code>, <code>picture</code> en <code>{ u, v }</code> depuis le coin haut gauche, <code>scene</code> en <code>{ azimuthDeg, altitudeDeg }</code>)</td></tr>
      <tr><td><code>instrument</code>, <code>exposureSeconds</code></td><td>À travers quoi l'observation a été faite, et combien de temps l'obturateur est resté ouvert. Absent : l'œil nu</td></tr>
      <tr><td><code>decor</code></td><td>Le décor, à une vraie distance <code>eastM</code>/<code>northM</code> de l'observateur : bâtiments (avec <code>floors</code>, <code>windows</code>), arbres, lampadaires, véhicules, autres observateurs, aéronefs — éventuellement avec une <code>track</code> et des <code>lights</code> dont le <code>pattern</code> porte une vraie cadence d'éclats</td></tr>
    </table>
    </div>

    <h2>Ce que c'était : les interprétations</h2>
    <p>Un enregistrement énonce des angles, et un corps en mètres ne fait jamais partie de ce qui
      a été vu. C'est une affirmation à son sujet, et elle se met à l'épreuve en la posant dans la
      scène et en la regardant depuis l'endroit où se tenait l'observateur : elle projette son ombre,
      le sol peut la cacher, et son contour est confronté à chaque instant à ce que l'observateur a
      dit. Une interprétation s'affiche seule, comme le monde qu'elle affirme ; quand on demande
      la comparaison (le bouton ◌, ou <code>compare-testimony</code> sur
      <code>&lt;rr0-sighting&gt;</code>), le lecteur dessine à côté tout ce que l'observateur a vu, en
      contours pointillés, et indique l'écart de direction et combien de fois plus large et plus
      haut chaque corps paraît, en rouge quand un observateur n'aurait pas pu se tromper d'autant.</p>
    <p>La lecture de l'observateur lui-même va dans l'enregistrement, en <code>interpretation</code>.
      Celle d'un analyste va dans le dossier, en événement de type <code>interpretation</code>
      qui désigne l'enregistrement par son <code>id</code>, avec qui l'avance dans
      <code>by</code> (<code>{ "people": id }</code>, <code>{ "org": id }</code>, ou une personne
      décrite en valeur) et ses corps sur place ou dans un fichier à <code>url</code>. Un
      compte rendu dont l'observateur a dit ce que c'était se dessine en volume, comme il l'a dit ;
      celui qui ne dit rien en mètres se dessine avec les angles qu'il énonce. Le lecteur le
      propose, ainsi que chaque interprétation d'analyste, une à la fois.</p>
    <pre data-json="none"><code>"interpretation": {
  "title": "Un engin posé sur ses pieds",
  "bodies": [{
    "id": "craft",
    "explains": ["ufo-1"],
    "model": { "id": "ellipsoid" },
    "track": [
      { "t": 52000, "eastM": -571.6, "northM": -965.5, "onGround": true,
        "sizeM": { "widthM": 3.36, "lengthM": 3.36, "heightM": 1.73 },
        "appearance": { "color": "#e8e6df", "albedo": 0.7 } },
      { "t": 83000, "azimuthDeg": 195.9, "altitudeDeg": 4.1, "distanceM": 44 }
    ]
  }]
}</code></pre>
    <div class="table-scroll">
    <table>
      <tr><th>Champ</th><th>Sens</th></tr>
      <tr><td><code>explains</code></td><td>Les <code>sourceId</code> des phénomènes que ce corps prétend être</td></tr>
      <tr><td><code>model</code></td><td>Une forme construite ici (<code>ellipsoid</code>, <code>sphere</code>, <code>disc</code>, <code>cylinder</code>, <code>cone</code>, <code>box</code>, <code>torus</code>, <code>figure</code>), un modèle du catalogue par son <code>id</code>, ou un fichier glTF à <code>url</code> avec son <code>credit</code> ; une <code>url</code> relative se lit depuis le fichier qui la donne, pas depuis la page. Étiré à <code>sizeM</code> dans tous les cas</td></tr>
      <tr><td><code>track</code></td><td>Où il est et à quoi il ressemble à chaque <code>t</code>. Une position s'énonce soit dans le monde (<code>eastM</code>/<code>northM</code> depuis l'endroit où se tenait l'observateur au début, comme le décor, avec <code>onGround</code> ou <code>altitudeAboveGroundM</code>), soit depuis l'observateur à cet instant (<code>azimuthDeg</code>, <code>altitudeDeg</code>, <code>distanceM</code>). Un corps <code>onGround</code> est posé sur le relief ; une direction sans distance rencontre alors le sol là où cette ligne le rencontre. <code>sizeM</code>, <code>attitude</code> (<code>headingDeg</code>, <code>pitchDeg</code>, <code>rollDeg</code>) et <code>appearance</code> (<code>color</code>, <code>albedo</code>) valent jusqu'à ce qu'une keyframe suivante les énonce à nouveau. Une <code>flame</code> (<code>lengthM</code>, <code>widthM</code>, <code>color</code> à la sortie, <code>tipColor</code>, <code>luminanceCdM2</code>) s'allume à la keyframe qui l'énonce, sort du nœud du modèle nommé <code>exhaust</code> (ou de celui que nomme son <code>node</code>), éclaire ce qui l'entoure, soulève de la poussière là où elle touche le sol si <code>raisesDust</code> le dit, et s'éteint avec une <code>luminanceCdM2</code> de 0</td></tr>
      <tr><td><code>motions</code></td><td>Dans une keyframe : où en est chacun des mouvements propres de son modèle, par le nom du mouvement — les animations du fichier glTF. <code>0</code> est le début d'un mouvement, <code>1</code> sa fin, et un mouvement qui se répète continue au-delà de 1 : <code>{ "legs-turn": 7 }</code>, c'est sept tours. Le modèle dit ce qui bouge et comment ; la piste dit quand. Chaque mouvement se mélange entre les keyframes qui l'énoncent, quelles que soient les keyframes qui déplacent le corps entre-temps, se maintient après la dernière et vaut 0 avant la première. Le départ de Valensole s'écrit ainsi : <code>{ "t": 246000, "motions": { "pivot-retract": 0 } }</code>, <code>{ "t": 248000, "motions": { "pivot-retract": 1, "legs-turn": 0 } }</code>, … <code>{ "t": 262000, "motions": { "legs-turn": 7 } }</code></td></tr>
      <tr><td><code>outlineNode</code></td><td>Le nœud du modèle qui est ce que l'observateur a dessiné (<code>"hull"</code> pour un engin dont les pieds ne figurent pas dans le dessin) : ce sur quoi son contour est mesuré</td></tr>
      <tr><td><code>smoke</code></td><td>Sur l'interprétation elle-même : ce qu'elle met à brûler au sol, en <code>{ eastM, northM, fromT, untilT? }</code>, vu par sa fumée qu'emporte le vent de l'enregistrement</td></tr>
    </table>
    </div>

    <h2>La météo, et ses nuages</h2>
    <p>Un point <code>weather</code> énonce l'état du ciel à un instant de l'horloge de
      l'enregistrement ; entre deux points chaque nombre est interpolé, le type de précipitation et
      l'orage sont maintenus. Il porte :</p>
    <div class="table-scroll">
    <table>
      <tr><th>Champ</th><th>Sens</th></tr>
      <tr><td><code>cloudLayers</code></td><td>Les nuages, en liste de couches — voir plus bas. <strong>Absent</strong> : ce sont les anciens champs des lignes voisines qui les décrivent, adaptés en une couche d'eau et un voile de cirrus ; <strong>une liste vide</strong> : un ciel dégagé que quelqu'un a regardé</td></tr>
      <tr><td><code>cloudCover</code>, <code>lowerCloudCover</code>, <code>highCloudCover</code></td><td>Fractions de ciel (0–1) : le total, les couches d'eau seules, le voile glacé seul. Écrits par les enregistrements d'avant les couches, et encore tenus à jour par l'éditeur comme résumé de celles-ci</td></tr>
      <tr><td><code>cloudBaseM</code>, <code>cloudDarkness</code></td><td>La base unique de la même époque, en mètres au-dessus du sol de référence, et une teinte unique (0 blanc, 1 très sombre)</td></tr>
      <tr><td><code>iceCrystalAlignment</code></td><td>0–1, la régularité de la chute des cristaux de glace — ce qui fait d'un anneau nu des parhélies, des arcs et un pilier. Aucun relevé ne le mesure ; une couche de cirrus porte le sien</td></tr>
      <tr><td><code>relativeHumidity</code></td><td>0–1, près du sol. Elle décide de la blancheur du ciel clair : la brume gonfle d'eau à mesure que l'air approche de la saturation. Un relevé consulté la porte (tirée de la température et du point de rosée d'ERA5) ; absente, une brume ordinaire</td></tr>
      <tr><td><code>precipitationType</code>, <code>precipitationIntensity</code></td><td>none/rain/snow/hail, et 0–1</td></tr>
      <tr><td><code>windDirectionDeg</code>, <code>windSpeed</code></td><td>Le vent général : le cap VERS lequel il souffle, dans le sens horaire depuis le nord, et des mètres par seconde. C'est lui qui porte les nuages — depuis l'instant zéro, si bien qu'une recherche et une relecture donnent le même ciel</td></tr>
      <tr><td><code>storm</code></td><td>Éclairs et tonnerre, au bon retard</td></tr>
    </table>
    </div>
    <p>Chaque <strong>couche</strong> de <code>cloudLayers</code> est une nappe de nuages à une
      hauteur réelle, et reste elle-même d'un point à l'autre :</p>
    <div class="table-scroll">
    <table>
      <tr><th>Champ</th><th>Sens</th></tr>
      <tr><td><code>id</code></td><td>Stable d'un point à l'autre — les couches s'apparient par lui, jamais par leur rang dans la liste. Une couche présente à un point et absente au suivant s'estompe ; les réordonner ne change rien</td></tr>
      <tr><td><code>type</code></td><td><code>cumulus</code>, <code>stratus</code>, <code>stratocumulus</code>, <code>cirrus</code> ou <code>unknown</code>. Il décide de la forme des sommets et de la finesse du voile ; un cirrus est aussi celui qui réfracte les halos. Il bascule au point, il n'est pas interpolé</td></tr>
      <tr><td><code>baseM</code>, <code>thicknessM</code></td><td>En mètres. La base est au-dessus du sol de RÉFÉRENCE de l'enregistrement, pas au-dessus d'un observateur qui grimpe ; un observateur plus haut que la base est dans la nappe ou au-dessus, et le ciel est dessiné en conséquence</td></tr>
      <tr><td><code>coverage</code></td><td>0–1, et cela veut dire ce que cela dit : la fraction du ciel que cette couche couvre, quelle que soit la taille de ses nuages</td></tr>
      <tr><td><code>sizeM</code></td><td>La largeur caractéristique d'un nuage, en mètres. Indépendante de la couverture : une même fraction de ciel peut être beaucoup de petits nuages ou quelques gros</td></tr>
      <tr><td><code>density</code></td><td>0–2, l'opacité de la matière nuageuse ; 0 est transparent. Indépendante de la couverture elle aussi</td></tr>
      <tr><td><code>darkness</code></td><td>0 blanc à 1 très sombre. Absent : le <code>cloudDarkness</code> du point</td></tr>
      <tr><td><code>seed</code></td><td>Lequel des motifs, parmi les innombrables que les mêmes nombres peuvent dessiner. Absent : un motif dérivé de l'id, ce qui est la raison pour laquelle l'id ne doit pas changer</td></tr>
      <tr><td><code>windDirectionDeg</code>, <code>windSpeed</code></td><td>Le vent propre à cette couche, lorsqu'il diffère du vent général — c'est le cas de la couche haute d'ordinaire. Absent : le vent général</td></tr>
      <tr><td><code>iceCrystalAlignment</code></td><td>Pour un cirrus seulement</td></tr>
      <tr><td><code>instances</code></td><td>Les nuages individuels de cette couche — voir plus bas</td></tr>
    </table>
    </div>
    <p>Un <strong>nuage individuel</strong> dans <code>instances</code> est un nuage de sa couche que
      le fichier place exactement, parce que le récit le fait : celui derrière lequel le phénomène
      est passé, celui qui était là et nulle part ailleurs. Il est dessiné comme un nuage de sa
      couche — même texture, même seuil — et ne se distingue de ses voisins que par sa position et sa
      taille ; il est là même quand la <code>coverage</code> de la couche est nulle. Il suit le vent
      de la couche comme les autres, et il masque un phénomène devant lequel il passe.</p>
    <div class="table-scroll">
    <table>
      <tr><th>Champ</th><th>Sens</th></tr>
      <tr><td><code>id</code></td><td>Stable d'un point à l'autre, même règle que pour une couche</td></tr>
      <tr><td><code>eastM</code>, <code>northM</code></td><td>Où était son centre à l'instant zéro, en mètres depuis le point de départ de l'observateur. Le vent l'emporte de là</td></tr>
      <tr><td><code>baseM</code>, <code>thicknessM</code></td><td>Sa propre base et sa propre hauteur, en mètres — un nuage peut être plus bas ou plus haut que sa nappe</td></tr>
      <tr><td><code>widthM</code>, <code>depthM</code>, <code>rotationDeg</code></td><td>Son emprise, en mètres, et le cap vers lequel cette emprise est tournée</td></tr>
      <tr><td><code>density</code>, <code>darkness</code></td><td>Les siens ; une obscurité absente est celle de la couche</td></tr>
    </table>
    </div>
    <pre data-json="weatherTrack.keyframes"><code>{
  "weather": {
    "cloudLayers": [
      {
        "id": "low", "type": "cumulus",
        "baseM": 1500, "thicknessM": 800,
        "coverage": 0.55, "sizeM": 1400, "density": 1, "darkness": 0.15,
        "instances": [
          { "id": "the-one", "eastM": 0, "northM": 4200,
            "baseM": 1500, "thicknessM": 800,
            "widthM": 1900, "depthM": 1300, "rotationDeg": 12, "density": 1 }
        ]
      },
      { "id": "high", "type": "cirrus", "baseM": 8000, "thicknessM": 400,
        "coverage": 0.2, "sizeM": 2200, "density": 0.35, "iceCrystalAlignment": 0.65 }
    ],
    "precipitationType": "none", "precipitationIntensity": 0,
    "windDirectionDeg": 90, "windSpeed": 5, "storm": false
  }
}</code></pre>
    <p>Un enregistrement dont la météo a été <strong>relevée</strong> (il a un
      <code>weatherSource</code>) garde la réponse du relevé, pas un lien vers lui : ERA5 donne les
      bandes basse, moyenne et haute en trois couches nommées <code>record-low</code>,
      <code>record-mid</code> et <code>record-high</code>, la base basse estimée depuis l'écart entre
      température et point de rosée, les deux autres à 3 500 m et 8 000 m. Leur type est
      <code>unknown</code> (cirrus pour la haute), leur taille et leur densité sont des hypothèses de
      dessin : une réanalyse sait quelle part de chaque bande était couverte, pas à quoi les nuages
      ressemblaient. Redemandez le relevé depuis l'éditeur et les couches sont réécrites ; modifiez
      une couche à la main et l'enregistrement devient celui de l'auteur, la source retirée.</p>

    <h2>Un fichier entier</h2>
    <p>Le plus petit enregistrement qui énonce encore quelque chose — un ovale silencieux traversant
      le ciel en douze secondes, à une date réelle et en un lieu réel. Tout le reste du format est
      facultatif, et tout ce qui suit sert à quelque chose :</p>
    <pre data-json=""><code>${this.escape(this.example)}</code></pre>
    <p class="small">Pour le modifier et le voir jouer, collez-le dans <a href="/play/">le lecteur</a>,
      dont l'éditeur complète sur chaque clé du format, propose les mots que chacune accepte, et dit
      ce que le modèle en dit.</p>
    <p>C'est <a href="/demo-data/example-minimal.json"><code>/demo-data/example-minimal.json</code></a>
      sur ce site : vous pouvez le récupérer, et
      <a href="/play/?sighting=/demo-data/example-minimal.json">le jouer</a> avant d'y toucher.
      Remarquez que <code>angular</code> et <code>bounds</code> y figurent tous deux : l'angle est ce
      que le fichier SIGNIFIE, et les pixels en sont redérivés au chargement — écrivez l'angle, et
      laissez corriger une mauvaise estimation des pixels.</p>

    <h2>De plus gros, à lire</h2>
    <p>Chaque démo de ce site est un simple fichier que vous pouvez ouvrir. Ces quatre-là valent la
      lecture pour voir comment un vrai enregistrement est bâti :</p>
    <div class="table-scroll">
    <table>
      <tr><th>Fichier</th><th>Ce qu'il faut y regarder</th></tr>
      <tr><td><a href="/demo-data/witness-chiles.json"><code>witness-chiles.json</code></a></td><td>Un vrai dossier : un observateur, un identifiant de dossier partagé avec un second enregistrement, dix keyframes, un <code>weatherTrack</code> relevé avec son <code>weatherSource</code></td></tr>
      <tr><td><a href="/demo-data/sky-test-halos.json"><code>sky-test-halos.json</code></a></td><td>Aucun phénomène — un ciel réglé par un <code>weatherTrack</code> dont les images clés font varier l'alignement des cristaux, la couverture de cirrus et une couche de cumulus, vu par un <code>witnessTrack</code> qui balaie le cortège puis s'arrête</td></tr>
      <tr><td><a href="/demo-data/sky-test-clouds.json"><code>sky-test-clouds.json</code></a></td><td>Trois couches nuageuses avec altitude, épaisseur, taille, densité et vent en mètres, évoluant sur la timeline météo — et dans la première une entrée <code>instances</code> : un nuage du champ, placé et dimensionné en mètres, qui grossit et s'assombrit sur les deux minutes</td></tr>
      <tr><td><a href="/demo-data/sky-test-aircraft.json"><code>sky-test-aircraft.json</code></a></td><td>Un <code>instrument</code> et un <code>exposureSeconds</code>, et un décor d'aéronef avec sa <code>track</code> et sept <code>lights</code> à leurs cadences réelles</td></tr>
      <tr><td><a href="/demo-data/instrument-instamatic.json"><code>instrument-instamatic.json</code></a></td><td>La même observation que <code>witness-socorro.json</code>, à un champ près. Comparez les deux</td></tr>
    </table>
    </div>

    <h2>Quatre règles qui décident du sens d'un fichier</h2>
    <ul class="plain">
      <li><strong>Les champs discrets sont tenus, les continus sont interpolés.</strong> Une forme
        absente d'un keyframe ultérieur reste dans son état ; une forme dont le premier keyframe est
        à cinq secondes est déjà peinte, dans cet état, dès zéro. Pour qu'une chose cesse d'être
        visible, posez-lui un keyframe à <code>transparency: 1</code>.</li>
      <li><strong>Des angles, rien d'autre.</strong> Aucune taille ni distance réelle n'est stockée
        où que ce soit. Les mètres sont déduits, en inégalités, de ce que le phénomène a été déclaré
        passer derrière ou devant (<code>decor[].occludesSourceIds</code>).</li>
      <li><strong>L'énoncé l'emporte sur le déduit.</strong> <code>occludesSourceIds</code> contient des affirmations de l'observateur. Rien dans ce format
        <em>ne peut</em> les déduire : il décrit une apparence dans un champ de vision, pas une
        position dans l'espace.</li>
      <li><strong>Absent n'est pas zéro.</strong> Pas de piste sonore signifie que personne n'a posé
        la question ; <code>kind: "none"</code> signifie que l'observateur a déclaré n'avoir rien
        entendu. La même distinction traverse la météo et les nuages de glace.</li>
    </ul>
    <p class="small">Le <a href="https://github.com/RR0/UfoAtHome#data-format">README</a> porte la
      référence complète, champ par champ, avec le raisonnement derrière chaque choix ; c'est lui qui
      fait foi si cette page et lui venaient à diverger.</p>
  </div>
</section>
`
  }
}
