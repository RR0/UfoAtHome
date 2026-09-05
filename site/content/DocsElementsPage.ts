import { DocsSection } from "./DocsSection.js"
import type { PageMeta, Said, SiteLanguage } from "../SitePage.js"

/** The four custom elements, one section each: markup, then what each can be told and asked. */
export class DocsElementsPage extends DocsSection {

  readonly meta: PageMeta = {
    slug: "docs/elements",
    navLabel: { en: "The elements", fr: "Les éléments" },
    title: { en: "The four elements", fr: "Les quatre éléments" },
    description: {
      en: "One section per tag: what it draws, the markup it takes, and every attribute, property, "
        + "method and event it answers to.",
      fr: "Une section par balise : ce qu'elle dessine, le balisage qu'elle accepte, et chaque "
        + "attribut, propriété, méthode et événement auquel elle répond."
    },
    asideFromNav: true
  }

  private readonly lede: Said<string> = {
    en: "Four vanilla custom elements. Each registers itself on import, each takes the same "
      + "<code>src</code>, and each composes the one before it.",
    fr: "Quatre éléments personnalisés natifs. Chacun s'enregistre à l'import, chacun prend le même "
      + "<code>src</code>, et chacun compose le précédent."
  }

  render(language: SiteLanguage): string {
    return this.hero(language, this.meta.title, this.lede) + (language === "fr" ? this.fr() : this.en())
  }

  private en(): string {
    return `
<section class="band">
  <div class="wrap prose-wide">
    <p>They compose in one line: <code>&lt;rr0-scene&gt;</code> holds an
      <code>&lt;rr0-ufo&gt;</code>, and both <code>&lt;rr0-eyewitness&gt;</code> and
      <code>&lt;rr0-ufo-recorder&gt;</code> hold an <code>&lt;rr0-scene&gt;</code>. So everything
      under <code>&lt;rr0-ufo&gt;</code> below is available in all four — through
      <code>.scene.ufoElement</code> from the outermost, since the composition lives in a shadow
      root.</p>
    <p>Which one to load, and what it costs, is on <a href="/docs/embed/">the embedding page</a>.</p>

    <h2><code>&lt;rr0-ufo&gt;</code> — the shape, and playback</h2>
    <p>The lightweight one: a canvas plus play/pause/loop/seek. Use it where a page only needs to
      replay an already-drawn shape and wants no sky behind it.</p>
    <pre><code>&lt;rr0-ufo src="sighting.json"&gt;&lt;/rr0-ufo&gt;</code></pre>
    <div class="table-scroll">
    <table>
      <tr><th>Member</th><th>Kind</th><th>What it does</th></tr>
      <tr><td><code>src</code></td><td>attribute</td><td>URL of a recording, fetched on connect and whenever it changes</td></tr>
      <tr><td><code>sightingData</code></td><td>property</td><td>The recording as a plain object — read it back after editing, or set it instead of using <code>src</code></td></tr>
      <tr><td><code>sighting</code></td><td>property (read)</td><td>The live model: real-world time and place plus the recording's timeline</td></tr>
      <tr><td><code>loadFromSrc(url)</code></td><td>method (async)</td><td>What the attribute triggers internally. Await it when you need the recording to be IN before doing anything else — playing before it resolves finds a zero-length timeline</td></tr>
      <tr><td><code>play()</code> / <code>pause()</code></td><td>method</td><td>Say which state you want, rather than flipping the current one</td></tr>
      <tr><td><code>togglePlayPause()</code></td><td>method</td><td>What the button, the click and the space bar do</td></tr>
      <tr><td><code>playbackState</code></td><td>property (read)</td><td><code>"stopped"</code>, <code>"playing"</code> or <code>"paused"</code></td></tr>
      <tr><td><code>currentTime</code></td><td>property</td><td>The playhead, in the timeline's own units — <em>not</em> real milliseconds, see <code>positionLabel</code></td></tr>
      <tr><td><code>seekableDuration</code></td><td>property (read)</td><td>The range <code>currentTime</code> can take</td></tr>
      <tr><td><code>autoReplayEnabled</code></td><td>property</td><td>Looping, on by default. Turn it <strong>off</strong> if you want the <code>ended</code> event</td></tr>
      <tr><td><code>positionLabel</code> / <code>durationLabel</code></td><td>property (read)</td><td>The position and length already formatted by the element — real clock time when the observation states one</td></tr>
      <tr><td><code>refresh()</code></td><td>method</td><td>Re-reads the duration and repaints — call it after mutating <code>sighting.timeline</code> from outside</td></tr>
      <tr><td><code>canvasElement</code> / <code>renderer</code></td><td>property (read)</td><td>The <code>&lt;canvas&gt;</code>, and the renderer painting on it</td></tr>
      <tr><td><code>enableClickToPlay</code></td><td>property</td><td>Whether a click toggles playback and a double-click toggles fullscreen (both, or neither). Set false where the canvas is yours for something else</td></tr>
      <tr><td><code>fullscreenTarget</code></td><td>property</td><td>Which element the fullscreen button expands. <code>&lt;rr0-scene&gt;</code> sets it to its own stage, so the sky goes fullscreen and not just the overlay</td></tr>
    </table>
    </div>

    <h2><code>&lt;rr0-scene&gt;</code> — the sky and the ground</h2>
    <p>Everything <code>&lt;rr0-ufo&gt;</code> has, composited over the real sky and horizon of the
      recording's own date, hour and place. A drop-in upgrade: same markup, same members.</p>
    <pre><code>&lt;rr0-scene src="sighting.json"&gt;&lt;/rr0-scene&gt;</code></pre>
    <div class="table-scroll">
    <table>
      <tr><th>Member</th><th>Kind</th><th>What it does</th></tr>
      <tr><td><code>ufoElement</code></td><td>property (read)</td><td>The <code>&lt;rr0-ufo&gt;</code> it composes — and through it every playback member above</td></tr>
      <tr><td><code>sceneRenderer</code></td><td>property (read)</td><td>The 3D renderer, for what nothing else exposes</td></tr>
    </table>
    </div>
    <p>Hovering it names what is under the pointer — a star with its magnitude and height, a planet,
      a comet, a building, another witness — and says nothing where the ground hides what you are
      pointing at.</p>

    <h2><code>&lt;rr0-eyewitness&gt;</code> — the standard sighting view</h2>
    <p>The default for a real sighting, one witness or several. It composes an
      <code>&lt;rr0-scene&gt;</code> and adds the toolbar: who is testifying, and the <q>?</q> panel
      with the observation's own metadata, its credits and its embed lines.</p>
    <pre><code>&lt;rr0-eyewitness src="sighting.json"&gt;&lt;/rr0-eyewitness&gt;
&lt;rr0-eyewitness src="witnesses.json"&gt;&lt;/rr0-eyewitness&gt;  &lt;!-- a manifest --&gt;</code></pre>
    <div class="table-scroll">
    <table>
      <tr><th>Member</th><th>Kind</th><th>What it does</th></tr>
      <tr><td><code>src</code></td><td>attribute</td><td>A single recording, or a manifest — an array is one, an object is the other</td></tr>
      <tr><td><code>witnessUrls</code></td><td>property</td><td>The manifest as a plain array of URLs, instead of <code>src</code></td></tr>
      <tr><td><code>sightingData</code></td><td>property</td><td>One recording, set directly — for a page holding one in memory rather than at a URL</td></tr>
      <tr><td><code>scene</code></td><td>property (read)</td><td>The composed <code>&lt;rr0-scene&gt;</code>, and through <code>scene.ufoElement</code> the playback members</td></tr>
      <tr><td><code>loadFromSrc(url)</code></td><td>method (async)</td><td>What the attribute triggers</td></tr>
    </table>
    </div>
    <p>A recording that names no witness gets no “testimony by” line at all, which is the accurate
      thing to say of a sky set up to show a halo.</p>

    <h2><code>&lt;rr0-ufo-recorder&gt;</code> — the editor</h2>
    <p>Everything above plus the authoring toolbar. Put it on a page where people should be able to
      describe or correct an observation themselves.</p>
    <pre><code>&lt;rr0-ufo-recorder&gt;&lt;/rr0-ufo-recorder&gt;
&lt;rr0-ufo-recorder src="sighting.json"&gt;&lt;/rr0-ufo-recorder&gt;</code></pre>
    <p>Its canvas is an editing surface, so <code>enableClickToPlay</code> is off there: a click
      selects and drags a shape rather than toggling playback. What the eight groups of its toolbar
      do is <a href="/editor/">the editor's own page</a>.</p>
    <div class="table-scroll">
    <table>
      <tr><th>Member</th><th>Kind</th><th>What it does</th></tr>
      <tr><td><code>ufoElement</code></td><td>property (read)</td><td>Reaches through to the canvas, the timeline and the appearance work</td></tr>
      <tr><td><code>sightingchange</code></td><td>event</td><td>Fires after every edit — the single signal that the recording has changed</td></tr>
    </table>
    </div>

    <h2>Events</h2>
    <div class="table-scroll">
    <table>
      <tr><th>Event</th><th>Fires</th><th>Escapes the shadow root?</th></tr>
      <tr><td><code>ended</code></td><td>Once, when playback runs off the end without looping. Not on a pause, and not on a scrub to the end</td><td><strong>Yes</strong> — bubbling and composed, so a page can listen on the outermost element. This is how you play several recordings in turn</td></tr>
      <tr><td><code>timeupdate</code></td><td>Every playback tick and every seek, with <code>detail.time</code></td><td>No — it is meant for the composing elements</td></tr>
      <tr><td><code>timedisplaychange</code></td><td>When the counters switch between clock time and elapsed time</td><td>Yes</td></tr>
      <tr><td><code>sightingchange</code></td><td>After an edit in the recorder</td><td>Yes</td></tr>
    </table>
    </div>

    <h2>Language</h2>
    <p>Every label is translated by detection, with no picker: the page's own declared language
      first — the nearest <code>lang</code> attribute, so <code>&lt;html lang="fr"&gt;</code> gets
      French labels — then the browser's own preferences, then English. A page that declares nothing
      falls through to the browser exactly as before.</p>
  </div>
</section>
`
  }

  private fr(): string {
    return `
<section class="band">
  <div class="wrap prose-wide">
    <p>Ils se composent en ligne : <code>&lt;rr0-scene&gt;</code> contient un
      <code>&lt;rr0-ufo&gt;</code>, et <code>&lt;rr0-eyewitness&gt;</code> comme
      <code>&lt;rr0-ufo-recorder&gt;</code> contiennent un <code>&lt;rr0-scene&gt;</code>. Tout ce
      qui figure sous <code>&lt;rr0-ufo&gt;</code> ci-dessous est donc disponible dans les quatre —
      via <code>.scene.ufoElement</code> depuis le plus extérieur, la composition vivant dans un
      <i lang="en">shadow root</i>.</p>
    <p>Lequel charger, et ce qu'il coûte, est sur <a href="/docs/embed/">la page d'intégration</a>.</p>

    <h2><code>&lt;rr0-ufo&gt;</code> — la forme, et la lecture</h2>
    <p>Le plus léger : un canevas plus lecture/pause/boucle/déplacement. À utiliser là où une page ne
      fait que rejouer une forme déjà dessinée et ne veut pas de ciel derrière.</p>
    <pre><code>&lt;rr0-ufo src="sighting.json"&gt;&lt;/rr0-ufo&gt;</code></pre>
    <div class="table-scroll">
    <table>
      <tr><th>Membre</th><th>Nature</th><th>Rôle</th></tr>
      <tr><td><code>src</code></td><td>attribut</td><td>URL d'un enregistrement, chargée à la connexion et à chaque changement</td></tr>
      <tr><td><code>sightingData</code></td><td>propriété</td><td>L'enregistrement comme objet simple — à relire après modification, ou à poser au lieu d'utiliser <code>src</code></td></tr>
      <tr><td><code>sighting</code></td><td>propriété (lecture)</td><td>Le modèle vivant : date et lieu réels, plus la chronologie de l'enregistrement</td></tr>
      <tr><td><code>loadFromSrc(url)</code></td><td>méthode (async)</td><td>Ce que déclenche l'attribut. À attendre quand l'enregistrement doit être arrivé avant toute autre chose — jouer avant sa résolution trouve une chronologie de longueur nulle</td></tr>
      <tr><td><code>play()</code> / <code>pause()</code></td><td>méthode</td><td>Dire quel état on veut, plutôt que basculer l'état courant</td></tr>
      <tr><td><code>togglePlayPause()</code></td><td>méthode</td><td>Ce que font le bouton et le clic</td></tr>
      <tr><td><code>playbackState</code></td><td>propriété (lecture)</td><td><code>"stopped"</code>, <code>"playing"</code> ou <code>"paused"</code></td></tr>
      <tr><td><code>currentTime</code></td><td>propriété</td><td>La tête de lecture, dans les unités de la chronologie — <em>pas</em> des millisecondes réelles, voir <code>positionLabel</code></td></tr>
      <tr><td><code>seekableDuration</code></td><td>propriété (lecture)</td><td>L'étendue que <code>currentTime</code> peut prendre</td></tr>
      <tr><td><code>autoReplayEnabled</code></td><td>propriété</td><td>La lecture en boucle, active par défaut. À mettre à <strong>false</strong> si vous voulez l'événement <code>ended</code></td></tr>
      <tr><td><code>positionLabel</code> / <code>durationLabel</code></td><td>propriété (lecture)</td><td>Position et durée déjà mises en forme — heure réelle quand l'observation en énonce une</td></tr>
      <tr><td><code>refresh()</code></td><td>méthode</td><td>Relit la durée et repeint — à appeler après avoir modifié <code>sighting.timeline</code> de l'extérieur</td></tr>
      <tr><td><code>canvasElement</code> / <code>renderer</code></td><td>propriété (lecture)</td><td>Le <code>&lt;canvas&gt;</code>, et ce qui peint dessus</td></tr>
      <tr><td><code>enableClickToPlay</code></td><td>propriété</td><td>Si un clic bascule la lecture et un double-clic le plein écran (les deux, ou aucun). À mettre à false là où le canevas vous sert à autre chose</td></tr>
      <tr><td><code>fullscreenTarget</code></td><td>propriété</td><td>Quel élément le bouton plein écran agrandit. <code>&lt;rr0-scene&gt;</code> y met sa propre scène, pour que ce soit le ciel qui s'agrandisse et non la seule surcouche</td></tr>
    </table>
    </div>

    <h2><code>&lt;rr0-scene&gt;</code> — le ciel et le sol</h2>
    <p>Tout ce qu'a <code>&lt;rr0-ufo&gt;</code>, composé sur le ciel et l'horizon réels de la date,
      de l'heure et du lieu de l'enregistrement. Un remplacement direct : même balisage, mêmes
      membres.</p>
    <pre><code>&lt;rr0-scene src="sighting.json"&gt;&lt;/rr0-scene&gt;</code></pre>
    <div class="table-scroll">
    <table>
      <tr><th>Membre</th><th>Nature</th><th>Rôle</th></tr>
      <tr><td><code>ufoElement</code></td><td>propriété (lecture)</td><td>Le <code>&lt;rr0-ufo&gt;</code> qu'il compose — et par lui tous les membres de lecture ci-dessus</td></tr>
      <tr><td><code>sceneRenderer</code></td><td>propriété (lecture)</td><td>Le moteur de rendu 3D, pour ce que rien d'autre n'expose</td></tr>
    </table>
    </div>
    <p>Le survol nomme ce qui est sous le curseur — une étoile avec sa magnitude et sa hauteur, une
      planète, une comète, un bâtiment, un autre témoin — et ne dit rien là où le sol cache ce que
      vous pointez.</p>

    <h2><code>&lt;rr0-eyewitness&gt;</code> — la vue standard d'une observation</h2>
    <p>Le choix par défaut pour une observation réelle, à un témoin ou plusieurs. Il compose un
      <code>&lt;rr0-scene&gt;</code> et ajoute la barre d'outils : qui témoigne, et le panneau
      <q>?</q> avec les métadonnées de l'observation, ses crédits et ses lignes d'intégration.</p>
    <pre><code>&lt;rr0-eyewitness src="sighting.json"&gt;&lt;/rr0-eyewitness&gt;
&lt;rr0-eyewitness src="temoins.json"&gt;&lt;/rr0-eyewitness&gt;  &lt;!-- un manifeste --&gt;</code></pre>
    <div class="table-scroll">
    <table>
      <tr><th>Membre</th><th>Nature</th><th>Rôle</th></tr>
      <tr><td><code>src</code></td><td>attribut</td><td>Un enregistrement, ou un manifeste — un tableau est l'un, un objet est l'autre</td></tr>
      <tr><td><code>witnessUrls</code></td><td>propriété</td><td>Le manifeste comme simple tableau d'URLs, au lieu de <code>src</code></td></tr>
      <tr><td><code>sightingData</code></td><td>propriété</td><td>Un enregistrement posé directement — pour une page qui en tient un en mémoire plutôt qu'à une URL</td></tr>
      <tr><td><code>scene</code></td><td>propriété (lecture)</td><td>Le <code>&lt;rr0-scene&gt;</code> composé, et par <code>scene.ufoElement</code> les membres de lecture</td></tr>
      <tr><td><code>loadFromSrc(url)</code></td><td>méthode (async)</td><td>Ce que déclenche l'attribut</td></tr>
    </table>
    </div>
    <p>Un enregistrement qui ne nomme aucun témoin n'affiche aucune ligne « témoignage de » — ce qui
      est exact pour un ciel réglé pour montrer un halo.</p>

    <h2><code>&lt;rr0-ufo-recorder&gt;</code> — l'éditeur</h2>
    <p>Tout ce qui précède, plus la barre d'outils de saisie. À poser sur une page où l'on doit
      pouvoir décrire ou corriger une observation soi-même.</p>
    <pre><code>&lt;rr0-ufo-recorder&gt;&lt;/rr0-ufo-recorder&gt;
&lt;rr0-ufo-recorder src="sighting.json"&gt;&lt;/rr0-ufo-recorder&gt;</code></pre>
    <p>Son canevas est une surface d'édition : <code>enableClickToPlay</code> y est désactivé, un
      clic sélectionne et déplace une forme au lieu de basculer la lecture. Ce que font les huit
      groupes de sa barre d'outils est sur <a href="/editor/">la page de l'éditeur</a>.</p>
    <div class="table-scroll">
    <table>
      <tr><th>Membre</th><th>Nature</th><th>Rôle</th></tr>
      <tr><td><code>ufoElement</code></td><td>propriété (lecture)</td><td>Donne accès au canevas, à la chronologie et au travail d'apparence</td></tr>
      <tr><td><code>sightingchange</code></td><td>événement</td><td>Émis après chaque modification — le signal unique que l'enregistrement a changé</td></tr>
    </table>
    </div>

    <h2>Événements</h2>
    <div class="table-scroll">
    <table>
      <tr><th>Événement</th><th>Quand</th><th>Sort-il du <i lang="en">shadow root</i> ?</th></tr>
      <tr><td><code>ended</code></td><td>Une fois, quand la lecture atteint la fin sans boucler. Ni à la pause, ni à un déplacement manuel jusqu'à la fin</td><td><strong>Oui</strong> — <i lang="en">bubbling</i> et <i lang="en">composed</i>, une page peut donc l'écouter sur l'élément le plus extérieur. C'est ainsi qu'on enchaîne plusieurs enregistrements</td></tr>
      <tr><td><code>timeupdate</code></td><td>À chaque image de lecture et à chaque déplacement, avec <code>detail.time</code></td><td>Non — il est destiné aux éléments composants</td></tr>
      <tr><td><code>timedisplaychange</code></td><td>Quand les compteurs basculent entre heure et temps écoulé</td><td>Oui</td></tr>
      <tr><td><code>sightingchange</code></td><td>Après une modification dans l'éditeur</td><td>Oui</td></tr>
    </table>
    </div>

    <h2>Langue</h2>
    <p>Chaque libellé est traduit par détection, sans sélecteur : la langue déclarée par la page
      d'abord — l'attribut <code>lang</code> le plus proche, donc <code>&lt;html lang="fr"&gt;</code>
      donne des libellés français — puis les préférences du navigateur, puis l'anglais. Une page qui
      ne déclare rien retombe sur le navigateur, exactement comme avant.</p>
  </div>
</section>
`
  }
}
