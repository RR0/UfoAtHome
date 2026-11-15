import { DocsSection } from "./DocsSection.js"
import { FormatVersion } from "../../src/engine/persistence/FormatVersion.js"
import { tagNames_fr } from "../../src/component/messages/TagNames_fr.js"
import type { PageMeta, Said, SiteLanguage } from "../SitePage.js"
import { DocsFormatContextPage } from "./DocsFormatContextPage.js"
import { DocsFormatReadingsPage } from "./DocsFormatReadingsPage.js"
import { DocsFormatComponentsPage } from "./DocsFormatComponentsPage.js"
import { DocsFormatSourcesPage } from "./DocsFormatSourcesPage.js"

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
    navLabel: { en: "Observations", fr: "Les observations", es: "Las observaciones", it: "Le osservazioni" },
    title: { en: "Observations", fr: "Les observations", es: "Las observaciones", it: "Le osservazioni" },
    description: {
      en: "What an observation is, then what its file holds, field by field: what was seen, the case that lists several "
        + "witnesses, where each value comes from, and a whole working example to type in; the rest on the pages under it.",
      fr: "Ce qu'est une observation, puis ce que contient son fichier, champ par champ : ce qui a été vu, le dossier qui "
        + "liste plusieurs témoins, d'où vient chaque valeur, et un exemple entier à taper ; la suite sur les pages qui en dépendent.",
      es: "Qué es una observación, y luego lo que contiene su archivo, campo por campo: lo que se vio, el caso que reúne a "
        + "varios testigos, de dónde viene cada valor, y un ejemplo completo para escribir; el resto en las páginas que dependen de ella.",
      it: "Che cos'è un'osservazione, poi che cosa contiene il suo file, campo per campo: ciò che è stato visto, il caso che "
        + "elenca più testimoni, da dove viene ogni valore, e un esempio completo da digitare; il resto nelle pagine che ne dipendono."
    },
    asideFromNav: true
  }

  private readonly lede: Said<string> = {
    en: "An observation is <em>what one witness reports of what they saw</em>: when, where, what it looked like, how it moved, and what the sky and the weather were. It is the event UFO@home <em>replays</em>. A <a href=\"/docs/case/\">case</a> holds at least one, and may hold others: other witnesses of the same event, each with their own account, and <a href=\"/docs/format/readings/#another-reading-an-interpretation-is-another-sighting\">alternative explanations</a>, which are observations too. An observation can be referred to by <a href=\"/docs/interview/\">an interview</a> held with the witness, and refer back to it.",
    fr: "Une observation est <em>ce qu'un témoin rapporte de ce qu'il a vu</em> : quand, où, à quoi cela ressemblait, comment cela bougeait, et ce qu'étaient le ciel et la météo. C'est l'événement qu'UFO@home <em>rejoue</em>. Un <a href=\"/docs/case/\">dossier</a> en contient au moins une, et peut en contenir d'autres : d'autres témoins du même événement, chacun avec son propre compte rendu, et des <a href=\"/docs/format/readings/#another-reading-an-interpretation-is-another-sighting\">explications alternatives</a>, qui sont aussi des observations. Une observation peut être désignée par <a href=\"/docs/interview/\">une interview</a> menée avec le témoin, et y renvoyer en retour.",
    es: "Una observación es <em>lo que un testigo relata de lo que vio</em>: cuándo, dónde, qué aspecto tenía, cómo se movía y cómo estaban el cielo y el tiempo. Es el evento que UFO@home <em>reproduce</em>. Un <a href=\"/docs/case/\">caso</a> contiene al menos una, y puede contener otras: otros testigos del mismo suceso, cada uno con su propio relato, y <a href=\"/docs/format/readings/#another-reading-an-interpretation-is-another-sighting\">explicaciones alternativas</a>, que también son observaciones. Una observación puede ser designada por <a href=\"/docs/interview/\">una entrevista</a> mantenida con el testigo, y remitir a ella a su vez.",
    it: "Un'osservazione è <em>ciò che un testimone riferisce di ciò che ha visto</em>: quando, dove, che aspetto aveva, come si muoveva e com'erano il cielo e il tempo. È l'evento che UFO@home <em>riproduce</em>. Un <a href=\"/docs/case/\">caso</a> ne contiene almeno una e può contenerne altre: altri testimoni dello stesso fatto, ciascuno con il proprio resoconto, e <a href=\"/docs/format/readings/#another-reading-an-interpretation-is-another-sighting\">spiegazioni alternative</a>, che sono anch'esse osservazioni. Un'osservazione può essere designata da <a href=\"/docs/interview/\">un'intervista</a> condotta con il testimone, e rimandarvi a sua volta."
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
   * Where each section that used to be on this page now is. The page held the whole technical side of an observation, components and sources
   * included, some 200 kB that a reader could only scroll through; what was the bulk of it now has pages of its own under this one (see
   * DocsFormatContextPage, DocsFormatReadingsPage, DocsFormatComponentsPage, DocsFormatSourcesPage).
   *
   * A link to a section is its anchor, and the anchor never reaches the server, so no redirect rule can follow it: a link made before, shared
   * or saved, is sent on from here (see `script`). A section that became a whole page is sent to that page's top.
   */
  static readonly MOVED: ReadonlyArray<readonly [string, string]> = [
    ["everything-around-it", "/docs/format/context/#everything-around-it"],
    ["what-it-was-interpretations", "/docs/format/readings/#what-it-was-interpretations"],
    ["events-of-the-sky", "/docs/format/context/#events-of-the-sky"],
    ["another-reading-an-interpretation-is-another-sighting", "/docs/format/readings/#another-reading-an-interpretation-is-another-sighting"],
    ["the-weather-and-its-clouds", "/docs/format/context/#the-weather-and-its-clouds"],
    ["components", "/docs/format/components/"],
    ["standard-and-that-is-the-whole-design", "/docs/format/components/#standard-and-that-is-the-whole-design"],
    ["what-each-one-is-for", "/docs/format/components/#what-each-one-is-for"],
    ["how-they-fit-together", "/docs/format/components/#how-they-fit-together"],
    ["which-one-you-want", "/docs/format/components/#which-one-you-want"],
    ["putting-one-in-your-application", "/docs/format/components/#putting-one-in-your-application"],
    ["language", "/docs/format/components/#language"],
    ["rr0-sighting", "/docs/format/components/#rr0-sighting"],
    ["rr0-scene", "/docs/format/components/#rr0-scene"],
    ["rr0-sighting-editor", "/docs/format/components/#rr0-sighting-editor"],
    ["sources-and-choices", "/docs/format/sources/"],
    ["the-principles", "/docs/format/sources/#the-principles"],
    ["sky", "/docs/format/sources/#sky"],
    ["air", "/docs/format/sources/#air"],
    ["satellites", "/docs/format/sources/#satellites"],
    ["aircraft", "/docs/format/sources/#aircraft"],
    ["weather", "/docs/format/sources/#weather"],
    ["ground", "/docs/format/sources/#ground"],
    ["place-time", "/docs/format/sources/#place-time"],
    ["decor", "/docs/format/sources/#decor"]
  ]

  /** The pages under this one, where the technical side goes on: one line each, so that a reader knows what is there before going. */
  private further(language: SiteLanguage): string {
    const heading: Said<string> = { en: "Further on", fr: "Plus loin", es: "Más adelante", it: "Più avanti" }
    const pages: ReadonlyArray<readonly [string, Said<string>, Said<string>]> = [
      ["/docs/format/context/", DocsFormatContextPage.TITLE, {
        en: "the witness's movements and what they did, the instrument, the sound, the decor and the vehicles, what happened in the sky, and the weather with its clouds.",
        fr: "les déplacements du témoin et ce qu'il a fait, l'instrument, le son, le décor et les véhicules, ce qui s'est passé dans le ciel, et la météo avec ses nuages.",
        es: "los desplazamientos del testigo y lo que hizo, el instrumento, el sonido, el decorado y los vehículos, lo que ocurrió en el cielo, y el tiempo con sus nubes.",
        it: "gli spostamenti del testimone e ciò che ha fatto, lo strumento, il suono, lo scenario e i veicoli, ciò che è accaduto nel cielo, e il meteo con le sue nuvole."
      }],
      ["/docs/format/readings/", DocsFormatReadingsPage.TITLE, {
        en: "what the phenomenon may have been, stood in the scene and tested against the account, and why another reading is another observation.",
        fr: "ce que le phénomène a pu être, placé dans la scène et mis à l'épreuve du compte rendu, et pourquoi une autre lecture est une autre observation.",
        es: "lo que pudo ser el fenómeno, situado en la escena y puesto a prueba frente al relato, y por qué otra lectura es otra observación.",
        it: "ciò che il fenomeno può essere stato, collocato nella scena e messo alla prova del resoconto, e perché un'altra lettura è un'altra osservazione."
      }],
      ["/docs/format/components/", DocsFormatComponentsPage.TITLE, {
        en: "the scene, the player and the editor that put an observation on a page, and how to load them.",
        fr: "la scène, le lecteur et l'éditeur qui mettent une observation dans une page, et comment les charger.",
        es: "la escena, el reproductor y el editor que ponen una observación en una página, y cómo cargarlos.",
        it: "la scena, il lettore e l'editor che mettono un'osservazione in una pagina, e come caricarli."
      }],
      ["/docs/format/sources/", DocsFormatSourcesPage.TITLE, {
        en: "where what the scene shows comes from (sky, air, satellites, aircraft, weather, ground, decor) and the choices made with each.",
        fr: "d'où vient ce que la scène montre (ciel, air, satellites, avions, météo, sol, décor) et les choix faits avec chacun.",
        es: "de dónde viene lo que muestra la escena (cielo, aire, satélites, aviones, tiempo, suelo, decorado) y las decisiones tomadas con cada uno.",
        it: "da dove viene ciò che la scena mostra (cielo, aria, satelliti, aerei, meteo, suolo, scenario) e le scelte fatte con ciascuno."
      }]
    ]
    // French puts a space before the colon, the others do not.
    const colon = language === "fr" ? " :" : ":"
    return `<h2>${heading[language]}</h2>
    <ul>
${pages.map(([href, title, what]) => `      <li><a href="${href}"><strong>${title[language]}</strong></a>${colon} ${what[language]}</li>`).join("\n")}
    </ul>
`
  }

  script(): string {
    return `// A link to a section that has moved to a page of its own goes on to it (see DocsFormatPage.MOVED).
const moved = new Map(${JSON.stringify(DocsFormatPage.MOVED)})
const movedTo = moved.get(decodeURIComponent(location.hash.substring(1)))
if (movedTo) {
  location.replace(movedTo)
}
` + this.excerptsScript()
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
    <h2>Technical part: the observation file</h2>
    <p>What follows is for whoever writes these files by hand, generates them or reads them in code. In the editor none of it has to be known.</p>
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
      <tr><td><code>version</code></td><td>The version of the format: <code>4</code> (see Versions of the format)</td></tr>
      <tr><td><code>id</code></td><td>Which account this is, unique across every recording anywhere: the day, then who saw it (<code>"1964-04-24-ZamoraLonnie"</code>), or where for an anonymous witness (<code>"1964-04-24-Socorro"</code>). What a case names it by is not this id but its event's own (see below).</td></tr>
      <tr><td><code>time</code>, <code>endTime</code></td><td>The date as written in <a href="https://www.loc.gov/standards/datetime/">EDTF</a>, in the legal time of <code>utcOffsetHours</code>, as RR0's events write it: <code>"1964-04-24T17:50"</code>, <code>"1954"</code>, <code>"1948-07-24T02:45~"</code> (approximate), <code>"2025-06?"</code> (uncertain), <code>"1965-07-01%"</code> (both), <code>"19XX"</code> (a masked year), <code>"2022-21"</code> (the spring of 2022), or <code>"05:00"</code> alone for a time of day remembered without its date. Each part is optional from the right, which is how the format states “1954” or “around 05:00”. It is a subset of EDTF (level 0, these qualifiers on the whole date, masked years, seasons); <a href="https://www.npmjs.com/package/@rr0/time"><code>@rr0/time</code></a> is RR0's full EDTF model, into which UFO@home's own tooling converts a recording's dates</td></tr>
      <tr><td><code>durationSeconds</code></td><td>An alternative to <code>endTime</code>, and it wins if both are given</td></tr>
      <tr><td><code>durationText</code></td><td>The length as it was stated when it was not exact: an ISO 8601 duration with a doubt (<code>PT10M~</code>) or a range (<code>PT5M/PT10M</code>). <code>durationSeconds</code> is then the one length played at, chosen from it</td></tr>
      <tr><td><code>utcOffsetHours</code></td><td>The LEGAL time the witness's clock was on (+1 for France in 1965). Absent means it is approximated from the longitude, which cannot know legal time or a daylight-saving switch</td></tr>
      <tr><td><code>timeZone</code></td><td>The IANA zone the offset was derived from (<code>"Europe/Paris"</code>): the rule, where <code>utcOffsetHours</code> is the number it gave at that date. Only the number is read to place the sky; the zone is what lets the offset be derived again when the date changes</td></tr>
      <tr><td><code>place</code></td><td>Where it happened, as RR0's events write a place (<a href="https://www.npmjs.com/package/@rr0/place"><code>@rr0/place</code></a>'s <code>PlaceJson</code>): <code>{ name, locations: [{ lat, lng }] }</code>, <code>name</code> being the fully qualified place name the coordinates were resolved from</td></tr>
      <tr><td><code>observer</code></td><td><code>{ id, title, lastName, firstNames }</code>, all optional; omit entirely for an anonymous witness. <code>id</code> is a reference to the person (on RR0, their directory: <code>"ZamoraLonnie"</code>); the other fields describe them when nobody has given them one</td></tr>
      <tr><td><code>description</code></td><td>The account in prose — one string, or one per language (see below)</td></tr>
      <tr><td><code>image</code>, <code>summary</code>, <code>summaryTime</code></td><td>What stands for the observation where it is only linked to and never played: the card a shared link shows (see <a href="/docs/share/">Sharing</a>). <code>image</code> is a picture, an address (absolute, relative to the file, or an RR0 path from the site root); <code>summary</code> a sentence or two, one string or one per language. Absent, the card shows the logo and says who saw it, in which case and when, as far as the file tells. <code>summaryTime</code> is the second of the recording at which the picture of the card is photographed (0 by default: the first image), for a recording whose first image does not show the phenomenon; only the project's capture tool reads it, never the player</td></tr>
      <tr><td><code>tags</code></td><td>A list of strings, written in English: they are technical terms, and two recordings that share one have to match on it. Each reader is shown them in their own language where a translation is known, which is the case today for ${this.tags()}. The list is not closed: anything else is shown as written, and classification codes (<code>"RR3"</code>, <code>"NL"</code>) or case references (<code>"Blue Book 8729"</code>) are written as they are. One changes the replay: <code>paralysis</code> keeps the witness's view still</td></tr>
      <tr><td><code>account</code></td><td>Who saw it and how the account travelled: <code>observerAgeYears</code> (at the time), <code>observerBirth</code> (birth date, kept in step with it), <code>observerPerception</code> (colour vision, alcohol, fatigue: only what differs from a typical witness), <code>observerOccupation</code>, <code>source</code> (how it reached whoever wrote the recording: <code>on-site</code>, <code>interview</code>, <code>telephone</code>, <code>questionnaire</code>, <code>letter</code>, <code>social-media</code>, <code>press</code>) and <code>followedUp</code> (whether the witness was gone back to afterwards), and for the evaluation methods (see <a href="https://rr0.org/science/crypto/ufo/enquete/methode/Ballester-Guasp.html">Ballester-Guasp</a>): <code>observerOccupationKind</code> (<code>student</code>, <code>worker</code>, <code>farmer</code>, <code>homemaker</code>, <code>merchant</code>, <code>business</code>, <code>employee</code>, <code>artist</code>, <code>technician</code>, <code>police</code>, <code>pilot</code>, <code>military</code>), <code>observerGraduate</code>, <code>enquiryMinutes</code> (time the investigator spent with the witness), <code>observersRelation</code> (<code>friends</code>, <code>family</code>, <code>professional</code>, <code>none</code>), <code>activity</code> (<code>leisure</code>, <code>travelling</code>, <code>cultural</code>, <code>working</code>) and <code>strangeness</code> (each of the seven factors the investigators judged, true or false: <code>appearance</code>, <code>movement</code>, <code>incongruity</code>, <code>detection</code>, <code>close</code>, <code>beings</code>, <code>traces</code>)</td></tr>
      <tr><td><code>sources</code></td><td>Where the account can be read as it was given, in the shape of an <a href="https://www.npmjs.com/package/@rr0/data">RR0 source</a>: <code>[{ type, title, authors, url, publication: { publisher, time }, index }]</code>, <code>type</code> being <code>book</code> or <code>article</code>, or nothing for a web page or a post, which is then simply its <code>url</code>. Shown in the player's <q>?</q> panel, linked when it has an address; copied unchanged into an RR0 case</td></tr>
      <tr><td><code>milestones</code></td><td>The named moments of the account, shown on the seek bar: <code>[{ t, label, note }]</code>, <code>label</code> being the letter or number the account itself uses (<code>"A"</code>, <code>"B"</code>) or a couple of words, <code>note</code> what happened then, in the account's words where possible (one string, or one per language)</td></tr>
      <tr><td><code>roads</code></td><td>The roads or paths the account's own plan draws, when the map does not have them: <code>[{ id, title, surface, widthM, path, source }]</code>, <code>surface</code> being <code>paved</code>, <code>gravel</code> or <code>dirt</code>, <code>path</code> the centre line as <code>[{ eastM, northM }]</code> from the witness's place at the start, and <code>source</code> the plan or survey it was read off</td></tr>
    </table>
    </div>

    <h2 id="several-observers-the-case">Several witnesses: the case</h2>
    <p>Each witness has a recording of their own, and a recording does not say which case it
      belongs to: an account stands on its own. What shows them together is the
      <strong>case</strong>, which names them: the
      <code>case.json</code> of an <a href="https://rr0.org">RR0</a> dossier, which states the case's
      title, date and classification, and lists everything that happened in it as
      <code>events</code>. Its events of type <code>sighting</code> are its accounts, each pointing
      at one witness's recording:</p>
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
      <tr><td><code>events</code></td><td>The case's chronology. Only the <code>sighting</code> ones are replayed, each by its <code>url</code>, read relative to the case file's own address (so the same case works from its dossier's page and from anywhere else); the ones marked <code>interpretationOf</code> are readings of one of them (see below); the others (an article, a film, a confession) are RR0's An event bears an <code>id</code> when a reading names it, and only then: it belongs to the case, so it has to be unique among the case's events and nowhere else, and a reference is read in the file that writes it. An <code>interpretationOf</code> that no event bears is read, as it used to be, as the <code>id</code> a recording the case lists states; one that matches neither is a fault of the case, which the player reports on its console, the editor above its recordings, and the skill's <code>validate.py</code> when it is given the case file.</td></tr>
      <tr><td><code>image</code>, <code>summary</code></td><td>What a shared link to the case shows, as for a recording (see <a href="/docs/share/">Sharing</a>): a picture, and a sentence or two, one string or one per language</td></tr>
    </table>
    </div>
    <p>Give it to <code>&lt;rr0-sighting src&gt;</code> or to the player, and each witness can be
      picked from a list. One recording can be given directly, with no case, but a case with one
      sighting works the same way and names what it shows. Try it with
      <a href="/demo-data/case-chiles-whitted.json"><code>case-chiles-whitted.json</code></a>
      (<a href="/play/?file=/demo-data/case-chiles-whitted.json">play it</a>).</p>

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
      than an empty field: a missing translation must never turn something the witness said into
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
      share one timeline (the phenomenon, a trailing flame, a second light) — and a <code>shape</code>. <code>timeline.span</code>
      states how long the observation lasts, in milliseconds, when it outlasts the last keyframe: a phenomenon that leaves the
      picture before the film ends. Without it the timeline is taken to end with its last keyframe and is stretched over the
      observation's declared length, so everything the recording places moves slower than the film it is laid over.</p>
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
      <tr><td><code>kind</code></td><td><code>oval</code>, or <code>polygon</code>, which then also takes <code>points</code>: <code>[{ x, y }]</code> in pixels from the top-left corner of <code>bounds</code>, spanning its width and height, so that the outline is stretched with it when the angle resizes the box. When <code>bounds</code> is left out (the usual case: it is derived from <code>aim</code> and <code>angular</code>), write <code>points</code> as FRACTIONS of the box, 0 to 1, not pixels</td></tr>
      <tr><td><code>title</code></td><td>Its name, shown when the pointer is over it; one string, or one per language</td></tr>
      <tr><td><code>color</code></td><td>Any CSS colour</td></tr>
      <tr><td><code>angle</code></td><td>Its tilt, in radians about its own centre, positive clockwise on screen</td></tr>
      <tr><td><code>transparency</code></td><td>0 opaque to 1 invisible</td></tr>
      <tr><td><code>haloScale</code></td><td>The glow around it; 0 is none</td></tr>
      <tr><td><code>brightness</code></td><td>How dazzling: a veil, aperture spikes, a core clipped to white</td></tr>
      <tr><td><code>blur</code></td><td>How indistinct the witness said the edges looked</td></tr>
      <tr><td><code>angular</code></td><td>Its apparent size in degrees — see below</td></tr>
      <tr><td><code>aim</code></td><td>Where it was in the witness's sky: the direction of its centre, <code>azimuthDeg</code> clockwise from true north and <code>altitudeDeg</code> above the horizon. Not the way the witness was facing, which is the pose's <code>headingDeg</code> and <code>pitchDeg</code> — see below</td></tr>
    </table>
    </div>
    <p><strong><code>aim</code> places it, <code>angular</code> sizes it.</strong> <code>bounds</code>
      is those two projected onto the fixed 640×360 canvas at the pose's own heading and field of
      view, through the recording's own instrument; it is re-derived on load, so a file survives a
      change of canvas, of field of view, of instrument, or of where the witness was looking. If the
      pixels and the angles ever disagree, the angles win: moving <code>bounds</code> in a file does
      nothing while <code>aim</code> is there. A file written by hand can leave <code>bounds</code>
      out entirely.</p>
    <p><code>timeline.order</code> is the back-to-front paint order, <code>timeline.groups</code> the
      groups of shapes, <code>{ id, title, members }</code>: a member is a shape's <code>sourceId</code> or another group's
      <code>id</code>, so that a group may hold groups (a phenomenon and the lights of it that blink together); a shape or a group
      is in one group at most, and a group has 2 members at least. Both optional.</p>

    ${this.further("en")}

    <h2>Where each value comes from</h2>
    <p>Any value in a recording can be written bare, or wrapped with where it came from:</p>
    <pre data-json=""><code>{
  "durationSeconds": {
    "value": 15,
    "basis": "derived",
    "rationale": "13 to 18 s in the investigator's synthesis; the middle taken"
  }
}</code></pre>
    <p><code>basis</code> is, strongest first, <code>established</code> (settled away from the
      account and away from the reconstruction: a document, a register, a survey, a third party's
      measurement; <code>rationale</code> names the source), <code>measured</code> (read off an
      instrument or a gauge), <code>stated</code> (the witness said it, and what a bare value
      means), <code>derived</code> (worked out from what they said plus something checkable: a
      road's width, a map, a measured drawing; <code>rationale</code> gives the working),
      <code>assumed</code> (chosen so the reconstruction has a value at all, on nothing the witness
      said) or <code>fitted</code> (moved, within what is known, to see whether a hypothesis can be
      made to fit; <code>rationale</code> says which one). The list of <code>assumed</code> values is
      the list of what to go back to the witness or the file for, which is why it is worth writing
      even when nothing else is. <code>rationale</code> is a string, or one per language as a title is
      (<code>{ "fr": "…", "en": "…" }</code>): a report on the case is read in its reader's language.</p>
    <p><code>source</code> names what the value rests on, which a basis does not: a basis says what
      KIND of thing it is, this says WHICH thing — the thing somebody would go and look at. One at a
      time: <code>said</code> (<code>{ interview, segment, range }</code>, the passage of an
      interview of the case it was said in, <code>interview</code> being that event's <code>id</code>
      and <code>segment</code> which turn of speech), <code>document</code> with <code>at</code> (a
      page, a question's number) and <code>url</code>, <code>picture</code> (the <code>id</code> of a
      picture of the recording it was measured on) or <code>tool</code> (SVH, IPACO, QGIS, a
      theodolite). A working hypothesis names none, which is what <code>assumed</code> and
      <code>fitted</code> already say, and giving it one would be the one lie the field exists to
      prevent.</p>
    <p>A <code>said</code> source is also the whole history of what the witness said. A witness gone
      back to corrects some things and leaves the rest standing, so a value corrected cites the LATER
      interview while one nobody revisited goes on citing the FIRST: which interview each value cites
      <em>is</em> the record of what changed and what did not, and no version of the reconstruction
      has to be kept to show it. Which interview is the later one is the case's to say, from the
      dates of its interview events.</p>
    <p>In the editor it is written in the window of the value's own basis pill: what it rests on,
      then the fields of that kind. The passages offered are the interviews of the case, so a
      recording opened on its own offers none; the pictures offered are the recording's own. A free
      basis offers no fields at all.</p>
    <p>The two ends of that list are what keeps a likeness from passing for a proof. Only what is
      <code>established</code> owes nothing to the account and nothing to the reconstruction, which
      is what makes it worth judging a reconstruction against. A <code>fitted</code> value is the
      opposite: the more of them a reconstruction holds, the easier a likeness is to obtain, so
      nothing is ever tested against one. Moving it is no contradiction and agreeing with it is no
      finding: it was put there to be moved.</p>
    <p><code>range</code> says how far what is known lets a value be, when that is more than the value: a number's least and greatest
      (<code>[50, 52]</code>), or a time's EDTF interval (<code>"1976-06/1976-07"</code>). The value is the one chosen within it to draw the
      scene. A reading of the observation may move it anywhere within its range, and contradicts what is known beyond it; a stated or
      derived value with no range is what is known, an assumed one with none is free.</p>

    <h2>Checking a file</h2>
    <p>The format is also published as a <a href="${new URL(FormatVersion.schemaUrl("sighting")).pathname}">JSON Schema</a>,
      generated from the same types as the player: every key it knows, what each may hold, and the
      words a closed list accepts. A misspelt key or an unknown value fails it. It says nothing
      about what may be left out, which is a question of meaning this page answers. To see the
      result, open the file in <a href="/play/">the player</a>, from a link, or
      from your disk with the pictures and models it names. The player checks it the same way on
      loading, and says what it could not play as written behind a ⚠ over the picture: a key
      nothing reads, a word outside its list, and what it had to make up because a shape's first
      keyframe left it out (a field held from the keyframe before is the rule above, not a
      problem).</p>

    <h3>Versions of the format</h3>
    <p>A file states the version of its format in <code>version</code>: <code>4</code> since 2026-11. It is the version of the FORMAT, not of UFO@home: adding a field does not change
      it, since a player ignores what it does not know. It changes only the day a field changes meaning or shape.</p>
    <p>A player reads ONE version and refuses any other, newer or older, with a message saying so, rather than playing
      something the file does not say. Older versions are not converted as a file is read: a file written in one is brought
      forward by a tool, <code>scripts/migrate-recordings.ts</code>, outside the player, and a file shared under an older
      version goes on playing because a share pins the UFO@home that reads it (see Sharing).</p>
    <p>What each version changed, which is what that tool knows. Version 2 writes <code>time</code> and
      <code>endTime</code> as EDTF text instead of the fields of a date (<code>{ "year": 1964, "month": 4, … }</code>), and
      <code>place</code> as one place instead of a list of locations each with its own name, so that a recording and an event
      of RR0 say “when” and “where” alike. Version 3 says whom every event is about by an id (<code>who</code>, see the events
      above), and writes a group of shapes as <code>{ id, members }</code> instead of the list of its members; the shapes a
      <code>blink</code> listed in its <code>parts</code> become a group of their own. Version 4 calls <code>snapshots</code> what version 3 called <code>frozen</code>, since what it holds is a copy of what the sources answered, not the original frozen somewhere.</p>
    <p>Each version has its own schema, at an address that names it:
      <code>https://ufoathome.org/schema/4/sighting.schema.json</code> (and
      <code>case.schema.json</code>, <code>interview.schema.json</code> beside it).
      <code>/sighting.schema.json</code> is always the current version. A file may name the one it
      was written against in <code>"$schema"</code>, which editors such as VS Code use to check it
      as it is typed; the player does not read it.</p>

    <h2>A whole file</h2>
    <p>The smallest recording that still states something — one silent oval crossing the sky over
      twelve seconds, on a real date at a real place. Everything else in the format is optional, and
      everything below is doing work:</p>
    <pre data-json=""><code>${this.escape(this.example)}</code></pre>
    <p class="small">To change it and see it play, paste it into <a href="/edit/">the editor</a>,
      which completes on every key the format has, offers the words each one accepts, and
      says what the model says about it.</p>
    <p>It is <a href="/demo-data/example-minimal.json"><code>/demo-data/example-minimal.json</code></a>
      on this site, so you can fetch it, and
      <a href="/play/?file=/demo-data/example-minimal.json">play it</a> before changing
      anything. Note that <code>angular</code> and <code>bounds</code> both appear: the angle is what
      the file MEANS, and the pixels are re-derived from it on load — write the angle, and let a
      wrong guess at the pixels be corrected for you.</p>

    <h2>Larger ones to read</h2>
    <p>Every demo on this site is a plain file you can open. These four are the ones worth reading
      to see how a real recording is put together:</p>
    <div class="table-scroll">
    <table>
      <tr><th>File</th><th>What to look at in it</th></tr>
      <tr><td><a href="/demo-data/observer-chiles.json"><code>observer-chiles.json</code></a></td><td>A real case: a witness, a case id shared with a second recording, ten keyframes, a looked-up <code>weatherTrack</code> with its <code>weatherSource</code></td></tr>
      <tr><td><a href="/demo-data/sky-test-halos.json"><code>sky-test-halos.json</code></a></td><td>No phenomenon at all: a sky set once (a single <code>weatherTrack</code> keyframe, a cirrostratus veil and its crystals' alignment), photographed through an <code>instrument</code>, a phone, whose <code>observerTrack</code> pans, tilts, rolls and zooms, and moves the lens's ghosts with it</td></tr>
      <tr><td><a href="/demo-data/sky-test-clouds.json"><code>sky-test-clouds.json</code></a></td><td>Three cloud layers with metre-based altitude, thickness, size, density and wind, evolving on the weather timeline — and in the first one an <code>instances</code> entry: one cloud of the field, placed and sized in metres, that grows and darkens over the two minutes</td></tr>
      <tr><td><a href="/demo-data/sky-test-aircraft.json"><code>sky-test-aircraft.json</code></a></td><td>An <code>instrument</code>, an <code>exposureSeconds</code> and an <code>iso</code>, and a <code>decor</code> aircraft with a <code>track</code> and nine <code>lights</code> at their real flash rates, landing lights included</td></tr>
      <tr><td><a href="/demo-data/sky-test-reentry.json"><code>sky-test-reentry.json</code></a></td><td>No phenomenon: <code>skyEvents</code> holding one of <code>reentries</code>, the launcher of Zond 4 breaking up over Kentucky in 1968, its path derived and its timing, heights and brightness assumed, each value with its provenance</td></tr>
      <tr><td><a href="/demo-data/observer-csg2-falcon.json"><code>observer-csg2-falcon.json</code></a></td><td>Ron Lee's account (SeeSat-L) of the upper stage that launched CSG-2 (Falcon 9, 31 January 2022), seen from Falcon, Colorado, braking out of orbit and venting its tanks while it spun: <code>skyEvents</code> holding one of <code>launches</code> with <code>jets</code>, the orbit from CSG-2's own Space-Track elements, the burn, the vents and the spin assumed with their provenance; one of the three views of <a href="/demo-data/case-csg2.json"><code>case-csg2.json</code></a>, the others its ascent from Nassau and its end from Oklahoma City, witnesses assumed</td></tr>
      <tr><td><a href="/demo-data/sky-test-laser-meudon.json"><code>sky-test-laser-meudon.json</code></a></td><td>No phenomenon: <code>skyEvents</code> holding one of <code>beams</code>, the 10 W green laser the Paris Observatory shot from its dome of Meudon to its dome of Paris on 9 October 2026, seen from the park at Meudon, the emitter's height and the spread assumed with their provenance and the light computed</td></tr>
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
      <li><strong>Declared outranks deduced.</strong> <code>occludesSourceIds</code> records statements by the witness. Nothing in this format
        <em>can</em> deduce them: it describes an appearance on a field of view, not a position in
        space.</li>
      <li><strong>Absent is not zero.</strong> No sound track means nobody was asked;
        <code>kind: "none"</code> means the witness reported hearing nothing. The same distinction
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
    <h2>Partie technique : le fichier d'observation</h2>
    <p>Ce qui suit est pour qui écrit ces fichiers à la main, les génère ou les lit en code. Dans l'éditeur, rien de cela n'a besoin d'être connu.</p>
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
      <tr><td><code>version</code></td><td>La version du format : <code>4</code> (voir Versions du format)</td></tr>
      <tr><td><code>id</code></td><td>Quel compte rendu c'est, unique parmi tous les enregistrements : le jour, puis qui l'a vu (<code>"1964-04-24-ZamoraLonnie"</code>), ou le lieu pour un témoin anonyme (<code>"1964-04-24-Socorro"</code>). Ce par quoi un dossier le désigne n'est pas cet id mais celui de son événement (voir plus bas).</td></tr>
      <tr><td><code>time</code>, <code>endTime</code></td><td>La date écrite en <a href="https://www.loc.gov/standards/datetime/">EDTF</a>, à l'heure légale de <code>utcOffsetHours</code>, comme l'écrivent les événements de RR0 : <code>"1964-04-24T17:50"</code>, <code>"1954"</code>, <code>"1948-07-24T02:45~"</code> (approximative), <code>"2025-06?"</code> (incertaine), <code>"1965-07-01%"</code> (les deux), <code>"19XX"</code> (une année masquée), <code>"2022-21"</code> (le printemps 2022), ou <code>"05:00"</code> seul pour une heure dont on a oublié la date. Chaque partie est facultative en partant de la droite : c'est ainsi que le format énonce « 1954 » ou « vers 05:00 ». C'est un sous-ensemble d'EDTF (niveau 0, ces qualificatifs sur la date entière, années masquées, saisons) ; <a href="https://www.npmjs.com/package/@rr0/time"><code>@rr0/time</code></a> est le modèle EDTF complet de RR0, dans lequel l'outillage d'UFO@home convertit les dates d'un enregistrement</td></tr>
      <tr><td><code>durationSeconds</code></td><td>Une alternative à <code>endTime</code>, et c'est elle qui l'emporte si les deux sont là</td></tr>
      <tr><td><code>durationText</code></td><td>La durée telle qu'elle a été énoncée quand elle n'était pas exacte : une durée ISO 8601 avec un doute (<code>PT10M~</code>) ou une plage (<code>PT5M/PT10M</code>). <code>durationSeconds</code> est alors l'unique durée à laquelle on joue, choisie à partir d'elle</td></tr>
      <tr><td><code>utcOffsetHours</code></td><td>L'heure LÉGALE de la montre du témoin (+1 pour la France en 1965). Absent, elle est approchée depuis la longitude, qui ne peut connaître ni l'heure légale ni un changement d'heure</td></tr>
      <tr><td><code>timeZone</code></td><td>Le fuseau IANA dont le décalage a été dérivé (<code>"Europe/Paris"</code>) : la règle, là où <code>utcOffsetHours</code> est le nombre qu'elle donnait à cette date. Seul le nombre sert à placer le ciel ; le fuseau permet de dériver à nouveau le décalage quand la date change</td></tr>
      <tr><td><code>place</code></td><td>Où cela s'est passé, comme les événements de RR0 écrivent un lieu (le <code>PlaceJson</code> de <a href="https://www.npmjs.com/package/@rr0/place"><code>@rr0/place</code></a>) : <code>{ name, locations: [{ lat, lng }] }</code>, <code>name</code> étant le nom qualifié depuis lequel les coordonnées ont été résolues</td></tr>
      <tr><td><code>observer</code></td><td><code>{ id, title, lastName, firstNames }</code>, tous facultatifs ; à omettre entièrement pour un témoin anonyme. <code>id</code> est une référence à la personne (sur RR0, son répertoire : <code>"ZamoraLonnie"</code>) ; les autres champs la décrivent quand personne ne lui en a encore donné</td></tr>
      <tr><td><code>description</code></td><td>Le récit en prose — une chaîne, ou une par langue (voir plus bas)</td></tr>
      <tr><td><code>image</code>, <code>summary</code>, <code>summaryTime</code></td><td>Ce qui tient lieu de l'observation là où elle n'est que citée, jamais jouée : la carte qu'affiche un lien partagé (voir <a href="/docs/share/">Partager</a>). <code>image</code> est une image, une adresse (absolue, relative au fichier, ou un chemin RR0 depuis la racine du site) ; <code>summary</code> une phrase ou deux, une chaîne ou une par langue. Absents, la carte montre le logo et dit qui l'a vue, dans quel dossier et quand, pour autant que le fichier le dise. <code>summaryTime</code> est la seconde de l'enregistrement où l'on photographie l'image de la carte (0 par défaut : la première image), pour un enregistrement dont la première image ne montre pas le phénomène ; seul l'outil de capture du projet le lit, jamais le lecteur</td></tr>
      <tr><td><code>tags</code></td><td>Une liste de chaînes, écrites en anglais : ce sont des termes techniques, et deux enregistrements qui en partagent un doivent s'y égaler. Chaque lecteur les voit dans sa langue lorsqu'une traduction est connue, ce qui est le cas aujourd'hui de ${this.tags()}. La liste n'est pas fermée : tout autre tag est affiché tel qu'écrit, et les codes de classement (<code>"RR3"</code>, <code>"NL"</code>) ou les références de dossier (<code>"Blue Book 8729"</code>) s'écrivent tels quels. Un seul change le rejeu : <code>paralysis</code> immobilise la vue du témoin</td></tr>
      <tr><td><code>account</code></td><td>Qui l'a vu et comment le récit a circulé : <code>observerAgeYears</code> (à l'époque), <code>observerBirth</code> (date de naissance, tenue en phase avec lui), <code>observerPerception</code> (vision des couleurs, alcool, fatigue : seulement ce qui diffère d'un témoin typique), <code>observerOccupation</code>, <code>source</code> (comment il est parvenu à qui a écrit l'enregistrement : <code>on-site</code>, <code>interview</code>, <code>telephone</code>, <code>questionnaire</code>, <code>letter</code>, <code>social-media</code>, <code>press</code>) et <code>followedUp</code> (si le témoin a été revu ensuite), et pour les méthodes d'évaluation (voir <a href="https://rr0.org/science/crypto/ufo/enquete/methode/Ballester-Guasp.html">Ballester-Guasp</a>) : <code>observerOccupationKind</code> (<code>student</code>, <code>worker</code>, <code>farmer</code>, <code>homemaker</code>, <code>merchant</code>, <code>business</code>, <code>employee</code>, <code>artist</code>, <code>technician</code>, <code>police</code>, <code>pilot</code>, <code>military</code>), <code>observerGraduate</code>, <code>enquiryMinutes</code> (temps passé par l'enquêteur avec le témoin), <code>observersRelation</code> (<code>friends</code>, <code>family</code>, <code>professional</code>, <code>none</code>), <code>activity</code> (<code>leisure</code>, <code>travelling</code>, <code>cultural</code>, <code>working</code>) et <code>strangeness</code> (chacun des sept facteurs jugés par les enquêteurs, vrai ou faux : <code>appearance</code>, <code>movement</code>, <code>incongruity</code>, <code>detection</code>, <code>close</code>, <code>beings</code>, <code>traces</code>)</td></tr>
      <tr><td><code>sources</code></td><td>Où lire le récit tel qu'il a été donné, sous la forme d'une <a href="https://www.npmjs.com/package/@rr0/data">source RR0</a> : <code>[{ type, title, authors, url, publication: { publisher, time }, index }]</code>, <code>type</code> valant <code>book</code> ou <code>article</code>, ou rien pour une page web ou un post, qui n'est alors que son <code>url</code>. Affichées dans le panneau <q>?</q> du lecteur, en lien quand elles ont une adresse ; reprises telles quelles dans un dossier RR0</td></tr>
      <tr><td><code>milestones</code></td><td>Les moments nommés du récit, affichés sur la barre de lecture : <code>[{ t, label, note }]</code>, <code>label</code> étant la lettre ou le numéro qu'utilise le récit lui-même (<code>"A"</code>, <code>"B"</code>) ou deux ou trois mots, <code>note</code> ce qui s'est passé alors, dans les mots du récit si possible (une chaîne, ou une par langue)</td></tr>
      <tr><td><code>roads</code></td><td>Les routes ou chemins que dessine le plan du récit, quand la carte ne les a pas : <code>[{ id, title, surface, widthM, path, source }]</code>, <code>surface</code> valant <code>paved</code>, <code>gravel</code> ou <code>dirt</code>, <code>path</code> étant l'axe en <code>[{ eastM, northM }]</code> depuis le lieu du témoin au départ, et <code>source</code> le plan ou le relevé d'où il est tiré</td></tr>
    </table>
    </div>

    <h2>Plusieurs témoins : le dossier</h2>
    <p>Chaque témoin a son propre enregistrement, et un enregistrement ne dit pas à quel dossier il
      appartient : un compte rendu se suffit à lui-même. Ce qui les montre ensemble est le
      <strong>dossier</strong>, qui les désigne :
      le <code>case.json</code> d'un dossier <a href="https://rr0.org">RR0</a>, qui énonce le titre,
      la date et la classification du dossier, et liste tout ce qui lui est arrivé en
      <code>events</code>. Ses événements de type <code>sighting</code> sont ses comptes rendus, chacun
      pointant vers l'enregistrement d'un témoin :</p>
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
      <tr><td><code>id</code></td><td>L'identifiant du dossier lui-même. Sur rr0.org c'est le répertoire du dossier, et il peut être omis ; un fichier de dossier isolé l'énonce</td></tr>
      <tr><td><code>title</code>, <code>time</code></td><td>Le nom du dossier, et sa date comme RR0 l'écrit (<code>"1948-07-24 02:45"</code>, <code>"1954"</code>). Le lecteur nomme un dossier qu'il ouvre par son titre</td></tr>
      <tr><td><code>events</code></td><td>La chronologie du dossier. Seuls les <code>sighting</code> sont rejoués, chacun par son <code>url</code>, lue relativement à l'adresse du fichier de dossier (si bien que le même dossier marche depuis la page de son dossier comme depuis n'importe où) ; ceux marqués <code>interpretationOf</code> sont des lectures de l'un d'eux (voir plus bas) ; les autres (un article, un film, un aveu) sont ceux de RR0 Un événement porte un <code>id</code> quand une lecture le désigne, et seulement alors : il appartient au dossier, donc il doit être unique parmi les événements du dossier et nulle part ailleurs, et une référence se lit dans le fichier qui l'écrit. Un <code>interpretationOf</code> qu'aucun événement ne porte est lu, comme avant, comme l'<code>id</code> que déclare un enregistrement que le dossier liste ; celui qui ne correspond à aucun des deux est une faute du dossier, que le lecteur signale sur sa console, l'éditeur au-dessus de ses enregistrements, et le <code>validate.py</code> du skill quand on lui donne le fichier du dossier.</td></tr>
      <tr><td><code>image</code>, <code>summary</code></td><td>Ce que montre un lien partagé vers le dossier, comme pour un enregistrement (voir <a href="/docs/share/">Partager</a>) : une image, et une phrase ou deux, une chaîne ou une par langue</td></tr>
    </table>
    </div>
    <p>Donnez-le à <code>&lt;rr0-sighting src&gt;</code> ou au lecteur, et chaque témoin se choisit
      dans une liste. Un enregistrement peut être donné directement, sans dossier, mais un dossier à
      un seul compte rendu marche de la même façon et nomme ce qu'il montre. Essayez avec
      <a href="/demo-data/case-chiles-whitted.json"><code>case-chiles-whitted.json</code></a>
      (<a href="/play/?file=/demo-data/case-chiles-whitted.json">le jouer</a>).</p>

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
      qu'un témoin a dit en ce qu'il n'a pas dit.</p>
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
      une <code>shape</code>. <code>timeline.span</code> indique la durée de l'observation, en millisecondes, quand elle dure plus
      longtemps que la dernière image clé : un phénomène qui quitte l'image avant la fin du film. Sans lui, la frise est réputée finir
      à sa dernière image clé et se trouve étirée sur la durée déclarée de l'observation, si bien que tout ce que place
      l'enregistrement avance moins vite que le film posé dessus.</p>
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
      <tr><td><code>kind</code></td><td><code>oval</code>, ou <code>polygon</code>, qui prend alors aussi <code>points</code> : <code>[{ x, y }]</code> en pixels depuis le coin haut gauche de <code>bounds</code>, couvrant sa largeur et sa hauteur, pour que le contour s'étire avec lui quand l'angle redimensionne la boîte. Quand <code>bounds</code> est omis (le cas courant : il est déduit de <code>aim</code> et <code>angular</code>), écrire <code>points</code> en FRACTIONS de la boîte, de 0 à 1, et non en pixels</td></tr>
      <tr><td><code>title</code></td><td>Son nom, affiché au survol ; une chaîne, ou une par langue</td></tr>
      <tr><td><code>color</code></td><td>N'importe quelle couleur CSS</td></tr>
      <tr><td><code>angle</code></td><td>Son inclinaison, en radians autour de son propre centre, positive dans le sens horaire à l'écran</td></tr>
      <tr><td><code>transparency</code></td><td>De 0 opaque à 1 invisible</td></tr>
      <tr><td><code>haloScale</code></td><td>La lueur autour ; 0 pour aucune</td></tr>
      <tr><td><code>brightness</code></td><td>L'éblouissement : un voile, les aigrettes du diaphragme, un cœur saturé au blanc</td></tr>
      <tr><td><code>blur</code></td><td>À quel point le témoin a dit les contours indistincts</td></tr>
      <tr><td><code>angular</code></td><td>Sa taille apparente en degrés — voir plus bas</td></tr>
      <tr><td><code>aim</code></td><td>Où il était dans le ciel du témoin : la direction de son centre, <code>azimuthDeg</code> dans le sens horaire depuis le nord vrai et <code>altitudeDeg</code> au-dessus de l'horizon. Pas la direction où regardait le témoin, qui est le <code>headingDeg</code> et le <code>pitchDeg</code> de la pose — voir plus bas</td></tr>
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
      <code>timeline.groups</code> les groupes de formes, <code>{ id, title, members }</code> : un membre est le
      <code>sourceId</code> d'une forme ou l'<code>id</code> d'un autre groupe, si bien qu'un groupe peut contenir des groupes (un
      phénomène et ceux de ses feux qui clignotent ensemble) ; une forme ou un groupe est dans un groupe au plus, et un groupe a
      au moins 2 membres. Les deux sont facultatifs.</p>

    ${this.further("fr")}

    <h2>D'où vient chaque valeur</h2>
    <p>Toute valeur d'un enregistrement peut s'écrire nue, ou enveloppée de sa provenance :</p>
    <pre data-json=""><code>{
  "durationSeconds": {
    "value": 15,
    "basis": "derived",
    "rationale": "13 à 18 s dans la synthèse de l'enquêteur ; le milieu retenu"
  }
}</code></pre>
    <p><code>basis</code> vaut, du plus fort au plus faible, <code>established</code> (établi hors
      du témoignage et hors de la reconstitution : un document, un registre, un relevé, la mesure
      d'un tiers ; <code>rationale</code> nomme la source), <code>measured</code> (lu sur un
      instrument ou un gabarit), <code>stated</code> (le témoin l'a dit, et c'est ce que signifie
      une valeur nue), <code>derived</code> (déduit de ce qu'il a dit et de quelque chose de
      vérifiable : la largeur d'une route, une carte, un dessin mesuré ; <code>rationale</code> donne
      le calcul), <code>assumed</code> (choisi pour que la reconstitution ait une valeur, sur rien
      que le témoin ait dit) ou <code>fitted</code> (déplacé, dans ce qu'on sait, pour voir si une
      hypothèse peut coller ; <code>rationale</code> dit laquelle). La liste des valeurs
      <code>assumed</code> est la liste de ce qu'il faut retourner demander au témoin ou au dossier :
      c'est pourquoi elle vaut d'être écrite même quand rien d'autre ne l'est. <code>rationale</code> est une chaîne, ou une par
      langue comme un titre (<code>{ "fr": "…", "en": "…" }</code>) : un rapport sur le dossier se lit dans la langue de son lecteur.</p>
    <p><code>source</code> nomme ce sur quoi la valeur repose, ce qu'une base ne fait pas : la base
      dit de quelle NATURE elle est, ceci dit LAQUELLE — la chose qu'on irait regarder. Une à la
      fois : <code>said</code> (<code>{ interview, segment, range }</code>, le passage d'une
      interview du dossier où elle a été dite, <code>interview</code> étant l'<code>id</code> de cet
      événement et <code>segment</code> le tour de parole), <code>document</code> avec
      <code>at</code> (une page, un numéro de question) et <code>url</code>, <code>picture</code>
      (l'<code>id</code> d'une photo de l'enregistrement sur laquelle elle a été mesurée) ou
      <code>tool</code> (SVH, IPACO, QGIS, un théodolite). Une hypothèse de travail n'en nomme
      aucune, ce que <code>assumed</code> et <code>fitted</code> disent déjà, et lui en donner une
      serait le seul mensonge que ce champ existe pour empêcher.</p>
    <p>Une source <code>said</code> est aussi tout l'historique de ce que le témoin a déclaré. Un
      témoin auprès de qui on retourne corrige certaines choses et laisse le reste tel quel : une
      valeur corrigée cite donc l'interview LA PLUS RÉCENTE, et celle que personne n'a reprise
      continue de citer LA PREMIÈRE. Quelle interview chaque valeur cite <em>est</em> le relevé de ce
      qui a changé et de ce qui n'a pas changé, et il n'y a aucune version de la reconstitution à
      conserver pour le montrer. Laquelle est la plus récente, c'est au dossier de le dire, par les
      dates de ses événements d'interview.</p>
    <p>Dans l'éditeur, elle s'écrit dans la fenêtre de la pastille de base de la valeur : ce sur quoi
      elle repose, puis les champs de cette nature. Les passages proposés sont les interviews du
      dossier, donc un enregistrement ouvert seul n'en propose aucun ; les photos proposées sont
      celles de l'enregistrement. Une base libre ne propose aucun champ.</p>
    <p>Les deux bouts de cette liste sont ce qui empêche une ressemblance de passer pour une preuve.
      Seul ce qui est <code>established</code> ne doit rien au témoignage ni à la reconstitution :
      c'est ce qui en fait la seule chose contre laquelle juger une reconstitution. Une valeur
      <code>fitted</code> est l'inverse : plus une reconstitution en compte, plus une ressemblance
      est facile à obtenir, aussi rien n'est jamais confronté à une telle valeur. La déplacer n'est
      pas une contradiction et s'y accorder n'est pas un résultat : elle est là pour être
      déplacée.</p>
    <p><code>range</code> dit jusqu'où ce qu'on sait laisse aller une valeur, quand c'est plus que la valeur : le plus petit et le plus
      grand d'un nombre (<code>[50, 52]</code>), ou l'intervalle EDTF d'une date (<code>"1976-06/1976-07"</code>). La valeur est celle choisie
      dedans pour dessiner la scène. Une lecture de l'observation peut la déplacer n'importe où dans sa plage, et contredit ce qu'on sait
      au-delà ; une valeur indiquée ou déduite sans plage est ce qu'on sait, une valeur supposée sans plage est libre.</p>

    <h2>Vérifier un fichier</h2>
    <p>Le format est aussi publié en <a href="${new URL(FormatVersion.schemaUrl("sighting")).pathname}">JSON Schema</a>, engendré
      depuis les mêmes types que le lecteur : toutes les clés qu'il connaît, ce que chacune peut
      contenir, et les mots qu'accepte une liste fermée. Une clé mal orthographiée ou une valeur
      inconnue y échoue. Il ne dit rien de ce qui peut être omis, question de sens à laquelle répond
      cette page. Pour voir le résultat, ouvrez le fichier dans <a href="/play/">le lecteur</a>,
      depuis un lien, ou depuis votre disque avec les images et modèles qu'il nomme.
      Le lecteur le vérifie de la même façon au chargement, et dit derrière un ⚠ sur l'image ce
      qu'il n'a pas pu jouer comme écrit : une clé que rien ne lit, un mot hors de sa liste, et ce
      qu'il a dû inventer parce que la première keyframe d'une forme l'omettait (un champ tenu
      depuis la keyframe précédente relève de la règle ci-dessus, pas d'un problème).</p>

    <h3>Versions du format</h3>
    <p>Un fichier indique la version de son format dans <code>version</code> : <code>4</code> depuis novembre 2026. C'est la version du FORMAT, pas celle d'UFO@home : ajouter un champ ne la
      change pas, puisqu'un lecteur ignore ce qu'il ne connaît pas. Elle ne change que le jour où un champ change de sens ou de forme.</p>
    <p>Un lecteur lit UNE seule version et refuse toute autre, plus récente comme plus ancienne, avec un message qui le dit,
      plutôt que de jouer autre chose que ce que dit le fichier. Les anciennes versions ne sont pas converties à la lecture :
      un fichier écrit dans l'une d'elles se remonte avec un outil, <code>scripts/migrate-recordings.ts</code>, hors du lecteur,
      et un fichier partagé sous une version ancienne continue de se jouer parce qu'un partage fige l'UFO@home qui le lit
      (voir Partage).</p>
    <p>Ce qu'a changé chaque version, et que cet outil connaît. La version 2 écrit
      <code>time</code> et <code>endTime</code> en texte EDTF plutôt qu'en champs d'une date (<code>{ "year": 1964, "month": 4, … }</code>),
      et <code>place</code> comme un lieu plutôt que comme une liste de positions portant chacune son nom, pour qu'un
      enregistrement et un événement de RR0 disent « quand » et « où » de la même façon. La version 3 dit de qui est chaque
      événement par un id (<code>who</code>, voir les événements plus haut), et écrit un groupe de formes <code>{ id, members }</code>
      plutôt que la liste de ses membres ; les formes que listaient les <code>parts</code> d'un <code>blink</code> deviennent un
      groupe à elles. La version 4 appelle <code>snapshots</code> ce que la version 3 appelait <code>frozen</code>, puisque ce
      qu'il contient est une copie de ce que les sources ont répondu, pas l'original figé quelque part.</p>
    <p>Chaque version a son schéma, à une adresse qui la nomme :
      <code>https://ufoathome.org/schema/4/sighting.schema.json</code> (et
      <code>case.schema.json</code>, <code>interview.schema.json</code> à côté).
      <code>/sighting.schema.json</code> est toujours la version courante. Un fichier peut nommer
      celle d'après laquelle il a été écrit dans <code>"$schema"</code>, dont se servent des
      éditeurs comme VS Code pour le vérifier pendant la frappe ; le lecteur ne le lit pas.</p>

    <h2>Un fichier entier</h2>
    <p>Le plus petit enregistrement qui énonce encore quelque chose — un ovale silencieux traversant
      le ciel en douze secondes, à une date réelle et en un lieu réel. Tout le reste du format est
      facultatif, et tout ce qui suit sert à quelque chose :</p>
    <pre data-json=""><code>${this.escape(this.example)}</code></pre>
    <p class="small">Pour le modifier et le voir jouer, collez-le dans <a href="/edit/">l'éditeur</a>,
      qui complète sur chaque clé du format, propose les mots que chacune accepte, et dit
      ce que le modèle en dit.</p>
    <p>C'est <a href="/demo-data/example-minimal.json"><code>/demo-data/example-minimal.json</code></a>
      sur ce site : vous pouvez le récupérer, et
      <a href="/play/?file=/demo-data/example-minimal.json">le jouer</a> avant d'y toucher.
      Remarquez que <code>angular</code> et <code>bounds</code> y figurent tous deux : l'angle est ce
      que le fichier SIGNIFIE, et les pixels en sont redérivés au chargement — écrivez l'angle, et
      laissez corriger une mauvaise estimation des pixels.</p>

    <h2>De plus gros, à lire</h2>
    <p>Chaque démo de ce site est un simple fichier que vous pouvez ouvrir. Ces quatre-là valent la
      lecture pour voir comment un vrai enregistrement est bâti :</p>
    <div class="table-scroll">
    <table>
      <tr><th>Fichier</th><th>Ce qu'il faut y regarder</th></tr>
      <tr><td><a href="/demo-data/observer-chiles.json"><code>observer-chiles.json</code></a></td><td>Un vrai dossier : un témoin, un identifiant de dossier partagé avec un second enregistrement, dix keyframes, un <code>weatherTrack</code> relevé avec son <code>weatherSource</code></td></tr>
      <tr><td><a href="/demo-data/sky-test-halos.json"><code>sky-test-halos.json</code></a></td><td>Aucun phénomène : un ciel réglé une fois (une seule image clé de <code>weatherTrack</code>, un voile de cirrostratus et l'alignement de ses cristaux), photographié par un <code>instrument</code>, un téléphone, dont l'<code>observerTrack</code> tourne, s'incline, roule et zoome, et déplace avec lui les reflets de l'objectif</td></tr>
      <tr><td><a href="/demo-data/sky-test-clouds.json"><code>sky-test-clouds.json</code></a></td><td>Trois couches nuageuses avec altitude, épaisseur, taille, densité et vent en mètres, évoluant sur la timeline météo — et dans la première une entrée <code>instances</code> : un nuage du champ, placé et dimensionné en mètres, qui grossit et s'assombrit sur les deux minutes</td></tr>
      <tr><td><a href="/demo-data/sky-test-aircraft.json"><code>sky-test-aircraft.json</code></a></td><td>Un <code>instrument</code>, un <code>exposureSeconds</code> et un <code>iso</code>, et un décor d'aéronef avec sa <code>track</code> et neuf <code>lights</code> à leurs cadences réelles, phares d'atterrissage compris</td></tr>
      <tr><td><a href="/demo-data/sky-test-reentry.json"><code>sky-test-reentry.json</code></a></td><td>Aucun phénomène : des <code>skyEvents</code> avec une <code>reentries</code>, le lanceur de Zond 4 se désagrégeant au-dessus du Kentucky en 1968, son chemin dérivé, son horaire, ses hauteurs et son éclat supposés, chaque valeur avec sa provenance</td></tr>
      <tr><td><a href="/demo-data/observer-csg2-falcon.json"><code>observer-csg2-falcon.json</code></a></td><td>Le compte rendu de Ron Lee (SeeSat-L) du deuxième étage qui a lancé CSG-2 (Falcon 9, 31 janvier 2022), vu depuis Falcon (Colorado) freinant pour quitter son orbite et vidangeant ses réservoirs en tournant : des <code>skyEvents</code> avec une <code>launches</code> munie de <code>jets</code>, l'orbite tirée des éléments Space-Track de CSG-2, le freinage, les vidanges et la rotation supposés avec leur provenance ; l'une des trois vues de <a href="/demo-data/case-csg2.json"><code>case-csg2.json</code></a>, les autres sa montée vue de Nassau et sa fin vue d'Oklahoma City, témoins supposés</td></tr>
      <tr><td><a href="/demo-data/sky-test-laser-meudon.json"><code>sky-test-laser-meudon.json</code></a></td><td>Aucun phénomène : des <code>skyEvents</code> avec un <code>beams</code>, le laser vert de 10 W que l'Observatoire de Paris a tiré de sa coupole de Meudon à sa coupole de Paris le 9 octobre 2026, vu du parc de Meudon, la hauteur de l'émetteur et l'ouverture supposées avec leur provenance, la lumière calculée</td></tr>
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
      <li><strong>L'énoncé l'emporte sur le déduit.</strong> <code>occludesSourceIds</code> contient des affirmations du témoin. Rien dans ce format
        <em>ne peut</em> les déduire : il décrit une apparence dans un champ de vision, pas une
        position dans l'espace.</li>
      <li><strong>Absent n'est pas zéro.</strong> Pas de piste sonore signifie que personne n'a posé
        la question ; <code>kind: "none"</code> signifie que le témoin a déclaré n'avoir rien
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
    <h2>Parte técnica: el archivo de observación</h2>
    <p>Lo que sigue es para quien escribe estos archivos a mano, los genera o los lee en código. En el editor no hace falta saber nada de ello.</p>
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
      <tr><td><code>version</code></td><td>La versión del formato: <code>4</code> (ver Versiones del formato)</td></tr>
      <tr><td><code>id</code></td><td>Qué relato es este, único entre todas las grabaciones de cualquier parte: el día, y luego quién lo vio (<code>"1964-04-24-ZamoraLonnie"</code>), o dónde para un testigo anónimo (<code>"1964-04-24-Socorro"</code>). Aquello por lo que un caso lo nombra no es este id sino el de su evento (véase más abajo).</td></tr>
      <tr><td><code>time</code>, <code>endTime</code></td><td>La fecha escrita en <a href="https://www.loc.gov/standards/datetime/">EDTF</a>, en la hora legal de <code>utcOffsetHours</code>, como la escriben los eventos de RR0: <code>"1964-04-24T17:50"</code>, <code>"1954"</code>, <code>"1948-07-24T02:45~"</code> (aproximada), <code>"2025-06?"</code> (incierta), <code>"1965-07-01%"</code> (ambas), <code>"19XX"</code> (un año enmascarado), <code>"2022-21"</code> (la primavera de 2022), o <code>"05:00"</code> solo para una hora recordada sin su fecha. Cada parte es opcional empezando por la derecha: así expresa el formato “1954” o “hacia las 05:00”. Es un subconjunto de EDTF (nivel 0, estos calificativos sobre la fecha entera, años enmascarados, estaciones); <a href="https://www.npmjs.com/package/@rr0/time"><code>@rr0/time</code></a> es el modelo EDTF completo de RR0, al que las herramientas de UFO@home convierten las fechas de una grabación</td></tr>
      <tr><td><code>durationSeconds</code></td><td>Una alternativa a <code>endTime</code>, y prevalece si se dan las dos</td></tr>
      <tr><td><code>durationText</code></td><td>La duración tal como se enunció cuando no era exacta: una duración ISO 8601 con una duda (<code>PT10M~</code>) o un rango (<code>PT5M/PT10M</code>). <code>durationSeconds</code> es entonces la única duración a la que se reproduce, elegida a partir de ella</td></tr>
      <tr><td><code>utcOffsetHours</code></td><td>La hora LEGAL que marcaba el reloj del testigo (+1 para Francia en 1965). Si falta, se aproxima a partir de la longitud, que no puede conocer la hora legal ni un cambio de horario de verano</td></tr>
      <tr><td><code>timeZone</code></td><td>La zona IANA de la que se derivó el desfase (<code>"Europe/Paris"</code>): la regla, mientras que <code>utcOffsetHours</code> es el número que daba en esa fecha. Solo se lee el número para situar el cielo; la zona es lo que permite derivar de nuevo el desfase cuando cambia la fecha</td></tr>
      <tr><td><code>place</code></td><td>Dónde ocurrió, como los eventos de RR0 escriben un lugar (el <code>PlaceJson</code> de <a href="https://www.npmjs.com/package/@rr0/place"><code>@rr0/place</code></a>): <code>{ name, locations: [{ lat, lng }] }</code>, siendo <code>name</code> el nombre completo del lugar a partir del cual se resolvieron las coordenadas</td></tr>
      <tr><td><code>observer</code></td><td><code>{ id, title, lastName, firstNames }</code>, todos opcionales; se omite por completo para un testigo anónimo. <code>id</code> es una referencia a la persona (en RR0, su directorio: <code>"ZamoraLonnie"</code>); los demás campos la describen cuando nadie le ha dado uno</td></tr>
      <tr><td><code>description</code></td><td>El relato en prosa — una cadena, o una por idioma (véase más abajo)</td></tr>
      <tr><td><code>image</code>, <code>summary</code>, <code>summaryTime</code></td><td>Lo que representa la observación donde solo se enlaza y nunca se reproduce: la tarjeta que muestra un enlace compartido (véase <a href="/docs/share/">Compartir</a>). <code>image</code> es una imagen, una dirección (absoluta, relativa al archivo, o una ruta RR0 desde la raíz del sitio); <code>summary</code> una o dos frases, una cadena o una por idioma. Ausentes, la tarjeta muestra el logotipo y dice quién la vio, en qué caso y cuándo, hasta donde lo diga el archivo. <code>summaryTime</code> es el segundo de la grabación en que se fotografía la imagen de la tarjeta (0 por defecto: la primera imagen), para una grabación cuya primera imagen no muestra el fenómeno; solo la herramienta de captura del proyecto lo lee, nunca el reproductor</td></tr>
      <tr><td><code>tags</code></td><td>Una lista de cadenas, escritas en inglés: son términos técnicos, y dos grabaciones que comparten uno tienen que coincidir en él. A cada lector se le muestran en su propio idioma cuando se conoce una traducción, que hoy es el caso de ${this.tags()}. La lista no está cerrada: cualquier otra se muestra tal como está escrita, y los códigos de clasificación (<code>"RR3"</code>, <code>"NL"</code>) o las referencias de caso (<code>"Blue Book 8729"</code>) se escriben tal cual. Una cambia la reproducción: <code>paralysis</code> mantiene inmóvil la vista del testigo</td></tr>
      <tr><td><code>account</code></td><td>Quién lo vio y cómo viajó el relato: <code>observerAgeYears</code> (en aquel momento), <code>observerBirth</code> (fecha de nacimiento, mantenida en fase con él), <code>observerPerception</code> (visión del color, alcohol, fatiga: solo lo que difiere de un testigo típico), <code>observerOccupation</code>, <code>source</code> (cómo llegó a quien escribió la grabación: <code>on-site</code>, <code>interview</code>, <code>telephone</code>, <code>questionnaire</code>, <code>letter</code>, <code>social-media</code>, <code>press</code>) y <code>followedUp</code> (si se volvió a contactar al testigo después), y para los métodos de evaluación (véase <a href="https://rr0.org/science/crypto/ufo/enquete/methode/Ballester-Guasp.html">Ballester-Guasp</a>): <code>observerOccupationKind</code> (<code>student</code>, <code>worker</code>, <code>farmer</code>, <code>homemaker</code>, <code>merchant</code>, <code>business</code>, <code>employee</code>, <code>artist</code>, <code>technician</code>, <code>police</code>, <code>pilot</code>, <code>military</code>), <code>observerGraduate</code>, <code>enquiryMinutes</code> (tiempo que el encuestador pasó con el testigo), <code>observersRelation</code> (<code>friends</code>, <code>family</code>, <code>professional</code>, <code>none</code>), <code>activity</code> (<code>leisure</code>, <code>travelling</code>, <code>cultural</code>, <code>working</code>) y <code>strangeness</code> (cada uno de los siete factores juzgados por los encuestadores, verdadero o falso: <code>appearance</code>, <code>movement</code>, <code>incongruity</code>, <code>detection</code>, <code>close</code>, <code>beings</code>, <code>traces</code>)</td></tr>
      <tr><td><code>sources</code></td><td>Dónde leer el relato tal como se dio, con la forma de una <a href="https://www.npmjs.com/package/@rr0/data">fuente RR0</a>: <code>[{ type, title, authors, url, publication: { publisher, time }, index }]</code>, siendo <code>type</code> <code>book</code> o <code>article</code>, o nada para una página web o una publicación, que entonces es solo su <code>url</code>. Se muestran en el panel <q>?</q> del reproductor, enlazadas cuando tienen dirección; se copian tal cual en un expediente RR0</td></tr>
      <tr><td><code>milestones</code></td><td>Los momentos con nombre del relato, mostrados en la barra de reproducción: <code>[{ t, label, note }]</code>, siendo <code>label</code> la letra o el número que usa el propio relato (<code>"A"</code>, <code>"B"</code>) o un par de palabras, y <code>note</code> lo que ocurrió entonces, con las palabras del relato cuando sea posible (una cadena, o una por idioma)</td></tr>
      <tr><td><code>roads</code></td><td>Las carreteras o caminos que dibuja el propio plano del relato, cuando el mapa no los tiene: <code>[{ id, title, surface, widthM, path, source }]</code>, siendo <code>surface</code> <code>paved</code>, <code>gravel</code> o <code>dirt</code>, <code>path</code> el eje como <code>[{ eastM, northM }]</code> desde el lugar del testigo al inicio, y <code>source</code> el plano o levantamiento del que se tomó</td></tr>
    </table>
    </div>

    <h2>Varios testigos: el caso</h2>
    <p>Cada testigo tiene su propia grabación, y una grabación no dice a qué caso
      pertenece: un relato se sostiene por sí solo. Lo que los muestra juntos es el
      <strong>caso</strong>, que los nombra: el
      <code>case.json</code> de un expediente de <a href="https://rr0.org">RR0</a>, que indica el
      título, la fecha y la clasificación del caso, y enumera todo lo que ocurrió en él como
      <code>events</code>. Sus eventos de tipo <code>sighting</code> son sus relatos, cada uno apuntando
      a la grabación de un testigo:</p>
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
      <tr><td><code>events</code></td><td>La cronología del caso. Solo se reproducen los <code>sighting</code>, cada uno por su <code>url</code>, leída respecto a la dirección del propio archivo de caso (de modo que el mismo caso funciona desde la página de su expediente y desde cualquier otro lugar); los marcados con <code>interpretationOf</code> son lecturas de uno de ellos (véase abajo); los demás (un artículo, una película, una confesión) son de RR0 Un evento lleva un <code>id</code> cuando una lectura lo designa, y solo entonces: pertenece al caso, así que debe ser único entre los eventos del caso y en ninguna otra parte, y una referencia se lee en el archivo que la escribe. Un <code>interpretationOf</code> que ningún evento lleva se lee, como antes, como el <code>id</code> que declara una grabación que el caso enumera; el que no corresponde a ninguno de los dos es un fallo del caso, que el reproductor señala en su consola, el editor sobre sus grabaciones, y el <code>validate.py</code> del skill cuando se le da el archivo del caso.</td></tr>
      <tr><td><code>image</code>, <code>summary</code></td><td>Lo que muestra un enlace compartido al caso, como para una grabación (véase <a href="/docs/share/">Compartir</a>): una imagen, y una o dos frases, una cadena o una por idioma</td></tr>
    </table>
    </div>
    <p>Dáselo a <code>&lt;rr0-sighting src&gt;</code> o al reproductor, y cada testigo podrá
      elegirse de una lista. Una grabación puede darse directamente, sin caso, pero un caso con un solo
      avistamiento funciona igual y nombra lo que muestra. Pruébalo con
      <a href="/demo-data/case-chiles-whitted.json"><code>case-chiles-whitted.json</code></a>
      (<a href="/play/?file=/demo-data/case-chiles-whitted.json">reproducirlo</a>).</p>

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
      lugar de un campo vacío: una traducción que falta nunca debe convertir algo que el testigo
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
      compartir una línea de tiempo (el fenómeno, una llama que lo sigue, una segunda luz) — y una <code>shape</code>. <code>timeline.span</code>
      indica cuánto dura la observación, en milisegundos, cuando dura más que el último fotograma clave: un fenómeno que sale de la
      imagen antes de que acabe la película. Sin él, se considera que la línea de tiempo termina en su último fotograma clave y queda
      estirada sobre la duración declarada de la observación, de modo que todo lo que la grabación coloca avanza más despacio que la
      película superpuesta.</p>
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
      <tr><td><code>kind</code></td><td><code>oval</code>, o <code>polygon</code>, que entonces también toma <code>points</code>: <code>[{ x, y }]</code> en píxeles desde la esquina superior izquierda de <code>bounds</code>, abarcando su anchura y su altura, para que el contorno se estire con ella cuando el ángulo redimensiona la caja. Cuando se omite <code>bounds</code> (el caso habitual: se deriva de <code>aim</code> y <code>angular</code>), escribir <code>points</code> como FRACCIONES de la caja, de 0 a 1, y no en píxeles</td></tr>
      <tr><td><code>title</code></td><td>Su nombre, mostrado al pasar el puntero por encima; una cadena, o una por idioma</td></tr>
      <tr><td><code>color</code></td><td>Cualquier color CSS</td></tr>
      <tr><td><code>angle</code></td><td>Su inclinación, en radianes alrededor de su propio centro, positiva en sentido horario en pantalla</td></tr>
      <tr><td><code>transparency</code></td><td>De 0 opaco a 1 invisible</td></tr>
      <tr><td><code>haloScale</code></td><td>El resplandor a su alrededor; 0 es ninguno</td></tr>
      <tr><td><code>brightness</code></td><td>Cuánto deslumbra: un velo, las puntas del diafragma, un núcleo saturado a blanco</td></tr>
      <tr><td><code>blur</code></td><td>Lo difusos que el testigo dijo que se veían los bordes</td></tr>
      <tr><td><code>angular</code></td><td>Su tamaño aparente en grados — véase más abajo</td></tr>
      <tr><td><code>aim</code></td><td>Dónde estaba en el cielo del testigo: la dirección de su centro, <code>azimuthDeg</code> en sentido horario desde el norte verdadero y <code>altitudeDeg</code> sobre el horizonte. No hacia dónde miraba el testigo, que es el <code>headingDeg</code> y el <code>pitchDeg</code> de la pose — véase más abajo</td></tr>
    </table>
    </div>
    <p><strong><code>aim</code> lo sitúa, <code>angular</code> lo dimensiona.</strong> <code>bounds</code>
      es la proyección de ambos sobre el lienzo fijo de 640×360 con el rumbo y el campo de visión de
      la pose, a través del propio instrumento de la grabación; se vuelve a derivar al cargar, así que
      un archivo sobrevive a un cambio de lienzo, de campo de visión, de instrumento, o de hacia dónde
      miraba el testigo. Si los píxeles y los ángulos llegan a discrepar, ganan los ángulos: mover
      <code>bounds</code> en un archivo no hace nada mientras <code>aim</code> esté ahí. Un archivo
      escrito a mano puede omitir <code>bounds</code> por completo.</p>
    <p><code>timeline.order</code> es el orden de pintado de atrás hacia delante, <code>timeline.groups</code> los
      grupos de formas, <code>{ id, title, members }</code>: un miembro es el <code>sourceId</code> de una forma o el
      <code>id</code> de otro grupo, de modo que un grupo puede contener grupos (un fenómeno y aquellas de sus luces que parpadean
      juntas); una forma o un grupo está en un grupo como mucho, y un grupo tiene al menos 2 miembros. Ambos opcionales.</p>

    ${this.further("es")}

    <h2>De dónde viene cada valor</h2>
    <p>Cualquier valor de una grabación puede escribirse tal cual, o envuelto con su procedencia:</p>
    <pre data-json=""><code>{
  "durationSeconds": {
    "value": 15,
    "basis": "derived",
    "rationale": "De 13 a 18 s en la síntesis del investigador; se toma el punto medio"
  }
}</code></pre>
    <p><code>basis</code> es, del más fuerte al más débil, <code>established</code> (establecido
      fuera del testimonio y fuera de la reconstrucción: un documento, un registro, un levantamiento,
      la medida de un tercero; <code>rationale</code> nombra la fuente), <code>measured</code> (leído
      en un instrumento o un patrón), <code>stated</code> (lo dijo el testigo, y es lo que significa un valor
      sin envolver), <code>derived</code> (deducido de lo que dijo más algo comprobable: la anchura de una
      carretera, un mapa, un dibujo medido; <code>rationale</code> da el razonamiento),
      <code>assumed</code> (elegido para que la reconstrucción tenga un valor, sin base en nada de lo que
      dijo el testigo) o <code>fitted</code> (desplazado, dentro de lo que se sabe, para ver si una
      hipótesis puede encajar; <code>rationale</code> dice cuál). La lista de valores <code>assumed</code> es la lista de lo que hay que volver a
      preguntar al testigo o buscar en el expediente, y por eso vale la pena escribirla incluso cuando no se escribe nada más.
      <code>rationale</code> es una cadena, o una por idioma como un título (<code>{ "fr": "…", "en": "…" }</code>): un informe del caso
      se lee en el idioma de su lector.</p>
    <p><code>source</code> nombra aquello en lo que se apoya el valor, lo que una base no hace: la
      base dice de qué CLASE es, esto dice CUÁL — la cosa que alguien iría a mirar. Una a la vez:
      <code>said</code> (<code>{ interview, segment, range }</code>, el pasaje de una entrevista del
      expediente en que se dijo, siendo <code>interview</code> el <code>id</code> de ese evento y
      <code>segment</code> el turno de palabra), <code>document</code> con <code>at</code> (una
      página, el número de una pregunta) y <code>url</code>, <code>picture</code> (el
      <code>id</code> de una foto de la grabación sobre la que se midió) o <code>tool</code> (SVH,
      IPACO, QGIS, un teodolito). Una hipótesis de trabajo no nombra ninguna, que es lo que ya dicen
      <code>assumed</code> y <code>fitted</code>, y darle una sería la única mentira que este campo
      existe para impedir.</p>
    <p>Una fuente <code>said</code> es además todo el historial de lo que dijo el testigo. A un
      testigo al que se vuelve corrige algunas cosas y deja el resto en pie: un valor corregido cita
      la entrevista MÁS RECIENTE, y el que nadie revisó sigue citando LA PRIMERA. Qué entrevista cita
      cada valor <em>es</em> el registro de lo que cambió y lo que no, y no hay que conservar ninguna
      versión de la reconstrucción para mostrarlo. Cuál es la más reciente le toca decirlo al
      expediente, por las fechas de sus eventos de entrevista.</p>
    <p>En el editor se escribe en la ventana de la pastilla de base del valor: en qué se basa, y
      luego los campos de esa clase. Los pasajes ofrecidos son las entrevistas del expediente, así
      que una grabación abierta sola no ofrece ninguno; las fotos ofrecidas son las de la grabación.
      Una base libre no ofrece ningún campo.</p>
    <p>Los dos extremos de esa lista son lo que impide que un parecido pase por una prueba. Solo lo
      <code>established</code> no debe nada al testimonio ni a la reconstrucción: eso es lo que lo
      convierte en lo único contra lo que juzgar una reconstrucción. Un valor <code>fitted</code> es
      lo contrario: cuantos más tiene una reconstrucción, más fácil es obtener un parecido, así que
      nada se confronta nunca con uno de ellos. Moverlo no es una contradicción y coincidir con él no
      es un resultado: está ahí para ser movido.</p>
    <p><code>range</code> dice hasta dónde lo que se sabe deja ir un valor, cuando es más que el valor: el menor y el mayor de un número
      (<code>[50, 52]</code>), o el intervalo EDTF de una fecha (<code>"1976-06/1976-07"</code>). El valor es el elegido dentro para dibujar
      la escena. Una lectura de la observación puede desplazarlo a cualquier punto de su intervalo, y contradice lo que se sabe más allá;
      un valor indicado o deducido sin intervalo es lo que se sabe, uno supuesto sin intervalo es libre.</p>

    <h2>Comprobar un archivo</h2>
    <p>El formato se publica también como <a href="${new URL(FormatVersion.schemaUrl("sighting")).pathname}">JSON Schema</a>,
      generado a partir de los mismos tipos que el reproductor: todas las claves que conoce, lo que puede
      contener cada una, y las palabras que acepta una lista cerrada. Una clave mal escrita o un valor
      desconocido no lo superan. No dice nada de lo que puede omitirse, que es una cuestión de sentido que
      responde esta página. Para ver el resultado, abre el archivo en <a href="/play/">el reproductor</a>,
      desde un enlace, o desde tu disco con las imágenes y los modelos que nombra. El reproductor
      lo comprueba del mismo modo al cargar, e indica tras un ⚠ sobre la imagen lo que no pudo reproducir
      tal como está escrito: una clave que nada lee, una palabra fuera de su lista, y lo que tuvo que
      inventar porque el primer fotograma clave de una forma lo omitía (un campo mantenido desde el
      fotograma clave anterior es la regla de arriba, no un problema).</p>

    <h3>Versiones del formato</h3>
    <p>Un archivo indica la versión de su formato en <code>version</code>: <code>4</code> desde noviembre de 2026. Es la versión del FORMATO, no la de UFO@home: añadir un campo no la
      cambia, ya que un reproductor ignora lo que no conoce. Solo cambia el día en que un campo cambia de sentido o de forma.</p>
    <p>Un reproductor lee UNA sola versión y rechaza cualquier otra, más reciente o más antigua, con un mensaje que lo dice,
      en lugar de reproducir algo distinto de lo que el archivo dice. Las versiones antiguas no se convierten al leer: un
      archivo escrito en una de ellas se actualiza con una herramienta, <code>scripts/migrate-recordings.ts</code>, fuera del
      reproductor, y un archivo compartido bajo una versión antigua sigue reproduciéndose porque al compartir se fija el
      UFO@home que lo lee (ver Compartir).</p>
    <p>Lo que cambió cada versión, que es lo que esa herramienta conoce. La versión 2 escribe <code>time</code> y
      <code>endTime</code> como texto EDTF en lugar de los campos de una fecha (<code>{ "year": 1964, "month": 4, … }</code>), y
      <code>place</code> como un lugar en vez de una lista de ubicaciones con su propio nombre cada una, para que una grabación y
      un evento de RR0 digan «cuándo» y «dónde» del mismo modo. La versión 3 dice de quién es cada evento mediante un id
      (<code>who</code>, ver los eventos más arriba), y escribe un grupo de formas como <code>{ id, members }</code> en lugar de la
      lista de sus miembros; las formas que un <code>blink</code> listaba en sus <code>parts</code> pasan a ser un grupo propio.
      La versión 4 llama <code>snapshots</code> a lo que la versión 3 llamaba <code>frozen</code>, ya que lo que contiene es una
      copia de lo que respondieron las fuentes, no el original congelado en alguna parte.</p>
    <p>Cada versión tiene su esquema, en una dirección que la nombra:
      <code>https://ufoathome.org/schema/4/sighting.schema.json</code> (y
      <code>case.schema.json</code>, <code>interview.schema.json</code> al lado).
      <code>/sighting.schema.json</code> es siempre la versión actual. Un archivo puede nombrar aquella
      con la que se escribió en <code>"$schema"</code>, que editores como VS Code usan para comprobarlo
      mientras se escribe; el reproductor no lo lee.</p>

    <h2>Un archivo completo</h2>
    <p>La grabación más pequeña que aún expresa algo — un óvalo silencioso que cruza el cielo en
      doce segundos, en una fecha real y en un lugar real. Todo lo demás del formato es opcional, y
      todo lo que sigue cumple una función:</p>
    <pre data-json=""><code>${this.escape(this.example)}</code></pre>
    <p class="small">Para modificarlo y verlo reproducirse, pégalo en <a href="/edit/">el editor</a>,
      que completa cada clave que tiene el formato, ofrece las palabras que acepta cada una, y
      dice lo que el modelo dice de ella.</p>
    <p>Es <a href="/demo-data/example-minimal.json"><code>/demo-data/example-minimal.json</code></a>
      en este sitio, así que puedes descargarlo, y
      <a href="/play/?file=/demo-data/example-minimal.json">reproducirlo</a> antes de cambiar
      nada. Observa que aparecen tanto <code>angular</code> como <code>bounds</code>: el ángulo es lo que
      el archivo SIGNIFICA, y los píxeles se vuelven a derivar de él al cargar — escribe el ángulo, y deja
      que se te corrija una estimación errónea de los píxeles.</p>

    <h2>Otros más grandes para leer</h2>
    <p>Cada demo de este sitio es un simple archivo que puedes abrir. Estos cuatro son los que vale la
      pena leer para ver cómo se construye una grabación real:</p>
    <div class="table-scroll">
    <table>
      <tr><th>Archivo</th><th>Qué mirar en él</th></tr>
      <tr><td><a href="/demo-data/observer-chiles.json"><code>observer-chiles.json</code></a></td><td>Un caso real: un testigo, un id de caso compartido con una segunda grabación, diez fotogramas clave, un <code>weatherTrack</code> consultado con su <code>weatherSource</code></td></tr>
      <tr><td><a href="/demo-data/sky-test-halos.json"><code>sky-test-halos.json</code></a></td><td>Ningún fenómeno: un cielo preparado una vez (un solo fotograma clave de <code>weatherTrack</code>, un velo de cirrostratos y la alineación de sus cristales), fotografiado con un <code>instrument</code>, un teléfono, cuyo <code>observerTrack</code> gira, se inclina, rueda y hace zoom, y desplaza con él los reflejos del objetivo</td></tr>
      <tr><td><a href="/demo-data/sky-test-clouds.json"><code>sky-test-clouds.json</code></a></td><td>Tres capas de nubes con altitud, espesor, tamaño, densidad y viento en metros, evolucionando en la línea de tiempo meteorológica — y en la primera una entrada <code>instances</code>: una nube del campo, situada y dimensionada en metros, que crece y se oscurece a lo largo de los dos minutos</td></tr>
      <tr><td><a href="/demo-data/sky-test-aircraft.json"><code>sky-test-aircraft.json</code></a></td><td>Un <code>instrument</code>, un <code>exposureSeconds</code> y un <code>iso</code>, y una aeronave de <code>decor</code> con una <code>track</code> y nueve <code>lights</code> a sus cadencias de destello reales, luces de aterrizaje incluidas</td></tr>
      <tr><td><a href="/demo-data/sky-test-reentry.json"><code>sky-test-reentry.json</code></a></td><td>Ningún fenómeno: <code>skyEvents</code> con una <code>reentries</code>, el lanzador de Zond 4 desintegrándose sobre Kentucky en 1968, su camino derivado y su horario, alturas y brillo supuestos, cada valor con su procedencia</td></tr>
      <tr><td><a href="/demo-data/observer-csg2-falcon.json"><code>observer-csg2-falcon.json</code></a></td><td>El relato de Ron Lee (SeeSat-L) de la segunda etapa que lanzó CSG-2 (Falcon 9, 31 de enero de 2022), vista desde Falcon (Colorado) frenando para salir de su órbita y purgando sus depósitos mientras giraba: <code>skyEvents</code> con una <code>launches</code> con <code>jets</code>, la órbita sacada de los elementos Space-Track de CSG-2, el frenado, las purgas y el giro supuestos con su procedencia; una de las tres vistas de <a href="/demo-data/case-csg2.json"><code>case-csg2.json</code></a>, las otras su ascenso visto desde Nassau y su final visto desde Oklahoma City, testigos supuestos</td></tr>
      <tr><td><a href="/demo-data/sky-test-laser-meudon.json"><code>sky-test-laser-meudon.json</code></a></td><td>Ningún fenómeno: <code>skyEvents</code> con un <code>beams</code>, el láser verde de 10 W que el Observatorio de París disparó desde su cúpula de Meudon a su cúpula de París el 9 de octubre de 2026, visto desde el parque de Meudon, la altura del emisor y la apertura supuestas con su procedencia, la luz calculada</td></tr>
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
      <li><strong>Lo declarado prevalece sobre lo deducido.</strong> <code>occludesSourceIds</code> registra afirmaciones del testigo. Nada en este formato
        <em>puede</em> deducirlas: describe una apariencia en un campo de visión, no una posición en
        el espacio.</li>
      <li><strong>Ausente no es cero.</strong> Que no haya pista de sonido significa que nadie preguntó;
        <code>kind: "none"</code> significa que el testigo declaró no haber oído nada. La misma distinción
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
    <h2>Parte tecnica: il file di osservazione</h2>
    <p>Quanto segue è per chi scrive questi file a mano, li genera o li legge nel codice. Nell'editor non serve conoscerne nulla.</p>
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
      <tr><td><code>version</code></td><td>La versione del formato: <code>4</code> (vedi Versioni del formato)</td></tr>
      <tr><td><code>id</code></td><td>Quale resoconto è, unico fra tutte le registrazioni ovunque: il giorno, poi chi l'ha visto (<code>"1964-04-24-ZamoraLonnie"</code>), o il luogo per un testimone anonimo (<code>"1964-04-24-Socorro"</code>). Ciò con cui un caso lo designa non è questo id ma quello del suo evento (vedi più sotto).</td></tr>
      <tr><td><code>time</code>, <code>endTime</code></td><td>La data scritta in <a href="https://www.loc.gov/standards/datetime/">EDTF</a>, nell'ora legale di <code>utcOffsetHours</code>, come la scrivono gli eventi di RR0: <code>"1964-04-24T17:50"</code>, <code>"1954"</code>, <code>"1948-07-24T02:45~"</code> (approssimativa), <code>"2025-06?"</code> (incerta), <code>"1965-07-01%"</code> (entrambe), <code>"19XX"</code> (un anno mascherato), <code>"2022-21"</code> (la primavera del 2022), o <code>"05:00"</code> da solo per un'ora ricordata senza la sua data. Ogni parte è facoltativa partendo da destra: è così che il formato esprime “1954” o “verso le 05:00”. È un sottoinsieme di EDTF (livello 0, questi qualificatori sull'intera data, anni mascherati, stagioni); <a href="https://www.npmjs.com/package/@rr0/time"><code>@rr0/time</code></a> è il modello EDTF completo di RR0, in cui gli strumenti di UFO@home convertono le date di una registrazione</td></tr>
      <tr><td><code>durationSeconds</code></td><td>Un'alternativa a <code>endTime</code>, e prevale se sono date entrambe</td></tr>
      <tr><td><code>durationText</code></td><td>La durata come è stata enunciata quando non era esatta: una durata ISO 8601 con un dubbio (<code>PT10M~</code>) o un intervallo (<code>PT5M/PT10M</code>). <code>durationSeconds</code> è allora l'unica durata a cui si riproduce, scelta a partire da essa</td></tr>
      <tr><td><code>utcOffsetHours</code></td><td>L'ora LEGALE su cui era regolato l'orologio del testimone (+1 per la Francia nel 1965). Se manca, viene approssimata dalla longitudine, che non può conoscere l'ora legale né un passaggio all'ora estiva</td></tr>
      <tr><td><code>timeZone</code></td><td>Il fuso IANA da cui è stato ricavato lo scarto (<code>"Europe/Paris"</code>): la regola, mentre <code>utcOffsetHours</code> è il numero che dava a quella data. Per collocare il cielo si legge solo il numero; il fuso è ciò che permette di ricavare di nuovo lo scarto quando la data cambia</td></tr>
      <tr><td><code>place</code></td><td>Dove è successo, come gli eventi di RR0 scrivono un luogo (il <code>PlaceJson</code> di <a href="https://www.npmjs.com/package/@rr0/place"><code>@rr0/place</code></a>): <code>{ name, locations: [{ lat, lng }] }</code>, dove <code>name</code> è il nome completo del luogo da cui sono state ricavate le coordinate</td></tr>
      <tr><td><code>observer</code></td><td><code>{ id, title, lastName, firstNames }</code>, tutti facoltativi; da omettere del tutto per un testimone anonimo. <code>id</code> è un riferimento alla persona (su RR0, la sua directory: <code>"ZamoraLonnie"</code>); gli altri campi la descrivono quando nessuno gliene ha ancora dato uno</td></tr>
      <tr><td><code>description</code></td><td>Il resoconto in prosa — una stringa, o una per lingua (vedi sotto)</td></tr>
      <tr><td><code>image</code>, <code>summary</code>, <code>summaryTime</code></td><td>Ciò che rappresenta l'osservazione dove è solo collegata e mai riprodotta: la scheda che mostra un link condiviso (vedi <a href="/docs/share/">Condividere</a>). <code>image</code> è un'immagine, un indirizzo (assoluto, relativo al file, o un percorso RR0 dalla radice del sito); <code>summary</code> una o due frasi, una stringa o una per lingua. Assenti, la scheda mostra il logo e dice chi l'ha vista, in quale caso e quando, per quanto lo dica il file. <code>summaryTime</code> è il secondo della registrazione in cui si fotografa l'immagine della scheda (0 per default: la prima immagine), per una registrazione la cui prima immagine non mostra il fenomeno; solo lo strumento di cattura del progetto lo legge, mai il lettore</td></tr>
      <tr><td><code>tags</code></td><td>Un elenco di stringhe, scritte in inglese: sono termini tecnici, e due registrazioni che ne condividono uno devono coincidere su di esso. A ogni lettore vengono mostrati nella sua lingua quando se ne conosce una traduzione, come avviene oggi per ${this.tags()}. L'elenco non è chiuso: qualsiasi altro viene mostrato come è scritto, e i codici di classificazione (<code>"RR3"</code>, <code>"NL"</code>) o i riferimenti di caso (<code>"Blue Book 8729"</code>) si scrivono così come sono. Uno cambia la riproduzione: <code>paralysis</code> tiene immobile la vista del testimone</td></tr>
      <tr><td><code>account</code></td><td>Chi l'ha visto e come ha viaggiato il resoconto: <code>observerAgeYears</code> (all'epoca), <code>observerBirth</code> (data di nascita, tenuta in fase con esso), <code>observerPerception</code> (visione dei colori, alcol, stanchezza: solo ciò che differisce da un testimone tipico), <code>observerOccupation</code>, <code>source</code> (come è arrivato a chi ha scritto la registrazione: <code>on-site</code>, <code>interview</code>, <code>telephone</code>, <code>questionnaire</code>, <code>letter</code>, <code>social-media</code>, <code>press</code>) e <code>followedUp</code> (se il testimone è stato ricontattato in seguito), e per i metodi di valutazione (vedi <a href="https://rr0.org/science/crypto/ufo/enquete/methode/Ballester-Guasp.html">Ballester-Guasp</a>): <code>observerOccupationKind</code> (<code>student</code>, <code>worker</code>, <code>farmer</code>, <code>homemaker</code>, <code>merchant</code>, <code>business</code>, <code>employee</code>, <code>artist</code>, <code>technician</code>, <code>police</code>, <code>pilot</code>, <code>military</code>), <code>observerGraduate</code>, <code>enquiryMinutes</code> (tempo passato dall'inquirente con il testimone), <code>observersRelation</code> (<code>friends</code>, <code>family</code>, <code>professional</code>, <code>none</code>), <code>activity</code> (<code>leisure</code>, <code>travelling</code>, <code>cultural</code>, <code>working</code>) e <code>strangeness</code> (ciascuno dei sette fattori giudicati dagli inquirenti, vero o falso: <code>appearance</code>, <code>movement</code>, <code>incongruity</code>, <code>detection</code>, <code>close</code>, <code>beings</code>, <code>traces</code>)</td></tr>
      <tr><td><code>sources</code></td><td>Dove leggere il resoconto così come è stato dato, nella forma di una <a href="https://www.npmjs.com/package/@rr0/data">fonte RR0</a>: <code>[{ type, title, authors, url, publication: { publisher, time }, index }]</code>, con <code>type</code> <code>book</code> o <code>article</code>, o niente per una pagina web o un post, che è allora solo il suo <code>url</code>. Mostrate nel pannello <q>?</q> del lettore, come link quando hanno un indirizzo; riprese così come sono in un fascicolo RR0</td></tr>
      <tr><td><code>milestones</code></td><td>I momenti con un nome del resoconto, mostrati sulla barra di riproduzione: <code>[{ t, label, note }]</code>, dove <code>label</code> è la lettera o il numero che usa il resoconto stesso (<code>"A"</code>, <code>"B"</code>) o un paio di parole, e <code>note</code> ciò che è accaduto allora, con le parole del resoconto quando possibile (una stringa, o una per lingua)</td></tr>
      <tr><td><code>roads</code></td><td>Le strade o i sentieri che disegna la pianta del resoconto stesso, quando la mappa non li ha: <code>[{ id, title, surface, widthM, path, source }]</code>, dove <code>surface</code> è <code>paved</code>, <code>gravel</code> o <code>dirt</code>, <code>path</code> la linea mediana come <code>[{ eastM, northM }]</code> dal luogo del testimone all'inizio, e <code>source</code> la pianta o il rilievo da cui è stata ricavata</td></tr>
    </table>
    </div>

    <h2>Più testimoni: il caso</h2>
    <p>Ogni testimone ha una registrazione propria, e una registrazione non dice a quale caso
      appartiene: un resoconto sta in piedi da solo. Ciò che li mostra insieme è il
      <strong>caso</strong>, che li nomina: il
      <code>case.json</code> di un fascicolo <a href="https://rr0.org">RR0</a>, che indica il
      titolo, la data e la classificazione del caso, ed elenca tutto ciò che vi è accaduto come
      <code>events</code>. I suoi eventi di tipo <code>sighting</code> sono i suoi resoconti, ciascuno dei quali
      punta alla registrazione di un testimone:</p>
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
      <tr><td><code>events</code></td><td>La cronologia del caso. Vengono riprodotti solo i <code>sighting</code>, ciascuno tramite il suo <code>url</code>, letto rispetto all'indirizzo del file di caso stesso (così lo stesso caso funziona dalla pagina del suo fascicolo e da qualsiasi altro luogo); quelli contrassegnati da <code>interpretationOf</code> sono letture di uno di essi (vedi sotto); gli altri (un articolo, un filmato, una confessione) sono di RR0 Un evento porta un <code>id</code> quando una lettura lo designa, e solo allora: appartiene al caso, quindi deve essere unico fra gli eventi del caso e in nessun altro posto, e un riferimento si legge nel file che lo scrive. Un <code>interpretationOf</code> che nessun evento porta è letto, come prima, come l'<code>id</code> che dichiara una registrazione che il caso elenca; quello che non corrisponde a nessuno dei due è un difetto del caso, che il lettore segnala sulla sua console, l'editor sopra le sue registrazioni, e il <code>validate.py</code> dello skill quando gli si dà il file del caso.</td></tr>
      <tr><td><code>image</code>, <code>summary</code></td><td>Ciò che mostra un link condiviso al caso, come per una registrazione (vedi <a href="/docs/share/">Condividere</a>): un'immagine, e una o due frasi, una stringa o una per lingua</td></tr>
    </table>
    </div>
    <p>Dallo a <code>&lt;rr0-sighting src&gt;</code> o al lettore, e ogni testimone potrà essere
      scelto da un elenco. Una registrazione può essere data direttamente, senza caso, ma un caso con un solo
      avvistamento funziona allo stesso modo e nomina ciò che mostra. Provalo con
      <a href="/demo-data/case-chiles-whitted.json"><code>case-chiles-whitted.json</code></a>
      (<a href="/play/?file=/demo-data/case-chiles-whitted.json">riproducilo</a>).</p>

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
      di un campo vuoto: una traduzione mancante non deve mai trasformare qualcosa che il testimone
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
      condividere una linea temporale (il fenomeno, una fiamma che lo segue, una seconda luce) — e una <code>shape</code>. <code>timeline.span</code>
      indica quanto dura l'osservazione, in millisecondi, quando dura più dell'ultimo fotogramma chiave: un fenomeno che lascia
      l'immagine prima della fine del film. Senza di esso la linea temporale si considera finita al suo ultimo fotogramma chiave ed è
      allungata sulla durata dichiarata dell'osservazione, così che tutto ciò che la registrazione colloca avanza più lentamente del
      film sovrapposto.</p>
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
      <tr><td><code>kind</code></td><td><code>oval</code>, oppure <code>polygon</code>, che allora prende anche <code>points</code>: <code>[{ x, y }]</code> in pixel dall'angolo in alto a sinistra di <code>bounds</code>, estesi sulla sua larghezza e altezza, così che il contorno si allunghi con esso quando l'angolo ridimensiona il riquadro. Quando <code>bounds</code> è omesso (il caso comune: è derivato da <code>aim</code> e <code>angular</code>), scrivere <code>points</code> come FRAZIONI del riquadro, da 0 a 1, e non in pixel</td></tr>
      <tr><td><code>title</code></td><td>Il suo nome, mostrato quando il puntatore ci passa sopra; una stringa, o una per lingua</td></tr>
      <tr><td><code>color</code></td><td>Qualsiasi colore CSS</td></tr>
      <tr><td><code>angle</code></td><td>La sua inclinazione, in radianti attorno al proprio centro, positiva in senso orario sullo schermo</td></tr>
      <tr><td><code>transparency</code></td><td>Da 0 opaco a 1 invisibile</td></tr>
      <tr><td><code>haloScale</code></td><td>Il bagliore intorno; 0 per nessuno</td></tr>
      <tr><td><code>brightness</code></td><td>Quanto abbaglia: un velo, le punte del diaframma, un nucleo saturato al bianco</td></tr>
      <tr><td><code>blur</code></td><td>Quanto indistinti il testimone ha detto che apparivano i bordi</td></tr>
      <tr><td><code>angular</code></td><td>La sua dimensione apparente in gradi — vedi sotto</td></tr>
      <tr><td><code>aim</code></td><td>Dove si trovava nel cielo del testimone: la direzione del suo centro, <code>azimuthDeg</code> in senso orario dal nord vero e <code>altitudeDeg</code> sopra l'orizzonte. Non la direzione in cui guardava il testimone, che è l'<code>headingDeg</code> e il <code>pitchDeg</code> della posa — vedi sotto</td></tr>
    </table>
    </div>
    <p><strong><code>aim</code> lo colloca, <code>angular</code> lo dimensiona.</strong> <code>bounds</code>
      è la proiezione di entrambi sulla tela fissa di 640×360 con la direzione e il campo visivo della
      posa, attraverso lo strumento della registrazione stessa; viene ricavato di nuovo al caricamento, così
      un file sopravvive a un cambiamento di tela, di campo visivo, di strumento, o di dove guardava
      il testimone. Se i pixel e gli angoli dovessero divergere, vincono gli angoli: spostare
      <code>bounds</code> in un file non ha effetto finché c'è <code>aim</code>. Un file scritto a mano
      può omettere <code>bounds</code> del tutto.</p>
    <p><code>timeline.order</code> è l'ordine di disegno da dietro in avanti, <code>timeline.groups</code> i
      gruppi di forme, <code>{ id, title, members }</code>: un membro è il <code>sourceId</code> di una forma o l'<code>id</code>
      di un altro gruppo, così che un gruppo può contenere gruppi (un fenomeno e quelle delle sue luci che lampeggiano insieme);
      una forma o un gruppo è in un gruppo al massimo, e un gruppo ha almeno 2 membri. Entrambi facoltativi.</p>

    ${this.further("it")}

    <h2>Da dove viene ogni valore</h2>
    <p>Qualsiasi valore di una registrazione può essere scritto così com'è, o avvolto con la sua provenienza:</p>
    <pre data-json=""><code>{
  "durationSeconds": {
    "value": 15,
    "basis": "derived",
    "rationale": "Da 13 a 18 s nella sintesi dell'inquirente; preso il valore medio"
  }
}</code></pre>
    <p><code>basis</code> è, dal più forte al più debole, <code>established</code> (accertato fuori
      dalla testimonianza e fuori dalla ricostruzione: un documento, un registro, un rilievo, la
      misura di un terzo; <code>rationale</code> nomina la fonte), <code>measured</code> (letto su uno
      strumento o un calibro), <code>stated</code> (l'ha detto il testimone, ed è ciò che significa un valore
      semplice), <code>derived</code> (ricavato da ciò che ha detto più qualcosa di verificabile: la larghezza di una
      strada, una mappa, un disegno misurato; <code>rationale</code> dà il ragionamento),
      <code>assumed</code> (scelto perché la ricostruzione abbia comunque un valore, senza basarsi su nulla di ciò che
      il testimone ha detto) o <code>fitted</code> (spostato, entro ciò che si sa, per vedere se
      un'ipotesi può combaciare; <code>rationale</code> dice quale). L'elenco dei valori <code>assumed</code> è l'elenco di ciò per cui tornare dal testimone
      o al fascicolo, ed è per questo che vale la pena scriverlo anche quando non si scrive nient'altro.
      <code>rationale</code> è una stringa, o una per lingua come un titolo (<code>{ "fr": "…", "en": "…" }</code>): un rapporto sul caso
      si legge nella lingua del suo lettore.</p>
    <p><code>source</code> nomina ciò su cui il valore si appoggia, cosa che una base non fa: la base
      dice di che GENERE è, questo dice QUALE — la cosa che qualcuno andrebbe a guardare. Una alla
      volta: <code>said</code> (<code>{ interview, segment, range }</code>, il passaggio di
      un'intervista del fascicolo in cui è stato detto, dove <code>interview</code> è l'<code>id</code>
      di quell'evento e <code>segment</code> il turno di parola), <code>document</code> con
      <code>at</code> (una pagina, il numero di una domanda) e <code>url</code>, <code>picture</code>
      (l'<code>id</code> di una foto della registrazione su cui è stato misurato) o <code>tool</code>
      (SVH, IPACO, QGIS, un teodolite). Un'ipotesi di lavoro non ne nomina alcuna, che è ciò che
      <code>assumed</code> e <code>fitted</code> già dicono, e dargliene una sarebbe l'unica bugia
      che questo campo esiste per impedire.</p>
    <p>Una fonte <code>said</code> è anche tutta la storia di ciò che il testimone ha detto. Un
      testimone da cui si torna corregge alcune cose e lascia il resto in piedi: un valore corretto
      cita l'intervista PIÙ RECENTE, mentre quello che nessuno ha ripreso continua a citare LA PRIMA.
      Quale intervista cita ciascun valore <em>è</em> il registro di ciò che è cambiato e di ciò che
      non è cambiato, e non c'è nessuna versione della ricostruzione da conservare per mostrarlo.
      Quale sia la più recente spetta al fascicolo dirlo, dalle date dei suoi eventi di intervista.</p>
    <p>Nell'editor si scrive nella finestra della pastiglia di base del valore: su che cosa si basa,
      poi i campi di quel genere. I passaggi proposti sono le interviste del fascicolo, quindi una
      registrazione aperta da sola non ne propone alcuno; le foto proposte sono quelle della
      registrazione. Una base libera non propone alcun campo.</p>
    <p>I due estremi di questo elenco sono ciò che impedisce a una somiglianza di passare per una
      prova. Solo ciò che è <code>established</code> non deve nulla alla testimonianza né alla
      ricostruzione: è questo a renderlo l'unica cosa contro cui giudicare una ricostruzione. Un
      valore <code>fitted</code> è l'opposto: più una ricostruzione ne contiene, più è facile
      ottenere una somiglianza, quindi nulla viene mai confrontato con uno di essi. Spostarlo non è
      una contraddizione e concordare con esso non è un risultato: è lì per essere spostato.</p>
    <p><code>range</code> dice fin dove ciò che si sa lascia andare un valore, quando è più del valore: il minimo e il massimo di un
      numero (<code>[50, 52]</code>), o l'intervallo EDTF di una data (<code>"1976-06/1976-07"</code>). Il valore è quello scelto al suo
      interno per disegnare la scena. Una lettura dell'osservazione può spostarlo ovunque nel suo intervallo, e contraddice ciò che si sa
      oltre; un valore indicato o dedotto senza intervallo è ciò che si sa, uno supposto senza intervallo è libero.</p>

    <h2>Verificare un file</h2>
    <p>Il formato è pubblicato anche come <a href="${new URL(FormatVersion.schemaUrl("sighting")).pathname}">JSON Schema</a>,
      generato dagli stessi tipi del lettore: ogni chiave che conosce, ciò che ciascuna può
      contenere, e le parole che accetta un elenco chiuso. Una chiave scritta male o un valore
      sconosciuto non lo superano. Non dice nulla di ciò che si può omettere, che è una questione di senso a cui
      risponde questa pagina. Per vedere il risultato, apri il file nel <a href="/play/">lettore</a>,
      da un link, o dal tuo disco con le immagini e i modelli che nomina. Il lettore
      lo verifica allo stesso modo al caricamento, e indica dietro un ⚠ sull'immagine ciò che non ha potuto riprodurre
      così come è scritto: una chiave che nulla legge, una parola fuori dal suo elenco, e ciò che ha dovuto
      inventare perché il primo fotogramma chiave di una forma lo ometteva (un campo mantenuto dal
      fotogramma chiave precedente è la regola di cui sopra, non un problema).</p>

    <h3>Versioni del formato</h3>
    <p>Un file indica la versione del suo formato in <code>version</code>: <code>4</code> da novembre 2026. È la versione del FORMATO, non quella di UFO@home: aggiungere un campo non la
      cambia, poiché un lettore ignora ciò che non conosce. Cambia solo il giorno in cui un campo cambia senso o forma.</p>
    <p>Un lettore legge UNA sola versione e rifiuta qualsiasi altra, più recente o più vecchia, con un messaggio che lo dice,
      anziché riprodurre qualcosa di diverso da ciò che il file dice. Le versioni precedenti non vengono convertite alla
      lettura: un file scritto in una di esse viene portato avanti con uno strumento, <code>scripts/migrate-recordings.ts</code>,
      fuori dal lettore, e un file condiviso sotto una versione precedente continua a riprodursi perché una condivisione fissa
      l'UFO@home che lo legge (vedi Condivisione).</p>
    <p>Che cosa ha cambiato ogni versione, ed è ciò che quello strumento conosce. La versione 2 scrive <code>time</code> ed
      <code>endTime</code> come testo EDTF anziché come campi di una data (<code>{ "year": 1964, "month": 4, … }</code>), e
      <code>place</code> come un luogo anziché come un elenco di posizioni ciascuna con il proprio nome, perché una
      registrazione e un evento di RR0 dicano «quando» e «dove» allo stesso modo. La versione 3 dice di chi è ogni evento
      tramite un id (<code>who</code>, vedi gli eventi sopra), e scrive un gruppo di forme come <code>{ id, members }</code>
      anziché l'elenco dei suoi membri; le forme che un <code>blink</code> elencava nelle sue <code>parts</code> diventano un
      gruppo a sé. La versione 4 chiama <code>snapshots</code> ciò che la versione 3 chiamava <code>frozen</code>, poiché ciò che
      contiene è una copia di quanto hanno risposto le fonti, non l'originale congelato da qualche parte.</p>
    <p>Ogni versione ha il suo schema, a un indirizzo che la nomina:
      <code>https://ufoathome.org/schema/4/sighting.schema.json</code> (e
      <code>case.schema.json</code>, <code>interview.schema.json</code> accanto).
      <code>/sighting.schema.json</code> è sempre la versione corrente. Un file può nominare quella
      secondo cui è stato scritto in <code>"$schema"</code>, che editor come VS Code usano per
      verificarlo durante la digitazione; il lettore non lo legge.</p>

    <h2>Un file completo</h2>
    <p>La registrazione più piccola che esprima ancora qualcosa — un ovale silenzioso che attraversa il cielo in
      dodici secondi, in una data reale e in un luogo reale. Tutto il resto del formato è facoltativo, e
      tutto ciò che segue ha una funzione:</p>
    <pre data-json=""><code>${this.escape(this.example)}</code></pre>
    <p class="small">Per modificarlo e vederlo riprodotto, incollalo nell'<a href="/edit/">editor</a>,
      che completa ogni chiave del formato, propone le parole che ciascuna accetta, e
      dice ciò che il modello ne dice.</p>
    <p>È <a href="/demo-data/example-minimal.json"><code>/demo-data/example-minimal.json</code></a>
      su questo sito, quindi puoi scaricarlo, e
      <a href="/play/?file=/demo-data/example-minimal.json">riprodurlo</a> prima di cambiare
      qualsiasi cosa. Nota che compaiono sia <code>angular</code> sia <code>bounds</code>: l'angolo è ciò che
      il file SIGNIFICA, e i pixel ne vengono ricavati di nuovo al caricamento — scrivi l'angolo, e lascia
      che una stima errata dei pixel venga corretta per te.</p>

    <h2>Altri più grandi da leggere</h2>
    <p>Ogni demo di questo sito è un semplice file che puoi aprire. Questi quattro sono quelli che vale la pena
      leggere per vedere come è costruita una registrazione reale:</p>
    <div class="table-scroll">
    <table>
      <tr><th>File</th><th>Che cosa guardarci</th></tr>
      <tr><td><a href="/demo-data/observer-chiles.json"><code>observer-chiles.json</code></a></td><td>Un caso reale: un testimone, un id di caso condiviso con una seconda registrazione, dieci fotogrammi chiave, un <code>weatherTrack</code> consultato con il suo <code>weatherSource</code></td></tr>
      <tr><td><a href="/demo-data/sky-test-halos.json"><code>sky-test-halos.json</code></a></td><td>Nessun fenomeno: un cielo preparato una volta (un solo fotogramma chiave di <code>weatherTrack</code>, un velo di cirrostrati e l'allineamento dei suoi cristalli), fotografato con un <code>instrument</code>, un telefono, il cui <code>observerTrack</code> ruota, si inclina, rolla e zooma, e sposta con sé i riflessi dell'obiettivo</td></tr>
      <tr><td><a href="/demo-data/sky-test-clouds.json"><code>sky-test-clouds.json</code></a></td><td>Tre strati di nuvole con altitudine, spessore, dimensione, densità e vento in metri, che evolvono sulla linea temporale del meteo — e nel primo una voce <code>instances</code>: una nuvola del campo, collocata e dimensionata in metri, che cresce e si scurisce nel corso dei due minuti</td></tr>
      <tr><td><a href="/demo-data/sky-test-aircraft.json"><code>sky-test-aircraft.json</code></a></td><td>Un <code>instrument</code>, un <code>exposureSeconds</code> e un <code>iso</code>, e un aeromobile di <code>decor</code> con una <code>track</code> e nove <code>lights</code> alle loro cadenze di lampeggio reali, fari di atterraggio compresi</td></tr>
      <tr><td><a href="/demo-data/sky-test-reentry.json"><code>sky-test-reentry.json</code></a></td><td>Nessun fenomeno: <code>skyEvents</code> con una <code>reentries</code>, il lanciatore di Zond 4 che si disintegra sopra il Kentucky nel 1968, il percorso derivato e orario, quote e luminosità supposti, ogni valore con la sua provenienza</td></tr>
      <tr><td><a href="/demo-data/observer-csg2-falcon.json"><code>observer-csg2-falcon.json</code></a></td><td>Il resoconto di Ron Lee (SeeSat-L) del secondo stadio che lanciò CSG-2 (Falcon 9, 31 gennaio 2022), visto da Falcon (Colorado) mentre frenava per lasciare l'orbita e scaricava i serbatoi ruotando: <code>skyEvents</code> con una <code>launches</code> con <code>jets</code>, l'orbita tratta dagli elementi Space-Track di CSG-2, la frenata, gli scarichi e la rotazione supposti con la loro provenienza; una delle tre viste di <a href="/demo-data/case-csg2.json"><code>case-csg2.json</code></a>, le altre la sua ascesa vista da Nassau e la sua fine vista da Oklahoma City, testimoni supposti</td></tr>
      <tr><td><a href="/demo-data/sky-test-laser-meudon.json"><code>sky-test-laser-meudon.json</code></a></td><td>Nessun fenomeno: <code>skyEvents</code> con un <code>beams</code>, il laser verde da 10 W che l'Osservatorio di Parigi sparò dalla sua cupola di Meudon a quella di Parigi il 9 ottobre 2026, visto dal parco di Meudon, l'altezza dell'emettitore e l'apertura supposte con la loro provenienza, la luce calcolata</td></tr>
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
      <li><strong>Il dichiarato prevale sul dedotto.</strong> <code>occludesSourceIds</code> registra affermazioni del testimone. Niente in questo formato
        <em>può</em> dedurle: descrive un aspetto in un campo visivo, non una posizione nello
        spazio.</li>
      <li><strong>Assente non è zero.</strong> Nessuna traccia sonora significa che nessuno l'ha chiesto;
        <code>kind: "none"</code> significa che il testimone ha riferito di non aver sentito nulla. La stessa distinzione
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
