import { DocsSection } from "./DocsSection.js"
import type { PageMeta, Said, SiteLanguage } from "../SitePage.js"

/** The four components, one section each: markup, then what each can be told and asked. */
export class DocsComponentsPage extends DocsSection {

  readonly meta: PageMeta = {
    slug: "docs/components",
    navLabel: { en: "The components", fr: "Les composants" },
    title: { en: "The components", fr: "Les composants" },
    description: {
      en: "Four standard elements, one page each: which one you want, what it draws, the markup it "
        + "takes, and everything it answers to.",
      fr: "Quatre éléments standards, une page chacun : lequel vous voulez, ce qu'il dessine, le "
        + "balisage qu'il accepte, et tout ce à quoi il répond."
    },
    asideFromNav: true
  }

  private readonly lede: Said<string> = {
    en: "Four standard Web Components — the browser's own, not a framework's. Each registers itself "
      + "on import, each takes the same description of an observation as its input, and each "
      + "composes the one before it.",
    fr: "Quatre composants web standards — ceux du navigateur, pas ceux d'un framework. Chacun "
      + "s'enregistre à l'import, chacun prend en entrée la même description d'observation, et "
      + "chacun compose le précédent."
  }

  /** Where each tag's own page is, by the tag itself. */
  private static readonly PAGES: ReadonlyArray<readonly [string, string]> = [
    ["rr0-ufo", "/docs/components/ufo/"],
    ["rr0-scene", "/docs/components/scene/"],
    ["rr0-sighting-editor", "/docs/components/editor/"],
    ["rr0-sighting", "/docs/components/sighting/"]
  ]

  render(language: SiteLanguage): string {
    return this.hero(language, this.meta.title, this.lede)
      + this.linked(language === "fr" ? this.fr() : this.en())
  }

  /**
   * Every mention of a tag on this page is a way to its own page.
   *
   * Written once here rather than by hand at the forty places they occur: this page's whole job is
   * to send a reader to one of the four, and a mention that reads like the answer but cannot be
   * clicked is the most annoying kind of prose.
   *
   * Two exclusions, and both matter. Inside an `<a>`, because an anchor inside an anchor is not
   * valid HTML and a parser resolves it by closing the outer one — which is exactly how the
   * documentation hub's cards came apart once already. Inside a `<pre>`, because that block is
   * there to be copied, and a link is not something anybody wants in their clipboard.
   */
  private linked(html: string): string {
    const spans: Array<[number, number]> = []
    let depth = 0
    let start = 0
    for (const match of html.matchAll(/<\/?(?:a|pre)\b[^>]*>/gi)) {
      if (match[0].startsWith("</")) {
        depth = Math.max(0, depth - 1)
        if (depth === 0) {
          spans.push([start, match.index + match[0].length])
        }
      } else {
        if (depth === 0) {
          start = match.index
        }
        depth++
      }
    }
    // Longest tag first: rr0-sighting is a prefix of rr0-sighting-editor, and the entity-escaped
    // closing bracket is the only thing telling the two mentions apart.
    return html.replace(/<code>&lt;(rr0-[a-z-]+)&gt;<\/code>/g, (whole, tag: string, offset: number) => {
      const page = DocsComponentsPage.PAGES.find(([name]) => name === tag)?.[1]
      const inside = spans.some(([from, to]) => offset > from && offset < to)
      return page === undefined || inside ? whole : `<a href="${page}">${whole}</a>`
    })
  }

  private en(): string {
    return `
<section class="band">
  <div class="wrap prose-wide">
    <h2>Standard, and that is the whole design</h2>
    <p>These are four <a href="https://developer.mozilla.org/en-US/docs/Web/API/Web_components">Web Components</a> — the browser's own standard for a
      custom element, not a component of anybody's framework. What follows from that is worth
      spelling out, because it is why the tool can be handed to you at all:</p>
    <ul class="plain">
      <li><strong>They work in any page.</strong> A static site, WordPress, a React or Vue app, a
        wiki, a hand-written HTML file. They are elements; a page that can hold a
        <code>&lt;video&gt;</code> can hold these.</li>
      <li><strong>Nothing to build.</strong> No bundler, no compilation step, no configuration in
        your project. The module registers its element on import and the browser does the rest.</li>
      <li><strong>Nothing to keep up with.</strong> There is no framework version to match, so they
        cannot be made obsolete by somebody else's major release.</li>
      <li><strong>Their insides are their own.</strong> Each carries its markup and its styles in a
        shadow root, so your page's CSS cannot break them and they cannot break your page.</li>
    </ul>
    <p>They compose in one line: <code>&lt;rr0-scene&gt;</code> holds an
      <code>&lt;rr0-ufo&gt;</code>, and both <code>&lt;rr0-sighting&gt;</code> and
      <code>&lt;rr0-sighting-editor&gt;</code> hold an <code>&lt;rr0-scene&gt;</code>. So everything
      under <code>&lt;rr0-ufo&gt;</code> below is available in all four — through
      <code>.scene.ufoElement</code> from the outermost, since the composition lives in a shadow
      root.</p>

    <h2>What each one is for</h2>
    <ul class="plain">
      <li><strong><code>&lt;rr0-ufo&gt;</code> — the phenomenon, and nothing else.</strong> The shape a
        witness drew, its colour and halo and movement, replayed on a bare background. It is the
        testimony without the world around it.</li>
      <li><strong><code>&lt;rr0-scene&gt;</code> — the world around it.</strong> The real sky,
        horizon, weather and ground of a stated date, hour and place, with the phenomenon composited
        over them. Useful on its own, for a sky with nothing in it at all.</li>
      <li><strong><code>&lt;rr0-sighting&gt;</code> — the testimony, to watch.</strong>
        A scene plus who is testifying, the observation's own metadata, its credits, and the lines
        that let a reader take it elsewhere. This is what a published sighting looks like.</li>
      <li><strong><code>&lt;rr0-sighting-editor&gt;</code> — the testimony, to reconstruct.</strong>
        Everything above plus the authoring toolbar: describe an observation, or correct one.</li>
    </ul>

    <h2>How they fit together</h2>
    <p>You never write the nesting. Each element builds the one below it inside its own shadow
      root, so what your page contains is a single tag:</p>
    <pre><code>&lt;rr0-sighting&gt;           who is testifying, the metadata panel, the embed lines
└─ &lt;rr0-scene&gt;           the real sky, horizon, weather and decor
   └─ &lt;rr0-ufo&gt;          the canvas, the shape, playback

&lt;rr0-sighting-editor&gt;    the eight authoring panels
└─ &lt;rr0-scene&gt;           a scene, not a sighting: an editor has its own toolbar
   └─ &lt;rr0-ufo&gt;</code></pre>
    <p>Which is why one script tag brings the ones underneath with it:</p>
    <div class="table-scroll">
    <table>
      <tr><th>Loading this</th><th>registers</th></tr>
      <tr><td><code>/lib/rr0-ufo.mjs</code></td><td><code>&lt;rr0-ufo&gt;</code></td></tr>
      <tr><td><code>/lib/rr0-scene.mjs</code></td><td><code>&lt;rr0-scene&gt;</code>, <code>&lt;rr0-ufo&gt;</code></td></tr>
      <tr><td><code>/lib/rr0-sighting.mjs</code></td><td><code>&lt;rr0-sighting&gt;</code>, <code>&lt;rr0-scene&gt;</code>, <code>&lt;rr0-ufo&gt;</code></td></tr>
      <tr><td><code>/lib/rr0-sighting-editor.mjs</code></td><td><code>&lt;rr0-sighting-editor&gt;</code>, <code>&lt;rr0-scene&gt;</code>, <code>&lt;rr0-ufo&gt;</code></td></tr>
    </table>
    </div>
    <p>So a page showing a sighting and, further down, a bare sky of its own needs one script and
      two tags — the second element is already registered.</p>
    <p>A composition can be reached into, one property at a time:</p>
    <pre><code>const sighting = document.querySelector("rr0-sighting")
sighting.scene                    // the &lt;rr0-scene&gt; it composes
sighting.scene.ufoElement         // and the &lt;rr0-ufo&gt; under that
sighting.scene.ufoElement.play()  // so playback is two properties away</code></pre>
    <p><code>&lt;rr0-sighting-editor&gt;</code> keeps its own composition to itself: what it offers
      a page is the recording — <code>sightingData</code> — and the event saying it changed.</p>

    <h2>Which one you want</h2>
    <p>They are not variants of one bundle: each is self-contained, so load only the one you need.
      The three heavier ones carry Three.js and a star catalogue, which is what a real sky costs.</p>
    <div class="table-scroll">
    <table>
      <tr><th>What you are doing</th><th>Component</th><th>Module</th><th>gzip</th></tr>
      <tr><td><strong>Showing a UFO sighting</strong> — a case file, an article, a report</td><td><code>&lt;rr0-sighting&gt;</code></td><td><code>/lib/rr0-sighting.mjs</code></td><td>249 KB</td></tr>
      <tr><td><strong>Letting somebody describe or correct one</strong></td><td><code>&lt;rr0-sighting-editor&gt;</code></td><td><code>/lib/rr0-sighting-editor.mjs</code></td><td>293 KB</td></tr>
      <tr><td><strong>Showing a sky with nothing in it</strong> — what a halo, a comet or a satellite pass looked like that night</td><td><code>&lt;rr0-scene&gt;</code></td><td><code>/lib/rr0-scene.mjs</code></td><td>238 KB</td></tr>
      <tr><td><strong>Showing a sighting inside a scene of your own</strong>, with no toolbar over it</td><td><code>&lt;rr0-scene&gt;</code></td><td><code>/lib/rr0-scene.mjs</code></td><td>238 KB</td></tr>
      <tr><td><strong>Illustrating a shape</strong> in the flow of an article, with no sky and no weight</td><td><code>&lt;rr0-ufo&gt;</code></td><td><code>/lib/rr0-ufo.mjs</code></td><td>16 KB</td></tr>
      <tr><td><strong>Not sure</strong></td><td><code>&lt;rr0-sighting&gt;</code></td><td><code>/lib/rr0-sighting.mjs</code></td><td>249 KB</td></tr>
    </table>
    </div>
    <p>Putting one on a page is <a href="/docs/share/">two lines</a>.</p>

    <h2>Detailed documentation</h2>
    <p>What each takes, what it answers to, and what it draws — one page per component, because
      what you need from one of them is never what you need from the other three at the same
      moment.</p>
    <div class="uses">
      <a class="use" href="/docs/components/ufo/"><h3><code>&lt;rr0-ufo&gt;</code></h3><p>The shape and its playback, with no sky behind it — the light one.</p><p class="use-more">Read →</p></a>
      <a class="use" href="/docs/components/scene/"><h3><code>&lt;rr0-scene&gt;</code></h3><p>The same, over the real sky and horizon of the recording's own date and place.</p><p class="use-more">Read →</p></a>
      <a class="use" href="/docs/components/sighting/"><h3><code>&lt;rr0-sighting&gt;</code></h3><p>The standard view of a real account: one witness or several, with their toolbar.</p><p class="use-more">Read →</p></a>
      <a class="use" href="/docs/components/editor/"><h3><code>&lt;rr0-sighting-editor&gt;</code></h3><p>The whole authoring toolbar, for describing an observation or correcting one.</p><p class="use-more">Read →</p></a>
    </div>

    <h2>Putting one in your application</h2>
    <p>After <code>npm install @rr0/ufoathome</code>:</p>
    <pre><code>import "@rr0/ufoathome/ufo"      // registers &lt;rr0-ufo&gt;
import "@rr0/ufoathome/scene"    // registers &lt;rr0-scene&gt;
import "@rr0/ufoathome/sighting" // registers &lt;rr0-sighting&gt;
import "@rr0/ufoathome/editor"   // registers &lt;rr0-sighting-editor&gt;</code></pre>
    <p>Or copy the contents of the package's <code>dist-embed*</code> directories onto your own
      server and point the <code>&lt;script src&gt;</code> there. Each module references its own
      assets — the star catalogue, the weather audio — <em>relative to itself</em>, so it keeps
      working from any path; just keep each bundle's files together. Nothing then depends on this
      site at all.</p>

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
    <h2>Standards, et c'est toute la conception</h2>
    <p>Ce sont quatre <a href="https://developer.mozilla.org/fr/docs/Web/API/Web_components">composants web</a> — le standard du navigateur pour un
      élément personnalisé, et non le composant du <i lang="en">framework</i> de quelqu'un. Ce qui
      en découle mérite d'être dit, car c'est ce qui permet de vous le remettre :</p>
    <ul class="plain">
      <li><strong>Ils fonctionnent dans n'importe quelle page.</strong> Un site statique, WordPress,
        une application React ou Vue, un wiki, un fichier HTML écrit à la main. Ce sont des
        éléments : une page qui peut contenir une <code>&lt;video&gt;</code> peut les contenir.</li>
      <li><strong>Rien à construire.</strong> Ni <i lang="en">bundler</i>, ni étape de compilation,
        ni configuration dans votre projet. Le module enregistre son élément à l'import et le
        navigateur fait le reste.</li>
      <li><strong>Rien à suivre.</strong> Il n'y a pas de version de <i lang="en">framework</i> à
        faire correspondre : la version majeure de quelqu'un d'autre ne peut pas les périmer.</li>
      <li><strong>Leur intérieur est à eux.</strong> Chacun porte son balisage et ses styles dans un
        <i lang="en">shadow root</i> : le CSS de votre page ne peut pas les casser, et eux ne
        peuvent pas casser votre page.</li>
    </ul>
    <p>Ils se composent en ligne : <code>&lt;rr0-scene&gt;</code> contient un
      <code>&lt;rr0-ufo&gt;</code>, et <code>&lt;rr0-sighting&gt;</code> comme
      <code>&lt;rr0-sighting-editor&gt;</code> contiennent un <code>&lt;rr0-scene&gt;</code>. Tout ce
      qui figure sous <code>&lt;rr0-ufo&gt;</code> ci-dessous est donc disponible dans les quatre —
      via <code>.scene.ufoElement</code> depuis le plus extérieur, la composition vivant dans un
      <i lang="en">shadow root</i>.</p>

    <h2>À quoi sert chacun</h2>
    <ul class="plain">
      <li><strong><code>&lt;rr0-ufo&gt;</code> — le phénomène, et rien d'autre.</strong> La forme
        dessinée par un témoin, sa couleur, son halo, son mouvement, rejoués sur un fond nu. C'est
        le témoignage sans le monde autour.</li>
      <li><strong><code>&lt;rr0-scene&gt;</code> — le monde autour.</strong> Le ciel, l'horizon, la
        météo et le sol réels d'une date, d'une heure et d'un lieu énoncés, avec le phénomène composé
        par-dessus. Utile seul, pour un ciel où il n'y a rien du tout.</li>
      <li><strong><code>&lt;rr0-sighting&gt;</code> — le témoignage, à regarder.</strong> Une scène, plus
        qui témoigne, les métadonnées de l'observation, ses crédits, et les lignes qui permettent à
        un lecteur de l'emporter ailleurs. C'est à cela que ressemble une observation publiée.</li>
      <li><strong><code>&lt;rr0-sighting-editor&gt;</code> — le témoignage, à reconstruire.</strong> Tout ce qui
        précède, plus la barre d'outils de saisie : décrire une observation, ou en corriger une.</li>
    </ul>

    <h2>Comment ils s'emboîtent</h2>
    <p>Vous n'écrivez jamais l'imbrication. Chaque élément construit celui du dessous dans son
      propre <i lang="en">shadow root</i> : ce que votre page contient, c'est une seule balise.</p>
    <pre><code>&lt;rr0-sighting&gt;           qui témoigne, le panneau de métadonnées, les lignes d'intégration
└─ &lt;rr0-scene&gt;           le ciel, l'horizon, la météo et le décor réels
   └─ &lt;rr0-ufo&gt;          la zone de dessin, la forme, la lecture

&lt;rr0-sighting-editor&gt;    les huit panneaux de saisie
└─ &lt;rr0-scene&gt;           une scène, pas une observation : un éditeur a sa propre barre d'outils
   └─ &lt;rr0-ufo&gt;</code></pre>
    <p>C'est pourquoi une seule balise de script embarque ceux du dessous :</p>
    <div class="table-scroll">
    <table>
      <tr><th>Charger ceci</th><th>enregistre</th></tr>
      <tr><td><code>/lib/rr0-ufo.mjs</code></td><td><code>&lt;rr0-ufo&gt;</code></td></tr>
      <tr><td><code>/lib/rr0-scene.mjs</code></td><td><code>&lt;rr0-scene&gt;</code>, <code>&lt;rr0-ufo&gt;</code></td></tr>
      <tr><td><code>/lib/rr0-sighting.mjs</code></td><td><code>&lt;rr0-sighting&gt;</code>, <code>&lt;rr0-scene&gt;</code>, <code>&lt;rr0-ufo&gt;</code></td></tr>
      <tr><td><code>/lib/rr0-sighting-editor.mjs</code></td><td><code>&lt;rr0-sighting-editor&gt;</code>, <code>&lt;rr0-scene&gt;</code>, <code>&lt;rr0-ufo&gt;</code></td></tr>
    </table>
    </div>
    <p>Une page qui montre une observation puis, plus bas, un ciel seul, n'a donc besoin que d'un
      script et de deux balises : le second élément est déjà enregistré.</p>
    <p>On peut entrer dans une composition, une propriété à la fois :</p>
    <pre><code>const sighting = document.querySelector("rr0-sighting")
sighting.scene                    // le &lt;rr0-scene&gt; qu'il compose
sighting.scene.ufoElement         // et le &lt;rr0-ufo&gt; en dessous
sighting.scene.ufoElement.play()  // la lecture est donc à deux propriétés</code></pre>
    <p><code>&lt;rr0-sighting-editor&gt;</code> garde sa composition pour lui : ce qu'il offre à une
      page, c'est l'enregistrement — <code>sightingData</code> — et l'événement qui dit qu'il a
      changé.</p>

    <h2>Celui qu'il vous faut</h2>
    <p>Ce ne sont pas des variantes d'un même <i lang="en">bundle</i> : chacun est autonome, ne
      chargez donc que celui dont vous avez besoin. Les trois plus lourds embarquent Three.js et un
      catalogue d'étoiles — c'est ce que coûte un vrai ciel.</p>
    <div class="table-scroll">
    <table>
      <tr><th>Ce que vous faites</th><th>Composant</th><th>Module</th><th>gzip</th></tr>
      <tr><td><strong>Montrer une observation d'ovni</strong> — un dossier, un article, un rapport</td><td><code>&lt;rr0-sighting&gt;</code></td><td><code>/lib/rr0-sighting.mjs</code></td><td>249 Ko</td></tr>
      <tr><td><strong>Laisser quelqu'un en décrire ou en corriger une</strong></td><td><code>&lt;rr0-sighting-editor&gt;</code></td><td><code>/lib/rr0-sighting-editor.mjs</code></td><td>293 Ko</td></tr>
      <tr><td><strong>Montrer un ciel sans rien dedans</strong> — ce qu'un halo, une comète ou un passage satellite donnaient cette nuit-là</td><td><code>&lt;rr0-scene&gt;</code></td><td><code>/lib/rr0-scene.mjs</code></td><td>238 Ko</td></tr>
      <tr><td><strong>Montrer une observation dans une scène à vous</strong>, sans barre d'outils par-dessus</td><td><code>&lt;rr0-scene&gt;</code></td><td><code>/lib/rr0-scene.mjs</code></td><td>238 Ko</td></tr>
      <tr><td><strong>Illustrer une forme</strong> au fil d'un article, sans ciel et sans poids</td><td><code>&lt;rr0-ufo&gt;</code></td><td><code>/lib/rr0-ufo.mjs</code></td><td>16 Ko</td></tr>
      <tr><td><strong>Vous ne savez pas</strong></td><td><code>&lt;rr0-sighting&gt;</code></td><td><code>/lib/rr0-sighting.mjs</code></td><td>249 Ko</td></tr>
    </table>
    </div>
    <p>En poser un sur une page, c'est <a href="/docs/share/">deux lignes</a>.</p>

    <h2>Documentation détaillée</h2>
    <p>Ce que chacun prend, ce à quoi il répond, ce qu'il dessine — une page par composant, parce
      que ce dont vous avez besoin de l'un n'est jamais ce dont vous avez besoin des trois autres
      au même moment.</p>
    <div class="uses">
      <a class="use" href="/docs/components/ufo/"><h3><code>&lt;rr0-ufo&gt;</code></h3><p>La forme et sa lecture, sans ciel derrière — le composant léger.</p><p class="use-more">Lire →</p></a>
      <a class="use" href="/docs/components/scene/"><h3><code>&lt;rr0-scene&gt;</code></h3><p>La même chose, sur le vrai ciel et le vrai horizon de la date et du lieu de l'observation.</p><p class="use-more">Lire →</p></a>
      <a class="use" href="/docs/components/sighting/"><h3><code>&lt;rr0-sighting&gt;</code></h3><p>La vue standard d'un témoignage réel : un ou plusieurs témoins, avec leur barre d'outils.</p><p class="use-more">Lire →</p></a>
      <a class="use" href="/docs/components/editor/"><h3><code>&lt;rr0-sighting-editor&gt;</code></h3><p>Toute la barre d'outils d'écriture, pour décrire une observation ou en corriger une.</p><p class="use-more">Lire →</p></a>
    </div>

    <h2>Intégrer dans votre application</h2>
    <p>Après <code>npm install @rr0/ufoathome</code> :</p>
    <pre><code>import "@rr0/ufoathome/ufo"      // enregistre &lt;rr0-ufo&gt;
import "@rr0/ufoathome/scene"    // enregistre &lt;rr0-scene&gt;
import "@rr0/ufoathome/sighting" // enregistre &lt;rr0-sighting&gt;
import "@rr0/ufoathome/editor"   // enregistre &lt;rr0-sighting-editor&gt;</code></pre>
    <p>Ou recopiez le contenu des répertoires <code>dist-embed*</code> du paquet sur votre serveur et
      pointez le <code>&lt;script src&gt;</code> dessus. Chaque module référence ses ressources —
      catalogue d'étoiles, sons de météo — <em>relativement à lui-même</em> : il fonctionne donc
      depuis n'importe quel chemin, il suffit de garder ensemble les fichiers d'un même
      <i lang="en">bundle</i>. Plus rien ne dépend alors de ce site.</p>

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
