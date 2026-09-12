import { DocsSection } from "./DocsSection.js"
import type { PageMeta, Said, SiteLanguage } from "../SitePage.js"

/**
 * "How do I make one?" — the editor, and then the file it writes.
 *
 * The two are one page rather than two because they are the same task at two levels: almost
 * everybody wants the first paragraph, and the ones who want the second want it after having seen
 * what the first produces.
 */
export class DocsCreatePage extends DocsSection {

  readonly meta: PageMeta = {
    slug: "docs/create",
    navLabel: { en: "Creating an observation", fr: "Créer une observation" },
    title: { en: "Create an observation", fr: "Créer une observation" },
    description: {
      en: "Two ways to make a recording: in the editor, or by writing the file yourself — with the "
        + "format field by field and a whole working example.",
      fr: "Deux façons de faire un enregistrement : dans l'éditeur, ou en écrivant le fichier "
        + "vous-même — avec le format champ par champ et un exemple entier qui marche."
    },
    asideFromNav: true
  }

  private readonly lede: Said<string> = {
    en: "Draw it in the editor, or write the file yourself. Both produce the same thing: one JSON "
      + "file that is yours, and that anybody can replay.",
    fr: "Dessinez-la dans l'éditeur, ou écrivez le fichier vous-même. Les deux produisent la même "
      + "chose : un fichier JSON qui est le vôtre, et que n'importe qui peut rejouer."
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
   * Turns the quoted example into something to type in.
   *
   * A format is learnt by trying it, not by reading a listing of it — and the editor already knows
   * every key this file could have, because its completion is generated from the same types the
   * table above describes. So the reader can take the smallest working recording and see what else
   * would fit in it, right where they are reading about it.
   *
   * Nothing here plays: this page is about the file. The <pre> stays until CodeMirror arrives and
   * stays for good if it never does, so a reader without it still has the example.
   */
  script(): string {
    return `const source = document.getElementById("example-source")
const mount = document.getElementById("example-editor")
if (source && mount) {
  void (async () => {
    try {
      const { JsonEditor } = await import(SITE_LIB + "/site-json-editor.mjs")
      new JsonEditor(mount, source.textContent.trimEnd())
      source.hidden = true
    } catch {
      /* No editor, then. The listing is still there and still says the same thing. */
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
    <h2>1. In the editor</h2>
    <p>The ordinary way, and the one to use unless you have a reason not to. Draw what was seen, say
      when and where, record how it moved — and the sky, the weather and the ground are looked up
      for you rather than remembered.</p>
    <p class="doc-try-actions">
      <a class="btn btn-primary" href="/edit/">Open the editor</a>
      <a class="btn" href="/edit/#manual">Read the manual</a>
    </p>
    <p>It ends with <strong>Export</strong>, which hands you a file. That file is the whole
      recording: there is no account and nothing kept here. Put it somewhere with a public address
      and it is ready to <a href="/docs/share/">share</a>.</p>
    <p>Already have one and want to change it? The editor opens on an existing recording — the
      <q>?</q> panel of every published reconstruction carries the link that does it.</p>
  </div>
</section>

<section class="band">
  <div class="wrap prose-wide">
    <h2>2. By hand, or from your own archive</h2>
    <p>A recording is a file with a documented shape, so nothing stops you writing one in a text
      editor, or generating a thousand from a database you already have. Everything below is what
      the editor itself writes.</p>
  </div>
</section>
<section class="band">
  <div class="wrap prose-wide">
    <p>A recording is a plain JSON file. Nothing in it is a binary blob, an id into a database, or a
      reference to this site — you can write one by hand, generate one from your own archive, or diff
      two of them in a code review.</p>

    <h3>The observation</h3>
    <div class="table-scroll">
    <table>
      <tr><th>Field</th><th>Meaning</th></tr>
      <tr><td><code>version</code></td><td>Always <code>1</code></td></tr>
      <tr><td><code>time</code>, <code>endTime</code></td><td><code>{ year, month, day, hour, minute, second }</code>, every part optional — that is how the format states “1954” or “around 05:00”</td></tr>
      <tr><td><code>durationSeconds</code></td><td>An alternative to <code>endTime</code>, and it wins if both are given</td></tr>
      <tr><td><code>utcOffsetHours</code></td><td>The LEGAL time the witness's clock was on (+1 for France in 1965). Absent means it is approximated from the longitude, which cannot know legal time or a daylight-saving switch</td></tr>
      <tr><td><code>place</code></td><td><code>[{ lat, lng, name }]</code> — <code>name</code> is the fully qualified place name the coordinates were resolved from</td></tr>
      <tr><td><code>witness</code></td><td><code>{ id, dirName, title, lastName, firstNames }</code>, all optional; omit entirely for an anonymous witness</td></tr>
      <tr><td><code>caseId</code></td><td>Shared by every witness's own file for the same case — what lets a manifest group them</td></tr>
      <tr><td><code>description</code></td><td>The account in prose — one string, or one per language (see below)</td></tr>
      <tr><td><code>tags</code></td><td>A list of strings, written in English: they are technical terms, and two recordings that share one have to match on it. Each reader is shown them in their own language where a translation is known</td></tr>
    </table>
    </div>

    <h3>Saying it in more than one language</h3>
    <p>A recording is handed from one reader to another, so every field an author writes can hold
      one string per language instead of one: <code>description</code>, a shape's or a decor
      object's <code>title</code>, and a milestone's <code>label</code> and <code>note</code>.</p>
    <pre><code>"description": {
  "fr": "Tout le témoignage de Lonnie Zamora, d'un seul tenant…",
  "en": "Lonnie Zamora's whole testimony, of a piece…"
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

    <h3>What was seen</h3>
    <p><code>timeline.keyframes</code> is a list of <code>{ t, shapes }</code>, <code>t</code> in
      milliseconds from the start. Each shape carries a <code>sourceId</code> — several shapes can
      share one timeline (the phenomenon, a trailing flame, a second light) — and a <code>shape</code>:</p>
    <pre><code>{
  "kind": "oval",          // or "polygon", which then also takes "points"
  "bounds": { "x": 0, "y": 0, "width": 0, "height": 0 },
  "color": "#39ff14",      // any CSS colour
  "angle": 0,              // radians
  "transparency": 0,       // 0 opaque .. 1 invisible
  "haloScale": 1.5,        // 0 = no glow
  "brightness": 0,         // how dazzling: a veil, aperture spikes, a core clipped to white
  "blur": 0,               // how indistinct the witness said the edges looked
  "selected": false,
  "title": "the phenomenon",
  "angular": { "widthDeg": 1.2, "heightDeg": 0.4 }
}</code></pre>
    <p><strong><code>angular</code> is the authority.</strong> <code>bounds</code> is that angle
      projected onto the fixed 640×360 canvas at the pose's own field of view and through the
      recording's own instrument; it is re-derived on load, so a file survives a change of canvas,
      of field of view or of instrument. If the two ever disagree, the angle wins.</p>
    <p><code>timeline.order</code> is the back-to-front paint order, <code>timeline.groups</code> the
      grouped source ids. Both optional.</p>

    <h3>Everything around it</h3>
    <div class="table-scroll">
    <table>
      <tr><th>Field</th><th>Meaning</th></tr>
      <tr><td><code>witnessTrack</code></td><td><code>{ keyframes: [{ t, pose }] }</code> — <code>pose</code> holds <code>lat</code>, <code>lng</code>, <code>elevationM</code> (above the local ground), <code>headingDeg</code>, <code>pitchDeg</code>, <code>rollDeg</code>, <code>fovDeg</code>, and for a camera <code>fNumber</code> and <code>focusDistanceM</code></td></tr>
      <tr><td><code>weatherTrack</code></td><td><code>{ keyframes: [{ t, weather }] }</code> — the sky's conditions along the recording: precipitation, wind, storm, and the clouds as layers with real heights, each able to hold individual clouds placed in metres. Every field of a <code>weather</code> is in the next section</td></tr>
      <tr><td><code>weatherSource</code></td><td><code>{ id, name, url }</code> of the record the weather was looked up from. Its presence means the recording is replayed exactly as authored and never looked up again. Absent means the witness's own account</td></tr>
      <tr><td><code>soundTrack</code></td><td><code>{ keyframes: [{ t, sound }] }</code> — <code>kind</code> (none/hum/whistle/rumble/crackle), <code>volume</code>, <code>pitchHz</code>, optional <code>src</code> of a real recording</td></tr>
      <tr><td><code>references</code></td><td>Pictures of the place laid over the scene: <code>src</code> (an address, or a <code>data:</code> URL for a picture added from a disk), <code>kind</code> (photo/panorama), <code>registration</code> (<code>headingDeg</code>, <code>pitchDeg</code>, <code>rollDeg</code>, <code>fovDeg</code>), <code>opacity</code>, <code>credit</code>/<code>creditUrl</code>, optional <code>t</code> and <code>drawing</code>, and the <code>landmarks</code> it was lined up on (<code>id</code>, <code>label</code>, <code>picture</code> as <code>{ u, v }</code> from the top-left corner, <code>scene</code> as <code>{ azimuthDeg, altitudeDeg }</code>)</td></tr>
      <tr><td><code>instrument</code>, <code>exposureSeconds</code></td><td>What it was observed through, and how long the shutter was open. Absent means the naked eye</td></tr>
      <tr><td><code>decor</code></td><td>Scenery at a real <code>eastM</code>/<code>northM</code> from the witness: buildings (with <code>floors</code>, <code>windows</code>), trees, streetlights, vehicles, other witnesses, aircraft — optionally with a <code>track</code> and <code>lights</code> whose <code>pattern</code> carries a real flash rate</td></tr>
    </table>
    </div>

    <h3>The weather, and its clouds</h3>
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
      <tr><td><code>baseM</code>, <code>thicknessM</code></td><td>Metres. The base is above the recording's REFERENCE ground, not above a witness who climbs; a witness above the base is inside or over the deck, and the sky is drawn accordingly</td></tr>
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
      <tr><td><code>eastM</code>, <code>northM</code></td><td>Where its centre was at time zero, in metres from the witness's starting point. The wind carries it from there</td></tr>
      <tr><td><code>baseM</code>, <code>thicknessM</code></td><td>Its own base and height, metres — a cloud can sit lower or stand taller than its deck</td></tr>
      <tr><td><code>widthM</code>, <code>depthM</code>, <code>rotationDeg</code></td><td>Its footprint, metres, and the bearing that footprint is turned to</td></tr>
      <tr><td><code>density</code>, <code>darkness</code></td><td>Its own; darkness absent means the layer's</td></tr>
    </table>
    </div>
    <pre><code>"weather": {
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
}</code></pre>
    <p>A recording whose weather was <strong>looked up</strong> (it has a <code>weatherSource</code>)
      holds the record's answer, not a link to it: ERA5 gives the low, middle and high bands as three
      layers named <code>record-low</code>, <code>record-mid</code> and <code>record-high</code>, the
      low base estimated from the spread between temperature and dew point, the other two at 3 500 m
      and 8 000 m. Their type is <code>unknown</code> (cirrus for the high one), their size and
      density are drawing assumptions: a reanalysis knows how much of each band was covered, not what
      the clouds looked like. Ask the record again from the editor and the layers are rewritten; edit
      a layer by hand and the recording becomes the author's, the source dropped.</p>

    <h3>A whole file</h3>
    <p>The smallest recording that still states something — one silent oval crossing the sky over
      twelve seconds, on a real date at a real place. Everything else in the format is optional, and
      everything below is doing work:</p>
    <pre id="example-source"><code>${this.escape(this.example)}</code></pre>
    <div id="example-editor" class="code-view"></div>
    <p class="small">Yours to type in: it completes on every key the format has, offers the words
      each one accepts, and says what the model says about it. Nothing here is saved or played —
      when you want to see one run, <a href="/play/">the player</a> takes a file.</p>
    <p>It is <a href="/demo-data/example-minimal.json"><code>/demo-data/example-minimal.json</code></a>
      on this site, so you can fetch it, and
      <a href="/play/?sighting=/demo-data/example-minimal.json">play it</a> before changing
      anything. Note that <code>angular</code> and <code>bounds</code> both appear: the angle is what
      the file MEANS, and the pixels are re-derived from it on load — write the angle, and let a
      wrong guess at the pixels be corrected for you.</p>

    <h3>Larger ones to read</h3>
    <p>Every demo on this site is a plain file you can open. These four are the ones worth reading
      to see how a real recording is put together:</p>
    <div class="table-scroll">
    <table>
      <tr><th>File</th><th>What to look at in it</th></tr>
      <tr><td><a href="/demo-data/witness-chiles.json"><code>witness-chiles.json</code></a></td><td>A real case: a witness, a case id shared with a second recording, ten keyframes, a looked-up <code>weatherTrack</code> with its <code>weatherSource</code></td></tr>
      <tr><td><a href="/demo-data/sky-test-halos.json"><code>sky-test-halos.json</code></a></td><td>No phenomenon at all — a sky set up by its weather, with a <code>witnessTrack</code> of four poses that pans across the display</td></tr>
      <tr><td><a href="/demo-data/sky-test-clouds.json"><code>sky-test-clouds.json</code></a></td><td>Three cloud layers with metre-based altitude, thickness, size, density and wind, evolving on the weather timeline — and in the first one an <code>instances</code> entry: one cloud of the field, placed and sized in metres, that grows and darkens over the two minutes</td></tr>
      <tr><td><a href="/demo-data/sky-test-aircraft.json"><code>sky-test-aircraft.json</code></a></td><td>An <code>instrument</code> and an <code>exposureSeconds</code>, and a <code>decor</code> aircraft with a <code>track</code> and seven <code>lights</code> at their real flash rates</td></tr>
      <tr><td><a href="/demo-data/instrument-instamatic.json"><code>instrument-instamatic.json</code></a></td><td>The same sighting as <code>witness-socorro.json</code>, changed in one field. Diff the two</td></tr>
    </table>
    </div>

    <h3>Four rules that decide what a file means</h3>
    <ul class="plain">
      <li><strong>Discrete fields are held, continuous ones are blended.</strong> A shape left out of
        a later keyframe stays as it was; one whose first keyframe is at five seconds is already
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
    <h2>1. Dans l'éditeur</h2>
    <p>La voie ordinaire, et celle à prendre sauf raison contraire. Dessinez ce qui a été vu, dites
      quand et où, enregistrez le mouvement — et le ciel, la météo et le sol sont relevés pour vous
      plutôt que remémorés.</p>
    <p class="doc-try-actions">
      <a class="btn btn-primary" href="/edit/">Ouvrir l'éditeur</a>
      <a class="btn" href="/edit/#manual">Lire le manuel</a>
    </p>
    <p>Cela se termine par <strong>Exporter</strong>, qui vous remet un fichier. Ce fichier est
      l'enregistrement complet : il n'y a pas de compte, et rien n'est conservé ici. Posez-le
      quelque part avec une adresse publique et il est prêt à <a href="/docs/share/">partager</a>.</p>
    <p>Vous en avez déjà un et voulez le modifier ? L'éditeur s'ouvre sur un enregistrement
      existant — le panneau <q>?</q> de toute reconstitution publiée porte le lien qui le fait.</p>
  </div>
</section>

<section class="band">
  <div class="wrap prose-wide">
    <h2>2. À la main, ou depuis vos propres archives</h2>
    <p>Un enregistrement est un fichier de forme documentée : rien ne vous empêche d'en écrire un
      dans un éditeur de texte, ni d'en engendrer mille depuis une base que vous avez déjà. Tout ce
      qui suit est ce que l'éditeur lui-même écrit.</p>
  </div>
</section>
<section class="band">
  <div class="wrap prose-wide">
    <p>Un enregistrement est un simple fichier JSON. Rien dedans n'est un blob binaire, un
      identifiant dans une base de données, ni une référence à ce site — vous pouvez en écrire un à
      la main, en engendrer depuis vos propres archives, ou en comparer deux dans une relecture de
      code.</p>

    <h3>L'observation</h3>
    <div class="table-scroll">
    <table>
      <tr><th>Champ</th><th>Sens</th></tr>
      <tr><td><code>version</code></td><td>Toujours <code>1</code></td></tr>
      <tr><td><code>time</code>, <code>endTime</code></td><td><code>{ year, month, day, hour, minute, second }</code>, chaque partie facultative — c'est ainsi que le format énonce « 1954 » ou « vers 05:00 »</td></tr>
      <tr><td><code>durationSeconds</code></td><td>Une alternative à <code>endTime</code>, et c'est elle qui l'emporte si les deux sont là</td></tr>
      <tr><td><code>utcOffsetHours</code></td><td>L'heure LÉGALE de la montre du témoin (+1 pour la France en 1965). Absent, elle est approchée depuis la longitude, qui ne peut connaître ni l'heure légale ni un changement d'heure</td></tr>
      <tr><td><code>place</code></td><td><code>[{ lat, lng, name }]</code> — <code>name</code> est le nom qualifié depuis lequel les coordonnées ont été résolues</td></tr>
      <tr><td><code>witness</code></td><td><code>{ id, dirName, title, lastName, firstNames }</code>, tous facultatifs ; à omettre entièrement pour un témoin anonyme</td></tr>
      <tr><td><code>caseId</code></td><td>Partagé par le fichier de chaque témoin d'un même dossier — ce qui permet à un manifeste de les réunir</td></tr>
      <tr><td><code>description</code></td><td>Le récit en prose — une chaîne, ou une par langue (voir plus bas)</td></tr>
      <tr><td><code>tags</code></td><td>Une liste de chaînes, écrites en anglais : ce sont des termes techniques, et deux enregistrements qui en partagent un doivent s'y égaler. Chaque lecteur les voit dans sa langue lorsqu'une traduction est connue</td></tr>
    </table>
    </div>

    <h3>Le dire en plusieurs langues</h3>
    <p>Un enregistrement se transmet d'un lecteur à un autre : chaque champ écrit par un auteur peut
      donc porter une chaîne par langue au lieu d'une seule — <code>description</code>, le
      <code>title</code> d'une forme ou d'un élément de décor, le <code>label</code> et la
      <code>note</code> d'un repère.</p>
    <pre><code>"description": {
  "fr": "Tout le témoignage de Lonnie Zamora, d'un seul tenant…",
  "en": "Lonnie Zamora's whole testimony, of a piece…"
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

    <h3>Ce qui a été vu</h3>
    <p><code>timeline.keyframes</code> est une liste de <code>{ t, shapes }</code>, <code>t</code> en
      millisecondes depuis le début. Chaque forme porte un <code>sourceId</code> — plusieurs formes
      peuvent partager une chronologie (le phénomène, une flamme qui traîne, une seconde lumière) — et
      une <code>shape</code> :</p>
    <pre><code>{
  "kind": "oval",          // ou "polygon", qui prend alors aussi "points"
  "bounds": { "x": 0, "y": 0, "width": 0, "height": 0 },
  "color": "#39ff14",      // n'importe quelle couleur CSS
  "angle": 0,              // radians
  "transparency": 0,       // 0 opaque .. 1 invisible
  "haloScale": 1.5,        // 0 = aucune lueur
  "brightness": 0,         // l'éblouissement : un voile, les aigrettes du diaphragme, un cœur saturé au blanc
  "blur": 0,               // à quel point le témoin a dit les contours indistincts
  "selected": false,
  "title": "le phénomène",
  "angular": { "widthDeg": 1.2, "heightDeg": 0.4 }
}</code></pre>
    <p><strong>C'est <code>angular</code> qui fait foi.</strong> <code>bounds</code> est cet angle
      projeté sur le canevas fixe de 640×360 au champ de la pose et à travers l'instrument de
      l'enregistrement ; il est redérivé au chargement, si bien qu'un fichier survit à un changement
      de canevas, de champ ou d'instrument. Si les deux divergent, c'est l'angle qui gagne.</p>
    <p><code>timeline.order</code> est l'ordre de tracé de l'arrière vers l'avant,
      <code>timeline.groups</code> les identifiants groupés. Les deux sont facultatifs.</p>

    <h3>Tout ce qu'il y a autour</h3>
    <div class="table-scroll">
    <table>
      <tr><th>Champ</th><th>Sens</th></tr>
      <tr><td><code>witnessTrack</code></td><td><code>{ keyframes: [{ t, pose }] }</code> — <code>pose</code> porte <code>lat</code>, <code>lng</code>, <code>elevationM</code> (au-dessus du sol local), <code>headingDeg</code>, <code>pitchDeg</code>, <code>rollDeg</code>, <code>fovDeg</code>, et pour un appareil <code>fNumber</code> et <code>focusDistanceM</code></td></tr>
      <tr><td><code>weatherTrack</code></td><td><code>{ keyframes: [{ t, weather }] }</code> — l'état du ciel le long de l'enregistrement : précipitation, vent, orage, et les nuages en couches à hauteur réelle, chacune pouvant porter des nuages individuels placés en mètres. Chaque champ d'un <code>weather</code> est dans la section suivante</td></tr>
      <tr><td><code>weatherSource</code></td><td><code>{ id, name, url }</code> du relevé d'où vient la météo. Sa présence signifie que l'enregistrement est rejoué tel qu'il a été composé et n'est jamais reconsulté. Absent : le récit du témoin lui-même</td></tr>
      <tr><td><code>soundTrack</code></td><td><code>{ keyframes: [{ t, sound }] }</code> — <code>kind</code> (none/hum/whistle/rumble/crackle), <code>volume</code>, <code>pitchHz</code>, et un <code>src</code> facultatif vers un vrai enregistrement</td></tr>
      <tr><td><code>references</code></td><td>Photos des lieux posées sur la scène : <code>src</code> (une adresse, ou une URL <code>data:</code> pour une photo ajoutée depuis un disque), <code>kind</code> (photo/panorama), <code>registration</code> (<code>headingDeg</code>, <code>pitchDeg</code>, <code>rollDeg</code>, <code>fovDeg</code>), <code>opacity</code>, <code>credit</code>/<code>creditUrl</code>, <code>t</code> et <code>drawing</code> facultatifs, et les <code>landmarks</code> sur lesquels elle a été recalée (<code>id</code>, <code>label</code>, <code>picture</code> en <code>{ u, v }</code> depuis le coin haut gauche, <code>scene</code> en <code>{ azimuthDeg, altitudeDeg }</code>)</td></tr>
      <tr><td><code>instrument</code>, <code>exposureSeconds</code></td><td>À travers quoi l'observation a été faite, et combien de temps l'obturateur est resté ouvert. Absent : l'œil nu</td></tr>
      <tr><td><code>decor</code></td><td>Le décor, à une vraie distance <code>eastM</code>/<code>northM</code> du témoin : bâtiments (avec <code>floors</code>, <code>windows</code>), arbres, lampadaires, véhicules, autres témoins, aéronefs — éventuellement avec une <code>track</code> et des <code>lights</code> dont le <code>pattern</code> porte une vraie cadence d'éclats</td></tr>
    </table>
    </div>

    <h3>La météo, et ses nuages</h3>
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
      <tr><td><code>baseM</code>, <code>thicknessM</code></td><td>En mètres. La base est au-dessus du sol de RÉFÉRENCE de l'enregistrement, pas au-dessus d'un témoin qui grimpe ; un témoin plus haut que la base est dans la nappe ou au-dessus, et le ciel est dessiné en conséquence</td></tr>
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
      <tr><td><code>eastM</code>, <code>northM</code></td><td>Où était son centre à l'instant zéro, en mètres depuis le point de départ du témoin. Le vent l'emporte de là</td></tr>
      <tr><td><code>baseM</code>, <code>thicknessM</code></td><td>Sa propre base et sa propre hauteur, en mètres — un nuage peut être plus bas ou plus haut que sa nappe</td></tr>
      <tr><td><code>widthM</code>, <code>depthM</code>, <code>rotationDeg</code></td><td>Son emprise, en mètres, et le cap vers lequel cette emprise est tournée</td></tr>
      <tr><td><code>density</code>, <code>darkness</code></td><td>Les siens ; une obscurité absente est celle de la couche</td></tr>
    </table>
    </div>
    <pre><code>"weather": {
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

    <h3>Un fichier entier</h3>
    <p>Le plus petit enregistrement qui énonce encore quelque chose — un ovale silencieux traversant
      le ciel en douze secondes, à une date réelle et en un lieu réel. Tout le reste du format est
      facultatif, et tout ce qui suit sert à quelque chose :</p>
    <pre id="example-source"><code>${this.escape(this.example)}</code></pre>
    <div id="example-editor" class="code-view"></div>
    <p class="small">À vous d'y taper : il complète sur chaque clé du format, propose les mots que
      chacune accepte, et dit ce que le modèle en dit. Rien n'est enregistré ni joué ici — pour en
      voir une tourner, <a href="/play/">le lecteur</a> prend un fichier.</p>
    <p>C'est <a href="/demo-data/example-minimal.json"><code>/demo-data/example-minimal.json</code></a>
      sur ce site : vous pouvez le récupérer, et
      <a href="/play/?sighting=/demo-data/example-minimal.json">le jouer</a> avant d'y toucher.
      Remarquez que <code>angular</code> et <code>bounds</code> y figurent tous deux : l'angle est ce
      que le fichier SIGNIFIE, et les pixels en sont redérivés au chargement — écrivez l'angle, et
      laissez corriger une mauvaise estimation des pixels.</p>

    <h3>De plus gros, à lire</h3>
    <p>Chaque démo de ce site est un simple fichier que vous pouvez ouvrir. Ces quatre-là valent la
      lecture pour voir comment un vrai enregistrement est bâti :</p>
    <div class="table-scroll">
    <table>
      <tr><th>Fichier</th><th>Ce qu'il faut y regarder</th></tr>
      <tr><td><a href="/demo-data/witness-chiles.json"><code>witness-chiles.json</code></a></td><td>Un vrai dossier : un témoin, un identifiant de dossier partagé avec un second enregistrement, dix keyframes, un <code>weatherTrack</code> relevé avec son <code>weatherSource</code></td></tr>
      <tr><td><a href="/demo-data/sky-test-halos.json"><code>sky-test-halos.json</code></a></td><td>Aucun phénomène — un ciel réglé par sa météo, avec un <code>witnessTrack</code> de quatre poses qui balaie le cortège</td></tr>
      <tr><td><a href="/demo-data/sky-test-clouds.json"><code>sky-test-clouds.json</code></a></td><td>Trois couches nuageuses avec altitude, épaisseur, taille, densité et vent en mètres, évoluant sur la timeline météo — et dans la première une entrée <code>instances</code> : un nuage du champ, placé et dimensionné en mètres, qui grossit et s'assombrit sur les deux minutes</td></tr>
      <tr><td><a href="/demo-data/sky-test-aircraft.json"><code>sky-test-aircraft.json</code></a></td><td>Un <code>instrument</code> et un <code>exposureSeconds</code>, et un décor d'aéronef avec sa <code>track</code> et sept <code>lights</code> à leurs cadences réelles</td></tr>
      <tr><td><a href="/demo-data/instrument-instamatic.json"><code>instrument-instamatic.json</code></a></td><td>La même observation que <code>witness-socorro.json</code>, à un champ près. Comparez les deux</td></tr>
    </table>
    </div>

    <h3>Quatre règles qui décident du sens d'un fichier</h3>
    <ul class="plain">
      <li><strong>Les champs discrets sont tenus, les continus sont interpolés.</strong> Une forme
        absente d'un keyframe ultérieur reste dans son état ; une forme dont le premier keyframe est
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
    <p class="small">Le <a href="https://github.com/RR0/UfoAtHome#data-format">README</a> porte la
      référence complète, champ par champ, avec le raisonnement derrière chaque choix ; c'est lui qui
      fait foi si cette page et lui venaient à diverger.</p>
  </div>
</section>
`
  }
}
