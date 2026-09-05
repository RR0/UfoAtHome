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
      <a class="btn btn-primary" href="/editor/">Open the editor</a>
      <a class="btn" href="/editor/#manual">Read the manual</a>
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
      <tr><td><code>description</code>, <code>tags</code></td><td>Free text, and a list of strings</td></tr>
    </table>
    </div>

    <h3>What was seen</h3>
    <p><code>timeline.keyframes</code> is a list of <code>{ t, shapes }</code>, <code>t</code> in
      milliseconds from the start. Each shape carries a <code>sourceId</code> — several shapes can
      share one timeline (an object, a trailing flame, a second light) — and a <code>shape</code>:</p>
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
  "title": "the object",
  "behindCloud": false,    // STATED by the witness, never deduced
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
      <tr><td><code>weatherTrack</code></td><td><code>{ keyframes: [{ t, weather }] }</code> — cover, darkness, base, the high (icy) deck kept separate, crystal alignment, precipitation and its intensity, wind, storm</td></tr>
      <tr><td><code>weatherSource</code></td><td><code>{ id, name, url }</code> of the record the weather was looked up from. Its presence means the recording is replayed exactly as authored and never looked up again. Absent means the witness's own account</td></tr>
      <tr><td><code>soundTrack</code></td><td><code>{ keyframes: [{ t, sound }] }</code> — <code>kind</code> (none/hum/whistle/rumble/crackle), <code>volume</code>, <code>pitchHz</code>, optional <code>src</code> of a real recording</td></tr>
      <tr><td><code>instrument</code>, <code>exposureSeconds</code></td><td>What it was observed through, and how long the shutter was open. Absent means the naked eye</td></tr>
      <tr><td><code>decor</code></td><td>Scenery at a real <code>eastM</code>/<code>northM</code> from the witness: buildings (with <code>floors</code>, <code>windows</code>), trees, streetlights, vehicles, other witnesses, aircraft — optionally with a <code>track</code> and <code>lights</code> whose <code>pattern</code> carries a real flash rate</td></tr>
    </table>
    </div>

    <h3>A whole file</h3>
    <p>The smallest recording that still states something — one silent oval crossing the sky over
      twelve seconds, on a real date at a real place. Everything else in the format is optional, and
      everything below is doing work:</p>
    <pre><code>${this.escape(this.example)}</code></pre>
    <p>It is <a href="/demo-data/example-minimal.json"><code>/demo-data/example-minimal.json</code></a>
      on this site, so you can fetch it, and
      <a href="/player/?sighting=/demo-data/example-minimal.json">play it</a> before changing
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
      <tr><td><a href="/demo-data/sky-test-halos.json"><code>sky-test-halos.json</code></a></td><td>No object at all — a sky set up by its weather, with a <code>witnessTrack</code> of four poses that pans across the display</td></tr>
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
        are derived, as inequalities, from what the object was stated to pass behind or in front of
        (<code>decor[].occludesSourceIds</code>).</li>
      <li><strong>Declared outranks deduced.</strong> <code>behindCloud</code> and
        <code>occludesSourceIds</code> are statements by the witness. Nothing in this format
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
      <a class="btn btn-primary" href="/editor/">Ouvrir l'éditeur</a>
      <a class="btn" href="/editor/#manual">Lire le manuel</a>
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
      <tr><td><code>description</code>, <code>tags</code></td><td>Texte libre, et une liste de chaînes</td></tr>
    </table>
    </div>

    <h3>Ce qui a été vu</h3>
    <p><code>timeline.keyframes</code> est une liste de <code>{ t, shapes }</code>, <code>t</code> en
      millisecondes depuis le début. Chaque forme porte un <code>sourceId</code> — plusieurs formes
      peuvent partager une chronologie (un objet, une flamme qui traîne, une seconde lumière) — et
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
  "title": "l'objet",
  "behindCloud": false,    // ÉNONCÉ par le témoin, jamais déduit
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
      <tr><td><code>weatherTrack</code></td><td><code>{ keyframes: [{ t, weather }] }</code> — couverture, noirceur, base, la couche haute (glacée) tenue à part, alignement des cristaux, précipitation et son intensité, vent, orage</td></tr>
      <tr><td><code>weatherSource</code></td><td><code>{ id, name, url }</code> du relevé d'où vient la météo. Sa présence signifie que l'enregistrement est rejoué tel qu'il a été composé et n'est jamais reconsulté. Absent : le récit du témoin lui-même</td></tr>
      <tr><td><code>soundTrack</code></td><td><code>{ keyframes: [{ t, sound }] }</code> — <code>kind</code> (none/hum/whistle/rumble/crackle), <code>volume</code>, <code>pitchHz</code>, et un <code>src</code> facultatif vers un vrai enregistrement</td></tr>
      <tr><td><code>instrument</code>, <code>exposureSeconds</code></td><td>À travers quoi l'observation a été faite, et combien de temps l'obturateur est resté ouvert. Absent : l'œil nu</td></tr>
      <tr><td><code>decor</code></td><td>Le décor, à une vraie distance <code>eastM</code>/<code>northM</code> du témoin : bâtiments (avec <code>floors</code>, <code>windows</code>), arbres, lampadaires, véhicules, autres témoins, aéronefs — éventuellement avec une <code>track</code> et des <code>lights</code> dont le <code>pattern</code> porte une vraie cadence d'éclats</td></tr>
    </table>
    </div>

    <h3>Un fichier entier</h3>
    <p>Le plus petit enregistrement qui énonce encore quelque chose — un ovale silencieux traversant
      le ciel en douze secondes, à une date réelle et en un lieu réel. Tout le reste du format est
      facultatif, et tout ce qui suit sert à quelque chose :</p>
    <pre><code>${this.escape(this.example)}</code></pre>
    <p>C'est <a href="/demo-data/example-minimal.json"><code>/demo-data/example-minimal.json</code></a>
      sur ce site : vous pouvez le récupérer, et
      <a href="/player/?sighting=/demo-data/example-minimal.json">le jouer</a> avant d'y toucher.
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
      <tr><td><a href="/demo-data/sky-test-halos.json"><code>sky-test-halos.json</code></a></td><td>Aucun objet — un ciel réglé par sa météo, avec un <code>witnessTrack</code> de quatre poses qui balaie le cortège</td></tr>
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
        où que ce soit. Les mètres sont déduits, en inégalités, de ce que l'objet a été déclaré
        passer derrière ou devant (<code>decor[].occludesSourceIds</code>).</li>
      <li><strong>L'énoncé l'emporte sur le déduit.</strong> <code>behindCloud</code> et
        <code>occludesSourceIds</code> sont des affirmations du témoin. Rien dans ce format
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
