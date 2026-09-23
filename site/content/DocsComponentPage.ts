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
      navLabel: { en: `<${doc.tag}>`, fr: `<${doc.tag}>` },
      title: { en: `<${doc.tag}>`, fr: `<${doc.tag}>` },
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
      label: { en: "The components", fr: "Les composants" }
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
    <h2>${language === "fr" ? "Ce qu'il émet" : "What it fires"}</h2>
    ${events}
  </div>
</section>
`
  }

  /** The same two lines as everywhere else, with this component's own name filled in. Repeated on
   * each page on purpose: somebody who came here for one component should not have to go back to
   * the hub to find out how to load the thing they have just read about. */
  private integration(language: SiteLanguage): string {
    const fr = language === "fr"
    const tag = this.doc.tag
    return `
<section class="band">
  <div class="wrap prose-wide">
    <h2>${fr ? "L'intégrer" : "Putting it in your page"}</h2>
    <pre><code>&lt;script type="module" src="https://ufoathome.org/lib/${tag}.mjs"&gt;&lt;/script&gt;
&lt;${tag}${tag === "rr0-sighting-editor" ? "" : ' src="sighting.json"'}&gt;&lt;/${tag}&gt;</code></pre>
    <p>${fr
      ? `${tag === "rr0-sighting-editor" ? "" : `<code>sighting.json</code> est un <a href="/docs/format/">fichier d'observation</a>. `}Ou, après <code>npm install @rr0/ufoathome</code> : <code>import "@rr0/ufoathome/${this.doc.subpath}"</code>.
         Le bundle pèse ${this.doc.size.fr} compressé et enregistre le tag lui-même — rien d'autre à appeler.
         <a href="/docs/components/#integrer-dans-votre-application">Le hub</a> dit ce que cela suppose par ailleurs,
         et <a href="/docs/share/">partager une observation</a> a l'exemple complet, à essayer et à copier.`
      : `${tag === "rr0-sighting-editor" ? "" : `<code>sighting.json</code> is a <a href="/docs/format/">sighting file</a>. `}Or, after <code>npm install @rr0/ufoathome</code>: <code>import "@rr0/ufoathome/${this.doc.subpath}"</code>.
         The bundle is ${this.doc.size.en} gzipped and registers the tag itself — nothing else to call.
         <a href="/docs/components/#putting-one-in-your-application">The hub</a> says what else that involves, and
         <a href="/docs/share/">sharing an observation</a> has the whole example, to try and to copy.`}</p>
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
    size: { en: "238 KB", fr: "238 Ko" },
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
    </div>`
    },
    tag: "rr0-scene",
    lede: {
      en: "The phenomenon, the sky and the ground",
      fr: "Le phénomène, le ciel et le sol"
    },
    description: {
      en: "What <rr0-scene> draws — the shape in the real sky and horizon — the markup it takes, and every attribute, property and method it answers to.",
      fr: "Ce que <rr0-scene> dessine — la forme dans le vrai ciel et le vrai horizon — le balisage qu'il accepte, et chaque attribut, propriété et méthode auquel il répond."
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
      <code>&lt;rr0-sighting&gt;</code> the button is hidden: they are in its <q>?</q> panel.</p>

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
      <tr><td><code>show-observer-map</code></td><td>attribute</td><td>Start with the map of where the observer stood already open. It decides the map's <em>starting state</em>, not whether it exists: the button is there for every recording that states a place, set or not</td></tr>
      <tr><td><code>toggleObserverMap()</code></td><td>method</td><td>What that button does</td></tr>
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
      ce bouton est masqué : ils sont dans son panneau <q>?</q>.</p>

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
      <tr><td><code>show-observer-map</code></td><td>attribut</td><td>Ouvrir d'emblée la carte d'où se tenait l'observateur. Il décide de l'état de <em>départ</em> de la carte, pas de son existence : le bouton est là pour tout enregistrement qui énonce un lieu, qu'on le pose ou non</td></tr>
      <tr><td><code>toggleObserverMap()</code></td><td>méthode</td><td>Ce que fait ce bouton</td></tr>
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
  </div>
</section>
`
    }
  },
  {
    slug: "docs/components/sighting",
    subpath: "sighting",
    size: { en: "249 KB", fr: "249 Ko" },
    tag: "rr0-sighting",
    lede: {
      en: "The standard sighting view",
      fr: "La vue standard d'une observation"
    },
    description: {
      en: "The standard view of a real account: one observer or several, its toolbar and its members.",
      fr: "La vue standard d'un compte rendu réel : un ou plusieurs observateurs, sa barre d'outils et ses membres."
    },
    body: {
      en: `
<section class="band">
  <div class="wrap prose-wide">
    <p>The default for a real sighting, one observer or several. It composes an
      <code>&lt;rr0-scene&gt;</code> and adds the toolbar: who is testifying, and the <q>?</q> panel
      with the observation's own metadata, its credits and its embed lines.</p>
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
      <tr><td><code>show-labels</code></td><td>attribute</td><td>The strip of the recording's own parameters under the picture. Off by default — and a reader can open or close it themselves from the <q>?</q> panel</td></tr>
      <tr><td><code>show-observer-map</code> / <code>hide-milestones</code></td><td>attribute</td><td>Passed down through the composed <code>&lt;rr0-scene&gt;</code> to the player that owns them</td></tr>
    </table>
    </div>
    <p>A recording that names no observer gets no “account by” line at all, which is the accurate
      thing to say of a sky set up to show a halo.</p>
    <p>Every observer's recording is fetched as soon as the list is known, so picking another one
      is immediate. The list names each by its <code>title</code>, else first names and last name,
      else <code>id</code>; one that names nobody is numbered by its place in the list.</p>
    <p>The <q>?</q> panel opens as a popover, which Escape or a click outside closes (a click
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
      <q>?</q> avec les métadonnées de l'observation, ses crédits et ses lignes d'intégration.</p>
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
      <tr><td><code>show-labels</code></td><td>attribut</td><td>Le bandeau des paramètres de l'enregistrement sous l'image. Absent par défaut — et un lecteur peut l'ouvrir ou le fermer lui-même depuis le panneau <q>?</q></td></tr>
      <tr><td><code>show-observer-map</code> / <code>hide-milestones</code></td><td>attribut</td><td>Transmis à travers le <code>&lt;rr0-scene&gt;</code> composé jusqu'au lecteur qui les porte</td></tr>
    </table>
    </div>
    <p>Un enregistrement qui ne nomme aucun observateur n'affiche aucune ligne « compte rendu de » — ce qui
      est exact pour un ciel réglé pour montrer un halo.</p>
    <p>L'enregistrement de chaque observateur est chargé dès que la liste est connue : en choisir
      un autre est immédiat. La liste nomme chacun par son <code>title</code>, sinon ses prénoms et
      son nom, sinon son <code>id</code> ; celui qui ne nomme personne est numéroté selon sa place
      dans la liste.</p>
    <p>Le panneau <q>?</q> s'ouvre en <i lang="en">popover</i>, que ferment Échap ou un clic à
      l'extérieur (seulement un clic à l'extérieur, sur un navigateur sans <i lang="en">popover</i>).
      Il énonce le dossier, la date, le lieu, le compte rendu et les tags ; date, lieu et tags le
      quittent tant que le bandeau <code>show-labels</code> les énonce déjà. La date est à l'heure de
      l'observateur (<code>utcOffsetHours</code>, ou une heure approchée depuis la longitude), pas à
      celle du lecteur. La version en pied de panneau ouvre cette observation dans l'éditeur, et ses
      lignes d'intégration chargent l'élément depuis l'endroit d'où cette copie a elle-même été
      chargée : un extrait copié depuis une copie locale ou de recette renvoie à cette copie.</p>
  </div>
</section>
`
    },
    events: {
      en: `<div class="table-scroll">
    <table>
      <tr><th>Event</th><th>Fires</th><th>Where to listen</th></tr>
      <tr><td><code>observerchange</code></td><td>When the recording on show changes: loaded, set through <code>sightingData</code>, or another observer picked from the list. <code>detail.src</code> is its address, empty for a recording set by script</td><td>On this element. It does not bubble: listen on the <code>&lt;rr0-sighting&gt;</code> itself, then read <code>sightingData</code> back off it (its description, its id)</td></tr>
    </table>
    </div>`,
      fr: `<div class="table-scroll">
    <table>
      <tr><th>Événement</th><th>Quand</th><th>Où l'écouter</th></tr>
      <tr><td><code>observerchange</code></td><td>Quand l'enregistrement affiché change : chargé, posé par <code>sightingData</code>, ou un autre observateur choisi dans la liste. <code>detail.src</code> est son adresse, vide pour un enregistrement posé par script</td><td>Sur cet élément. Il n'est pas <i lang="en">bubbling</i> : écoutez sur le <code>&lt;rr0-sighting&gt;</code> lui-même, puis relisez son <code>sightingData</code> (sa description, son identifiant)</td></tr>
    </table>
    </div>`
    }
  },
  {
    slug: "docs/components/editor",
    subpath: "editor",
    size: { en: "293 KB", fr: "293 Ko" },
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
    </div>`
    },
    tag: "rr0-sighting-editor",
    lede: {
      en: "The editor",
      fr: "L'éditeur"
    },
    description: {
      en: "The whole authoring toolbar: what it takes, what it gives back, and when it says so.",
      fr: "Toute la barre d'outils d'écriture : ce qu'elle prend, ce qu'elle rend, et quand elle le dit."
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
`
    }
  }
]
