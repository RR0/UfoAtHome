import type { PageMeta, SiteLanguage, SitePage } from "../SitePage.js"

/** Integration guide first, then the recording format field by field. */
export class DocsPage implements SitePage {

  readonly meta: PageMeta = {
    slug: { en: "docs", fr: "documentation" },
    navLabel: { en: "Documentation", fr: "Documentation" },
    title: { en: "Documentation", fr: "Documentation" },
    description: {
      en: "How to put a reconstruction on your own site, which of the four components to load, "
        + "their attributes, properties and events, and the sighting.json format field by field.",
      fr: "Comment poser une reconstitution sur votre propre site, lequel des quatre composants "
        + "charger, leurs attributs, propriétés et événements, et le format sighting.json champ par champ."
    }
  }

  render(language: SiteLanguage): string {
    return language === "fr" ? this.fr() : this.en()
  }

  private en(): string {
    return `
<section class="band hero">
  <div class="wrap">
    <p class="eyebrow">Documentation</p>
    <h1>Put it on your own site.</h1>
    <p class="lede">Four vanilla Web Components. No framework, no build step required of the page
      that uses them, and no runtime dependency on this site once you host the files yourself.</p>
  </div>
</section>

<section class="band">
  <div class="wrap prose-wide">
    <h2>The shortest version</h2>
    <p>Two lines anywhere in your HTML:</p>
    <pre><code>&lt;script type="module" src="https://ufoathome.org/lib/rr0-eyewitness.mjs"&gt;&lt;/script&gt;
&lt;rr0-eyewitness src="https://example.org/my-case/sighting.json"&gt;&lt;/rr0-eyewitness&gt;</code></pre>
    <p>The element registers itself the moment the module is imported — there is no setup call. Every
      published reconstruction also hands out these two lines from the <q>?</q> button in its own
      toolbar, with absolute URLs already filled in.</p>

    <h3>Two conditions</h3>
    <ul class="plain">
      <li><strong>Your recording must be readable by the page.</strong> Same site, or one
        <code>Access-Control-Allow-Origin: *</code> header on the JSON. This site serves both
        <code>/lib/*</code> and <code>/demo-data/*</code> that way, which is why the snippet above
        works from anywhere.</li>
      <li><strong>The module must load as a module.</strong> <code>type="module"</code> is not
        optional, and the file must be served with a JavaScript MIME type.</li>
    </ul>

    <h3>If your host forbids scripts</h3>
    <p>Most forums and many CMSs will not run a module script from a post. Two things that work
      instead: an <code>&lt;iframe&gt;</code> pointing at a page of your own that holds the
      component, or a plain link to
      <code>ufoathome.org/editor/?sighting=&lt;url of your recording&gt;</code>, which opens it here
      for anyone who follows it.</p>
  </div>
</section>

<section class="band">
  <div class="wrap prose-wide">
    <h2>Which component to load</h2>
    <p>They are not variants of one bundle — each is self-contained, and a page should load only the
      one it needs. The three heavier ones carry Three.js and a star catalogue, which is what a real
      sky costs.</p>
    <div class="table-scroll">
    <table>
      <tr><th>Element</th><th>Use it when</th><th>Module</th><th>gzip</th></tr>
      <tr>
        <td><code>&lt;rr0-ufo&gt;</code></td>
        <td>You only need the shape replayed — an illustration inside an article, with no sky behind it</td>
        <td><code>/lib/rr0-ufo.mjs</code></td><td>16 KB</td>
      </tr>
      <tr>
        <td><code>&lt;rr0-scene&gt;</code></td>
        <td>You want the real sky and ground, but none of the witness toolbar</td>
        <td><code>/lib/rr0-scene.mjs</code></td><td>238 KB</td>
      </tr>
      <tr>
        <td><code>&lt;rr0-eyewitness&gt;</code></td>
        <td><strong>The default.</strong> A real sighting, one witness or several, with its metadata, credits and embed panel</td>
        <td><code>/lib/rr0-eyewitness.mjs</code></td><td>249 KB</td>
      </tr>
      <tr>
        <td><code>&lt;rr0-ufo-recorder&gt;</code></td>
        <td>You want people to author or edit recordings on your page</td>
        <td><code>/lib/rr0-ufo-recorder.mjs</code></td><td>293 KB</td>
      </tr>
    </table>
    </div>
    <p>From a bundler instead, after <code>npm install @rr0/ufoathome</code>:</p>
    <pre><code>import "@rr0/ufoathome/ufo"        // registers &lt;rr0-ufo&gt;
import "@rr0/ufoathome/scene"      // registers &lt;rr0-scene&gt;
import "@rr0/ufoathome/eyewitness" // registers &lt;rr0-eyewitness&gt;
import "@rr0/ufoathome/recorder"   // registers &lt;rr0-ufo-recorder&gt;</code></pre>

    <h3>Self-hosting</h3>
    <p>Copy the contents of the package's <code>dist-embed*</code> directories onto your own server
      and point the <code>&lt;script src&gt;</code> there. The modules reference their own assets
      (the star catalogue, the weather audio) <em>relative to themselves</em>, so they keep working
      from any path — just keep each bundle's files together.</p>
  </div>
</section>

<section class="band">
  <div class="wrap prose-wide">
    <h2>Attributes, properties, events</h2>

    <h3>All four elements</h3>
    <div class="table-scroll">
    <table>
      <tr><th>Member</th><th>Kind</th><th>What it does</th></tr>
      <tr><td><code>src</code></td><td>attribute</td><td>URL of a recording, fetched on connect and whenever it changes. On <code>&lt;rr0-eyewitness&gt;</code> it also accepts a witness manifest (see below)</td></tr>
      <tr><td><code>sightingData</code></td><td>property</td><td>The recording as a plain object — read it back after editing, or set it instead of using <code>src</code></td></tr>
      <tr><td><code>loadFromSrc(url)</code></td><td>method</td><td>What the attribute triggers internally; callable directly</td></tr>
    </table>
    </div>

    <h3>Playback (<code>&lt;rr0-ufo&gt;</code>, and the elements composing it)</h3>
    <div class="table-scroll">
    <table>
      <tr><th>Member</th><th>Kind</th><th>What it does</th></tr>
      <tr><td><code>play()</code> / <code>pause()</code></td><td>method</td><td>Start or stop playback — say which state you want, rather than flipping the current one</td></tr>
      <tr><td><code>togglePlayPause()</code></td><td>method</td><td>What the button and click-to-play do</td></tr>
      <tr><td><code>playbackState</code></td><td>property (read)</td><td><code>"stopped"</code>, <code>"playing"</code> or <code>"paused"</code></td></tr>
      <tr><td><code>currentTime</code></td><td>property</td><td>Playhead position, in the timeline's own units (<em>not</em> real milliseconds — see <code>positionLabel</code>)</td></tr>
      <tr><td><code>seekableDuration</code></td><td>property (read)</td><td>The full range <code>currentTime</code> can take</td></tr>
      <tr><td><code>autoReplayEnabled</code></td><td>property</td><td>Looping. Turn it <strong>off</strong> if you want the <code>ended</code> event</td></tr>
      <tr><td><code>positionLabel</code> / <code>durationLabel</code></td><td>property (read)</td><td>The human-readable position and length already computed by the element — real clock time when the observation states one</td></tr>
      <tr><td><code>enableClickToPlay</code></td><td>property</td><td>Whether clicking the canvas toggles playback (default true)</td></tr>
      <tr><td><code>fullscreenTarget</code></td><td>property</td><td>Which element the fullscreen button expands</td></tr>
    </table>
    </div>

    <h3>Events</h3>
    <div class="table-scroll">
    <table>
      <tr><th>Event</th><th>Fires</th><th>Escapes the shadow root?</th></tr>
      <tr><td><code>ended</code></td><td>Once, when playback runs off the end of the recording without looping. Not on a pause, and not on a scrub to the end</td><td>Yes — bubbling and composed, so a page can listen on <code>&lt;rr0-eyewitness&gt;</code> itself. This is how you play several recordings in sequence</td></tr>
      <tr><td><code>timeupdate</code></td><td>Every playback tick and every seek, with <code>detail.time</code></td><td>No — it is meant for the composing elements</td></tr>
      <tr><td><code>timedisplaychange</code></td><td>When the counters switch between clock time and elapsed time</td><td>Yes</td></tr>
    </table>
    </div>

    <h3><code>&lt;rr0-eyewitness&gt;</code> only</h3>
    <div class="table-scroll">
    <table>
      <tr><th>Member</th><th>Kind</th><th>What it does</th></tr>
      <tr><td><code>witnessUrls</code></td><td>property</td><td>The manifest as a plain array of URLs, instead of <code>src</code></td></tr>
      <tr><td><code>scene</code></td><td>property (read)</td><td>The <code>&lt;rr0-scene&gt;</code> it composes — and through <code>scene.ufoElement</code>, the playback members above</td></tr>
    </table>
    </div>
    <p>For a case with several witnesses, point <code>src</code> at a manifest — a plain JSON array
      of each witness's own recording URL:</p>
    <pre><code>["chiles-sighting.json", "whitted-sighting.json"]</code></pre>
    <p>Nothing is duplicated in the manifest itself: each witness's display name and the shared case
      id come from that witness's own file. A fetched array is a manifest, a fetched object is a
      single recording — the two are told apart automatically.</p>
  </div>
</section>

<section class="band">
  <div class="wrap prose-wide">
    <h2>The recording format</h2>
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

<section class="band">
  <div class="wrap prose-wide">
    <h2>Building it yourself</h2>
    <pre><code>git clone https://github.com/RR0/UfoAtHome.git
npm install
npm run dev          # local demo, Vite dev server
npm test             # vitest
npm run build:all    # the four embed bundles
npm run build:site   # this site, into dist-site/</code></pre>
    <p>The catalogues are generated, not committed by hand:
      <code>npm run build:stars</code> (HYG), <code>npm run build:comets</code> (JPL Horizons) and
      <code>npm run build:satellites</code> (CelesTrak's SATCAT) each rebuild theirs from its public
      source, so the data is reproducible rather than merely readable.</p>
    <p>Everything is MIT — see <a href="/faq/">the FAQ</a> for what that lets you do.</p>
  </div>
</section>
`
  }

  private fr(): string {
    return `
<section class="band hero">
  <div class="wrap">
    <p class="eyebrow">Documentation</p>
    <h1>L'intégrer à votre site.</h1>
    <p class="lede">Quatre <i lang="en">Web Components</i> natifs. Aucun <i lang="en">framework</i>,
      aucune étape de compilation exigée de la page qui les utilise, et aucune dépendance
      d'exécution à ce site dès lors que vous hébergez les fichiers vous-même.</p>
  </div>
</section>

<section class="band">
  <div class="wrap prose-wide">
    <h2>La version la plus courte</h2>
    <p>Deux lignes, n'importe où dans votre HTML :</p>
    <pre><code>&lt;script type="module" src="https://ufoathome.org/lib/rr0-eyewitness.mjs"&gt;&lt;/script&gt;
&lt;rr0-eyewitness src="https://exemple.org/mon-dossier/sighting.json"&gt;&lt;/rr0-eyewitness&gt;</code></pre>
    <p>L'élément s'enregistre lui-même dès que le module est importé — il n'y a aucun appel
      d'initialisation. Chaque reconstitution publiée distribue d'ailleurs ces deux lignes depuis le
      bouton <q>?</q> de sa propre barre d'outils, URLs absolues déjà remplies.</p>

    <h3>Deux conditions</h3>
    <ul class="plain">
      <li><strong>Votre enregistrement doit être lisible par la page.</strong> Même site, ou un
        en-tête <code>Access-Control-Allow-Origin: *</code> sur le JSON. Ce site sert
        <code>/lib/*</code> et <code>/demo-data/*</code> ainsi — c'est pourquoi l'extrait ci-dessus
        fonctionne depuis n'importe où.</li>
      <li><strong>Le module doit être chargé comme un module.</strong> <code>type="module"</code>
        n'est pas facultatif, et le fichier doit être servi avec un type MIME JavaScript.</li>
    </ul>

    <h3>Si votre hébergeur interdit les scripts</h3>
    <p>La plupart des forums et bien des CMS n'exécuteront pas un script de module depuis un message.
      Deux solutions qui marchent : une <code>&lt;iframe&gt;</code> pointant vers une page à vous qui
      porte le composant, ou un simple lien vers
      <code>ufoathome.org/fr/editeur/?sighting=&lt;url de votre enregistrement&gt;</code>, qui
      l'ouvre ici pour quiconque le suit.</p>
  </div>
</section>

<section class="band">
  <div class="wrap prose-wide">
    <h2>Quel composant charger</h2>
    <p>Ce ne sont pas des variantes d'un même <i lang="en">bundle</i> : chacun est autonome, et une
      page ne devrait charger que celui dont elle a besoin. Les trois plus lourds embarquent Three.js
      et un catalogue d'étoiles — c'est ce que coûte un vrai ciel.</p>
    <div class="table-scroll">
    <table>
      <tr><th>Élément</th><th>À utiliser quand</th><th>Module</th><th>gzip</th></tr>
      <tr>
        <td><code>&lt;rr0-ufo&gt;</code></td>
        <td>Vous ne voulez que la forme rejouée — une illustration dans un article, sans ciel derrière</td>
        <td><code>/lib/rr0-ufo.mjs</code></td><td>16 Ko</td>
      </tr>
      <tr>
        <td><code>&lt;rr0-scene&gt;</code></td>
        <td>Vous voulez le ciel et le sol réels, mais rien de la barre d'outils du témoin</td>
        <td><code>/lib/rr0-scene.mjs</code></td><td>238 Ko</td>
      </tr>
      <tr>
        <td><code>&lt;rr0-eyewitness&gt;</code></td>
        <td><strong>Le choix par défaut.</strong> Une observation réelle, un témoin ou plusieurs, avec ses métadonnées, ses crédits et son panneau d'intégration</td>
        <td><code>/lib/rr0-eyewitness.mjs</code></td><td>249 Ko</td>
      </tr>
      <tr>
        <td><code>&lt;rr0-ufo-recorder&gt;</code></td>
        <td>Vous voulez que l'on puisse composer ou modifier des enregistrements sur votre page</td>
        <td><code>/lib/rr0-ufo-recorder.mjs</code></td><td>293 Ko</td>
      </tr>
    </table>
    </div>
    <p>Depuis un <i lang="en">bundler</i>, après <code>npm install @rr0/ufoathome</code> :</p>
    <pre><code>import "@rr0/ufoathome/ufo"        // enregistre &lt;rr0-ufo&gt;
import "@rr0/ufoathome/scene"      // enregistre &lt;rr0-scene&gt;
import "@rr0/ufoathome/eyewitness" // enregistre &lt;rr0-eyewitness&gt;
import "@rr0/ufoathome/recorder"   // enregistre &lt;rr0-ufo-recorder&gt;</code></pre>

    <h3>Héberger les fichiers vous-même</h3>
    <p>Recopiez le contenu des répertoires <code>dist-embed*</code> du paquet sur votre serveur et
      pointez le <code>&lt;script src&gt;</code> dessus. Les modules référencent leurs propres
      ressources (catalogue d'étoiles, sons de météo) <em>relativement à eux-mêmes</em> : ils
      fonctionnent donc depuis n'importe quel chemin — il suffit de garder ensemble les fichiers d'un
      même <i lang="en">bundle</i>.</p>
  </div>
</section>

<section class="band">
  <div class="wrap prose-wide">
    <h2>Attributs, propriétés, événements</h2>

    <h3>Les quatre éléments</h3>
    <div class="table-scroll">
    <table>
      <tr><th>Membre</th><th>Nature</th><th>Rôle</th></tr>
      <tr><td><code>src</code></td><td>attribut</td><td>URL d'un enregistrement, chargée à la connexion et à chaque changement. Sur <code>&lt;rr0-eyewitness&gt;</code>, accepte aussi un manifeste de témoins (voir plus bas)</td></tr>
      <tr><td><code>sightingData</code></td><td>propriété</td><td>L'enregistrement comme objet simple — à relire après modification, ou à poser au lieu d'utiliser <code>src</code></td></tr>
      <tr><td><code>loadFromSrc(url)</code></td><td>méthode</td><td>Ce que déclenche l'attribut ; appelable directement</td></tr>
    </table>
    </div>

    <h3>Lecture (<code>&lt;rr0-ufo&gt;</code>, et les éléments qui le composent)</h3>
    <div class="table-scroll">
    <table>
      <tr><th>Membre</th><th>Nature</th><th>Rôle</th></tr>
      <tr><td><code>play()</code> / <code>pause()</code></td><td>méthode</td><td>Démarrer ou arrêter la lecture — dire quel état on veut, plutôt que basculer l'état courant</td></tr>
      <tr><td><code>togglePlayPause()</code></td><td>méthode</td><td>Ce que font le bouton et le clic sur le canevas</td></tr>
      <tr><td><code>playbackState</code></td><td>propriété (lecture)</td><td><code>"stopped"</code>, <code>"playing"</code> ou <code>"paused"</code></td></tr>
      <tr><td><code>currentTime</code></td><td>propriété</td><td>Position de la tête de lecture, dans les unités de la chronologie (<em>pas</em> des millisecondes réelles — voir <code>positionLabel</code>)</td></tr>
      <tr><td><code>seekableDuration</code></td><td>propriété (lecture)</td><td>L'étendue que <code>currentTime</code> peut prendre</td></tr>
      <tr><td><code>autoReplayEnabled</code></td><td>propriété</td><td>La lecture en boucle. À mettre à <strong>false</strong> si vous voulez l'événement <code>ended</code></td></tr>
      <tr><td><code>positionLabel</code> / <code>durationLabel</code></td><td>propriété (lecture)</td><td>La position et la durée déjà mises en forme par l'élément — heure réelle quand l'observation en énonce une</td></tr>
      <tr><td><code>enableClickToPlay</code></td><td>propriété</td><td>Si un clic sur le canevas bascule la lecture (vrai par défaut)</td></tr>
      <tr><td><code>fullscreenTarget</code></td><td>propriété</td><td>Quel élément le bouton plein écran agrandit</td></tr>
    </table>
    </div>

    <h3>Événements</h3>
    <div class="table-scroll">
    <table>
      <tr><th>Événement</th><th>Quand</th><th>Sort-il du <i lang="en">shadow root</i> ?</th></tr>
      <tr><td><code>ended</code></td><td>Une fois, quand la lecture atteint la fin de l'enregistrement sans boucler. Ni à la pause, ni à un déplacement manuel jusqu'à la fin</td><td>Oui — <i lang="en">bubbling</i> et <i lang="en">composed</i>, donc une page peut l'écouter sur <code>&lt;rr0-eyewitness&gt;</code> même. C'est ainsi qu'on enchaîne plusieurs enregistrements</td></tr>
      <tr><td><code>timeupdate</code></td><td>À chaque image de lecture et à chaque déplacement, avec <code>detail.time</code></td><td>Non — il est destiné aux éléments composants</td></tr>
      <tr><td><code>timedisplaychange</code></td><td>Quand les compteurs basculent entre heure et temps écoulé</td><td>Oui</td></tr>
    </table>
    </div>

    <h3>Propre à <code>&lt;rr0-eyewitness&gt;</code></h3>
    <div class="table-scroll">
    <table>
      <tr><th>Membre</th><th>Nature</th><th>Rôle</th></tr>
      <tr><td><code>witnessUrls</code></td><td>propriété</td><td>Le manifeste comme simple tableau d'URLs, au lieu de <code>src</code></td></tr>
      <tr><td><code>scene</code></td><td>propriété (lecture)</td><td>Le <code>&lt;rr0-scene&gt;</code> qu'il compose — et, via <code>scene.ufoElement</code>, les membres de lecture ci-dessus</td></tr>
    </table>
    </div>
    <p>Pour un dossier à plusieurs témoins, pointez <code>src</code> vers un manifeste — un simple
      tableau JSON des URLs de chaque enregistrement :</p>
    <pre><code>["chiles-sighting.json", "whitted-sighting.json"]</code></pre>
    <p>Rien n'est dupliqué dans le manifeste : le nom affiché de chaque témoin et l'identifiant de
      dossier partagé viennent du fichier de ce témoin. Un tableau reçu est un manifeste, un objet
      reçu est un enregistrement unique — les deux sont distingués automatiquement.</p>
  </div>
</section>

<section class="band">
  <div class="wrap prose-wide">
    <h2>Le format d'enregistrement</h2>
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

<section class="band">
  <div class="wrap prose-wide">
    <h2>Le construire soi-même</h2>
    <pre><code>git clone https://github.com/RR0/UfoAtHome.git
npm install
npm run dev          # démo locale, serveur de développement Vite
npm test             # vitest
npm run build:all    # les quatre bundles d'intégration
npm run build:site   # ce site, dans dist-site/</code></pre>
    <p>Les catalogues sont engendrés, pas saisis à la main :
      <code>npm run build:stars</code> (HYG), <code>npm run build:comets</code> (JPL Horizons) et
      <code>npm run build:satellites</code> (le SATCAT de CelesTrak) reconstruisent chacun le sien
      depuis sa source publique — la donnée est donc reproductible, et pas seulement lisible.</p>
    <p>Tout est en MIT — voir <a href="/fr/faq/">la FAQ</a> pour ce que cela vous autorise.</p>
  </div>
</section>
`
  }
}
