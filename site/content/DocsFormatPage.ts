import { DocsSection } from "./DocsSection.js"
import { tagNames_fr } from "../../src/component/messages/TagNames_fr.js"
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
    navLabel: { en: "The sighting file", fr: "Le fichier d'observation", es: "El archivo de avistamiento", it: "Il file di avvistamento" },
    title: { en: "The sighting file", fr: "Le fichier d'observation", es: "El archivo de avistamiento", it: "Il file di avvistamento" },
    description: {
      en: "What a recording file holds, field by field: the observation, what was seen, the weather "
        + "and its clouds, the case that lists several observers, and a whole working example to type in.",
      fr: "Ce que contient un fichier d'enregistrement, champ par champ : l'observation, ce qui a été "
        + "vu, la météo et ses nuages, le dossier qui liste plusieurs observateurs, et un exemple entier à taper.",
      es: "Lo que contiene un archivo de grabación, campo por campo: la observación, lo que se vio, el tiempo "
        + "y sus nubes, el caso que reúne a varios observadores, y un ejemplo completo y funcional para escribir.",
      it: "Che cosa contiene un file di registrazione, campo per campo: l'osservazione, ciò che è stato visto, il meteo "
        + "e le sue nuvole, il caso che elenca più osservatori, e un esempio completo e funzionante da digitare."
    },
    asideFromNav: true
  }

  private readonly lede: Said<string> = {
    en: "One recording is one JSON file, whether the editor wrote it or you did. This is what it can "
      + "hold, and what each field means.",
    fr: "Un enregistrement est un fichier JSON, que l'éditeur l'ait écrit ou vous. Voici ce qu'il peut "
      + "contenir, et ce que veut dire chaque champ.",
    es: "Una grabación es un archivo JSON, la haya escrito el editor o tú. Esto es lo que puede "
      + "contener, y lo que significa cada campo.",
    it: "Una registrazione è un file JSON, che l'abbia scritta l'editor o tu. Ecco che cosa può "
      + "contenere, e che cosa significa ogni campo."
  }

  /** The whole of `public/demo-data/example-minimal.json`, read at build time and quoted verbatim
   * below — see SiteBuilder.pages for why it is passed in rather than written out here. */
  constructor(private readonly example: string) {
    super()
  }

  render(language: SiteLanguage): string {
    return this.hero(language, this.meta.title, this.lede) + this.body(language)
  }

  private body(language: SiteLanguage): string {
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

  /** The tags a translation is known for, listed from the translations themselves so that the page
   * cannot fall behind them. */
  private tags(): string {
    return Object.keys(tagNames_fr).map(tag => `<code>${tag}</code>`).join(", ")
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
      <tr><td><code>timeZone</code></td><td>The IANA zone the offset was derived from (<code>"Europe/Paris"</code>): the rule, where <code>utcOffsetHours</code> is the number it gave at that date. Only the number is read to place the sky; the zone is what lets the offset be derived again when the date changes</td></tr>
      <tr><td><code>place</code></td><td><code>[{ lat, lng, name }]</code> — <code>name</code> is the fully qualified place name the coordinates were resolved from</td></tr>
      <tr><td><code>observer</code></td><td><code>{ id, title, lastName, firstNames }</code>, all optional; omit entirely for an anonymous observer. <code>id</code> is a reference to the person (on RR0, their directory: <code>"ZamoraLonnie"</code>); the other fields describe them when nobody has given them one</td></tr>
      <tr><td><code>description</code></td><td>The account in prose — one string, or one per language (see below)</td></tr>
      <tr><td><code>tags</code></td><td>A list of strings, written in English: they are technical terms, and two recordings that share one have to match on it. Each reader is shown them in their own language where a translation is known, which is the case today for ${this.tags()}. The list is not closed: anything else is shown as written, and classification codes (<code>"RR3"</code>, <code>"NL"</code>) or case references (<code>"Blue Book 8729"</code>) are written as they are. One changes the replay: <code>paralysis</code> keeps the observer's view still</td></tr>
      <tr><td><code>account</code></td><td>Who saw it and how the account travelled: <code>observerAgeYears</code> (at the time), <code>observerOccupation</code>, <code>source</code> (how it reached whoever wrote the recording: <code>on-site</code>, <code>interview</code>, <code>telephone</code>, <code>questionnaire</code>, <code>letter</code>, <code>social-media</code>, <code>press</code>) and <code>followedUp</code> (whether the observer was gone back to afterwards)</td></tr>
      <tr><td><code>sources</code></td><td>Where the account can be read as it was given, in the shape of an <a href="https://www.npmjs.com/package/@rr0/data">RR0 source</a>: <code>[{ type, title, authors, url, publication: { publisher, time }, index }]</code>, <code>type</code> being <code>book</code> or <code>article</code>, or nothing for a web page or a post, which is then simply its <code>url</code>. Shown in the player's <q>?</q> panel, linked when it has an address; copied unchanged into an RR0 case</td></tr>
      <tr><td><code>milestones</code></td><td>The named moments of the account, shown on the seek bar: <code>[{ t, label, note }]</code>, <code>label</code> being the letter or number the account itself uses (<code>"A"</code>, <code>"B"</code>) or a couple of words, <code>note</code> what happened then, in the account's words where possible (one string, or one per language)</td></tr>
      <tr><td><code>roads</code></td><td>The roads or paths the account's own plan draws, when the map does not have them: <code>[{ id, title, surface, widthM, path, source }]</code>, <code>surface</code> being <code>paved</code>, <code>gravel</code> or <code>dirt</code>, <code>path</code> the centre line as <code>[{ eastM, northM }]</code> from the observer's place at the start, and <code>source</code> the plan or survey it was read off</td></tr>
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
    { "type": "event", "eventType": "sighting", "url": "observer-chiles.json" },
    { "type": "event", "eventType": "sighting", "url": "observer-whitted.json" }
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
    "fr": "Tout le compte rendu de Lonnie Zamora, d'un seul tenant…",
    "en": "Lonnie Zamora's whole account, of a piece…"
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
  "angular": { "widthDeg": 1.2, "heightDeg": 0.4 },
  "aim": { "azimuthDeg": 353.6, "altitudeDeg": 0.6 }
}</code></pre>
    <div class="table-scroll">
    <table>
      <tr><th>Field</th><th>Meaning</th></tr>
      <tr><td><code>kind</code></td><td><code>oval</code>, or <code>polygon</code>, which then also takes <code>points</code>: <code>[{ x, y }]</code> in pixels from the top-left corner of <code>bounds</code>, spanning its width and height, so that the outline is stretched with it when the angle resizes the box</td></tr>
      <tr><td><code>title</code></td><td>Its name, shown when the pointer is over it; one string, or one per language</td></tr>
      <tr><td><code>color</code></td><td>Any CSS colour</td></tr>
      <tr><td><code>angle</code></td><td>Its tilt, in radians about its own centre, positive clockwise on screen</td></tr>
      <tr><td><code>transparency</code></td><td>0 opaque to 1 invisible</td></tr>
      <tr><td><code>haloScale</code></td><td>The glow around it; 0 is none</td></tr>
      <tr><td><code>brightness</code></td><td>How dazzling: a veil, aperture spikes, a core clipped to white</td></tr>
      <tr><td><code>blur</code></td><td>How indistinct the observer said the edges looked</td></tr>
      <tr><td><code>angular</code></td><td>Its apparent size in degrees — see below</td></tr>
      <tr><td><code>aim</code></td><td>Where it was in the observer's sky: the direction of its centre, <code>azimuthDeg</code> clockwise from true north and <code>altitudeDeg</code> above the horizon. Not the way the observer was facing, which is the pose's <code>headingDeg</code> and <code>pitchDeg</code> — see below</td></tr>
    </table>
    </div>
    <p><strong><code>aim</code> places it, <code>angular</code> sizes it.</strong> <code>bounds</code>
      is those two projected onto the fixed 640×360 canvas at the pose's own heading and field of
      view, through the recording's own instrument; it is re-derived on load, so a file survives a
      change of canvas, of field of view, of instrument, or of where the observer was looking. If the
      pixels and the angles ever disagree, the angles win: moving <code>bounds</code> in a file does
      nothing while <code>aim</code> is there. A file written by hand can leave <code>bounds</code>
      out entirely.</p>
    <p><code>timeline.order</code> is the back-to-front paint order, <code>timeline.groups</code> the
      grouped source ids. Both optional.</p>

    <h2>Everything around it</h2>
    <div class="table-scroll">
    <table>
      <tr><th>Field</th><th>Meaning</th></tr>
      <tr><td><code>observerTrack</code></td><td><code>{ keyframes: [{ t, pose }] }</code> — <code>pose</code> holds <code>lat</code>, <code>lng</code>, <code>elevationM</code> (above the local ground), <code>headingDeg</code>, <code>pitchDeg</code>, <code>rollDeg</code>, <code>fovDeg</code>, and for a camera <code>fNumber</code> and <code>focusDistanceM</code>. Played the way a person moves: exactly the stated pose at each keyframe, and between them a movement that gathers speed, carries it through the keyframes that keep moving, and slows down into a pause — two keyframes with the same place, or the same heading. A look starts and ends still; a walk or drive already under way at the first keyframe carries on. Stopping and setting off on foot add their own jolt, a nod of the head that dies within a second and a half, turned into the image as much as the instrument lets it (an eye hardly, a hand-held camera fully). And a body at rest is never quite still: standing or waiting, the view sways by millimetres and drifts by a tenth of a degree, slowly, the same way at the same instant — except for an observer the account says was paralysed (tag <code>paralysis</code>)</td></tr>
      <tr><td><code>weatherTrack</code></td><td><code>{ keyframes: [{ t, weather }] }</code> — the sky's conditions along the recording: precipitation, wind, storm, and the clouds as layers with real heights, each able to hold individual clouds placed in metres. Every field of a <code>weather</code> is in the next section</td></tr>
      <tr><td><code>weatherSource</code></td><td><code>{ id, name, url }</code> of the record the weather was looked up from. Its presence means the recording is replayed exactly as authored and never looked up again. Absent means the observer's own account</td></tr>
      <tr><td><code>lightPollution</code></td><td>How bright the night sky of the place is, towns and all: the zenith of a moonless night in magnitudes per square arcsecond, as a Sky Quality Meter reads it or as the <a href="https://doi.org/10.1126/sciadv.1600377">World Atlas of the artificial night sky brightness</a> gives it (its “SQM” figure, Falchi et al. 2016, which <a href="https://www.lightpollutionmap.info">lightpollutionmap.info</a> shows for any place). <code>22</code> is a natural sky, a suburb about <code>19</code>, a city centre <code>17</code>. Absent means a natural sky. The towns' share, what is left once the natural 22 is taken out, is added to the sky as light: brighter toward the horizon, where the low air scatters more of it back, and drawn in the warm white of a 3000 K lamp. It drowns the Milky Way and the zodiacal light, and takes stars away, by the difference in the faintest star an eye can pick out (Crumey 2014): about two magnitudes at <code>19</code>. The Moon now does the same. <code>"derived"</code> when looked up in the atlas, <code>"stated"</code> when the observer measured it</td></tr>
      <tr><td><code>soundTrack</code></td><td><code>{ keyframes: [{ t, sound }] }</code> — <code>kind</code> (none/hum/whistle/rumble/crackle), <code>volume</code>, <code>pitchHz</code>, optional <code>src</code> of a real recording. <code>volume</code> and <code>pitchHz</code> glide between keyframes, <code>kind</code> and <code>src</code> change at the keyframe. A <code>src</code> on another site must be served to any origin (CORS)</td></tr>
      <tr><td><code>references</code></td><td>Pictures of the place laid over the scene: <code>src</code> (an address, or a <code>data:</code> URL for a picture added from a disk), <code>kind</code> (photo/panorama), <code>registration</code> (<code>headingDeg</code>, <code>pitchDeg</code>, <code>rollDeg</code>, <code>fovDeg</code>), <code>opacity</code>, <code>credit</code>/<code>creditUrl</code>, optional <code>t</code> and <code>drawing</code>, <code>from</code> (<code>{ lat, lng }</code>, where it was taken: the player fades it out as the observer walks away from that point; absent, it is never faded), and the <code>landmarks</code> it was lined up on (<code>id</code>, <code>label</code>, <code>picture</code> as <code>{ u, v }</code> from the top-left corner, <code>scene</code> as <code>{ azimuthDeg, altitudeDeg }</code>)</td></tr>
      <tr><td><code>instrument</code>, <code>exposureSeconds</code></td><td>What it was observed through, and how long the shutter was open. Absent means the naked eye. <code>instrument</code> is one of <code>eye</code>, <code>rectilinear-lens</code> (a camera of unknown make), <code>instamatic-126</code>, <code>slr-35mm-50</code>, <code>slr-35mm-zoom</code>, <code>phone-landscape</code>, <code>phone-portrait</code>; <code>exposureSeconds</code> is one value for the whole recording, held to that device's own range</td></tr>
      <tr><td><code>iso</code></td><td>The speed of the film or sensor the picture was taken on, when it is known: <code>400</code> for a 400 ISO film. Absent means the device's own (an SLR's colour negative is 100, an Instamatic's 64). A camera's picture is not answered like an eye's: a film does not adapt to the sky, it receives an exposure — the light, times the shutter, over the square of the f-number — and answers it with its own curve (a negative's soft one, a slide's steeper one, a sensor's straight line that stops at white). So a night pose comes out with a black sky and whatever was bright on it standing out</td></tr>
      <tr><td><code>sway</code></td><td>How much the body holding the instrument moves the view when not walking: <code>1</code> for a person standing or sitting, <code>0</code> for a camera on a tripod, anything between or above for less or more. Absent means <code>1</code> — except for an observer the account says was paralysed (tag <code>paralysis</code>), for whom it is <code>0</code>, and for an exposure longer than half a second, which no hand holds still: that is a tripod, and <code>0</code> too</td></tr>
      <tr><td><code>vehicle</code></td><td>The vehicle the observer was in, when the decor does not draw it: <code>{ kind, windowsOpen, noise }</code>, <code>kind</code> being <code>car</code>, <code>van</code>, <code>truck</code>, <code>motorcycle</code> or <code>generic</code>. Heard from inside: its engine follows the observer's own journey — the gear from the speed, the revs from the gear, the effort from speeding up or slowing down — with the road and the wind, muffled by a closed cabin, let in by open windows; <code>noise</code> is its loudness against an ordinary one of its kind (1 by default)</td></tr>
      <tr><td><code>decor</code></td><td>Scenery at a real <code>eastM</code>/<code>northM</code> from the observer: buildings (with <code>floors</code>, <code>windows</code>), trees, shrubs, streetlights, vehicles, bridges, other observers, aircraft — optionally with a <code>track</code> and <code>lights</code> whose <code>pattern</code> carries a real flash rate. See below</td></tr>
    </table>
    </div>
    <p>A <strong>decor object</strong> is stated in metres, like everything that is not the phenomenon:</p>
    <div class="table-scroll">
    <table>
      <tr><th>Field</th><th>Meaning</th></tr>
      <tr><td><code>eastM</code>, <code>northM</code>, <code>headingDeg</code></td><td>Where it stands from the observer, and which way its front faces, clockwise from true north</td></tr>
      <tr><td><code>sizeM</code></td><td><code>{ widthM, lengthM, heightM }</code> along its own axes, length being the way it faces. Each axis is optional: one nobody measured keeps the built-in shape's own proportion</td></tr>
      <tr><td><code>model</code></td><td>A real 3D model standing in for the built-in shape: a catalogue entry by <code>id</code>, or a glTF/GLB file at <code>url</code> (which wins, must be readable from any origin, and then needs its <code>credit</code>; a relative one is read from the file that states it). It never decides the size: it is scaled, keeping its proportions, to the first measured axis among length, height and width, or to the real size the catalogue gives it. Seen from inside, and whenever the model cannot be had, the built-in shape is drawn instead</td></tr>
      <tr><td><code>bridge</code></td><td>For a <code>"bridge"</code>: how it is built. <code>sizeM.lengthM</code> is its whole length along the road, embankments included, <code>widthM</code> the deck's width and <code>heightM</code> the height of the road on the deck above the ground; <code>spanM</code> is the open span under the deck, the road running on a bank of earth sloping down to the ground on each side of it; <code>deckThicknessM</code> the slab's thickness (1.2 by default); <code>railing</code> <code>{ heightM, postSpacingM, rails }</code> the railing along both edges, posts and rails whose openings are rectangles (1.05 m, 1.5 m and 2 rails by default). Drawn at those measurements, never stretched</td></tr>
      <tr><td><code>track</code></td><td><code>[{ t, eastM, northM, altitudeM, headingDeg }]</code> when it moves, <code>altitudeM</code> above the observer. Position blends between keyframes; the heading is held from one to the next</td></tr>
      <tr><td><code>lights</code></td><td>Its lamps: <code>id</code>, <code>offsetM</code> <code>{ x, y, z }</code> from its centre (right, up, front), <code>color</code>, <code>intensity</code> (1 is an ordinary navigation light) and a <code>pattern</code>: <code>{ "kind": "steady" }</code>, or <code>{ "kind": "flash", perMinute, dutyCycle, phase }</code>, the rate as regulations state it, the lit fraction of each cycle (about 0.5 for a filament flasher, 0.01 for a strobe) and an offset from 0 to 1 between lamps. The editor fills them from presets: airliner, helicopter, car headlights, car hazard flashers, emergency beacons, streetlamp</td></tr>
      <tr><td><code>engine</code></td><td>A vehicle heard running: <code>{ kind, noise }</code>, as <code>vehicle</code> above. Its engine follows its own <code>track</code>, heard from where the observer stands, fainter and duller with distance</td></tr>
      <tr><td><code>occludesSourceIds</code></td><td>The phenomena the observer said it stood in front of — see the rules below</td></tr>
    </table>
    </div>

    <h2>What it was: interpretations</h2>
    <p>A recording states angles, and a body in metres is never part of what was seen. It is a
      claim about it, and it is tested by standing it in the scene and looking at it from where
      the observer stood: it casts its shadow, the ground can hide it, and its outline is measured
      against what the observer said at every instant. An interpretation is shown alone, as the
      world it claims; asked to compare (the ◌ button, or <code>compare-account</code> on
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
      <tr><td><code>track</code></td><td>Where it is and what it looks like at each <code>t</code>. A position is stated either in the world (<code>eastM</code>/<code>northM</code> from where the observer stood at the start, like the decor, with <code>onGround</code> or <code>altitudeAboveGroundM</code>) or from the observer at that instant (<code>azimuthDeg</code>, <code>altitudeDeg</code>, <code>distanceM</code>). A body <code>onGround</code> stands on the relief; a direction with no distance then meets the ground where that line does. <code>sizeM</code>, <code>attitude</code> (<code>headingDeg</code>, <code>pitchDeg</code>, <code>rollDeg</code>) and <code>appearance</code> (<code>color</code>, <code>albedo</code>) hold until a later keyframe restates them. <code>present: false</code> takes the body out of the scene from that keyframe on, and <code>present: true</code> brings it back. A <code>flame</code> (<code>lengthM</code>, <code>widthM</code>, <code>color</code> at the nozzle, <code>tipColor</code>, <code>luminanceCdM2</code>) is lit at the keyframe that states it, comes out of the model's node named <code>exhaust</code> (or the one its <code>node</code> names), lights what is around it, raises dust where it meets the ground when <code>raisesDust</code> says so, and is put out by a <code>luminanceCdM2</code> of 0</td></tr>
      <tr><td><code>motions</code></td><td>In a keyframe: how far along each of its model's own movements it is, by the movement's name — the glTF file's animations. <code>0</code> is a movement's start, <code>1</code> its end, and one that repeats goes on past 1: <code>{ "legs-turn": 7 }</code> is seven turns. The model says what moves and how; the track says when. Each movement blends between the keyframes that state it, whatever other keyframes move the body in between, holds after the last and stands at 0 before the first. Valensole's departure is written so: <code>{ "t": 246000, "motions": { "pivot-retract": 0 } }</code>, <code>{ "t": 248000, "motions": { "pivot-retract": 1, "legs-turn": 0 } }</code>, … <code>{ "t": 262000, "motions": { "legs-turn": 7 } }</code></td></tr>
      <tr><td><code>lights</code></td><td>In a keyframe: the luminance, cd/m², of each of its model's own lights, by the name of the light's material in the glTF file — so that one body carries lights that each do their own thing, a steady white at each end and a red one flashing between. The model says where each light is, how big and what colour; the track says how bright and when. Each light blends between the keyframes that name it and holds after the last, so a switch is two keyframes a millisecond apart; a light no keyframe names glows at its share of <code>appearance.luminanceCdM2</code>. A light too small to show is seen by its glare, and whatever stands between it and the eye — the body's own hull, a bridge — hides it. Silly-le-Long's red light: <code>{ "t": 499, "lights": { "front-red": 1500 } }</code>, <code>{ "t": 500, "lights": { "front-red": 0 } }</code></td></tr>
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
      <tr><td><code>precipitationType</code>, <code>precipitationIntensity</code></td><td>none/rain/snow/hail, and 0–1. Stated at a keyframe, played the way it falls: a shower begins at the keyframe that starts it with its first drops, and reaches the stated rate no faster than real rain does (nothing to heaviest in twenty seconds); it stops the same way. A change the keyframes spread over longer is followed exactly</td></tr>
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

    <h2>Where each value comes from</h2>
    <p>Any value in a recording can be written bare, or wrapped with where it came from:</p>
    <pre data-json="none"><code>"durationSeconds": {
  "value": 15,
  "basis": "derived",
  "rationale": "13 to 18 s in the investigator's synthesis; the middle taken"
}</code></pre>
    <p><code>basis</code> is <code>stated</code> (the observer said it, and what a bare value
      means), <code>derived</code> (worked out from what they said plus something checkable: a
      road's width, a map, a measured drawing; <code>rationale</code> gives the working) or
      <code>assumed</code> (chosen so the reconstruction has a value at all, on nothing the observer
      said). The list of <code>assumed</code> values is the list of what to go back to the observer
      or the file for, which is why it is worth writing even when nothing else is.</p>

    <h2>Checking a file</h2>
    <p>The format is also published as a <a href="/sighting.schema.json">JSON Schema</a>,
      generated from the same types as the player: every key it knows, what each may hold, and the
      words a closed list accepts. A misspelt key or an unknown value fails it. It says nothing
      about what may be left out, which is a question of meaning this page answers. To see the
      result, open the file in <a href="/play/">the player</a>, from a link, by pasting it, or
      from your disk with the pictures and models it names. The player checks it the same way on
      loading, and says what it could not play as written behind a ⚠ over the picture: a key
      nothing reads, a word outside its list, and what it had to make up because a shape's first
      keyframe left it out (a field held from the keyframe before is the rule above, not a
      problem).</p>

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
      <tr><td><a href="/demo-data/observer-chiles.json"><code>observer-chiles.json</code></a></td><td>A real case: an observer, a case id shared with a second recording, ten keyframes, a looked-up <code>weatherTrack</code> with its <code>weatherSource</code></td></tr>
      <tr><td><a href="/demo-data/sky-test-halos.json"><code>sky-test-halos.json</code></a></td><td>No phenomenon at all — a sky set up by a <code>weatherTrack</code> whose keyframes change the crystals' alignment, the cirrus cover and a cumulus deck, watched through a <code>observerTrack</code> that pans across the display and then holds</td></tr>
      <tr><td><a href="/demo-data/sky-test-clouds.json"><code>sky-test-clouds.json</code></a></td><td>Three cloud layers with metre-based altitude, thickness, size, density and wind, evolving on the weather timeline — and in the first one an <code>instances</code> entry: one cloud of the field, placed and sized in metres, that grows and darkens over the two minutes</td></tr>
      <tr><td><a href="/demo-data/sky-test-aircraft.json"><code>sky-test-aircraft.json</code></a></td><td>An <code>instrument</code>, an <code>exposureSeconds</code> and an <code>iso</code>, and a <code>decor</code> aircraft with a <code>track</code> and nine <code>lights</code> at their real flash rates, landing lights included</td></tr>
      <tr><td><a href="/demo-data/instrument-instamatic.json"><code>instrument-instamatic.json</code></a></td><td>The same sighting as <code>observer-socorro.json</code>, changed in one field. Diff the two</td></tr>
    </table>
    </div>

    <h2>Four rules that decide what a file means</h2>
    <ul class="plain">
      <li><strong>Discrete fields are held, continuous ones are blended.</strong> A shape left out of
        a later keyframe stays as it was, and so does any field a keyframe leaves out of a shape it
        does restate: a keyframe that only gives a new <code>aim</code> moves the shape and keeps
        everything else (restating <code>bounds</code> without <code>aim</code> or
        <code>angular</code> is taken as moving it by its pixels); one whose first keyframe is at five seconds is already
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
    <p class="small">This page is the reference for the format. The reasoning behind each field is in
      the doc comments of its type, which the excerpts above complete with, and in the
      <a href="https://github.com/RR0/UfoAtHome">source</a>.</p>
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
      <tr><td><code>timeZone</code></td><td>Le fuseau IANA dont le décalage a été dérivé (<code>"Europe/Paris"</code>) : la règle, là où <code>utcOffsetHours</code> est le nombre qu'elle donnait à cette date. Seul le nombre sert à placer le ciel ; le fuseau permet de dériver à nouveau le décalage quand la date change</td></tr>
      <tr><td><code>place</code></td><td><code>[{ lat, lng, name }]</code> — <code>name</code> est le nom qualifié depuis lequel les coordonnées ont été résolues</td></tr>
      <tr><td><code>observer</code></td><td><code>{ id, title, lastName, firstNames }</code>, tous facultatifs ; à omettre entièrement pour un observateur anonyme. <code>id</code> est une référence à la personne (sur RR0, son répertoire : <code>"ZamoraLonnie"</code>) ; les autres champs la décrivent quand personne ne lui en a encore donné</td></tr>
      <tr><td><code>description</code></td><td>Le récit en prose — une chaîne, ou une par langue (voir plus bas)</td></tr>
      <tr><td><code>tags</code></td><td>Une liste de chaînes, écrites en anglais : ce sont des termes techniques, et deux enregistrements qui en partagent un doivent s'y égaler. Chaque lecteur les voit dans sa langue lorsqu'une traduction est connue, ce qui est le cas aujourd'hui de ${this.tags()}. La liste n'est pas fermée : tout autre tag est affiché tel qu'écrit, et les codes de classement (<code>"RR3"</code>, <code>"NL"</code>) ou les références de dossier (<code>"Blue Book 8729"</code>) s'écrivent tels quels. Un seul change le rejeu : <code>paralysis</code> immobilise la vue de l'observateur</td></tr>
      <tr><td><code>account</code></td><td>Qui l'a vu et comment le récit a circulé : <code>observerAgeYears</code> (à l'époque), <code>observerOccupation</code>, <code>source</code> (comment il est parvenu à qui a écrit l'enregistrement : <code>on-site</code>, <code>interview</code>, <code>telephone</code>, <code>questionnaire</code>, <code>letter</code>, <code>social-media</code>, <code>press</code>) et <code>followedUp</code> (si l'observateur a été revu ensuite)</td></tr>
      <tr><td><code>sources</code></td><td>Où lire le récit tel qu'il a été donné, sous la forme d'une <a href="https://www.npmjs.com/package/@rr0/data">source RR0</a> : <code>[{ type, title, authors, url, publication: { publisher, time }, index }]</code>, <code>type</code> valant <code>book</code> ou <code>article</code>, ou rien pour une page web ou un post, qui n'est alors que son <code>url</code>. Affichées dans le panneau <q>?</q> du lecteur, en lien quand elles ont une adresse ; reprises telles quelles dans un dossier RR0</td></tr>
      <tr><td><code>milestones</code></td><td>Les moments nommés du récit, affichés sur la barre de lecture : <code>[{ t, label, note }]</code>, <code>label</code> étant la lettre ou le numéro qu'utilise le récit lui-même (<code>"A"</code>, <code>"B"</code>) ou deux ou trois mots, <code>note</code> ce qui s'est passé alors, dans les mots du récit si possible (une chaîne, ou une par langue)</td></tr>
      <tr><td><code>roads</code></td><td>Les routes ou chemins que dessine le plan du récit, quand la carte ne les a pas : <code>[{ id, title, surface, widthM, path, source }]</code>, <code>surface</code> valant <code>paved</code>, <code>gravel</code> ou <code>dirt</code>, <code>path</code> étant l'axe en <code>[{ eastM, northM }]</code> depuis le lieu de l'observateur au départ, et <code>source</code> le plan ou le relevé d'où il est tiré</td></tr>
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
    { "type": "event", "eventType": "sighting", "url": "observer-chiles.json" },
    { "type": "event", "eventType": "sighting", "url": "observer-whitted.json" }
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
    "fr": "Tout le compte rendu de Lonnie Zamora, d'un seul tenant…",
    "en": "Lonnie Zamora's whole account, of a piece…"
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
  "angular": { "widthDeg": 1.2, "heightDeg": 0.4 },
  "aim": { "azimuthDeg": 353.6, "altitudeDeg": 0.6 }
}</code></pre>
    <div class="table-scroll">
    <table>
      <tr><th>Champ</th><th>Sens</th></tr>
      <tr><td><code>kind</code></td><td><code>oval</code>, ou <code>polygon</code>, qui prend alors aussi <code>points</code> : <code>[{ x, y }]</code> en pixels depuis le coin haut gauche de <code>bounds</code>, couvrant sa largeur et sa hauteur, pour que le contour s'étire avec lui quand l'angle redimensionne la boîte</td></tr>
      <tr><td><code>title</code></td><td>Son nom, affiché au survol ; une chaîne, ou une par langue</td></tr>
      <tr><td><code>color</code></td><td>N'importe quelle couleur CSS</td></tr>
      <tr><td><code>angle</code></td><td>Son inclinaison, en radians autour de son propre centre, positive dans le sens horaire à l'écran</td></tr>
      <tr><td><code>transparency</code></td><td>De 0 opaque à 1 invisible</td></tr>
      <tr><td><code>haloScale</code></td><td>La lueur autour ; 0 pour aucune</td></tr>
      <tr><td><code>brightness</code></td><td>L'éblouissement : un voile, les aigrettes du diaphragme, un cœur saturé au blanc</td></tr>
      <tr><td><code>blur</code></td><td>À quel point l'observateur a dit les contours indistincts</td></tr>
      <tr><td><code>angular</code></td><td>Sa taille apparente en degrés — voir plus bas</td></tr>
      <tr><td><code>aim</code></td><td>Où il était dans le ciel de l'observateur : la direction de son centre, <code>azimuthDeg</code> dans le sens horaire depuis le nord vrai et <code>altitudeDeg</code> au-dessus de l'horizon. Pas la direction où regardait l'observateur, qui est le <code>headingDeg</code> et le <code>pitchDeg</code> de la pose — voir plus bas</td></tr>
    </table>
    </div>
    <p><strong><code>aim</code> le place, <code>angular</code> le dimensionne.</strong>
      <code>bounds</code> est la projection des deux sur le canevas fixe de 640×360, au cap et au
      champ de la pose, à travers l'instrument de l'enregistrement ; il est redérivé au chargement, si
      bien qu'un fichier survit à un changement de canevas, de champ, d'instrument, ou de direction
      du regard. Si les pixels et les angles divergent, les angles gagnent : déplacer
      <code>bounds</code> dans un fichier ne fait rien tant que <code>aim</code> est là. Un fichier
      écrit à la main peut omettre <code>bounds</code> entièrement.</p>
    <p><code>timeline.order</code> est l'ordre de tracé de l'arrière vers l'avant,
      <code>timeline.groups</code> les identifiants groupés. Les deux sont facultatifs.</p>

    <h2>Tout ce qu'il y a autour</h2>
    <div class="table-scroll">
    <table>
      <tr><th>Champ</th><th>Sens</th></tr>
      <tr><td><code>observerTrack</code></td><td><code>{ keyframes: [{ t, pose }] }</code> — <code>pose</code> porte <code>lat</code>, <code>lng</code>, <code>elevationM</code> (au-dessus du sol local), <code>headingDeg</code>, <code>pitchDeg</code>, <code>rollDeg</code>, <code>fovDeg</code>, et pour un appareil <code>fNumber</code> et <code>focusDistanceM</code>. Joué comme une personne bouge : exactement la pose énoncée à chaque keyframe, et entre elles un mouvement qui prend de la vitesse, la garde à travers les keyframes qui continuent de bouger, et ralentit avant une pause — deux keyframes au même endroit, ou au même cap. Un regard part et s'arrête immobile ; une marche ou un trajet déjà engagés à la première keyframe continuent. S'arrêter et repartir à pied ajoutent leur secousse, un hochement de tête amorti en une seconde et demie, qui passe dans l'image autant que l'instrument le laisse passer (à peine pour un œil, entièrement pour un appareil tenu à la main). Et un corps au repos n'est jamais tout à fait immobile : debout ou en attente, la vue oscille de quelques millimètres et dérive d'un dixième de degré, lentement, de la même façon au même instant — sauf pour un observateur que le compte rendu dit paralysé (tag <code>paralysis</code>)</td></tr>
      <tr><td><code>weatherTrack</code></td><td><code>{ keyframes: [{ t, weather }] }</code> — l'état du ciel le long de l'enregistrement : précipitation, vent, orage, et les nuages en couches à hauteur réelle, chacune pouvant porter des nuages individuels placés en mètres. Chaque champ d'un <code>weather</code> est dans la section suivante</td></tr>
      <tr><td><code>weatherSource</code></td><td><code>{ id, name, url }</code> du relevé d'où vient la météo. Sa présence signifie que l'enregistrement est rejoué tel qu'il a été composé et n'est jamais reconsulté. Absent : le récit de l'observateur lui-même</td></tr>
      <tr><td><code>lightPollution</code></td><td>La brillance du ciel nocturne du lieu, villes comprises : le zénith d'une nuit sans Lune en magnitudes par seconde d'arc carrée, tel qu'un Sky Quality Meter le lit ou que l'<a href="https://doi.org/10.1126/sciadv.1600377">atlas mondial de la brillance artificielle du ciel nocturne</a> le donne (son chiffre « SQM », Falchi et al. 2016, que <a href="https://www.lightpollutionmap.info">lightpollutionmap.info</a> affiche pour tout lieu). <code>22</code> est un ciel naturel, une banlieue vers <code>19</code>, un centre-ville <code>17</code>. Absent : un ciel naturel. La part des villes, ce qui reste une fois ôtés les 22 naturels, s'ajoute au ciel comme de la lumière : plus forte vers l'horizon, où l'air bas en renvoie davantage, et dessinée du blanc chaud d'une lampe à 3000 K. Elle noie la Voie lactée et la lumière zodiacale, et retire des étoiles, de l'écart entre les étoiles les plus faibles qu'un œil distingue (Crumey 2014) : environ deux magnitudes à <code>19</code>. La Lune en fait désormais autant. <code>"derived"</code> quand la valeur vient de l'atlas, <code>"stated"</code> quand l'observateur l'a mesurée</td></tr>
      <tr><td><code>soundTrack</code></td><td><code>{ keyframes: [{ t, sound }] }</code> — <code>kind</code> (none/hum/whistle/rumble/crackle), <code>volume</code>, <code>pitchHz</code>, et un <code>src</code> facultatif vers un vrai enregistrement. <code>volume</code> et <code>pitchHz</code> glissent d'une image clé à l'autre, <code>kind</code> et <code>src</code> changent à l'image clé. Un <code>src</code> sur un autre site doit être servi à toute origine (CORS)</td></tr>
      <tr><td><code>references</code></td><td>Photos des lieux posées sur la scène : <code>src</code> (une adresse, ou une URL <code>data:</code> pour une photo ajoutée depuis un disque), <code>kind</code> (photo/panorama), <code>registration</code> (<code>headingDeg</code>, <code>pitchDeg</code>, <code>rollDeg</code>, <code>fovDeg</code>), <code>opacity</code>, <code>credit</code>/<code>creditUrl</code>, <code>t</code> et <code>drawing</code> facultatifs, <code>from</code> (<code>{ lat, lng }</code>, d'où elle a été prise : le lecteur l'efface en fondu quand l'observateur s'éloigne de ce point ; absent, elle ne s'efface jamais), et les <code>landmarks</code> sur lesquels elle a été recalée (<code>id</code>, <code>label</code>, <code>picture</code> en <code>{ u, v }</code> depuis le coin haut gauche, <code>scene</code> en <code>{ azimuthDeg, altitudeDeg }</code>)</td></tr>
      <tr><td><code>instrument</code>, <code>exposureSeconds</code></td><td>À travers quoi l'observation a été faite, et combien de temps l'obturateur est resté ouvert. Absent : l'œil nu. <code>instrument</code> vaut <code>eye</code>, <code>rectilinear-lens</code> (un appareil de modèle inconnu), <code>instamatic-126</code>, <code>slr-35mm-50</code>, <code>slr-35mm-zoom</code>, <code>phone-landscape</code>, <code>phone-portrait</code> ; <code>exposureSeconds</code> est une valeur pour tout l'enregistrement, tenue dans la plage de l'appareil</td></tr>
      <tr><td><code>iso</code></td><td>La sensibilité du film ou du capteur de la photo, quand on la connaît : <code>400</code> pour un film 400 ISO. Absent : celle de l'appareil (100 pour le négatif couleur d'un reflex, 64 pour celui d'un Instamatic). La photo d'un appareil ne répond pas comme un œil : un film ne s'adapte pas au ciel, il reçoit une exposition (la lumière, fois le temps de pose, divisée par le carré de l'ouverture) et y répond selon sa propre courbe (douce pour un négatif, plus raide pour une diapositive, droite puis arrêtée net au blanc pour un capteur). Une pose de nuit sort donc avec un ciel noir, et ce qui y brillait ressort</td></tr>
      <tr><td><code>sway</code></td><td>Combien le corps qui tient l'instrument fait bouger la vue hors de la marche : <code>1</code> pour une personne debout ou assise, <code>0</code> pour un appareil sur trépied, entre les deux ou au-delà pour moins ou plus. Absent, c'est <code>1</code> — sauf pour un observateur que le compte rendu dit paralysé (tag <code>paralysis</code>), pour qui c'est <code>0</code>, et pour une pose de plus d'une demi-seconde, qu'aucune main ne tient immobile : c'est un trépied, et <code>0</code> aussi</td></tr>
      <tr><td><code>vehicle</code></td><td>Le véhicule où se trouvait l'observateur, quand le décor ne le dessine pas : <code>{ kind, windowsOpen, noise }</code>, <code>kind</code> valant <code>car</code>, <code>van</code>, <code>truck</code>, <code>motorcycle</code> ou <code>generic</code>. Entendu de l'intérieur : son moteur suit le trajet de l'observateur — le rapport selon la vitesse, le régime selon le rapport, l'effort selon qu'il accélère ou ralentit — avec le roulement et le vent, étouffés par un habitacle fermé, entrant par des vitres ouvertes ; <code>noise</code> est son niveau face à un véhicule ordinaire de son genre (1 par défaut)</td></tr>
      <tr><td><code>decor</code></td><td>Le décor, à une vraie distance <code>eastM</code>/<code>northM</code> de l'observateur : bâtiments (avec <code>floors</code>, <code>windows</code>), arbres, buissons, lampadaires, véhicules, ponts, autres observateurs, aéronefs — éventuellement avec une <code>track</code> et des <code>lights</code> dont le <code>pattern</code> porte une vraie cadence d'éclats. Voir ci-dessous</td></tr>
    </table>
    </div>
    <p>Un <strong>objet du décor</strong> s'énonce en mètres, comme tout ce qui n'est pas le phénomène :</p>
    <div class="table-scroll">
    <table>
      <tr><th>Champ</th><th>Sens</th></tr>
      <tr><td><code>eastM</code>, <code>northM</code>, <code>headingDeg</code></td><td>Où il se tient par rapport à l'observateur, et vers où regarde son avant, en degrés depuis le nord vrai dans le sens horaire</td></tr>
      <tr><td><code>sizeM</code></td><td><code>{ widthM, lengthM, heightM }</code> selon ses propres axes, la longueur étant le sens où il regarde. Chaque axe est facultatif : celui que personne n'a mesuré garde la proportion de la forme intégrée</td></tr>
      <tr><td><code>model</code></td><td>Un vrai modèle 3D à la place de la forme intégrée : une entrée du catalogue par <code>id</code>, ou un fichier glTF/GLB à <code>url</code> (qui l'emporte, doit être lisible depuis toute origine, et exige alors son <code>credit</code> ; une adresse relative se lit depuis le fichier qui l'énonce). Il ne décide jamais de la taille : il est mis à l'échelle, proportions gardées, sur le premier axe mesuré parmi longueur, hauteur et largeur, ou sur la taille réelle que lui donne le catalogue. Vu de l'intérieur, et chaque fois que le modèle ne peut être obtenu, c'est la forme intégrée qui est dessinée</td></tr>
      <tr><td><code>bridge</code></td><td>Pour un <code>"bridge"</code> : comment il est construit. <code>sizeM.lengthM</code> est toute sa longueur le long de la route, remblais compris, <code>widthM</code> la largeur du tablier et <code>heightM</code> la hauteur de la chaussée sur le tablier au-dessus du sol ; <code>spanM</code> est la portée libre sous le tablier, la route courant de chaque côté sur un remblai de terre qui descend jusqu'au sol ; <code>deckThicknessM</code> l'épaisseur de la dalle (1,2 par défaut) ; <code>railing</code> <code>{ heightM, postSpacingM, rails }</code> le garde-corps des deux rives, poteaux et lisses dont les ouvertures sont des rectangles (1,05 m, 1,5 m et 2 lisses par défaut). Dessiné à ces cotes, jamais étiré</td></tr>
      <tr><td><code>track</code></td><td><code>[{ t, eastM, northM, altitudeM, headingDeg }]</code> quand il se déplace, <code>altitudeM</code> au-dessus de l'observateur. La position est interpolée entre les images clés ; le cap est tenu de l'une à la suivante</td></tr>
      <tr><td><code>lights</code></td><td>Ses feux : <code>id</code>, <code>offsetM</code> <code>{ x, y, z }</code> depuis son centre (droite, haut, avant), <code>color</code>, <code>intensity</code> (1 pour un feu de navigation ordinaire) et un <code>pattern</code> : <code>{ "kind": "steady" }</code>, ou <code>{ "kind": "flash", perMinute, dutyCycle, phase }</code>, la cadence telle que l'énoncent les règlements, la part allumée de chaque cycle (environ 0,5 pour un clignotant à filament, 0,01 pour un stroboscope) et un décalage de 0 à 1 entre feux. L'éditeur les remplit depuis des modèles : avion de ligne, hélicoptère, phares de voiture, feux de détresse, gyrophares, lampadaire</td></tr>
      <tr><td><code>engine</code></td><td>Un véhicule qu'on entend tourner : <code>{ kind, noise }</code>, comme <code>vehicle</code> plus haut. Son moteur suit sa propre <code>track</code>, entendu depuis l'observateur, plus faible et plus sourd avec la distance</td></tr>
      <tr><td><code>occludesSourceIds</code></td><td>Les phénomènes devant lesquels l'observateur a dit qu'il se tenait — voir les règles plus bas</td></tr>
    </table>
    </div>

    <h2>Ce que c'était : les interprétations</h2>
    <p>Un enregistrement énonce des angles, et un corps en mètres ne fait jamais partie de ce qui
      a été vu. C'est une affirmation à son sujet, et elle se met à l'épreuve en la posant dans la
      scène et en la regardant depuis l'endroit où se tenait l'observateur : elle projette son ombre,
      le sol peut la cacher, et son contour est confronté à chaque instant à ce que l'observateur a
      dit. Une interprétation s'affiche seule, comme le monde qu'elle affirme ; quand on demande
      la comparaison (le bouton ◌, ou <code>compare-account</code> sur
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
      <tr><td><code>track</code></td><td>Où il est et à quoi il ressemble à chaque <code>t</code>. Une position s'énonce soit dans le monde (<code>eastM</code>/<code>northM</code> depuis l'endroit où se tenait l'observateur au début, comme le décor, avec <code>onGround</code> ou <code>altitudeAboveGroundM</code>), soit depuis l'observateur à cet instant (<code>azimuthDeg</code>, <code>altitudeDeg</code>, <code>distanceM</code>). Un corps <code>onGround</code> est posé sur le relief ; une direction sans distance rencontre alors le sol là où cette ligne le rencontre. <code>sizeM</code>, <code>attitude</code> (<code>headingDeg</code>, <code>pitchDeg</code>, <code>rollDeg</code>) et <code>appearance</code> (<code>color</code>, <code>albedo</code>) valent jusqu'à ce qu'une keyframe suivante les énonce à nouveau. <code>present: false</code> retire le corps de la scène à partir de cette keyframe, et <code>present: true</code> l'y ramène. Une <code>flame</code> (<code>lengthM</code>, <code>widthM</code>, <code>color</code> à la sortie, <code>tipColor</code>, <code>luminanceCdM2</code>) s'allume à la keyframe qui l'énonce, sort du nœud du modèle nommé <code>exhaust</code> (ou de celui que nomme son <code>node</code>), éclaire ce qui l'entoure, soulève de la poussière là où elle touche le sol si <code>raisesDust</code> le dit, et s'éteint avec une <code>luminanceCdM2</code> de 0</td></tr>
      <tr><td><code>motions</code></td><td>Dans une keyframe : où en est chacun des mouvements propres de son modèle, par le nom du mouvement — les animations du fichier glTF. <code>0</code> est le début d'un mouvement, <code>1</code> sa fin, et un mouvement qui se répète continue au-delà de 1 : <code>{ "legs-turn": 7 }</code>, c'est sept tours. Le modèle dit ce qui bouge et comment ; la piste dit quand. Chaque mouvement se mélange entre les keyframes qui l'énoncent, quelles que soient les keyframes qui déplacent le corps entre-temps, se maintient après la dernière et vaut 0 avant la première. Le départ de Valensole s'écrit ainsi : <code>{ "t": 246000, "motions": { "pivot-retract": 0 } }</code>, <code>{ "t": 248000, "motions": { "pivot-retract": 1, "legs-turn": 0 } }</code>, … <code>{ "t": 262000, "motions": { "legs-turn": 7 } }</code></td></tr>
      <tr><td><code>lights</code></td><td>Dans une keyframe : la luminance, en cd/m², de chacun des feux propres de son modèle, par le nom du matériau du feu dans le fichier glTF, pour qu'un même corps porte des feux qui font chacun autre chose, un blanc fixe à chaque bout et un rouge qui clignote entre les deux. Le modèle dit où est chaque feu, sa taille et sa couleur ; la piste dit quelle luminance et quand. Chaque feu se mélange entre les keyframes qui le nomment et se maintient après la dernière : une bascule, ce sont donc deux keyframes à une milliseconde d'écart. Un feu qu'aucune keyframe ne nomme brille à sa part de <code>appearance.luminanceCdM2</code>. Un feu trop petit pour se voir se voit par son éblouissement, et ce qui se trouve entre lui et l'œil, la coque du corps lui-même ou un pont, le cache. Le feu rouge de Silly-le-Long : <code>{ "t": 499, "lights": { "front-red": 1500 } }</code>, <code>{ "t": 500, "lights": { "front-red": 0 } }</code></td></tr>
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
      <tr><td><code>precipitationType</code>, <code>precipitationIntensity</code></td><td>none/rain/snow/hail, et 0–1. Énoncée à une keyframe, jouée comme elle tombe : une averse commence à la keyframe qui la déclenche par ses premières gouttes, et n'atteint l'intensité énoncée pas plus vite qu'une vraie pluie (de rien au plus fort en vingt secondes) ; elle s'arrête de même. Un changement que les keyframes étalent davantage est suivi tel quel</td></tr>
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

    <h2>D'où vient chaque valeur</h2>
    <p>Toute valeur d'un enregistrement peut s'écrire nue, ou enveloppée de sa provenance :</p>
    <pre data-json="none"><code>"durationSeconds": {
  "value": 15,
  "basis": "derived",
  "rationale": "13 à 18 s dans la synthèse de l'enquêteur ; le milieu retenu"
}</code></pre>
    <p><code>basis</code> vaut <code>stated</code> (l'observateur l'a dit, et c'est ce que signifie
      une valeur nue), <code>derived</code> (déduit de ce qu'il a dit et de quelque chose de
      vérifiable : la largeur d'une route, une carte, un dessin mesuré ; <code>rationale</code> donne
      le calcul) ou <code>assumed</code> (choisi pour que la reconstitution ait une valeur, sur rien
      que l'observateur ait dit). La liste des valeurs <code>assumed</code> est la liste de ce qu'il
      faut retourner demander à l'observateur ou au dossier : c'est pourquoi elle vaut d'être écrite
      même quand rien d'autre ne l'est.</p>

    <h2>Vérifier un fichier</h2>
    <p>Le format est aussi publié en <a href="/sighting.schema.json">JSON Schema</a>, engendré
      depuis les mêmes types que le lecteur : toutes les clés qu'il connaît, ce que chacune peut
      contenir, et les mots qu'accepte une liste fermée. Une clé mal orthographiée ou une valeur
      inconnue y échoue. Il ne dit rien de ce qui peut être omis, question de sens à laquelle répond
      cette page. Pour voir le résultat, ouvrez le fichier dans <a href="/play/">le lecteur</a>,
      depuis un lien, en le collant, ou depuis votre disque avec les images et modèles qu'il nomme.
      Le lecteur le vérifie de la même façon au chargement, et dit derrière un ⚠ sur l'image ce
      qu'il n'a pas pu jouer comme écrit : une clé que rien ne lit, un mot hors de sa liste, et ce
      qu'il a dû inventer parce que la première keyframe d'une forme l'omettait (un champ tenu
      depuis la keyframe précédente relève de la règle ci-dessus, pas d'un problème).</p>

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
      <tr><td><a href="/demo-data/observer-chiles.json"><code>observer-chiles.json</code></a></td><td>Un vrai dossier : un observateur, un identifiant de dossier partagé avec un second enregistrement, dix keyframes, un <code>weatherTrack</code> relevé avec son <code>weatherSource</code></td></tr>
      <tr><td><a href="/demo-data/sky-test-halos.json"><code>sky-test-halos.json</code></a></td><td>Aucun phénomène — un ciel réglé par un <code>weatherTrack</code> dont les images clés font varier l'alignement des cristaux, la couverture de cirrus et une couche de cumulus, vu par un <code>observerTrack</code> qui balaie le cortège puis s'arrête</td></tr>
      <tr><td><a href="/demo-data/sky-test-clouds.json"><code>sky-test-clouds.json</code></a></td><td>Trois couches nuageuses avec altitude, épaisseur, taille, densité et vent en mètres, évoluant sur la timeline météo — et dans la première une entrée <code>instances</code> : un nuage du champ, placé et dimensionné en mètres, qui grossit et s'assombrit sur les deux minutes</td></tr>
      <tr><td><a href="/demo-data/sky-test-aircraft.json"><code>sky-test-aircraft.json</code></a></td><td>Un <code>instrument</code>, un <code>exposureSeconds</code> et un <code>iso</code>, et un décor d'aéronef avec sa <code>track</code> et neuf <code>lights</code> à leurs cadences réelles, phares d'atterrissage compris</td></tr>
      <tr><td><a href="/demo-data/instrument-instamatic.json"><code>instrument-instamatic.json</code></a></td><td>La même observation que <code>observer-socorro.json</code>, à un champ près. Comparez les deux</td></tr>
    </table>
    </div>

    <h2>Quatre règles qui décident du sens d'un fichier</h2>
    <ul class="plain">
      <li><strong>Les champs discrets sont tenus, les continus sont interpolés.</strong> Une forme
        absente d'un keyframe ultérieur reste dans son état, et de même tout champ qu'un keyframe
        omet dans une forme qu'il énonce : un keyframe qui ne donne qu'un nouvel <code>aim</code>
        déplace la forme et garde tout le reste (énoncer <code>bounds</code> sans <code>aim</code> ni
        <code>angular</code> est lu comme la déplacer par ses pixels) ; une forme dont le premier keyframe est
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
    <p class="small">Cette page est la référence du format. Le raisonnement derrière chaque champ est
      dans les commentaires de documentation de son type, que les extraits ci-dessus proposent à la
      complétion, et dans le <a href="https://github.com/RR0/UfoAtHome">code source</a>.</p>
  </div>
</section>
`
  }

  private es(): string {
    return `
<section class="band">
  <div class="wrap prose-wide">
    <p>Una grabación es un simple archivo JSON. Nada en ella es un blob binario, un identificador de
      una base de datos ni una referencia a este sitio — puedes escribir una a mano, generarla desde tu
      propio archivo, o comparar dos en una revisión de código.</p>
    <p class="small">Cada extracto de abajo es de solo lectura, y cada uno conoce el formato: sitúa el
      cursor dentro de un objeto y pulsa <kbd>Ctrl</kbd>+<kbd>Espacio</kbd> (<kbd>⌥</kbd>+<kbd>I</kbd> en un Mac) para
      listar todas las claves que podrían ir allí, con lo que el modelo dice de cada una.</p>

    <h2>La observación</h2>
    <div class="table-scroll">
    <table>
      <tr><th>Campo</th><th>Significado</th></tr>
      <tr><td><code>version</code></td><td>Siempre <code>1</code></td></tr>
      <tr><td><code>id</code></td><td>Qué relato es este, único entre todas las grabaciones de cualquier parte: el día, y luego quién lo vio (<code>"1964-04-24-ZamoraLonnie"</code>), o dónde para un observador anónimo (<code>"1964-04-24-Socorro"</code>). Aquello por lo que un caso lo nombra</td></tr>
      <tr><td><code>time</code>, <code>endTime</code></td><td><code>{ year, month, day, hour, minute, second, raw }</code>, cada parte opcional — así es como el formato expresa “1954” o “hacia las 05:00”. <code>raw</code> es la fecha tal como se escribe en <a href="https://www.loc.gov/standards/datetime/">EDTF</a>, y es lo que la fecha significa: <code>"1948-07-24T02:45~"</code> (aproximada), <code>"2025-06?"</code> (incierta), <code>"1965-07-01%"</code> (ambas cosas), <code>"19XX"</code> (un año enmascarado), o <code>"05:00"</code> solo, para una hora del día recordada sin su fecha. Los números se mantienen de acuerdo con ella para lo que se calcula (el cielo, el reloj). Es un subconjunto de EDTF (nivel 0, estos calificadores sobre la fecha entera, años enmascarados); <a href="https://www.npmjs.com/package/@rr0/time"><code>@rr0/time</code></a> es el modelo EDTF completo de RR0, al que las herramientas propias de UFO@home convierten las fechas de una grabación</td></tr>
      <tr><td><code>durationSeconds</code></td><td>Una alternativa a <code>endTime</code>, y prevalece si se dan las dos</td></tr>
      <tr><td><code>utcOffsetHours</code></td><td>La hora LEGAL que marcaba el reloj del observador (+1 para Francia en 1965). Si falta, se aproxima a partir de la longitud, que no puede conocer la hora legal ni un cambio de horario de verano</td></tr>
      <tr><td><code>timeZone</code></td><td>La zona IANA de la que se derivó el desfase (<code>"Europe/Paris"</code>): la regla, mientras que <code>utcOffsetHours</code> es el número que daba en esa fecha. Solo se lee el número para situar el cielo; la zona es lo que permite derivar de nuevo el desfase cuando cambia la fecha</td></tr>
      <tr><td><code>place</code></td><td><code>[{ lat, lng, name }]</code> — <code>name</code> es el nombre completo del lugar a partir del cual se resolvieron las coordenadas</td></tr>
      <tr><td><code>observer</code></td><td><code>{ id, title, lastName, firstNames }</code>, todos opcionales; se omite por completo para un observador anónimo. <code>id</code> es una referencia a la persona (en RR0, su directorio: <code>"ZamoraLonnie"</code>); los demás campos la describen cuando nadie le ha dado uno</td></tr>
      <tr><td><code>description</code></td><td>El relato en prosa — una cadena, o una por idioma (véase más abajo)</td></tr>
      <tr><td><code>tags</code></td><td>Una lista de cadenas, escritas en inglés: son términos técnicos, y dos grabaciones que comparten uno tienen que coincidir en él. A cada lector se le muestran en su propio idioma cuando se conoce una traducción, que hoy es el caso de ${this.tags()}. La lista no está cerrada: cualquier otra se muestra tal como está escrita, y los códigos de clasificación (<code>"RR3"</code>, <code>"NL"</code>) o las referencias de caso (<code>"Blue Book 8729"</code>) se escriben tal cual. Una cambia la reproducción: <code>paralysis</code> mantiene inmóvil la vista del observador</td></tr>
      <tr><td><code>account</code></td><td>Quién lo vio y cómo viajó el relato: <code>observerAgeYears</code> (en aquel momento), <code>observerOccupation</code>, <code>source</code> (cómo llegó a quien escribió la grabación: <code>on-site</code>, <code>interview</code>, <code>telephone</code>, <code>questionnaire</code>, <code>letter</code>, <code>social-media</code>, <code>press</code>) y <code>followedUp</code> (si se volvió a contactar al observador después)</td></tr>
      <tr><td><code>sources</code></td><td>Dónde leer el relato tal como se dio, con la forma de una <a href="https://www.npmjs.com/package/@rr0/data">fuente RR0</a>: <code>[{ type, title, authors, url, publication: { publisher, time }, index }]</code>, siendo <code>type</code> <code>book</code> o <code>article</code>, o nada para una página web o una publicación, que entonces es solo su <code>url</code>. Se muestran en el panel <q>?</q> del reproductor, enlazadas cuando tienen dirección; se copian tal cual en un expediente RR0</td></tr>
      <tr><td><code>milestones</code></td><td>Los momentos con nombre del relato, mostrados en la barra de reproducción: <code>[{ t, label, note }]</code>, siendo <code>label</code> la letra o el número que usa el propio relato (<code>"A"</code>, <code>"B"</code>) o un par de palabras, y <code>note</code> lo que ocurrió entonces, con las palabras del relato cuando sea posible (una cadena, o una por idioma)</td></tr>
      <tr><td><code>roads</code></td><td>Las carreteras o caminos que dibuja el propio plano del relato, cuando el mapa no los tiene: <code>[{ id, title, surface, widthM, path, source }]</code>, siendo <code>surface</code> <code>paved</code>, <code>gravel</code> o <code>dirt</code>, <code>path</code> el eje como <code>[{ eastM, northM }]</code> desde el lugar del observador al inicio, y <code>source</code> el plano o levantamiento del que se tomó</td></tr>
    </table>
    </div>

    <h2>Varios observadores: el caso</h2>
    <p>Cada observador tiene su propia grabación, y una grabación no dice a qué caso
      pertenece: un relato se sostiene por sí solo. Lo que los muestra juntos es el
      <strong>caso</strong>, que los nombra: el
      <code>case.json</code> de un expediente de <a href="https://rr0.org">RR0</a>, que indica el
      título, la fecha y la clasificación del caso, y enumera todo lo que ocurrió en él como
      <code>events</code>. Sus eventos de tipo <code>sighting</code> son sus relatos, cada uno apuntando
      a la grabación de un observador:</p>
    <pre data-json="none"><code>{
  "id": "ChilesWhitted",
  "title": "Chiles et Whitted",
  "time": "1948-07-24 02:45",
  "events": [
    { "type": "event", "eventType": "sighting", "url": "observer-chiles.json" },
    { "type": "event", "eventType": "sighting", "url": "observer-whitted.json" }
  ]
}</code></pre>
    <div class="table-scroll">
    <table>
      <tr><th>Campo</th><th>Significado</th></tr>
      <tr><td><code>id</code></td><td>El identificador propio del caso. En rr0.org es el directorio del expediente y puede omitirse; un archivo de caso independiente lo indica</td></tr>
      <tr><td><code>title</code>, <code>time</code></td><td>El nombre del caso, y cuándo ocurrió tal como RR0 escribe una hora (<code>"1948-07-24 02:45"</code>, <code>"1954"</code>). El reproductor nombra un caso que abre por su título</td></tr>
      <tr><td><code>events</code></td><td>La cronología del caso. Solo se reproducen los <code>sighting</code>, cada uno por su <code>url</code>, leída respecto a la dirección del propio archivo de caso (de modo que el mismo caso funciona desde la página de su expediente y desde cualquier otro lugar); los demás (un análisis, un artículo, una película, una confesión) son de RR0</td></tr>
    </table>
    </div>
    <p>Dáselo a <code>&lt;rr0-sighting src&gt;</code> o al reproductor, y cada observador podrá
      elegirse de una lista. Una grabación puede darse directamente, sin caso, pero un caso con un solo
      avistamiento funciona igual y nombra lo que muestra. Pruébalo con
      <a href="/demo-data/case-chiles-whitted.json"><code>case-chiles-whitted.json</code></a>
      (<a href="/play/?sighting=/demo-data/case-chiles-whitted.json">reproducirlo</a>).</p>

    <h2>Decirlo en más de un idioma</h2>
    <p>Una grabación pasa de un lector a otro, así que cada campo que escribe un autor puede contener
      una cadena por idioma en lugar de una sola: <code>description</code>, el <code>title</code> de
      una forma o de un elemento del decorado, y el <code>label</code> y la <code>note</code> de un hito.</p>
    <pre data-json=""><code>{
  "description": {
    "fr": "Tout le compte rendu de Lonnie Zamora, d'un seul tenant…",
    "en": "Lonnie Zamora's whole account, of a piece…"
  }
}</code></pre>
    <p>Las claves son etiquetas de idioma tal como las da un navegador (<code>fr</code>, <code>en</code>,
      <code>pt-BR</code>), y ninguna es obligatoria. Una cadena simple sigue siendo perfectamente válida y
      significa “en el idioma en que se escribiera” — lo que es toda grabación hecha antes de esto.
      Un lector cuyos idiomas no son ninguno de los presentes recibe lo que el archivo SÍ tiene en
      lugar de un campo vacío: una traducción que falta nunca debe convertir algo que el observador
      dijo en algo que no dijo.</p>
    <p>El idioma que recibe un lector es el de su navegador, salvo que la página diga otra cosa: un
      <code>lang</code> en el propio elemento, o en cualquier cosa a su alrededor, se toma primero — un
      artículo que declara su propio idioma ya ha dicho en qué idioma lo está leyendo su lector. La
      lista del navegador viene después, así que declarar uno fuerza una elección sin descartar los
      demás.</p>
    <p>El editor muestra un idioma, el del lector, y al escribir solo toca ese —
      así que abrir un archivo en el otro idioma y escribir es como se añade una traducción, y un
      autor no puede borrar la de otro.</p>

    <h2>Lo que se vio</h2>
    <p><code>timeline.keyframes</code> es una lista de <code>{ t, shapes }</code>, con <code>t</code> en
      milisegundos desde el inicio. Cada forma lleva un <code>sourceId</code> — varias formas pueden
      compartir una línea de tiempo (el fenómeno, una llama que lo sigue, una segunda luz) — y una <code>shape</code>:</p>
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
  "title": "el fenómeno",
  "angular": { "widthDeg": 1.2, "heightDeg": 0.4 },
  "aim": { "azimuthDeg": 353.6, "altitudeDeg": 0.6 }
}</code></pre>
    <div class="table-scroll">
    <table>
      <tr><th>Campo</th><th>Significado</th></tr>
      <tr><td><code>kind</code></td><td><code>oval</code>, o <code>polygon</code>, que entonces también toma <code>points</code>: <code>[{ x, y }]</code> en píxeles desde la esquina superior izquierda de <code>bounds</code>, abarcando su anchura y su altura, para que el contorno se estire con ella cuando el ángulo redimensiona la caja</td></tr>
      <tr><td><code>title</code></td><td>Su nombre, mostrado al pasar el puntero por encima; una cadena, o una por idioma</td></tr>
      <tr><td><code>color</code></td><td>Cualquier color CSS</td></tr>
      <tr><td><code>angle</code></td><td>Su inclinación, en radianes alrededor de su propio centro, positiva en sentido horario en pantalla</td></tr>
      <tr><td><code>transparency</code></td><td>De 0 opaco a 1 invisible</td></tr>
      <tr><td><code>haloScale</code></td><td>El resplandor a su alrededor; 0 es ninguno</td></tr>
      <tr><td><code>brightness</code></td><td>Cuánto deslumbra: un velo, las puntas del diafragma, un núcleo saturado a blanco</td></tr>
      <tr><td><code>blur</code></td><td>Lo difusos que el observador dijo que se veían los bordes</td></tr>
      <tr><td><code>angular</code></td><td>Su tamaño aparente en grados — véase más abajo</td></tr>
      <tr><td><code>aim</code></td><td>Dónde estaba en el cielo del observador: la dirección de su centro, <code>azimuthDeg</code> en sentido horario desde el norte verdadero y <code>altitudeDeg</code> sobre el horizonte. No hacia dónde miraba el observador, que es el <code>headingDeg</code> y el <code>pitchDeg</code> de la pose — véase más abajo</td></tr>
    </table>
    </div>
    <p><strong><code>aim</code> lo sitúa, <code>angular</code> lo dimensiona.</strong> <code>bounds</code>
      es la proyección de ambos sobre el lienzo fijo de 640×360 con el rumbo y el campo de visión de
      la pose, a través del propio instrumento de la grabación; se vuelve a derivar al cargar, así que
      un archivo sobrevive a un cambio de lienzo, de campo de visión, de instrumento, o de hacia dónde
      miraba el observador. Si los píxeles y los ángulos llegan a discrepar, ganan los ángulos: mover
      <code>bounds</code> en un archivo no hace nada mientras <code>aim</code> esté ahí. Un archivo
      escrito a mano puede omitir <code>bounds</code> por completo.</p>
    <p><code>timeline.order</code> es el orden de pintado de atrás hacia delante, <code>timeline.groups</code> los
      identificadores de fuente agrupados. Ambos opcionales.</p>

    <h2>Todo lo que lo rodea</h2>
    <div class="table-scroll">
    <table>
      <tr><th>Campo</th><th>Significado</th></tr>
      <tr><td><code>observerTrack</code></td><td><code>{ keyframes: [{ t, pose }] }</code> — <code>pose</code> contiene <code>lat</code>, <code>lng</code>, <code>elevationM</code> (sobre el suelo local), <code>headingDeg</code>, <code>pitchDeg</code>, <code>rollDeg</code>, <code>fovDeg</code>, y para una cámara <code>fNumber</code> y <code>focusDistanceM</code>. Se reproduce como se mueve una persona: exactamente la pose indicada en cada fotograma clave, y entre ellos un movimiento que gana velocidad, la mantiene a través de los fotogramas clave que siguen moviéndose, y frena hasta una pausa — dos fotogramas clave con el mismo lugar, o el mismo rumbo. Una mirada empieza y acaba inmóvil; una marcha a pie o en coche ya en curso en el primer fotograma clave continúa. Detenerse y echar a andar añaden su propia sacudida, un cabeceo que se extingue en un segundo y medio, trasladado a la imagen tanto como el instrumento lo permite (apenas un ojo, del todo una cámara sostenida a mano). Y un cuerpo en reposo nunca está del todo quieto: de pie o esperando, la vista oscila unos milímetros y deriva una décima de grado, despacio, del mismo modo en el mismo instante — salvo para un observador que el relato dice que quedó paralizado (etiqueta <code>paralysis</code>)</td></tr>
      <tr><td><code>weatherTrack</code></td><td><code>{ keyframes: [{ t, weather }] }</code> — las condiciones del cielo a lo largo de la grabación: precipitación, viento, tormenta, y las nubes como capas con alturas reales, cada una capaz de contener nubes individuales situadas en metros. Todos los campos de un <code>weather</code> están en la sección siguiente</td></tr>
      <tr><td><code>weatherSource</code></td><td><code>{ id, name, url }</code> del registro del que se consultó el tiempo. Su presencia significa que la grabación se reproduce exactamente como se compuso y no se vuelve a consultar nunca. Si falta, es el propio relato del observador</td></tr>
      <tr><td><code>lightPollution</code></td><td>El brillo del cielo nocturno del lugar, ciudades incluidas: el cenit de una noche sin Luna en magnitudes por segundo de arco cuadrado, tal como lo lee un Sky Quality Meter o lo da el <a href="https://doi.org/10.1126/sciadv.1600377">atlas mundial del brillo artificial del cielo nocturno</a> (su cifra «SQM», Falchi et al. 2016, que <a href="https://www.lightpollutionmap.info">lightpollutionmap.info</a> muestra para cualquier lugar). <code>22</code> es un cielo natural, un suburbio ronda <code>19</code>, el centro de una ciudad <code>17</code>. Si falta, un cielo natural. La parte de las ciudades, lo que queda al quitar los 22 naturales, se suma al cielo como luz: más intensa hacia el horizonte, donde el aire bajo devuelve más, y dibujada con el blanco cálido de una lámpara de 3000 K. Ahoga la Vía Láctea y la luz zodiacal, y quita estrellas, por la diferencia en la estrella más débil que un ojo distingue (Crumey 2014): unas dos magnitudes a <code>19</code>. La Luna ahora hace lo mismo. <code>"derived"</code> cuando se consulta en el atlas, <code>"stated"</code> cuando el observador lo midió</td></tr>
      <tr><td><code>soundTrack</code></td><td><code>{ keyframes: [{ t, sound }] }</code> — <code>kind</code> (none/hum/whistle/rumble/crackle), <code>volume</code>, <code>pitchHz</code>, y un <code>src</code> opcional de una grabación real. <code>volume</code> y <code>pitchHz</code> se deslizan entre fotogramas clave, <code>kind</code> y <code>src</code> cambian en el fotograma clave. Un <code>src</code> en otro sitio debe servirse a cualquier origen (CORS)</td></tr>
      <tr><td><code>references</code></td><td>Imágenes del lugar superpuestas a la escena: <code>src</code> (una dirección, o una URL <code>data:</code> para una imagen añadida desde un disco), <code>kind</code> (photo/panorama), <code>registration</code> (<code>headingDeg</code>, <code>pitchDeg</code>, <code>rollDeg</code>, <code>fovDeg</code>), <code>opacity</code>, <code>credit</code>/<code>creditUrl</code>, <code>t</code> y <code>drawing</code> opcionales, <code>from</code> (<code>{ lat, lng }</code>, desde dónde se tomó: el reproductor la desvanece a medida que el observador se aleja de ese punto; si falta, nunca se desvanece), y los <code>landmarks</code> con los que se alineó (<code>id</code>, <code>label</code>, <code>picture</code> como <code>{ u, v }</code> desde la esquina superior izquierda, <code>scene</code> como <code>{ azimuthDeg, altitudeDeg }</code>)</td></tr>
      <tr><td><code>instrument</code>, <code>exposureSeconds</code></td><td>A través de qué se observó, y cuánto tiempo estuvo abierto el obturador. Si falta, el ojo desnudo. <code>instrument</code> es uno de <code>eye</code>, <code>rectilinear-lens</code> (una cámara de marca desconocida), <code>instamatic-126</code>, <code>slr-35mm-50</code>, <code>slr-35mm-zoom</code>, <code>phone-landscape</code>, <code>phone-portrait</code>; <code>exposureSeconds</code> es un valor para toda la grabación, limitado al rango propio de ese aparato</td></tr>
      <tr><td><code>iso</code></td><td>La sensibilidad de la película o del sensor con que se tomó la imagen, cuando se conoce: <code>400</code> para una película de 400 ISO. Si falta, la del propio aparato (el negativo en color de una réflex es 100, el de una Instamatic 64). La imagen de una cámara no responde como la de un ojo: una película no se adapta al cielo, recibe una exposición — la luz, por el tiempo de obturación, dividida por el cuadrado del número f — y responde a ella con su propia curva (la suave de un negativo, la más abrupta de una diapositiva, la línea recta de un sensor que se detiene en el blanco). Así, una pose nocturna sale con un cielo negro y lo que brillaba en él destacando</td></tr>
      <tr><td><code>sway</code></td><td>Cuánto mueve la vista el cuerpo que sostiene el instrumento cuando no camina: <code>1</code> para una persona de pie o sentada, <code>0</code> para una cámara sobre trípode, cualquier valor intermedio o superior para menos o más. Si falta, <code>1</code> — salvo para un observador que el relato dice que quedó paralizado (etiqueta <code>paralysis</code>), para quien es <code>0</code>, y para una exposición de más de medio segundo, que ninguna mano sostiene inmóvil: eso es un trípode, y también <code>0</code></td></tr>
      <tr><td><code>vehicle</code></td><td>El vehículo en el que iba el observador, cuando el decorado no lo dibuja: <code>{ kind, windowsOpen, noise }</code>, siendo <code>kind</code> <code>car</code>, <code>van</code>, <code>truck</code>, <code>motorcycle</code> o <code>generic</code>. Oído desde dentro: su motor sigue el propio trayecto del observador — la marcha según la velocidad, las revoluciones según la marcha, el esfuerzo según acelere o frene — con la rodadura y el viento, amortiguados por un habitáculo cerrado, dejados entrar por ventanillas abiertas; <code>noise</code> es su sonoridad frente a uno corriente de su tipo (1 por defecto)</td></tr>
      <tr><td><code>decor</code></td><td>Decorado a unos <code>eastM</code>/<code>northM</code> reales del observador: edificios (con <code>floors</code>, <code>windows</code>), árboles, arbustos, farolas, vehículos, puentes, otros observadores, aeronaves — opcionalmente con una <code>track</code> y <code>lights</code> cuyo <code>pattern</code> lleva una cadencia de destellos real. Véase más abajo</td></tr>
    </table>
    </div>
    <p>Un <strong>elemento del decorado</strong> se expresa en metros, como todo lo que no es el fenómeno:</p>
    <div class="table-scroll">
    <table>
      <tr><th>Campo</th><th>Significado</th></tr>
      <tr><td><code>eastM</code>, <code>northM</code>, <code>headingDeg</code></td><td>Dónde está respecto al observador, y hacia dónde mira su frente, en sentido horario desde el norte verdadero</td></tr>
      <tr><td><code>sizeM</code></td><td><code>{ widthM, lengthM, heightM }</code> a lo largo de sus propios ejes, siendo la longitud el sentido hacia el que mira. Cada eje es opcional: uno que nadie midió conserva la proporción propia de la forma integrada</td></tr>
      <tr><td><code>model</code></td><td>Un modelo 3D real en lugar de la forma integrada: una entrada del catálogo por <code>id</code>, o un archivo glTF/GLB en <code>url</code> (que prevalece, debe poder leerse desde cualquier origen, y entonces necesita su <code>credit</code>; una relativa se lee desde el archivo que la indica). Nunca decide el tamaño: se escala, conservando sus proporciones, al primer eje medido entre longitud, altura y anchura, o al tamaño real que le da el catálogo. Visto desde dentro, y siempre que no se pueda obtener el modelo, se dibuja en su lugar la forma integrada</td></tr>
      <tr><td><code>bridge</code></td><td>Para un <code>"bridge"</code>: cómo está construido. <code>sizeM.lengthM</code> es toda su longitud a lo largo de la carretera, terraplenes incluidos, <code>widthM</code> la anchura del tablero y <code>heightM</code> la altura de la calzada sobre el tablero por encima del suelo; <code>spanM</code> es la luz libre bajo el tablero, discurriendo la carretera sobre un terraplén de tierra que desciende hasta el suelo a cada lado; <code>deckThicknessM</code> el espesor de la losa (1,2 por defecto); <code>railing</code> <code>{ heightM, postSpacingM, rails }</code> la barandilla de ambos bordes, postes y barras cuyas aberturas son rectángulos (1,05 m, 1,5 m y 2 barras por defecto). Dibujado con esas medidas, nunca estirado</td></tr>
      <tr><td><code>track</code></td><td><code>[{ t, eastM, northM, altitudeM, headingDeg }]</code> cuando se mueve, <code>altitudeM</code> por encima del observador. La posición se interpola entre fotogramas clave; el rumbo se mantiene de uno al siguiente</td></tr>
      <tr><td><code>lights</code></td><td>Sus luces: <code>id</code>, <code>offsetM</code> <code>{ x, y, z }</code> desde su centro (derecha, arriba, delante), <code>color</code>, <code>intensity</code> (1 es una luz de navegación corriente) y un <code>pattern</code>: <code>{ "kind": "steady" }</code>, o <code>{ "kind": "flash", perMinute, dutyCycle, phase }</code>, la cadencia tal como la establecen los reglamentos, la fracción encendida de cada ciclo (cerca de 0,5 para un intermitente de filamento, 0,01 para un estroboscopio) y un desfase de 0 a 1 entre luces. El editor las rellena a partir de ajustes predefinidos: “Avión de pasajeros”, “Helicóptero”, “Coche, faros encendidos”, “Coche, luces de emergencia”, “Rotativos de vehículo de emergencia”, “Farola”</td></tr>
      <tr><td><code>engine</code></td><td>Un vehículo que se oye en marcha: <code>{ kind, noise }</code>, como <code>vehicle</code> más arriba. Su motor sigue su propia <code>track</code>, oído desde donde está el observador, más débil y apagado con la distancia</td></tr>
      <tr><td><code>occludesSourceIds</code></td><td>Los fenómenos delante de los cuales el observador dijo que estaba — véanse las reglas más abajo</td></tr>
    </table>
    </div>

    <h2>Lo que era: interpretaciones</h2>
    <p>Una grabación expresa ángulos, y un cuerpo en metros nunca forma parte de lo que se vio. Es una
      afirmación sobre ello, y se pone a prueba colocándola en la escena y mirándola desde donde
      estaba el observador: proyecta su sombra, el suelo puede ocultarla, y su contorno se mide
      en cada instante frente a lo que dijo el observador. Una interpretación se muestra sola, como el
      mundo que afirma; si se pide comparar (el botón ◌, o <code>compare-account</code> en
      <code>&lt;rr0-sighting&gt;</code>), el reproductor dibuja a su lado todo lo que vio el observador como
      contornos discontinuos e indica cuánto se desvía la dirección y cuántas veces más ancho y más alto
      parece cada cuerpo, en rojo cuando un observador no podría haberse equivocado tanto.</p>
    <p>La lectura del propio observador va en la grabación, como <code>interpretation</code>. La de un
      analista va en el caso, como un evento de tipo <code>interpretation</code> que nombra la
      grabación por su <code>id</code>, con quién la sostiene en <code>by</code>
      (<code>{ "people": id }</code>, <code>{ "org": id }</code>, o una persona descrita en el valor)
      y sus cuerpos en línea o en un archivo en <code>url</code>. Un relato cuyo observador dijo lo que
      era se dibuja en volumen, como lo dijo; uno que no dice nada en metros se dibuja como los
      ángulos que expresa. El reproductor lo ofrece, junto con la interpretación de cada analista, una cada vez.</p>
    <pre data-json="none"><code>"interpretation": {
  "title": "Una nave posada sobre sus patas",
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
      <tr><th>Campo</th><th>Significado</th></tr>
      <tr><td><code>explains</code></td><td>Los <code>sourceId</code> de los fenómenos que este cuerpo afirma ser</td></tr>
      <tr><td><code>model</code></td><td>Una forma construida aquí (<code>ellipsoid</code>, <code>sphere</code>, <code>disc</code>, <code>cylinder</code>, <code>cone</code>, <code>box</code>, <code>torus</code>, <code>figure</code>), un modelo del catálogo por <code>id</code>, o un archivo glTF en <code>url</code> con su <code>credit</code>; una <code>url</code> relativa se lee desde el archivo que la indica, no desde la página. Estirado a <code>sizeM</code> sea cual sea</td></tr>
      <tr><td><code>track</code></td><td>Dónde está y qué aspecto tiene en cada <code>t</code>. Una posición se expresa o bien en el mundo (<code>eastM</code>/<code>northM</code> desde donde estaba el observador al inicio, como el decorado, con <code>onGround</code> o <code>altitudeAboveGroundM</code>) o bien desde el observador en ese instante (<code>azimuthDeg</code>, <code>altitudeDeg</code>, <code>distanceM</code>). Un cuerpo <code>onGround</code> se apoya en el relieve; una dirección sin distancia se encuentra entonces con el suelo donde lo hace esa línea. <code>sizeM</code>, <code>attitude</code> (<code>headingDeg</code>, <code>pitchDeg</code>, <code>rollDeg</code>) y <code>appearance</code> (<code>color</code>, <code>albedo</code>) se mantienen hasta que un fotograma clave posterior los vuelve a indicar. <code>present: false</code> saca el cuerpo de la escena a partir de ese fotograma clave, y <code>present: true</code> lo devuelve. Una <code>flame</code> (<code>lengthM</code>, <code>widthM</code>, <code>color</code> en la tobera, <code>tipColor</code>, <code>luminanceCdM2</code>) se enciende en el fotograma clave que la indica, sale del nodo del modelo llamado <code>exhaust</code> (o del que nombre su <code>node</code>), ilumina lo que la rodea, levanta polvo donde toca el suelo cuando <code>raisesDust</code> lo indica, y se apaga con una <code>luminanceCdM2</code> de 0</td></tr>
      <tr><td><code>motions</code></td><td>En un fotograma clave: cuánto ha avanzado cada uno de los movimientos propios de su modelo, por el nombre del movimiento — las animaciones del archivo glTF. <code>0</code> es el inicio de un movimiento, <code>1</code> su final, y uno que se repite sigue más allá de 1: <code>{ "legs-turn": 7 }</code> son siete vueltas. El modelo dice qué se mueve y cómo; la pista dice cuándo. Cada movimiento se interpola entre los fotogramas clave que lo indican, sean cuales sean los demás fotogramas clave que muevan el cuerpo entretanto, se mantiene tras el último y vale 0 antes del primero. La partida de Valensole se escribe así: <code>{ "t": 246000, "motions": { "pivot-retract": 0 } }</code>, <code>{ "t": 248000, "motions": { "pivot-retract": 1, "legs-turn": 0 } }</code>, … <code>{ "t": 262000, "motions": { "legs-turn": 7 } }</code></td></tr>
      <tr><td><code>lights</code></td><td>En un fotograma clave: la luminancia, en cd/m², de cada una de las luces propias de su modelo, por el nombre del material de la luz en el archivo glTF — para que un mismo cuerpo lleve luces que hacen cada una lo suyo, una blanca fija en cada extremo y una roja que destella entre ambas. El modelo dice dónde está cada luz, su tamaño y su color; la pista dice cuánto brilla y cuándo. Cada luz se interpola entre los fotogramas clave que la nombran y se mantiene tras el último, así que un encendido o apagado son dos fotogramas clave separados por un milisegundo; una luz que ningún fotograma clave nombra brilla con su parte de <code>appearance.luminanceCdM2</code>. Una luz demasiado pequeña para verse se ve por su deslumbramiento, y lo que se interponga entre ella y el ojo — el propio casco del cuerpo, un puente — la oculta. La luz roja de Silly-le-Long: <code>{ "t": 499, "lights": { "front-red": 1500 } }</code>, <code>{ "t": 500, "lights": { "front-red": 0 } }</code></td></tr>
      <tr><td><code>outlineNode</code></td><td>El nodo del modelo que es lo que dibujó el observador (<code>"hull"</code> para una nave cuyas patas no están en el dibujo): aquello por lo que se mide su contorno</td></tr>
      <tr><td><code>smoke</code></td><td>En la propia interpretación: lo que hace arder en el suelo, como <code>{ eastM, northM, fromT, untilT? }</code>, visto por su humo arrastrado por el viento de la grabación</td></tr>
    </table>
    </div>

    <h2>El tiempo, y sus nubes</h2>
    <p>Un fotograma clave <code>weather</code> expresa las condiciones del cielo en un momento del reloj
      de la grabación; entre dos fotogramas clave cada número se interpola, y el tipo de precipitación y la
      tormenta se mantienen. Contiene:</p>
    <div class="table-scroll">
    <table>
      <tr><th>Campo</th><th>Significado</th></tr>
      <tr><td><code>cloudLayers</code></td><td>Las nubes, como una lista de capas — véase más abajo. <strong>Si falta</strong>, las describen los campos antiguos de las filas vecinas, adaptados a una capa de agua y un velo de cirros; <strong>una lista vacía</strong> significa un cielo despejado que alguien miró</td></tr>
      <tr><td><code>cloudCover</code>, <code>lowerCloudCover</code>, <code>highCloudCover</code></td><td>Fracciones de cielo (0–1): el total, solo las capas de agua, y solo el velo helado. Escritas por grabaciones hechas antes de que hubiera capas, y que el editor sigue manteniendo al día como resumen de ellas</td></tr>
      <tr><td><code>cloudBaseM</code>, <code>cloudDarkness</code></td><td>La base única de esa misma época, en metros sobre el suelo de referencia, y un tono único (0 blanco, 1 muy oscuro)</td></tr>
      <tr><td><code>iceCrystalAlignment</code></td><td>0–1, con qué regularidad caían los cristales de hielo — lo que convierte un simple anillo en parhelios, arcos y un pilar. Ningún registro lo mide; una capa de cirros lleva el suyo</td></tr>
      <tr><td><code>relativeHumidity</code></td><td>0–1, cerca del suelo. Decide lo lechoso que es el cielo despejado: la bruma se hincha de agua a medida que el aire se acerca a la saturación. Un registro consultado la trae (a partir de la temperatura y el punto de rocío de ERA5); si falta, una bruma típica</td></tr>
      <tr><td><code>precipitationType</code>, <code>precipitationIntensity</code></td><td>none/rain/snow/hail, y 0–1. Indicada en un fotograma clave, reproducida como cae: un chubasco empieza en el fotograma clave que lo inicia con sus primeras gotas, y no alcanza la intensidad indicada más deprisa que una lluvia real (de nada a lo más fuerte en veinte segundos); se detiene del mismo modo. Un cambio que los fotogramas clave reparten en más tiempo se sigue tal cual</td></tr>
      <tr><td><code>windDirectionDeg</code>, <code>windSpeed</code></td><td>El viento general: el rumbo HACIA el que sopla, en sentido horario desde el norte, y metros por segundo. Es lo que arrastra las nubes — desde el instante cero, de modo que buscar y volver a reproducir dan el mismo cielo</td></tr>
      <tr><td><code>storm</code></td><td>Relámpagos y truenos, con el retraso correcto</td></tr>
    </table>
    </div>
    <p>Cada <strong>capa</strong> de <code>cloudLayers</code> es un manto de nubes a una altura real,
      y sigue siendo ella misma de un fotograma clave al siguiente:</p>
    <div class="table-scroll">
    <table>
      <tr><th>Campo</th><th>Significado</th></tr>
      <tr><td><code>id</code></td><td>Estable entre fotogramas clave — las capas se emparejan por él, nunca por su posición en la lista. Una capa presente en un fotograma clave y ausente del siguiente se desvanece; reordenarlas no cambia nada</td></tr>
      <tr><td><code>type</code></td><td><code>cumulus</code>, <code>stratus</code>, <code>stratocumulus</code>, <code>cirrus</code> o <code>unknown</code>. Decide la forma de las cimas y lo fino que es el velo; un cirro es además el que refracta los halos. Cambia en el fotograma clave, no se interpola</td></tr>
      <tr><td><code>baseM</code>, <code>thicknessM</code></td><td>Metros. La base está sobre el suelo de REFERENCIA de la grabación, no sobre un observador que sube; un observador por encima de la base está dentro del manto o sobre él, y el cielo se dibuja en consecuencia</td></tr>
      <tr><td><code>coverage</code></td><td>0–1, y significa lo que dice: la fracción del cielo que cubre esta capa, sea cual sea el tamaño de sus nubes</td></tr>
      <tr><td><code>sizeM</code></td><td>La anchura característica de una nube, en metros. Independiente de la cobertura: la misma fracción de cielo puede ser muchas nubes pequeñas o unas pocas grandes</td></tr>
      <tr><td><code>density</code></td><td>0–2, lo opaca que es la materia de la nube; 0 es transparente. También independiente de la cobertura</td></tr>
      <tr><td><code>darkness</code></td><td>De 0 blanco a 1 muy oscuro. Si falta, el <code>cloudDarkness</code> del fotograma clave</td></tr>
      <tr><td><code>seed</code></td><td>Qué patrón, de entre los infinitos que los mismos números pueden dibujar. Si falta, uno derivado del id, y por eso el id no debe cambiar</td></tr>
      <tr><td><code>windDirectionDeg</code>, <code>windSpeed</code></td><td>El viento propio de esta capa, cuando difiere del general — la capa alta suele hacerlo. Si falta, el viento general</td></tr>
      <tr><td><code>iceCrystalAlignment</code></td><td>Solo para un cirro</td></tr>
      <tr><td><code>instances</code></td><td>Nubes individuales dentro de esta capa — véase más abajo</td></tr>
    </table>
    </div>
    <p>Una <strong>nube individual</strong> en <code>instances</code> es una nube de su capa que el
      archivo sitúa con exactitud, porque el relato lo hizo: aquella tras la que pasó el fenómeno, la que
      estaba allí y en ningún otro sitio. Se dibuja como una más de su capa — la misma textura, el mismo
      umbral —, sin distinguirse de sus vecinas más que por dónde está y lo grande que es,
      y está ahí incluso cuando la <code>coverage</code> de la capa es nula. Se desplaza con el viento de
      la capa como las demás, y oculta un fenómeno ante el que pasa.</p>
    <div class="table-scroll">
    <table>
      <tr><th>Campo</th><th>Significado</th></tr>
      <tr><td><code>id</code></td><td>Estable entre fotogramas clave, misma regla que para una capa</td></tr>
      <tr><td><code>eastM</code>, <code>northM</code></td><td>Dónde estaba su centro en el instante cero, en metros desde el punto de partida del observador. El viento la arrastra desde allí</td></tr>
      <tr><td><code>baseM</code>, <code>thicknessM</code></td><td>Su propia base y su propia altura, en metros — una nube puede estar más baja o alzarse más que su manto</td></tr>
      <tr><td><code>widthM</code>, <code>depthM</code>, <code>rotationDeg</code></td><td>Su huella, en metros, y el rumbo hacia el que está girada esa huella</td></tr>
      <tr><td><code>density</code>, <code>darkness</code></td><td>Las suyas propias; si falta la oscuridad, la de la capa</td></tr>
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
    <p>Una grabación cuyo tiempo fue <strong>consultado</strong> (tiene un <code>weatherSource</code>)
      guarda la respuesta del registro, no un enlace a él: ERA5 da las bandas baja, media y alta como tres
      capas llamadas <code>record-low</code>, <code>record-mid</code> y <code>record-high</code>, la
      base baja estimada a partir de la diferencia entre temperatura y punto de rocío, las otras dos a 3 500 m
      y 8 000 m. Su tipo es <code>unknown</code> (cirro para la alta), su tamaño y su densidad
      son supuestos de dibujo: un reanálisis sabe qué parte de cada banda estaba cubierta, no qué aspecto
      tenían las nubes. Vuelve a pedir el registro desde el editor y las capas se reescriben; edita
      una capa a mano y la grabación pasa a ser del autor, y la fuente se elimina.</p>

    <h2>De dónde viene cada valor</h2>
    <p>Cualquier valor de una grabación puede escribirse tal cual, o envuelto con su procedencia:</p>
    <pre data-json="none"><code>"durationSeconds": {
  "value": 15,
  "basis": "derived",
  "rationale": "De 13 a 18 s en la síntesis del investigador; se toma el punto medio"
}</code></pre>
    <p><code>basis</code> es <code>stated</code> (lo dijo el observador, y es lo que significa un valor
      sin envolver), <code>derived</code> (deducido de lo que dijo más algo comprobable: la anchura de una
      carretera, un mapa, un dibujo medido; <code>rationale</code> da el razonamiento) o
      <code>assumed</code> (elegido para que la reconstrucción tenga un valor, sin base en nada de lo que
      dijo el observador). La lista de valores <code>assumed</code> es la lista de lo que hay que volver a
      preguntar al observador o buscar en el expediente, y por eso vale la pena escribirla incluso cuando no se escribe nada más.</p>

    <h2>Comprobar un archivo</h2>
    <p>El formato se publica también como <a href="/sighting.schema.json">JSON Schema</a>,
      generado a partir de los mismos tipos que el reproductor: todas las claves que conoce, lo que puede
      contener cada una, y las palabras que acepta una lista cerrada. Una clave mal escrita o un valor
      desconocido no lo superan. No dice nada de lo que puede omitirse, que es una cuestión de sentido que
      responde esta página. Para ver el resultado, abre el archivo en <a href="/play/">el reproductor</a>,
      desde un enlace, pegándolo, o desde tu disco con las imágenes y los modelos que nombra. El reproductor
      lo comprueba del mismo modo al cargar, e indica tras un ⚠ sobre la imagen lo que no pudo reproducir
      tal como está escrito: una clave que nada lee, una palabra fuera de su lista, y lo que tuvo que
      inventar porque el primer fotograma clave de una forma lo omitía (un campo mantenido desde el
      fotograma clave anterior es la regla de arriba, no un problema).</p>

    <h2>Un archivo completo</h2>
    <p>La grabación más pequeña que aún expresa algo — un óvalo silencioso que cruza el cielo en
      doce segundos, en una fecha real y en un lugar real. Todo lo demás del formato es opcional, y
      todo lo que sigue cumple una función:</p>
    <pre data-json=""><code>${this.escape(this.example)}</code></pre>
    <p class="small">Para modificarlo y verlo reproducirse, pégalo en <a href="/play/">el reproductor</a>,
      cuyo editor completa cada clave que tiene el formato, ofrece las palabras que acepta cada una, y
      dice lo que el modelo dice de ella.</p>
    <p>Es <a href="/demo-data/example-minimal.json"><code>/demo-data/example-minimal.json</code></a>
      en este sitio, así que puedes descargarlo, y
      <a href="/play/?sighting=/demo-data/example-minimal.json">reproducirlo</a> antes de cambiar
      nada. Observa que aparecen tanto <code>angular</code> como <code>bounds</code>: el ángulo es lo que
      el archivo SIGNIFICA, y los píxeles se vuelven a derivar de él al cargar — escribe el ángulo, y deja
      que se te corrija una estimación errónea de los píxeles.</p>

    <h2>Otros más grandes para leer</h2>
    <p>Cada demo de este sitio es un simple archivo que puedes abrir. Estos cuatro son los que vale la
      pena leer para ver cómo se construye una grabación real:</p>
    <div class="table-scroll">
    <table>
      <tr><th>Archivo</th><th>Qué mirar en él</th></tr>
      <tr><td><a href="/demo-data/observer-chiles.json"><code>observer-chiles.json</code></a></td><td>Un caso real: un observador, un id de caso compartido con una segunda grabación, diez fotogramas clave, un <code>weatherTrack</code> consultado con su <code>weatherSource</code></td></tr>
      <tr><td><a href="/demo-data/sky-test-halos.json"><code>sky-test-halos.json</code></a></td><td>Ningún fenómeno — un cielo preparado por un <code>weatherTrack</code> cuyos fotogramas clave cambian la alineación de los cristales, la cobertura de cirros y un manto de cúmulos, contemplado a través de un <code>observerTrack</code> que recorre el conjunto y luego se detiene</td></tr>
      <tr><td><a href="/demo-data/sky-test-clouds.json"><code>sky-test-clouds.json</code></a></td><td>Tres capas de nubes con altitud, espesor, tamaño, densidad y viento en metros, evolucionando en la línea de tiempo meteorológica — y en la primera una entrada <code>instances</code>: una nube del campo, situada y dimensionada en metros, que crece y se oscurece a lo largo de los dos minutos</td></tr>
      <tr><td><a href="/demo-data/sky-test-aircraft.json"><code>sky-test-aircraft.json</code></a></td><td>Un <code>instrument</code>, un <code>exposureSeconds</code> y un <code>iso</code>, y una aeronave de <code>decor</code> con una <code>track</code> y nueve <code>lights</code> a sus cadencias de destello reales, luces de aterrizaje incluidas</td></tr>
      <tr><td><a href="/demo-data/instrument-instamatic.json"><code>instrument-instamatic.json</code></a></td><td>El mismo avistamiento que <code>observer-socorro.json</code>, cambiado en un solo campo. Compara los dos</td></tr>
    </table>
    </div>

    <h2>Cuatro reglas que deciden lo que significa un archivo</h2>
    <ul class="plain">
      <li><strong>Los campos discretos se mantienen, los continuos se interpolan.</strong> Una forma omitida en
        un fotograma clave posterior se queda como estaba, y lo mismo cualquier campo que un fotograma clave omita en una forma
        que sí vuelve a indicar: un fotograma clave que solo da un nuevo <code>aim</code> mueve la forma y conserva
        todo lo demás (volver a indicar <code>bounds</code> sin <code>aim</code> ni
        <code>angular</code> se entiende como moverla por sus píxeles); una cuyo primer fotograma clave está a los cinco segundos ya está
        pintada, en ese estado, desde cero. Para que algo deje de ser visible, ponle un fotograma clave con
        <code>transparency: 1</code>.</li>
      <li><strong>Solo ángulos.</strong> No se guarda en ninguna parte ningún tamaño real ni ninguna distancia real. Los metros
        se deducen, como desigualdades, de aquello por detrás o por delante de lo cual se dijo que pasó el fenómeno
        (<code>decor[].occludesSourceIds</code>).</li>
      <li><strong>Lo declarado prevalece sobre lo deducido.</strong> <code>occludesSourceIds</code> registra afirmaciones del observador. Nada en este formato
        <em>puede</em> deducirlas: describe una apariencia en un campo de visión, no una posición en
        el espacio.</li>
      <li><strong>Ausente no es cero.</strong> Que no haya pista de sonido significa que nadie preguntó;
        <code>kind: "none"</code> significa que el observador declaró no haber oído nada. La misma distinción
        recorre el tiempo y la nube de hielo.</li>
    </ul>
    <p class="small">Esta página es la referencia del formato. El razonamiento detrás de cada campo está en
      los comentarios de documentación de su tipo, con los que completan los extractos de arriba, y en el
      <a href="https://github.com/RR0/UfoAtHome">código fuente</a>.</p>
  </div>
</section>
`
  }

  private it(): string {
    return `
<section class="band">
  <div class="wrap prose-wide">
    <p>Una registrazione è un semplice file JSON. Niente al suo interno è un blob binario, un
      identificativo in un database o un riferimento a questo sito — puoi scriverne una a mano,
      generarla dal tuo archivio, o confrontarne due in una revisione del codice.</p>
    <p class="small">Ogni estratto qui sotto è in sola lettura, e ognuno conosce il formato: metti il
      cursore dentro un oggetto e premi <kbd>Ctrl</kbd>+<kbd>Spazio</kbd> (<kbd>⌥</kbd>+<kbd>I</kbd> su Mac) per
      elencare tutte le chiavi che potrebbero stare lì, con ciò che il modello dice di ciascuna.</p>

    <h2>L'osservazione</h2>
    <div class="table-scroll">
    <table>
      <tr><th>Campo</th><th>Significato</th></tr>
      <tr><td><code>version</code></td><td>Sempre <code>1</code></td></tr>
      <tr><td><code>id</code></td><td>Quale resoconto è, unico fra tutte le registrazioni ovunque: il giorno, poi chi l'ha visto (<code>"1964-04-24-ZamoraLonnie"</code>), o il luogo per un osservatore anonimo (<code>"1964-04-24-Socorro"</code>). Ciò con cui un caso lo designa</td></tr>
      <tr><td><code>time</code>, <code>endTime</code></td><td><code>{ year, month, day, hour, minute, second, raw }</code>, ogni parte facoltativa — è così che il formato esprime “1954” o “verso le 05:00”. <code>raw</code> è la data come scritta in <a href="https://www.loc.gov/standards/datetime/">EDTF</a>, ed è ciò che la data significa: <code>"1948-07-24T02:45~"</code> (approssimativa), <code>"2025-06?"</code> (incerta), <code>"1965-07-01%"</code> (entrambe le cose), <code>"19XX"</code> (un anno mascherato), oppure <code>"05:00"</code> da solo per un'ora del giorno ricordata senza la sua data. I numeri sono tenuti in accordo con essa per ciò che si calcola (il cielo, l'orologio). È un sottoinsieme di EDTF (livello 0, questi qualificatori sull'intera data, anni mascherati); <a href="https://www.npmjs.com/package/@rr0/time"><code>@rr0/time</code></a> è il modello EDTF completo di RR0, in cui gli strumenti propri di UFO@home convertono le date di una registrazione</td></tr>
      <tr><td><code>durationSeconds</code></td><td>Un'alternativa a <code>endTime</code>, e prevale se sono date entrambe</td></tr>
      <tr><td><code>utcOffsetHours</code></td><td>L'ora LEGALE su cui era regolato l'orologio dell'osservatore (+1 per la Francia nel 1965). Se manca, viene approssimata dalla longitudine, che non può conoscere l'ora legale né un passaggio all'ora estiva</td></tr>
      <tr><td><code>timeZone</code></td><td>Il fuso IANA da cui è stato ricavato lo scarto (<code>"Europe/Paris"</code>): la regola, mentre <code>utcOffsetHours</code> è il numero che dava a quella data. Per collocare il cielo si legge solo il numero; il fuso è ciò che permette di ricavare di nuovo lo scarto quando la data cambia</td></tr>
      <tr><td><code>place</code></td><td><code>[{ lat, lng, name }]</code> — <code>name</code> è il nome completo del luogo da cui sono state risolte le coordinate</td></tr>
      <tr><td><code>observer</code></td><td><code>{ id, title, lastName, firstNames }</code>, tutti facoltativi; da omettere del tutto per un osservatore anonimo. <code>id</code> è un riferimento alla persona (su RR0, la sua directory: <code>"ZamoraLonnie"</code>); gli altri campi la descrivono quando nessuno gliene ha ancora dato uno</td></tr>
      <tr><td><code>description</code></td><td>Il resoconto in prosa — una stringa, o una per lingua (vedi sotto)</td></tr>
      <tr><td><code>tags</code></td><td>Un elenco di stringhe, scritte in inglese: sono termini tecnici, e due registrazioni che ne condividono uno devono coincidere su di esso. A ogni lettore vengono mostrati nella sua lingua quando se ne conosce una traduzione, come avviene oggi per ${this.tags()}. L'elenco non è chiuso: qualsiasi altro viene mostrato come è scritto, e i codici di classificazione (<code>"RR3"</code>, <code>"NL"</code>) o i riferimenti di caso (<code>"Blue Book 8729"</code>) si scrivono così come sono. Uno cambia la riproduzione: <code>paralysis</code> tiene immobile la vista dell'osservatore</td></tr>
      <tr><td><code>account</code></td><td>Chi l'ha visto e come ha viaggiato il resoconto: <code>observerAgeYears</code> (all'epoca), <code>observerOccupation</code>, <code>source</code> (come è arrivato a chi ha scritto la registrazione: <code>on-site</code>, <code>interview</code>, <code>telephone</code>, <code>questionnaire</code>, <code>letter</code>, <code>social-media</code>, <code>press</code>) e <code>followedUp</code> (se l'osservatore è stato ricontattato in seguito)</td></tr>
      <tr><td><code>sources</code></td><td>Dove leggere il resoconto così come è stato dato, nella forma di una <a href="https://www.npmjs.com/package/@rr0/data">fonte RR0</a>: <code>[{ type, title, authors, url, publication: { publisher, time }, index }]</code>, con <code>type</code> <code>book</code> o <code>article</code>, o niente per una pagina web o un post, che è allora solo il suo <code>url</code>. Mostrate nel pannello <q>?</q> del lettore, come link quando hanno un indirizzo; riprese così come sono in un fascicolo RR0</td></tr>
      <tr><td><code>milestones</code></td><td>I momenti con un nome del resoconto, mostrati sulla barra di riproduzione: <code>[{ t, label, note }]</code>, dove <code>label</code> è la lettera o il numero che usa il resoconto stesso (<code>"A"</code>, <code>"B"</code>) o un paio di parole, e <code>note</code> ciò che è accaduto allora, con le parole del resoconto quando possibile (una stringa, o una per lingua)</td></tr>
      <tr><td><code>roads</code></td><td>Le strade o i sentieri che disegna la pianta del resoconto stesso, quando la mappa non li ha: <code>[{ id, title, surface, widthM, path, source }]</code>, dove <code>surface</code> è <code>paved</code>, <code>gravel</code> o <code>dirt</code>, <code>path</code> la linea mediana come <code>[{ eastM, northM }]</code> dal luogo dell'osservatore all'inizio, e <code>source</code> la pianta o il rilievo da cui è stata ricavata</td></tr>
    </table>
    </div>

    <h2>Più osservatori: il caso</h2>
    <p>Ogni osservatore ha una registrazione propria, e una registrazione non dice a quale caso
      appartiene: un resoconto sta in piedi da solo. Ciò che li mostra insieme è il
      <strong>caso</strong>, che li nomina: il
      <code>case.json</code> di un fascicolo <a href="https://rr0.org">RR0</a>, che indica il
      titolo, la data e la classificazione del caso, ed elenca tutto ciò che vi è accaduto come
      <code>events</code>. I suoi eventi di tipo <code>sighting</code> sono i suoi resoconti, ciascuno dei quali
      punta alla registrazione di un osservatore:</p>
    <pre data-json="none"><code>{
  "id": "ChilesWhitted",
  "title": "Chiles et Whitted",
  "time": "1948-07-24 02:45",
  "events": [
    { "type": "event", "eventType": "sighting", "url": "observer-chiles.json" },
    { "type": "event", "eventType": "sighting", "url": "observer-whitted.json" }
  ]
}</code></pre>
    <div class="table-scroll">
    <table>
      <tr><th>Campo</th><th>Significato</th></tr>
      <tr><td><code>id</code></td><td>L'identificativo proprio del caso. Su rr0.org è la directory del fascicolo e può essere omesso; un file di caso a sé stante lo indica</td></tr>
      <tr><td><code>title</code>, <code>time</code></td><td>Il nome del caso, e quando è avvenuto come RR0 scrive un'ora (<code>"1948-07-24 02:45"</code>, <code>"1954"</code>). Il lettore designa un caso che apre con il suo titolo</td></tr>
      <tr><td><code>events</code></td><td>La cronologia del caso. Vengono riprodotti solo i <code>sighting</code>, ciascuno tramite il suo <code>url</code>, letto rispetto all'indirizzo del file di caso stesso (così lo stesso caso funziona dalla pagina del suo fascicolo e da qualsiasi altro luogo); gli altri (un'analisi, un articolo, un filmato, una confessione) sono di RR0</td></tr>
    </table>
    </div>
    <p>Dallo a <code>&lt;rr0-sighting src&gt;</code> o al lettore, e ogni osservatore potrà essere
      scelto da un elenco. Una registrazione può essere data direttamente, senza caso, ma un caso con un solo
      avvistamento funziona allo stesso modo e nomina ciò che mostra. Provalo con
      <a href="/demo-data/case-chiles-whitted.json"><code>case-chiles-whitted.json</code></a>
      (<a href="/play/?sighting=/demo-data/case-chiles-whitted.json">riproducilo</a>).</p>

    <h2>Dirlo in più di una lingua</h2>
    <p>Una registrazione passa da un lettore all'altro, quindi ogni campo scritto da un autore può contenere
      una stringa per lingua invece di una sola: <code>description</code>, il <code>title</code> di una forma
      o di un elemento dello scenario, e il <code>label</code> e la <code>note</code> di una tappa.</p>
    <pre data-json=""><code>{
  "description": {
    "fr": "Tout le compte rendu de Lonnie Zamora, d'un seul tenant…",
    "en": "Lonnie Zamora's whole account, of a piece…"
  }
}</code></pre>
    <p>Le chiavi sono etichette di lingua come le fornisce un browser (<code>fr</code>, <code>en</code>,
      <code>pt-BR</code>), e nessuna è obbligatoria. Una stringa semplice resta perfettamente valida e
      significa “nella lingua in cui è stata scritta” — come ogni registrazione fatta prima di questo.
      Un lettore le cui lingue non sono nessuna di quelle presenti riceve ciò che il file HA invece
      di un campo vuoto: una traduzione mancante non deve mai trasformare qualcosa che l'osservatore
      ha detto in qualcosa che non ha detto.</p>
    <p>La lingua che riceve un lettore è quella del suo browser, a meno che la pagina non dica altrimenti: un
      <code>lang</code> sull'elemento stesso, o su qualsiasi cosa intorno a esso, viene preso per primo — un
      articolo che dichiara la propria lingua ha già detto in quale lingua il suo lettore lo sta leggendo.
      L'elenco del browser viene dopo, quindi dichiararne una impone una scelta senza scartare le
      altre.</p>
    <p>L'editor mostra una sola lingua, quella del lettore, e scrivendo tocca solo quella —
      quindi aprire un file nell'altra lingua e scrivere è il modo in cui si aggiunge una traduzione, e un
      autore non può cancellare quella di un altro.</p>

    <h2>Ciò che è stato visto</h2>
    <p><code>timeline.keyframes</code> è un elenco di <code>{ t, shapes }</code>, con <code>t</code> in
      millisecondi dall'inizio. Ogni forma porta un <code>sourceId</code> — più forme possono
      condividere una linea temporale (il fenomeno, una fiamma che lo segue, una seconda luce) — e una <code>shape</code>:</p>
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
  "title": "il fenomeno",
  "angular": { "widthDeg": 1.2, "heightDeg": 0.4 },
  "aim": { "azimuthDeg": 353.6, "altitudeDeg": 0.6 }
}</code></pre>
    <div class="table-scroll">
    <table>
      <tr><th>Campo</th><th>Significato</th></tr>
      <tr><td><code>kind</code></td><td><code>oval</code>, oppure <code>polygon</code>, che allora prende anche <code>points</code>: <code>[{ x, y }]</code> in pixel dall'angolo in alto a sinistra di <code>bounds</code>, estesi sulla sua larghezza e altezza, così che il contorno si allunghi con esso quando l'angolo ridimensiona il riquadro</td></tr>
      <tr><td><code>title</code></td><td>Il suo nome, mostrato quando il puntatore ci passa sopra; una stringa, o una per lingua</td></tr>
      <tr><td><code>color</code></td><td>Qualsiasi colore CSS</td></tr>
      <tr><td><code>angle</code></td><td>La sua inclinazione, in radianti attorno al proprio centro, positiva in senso orario sullo schermo</td></tr>
      <tr><td><code>transparency</code></td><td>Da 0 opaco a 1 invisibile</td></tr>
      <tr><td><code>haloScale</code></td><td>Il bagliore intorno; 0 per nessuno</td></tr>
      <tr><td><code>brightness</code></td><td>Quanto abbaglia: un velo, le punte del diaframma, un nucleo saturato al bianco</td></tr>
      <tr><td><code>blur</code></td><td>Quanto indistinti l'osservatore ha detto che apparivano i bordi</td></tr>
      <tr><td><code>angular</code></td><td>La sua dimensione apparente in gradi — vedi sotto</td></tr>
      <tr><td><code>aim</code></td><td>Dove si trovava nel cielo dell'osservatore: la direzione del suo centro, <code>azimuthDeg</code> in senso orario dal nord vero e <code>altitudeDeg</code> sopra l'orizzonte. Non la direzione in cui guardava l'osservatore, che è l'<code>headingDeg</code> e il <code>pitchDeg</code> della posa — vedi sotto</td></tr>
    </table>
    </div>
    <p><strong><code>aim</code> lo colloca, <code>angular</code> lo dimensiona.</strong> <code>bounds</code>
      è la proiezione di entrambi sulla tela fissa di 640×360 con la direzione e il campo visivo della
      posa, attraverso lo strumento della registrazione stessa; viene ricavato di nuovo al caricamento, così
      un file sopravvive a un cambiamento di tela, di campo visivo, di strumento, o di dove guardava
      l'osservatore. Se i pixel e gli angoli dovessero divergere, vincono gli angoli: spostare
      <code>bounds</code> in un file non ha effetto finché c'è <code>aim</code>. Un file scritto a mano
      può omettere <code>bounds</code> del tutto.</p>
    <p><code>timeline.order</code> è l'ordine di disegno da dietro in avanti, <code>timeline.groups</code> gli
      identificativi di sorgente raggruppati. Entrambi facoltativi.</p>

    <h2>Tutto ciò che c'è intorno</h2>
    <div class="table-scroll">
    <table>
      <tr><th>Campo</th><th>Significato</th></tr>
      <tr><td><code>observerTrack</code></td><td><code>{ keyframes: [{ t, pose }] }</code> — <code>pose</code> contiene <code>lat</code>, <code>lng</code>, <code>elevationM</code> (sopra il suolo locale), <code>headingDeg</code>, <code>pitchDeg</code>, <code>rollDeg</code>, <code>fovDeg</code>, e per una fotocamera <code>fNumber</code> e <code>focusDistanceM</code>. Riprodotto come si muove una persona: esattamente la posa indicata a ogni fotogramma chiave, e fra l'uno e l'altro un movimento che prende velocità, la mantiene attraverso i fotogrammi chiave che continuano a muoversi, e rallenta fino a una pausa — due fotogrammi chiave con lo stesso luogo, o la stessa direzione. Uno sguardo inizia e finisce fermo; una camminata o un tragitto in auto già in corso al primo fotogramma chiave prosegue. Fermarsi e ripartire a piedi aggiungono il loro sobbalzo, un cenno del capo che si spegne in un secondo e mezzo, trasferito nell'immagine quanto lo strumento lo lascia passare (appena per un occhio, del tutto per una fotocamera tenuta in mano). E un corpo a riposo non è mai del tutto immobile: in piedi o in attesa, la vista oscilla di qualche millimetro e deriva di un decimo di grado, lentamente, allo stesso modo nello stesso istante — tranne per un osservatore che il resoconto dice paralizzato (tag <code>paralysis</code>)</td></tr>
      <tr><td><code>weatherTrack</code></td><td><code>{ keyframes: [{ t, weather }] }</code> — le condizioni del cielo lungo la registrazione: precipitazioni, vento, temporale, e le nuvole come strati ad altezze reali, ognuno in grado di contenere nuvole singole collocate in metri. Ogni campo di un <code>weather</code> è nella sezione seguente</td></tr>
      <tr><td><code>weatherSource</code></td><td><code>{ id, name, url }</code> del dato da cui è stato ricavato il meteo. La sua presenza significa che la registrazione viene riprodotta esattamente come è stata composta e non viene mai più consultata. Se manca, è il resoconto dell'osservatore stesso</td></tr>
      <tr><td><code>lightPollution</code></td><td>La brillanza del cielo notturno del luogo, città comprese: lo zenit di una notte senza Luna in magnitudini per secondo d'arco quadrato, come lo legge uno Sky Quality Meter o come lo dà l'<a href="https://doi.org/10.1126/sciadv.1600377">atlante mondiale della brillanza artificiale del cielo notturno</a> (la sua cifra «SQM», Falchi et al. 2016, che <a href="https://www.lightpollutionmap.info">lightpollutionmap.info</a> mostra per ogni luogo). <code>22</code> è un cielo naturale, una periferia intorno a <code>19</code>, un centro città <code>17</code>. Se manca, un cielo naturale. La parte delle città, ciò che resta tolti i 22 naturali, si aggiunge al cielo come luce: più forte verso l'orizzonte, dove l'aria bassa ne rimanda di più, e disegnata nel bianco caldo di una lampada a 3000 K. Annega la Via Lattea e la luce zodiacale, e toglie stelle, della differenza nella stella più debole che un occhio distingue (Crumey 2014): circa due magnitudini a <code>19</code>. Ora la Luna fa lo stesso. <code>"derived"</code> quando è ricavata dall'atlante, <code>"stated"</code> quando l'osservatore l'ha misurata</td></tr>
      <tr><td><code>soundTrack</code></td><td><code>{ keyframes: [{ t, sound }] }</code> — <code>kind</code> (none/hum/whistle/rumble/crackle), <code>volume</code>, <code>pitchHz</code>, e un <code>src</code> facoltativo di una registrazione reale. <code>volume</code> e <code>pitchHz</code> scorrono fra i fotogrammi chiave, <code>kind</code> e <code>src</code> cambiano al fotogramma chiave. Un <code>src</code> su un altro sito deve essere servito a qualsiasi origine (CORS)</td></tr>
      <tr><td><code>references</code></td><td>Immagini del luogo sovrapposte alla scena: <code>src</code> (un indirizzo, o un URL <code>data:</code> per un'immagine aggiunta da un disco), <code>kind</code> (photo/panorama), <code>registration</code> (<code>headingDeg</code>, <code>pitchDeg</code>, <code>rollDeg</code>, <code>fovDeg</code>), <code>opacity</code>, <code>credit</code>/<code>creditUrl</code>, <code>t</code> e <code>drawing</code> facoltativi, <code>from</code> (<code>{ lat, lng }</code>, dove è stata scattata: il lettore la dissolve man mano che l'osservatore si allontana da quel punto; se manca, non si dissolve mai), e i <code>landmarks</code> su cui è stata allineata (<code>id</code>, <code>label</code>, <code>picture</code> come <code>{ u, v }</code> dall'angolo in alto a sinistra, <code>scene</code> come <code>{ azimuthDeg, altitudeDeg }</code>)</td></tr>
      <tr><td><code>instrument</code>, <code>exposureSeconds</code></td><td>Attraverso che cosa è stato osservato, e per quanto tempo è rimasto aperto l'otturatore. Se manca, l'occhio nudo. <code>instrument</code> è uno fra <code>eye</code>, <code>rectilinear-lens</code> (una fotocamera di marca sconosciuta), <code>instamatic-126</code>, <code>slr-35mm-50</code>, <code>slr-35mm-zoom</code>, <code>phone-landscape</code>, <code>phone-portrait</code>; <code>exposureSeconds</code> è un unico valore per tutta la registrazione, contenuto nell'intervallo proprio di quel dispositivo</td></tr>
      <tr><td><code>iso</code></td><td>La sensibilità della pellicola o del sensore su cui è stata scattata l'immagine, quando è nota: <code>400</code> per una pellicola da 400 ISO. Se manca, quella del dispositivo stesso (il negativo a colori di una reflex è 100, quello di una Instamatic 64). L'immagine di una fotocamera non risponde come quella di un occhio: una pellicola non si adatta al cielo, riceve un'esposizione — la luce, per il tempo di otturazione, divisa per il quadrato del numero f — e vi risponde con la propria curva (quella morbida di un negativo, quella più ripida di una diapositiva, la linea retta di un sensore che si ferma al bianco). Così una posa notturna esce con un cielo nero e ciò che vi brillava in risalto</td></tr>
      <tr><td><code>sway</code></td><td>Quanto il corpo che tiene lo strumento muove la vista quando non cammina: <code>1</code> per una persona in piedi o seduta, <code>0</code> per una fotocamera su treppiede, qualsiasi valore intermedio o superiore per meno o per più. Se manca, <code>1</code> — tranne per un osservatore che il resoconto dice paralizzato (tag <code>paralysis</code>), per cui è <code>0</code>, e per un'esposizione più lunga di mezzo secondo, che nessuna mano tiene ferma: quello è un treppiede, e anche <code>0</code></td></tr>
      <tr><td><code>vehicle</code></td><td>Il veicolo in cui si trovava l'osservatore, quando lo scenario non lo disegna: <code>{ kind, windowsOpen, noise }</code>, dove <code>kind</code> è <code>car</code>, <code>van</code>, <code>truck</code>, <code>motorcycle</code> o <code>generic</code>. Sentito dall'interno: il suo motore segue il tragitto dell'osservatore stesso — la marcia dalla velocità, i giri dalla marcia, lo sforzo dall'accelerare o dal rallentare — con il rotolamento e il vento, attutiti da un abitacolo chiuso, lasciati entrare da finestrini aperti; <code>noise</code> è il suo livello sonoro rispetto a uno ordinario del suo tipo (1 per impostazione predefinita)</td></tr>
      <tr><td><code>decor</code></td><td>Scenario a <code>eastM</code>/<code>northM</code> reali dall'osservatore: edifici (con <code>floors</code>, <code>windows</code>), alberi, arbusti, lampioni, veicoli, ponti, altri osservatori, aeromobili — facoltativamente con una <code>track</code> e delle <code>lights</code> il cui <code>pattern</code> porta una cadenza di lampeggio reale. Vedi sotto</td></tr>
    </table>
    </div>
    <p>Un <strong>elemento dello scenario</strong> si esprime in metri, come tutto ciò che non è il fenomeno:</p>
    <div class="table-scroll">
    <table>
      <tr><th>Campo</th><th>Significato</th></tr>
      <tr><td><code>eastM</code>, <code>northM</code>, <code>headingDeg</code></td><td>Dove si trova rispetto all'osservatore, e verso dove è rivolta la sua parte anteriore, in senso orario dal nord vero</td></tr>
      <tr><td><code>sizeM</code></td><td><code>{ widthM, lengthM, heightM }</code> lungo i suoi assi, la lunghezza essendo la direzione verso cui è rivolto. Ogni asse è facoltativo: uno che nessuno ha misurato mantiene la proporzione propria della forma integrata</td></tr>
      <tr><td><code>model</code></td><td>Un vero modello 3D al posto della forma integrata: una voce del catalogo tramite <code>id</code>, o un file glTF/GLB a <code>url</code> (che prevale, deve essere leggibile da qualsiasi origine, e allora richiede il suo <code>credit</code>; uno relativo si legge dal file che lo indica). Non decide mai la dimensione: viene scalato, mantenendo le proporzioni, sul primo asse misurato fra lunghezza, altezza e larghezza, o sulla dimensione reale che gli dà il catalogo. Visto dall'interno, e ogni volta che il modello non si può ottenere, viene disegnata invece la forma integrata</td></tr>
      <tr><td><code>bridge</code></td><td>Per un <code>"bridge"</code>: come è costruito. <code>sizeM.lengthM</code> è tutta la sua lunghezza lungo la strada, rilevati compresi, <code>widthM</code> la larghezza dell'impalcato e <code>heightM</code> l'altezza della carreggiata sull'impalcato sopra il suolo; <code>spanM</code> è la luce libera sotto l'impalcato, con la strada che corre su un rilevato di terra digradante fino al suolo su ciascun lato; <code>deckThicknessM</code> lo spessore della soletta (1,2 per impostazione predefinita); <code>railing</code> <code>{ heightM, postSpacingM, rails }</code> il parapetto lungo entrambi i bordi, montanti e correnti le cui aperture sono rettangoli (1,05 m, 1,5 m e 2 correnti per impostazione predefinita). Disegnato con quelle misure, mai stirato</td></tr>
      <tr><td><code>track</code></td><td><code>[{ t, eastM, northM, altitudeM, headingDeg }]</code> quando si muove, <code>altitudeM</code> sopra l'osservatore. La posizione è interpolata fra i fotogrammi chiave; la direzione è mantenuta dall'uno al successivo</td></tr>
      <tr><td><code>lights</code></td><td>Le sue luci: <code>id</code>, <code>offsetM</code> <code>{ x, y, z }</code> dal suo centro (destra, alto, davanti), <code>color</code>, <code>intensity</code> (1 è una normale luce di navigazione) e un <code>pattern</code>: <code>{ "kind": "steady" }</code>, oppure <code>{ "kind": "flash", perMinute, dutyCycle, phase }</code>, la cadenza come la stabiliscono i regolamenti, la frazione accesa di ogni ciclo (circa 0,5 per un lampeggiatore a filamento, 0,01 per uno stroboscopio) e uno sfasamento da 0 a 1 fra le luci. L'editor le compila da preimpostazioni: “Aereo di linea”, “Elicottero”, “Auto, fari accesi”, “Auto, luci di emergenza”, “Lampeggianti di veicolo di soccorso”, “Lampione”</td></tr>
      <tr><td><code>engine</code></td><td>Un veicolo che si sente in moto: <code>{ kind, noise }</code>, come <code>vehicle</code> sopra. Il suo motore segue la sua <code>track</code>, sentito da dove si trova l'osservatore, più debole e più sordo con la distanza</td></tr>
      <tr><td><code>occludesSourceIds</code></td><td>I fenomeni davanti ai quali l'osservatore ha detto che si trovava — vedi le regole sotto</td></tr>
    </table>
    </div>

    <h2>Che cos'era: le interpretazioni</h2>
    <p>Una registrazione esprime angoli, e un corpo in metri non fa mai parte di ciò che è stato visto. È
      un'affermazione su di esso, e la si mette alla prova collocandola nella scena e guardandola da dove
      si trovava l'osservatore: proietta la sua ombra, il suolo può nasconderla, e il suo contorno viene misurato
      in ogni istante rispetto a ciò che l'osservatore ha detto. Un'interpretazione viene mostrata da sola, come il
      mondo che afferma; se si chiede il confronto (il pulsante ◌, o <code>compare-account</code> su
      <code>&lt;rr0-sighting&gt;</code>), il lettore disegna accanto tutto ciò che l'osservatore ha visto come
      contorni tratteggiati e indica di quanto si discosta la direzione e quante volte più largo e più alto
      appare ciascun corpo, in rosso quando un osservatore non avrebbe potuto sbagliarsi di tanto.</p>
    <p>La lettura dell'osservatore stesso va nella registrazione, come <code>interpretation</code>. Quella di un
      analista va nel caso, come evento di tipo <code>interpretation</code> che designa la
      registrazione con il suo <code>id</code>, con chi la sostiene in <code>by</code>
      (<code>{ "people": id }</code>, <code>{ "org": id }</code>, o una persona descritta nel valore)
      e i suoi corpi in linea o in un file a <code>url</code>. Un resoconto il cui osservatore ha detto che cosa
      fosse viene disegnato a tutto tondo, come l'ha detto; uno che non dice nulla in metri viene disegnato come gli
      angoli che esprime. Il lettore lo propone, insieme all'interpretazione di ciascun analista, una alla volta.</p>
    <pre data-json="none"><code>"interpretation": {
  "title": "Un velivolo posato sulle sue zampe",
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
      <tr><th>Campo</th><th>Significato</th></tr>
      <tr><td><code>explains</code></td><td>I <code>sourceId</code> dei fenomeni che questo corpo afferma di essere</td></tr>
      <tr><td><code>model</code></td><td>Una forma costruita qui (<code>ellipsoid</code>, <code>sphere</code>, <code>disc</code>, <code>cylinder</code>, <code>cone</code>, <code>box</code>, <code>torus</code>, <code>figure</code>), un modello del catalogo tramite <code>id</code>, o un file glTF a <code>url</code> con il suo <code>credit</code>; un <code>url</code> relativo si legge dal file che lo indica, non dalla pagina. Stirato a <code>sizeM</code> in ogni caso</td></tr>
      <tr><td><code>track</code></td><td>Dove si trova e che aspetto ha a ogni <code>t</code>. Una posizione si esprime o nel mondo (<code>eastM</code>/<code>northM</code> da dove si trovava l'osservatore all'inizio, come lo scenario, con <code>onGround</code> o <code>altitudeAboveGroundM</code>) o dall'osservatore in quell'istante (<code>azimuthDeg</code>, <code>altitudeDeg</code>, <code>distanceM</code>). Un corpo <code>onGround</code> poggia sul rilievo; una direzione senza distanza incontra allora il suolo dove lo incontra quella linea. <code>sizeM</code>, <code>attitude</code> (<code>headingDeg</code>, <code>pitchDeg</code>, <code>rollDeg</code>) e <code>appearance</code> (<code>color</code>, <code>albedo</code>) valgono finché un fotogramma chiave successivo non li indica di nuovo. <code>present: false</code> toglie il corpo dalla scena a partire da quel fotogramma chiave, e <code>present: true</code> lo riporta. Una <code>flame</code> (<code>lengthM</code>, <code>widthM</code>, <code>color</code> all'ugello, <code>tipColor</code>, <code>luminanceCdM2</code>) si accende al fotogramma chiave che la indica, esce dal nodo del modello chiamato <code>exhaust</code> (o da quello che nomina il suo <code>node</code>), illumina ciò che la circonda, solleva polvere dove tocca il suolo quando <code>raisesDust</code> lo dice, e si spegne con una <code>luminanceCdM2</code> pari a 0</td></tr>
      <tr><td><code>motions</code></td><td>In un fotogramma chiave: a che punto è ciascuno dei movimenti propri del suo modello, con il nome del movimento — le animazioni del file glTF. <code>0</code> è l'inizio di un movimento, <code>1</code> la sua fine, e uno che si ripete prosegue oltre 1: <code>{ "legs-turn": 7 }</code> sono sette giri. Il modello dice che cosa si muove e come; la traccia dice quando. Ogni movimento si interpola fra i fotogrammi chiave che lo indicano, qualunque altro fotogramma chiave sposti il corpo nel frattempo, si mantiene dopo l'ultimo e vale 0 prima del primo. La partenza di Valensole si scrive così: <code>{ "t": 246000, "motions": { "pivot-retract": 0 } }</code>, <code>{ "t": 248000, "motions": { "pivot-retract": 1, "legs-turn": 0 } }</code>, … <code>{ "t": 262000, "motions": { "legs-turn": 7 } }</code></td></tr>
      <tr><td><code>lights</code></td><td>In un fotogramma chiave: la luminanza, in cd/m², di ciascuna delle luci proprie del suo modello, con il nome del materiale della luce nel file glTF — così che uno stesso corpo porti luci che fanno ciascuna la propria cosa, una bianca fissa a ogni estremità e una rossa che lampeggia fra le due. Il modello dice dove si trova ogni luce, quanto è grande e di che colore; la traccia dice quanto brilla e quando. Ogni luce si interpola fra i fotogrammi chiave che la nominano e si mantiene dopo l'ultimo, quindi un'accensione o uno spegnimento sono due fotogrammi chiave a un millisecondo di distanza; una luce che nessun fotogramma chiave nomina brilla con la sua parte di <code>appearance.luminanceCdM2</code>. Una luce troppo piccola per vedersi si vede dal suo abbagliamento, e ciò che si trova fra essa e l'occhio — lo scafo del corpo stesso, un ponte — la nasconde. La luce rossa di Silly-le-Long: <code>{ "t": 499, "lights": { "front-red": 1500 } }</code>, <code>{ "t": 500, "lights": { "front-red": 0 } }</code></td></tr>
      <tr><td><code>outlineNode</code></td><td>Il nodo del modello che è ciò che l'osservatore ha disegnato (<code>"hull"</code> per un velivolo le cui zampe non sono nel disegno): ciò su cui si misura il suo contorno</td></tr>
      <tr><td><code>smoke</code></td><td>Sull'interpretazione stessa: ciò che fa bruciare al suolo, come <code>{ eastM, northM, fromT, untilT? }</code>, visto dal suo fumo portato via dal vento della registrazione</td></tr>
    </table>
    </div>

    <h2>Il meteo, e le sue nuvole</h2>
    <p>Un fotogramma chiave <code>weather</code> esprime le condizioni del cielo in un momento dell'orologio
      della registrazione; fra due fotogrammi chiave ogni numero viene interpolato, mentre il tipo di precipitazione e il
      temporale vengono mantenuti. Contiene:</p>
    <div class="table-scroll">
    <table>
      <tr><th>Campo</th><th>Significato</th></tr>
      <tr><td><code>cloudLayers</code></td><td>Le nuvole, come elenco di strati — vedi sotto. <strong>Se manca</strong>, le descrivono i campi più vecchi delle righe vicine, adattati in uno strato d'acqua e un velo di cirri; <strong>un elenco vuoto</strong> significa un cielo sereno che qualcuno ha guardato</td></tr>
      <tr><td><code>cloudCover</code>, <code>lowerCloudCover</code>, <code>highCloudCover</code></td><td>Frazioni di cielo (0–1): il totale, solo gli strati d'acqua, e solo il velo ghiacciato. Scritte dalle registrazioni fatte prima che esistessero gli strati, e ancora tenute aggiornate dall'editor come riassunto di questi</td></tr>
      <tr><td><code>cloudBaseM</code>, <code>cloudDarkness</code></td><td>L'unica base della stessa epoca, in metri sopra il suolo di riferimento, e un'unica tonalità (0 bianco, 1 molto scuro)</td></tr>
      <tr><td><code>iceCrystalAlignment</code></td><td>0–1, con quanta regolarità cadevano i cristalli di ghiaccio — ciò che trasforma un semplice anello in pareli, archi e una colonna. Nessun dato lo misura; uno strato di cirri porta il proprio</td></tr>
      <tr><td><code>relativeHumidity</code></td><td>0–1, vicino al suolo. Decide quanto è lattiginoso il cielo sereno: la foschia si gonfia d'acqua man mano che l'aria si avvicina alla saturazione. Un dato consultato la contiene (dalla temperatura e dal punto di rugiada di ERA5); se manca, una foschia tipica</td></tr>
      <tr><td><code>precipitationType</code>, <code>precipitationIntensity</code></td><td>none/rain/snow/hail, e 0–1. Indicata a un fotogramma chiave, riprodotta come cade: un rovescio inizia al fotogramma chiave che lo avvia con le sue prime gocce, e non raggiunge l'intensità indicata più in fretta di una pioggia reale (da niente al massimo in venti secondi); smette allo stesso modo. Un cambiamento che i fotogrammi chiave distribuiscono su un tempo più lungo viene seguito esattamente</td></tr>
      <tr><td><code>windDirectionDeg</code>, <code>windSpeed</code></td><td>Il vento generale: la direzione VERSO cui soffia, in senso orario dal nord, e metri al secondo. È ciò che trasporta le nuvole — dall'istante zero, così che cercare e riprodurre di nuovo diano lo stesso cielo</td></tr>
      <tr><td><code>storm</code></td><td>Fulmini e tuoni, con il giusto ritardo</td></tr>
    </table>
    </div>
    <p>Ogni <strong>strato</strong> di <code>cloudLayers</code> è una coltre di nuvole a un'altezza
      reale, e resta sé stesso da un fotogramma chiave al successivo:</p>
    <div class="table-scroll">
    <table>
      <tr><th>Campo</th><th>Significato</th></tr>
      <tr><td><code>id</code></td><td>Stabile fra i fotogrammi chiave — gli strati vengono abbinati tramite esso, mai per posizione nell'elenco. Uno strato presente in un fotogramma chiave e assente dal successivo svanisce; riordinarli non cambia nulla</td></tr>
      <tr><td><code>type</code></td><td><code>cumulus</code>, <code>stratus</code>, <code>stratocumulus</code>, <code>cirrus</code> o <code>unknown</code>. Decide la forma delle sommità e quanto è sottile il velo; un cirro è anche quello che rifrange gli aloni. Cambia al fotogramma chiave, non viene interpolato</td></tr>
      <tr><td><code>baseM</code>, <code>thicknessM</code></td><td>Metri. La base è sopra il suolo di RIFERIMENTO della registrazione, non sopra un osservatore che sale; un osservatore sopra la base è dentro la coltre o al di sopra, e il cielo viene disegnato di conseguenza</td></tr>
      <tr><td><code>coverage</code></td><td>0–1, e significa ciò che dice: la frazione di cielo che questo strato copre, qualunque sia la dimensione delle sue nuvole</td></tr>
      <tr><td><code>sizeM</code></td><td>La larghezza caratteristica di una nuvola, in metri. Indipendente dalla copertura: la stessa frazione di cielo può essere molte nuvole piccole o poche grandi</td></tr>
      <tr><td><code>density</code></td><td>0–2, quanto è opaca la materia della nuvola; 0 è trasparente. Anch'essa indipendente dalla copertura</td></tr>
      <tr><td><code>darkness</code></td><td>Da 0 bianco a 1 molto scuro. Se manca, il <code>cloudDarkness</code> del fotogramma chiave</td></tr>
      <tr><td><code>seed</code></td><td>Quale motivo, fra gli infiniti che gli stessi numeri possono disegnare. Se manca, uno ricavato dall'id, ed è per questo che l'id non deve cambiare</td></tr>
      <tr><td><code>windDirectionDeg</code>, <code>windSpeed</code></td><td>Il vento proprio di questo strato, quando differisce da quello generale — di solito è il caso dello strato alto. Se manca, il vento generale</td></tr>
      <tr><td><code>iceCrystalAlignment</code></td><td>Solo per un cirro</td></tr>
      <tr><td><code>instances</code></td><td>Nuvole singole all'interno di questo strato — vedi sotto</td></tr>
    </table>
    </div>
    <p>Una <strong>nuvola singola</strong> in <code>instances</code> è una nuvola del suo strato che il
      file colloca con esattezza, perché il resoconto lo ha fatto: quella dietro cui è passato il fenomeno, quella che
      era lì e da nessun'altra parte. Viene disegnata come una delle altre del suo strato — la stessa texture, la stessa
      soglia —, distinta dalle vicine soltanto da dove si trova e da quanto è grande,
      ed è presente anche quando la <code>coverage</code> dello strato è nulla. Segue il vento dello strato
      come le altre, e nasconde un fenomeno davanti al quale passa.</p>
    <div class="table-scroll">
    <table>
      <tr><th>Campo</th><th>Significato</th></tr>
      <tr><td><code>id</code></td><td>Stabile fra i fotogrammi chiave, stessa regola di uno strato</td></tr>
      <tr><td><code>eastM</code>, <code>northM</code></td><td>Dove si trovava il suo centro all'istante zero, in metri dal punto di partenza dell'osservatore. Il vento la trasporta da lì</td></tr>
      <tr><td><code>baseM</code>, <code>thicknessM</code></td><td>La sua base e la sua altezza, in metri — una nuvola può stare più in basso o elevarsi più della sua coltre</td></tr>
      <tr><td><code>widthM</code>, <code>depthM</code>, <code>rotationDeg</code></td><td>La sua impronta, in metri, e la direzione verso cui quell'impronta è ruotata</td></tr>
      <tr><td><code>density</code>, <code>darkness</code></td><td>Le proprie; se manca l'oscurità, quella dello strato</td></tr>
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
    <p>Una registrazione il cui meteo è stato <strong>consultato</strong> (ha un <code>weatherSource</code>)
      contiene la risposta del dato, non un link a esso: ERA5 fornisce le fasce bassa, media e alta come tre
      strati chiamati <code>record-low</code>, <code>record-mid</code> e <code>record-high</code>, la
      base bassa stimata dallo scarto fra temperatura e punto di rugiada, le altre due a 3 500 m
      e 8 000 m. Il loro tipo è <code>unknown</code> (cirro per quello alto), la loro dimensione e la loro
      densità sono ipotesi di disegno: una rianalisi sa quanta parte di ogni fascia era coperta, non che aspetto
      avessero le nuvole. Richiedi il dato dall'editor e gli strati vengono riscritti; modifica
      uno strato a mano e la registrazione diventa dell'autore, con la fonte rimossa.</p>

    <h2>Da dove viene ogni valore</h2>
    <p>Qualsiasi valore di una registrazione può essere scritto così com'è, o avvolto con la sua provenienza:</p>
    <pre data-json="none"><code>"durationSeconds": {
  "value": 15,
  "basis": "derived",
  "rationale": "Da 13 a 18 s nella sintesi dell'inquirente; preso il valore medio"
}</code></pre>
    <p><code>basis</code> è <code>stated</code> (l'ha detto l'osservatore, ed è ciò che significa un valore
      semplice), <code>derived</code> (ricavato da ciò che ha detto più qualcosa di verificabile: la larghezza di una
      strada, una mappa, un disegno misurato; <code>rationale</code> dà il ragionamento) o
      <code>assumed</code> (scelto perché la ricostruzione abbia comunque un valore, senza basarsi su nulla di ciò che
      l'osservatore ha detto). L'elenco dei valori <code>assumed</code> è l'elenco di ciò per cui tornare dall'osservatore
      o al fascicolo, ed è per questo che vale la pena scriverlo anche quando non si scrive nient'altro.</p>

    <h2>Verificare un file</h2>
    <p>Il formato è pubblicato anche come <a href="/sighting.schema.json">JSON Schema</a>,
      generato dagli stessi tipi del lettore: ogni chiave che conosce, ciò che ciascuna può
      contenere, e le parole che accetta un elenco chiuso. Una chiave scritta male o un valore
      sconosciuto non lo superano. Non dice nulla di ciò che si può omettere, che è una questione di senso a cui
      risponde questa pagina. Per vedere il risultato, apri il file nel <a href="/play/">lettore</a>,
      da un link, incollandolo, o dal tuo disco con le immagini e i modelli che nomina. Il lettore
      lo verifica allo stesso modo al caricamento, e indica dietro un ⚠ sull'immagine ciò che non ha potuto riprodurre
      così come è scritto: una chiave che nulla legge, una parola fuori dal suo elenco, e ciò che ha dovuto
      inventare perché il primo fotogramma chiave di una forma lo ometteva (un campo mantenuto dal
      fotogramma chiave precedente è la regola di cui sopra, non un problema).</p>

    <h2>Un file completo</h2>
    <p>La registrazione più piccola che esprima ancora qualcosa — un ovale silenzioso che attraversa il cielo in
      dodici secondi, in una data reale e in un luogo reale. Tutto il resto del formato è facoltativo, e
      tutto ciò che segue ha una funzione:</p>
    <pre data-json=""><code>${this.escape(this.example)}</code></pre>
    <p class="small">Per modificarlo e vederlo riprodotto, incollalo nel <a href="/play/">lettore</a>,
      il cui editor completa ogni chiave del formato, propone le parole che ciascuna accetta, e
      dice ciò che il modello ne dice.</p>
    <p>È <a href="/demo-data/example-minimal.json"><code>/demo-data/example-minimal.json</code></a>
      su questo sito, quindi puoi scaricarlo, e
      <a href="/play/?sighting=/demo-data/example-minimal.json">riprodurlo</a> prima di cambiare
      qualsiasi cosa. Nota che compaiono sia <code>angular</code> sia <code>bounds</code>: l'angolo è ciò che
      il file SIGNIFICA, e i pixel ne vengono ricavati di nuovo al caricamento — scrivi l'angolo, e lascia
      che una stima errata dei pixel venga corretta per te.</p>

    <h2>Altri più grandi da leggere</h2>
    <p>Ogni demo di questo sito è un semplice file che puoi aprire. Questi quattro sono quelli che vale la pena
      leggere per vedere come è costruita una registrazione reale:</p>
    <div class="table-scroll">
    <table>
      <tr><th>File</th><th>Che cosa guardarci</th></tr>
      <tr><td><a href="/demo-data/observer-chiles.json"><code>observer-chiles.json</code></a></td><td>Un caso reale: un osservatore, un id di caso condiviso con una seconda registrazione, dieci fotogrammi chiave, un <code>weatherTrack</code> consultato con il suo <code>weatherSource</code></td></tr>
      <tr><td><a href="/demo-data/sky-test-halos.json"><code>sky-test-halos.json</code></a></td><td>Nessun fenomeno — un cielo preparato da un <code>weatherTrack</code> i cui fotogrammi chiave cambiano l'allineamento dei cristalli, la copertura di cirri e una coltre di cumuli, osservato attraverso un <code>observerTrack</code> che percorre lo spettacolo e poi si ferma</td></tr>
      <tr><td><a href="/demo-data/sky-test-clouds.json"><code>sky-test-clouds.json</code></a></td><td>Tre strati di nuvole con altitudine, spessore, dimensione, densità e vento in metri, che evolvono sulla linea temporale del meteo — e nel primo una voce <code>instances</code>: una nuvola del campo, collocata e dimensionata in metri, che cresce e si scurisce nel corso dei due minuti</td></tr>
      <tr><td><a href="/demo-data/sky-test-aircraft.json"><code>sky-test-aircraft.json</code></a></td><td>Un <code>instrument</code>, un <code>exposureSeconds</code> e un <code>iso</code>, e un aeromobile di <code>decor</code> con una <code>track</code> e nove <code>lights</code> alle loro cadenze di lampeggio reali, fari di atterraggio compresi</td></tr>
      <tr><td><a href="/demo-data/instrument-instamatic.json"><code>instrument-instamatic.json</code></a></td><td>Lo stesso avvistamento di <code>observer-socorro.json</code>, cambiato in un solo campo. Confronta i due</td></tr>
    </table>
    </div>

    <h2>Quattro regole che decidono che cosa significa un file</h2>
    <ul class="plain">
      <li><strong>I campi discreti vengono mantenuti, quelli continui interpolati.</strong> Una forma omessa in
        un fotogramma chiave successivo resta com'era, e così qualsiasi campo che un fotogramma chiave omette in una forma
        che invece indica di nuovo: un fotogramma chiave che dà solo un nuovo <code>aim</code> sposta la forma e mantiene
        tutto il resto (indicare di nuovo <code>bounds</code> senza <code>aim</code> né
        <code>angular</code> viene inteso come spostarla tramite i suoi pixel); una il cui primo fotogramma chiave è a cinque secondi è già
        dipinta, in quello stato, da zero. Per fare in modo che qualcosa smetta di essere visibile, dagli un fotogramma chiave con
        <code>transparency: 1</code>.</li>
      <li><strong>Solo angoli.</strong> Nessuna dimensione reale e nessuna distanza reale sono memorizzate da nessuna parte. I metri
        vengono ricavati, come disuguaglianze, da ciò dietro o davanti a cui si è detto che il fenomeno passava
        (<code>decor[].occludesSourceIds</code>).</li>
      <li><strong>Il dichiarato prevale sul dedotto.</strong> <code>occludesSourceIds</code> registra affermazioni dell'osservatore. Niente in questo formato
        <em>può</em> dedurle: descrive un aspetto in un campo visivo, non una posizione nello
        spazio.</li>
      <li><strong>Assente non è zero.</strong> Nessuna traccia sonora significa che nessuno l'ha chiesto;
        <code>kind: "none"</code> significa che l'osservatore ha riferito di non aver sentito nulla. La stessa distinzione
        attraversa il meteo e la nube di ghiaccio.</li>
    </ul>
    <p class="small">Questa pagina è il riferimento del formato. Il ragionamento dietro ogni campo si trova nei
      commenti di documentazione del suo tipo, con cui si completano gli estratti qui sopra, e nel
      <a href="https://github.com/RR0/UfoAtHome">codice sorgente</a>.</p>
  </div>
</section>
`
  }
}
