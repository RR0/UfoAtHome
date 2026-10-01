import { DocsSection } from "./DocsSection.js"
import type { PageMeta, Said, SiteLanguage } from "../SitePage.js"

/** One component's own page: what it is for, the markup it takes, and its members in full. */
interface ComponentDoc {
  slug: string
  /** The tag itself, which is also the page's title — the thing a reader is looking for. */
  tag: string
  /** What it is for, in the half-sentence that used to follow the tag in the old single page. */
  lede: Said<string>
  description: Said<string>
  body: Said<string>
  /** The export subpath and the bundle's own file name, for the reminder at the foot of the page. */
  subpath: string
  size: Said<string>
  /** The events this component itself dispatches, when it dispatches any. They sat in one table on
   * the hub, which could not say who fired them — and each of them has exactly one emitter, so the
   * answer is the page it is on. */
  events?: Said<string>
}

/**
 * One page per component, under the hub at `/docs/components/`.
 *
 * They were four sections of one page, and the trouble was not the length but that everything
 * about all of them was in front of you at once: somebody wanting to know what `<rr0-scene>` answers to
 * scrolled through the whole authoring toolbar to find out. What you need from one of them is
 * never what you need from the other two at the same moment.
 *
 * One class rather than three: the three differ only in their prose, and three near-identical classes
 * would be four places to keep a breadcrumb and a hero in step.
 */
export class DocsComponentPage extends DocsSection {

  readonly meta: PageMeta

  constructor(private readonly doc: ComponentDoc) {
    super()
    this.meta = {
      slug: doc.slug,
      navLabel: { en: `<${doc.tag}>`, fr: `<${doc.tag}>`, es: `<${doc.tag}>`, it: `<${doc.tag}>` },
      title: { en: `<${doc.tag}>`, fr: `<${doc.tag}>`, es: `<${doc.tag}>`, it: `<${doc.tag}>` },
      description: doc.description,
      asideFromNav: true,
      asideFromFooter: true
    }
  }

  render(language: SiteLanguage): string {
    // The way back is the components hub, not the documentation hub: it is the page these were
    // reached from, and the one holding what they have in common (the events, the imports).
    return this.hero(language, this.meta.title, this.doc.lede, {
      href: "/docs/components/",
      label: { en: "The components", fr: "Les composants", es: "Los componentes", it: "I componenti" }
    }) + this.doc.body[language] + this.events(language) + this.integration(language)
  }

  /** What this component fires, if anything. On its own page rather than in one table over all
   * four, because a table of every event on the site cannot say which element to listen on — and
   * that is the only thing a reader needs from it. */
  private events(language: SiteLanguage): string {
    const events = this.doc.events?.[language]
    return events === undefined ? "" : `
<section class="band">
  <div class="wrap prose-wide">
    <h2>${({ en: "What it fires", fr: "Ce qu'il émet", es: "Lo que emite", it: "Cosa emette" })[language]}</h2>
    ${events}
  </div>
</section>
`
  }

  /** The same two lines as everywhere else, with this component's own name filled in. Repeated on
   * each page on purpose: somebody who came here for one component should not have to go back to
   * the hub to find out how to load the thing they have just read about. */
  private integration(language: SiteLanguage): string {
    const tag = this.doc.tag
    const heading: Said<string> = {
      en: "Putting it in your page",
      fr: "L'intégrer",
      es: "Ponerlo en tu página",
      it: "Inserirlo nella tua pagina"
    }
    const prose: Said<string> = {
      fr: `${tag === "rr0-sighting-editor" ? "" : `<code>sighting.json</code> est un <a href="/docs/format/">fichier d'observation</a>. `}Ou, après <code>npm install @rr0/ufoathome</code> : <code>import "@rr0/ufoathome/${this.doc.subpath}"</code>.
         Le bundle pèse ${this.doc.size.fr} compressé et enregistre le tag lui-même — rien d'autre à appeler.
         <a href="/docs/components/#putting-one-in-your-application">Le hub</a> dit ce que cela suppose par ailleurs,
         et <a href="/docs/share/">partager une observation</a> a l'exemple complet, à essayer et à copier.`,
      en: `${tag === "rr0-sighting-editor" ? "" : `<code>sighting.json</code> is a <a href="/docs/format/">sighting file</a>. `}Or, after <code>npm install @rr0/ufoathome</code>: <code>import "@rr0/ufoathome/${this.doc.subpath}"</code>.
         The bundle is ${this.doc.size.en} gzipped and registers the tag itself — nothing else to call.
         <a href="/docs/components/#putting-one-in-your-application">The hub</a> says what else that involves, and
         <a href="/docs/share/">sharing an observation</a> has the whole example, to try and to copy.`,
      es: `${tag === "rr0-sighting-editor" ? "" : `<code>sighting.json</code> es un <a href="/docs/format/">archivo de avistamiento</a>. `}O bien, tras <code>npm install @rr0/ufoathome</code>: <code>import "@rr0/ufoathome/${this.doc.subpath}"</code>.
         El bundle pesa ${this.doc.size.es} comprimido con gzip y registra la etiqueta por sí mismo — no hay nada más que llamar.
         <a href="/docs/components/#putting-one-in-your-application">El hub</a> explica qué más supone, y
         <a href="/docs/share/">compartir una observación</a> tiene el ejemplo completo, para probarlo y copiarlo.`,
      it: `${tag === "rr0-sighting-editor" ? "" : `<code>sighting.json</code> è un <a href="/docs/format/">file di avvistamento</a>. `}Oppure, dopo <code>npm install @rr0/ufoathome</code>: <code>import "@rr0/ufoathome/${this.doc.subpath}"</code>.
         Il bundle pesa ${this.doc.size.it} compresso con gzip e registra il tag da sé — nient'altro da chiamare.
         <a href="/docs/components/#putting-one-in-your-application">L'hub</a> dice cos'altro comporta, e
         <a href="/docs/share/">condividere un'osservazione</a> ha l'esempio completo, da provare e da copiare.`
    }
    return `
<section class="band">
  <div class="wrap prose-wide">
    <h2>${heading[language]}</h2>
    <pre><code>&lt;script type="module" src="https://ufoathome.org/lib/${tag}.mjs"&gt;&lt;/script&gt;
&lt;${tag}${tag === "rr0-sighting-editor" ? "" : ' src="sighting.json"'}&gt;&lt;/${tag}&gt;</code></pre>
    <p>${prose[language]}</p>
  </div>
</section>
`
  }
}

/** The three, in the order they compose one another: each adds to the one before it. */
export const COMPONENT_DOCS: ComponentDoc[] = [
  {
    slug: "docs/components/scene",
    subpath: "scene",
    size: { en: "238 KB", fr: "238 Ko", es: "238 KB", it: "238 KB" },
    events: {
      en: `<div class="table-scroll">
    <table>
      <tr><th>Event</th><th>Fires</th><th>Where to listen</th></tr>
      <tr><td><code>ended</code></td><td>Once, when playback runs off the end without looping. Not on a pause, and not on a scrub to the end</td><td>Anywhere: it bubbles and is <i lang="en">composed</i>, so it crosses out of <code>&lt;rr0-scene&gt;</code> and <code>&lt;rr0-sighting&gt;</code> and reaches the element you put on the page. This is how you play several recordings in turn</td></tr>
      <tr><td><code>timedisplaychange</code></td><td>When the counters switch between clock time and elapsed time</td><td>Anywhere, same as above</td></tr>
      <tr><td><code>timeupdate</code></td><td>Every playback tick and every seek, with <code>detail.time</code></td><td>On this element only. It neither bubbles nor is composed, so a page holding an <code>&lt;rr0-scene&gt;</code> has to reach its <code>ufoElement</code> — it is meant for the elements composing this one</td></tr>
    </table>
    </div>`,
      fr: `<div class="table-scroll">
    <table>
      <tr><th>Événement</th><th>Quand</th><th>Où l'écouter</th></tr>
      <tr><td><code>ended</code></td><td>Une fois, quand la lecture atteint la fin sans boucler. Ni à la pause, ni à un déplacement manuel jusqu'à la fin</td><td>N'importe où : il est <i lang="en">bubbling</i> et <i lang="en">composed</i>, donc il sort de <code>&lt;rr0-scene&gt;</code> et de <code>&lt;rr0-sighting&gt;</code> et atteint l'élément que vous avez posé sur la page. C'est ainsi qu'on enchaîne plusieurs enregistrements</td></tr>
      <tr><td><code>timedisplaychange</code></td><td>Quand les compteurs basculent entre heure et temps écoulé</td><td>N'importe où, comme ci-dessus</td></tr>
      <tr><td><code>timeupdate</code></td><td>À chaque image de lecture et à chaque déplacement, avec <code>detail.time</code></td><td>Sur cet élément seulement. Il n'est ni <i lang="en">bubbling</i> ni <i lang="en">composed</i> : une page qui tient un <code>&lt;rr0-scene&gt;</code> doit passer par son <code>ufoElement</code> — il est destiné aux éléments qui composent celui-ci</td></tr>
    </table>
    </div>`,
      es: `<div class="table-scroll">
    <table>
      <tr><th>Evento</th><th>Cuándo</th><th>Dónde escucharlo</th></tr>
      <tr><td><code>ended</code></td><td>Una vez, cuando la reproducción llega al final sin repetirse en bucle. No al pausar, ni al arrastrar hasta el final</td><td>En cualquier parte: es <i lang="en">bubbling</i> y <i lang="en">composed</i>, así que sale de <code>&lt;rr0-scene&gt;</code> y de <code>&lt;rr0-sighting&gt;</code> y llega al elemento que pusiste en la página. Así se reproducen varias grabaciones una tras otra</td></tr>
      <tr><td><code>timedisplaychange</code></td><td>Cuando los contadores cambian entre la hora del reloj y el tiempo transcurrido</td><td>En cualquier parte, igual que arriba</td></tr>
      <tr><td><code>timeupdate</code></td><td>En cada paso de la reproducción y en cada salto, con <code>detail.time</code></td><td>Solo en este elemento. No es <i lang="en">bubbling</i> ni <i lang="en">composed</i>, así que una página que contiene un <code>&lt;rr0-scene&gt;</code> tiene que llegar a su <code>ufoElement</code> — está pensado para los elementos que componen este</td></tr>
    </table>
    </div>`,
      it: `<div class="table-scroll">
    <table>
      <tr><th>Evento</th><th>Quando</th><th>Dove ascoltarlo</th></tr>
      <tr><td><code>ended</code></td><td>Una volta, quando la riproduzione arriva alla fine senza ripartire in loop. Non a una pausa, né trascinando fino alla fine</td><td>Ovunque: è <i lang="en">bubbling</i> e <i lang="en">composed</i>, quindi esce da <code>&lt;rr0-scene&gt;</code> e da <code>&lt;rr0-sighting&gt;</code> e raggiunge l'elemento che hai messo nella pagina. È così che si riproducono più registrazioni una dopo l'altra</td></tr>
      <tr><td><code>timedisplaychange</code></td><td>Quando i contatori passano dall'ora dell'orologio al tempo trascorso, o viceversa</td><td>Ovunque, come sopra</td></tr>
      <tr><td><code>timeupdate</code></td><td>A ogni passo della riproduzione e a ogni salto, con <code>detail.time</code></td><td>Solo su questo elemento. Non è né <i lang="en">bubbling</i> né <i lang="en">composed</i>, quindi una pagina che contiene un <code>&lt;rr0-scene&gt;</code> deve passare dal suo <code>ufoElement</code> — è pensato per gli elementi che compongono questo</td></tr>
    </table>
    </div>`
    },
    tag: "rr0-scene",
    lede: {
      en: "The phenomenon, the sky and the ground",
      fr: "Le phénomène, le ciel et le sol",
      es: "El fenómeno, el cielo y el suelo",
      it: "Il fenomeno, il cielo e il suolo"
    },
    description: {
      en: "What <rr0-scene> draws — the shape in the real sky and horizon — the markup it takes, and every attribute, property and method it answers to.",
      fr: "Ce que <rr0-scene> dessine — la forme dans le vrai ciel et le vrai horizon — le balisage qu'il accepte, et chaque attribut, propriété et méthode auquel il répond.",
      es: "Lo que dibuja <rr0-scene> — la forma en el cielo y el horizonte reales —, el marcado que admite y cada atributo, propiedad y método al que responde.",
      it: "Cosa disegna <rr0-scene> — la forma nel cielo e nell'orizzonte reali — il markup che accetta, e ogni attributo, proprietà e metodo a cui risponde."
    },
    body: {
      en: `
<section class="band">
  <div class="wrap prose-wide">
    <p>The shape an observer drew, standing in the real sky, horizon, weather and ground of the
      recording's own date, hour and place, and hidden by whatever stood in front of it — with the
      playback controls under it. This is the element the two others build on.</p>
    <pre><code>&lt;rr0-scene src="sighting.json"&gt;&lt;/rr0-scene&gt;</code></pre>
    <div class="table-scroll">
    <table>
      <tr><th>Member</th><th>Kind</th><th>What it does</th></tr>
      <tr><td><code>src</code></td><td>attribute</td><td>URL of a recording, fetched on connect and whenever it changes</td></tr>
      <tr><td><code>sightingData</code></td><td>property</td><td>The recording as a plain object (see <a href="/docs/format/">the format</a>) — read it back after editing, or set it instead of using <code>src</code></td></tr>
      <tr><td><code>loadFromSrc(url)</code></td><td>method (async)</td><td>What the attribute triggers internally. Await it when you need the recording to be IN before doing anything else</td></tr>
      <tr><td><code>ufoElement</code></td><td>property (read)</td><td>The playback layer it composes — the timeline, the controls, the canvas the pointer works on — and through it every playback member below</td></tr>
      <tr><td><code>sceneRenderer</code></td><td>property (read)</td><td>The 3D renderer, for what nothing else exposes</td></tr>
      <tr><td><code>show-compass</code></td><td>attribute</td><td>N/NE/E/… labels around the horizon. Off by default: useful while authoring a heading, noise while watching</td></tr>
      <tr><td><code>star-catalog-src</code> / <code>deep-star-catalog-src</code></td><td>attribute</td><td>Where to fetch the star catalogue from, when you host your own copy rather than the one beside the bundle: the base tier (to magnitude 7.5, fetched by every scene) and the deep tier (7.5 to 9, fetched only by a recording whose instrument reaches past 7.5)</td></tr>
      <tr><td><code>max-pixel-ratio</code></td><td>attribute</td><td>The most device pixels per CSS pixel the scene may draw at; the display's own, up to 2, when absent. The scene lowers it by itself while frames are late</td></tr>
      <tr><td><code>show-observer-map</code> / <code>hide-milestones</code></td><td>attribute</td><td>Passed straight down to the playback layer below — write them on whichever tag your page actually contains</td></tr>
    </table>
    </div>
    <p>Hovering it names what is under the pointer — a star with its magnitude and height, a planet,
      a comet, a building, another observer — and says nothing where the ground hides what you are
      pointing at.</p>
    <p>The <q>©</q> button in its corner lists the credits of what it shows — the imagery under the
      ground and on the map, the models, the pictures of the place, the sounds. Inside
      <code>&lt;rr0-sighting&gt;</code> the button is hidden: they are in its <q>i</q> panel.</p>

    <h2>Playback, on <code>ufoElement</code></h2>
    <p>Everything about replaying the recording lives one property down, on the playback layer —
      <code>scene.ufoElement.play()</code> — the same layer the two other components reach through
      their own <code>scene</code>.</p>
    <div class="table-scroll">
    <table>
      <tr><th>Member</th><th>Kind</th><th>What it does</th></tr>
      <tr><td><code>src</code></td><td>attribute</td><td>URL of a recording, fetched on connect and whenever it changes</td></tr>
      <tr><td><code>sightingData</code></td><td>property</td><td>The recording as a plain object (see <a href="/docs/format/">the format</a>) — read it back after editing, or set it instead of using <code>src</code></td></tr>
      <tr><td><code>sighting</code></td><td>property (read)</td><td>The live model: real-world time and place plus the recording's timeline</td></tr>
      <tr><td><code>loadFromSrc(url)</code></td><td>method (async)</td><td>What the attribute triggers internally. Await it when you need the recording to be IN before doing anything else — playing before it resolves finds a zero-length timeline</td></tr>
      <tr><td><code>play()</code> / <code>pause()</code></td><td>method</td><td>Say which state you want, rather than flipping the current one</td></tr>
      <tr><td><code>togglePlayPause()</code></td><td>method</td><td>What the button, the click and the space bar do</td></tr>
      <tr><td><code>playbackState</code></td><td>property (read)</td><td><code>"stopped"</code>, <code>"playing"</code> or <code>"paused"</code></td></tr>
      <tr><td><code>currentTime</code></td><td>property</td><td>The playhead, in the timeline's own units — <em>not</em> real milliseconds, see <code>positionLabel</code></td></tr>
      <tr><td><code>seekableDuration</code></td><td>property (read)</td><td>The range <code>currentTime</code> can take</td></tr>
      <tr><td><code>autoReplayEnabled</code></td><td>property</td><td>Looping, off by default: a replay plays once, then fires <code>ended</code>. Turn it <strong>on</strong> for a loop</td></tr>
      <tr><td><code>positionLabel</code> / <code>durationLabel</code></td><td>property (read)</td><td>The position and length already formatted by the element: clock time when the observation states a date and its length is known, elapsed time otherwise. Clicking either counter under the bar (or Enter on it) switches between the two, and fires <code>timedisplaychange</code></td></tr>
      <tr><td><code>refresh()</code></td><td>method</td><td>Re-reads the duration and repaints — call it after mutating <code>sighting.timeline</code> from outside</td></tr>
      <tr><td><code>canvasElement</code> / <code>renderer</code></td><td>property (read)</td><td>The <code>&lt;canvas&gt;</code>, and the renderer painting on it</td></tr>
      <tr><td><code>enableClickToPlay</code></td><td>property</td><td>Whether a click toggles playback and a double-click toggles fullscreen (both, or neither). The double-click also puts playback back as it was before its first click. Set false where the canvas is yours for something else</td></tr>
      <tr><td><code>fullscreenTarget</code></td><td>property</td><td>Which element the fullscreen button expands. <code>&lt;rr0-scene&gt;</code> sets it to its own stage, so the sky goes fullscreen and not just the overlay. Where the browser offers no fullscreen (an iPhone, an iframe without <code>allow="fullscreen"</code>), the element fills the window instead, and Escape leaves it all the same</td></tr>
      <tr><td><code>show-observer-map</code></td><td>attribute</td><td>Whether the map of where the observer stood starts open: present opens it, <code>"false"</code> keeps it closed. Absent, the recording decides: open when the observer went somewhere (a walk across a field, a drive, a flight), closed when they stayed where they were. It decides the map's <em>starting state</em>, not whether it exists: the button is there for every recording that states a place</td></tr>
      <tr><td><code>toggleObserverMap()</code></td><td>method</td><td>What that button does. On the map itself the wheel zooms around the pointer, a drag moves the ground, and its own buttons zoom and go back to the whole path. Zoomed in, it recentres on the observer whenever they reach its edge, so that they never leave it</td></tr>
      <tr><td><code>observerPlacing</code></td><td>property</td><td>Whether a click on bare ground of the map fires <code>observerplace</code> with <code>{ lat, lng }</code> — off by default, since where the observer stood is the recording's to say. The editor turns it on and writes the position at the playhead</td></tr>
      <tr><td><code>hide-milestones</code></td><td>attribute</td><td>Take the account's named moments off — the ticks along the bar, the caption naming the one being played, and the lettered points on the map. They are on wherever a recording names any, so this is the only way to say otherwise</td></tr>
      <tr><td><code>toggleMilestones()</code></td><td>method</td><td>What that button does</td></tr>
    </table>
    </div>
    <p>Those two are the only <em>positive</em> and <em>negative</em> defaults this element has, and
      the difference is deliberate. A recording's named moments are its own words about itself, so
      they show wherever they exist; the map costs tile requests to a third party the first time it
      opens, which is not a page's to spend on a reader's behalf without saying so. Either way the
      reader keeps both buttons, beside the fullscreen one — a page setting a default is not a page
      forbidding the opposite.</p>
    <p>The toolbar and the corner buttons show only while the pointer is over the picture, playing
      or paused, or when the keyboard moves the focus onto them. A touch screen, which has no
      pointer to hover with, keeps them shown.</p>
    <p>With the time bar focused, the keys work as on a video site: <kbd>←</kbd> goes back 5 s,
      <kbd>→</kbd> forward 5 s, and <kbd>Space</kbd> plays or pauses. Playing or pausing, from a key, the button or a
      click on the picture, shows its sign for a moment in the middle of the picture.</p>
  </div>
</section>
`,
      fr: `
<section class="band">
  <div class="wrap prose-wide">
    <p>La forme dessinée par un observateur, debout dans le ciel, l'horizon, la météo et le sol réels de
      la date, de l'heure et du lieu de l'enregistrement, cachée par ce qui se tenait devant — avec
      les commandes de lecture en dessous. C'est l'élément sur lequel les deux autres se construisent.</p>
    <pre><code>&lt;rr0-scene src="sighting.json"&gt;&lt;/rr0-scene&gt;</code></pre>
    <div class="table-scroll">
    <table>
      <tr><th>Membre</th><th>Nature</th><th>Rôle</th></tr>
      <tr><td><code>src</code></td><td>attribut</td><td>URL d'un enregistrement, chargée à la connexion et à chaque changement</td></tr>
      <tr><td><code>sightingData</code></td><td>propriété</td><td>L'enregistrement comme objet simple (voir <a href="/docs/format/">le format</a>) — à relire après modification, ou à poser au lieu d'utiliser <code>src</code></td></tr>
      <tr><td><code>loadFromSrc(url)</code></td><td>méthode (async)</td><td>Ce que déclenche l'attribut. À attendre quand l'enregistrement doit être arrivé avant toute autre chose</td></tr>
      <tr><td><code>ufoElement</code></td><td>propriété (lecture)</td><td>La couche de lecture qu'il compose — la chronologie, les commandes, le canevas du pointeur — et par elle tous les membres de lecture ci-dessous</td></tr>
      <tr><td><code>sceneRenderer</code></td><td>propriété (lecture)</td><td>Le moteur de rendu 3D, pour ce que rien d'autre n'expose</td></tr>
      <tr><td><code>show-compass</code></td><td>attribut</td><td>Les repères N/NE/E/… sur l'horizon. Absent par défaut : utile pour régler un cap, du bruit pour regarder</td></tr>
      <tr><td><code>star-catalog-src</code> / <code>deep-star-catalog-src</code></td><td>attribut</td><td>D'où charger le catalogue d'étoiles, quand vous en hébergez votre propre copie plutôt que celle posée à côté du bundle : le niveau de base (jusqu'à la magnitude 7,5, chargé par toute scène) et le niveau profond (de 7,5 à 9, chargé seulement par un enregistrement dont l'instrument va au-delà de 7,5)</td></tr>
      <tr><td><code>max-pixel-ratio</code></td><td>attribut</td><td>Le nombre maximal de pixels de l'écran par pixel CSS auquel la scène peut dessiner ; celui de l'écran, jusqu'à 2, s'il est absent. La scène le baisse d'elle-même tant que ses images sont en retard</td></tr>
      <tr><td><code>show-observer-map</code> / <code>hide-milestones</code></td><td>attribut</td><td>Transmis tels quels à la couche de lecture ci-dessous — à écrire sur la balise que votre page contient réellement</td></tr>
    </table>
    </div>
    <p>Le survol nomme ce qui est sous le curseur — une étoile avec sa magnitude et sa hauteur, une
      planète, une comète, un bâtiment, un autre observateur — et ne dit rien là où le sol cache ce que
      vous pointez.</p>
    <p>Le bouton <q>©</q> dans son coin liste les crédits de ce qu'il montre — l'imagerie du sol et
      de la carte, les modèles, les photos du lieu, les sons. Dans <code>&lt;rr0-sighting&gt;</code>,
      ce bouton est masqué : ils sont dans son panneau <q>i</q>.</p>

    <h2>La lecture, sur <code>ufoElement</code></h2>
    <p>Tout ce qui rejoue l'enregistrement vit une propriété plus bas, sur la couche de lecture —
      <code>scene.ufoElement.play()</code> — la même que les deux autres composants atteignent par
      leur propre <code>scene</code>.</p>
    <div class="table-scroll">
    <table>
      <tr><th>Membre</th><th>Nature</th><th>Rôle</th></tr>
      <tr><td><code>src</code></td><td>attribut</td><td>URL d'un enregistrement, chargée à la connexion et à chaque changement</td></tr>
      <tr><td><code>sightingData</code></td><td>propriété</td><td>L'enregistrement comme objet simple (voir <a href="/docs/format/">le format</a>) — à relire après modification, ou à poser au lieu d'utiliser <code>src</code></td></tr>
      <tr><td><code>sighting</code></td><td>propriété (lecture)</td><td>Le modèle vivant : date et lieu réels, plus la chronologie de l'enregistrement</td></tr>
      <tr><td><code>loadFromSrc(url)</code></td><td>méthode (async)</td><td>Ce que déclenche l'attribut. À attendre quand l'enregistrement doit être arrivé avant toute autre chose — jouer avant sa résolution trouve une chronologie de longueur nulle</td></tr>
      <tr><td><code>play()</code> / <code>pause()</code></td><td>méthode</td><td>Dire quel état on veut, plutôt que basculer l'état courant</td></tr>
      <tr><td><code>togglePlayPause()</code></td><td>méthode</td><td>Ce que font le bouton et le clic</td></tr>
      <tr><td><code>playbackState</code></td><td>propriété (lecture)</td><td><code>"stopped"</code>, <code>"playing"</code> ou <code>"paused"</code></td></tr>
      <tr><td><code>currentTime</code></td><td>propriété</td><td>La tête de lecture, dans les unités de la chronologie — <em>pas</em> des millisecondes réelles, voir <code>positionLabel</code></td></tr>
      <tr><td><code>seekableDuration</code></td><td>propriété (lecture)</td><td>L'étendue que <code>currentTime</code> peut prendre</td></tr>
      <tr><td><code>autoReplayEnabled</code></td><td>propriété</td><td>La lecture en boucle, désactivée par défaut : une lecture se joue une fois puis émet <code>ended</code>. À mettre à <strong>true</strong> pour boucler</td></tr>
      <tr><td><code>positionLabel</code> / <code>durationLabel</code></td><td>propriété (lecture)</td><td>Position et durée déjà mises en forme : l'heure quand l'observation énonce une date et que sa durée est connue, le temps écoulé sinon. Un clic sur l'un des compteurs sous la barre (ou Entrée) bascule de l'un à l'autre, et émet <code>timedisplaychange</code></td></tr>
      <tr><td><code>refresh()</code></td><td>méthode</td><td>Relit la durée et repeint — à appeler après avoir modifié <code>sighting.timeline</code> de l'extérieur</td></tr>
      <tr><td><code>canvasElement</code> / <code>renderer</code></td><td>propriété (lecture)</td><td>Le <code>&lt;canvas&gt;</code>, et ce qui peint dessus</td></tr>
      <tr><td><code>enableClickToPlay</code></td><td>propriété</td><td>Si un clic bascule la lecture et un double-clic le plein écran (les deux, ou aucun). Le double-clic remet aussi la lecture dans l'état où elle était avant son premier clic. À mettre à false là où le canevas vous sert à autre chose</td></tr>
      <tr><td><code>fullscreenTarget</code></td><td>propriété</td><td>Quel élément le bouton plein écran agrandit. <code>&lt;rr0-scene&gt;</code> y met sa propre scène, pour que ce soit le ciel qui s'agrandisse et non la seule surcouche. Là où le navigateur n'offre pas de plein écran (un iPhone, une iframe sans <code>allow="fullscreen"</code>), l'élément remplit la fenêtre à la place, et Échap en sort de même</td></tr>
      <tr><td><code>show-observer-map</code></td><td>attribut</td><td>Si la carte d'où se tenait l'observateur s'ouvre d'emblée : présent, il l'ouvre, <code>"false"</code> la garde fermée. Absent, l'enregistrement décide : ouverte quand l'observateur s'est déplacé (une marche à travers champ, un trajet en voiture, un vol), fermée quand il est resté sur place. Il décide de l'état de <em>départ</em> de la carte, pas de son existence : le bouton est là pour tout enregistrement qui énonce un lieu</td></tr>
      <tr><td><code>toggleObserverMap()</code></td><td>méthode</td><td>Ce que fait ce bouton. Sur la carte elle-même, la molette zoome autour du pointeur, un glisser déplace le terrain, et ses propres boutons zooment et reviennent au trajet entier. Zoomée, elle se recentre sur l'observateur dès qu'il en atteint le bord, pour qu'il n'en sorte jamais</td></tr>
      <tr><td><code>observerPlacing</code></td><td>propriété</td><td>Si un clic sur le sol de la carte émet <code>observerplace</code> avec <code>{ lat, lng }</code> — désactivé par défaut, car où se tenait l'observateur, c'est à l'enregistrement de le dire. L'éditeur l'active et écrit la position à la tête de lecture</td></tr>
      <tr><td><code>hide-milestones</code></td><td>attribut</td><td>Retirer les moments nommés du récit — les repères sur la barre, la légende qui nomme celui qu'on joue, et les points lettrés sur la carte. Ils sont là partout où un enregistrement en nomme, donc c'est la seule façon de dire le contraire</td></tr>
      <tr><td><code>toggleMilestones()</code></td><td>méthode</td><td>Ce que fait ce bouton</td></tr>
    </table>
    </div>
    <p>Ces deux-là sont les seuls défauts <em>positif</em> et <em>négatif</em> de cet élément, et la
      différence est voulue. Les moments nommés d'un enregistrement sont ses propres mots sur
      lui-même : ils s'affichent partout où ils existent. La carte, elle, coûte des requêtes de
      tuiles à un tiers dès la première ouverture, et ce n'est pas à une page de les dépenser au nom
      d'un lecteur sans le dire. Dans les deux cas le lecteur garde les deux boutons, à côté de celui
      du plein écran : une page qui pose un défaut n'interdit pas le contraire.</p>
    <p>La barre d'outils et les boutons du coin n'apparaissent que tant que le pointeur survole
      l'image, en lecture comme en pause, ou quand le clavier y amène le focus. Un écran tactile, qui
      n'a pas de pointeur pour survoler, les garde affichés.</p>
    <p>Quand la barre de temps a le focus, les touches font comme sur un site de vidéos :
      <kbd>←</kbd> recule de 5 s, <kbd>→</kbd> avance de 5 s, et <kbd>Espace</kbd> lance ou met en
      pause. Lancer ou mettre en pause, au clavier, au bouton ou d'un clic sur l'image, en montre
      le signe un instant au milieu de l'image.</p>
  </div>
</section>
`,
      es: `
<section class="band">
  <div class="wrap prose-wide">
    <p>La forma que dibujó un observador, situada en el cielo, el horizonte, el tiempo meteorológico y el suelo
      reales de la fecha, la hora y el lugar de la grabación, y oculta por lo que hubiera delante —
      con los controles de reproducción debajo. Es el elemento sobre el que se construyen los otros dos.</p>
    <pre><code>&lt;rr0-scene src="sighting.json"&gt;&lt;/rr0-scene&gt;</code></pre>
    <div class="table-scroll">
    <table>
      <tr><th>Miembro</th><th>Tipo</th><th>Qué hace</th></tr>
      <tr><td><code>src</code></td><td>atributo</td><td>URL de una grabación, cargada al conectarse y cada vez que cambia</td></tr>
      <tr><td><code>sightingData</code></td><td>propiedad</td><td>La grabación como objeto simple (véase <a href="/docs/format/">el formato</a>) — para leerla de nuevo tras editarla, o para asignarla en lugar de usar <code>src</code></td></tr>
      <tr><td><code>loadFromSrc(url)</code></td><td>método (async)</td><td>Lo que el atributo desencadena internamente. Espéralo cuando necesites que la grabación esté YA cargada antes de hacer cualquier otra cosa</td></tr>
      <tr><td><code>ufoElement</code></td><td>propiedad (lectura)</td><td>La capa de reproducción que compone — la línea de tiempo, los controles, el lienzo sobre el que actúa el puntero — y, a través de ella, todos los miembros de reproducción de más abajo</td></tr>
      <tr><td><code>sceneRenderer</code></td><td>propiedad (lectura)</td><td>El motor de renderizado 3D, para lo que nada más expone</td></tr>
      <tr><td><code>show-compass</code></td><td>atributo</td><td>Las etiquetas N/NE/E/… alrededor del horizonte. Desactivado por defecto: útil al fijar un rumbo, ruido al mirar</td></tr>
      <tr><td><code>star-catalog-src</code> / <code>deep-star-catalog-src</code></td><td>atributo</td><td>De dónde cargar el catálogo de estrellas, cuando alojas tu propia copia en lugar de la que acompaña al bundle: el nivel básico (hasta la magnitud 7,5, cargado por toda escena) y el nivel profundo (de 7,5 a 9, cargado solo por una grabación cuyo instrumento llega más allá de 7,5)</td></tr>
      <tr><td><code>max-pixel-ratio</code></td><td>atributo</td><td>El máximo de píxeles de la pantalla por píxel CSS con que la escena puede dibujar; el de la propia pantalla, hasta 2, si falta. La escena lo reduce por sí misma mientras las imágenes llegan tarde</td></tr>
      <tr><td><code>show-observer-map</code> / <code>hide-milestones</code></td><td>atributo</td><td>Se transmiten tal cual a la capa de reproducción de debajo — escríbelos en la etiqueta que tu página contenga realmente</td></tr>
    </table>
    </div>
    <p>Al pasar el puntero por encima, nombra lo que hay debajo — una estrella con su magnitud y su altura, un planeta,
      un cometa, un edificio, otro observador — y no dice nada donde el suelo oculta lo que
      señalas.</p>
    <p>El botón <q>©</q> de su esquina enumera los créditos de lo que muestra — las imágenes del
      suelo y del mapa, los modelos, las fotos del lugar, los sonidos. Dentro de
      <code>&lt;rr0-sighting&gt;</code> el botón está oculto: están en su panel <q>i</q>.</p>

    <h2>La reproducción, en <code>ufoElement</code></h2>
    <p>Todo lo relativo a reproducir la grabación vive una propiedad más abajo, en la capa de reproducción —
      <code>scene.ufoElement.play()</code> —, la misma capa a la que los otros dos componentes llegan a través
      de su propia <code>scene</code>.</p>
    <div class="table-scroll">
    <table>
      <tr><th>Miembro</th><th>Tipo</th><th>Qué hace</th></tr>
      <tr><td><code>src</code></td><td>atributo</td><td>URL de una grabación, cargada al conectarse y cada vez que cambia</td></tr>
      <tr><td><code>sightingData</code></td><td>propiedad</td><td>La grabación como objeto simple (véase <a href="/docs/format/">el formato</a>) — para leerla de nuevo tras editarla, o para asignarla en lugar de usar <code>src</code></td></tr>
      <tr><td><code>sighting</code></td><td>propiedad (lectura)</td><td>El modelo vivo: la hora y el lugar reales más la línea de tiempo de la grabación</td></tr>
      <tr><td><code>loadFromSrc(url)</code></td><td>método (async)</td><td>Lo que el atributo desencadena internamente. Espéralo cuando necesites que la grabación esté YA cargada antes de hacer cualquier otra cosa — reproducir antes de que se resuelva encuentra una línea de tiempo de longitud cero</td></tr>
      <tr><td><code>play()</code> / <code>pause()</code></td><td>método</td><td>Dicen qué estado se quiere, en lugar de invertir el actual</td></tr>
      <tr><td><code>togglePlayPause()</code></td><td>método</td><td>Lo que hacen el botón, el clic y la barra espaciadora</td></tr>
      <tr><td><code>playbackState</code></td><td>propiedad (lectura)</td><td><code>"stopped"</code>, <code>"playing"</code> o <code>"paused"</code></td></tr>
      <tr><td><code>currentTime</code></td><td>propiedad</td><td>El cabezal de reproducción, en las unidades propias de la línea de tiempo — <em>no</em> en milisegundos reales, véase <code>positionLabel</code></td></tr>
      <tr><td><code>seekableDuration</code></td><td>propiedad (lectura)</td><td>El intervalo que puede tomar <code>currentTime</code></td></tr>
      <tr><td><code>autoReplayEnabled</code></td><td>propiedad</td><td>La repetición en bucle, desactivada por defecto: una reproducción se ejecuta una vez y luego emite <code>ended</code>. <strong>Actívala</strong> para un bucle</td></tr>
      <tr><td><code>positionLabel</code> / <code>durationLabel</code></td><td>propiedad (lectura)</td><td>La posición y la duración ya formateadas por el elemento: la hora del reloj cuando la observación indica una fecha y se conoce su duración, el tiempo transcurrido en otro caso. Un clic en cualquiera de los dos contadores bajo la barra (o Intro sobre él) cambia de uno a otro, y emite <code>timedisplaychange</code></td></tr>
      <tr><td><code>refresh()</code></td><td>método</td><td>Vuelve a leer la duración y repinta — llámalo tras modificar <code>sighting.timeline</code> desde fuera</td></tr>
      <tr><td><code>canvasElement</code> / <code>renderer</code></td><td>propiedad (lectura)</td><td>El <code>&lt;canvas&gt;</code>, y el renderizador que pinta en él</td></tr>
      <tr><td><code>enableClickToPlay</code></td><td>propiedad</td><td>Si un clic alterna la reproducción y un doble clic alterna la pantalla completa (ambas cosas, o ninguna). El doble clic también devuelve la reproducción al estado en que estaba antes de su primer clic. Ponlo a false donde el lienzo te sirva para otra cosa</td></tr>
      <tr><td><code>fullscreenTarget</code></td><td>propiedad</td><td>Qué elemento amplía el botón de pantalla completa. <code>&lt;rr0-scene&gt;</code> lo fija en su propio escenario, para que sea el cielo lo que pase a pantalla completa y no solo la capa superpuesta. Donde el navegador no ofrece pantalla completa (un iPhone, un iframe sin <code>allow="fullscreen"</code>), el elemento llena la ventana en su lugar, y Escape sale de ella igualmente</td></tr>
      <tr><td><code>show-observer-map</code></td><td>atributo</td><td>Si el mapa de dónde se encontraba el observador empieza abierto: presente, lo abre; <code>"false"</code> lo mantiene cerrado. Ausente, decide la grabación: abierto cuando el observador se desplazó (un paseo por un campo, un trayecto en coche, un vuelo), cerrado cuando se quedó donde estaba. Decide el <em>estado inicial</em> del mapa, no si existe: el botón está ahí para toda grabación que indique un lugar</td></tr>
      <tr><td><code>toggleObserverMap()</code></td><td>método</td><td>Lo que hace ese botón. En el propio mapa, la rueda amplía alrededor del puntero, un arrastre desplaza el terreno, y sus propios botones amplían y vuelven al trayecto completo. Ampliado, se recentra en el observador cada vez que este llega a su borde, para que nunca salga de él</td></tr>
      <tr><td><code>observerPlacing</code></td><td>propiedad</td><td>Si un clic en el suelo despejado del mapa emite <code>observerplace</code> con <code>{ lat, lng }</code> — desactivado por defecto, ya que decir dónde se encontraba el observador corresponde a la grabación. El editor lo activa y escribe la posición en el cabezal de reproducción</td></tr>
      <tr><td><code>hide-milestones</code></td><td>atributo</td><td>Quita los momentos con nombre del relato — las marcas a lo largo de la barra, el rótulo que nombra el que se está reproduciendo y los puntos con letra del mapa. Aparecen allí donde una grabación nombra alguno, así que esta es la única manera de indicar lo contrario</td></tr>
      <tr><td><code>toggleMilestones()</code></td><td>método</td><td>Lo que hace ese botón</td></tr>
    </table>
    </div>
    <p>Esos dos son los únicos valores por defecto <em>positivo</em> y <em>negativo</em> que tiene este elemento, y
      la diferencia es deliberada. Los momentos con nombre de una grabación son sus propias palabras sobre sí misma, así que
      se muestran allí donde existen; el mapa cuesta peticiones de teselas a un tercero la primera vez que se
      abre, y no le corresponde a una página gastarlas en nombre de un lector sin decirlo. En ambos casos el
      lector conserva los dos botones, junto al de pantalla completa — que una página fije un valor por defecto no significa que
      prohíba lo contrario.</p>
    <p>La barra de herramientas y los botones de la esquina solo se muestran mientras el puntero está sobre la imagen, en reproducción
      o en pausa, o cuando el teclado lleva el foco hasta ellos. Una pantalla táctil, que no tiene
      puntero con el que pasar por encima, los mantiene visibles.</p>
    <p>Con la barra de tiempo enfocada, las teclas funcionan como en un sitio de vídeos: <kbd>←</kbd> retrocede 5 s,
      <kbd>→</kbd> avanza 5 s y <kbd>Espacio</kbd> reproduce o pausa. Reproducir o pausar, con una tecla, con el botón o con un
      clic en la imagen, muestra su símbolo un instante en el centro de la imagen.</p>
  </div>
</section>
`,
      it: `
<section class="band">
  <div class="wrap prose-wide">
    <p>La forma disegnata da un osservatore, collocata nel cielo, nell'orizzonte, nel meteo e nel suolo
      reali della data, dell'ora e del luogo della registrazione, e nascosta da ciò che le stava davanti —
      con i comandi di riproduzione sotto. È l'elemento su cui si costruiscono gli altri due.</p>
    <pre><code>&lt;rr0-scene src="sighting.json"&gt;&lt;/rr0-scene&gt;</code></pre>
    <div class="table-scroll">
    <table>
      <tr><th>Membro</th><th>Tipo</th><th>Cosa fa</th></tr>
      <tr><td><code>src</code></td><td>attributo</td><td>URL di una registrazione, caricata alla connessione e a ogni cambiamento</td></tr>
      <tr><td><code>sightingData</code></td><td>proprietà</td><td>La registrazione come oggetto semplice (vedere <a href="/docs/format/">il formato</a>) — da rileggere dopo la modifica, o da impostare invece di usare <code>src</code></td></tr>
      <tr><td><code>loadFromSrc(url)</code></td><td>metodo (async)</td><td>Ciò che l'attributo innesca internamente. Attendilo quando la registrazione deve essere GIÀ caricata prima di fare qualsiasi altra cosa</td></tr>
      <tr><td><code>ufoElement</code></td><td>proprietà (lettura)</td><td>Il livello di riproduzione che compone — la cronologia, i comandi, il canvas su cui agisce il puntatore — e, attraverso di esso, tutti i membri di riproduzione qui sotto</td></tr>
      <tr><td><code>sceneRenderer</code></td><td>proprietà (lettura)</td><td>Il motore di rendering 3D, per ciò che nient'altro espone</td></tr>
      <tr><td><code>show-compass</code></td><td>attributo</td><td>Le etichette N/NE/E/… lungo l'orizzonte. Disattivato per impostazione predefinita: utile quando si imposta una direzione, rumore quando si guarda</td></tr>
      <tr><td><code>star-catalog-src</code> / <code>deep-star-catalog-src</code></td><td>attributo</td><td>Da dove caricare il catalogo stellare, quando ne ospiti una tua copia invece di quella accanto al bundle: il livello base (fino alla magnitudine 7,5, caricato da ogni scena) e il livello profondo (da 7,5 a 9, caricato solo da una registrazione il cui strumento va oltre 7,5)</td></tr>
      <tr><td><code>max-pixel-ratio</code></td><td>attributo</td><td>Il massimo di pixel del dispositivo per pixel CSS con cui la scena può disegnare; quello dello schermo stesso, fino a 2, se assente. La scena lo abbassa da sé finché i fotogrammi sono in ritardo</td></tr>
      <tr><td><code>show-observer-map</code> / <code>hide-milestones</code></td><td>attributo</td><td>Passati tali e quali al livello di riproduzione sottostante — scrivili sul tag che la tua pagina contiene davvero</td></tr>
    </table>
    </div>
    <p>Al passaggio del puntatore nomina ciò che c'è sotto — una stella con la sua magnitudine e la sua altezza, un pianeta,
      una cometa, un edificio, un altro osservatore — e non dice nulla dove il suolo nasconde ciò che stai
      indicando.</p>
    <p>Il pulsante <q>©</q> nel suo angolo elenca i crediti di ciò che mostra — le immagini del
      suolo e della mappa, i modelli, le foto del luogo, i suoni. Dentro
      <code>&lt;rr0-sighting&gt;</code> il pulsante è nascosto: sono nel suo pannello <q>i</q>.</p>

    <h2>La riproduzione, su <code>ufoElement</code></h2>
    <p>Tutto ciò che riguarda la riproduzione della registrazione sta una proprietà più in basso, nel livello di riproduzione —
      <code>scene.ufoElement.play()</code> — lo stesso livello che gli altri due componenti raggiungono attraverso
      la propria <code>scene</code>.</p>
    <div class="table-scroll">
    <table>
      <tr><th>Membro</th><th>Tipo</th><th>Cosa fa</th></tr>
      <tr><td><code>src</code></td><td>attributo</td><td>URL di una registrazione, caricata alla connessione e a ogni cambiamento</td></tr>
      <tr><td><code>sightingData</code></td><td>proprietà</td><td>La registrazione come oggetto semplice (vedere <a href="/docs/format/">il formato</a>) — da rileggere dopo la modifica, o da impostare invece di usare <code>src</code></td></tr>
      <tr><td><code>sighting</code></td><td>proprietà (lettura)</td><td>Il modello vivo: ora e luogo reali più la cronologia della registrazione</td></tr>
      <tr><td><code>loadFromSrc(url)</code></td><td>metodo (async)</td><td>Ciò che l'attributo innesca internamente. Attendilo quando la registrazione deve essere GIÀ caricata prima di fare qualsiasi altra cosa — riprodurre prima che si risolva trova una cronologia di durata zero</td></tr>
      <tr><td><code>play()</code> / <code>pause()</code></td><td>metodo</td><td>Dicono quale stato si vuole, invece di invertire quello attuale</td></tr>
      <tr><td><code>togglePlayPause()</code></td><td>metodo</td><td>Ciò che fanno il pulsante, il clic e la barra spaziatrice</td></tr>
      <tr><td><code>playbackState</code></td><td>proprietà (lettura)</td><td><code>"stopped"</code>, <code>"playing"</code> o <code>"paused"</code></td></tr>
      <tr><td><code>currentTime</code></td><td>proprietà</td><td>La testina di riproduzione, nelle unità proprie della cronologia — <em>non</em> in millisecondi reali, vedere <code>positionLabel</code></td></tr>
      <tr><td><code>seekableDuration</code></td><td>proprietà (lettura)</td><td>L'intervallo che <code>currentTime</code> può assumere</td></tr>
      <tr><td><code>autoReplayEnabled</code></td><td>proprietà</td><td>La ripetizione in loop, disattivata per impostazione predefinita: una riproduzione va una volta, poi emette <code>ended</code>. <strong>Attivala</strong> per un loop</td></tr>
      <tr><td><code>positionLabel</code> / <code>durationLabel</code></td><td>proprietà (lettura)</td><td>La posizione e la durata già formattate dall'elemento: l'ora dell'orologio quando l'osservazione indica una data e la sua durata è nota, il tempo trascorso altrimenti. Un clic su uno dei due contatori sotto la barra (o Invio su di esso) passa dall'uno all'altro, ed emette <code>timedisplaychange</code></td></tr>
      <tr><td><code>refresh()</code></td><td>metodo</td><td>Rilegge la durata e ridisegna — chiamalo dopo aver modificato <code>sighting.timeline</code> dall'esterno</td></tr>
      <tr><td><code>canvasElement</code> / <code>renderer</code></td><td>proprietà (lettura)</td><td>Il <code>&lt;canvas&gt;</code>, e il renderer che ci dipinge sopra</td></tr>
      <tr><td><code>enableClickToPlay</code></td><td>proprietà</td><td>Se un clic avvia o ferma la riproduzione e un doppio clic attiva o disattiva lo schermo intero (entrambe le cose, o nessuna). Il doppio clic riporta anche la riproduzione allo stato in cui era prima del suo primo clic. Impostala a false dove il canvas ti serve per altro</td></tr>
      <tr><td><code>fullscreenTarget</code></td><td>proprietà</td><td>Quale elemento viene ingrandito dal pulsante schermo intero. <code>&lt;rr0-scene&gt;</code> la imposta sul proprio palco, così che sia il cielo ad andare a schermo intero e non solo il livello sovrapposto. Dove il browser non offre lo schermo intero (un iPhone, un iframe senza <code>allow="fullscreen"</code>), l'elemento riempie invece la finestra, ed Esc ne esce allo stesso modo</td></tr>
      <tr><td><code>show-observer-map</code></td><td>attributo</td><td>Se la mappa del punto in cui si trovava l'osservatore parte aperta: presente la apre, <code>"false"</code> la tiene chiusa. Assente, decide la registrazione: aperta quando l'osservatore si è spostato (una camminata in un campo, un tragitto in auto, un volo), chiusa quando è rimasto dov'era. Decide lo <em>stato iniziale</em> della mappa, non se esista: il pulsante c'è per ogni registrazione che indica un luogo</td></tr>
      <tr><td><code>toggleObserverMap()</code></td><td>metodo</td><td>Ciò che fa quel pulsante. Sulla mappa stessa la rotella ingrandisce attorno al puntatore, un trascinamento sposta il terreno, e i suoi pulsanti ingrandiscono e tornano al percorso intero. Ingrandita, si ricentra sull'osservatore ogni volta che questi ne raggiunge il bordo, perché non ne esca mai</td></tr>
      <tr><td><code>observerPlacing</code></td><td>proprietà</td><td>Se un clic sul suolo libero della mappa emette <code>observerplace</code> con <code>{ lat, lng }</code> — disattivata per impostazione predefinita, perché dire dove si trovava l'osservatore spetta alla registrazione. L'editor la attiva e scrive la posizione alla testina di riproduzione</td></tr>
      <tr><td><code>hide-milestones</code></td><td>attributo</td><td>Toglie i momenti nominati del resoconto — le tacche lungo la barra, la didascalia che nomina quello in riproduzione e i punti con lettera sulla mappa. Compaiono ovunque una registrazione ne nomini qualcuno, quindi questo è l'unico modo di dire il contrario</td></tr>
      <tr><td><code>toggleMilestones()</code></td><td>metodo</td><td>Ciò che fa quel pulsante</td></tr>
    </table>
    </div>
    <p>Quei due sono gli unici valori predefiniti <em>positivo</em> e <em>negativo</em> di questo elemento, e
      la differenza è voluta. I momenti nominati di una registrazione sono le sue stesse parole su di sé, quindi
      si mostrano ovunque esistano; la mappa costa richieste di tile a una terza parte la prima volta che si
      apre, e non spetta a una pagina spenderle per conto di un lettore senza dirlo. In entrambi i casi il
      lettore conserva i due pulsanti, accanto a quello dello schermo intero — una pagina che imposta un valore predefinito non è una pagina
      che vieta il contrario.</p>
    <p>La barra degli strumenti e i pulsanti dell'angolo compaiono solo mentre il puntatore è sopra l'immagine, in riproduzione
      o in pausa, o quando la tastiera vi porta il focus. Uno schermo tattile, che non ha
      un puntatore con cui passarci sopra, li tiene visibili.</p>
    <p>Con la barra del tempo attiva, i tasti funzionano come su un sito di video: <kbd>←</kbd> torna indietro di 5 s,
      <kbd>→</kbd> va avanti di 5 s e <kbd>Spazio</kbd> avvia o mette in pausa. Avviare o mettere in pausa, con un tasto, con il pulsante o con un
      clic sull'immagine, ne mostra il simbolo per un istante al centro dell'immagine.</p>
  </div>
</section>
`
    }
  },
  {
    slug: "docs/components/sighting",
    subpath: "sighting",
    size: { en: "249 KB", fr: "249 Ko", es: "249 KB", it: "249 KB" },
    tag: "rr0-sighting",
    lede: {
      en: "The standard sighting view",
      fr: "La vue standard d'une observation",
      es: "La vista estándar de un avistamiento",
      it: "La vista standard di un avvistamento"
    },
    description: {
      en: "The standard view of a real account: one observer or several, its toolbar and its members.",
      fr: "La vue standard d'un compte rendu réel : un ou plusieurs observateurs, sa barre d'outils et ses membres.",
      es: "La vista estándar de un relato real: uno o varios observadores, su barra de herramientas y sus miembros.",
      it: "La vista standard di un resoconto reale: uno o più osservatori, la sua barra degli strumenti e i suoi membri."
    },
    body: {
      en: `
<section class="band">
  <div class="wrap prose-wide">
    <p>The default for a real sighting, one observer or several. It composes an
      <code>&lt;rr0-scene&gt;</code> and adds the toolbar: who is testifying, and the <q>i</q> panel
      with the observation's own metadata and its credits, and a share button: the link that replays it, and its embed lines.</p>
    <pre><code>&lt;rr0-sighting src="sighting.json"&gt;&lt;/rr0-sighting&gt;
&lt;rr0-sighting src="case.json"&gt;&lt;/rr0-sighting&gt;  &lt;!-- a case, and all its observers --&gt;</code></pre>
    <div class="table-scroll">
    <table>
      <tr><th>Member</th><th>Kind</th><th>What it does</th></tr>
      <tr><td><code>src</code></td><td>attribute</td><td>A single recording, or a <a href="/docs/format/#several-observers-the-case">case</a> whose sighting events list several — told apart by their shape. A bare array of recordings is refused: list them as the sighting events of a case</td></tr>
      <tr><td><code>observerUrls</code></td><td>property</td><td>The recordings to show, as a plain array of URLs, instead of <code>src</code>. Setting it again keeps the observer on show if the new list still has them</td></tr>
      <tr><td><code>sightingData</code></td><td>property</td><td>One recording, set directly — for a page holding one in memory rather than at a URL</td></tr>
      <tr><td><code>scene</code></td><td>property (read)</td><td>The composed <code>&lt;rr0-scene&gt;</code>, and through <code>scene.ufoElement</code> the playback members</td></tr>
      <tr><td><code>loadFromSrc(url)</code></td><td>method (async)</td><td>What the attribute triggers</td></tr>
      <tr><td><code>show-labels</code></td><td>attribute</td><td>The strip of the recording's own parameters under the picture. Off by default — and a reader can open or close it themselves from the <q>i</q> panel</td></tr>
      <tr><td><code>show-observer-map</code> / <code>hide-milestones</code></td><td>attribute</td><td>Passed down through the composed <code>&lt;rr0-scene&gt;</code> to the player that owns them</td></tr>
    </table>
    </div>
    <p>A recording that names no observer gets no “account by” line at all, which is the accurate
      thing to say of a sky set up to show a halo.</p>
    <p>Every observer's recording is fetched as soon as the list is known, so picking another one
      is immediate. The list names each by its <code>title</code>, else first names and last name,
      else <code>id</code>; one that names nobody is numbered by its place in the list.</p>
    <p>The <q>i</q> panel opens as a popover, which Escape or a click outside closes (a click
      outside only, on a browser without popovers). It states the case, the date, the place, the
      account and the tags; date, place and tags leave it while the <code>show-labels</code> strip
      already states them. The date is on the observer's own clock (<code>utcOffsetHours</code>, or
      one approximated from the longitude), not the reader's. The version at its foot opens this
      observation in the editor, and its embed lines load the element from wherever this copy of
      it was itself loaded, so a snippet copied from a local or staging copy points back at that
      copy.</p>
  </div>
</section>
`,
      fr: `
<section class="band">
  <div class="wrap prose-wide">
    <p>Le choix par défaut pour une observation réelle, à un observateur ou plusieurs. Il compose un
      <code>&lt;rr0-scene&gt;</code> et ajoute la barre d'outils : qui témoigne, et le panneau
      <q>i</q> avec les métadonnées de l'observation et ses crédits, et un bouton de partage : le lien qui la rejoue, et ses lignes d'intégration.</p>
    <pre><code>&lt;rr0-sighting src="sighting.json"&gt;&lt;/rr0-sighting&gt;
&lt;rr0-sighting src="case.json"&gt;&lt;/rr0-sighting&gt;  &lt;!-- un dossier, et tous ses observateurs --&gt;</code></pre>
    <div class="table-scroll">
    <table>
      <tr><th>Membre</th><th>Nature</th><th>Rôle</th></tr>
      <tr><td><code>src</code></td><td>attribut</td><td>Un enregistrement, ou un <a href="/docs/format/#several-observers-the-case">dossier</a> dont les événements sighting en listent plusieurs — reconnus à leur forme. Un simple tableau d'enregistrements est refusé : listez-les comme événements sighting d'un dossier</td></tr>
      <tr><td><code>observerUrls</code></td><td>propriété</td><td>Les enregistrements à montrer, comme simple tableau d'URLs, au lieu de <code>src</code>. Le reposer garde l'observateur affiché si la nouvelle liste le contient encore</td></tr>
      <tr><td><code>sightingData</code></td><td>propriété</td><td>Un enregistrement posé directement — pour une page qui en tient un en mémoire plutôt qu'à une URL</td></tr>
      <tr><td><code>scene</code></td><td>propriété (lecture)</td><td>Le <code>&lt;rr0-scene&gt;</code> composé, et par <code>scene.ufoElement</code> les membres de lecture</td></tr>
      <tr><td><code>loadFromSrc(url)</code></td><td>méthode (async)</td><td>Ce que déclenche l'attribut</td></tr>
      <tr><td><code>show-labels</code></td><td>attribut</td><td>Le bandeau des paramètres de l'enregistrement sous l'image. Absent par défaut — et un lecteur peut l'ouvrir ou le fermer lui-même depuis le panneau <q>i</q></td></tr>
      <tr><td><code>show-observer-map</code> / <code>hide-milestones</code></td><td>attribut</td><td>Transmis à travers le <code>&lt;rr0-scene&gt;</code> composé jusqu'au lecteur qui les porte</td></tr>
    </table>
    </div>
    <p>Un enregistrement qui ne nomme aucun observateur n'affiche aucune ligne « compte rendu de » — ce qui
      est exact pour un ciel réglé pour montrer un halo.</p>
    <p>L'enregistrement de chaque observateur est chargé dès que la liste est connue : en choisir
      un autre est immédiat. La liste nomme chacun par son <code>title</code>, sinon ses prénoms et
      son nom, sinon son <code>id</code> ; celui qui ne nomme personne est numéroté selon sa place
      dans la liste.</p>
    <p>Le panneau <q>i</q> s'ouvre en <i lang="en">popover</i>, que ferment Échap ou un clic à
      l'extérieur (seulement un clic à l'extérieur, sur un navigateur sans <i lang="en">popover</i>).
      Il énonce le dossier, la date, le lieu, le compte rendu et les tags ; date, lieu et tags le
      quittent tant que le bandeau <code>show-labels</code> les énonce déjà. La date est à l'heure de
      l'observateur (<code>utcOffsetHours</code>, ou une heure approchée depuis la longitude), pas à
      celle du lecteur. La version en pied de panneau ouvre cette observation dans l'éditeur, et ses
      lignes d'intégration chargent l'élément depuis l'endroit d'où cette copie a elle-même été
      chargée : un extrait copié depuis une copie locale ou de recette renvoie à cette copie.</p>
  </div>
</section>
`,
      es: `
<section class="band">
  <div class="wrap prose-wide">
    <p>La opción por defecto para un avistamiento real, con uno o varios observadores. Compone un
      <code>&lt;rr0-scene&gt;</code> y añade la barra de herramientas: quién da su relato, y el panel <q>i</q>
      con los metadatos propios de la observación y sus créditos, y un botón de compartir: el enlace que la reproduce, y sus líneas de inserción.</p>
    <pre><code>&lt;rr0-sighting src="sighting.json"&gt;&lt;/rr0-sighting&gt;
&lt;rr0-sighting src="case.json"&gt;&lt;/rr0-sighting&gt;  &lt;!-- un caso, y todos sus observadores --&gt;</code></pre>
    <div class="table-scroll">
    <table>
      <tr><th>Miembro</th><th>Tipo</th><th>Qué hace</th></tr>
      <tr><td><code>src</code></td><td>atributo</td><td>Una sola grabación, o un <a href="/docs/format/#several-observers-the-case">caso</a> cuyos eventos sighting enumeran varias — se distinguen por su forma. Un simple array de grabaciones se rechaza: enuméralas como los eventos sighting de un caso</td></tr>
      <tr><td><code>observerUrls</code></td><td>propiedad</td><td>Las grabaciones que mostrar, como simple array de URL, en lugar de <code>src</code>. Volver a asignarla mantiene el observador mostrado si la nueva lista aún lo contiene</td></tr>
      <tr><td><code>sightingData</code></td><td>propiedad</td><td>Una grabación, asignada directamente — para una página que la tiene en memoria en lugar de en una URL</td></tr>
      <tr><td><code>scene</code></td><td>propiedad (lectura)</td><td>El <code>&lt;rr0-scene&gt;</code> compuesto, y a través de <code>scene.ufoElement</code> los miembros de reproducción</td></tr>
      <tr><td><code>loadFromSrc(url)</code></td><td>método (async)</td><td>Lo que el atributo desencadena</td></tr>
      <tr><td><code>show-labels</code></td><td>atributo</td><td>La franja con los parámetros propios de la grabación bajo la imagen. Desactivada por defecto — y un lector puede abrirla o cerrarla por sí mismo desde el panel <q>i</q></td></tr>
      <tr><td><code>show-observer-map</code> / <code>hide-milestones</code></td><td>atributo</td><td>Se transmiten a través del <code>&lt;rr0-scene&gt;</code> compuesto hasta el reproductor que los posee</td></tr>
    </table>
    </div>
    <p>Una grabación que no nombra a ningún observador no muestra ninguna línea “relato de”, que es lo exacto
      que cabe decir de un cielo preparado para mostrar un halo.</p>
    <p>La grabación de cada observador se carga en cuanto se conoce la lista, así que elegir otra
      es inmediato. La lista nombra a cada uno por su <code>title</code>, si no por sus nombres y apellido,
      si no por su <code>id</code>; uno que no nombra a nadie se numera según su lugar en la lista.</p>
    <p>El panel <q>i</q> se abre como un <i lang="en">popover</i>, que Escape o un clic fuera cierran (solo un clic
      fuera, en un navegador sin <i lang="en">popover</i>). Indica el caso, la fecha, el lugar, el
      relato y las etiquetas; fecha, lugar y etiquetas desaparecen de él mientras la franja <code>show-labels</code>
      ya los indica. La fecha está en la hora del propio observador (<code>utcOffsetHours</code>, o
      una aproximada a partir de la longitud), no en la del lector. La versión al pie abre esta
      observación en el editor, y sus líneas de inserción cargan el elemento desde dondequiera que esta copia
      se cargó a su vez, así que un fragmento copiado desde una copia local o de pruebas apunta de vuelta a esa
      copia.</p>
  </div>
</section>
`,
      it: `
<section class="band">
  <div class="wrap prose-wide">
    <p>La scelta predefinita per un avvistamento reale, con uno o più osservatori. Compone un
      <code>&lt;rr0-scene&gt;</code> e aggiunge la barra degli strumenti: chi rende il resoconto, e il pannello <q>i</q>
      con i metadati propri dell'osservazione e i suoi crediti, e un pulsante di condivisione: il link che la riproduce, e le sue righe di incorporamento.</p>
    <pre><code>&lt;rr0-sighting src="sighting.json"&gt;&lt;/rr0-sighting&gt;
&lt;rr0-sighting src="case.json"&gt;&lt;/rr0-sighting&gt;  &lt;!-- un caso, e tutti i suoi osservatori --&gt;</code></pre>
    <div class="table-scroll">
    <table>
      <tr><th>Membro</th><th>Tipo</th><th>Cosa fa</th></tr>
      <tr><td><code>src</code></td><td>attributo</td><td>Una sola registrazione, o un <a href="/docs/format/#several-observers-the-case">caso</a> i cui eventi sighting ne elencano diverse — distinti dalla loro forma. Un semplice array di registrazioni viene rifiutato: elencale come eventi sighting di un caso</td></tr>
      <tr><td><code>observerUrls</code></td><td>proprietà</td><td>Le registrazioni da mostrare, come semplice array di URL, invece di <code>src</code>. Reimpostarla mantiene l'osservatore mostrato se la nuova lista lo contiene ancora</td></tr>
      <tr><td><code>sightingData</code></td><td>proprietà</td><td>Una registrazione, impostata direttamente — per una pagina che ne tiene una in memoria invece che a un URL</td></tr>
      <tr><td><code>scene</code></td><td>proprietà (lettura)</td><td>Il <code>&lt;rr0-scene&gt;</code> composto, e attraverso <code>scene.ufoElement</code> i membri di riproduzione</td></tr>
      <tr><td><code>loadFromSrc(url)</code></td><td>metodo (async)</td><td>Ciò che l'attributo innesca</td></tr>
      <tr><td><code>show-labels</code></td><td>attributo</td><td>La striscia dei parametri propri della registrazione sotto l'immagine. Disattivata per impostazione predefinita — e un lettore può aprirla o chiuderla da sé dal pannello <q>i</q></td></tr>
      <tr><td><code>show-observer-map</code> / <code>hide-milestones</code></td><td>attributo</td><td>Passati attraverso il <code>&lt;rr0-scene&gt;</code> composto fino al lettore che li possiede</td></tr>
    </table>
    </div>
    <p>Una registrazione che non nomina alcun osservatore non ha nessuna riga “resoconto di”, ed è la cosa esatta
      da dire di un cielo preparato per mostrare un alone.</p>
    <p>La registrazione di ogni osservatore viene caricata non appena la lista è nota, quindi sceglierne un'altra
      è immediato. La lista nomina ciascuno con il suo <code>title</code>, altrimenti con nomi e cognome,
      altrimenti con il suo <code>id</code>; uno che non nomina nessuno è numerato secondo il suo posto nella lista.</p>
    <p>Il pannello <q>i</q> si apre come <i lang="en">popover</i>, che Esc o un clic all'esterno chiudono (solo un clic
      all'esterno, su un browser senza <i lang="en">popover</i>). Indica il caso, la data, il luogo, il
      resoconto e i tag; data, luogo e tag ne escono finché la striscia <code>show-labels</code>
      li indica già. La data è all'ora dell'osservatore stesso (<code>utcOffsetHours</code>, o
      un'ora approssimata dalla longitudine), non a quella del lettore. La versione in fondo apre questa
      osservazione nell'editor, e le sue righe di incorporamento caricano l'elemento da dovunque questa copia
      sia stata a sua volta caricata, così che uno snippet copiato da una copia locale o di staging rimandi a quella
      copia.</p>
  </div>
</section>
`
    },
    events: {
      en: `<div class="table-scroll">
    <table>
      <tr><th>Event</th><th>Fires</th><th>Where to listen</th></tr>
      <tr><td><code>observerchange</code></td><td>When the recording on show changes: loaded, set through <code>sightingData</code>, or another observer picked from the list. <code>detail.src</code> is its address, empty for a recording set by script</td><td>On this element. It does not bubble: listen on the <code>&lt;rr0-sighting&gt;</code> itself, then read <code>sightingData</code> back off it (its description, its id)</td></tr>
      <tr><td><code>recordingissues</code></td><td>Once a loaded recording has been checked against the format: <code>detail.issues</code> lists what was not played as written (a key nothing reads, a value of the wrong type or outside its list, a value made up because the file left it out), each with its <code>kind</code> and <code>path</code>. Empty when there is nothing to say. The same list is shown over the picture behind a ⚠, and written to the console</td><td>Anywhere above the element: it bubbles out of every shadow root</td></tr>
    </table>
    </div>`,
      fr: `<div class="table-scroll">
    <table>
      <tr><th>Événement</th><th>Quand</th><th>Où l'écouter</th></tr>
      <tr><td><code>observerchange</code></td><td>Quand l'enregistrement affiché change : chargé, posé par <code>sightingData</code>, ou un autre observateur choisi dans la liste. <code>detail.src</code> est son adresse, vide pour un enregistrement posé par script</td><td>Sur cet élément. Il n'est pas <i lang="en">bubbling</i> : écoutez sur le <code>&lt;rr0-sighting&gt;</code> lui-même, puis relisez son <code>sightingData</code> (sa description, son identifiant)</td></tr>
      <tr><td><code>recordingissues</code></td><td>Une fois un enregistrement chargé vérifié contre le format : <code>detail.issues</code> liste ce qui n'a pas été joué comme écrit (une clé que rien ne lit, une valeur du mauvais type ou hors de sa liste, une valeur inventée parce que le fichier l'omettait), chacun avec son <code>kind</code> et son <code>path</code>. Vide quand il n'y a rien à dire. La même liste s'affiche sur l'image derrière un ⚠, et en console</td><td>N'importe où au-dessus de l'élément : il traverse toutes les racines fantômes</td></tr>
    </table>
    </div>`,
      es: `<div class="table-scroll">
    <table>
      <tr><th>Evento</th><th>Cuándo</th><th>Dónde escucharlo</th></tr>
      <tr><td><code>observerchange</code></td><td>Cuando cambia la grabación mostrada: cargada, asignada mediante <code>sightingData</code>, u otro observador elegido en la lista. <code>detail.src</code> es su dirección, vacía para una grabación asignada por script</td><td>En este elemento. No hace <i lang="en">bubbling</i>: escucha en el propio <code>&lt;rr0-sighting&gt;</code> y luego vuelve a leer su <code>sightingData</code> (su descripción, su id)</td></tr>
      <tr><td><code>recordingissues</code></td><td>Una vez que una grabación cargada se ha comprobado contra el formato: <code>detail.issues</code> enumera lo que no se reprodujo tal como estaba escrito (una clave que nada lee, un valor de tipo erróneo o fuera de su lista, un valor inventado porque el archivo lo omitía), cada uno con su <code>kind</code> y su <code>path</code>. Vacía cuando no hay nada que decir. La misma lista se muestra sobre la imagen tras un ⚠, y se escribe en la consola</td><td>En cualquier parte por encima del elemento: se propaga fuera de todas las raíces shadow</td></tr>
    </table>
    </div>`,
      it: `<div class="table-scroll">
    <table>
      <tr><th>Evento</th><th>Quando</th><th>Dove ascoltarlo</th></tr>
      <tr><td><code>observerchange</code></td><td>Quando cambia la registrazione mostrata: caricata, impostata tramite <code>sightingData</code>, o un altro osservatore scelto dalla lista. <code>detail.src</code> è il suo indirizzo, vuoto per una registrazione impostata da script</td><td>Su questo elemento. Non fa <i lang="en">bubbling</i>: ascolta sul <code>&lt;rr0-sighting&gt;</code> stesso, poi rileggi il suo <code>sightingData</code> (la sua descrizione, il suo id)</td></tr>
      <tr><td><code>recordingissues</code></td><td>Una volta che una registrazione caricata è stata verificata rispetto al formato: <code>detail.issues</code> elenca ciò che non è stato riprodotto come scritto (una chiave che nulla legge, un valore del tipo sbagliato o fuori dalla sua lista, un valore inventato perché il file lo ometteva), ciascuno con il suo <code>kind</code> e il suo <code>path</code>. Vuota quando non c'è nulla da dire. La stessa lista è mostrata sull'immagine dietro un ⚠, e scritta nella console</td><td>Ovunque sopra l'elemento: si propaga fuori da tutte le shadow root</td></tr>
    </table>
    </div>`
    }
  },
  {
    slug: "docs/components/editor",
    subpath: "editor",
    size: { en: "293 KB", fr: "293 Ko", es: "293 KB", it: "293 KB" },
    events: {
      en: `<div class="table-scroll">
    <table>
      <tr><th>Event</th><th>Fires</th><th>Where to listen</th></tr>
      <tr><td><code>sightingchange</code></td><td>After an edit: a field written, an instrument chosen, a time zone derived, a shape moved along the timeline</td><td>On this element. It does not bubble, so listen on the <code>&lt;rr0-sighting-editor&gt;</code> itself — then read <code>sightingData</code> back off it</td></tr>
    </table>
    </div>`,
      fr: `<div class="table-scroll">
    <table>
      <tr><th>Événement</th><th>Quand</th><th>Où l'écouter</th></tr>
      <tr><td><code>sightingchange</code></td><td>Après une modification : un champ écrit, un instrument choisi, un fuseau dérivé, une forme déplacée sur la timeline</td><td>Sur cet élément. Il n'est pas <i lang="en">bubbling</i> : écoutez sur le <code>&lt;rr0-sighting-editor&gt;</code> lui-même, puis relisez son <code>sightingData</code></td></tr>
    </table>
    </div>`,
      es: `<div class="table-scroll">
    <table>
      <tr><th>Evento</th><th>Cuándo</th><th>Dónde escucharlo</th></tr>
      <tr><td><code>sightingchange</code></td><td>Tras una edición: un campo escrito, un instrumento elegido, una zona horaria deducida, una forma desplazada a lo largo de la línea de tiempo</td><td>En este elemento. No hace <i lang="en">bubbling</i>, así que escucha en el propio <code>&lt;rr0-sighting-editor&gt;</code> — y luego vuelve a leer su <code>sightingData</code></td></tr>
    </table>
    </div>`,
      it: `<div class="table-scroll">
    <table>
      <tr><th>Evento</th><th>Quando</th><th>Dove ascoltarlo</th></tr>
      <tr><td><code>sightingchange</code></td><td>Dopo una modifica: un campo scritto, uno strumento scelto, un fuso orario dedotto, una forma spostata lungo la cronologia</td><td>Su questo elemento. Non fa <i lang="en">bubbling</i>, quindi ascolta sul <code>&lt;rr0-sighting-editor&gt;</code> stesso — poi rileggi il suo <code>sightingData</code></td></tr>
    </table>
    </div>`
    },
    tag: "rr0-sighting-editor",
    lede: {
      en: "The editor",
      fr: "L'éditeur",
      es: "El editor",
      it: "L'editor"
    },
    description: {
      en: "The whole authoring toolbar: what it takes, what it gives back, and when it says so.",
      fr: "Toute la barre d'outils d'écriture : ce qu'elle prend, ce qu'elle rend, et quand elle le dit.",
      es: "Toda la barra de herramientas de edición: lo que recibe, lo que devuelve y cuándo lo avisa.",
      it: "Tutta la barra degli strumenti di creazione: cosa riceve, cosa restituisce, e quando lo segnala."
    },
    body: {
      en: `
<section class="band">
  <div class="wrap prose-wide">
    <p>Everything above plus the authoring toolbar. Put it on a page where people should be able to
      describe or correct an observation themselves.</p>
    <pre><code>&lt;rr0-sighting-editor&gt;&lt;/rr0-sighting-editor&gt;
&lt;rr0-sighting-editor src="sighting.json"&gt;&lt;/rr0-sighting-editor&gt;</code></pre>
    <p>Its canvas is an editing surface, so <code>enableClickToPlay</code> is off there: a click
      selects and drags a shape rather than toggling playback. What the eight groups of its toolbar
      do is <a href="/edit/">the editor's own page</a>.</p>
    <div class="table-scroll">
    <table>
      <tr><th>Member</th><th>Kind</th><th>What it does</th></tr>
      <tr><td><code>ufoElement</code></td><td>property (read)</td><td>Reaches through to the canvas, the timeline and the appearance work</td></tr>
      <tr><td><code>appearance</code></td><td>property</td><td>What the next shape drawn will look like: <code>{ presetId, color, transparency, haloScale, blur, brightness }</code>, <code>presetId</code> being <code>"oval"</code> or <code>"polygon"</code> and the others the <a href="/docs/format/#what-was-seen">shape fields</a> of the same names. Setting it takes only the fields you give</td></tr>
      <tr><td><code>sightingchange</code></td><td>event</td><td>Fires after every edit — the single signal that the recording has changed</td></tr>
    </table>
    </div>
  </div>
</section>
`,
      fr: `
<section class="band">
  <div class="wrap prose-wide">
    <p>Tout ce qui précède, plus la barre d'outils de saisie. À poser sur une page où l'on doit
      pouvoir décrire ou corriger une observation soi-même.</p>
    <pre><code>&lt;rr0-sighting-editor&gt;&lt;/rr0-sighting-editor&gt;
&lt;rr0-sighting-editor src="sighting.json"&gt;&lt;/rr0-sighting-editor&gt;</code></pre>
    <p>Son canevas est une surface d'édition : <code>enableClickToPlay</code> y est désactivé, un
      clic sélectionne et déplace une forme au lieu de basculer la lecture. Ce que font les huit
      groupes de sa barre d'outils est sur <a href="/edit/">la page de l'éditeur</a>.</p>
    <div class="table-scroll">
    <table>
      <tr><th>Membre</th><th>Nature</th><th>Rôle</th></tr>
      <tr><td><code>ufoElement</code></td><td>propriété (lecture)</td><td>Donne accès au canevas, à la chronologie et au travail d'apparence</td></tr>
      <tr><td><code>appearance</code></td><td>propriété</td><td>L'allure de la prochaine forme dessinée : <code>{ presetId, color, transparency, haloScale, blur, brightness }</code>, <code>presetId</code> valant <code>"oval"</code> ou <code>"polygon"</code> et les autres étant les <a href="/docs/format/#what-was-seen">champs de forme</a> de même nom. La poser ne prend que les champs donnés</td></tr>
      <tr><td><code>sightingchange</code></td><td>événement</td><td>Émis après chaque modification — le signal unique que l'enregistrement a changé</td></tr>
    </table>
    </div>
  </div>
</section>
`,
      es: `
<section class="band">
  <div class="wrap prose-wide">
    <p>Todo lo anterior más la barra de herramientas de edición. Ponlo en una página donde la gente deba poder
      describir o corregir una observación por sí misma.</p>
    <pre><code>&lt;rr0-sighting-editor&gt;&lt;/rr0-sighting-editor&gt;
&lt;rr0-sighting-editor src="sighting.json"&gt;&lt;/rr0-sighting-editor&gt;</code></pre>
    <p>Su lienzo es una superficie de edición, así que <code>enableClickToPlay</code> está desactivado ahí: un clic
      selecciona y arrastra una forma en lugar de alternar la reproducción. Lo que hacen los ocho grupos de su barra de herramientas
      está en <a href="/edit/">la página del propio editor</a>.</p>
    <div class="table-scroll">
    <table>
      <tr><th>Miembro</th><th>Tipo</th><th>Qué hace</th></tr>
      <tr><td><code>ufoElement</code></td><td>propiedad (lectura)</td><td>Da acceso al lienzo, a la línea de tiempo y al trabajo de apariencia</td></tr>
      <tr><td><code>appearance</code></td><td>propiedad</td><td>Cómo será la próxima forma dibujada: <code>{ presetId, color, transparency, haloScale, blur, brightness }</code>, siendo <code>presetId</code> <code>"oval"</code> o <code>"polygon"</code> y los demás los <a href="/docs/format/#what-was-seen">campos de forma</a> del mismo nombre. Asignarla solo toma los campos que le des</td></tr>
      <tr><td><code>sightingchange</code></td><td>evento</td><td>Se emite tras cada edición — la única señal de que la grabación ha cambiado</td></tr>
    </table>
    </div>
  </div>
</section>
`,
      it: `
<section class="band">
  <div class="wrap prose-wide">
    <p>Tutto quanto sopra più la barra degli strumenti di creazione. Mettilo in una pagina dove le persone devono poter
      descrivere o correggere un'osservazione da sé.</p>
    <pre><code>&lt;rr0-sighting-editor&gt;&lt;/rr0-sighting-editor&gt;
&lt;rr0-sighting-editor src="sighting.json"&gt;&lt;/rr0-sighting-editor&gt;</code></pre>
    <p>Il suo canvas è una superficie di modifica, quindi <code>enableClickToPlay</code> lì è disattivato: un clic
      seleziona e trascina una forma invece di avviare o fermare la riproduzione. Cosa fanno gli otto gruppi della sua barra degli strumenti
      è spiegato nella <a href="/edit/">pagina dell'editor</a>.</p>
    <div class="table-scroll">
    <table>
      <tr><th>Membro</th><th>Tipo</th><th>Cosa fa</th></tr>
      <tr><td><code>ufoElement</code></td><td>proprietà (lettura)</td><td>Dà accesso al canvas, alla cronologia e al lavoro sull'aspetto</td></tr>
      <tr><td><code>appearance</code></td><td>proprietà</td><td>L'aspetto che avrà la prossima forma disegnata: <code>{ presetId, color, transparency, haloScale, blur, brightness }</code>, dove <code>presetId</code> vale <code>"oval"</code> o <code>"polygon"</code> e gli altri sono i <a href="/docs/format/#what-was-seen">campi di forma</a> con lo stesso nome. Impostarla prende solo i campi che fornisci</td></tr>
      <tr><td><code>sightingchange</code></td><td>evento</td><td>Emesso dopo ogni modifica — l'unico segnale che la registrazione è cambiata</td></tr>
    </table>
    </div>
  </div>
</section>
`
    }
  }
]
