import { DocsSection } from "./DocsSection.js"
import type { PageMeta, Said, SiteLanguage } from "../SitePage.js"

/** The three components, one section each: markup, then what each can be told and asked. */
export class DocsComponentsPage extends DocsSection {

  readonly meta: PageMeta = {
    slug: "docs/components",
    navLabel: { en: "The components", fr: "Les composants", es: "Los componentes", it: "I componenti" },
    title: { en: "The components", fr: "Les composants", es: "Los componentes", it: "I componenti" },
    description: {
      en: "Three standard elements, one page each: which one you want, what it draws, the markup it "
        + "takes, and everything it answers to.",
      fr: "Trois éléments standards, une page chacun : lequel vous voulez, ce qu'il dessine, le "
        + "balisage qu'il accepte, et tout ce à quoi il répond.",
      es: "Tres elementos estándar, una página cada uno: cuál necesitas, qué dibuja, el marcado que "
        + "acepta y todo aquello a lo que responde.",
      it: "Tre elementi standard, una pagina ciascuno: quale ti serve, cosa disegna, il markup che "
        + "accetta e tutto ciò a cui risponde."
    },
    asideFromNav: true
  }

  private readonly lede: Said<string> = {
    en: "Three standard Web Components — the browser's own, not a framework's. Each registers itself "
      + "on import, each takes the same description of an observation as its input, and each "
      + "composes the one before it.",
    fr: "Trois composants web standards — ceux du navigateur, pas ceux d'un framework. Chacun "
      + "s'enregistre à l'import, chacun prend en entrée la même description d'observation, et "
      + "chacun compose le précédent.",
    es: "Tres Web Components estándar — los del propio navegador, no los de un framework. Cada uno se "
      + "registra al importarlo, cada uno toma como entrada la misma descripción de una observación, y "
      + "cada uno compone el anterior.",
    it: "Tre Web Component standard — quelli del browser stesso, non quelli di un framework. Ognuno si "
      + "registra all'importazione, ognuno prende in ingresso la stessa descrizione di un'osservazione, "
      + "e ognuno compone il precedente."
  }

  /** Where each tag's own page is, by the tag itself. */
  private static readonly PAGES: ReadonlyArray<readonly [string, string]> = [
    ["rr0-scene", "/docs/components/scene/"],
    ["rr0-sighting-editor", "/docs/components/edit/"],
    ["rr0-sighting", "/docs/components/sighting/"]
  ]

  render(language: SiteLanguage): string {
    return this.hero(language, this.meta.title, this.lede)
      + this.linked({ en: () => this.en(), fr: () => this.fr(), es: () => this.es(), it: () => this.it() }[language]())
  }

  /**
   * Every mention of a tag on this page is a way to its own page.
   *
   * Written once here rather than by hand at the forty places they occur: this page's whole job is
   * to send a reader to one of the three, and a mention that reads like the answer but cannot be
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
    <p>These are three <a href="https://developer.mozilla.org/en-US/docs/Web/API/Web_components">Web Components</a> — the browser's own standard for a
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
    <p>They compose in one line: both <code>&lt;rr0-sighting&gt;</code> and
      <code>&lt;rr0-sighting-editor&gt;</code> hold an <code>&lt;rr0-scene&gt;</code>, and the scene
      holds the playback layer — the timeline, the controls, the pointer's own canvas. So everything
      the scene answers to is available in all three — through <code>.scene</code> and
      <code>.scene.ufoElement</code> from the outermost, since the composition lives in a shadow
      root.</p>

    <h2>What each one is for</h2>
    <ul class="plain">
      <li><strong><code>&lt;rr0-scene&gt;</code> — the phenomenon in the world around it.</strong> The
        shape an observer drew, its colour and halo and movement, standing in the real sky, horizon,
        weather and ground of a stated date, hour and place — hidden by what stood in front of it.
        Useful on its own too, for a sky with nothing in it at all.</li>
      <li><strong><code>&lt;rr0-sighting&gt;</code> — the account, to watch.</strong>
        A scene plus who is testifying, the observation's own metadata, its credits, and the lines
        that let a reader take it elsewhere. This is what a published sighting looks like.</li>
      <li><strong><code>&lt;rr0-sighting-editor&gt;</code> — the account, to reconstruct.</strong>
        Everything above plus the authoring toolbar: describe an observation, or correct one.</li>
    </ul>

    <h2>How they fit together</h2>
    <p>You never write the nesting. Each element builds the one below it inside its own shadow
      root, so what your page contains is a single tag:</p>
    <pre><code>&lt;rr0-sighting&gt;           who is testifying, the metadata panel, the embed lines
└─ &lt;rr0-scene&gt;           the real sky, horizon, weather and decor, the phenomenon, playback

&lt;rr0-sighting-editor&gt;    the eight authoring panels
└─ &lt;rr0-scene&gt;           a scene, not a sighting: an editor has its own toolbar</code></pre>
    <p>Which is why one script tag brings the ones underneath with it:</p>
    <div class="table-scroll">
    <table>
      <tr><th>Loading this</th><th>registers</th></tr>
      <tr><td><code>/lib/rr0-scene.mjs</code></td><td><code>&lt;rr0-scene&gt;</code></td></tr>
      <tr><td><code>/lib/rr0-sighting.mjs</code></td><td><code>&lt;rr0-sighting&gt;</code>, <code>&lt;rr0-scene&gt;</code></td></tr>
      <tr><td><code>/lib/rr0-sighting-editor.mjs</code></td><td><code>&lt;rr0-sighting-editor&gt;</code>, <code>&lt;rr0-scene&gt;</code></td></tr>
    </table>
    </div>
    <p>So a page showing a sighting and, further down, a bare sky of its own needs one script and
      two tags — the second element is already registered.</p>
    <p>A composition can be reached into, one property at a time:</p>
    <pre><code>const sighting = document.querySelector("rr0-sighting")
sighting.scene                    // the &lt;rr0-scene&gt; it composes
sighting.scene.ufoElement         // and the playback layer under that
sighting.scene.ufoElement.play()  // so playback is two properties away</code></pre>
    <p><code>&lt;rr0-sighting-editor&gt;</code> keeps its own composition to itself: what it offers
      a page is the recording — <code>sightingData</code> — and the event saying it changed.</p>

    <h2>Which one you want</h2>
    <p>They are not variants of one bundle: each is self-contained, so load only the one you need.
      All three carry Three.js and a star catalogue, which is what a real sky costs.</p>
    <div class="table-scroll">
    <table>
      <tr><th>What you are doing</th><th>Component</th><th>Module</th><th>gzip</th></tr>
      <tr><td><strong>Showing a UFO sighting</strong> — a case file, an article, a report</td><td><code>&lt;rr0-sighting&gt;</code></td><td><code>/lib/rr0-sighting.mjs</code></td><td>249 KB</td></tr>
      <tr><td><strong>Letting somebody describe or correct one</strong></td><td><code>&lt;rr0-sighting-editor&gt;</code></td><td><code>/lib/rr0-sighting-editor.mjs</code></td><td>293 KB</td></tr>
      <tr><td><strong>Showing a sky with nothing in it</strong> — what a halo, a comet or a satellite pass looked like that night</td><td><code>&lt;rr0-scene&gt;</code></td><td><code>/lib/rr0-scene.mjs</code></td><td>238 KB</td></tr>
      <tr><td><strong>Showing a sighting inside a scene of your own</strong>, with no toolbar over it</td><td><code>&lt;rr0-scene&gt;</code></td><td><code>/lib/rr0-scene.mjs</code></td><td>238 KB</td></tr>
      <tr><td><strong>Not sure</strong></td><td><code>&lt;rr0-sighting&gt;</code></td><td><code>/lib/rr0-sighting.mjs</code></td><td>249 KB</td></tr>
    </table>
    </div>
    <p>Putting one on a page is <a href="/docs/share/">two lines</a>.</p>

    <h2>Detailed documentation</h2>
    <p>What each takes, what it answers to, and what it draws — one page per component, because
      what you need from one of them is never what you need from the other two at the same
      moment.</p>
    <div class="uses">
      <a class="use" href="/docs/components/scene/"><h3><code>&lt;rr0-scene&gt;</code></h3><p>The shape and its playback, in the real sky and horizon of the recording's own date and place.</p><p class="use-more">Read →</p></a>
      <a class="use" href="/docs/components/sighting/"><h3><code>&lt;rr0-sighting&gt;</code></h3><p>The standard view of a real account: one observer or several, with their toolbar.</p><p class="use-more">Read →</p></a>
      <a class="use" href="/docs/components/edit/"><h3><code>&lt;rr0-sighting-editor&gt;</code></h3><p>The whole authoring toolbar, for describing an observation or correcting one.</p><p class="use-more">Read →</p></a>
    </div>

    <h2>Putting one in your application</h2>
    <p>After <code>npm install @rr0/ufoathome</code>:</p>
    <pre><code>import "@rr0/ufoathome/scene"    // registers &lt;rr0-scene&gt;
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
    <p>Ce sont trois <a href="https://developer.mozilla.org/fr/docs/Web/API/Web_components">composants web</a> — le standard du navigateur pour un
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
    <p>Ils se composent en ligne : <code>&lt;rr0-sighting&gt;</code> comme
      <code>&lt;rr0-sighting-editor&gt;</code> contiennent un <code>&lt;rr0-scene&gt;</code>, et la
      scène contient la couche de lecture — la chronologie, les commandes, le canevas du pointeur.
      Tout ce à quoi la scène répond est donc disponible dans les trois — via <code>.scene</code>
      et <code>.scene.ufoElement</code> depuis le plus extérieur, la composition vivant dans un
      <i lang="en">shadow root</i>.</p>

    <h2>À quoi sert chacun</h2>
    <ul class="plain">
      <li><strong><code>&lt;rr0-scene&gt;</code> — le phénomène dans le monde autour.</strong> La
        forme dessinée par un observateur, sa couleur, son halo, son mouvement, debout dans le ciel,
        l'horizon, la météo et le sol réels d'une date, d'une heure et d'un lieu énoncés — cachée par
        ce qui se tenait devant. Utile seul aussi, pour un ciel où il n'y a rien du tout.</li>
      <li><strong><code>&lt;rr0-sighting&gt;</code> — le compte rendu, à regarder.</strong> Une scène, plus
        qui témoigne, les métadonnées de l'observation, ses crédits, et les lignes qui permettent à
        un lecteur de l'emporter ailleurs. C'est à cela que ressemble une observation publiée.</li>
      <li><strong><code>&lt;rr0-sighting-editor&gt;</code> — le compte rendu, à reconstruire.</strong> Tout ce qui
        précède, plus la barre d'outils de saisie : décrire une observation, ou en corriger une.</li>
    </ul>

    <h2>Comment ils s'emboîtent</h2>
    <p>Vous n'écrivez jamais l'imbrication. Chaque élément construit celui du dessous dans son
      propre <i lang="en">shadow root</i> : ce que votre page contient, c'est une seule balise.</p>
    <pre><code>&lt;rr0-sighting&gt;           qui témoigne, le panneau de métadonnées, les lignes d'intégration
└─ &lt;rr0-scene&gt;           le ciel, l'horizon, la météo et le décor réels, le phénomène, la lecture

&lt;rr0-sighting-editor&gt;    les huit panneaux de saisie
└─ &lt;rr0-scene&gt;           une scène, pas une observation : un éditeur a sa propre barre d'outils</code></pre>
    <p>C'est pourquoi une seule balise de script embarque ceux du dessous :</p>
    <div class="table-scroll">
    <table>
      <tr><th>Charger ceci</th><th>enregistre</th></tr>
      <tr><td><code>/lib/rr0-scene.mjs</code></td><td><code>&lt;rr0-scene&gt;</code></td></tr>
      <tr><td><code>/lib/rr0-sighting.mjs</code></td><td><code>&lt;rr0-sighting&gt;</code>, <code>&lt;rr0-scene&gt;</code></td></tr>
      <tr><td><code>/lib/rr0-sighting-editor.mjs</code></td><td><code>&lt;rr0-sighting-editor&gt;</code>, <code>&lt;rr0-scene&gt;</code></td></tr>
    </table>
    </div>
    <p>Une page qui montre une observation puis, plus bas, un ciel seul, n'a donc besoin que d'un
      script et de deux balises : le second élément est déjà enregistré.</p>
    <p>On peut entrer dans une composition, une propriété à la fois :</p>
    <pre><code>const sighting = document.querySelector("rr0-sighting")
sighting.scene                    // le &lt;rr0-scene&gt; qu'il compose
sighting.scene.ufoElement         // et la couche de lecture en dessous
sighting.scene.ufoElement.play()  // la lecture est donc à deux propriétés</code></pre>
    <p><code>&lt;rr0-sighting-editor&gt;</code> garde sa composition pour lui : ce qu'il offre à une
      page, c'est l'enregistrement — <code>sightingData</code> — et l'événement qui dit qu'il a
      changé.</p>

    <h2>Celui qu'il vous faut</h2>
    <p>Ce ne sont pas des variantes d'un même <i lang="en">bundle</i> : chacun est autonome, ne
      chargez donc que celui dont vous avez besoin. Tous trois embarquent Three.js et un catalogue
      d'étoiles — c'est ce que coûte un vrai ciel.</p>
    <div class="table-scroll">
    <table>
      <tr><th>Ce que vous faites</th><th>Composant</th><th>Module</th><th>gzip</th></tr>
      <tr><td><strong>Montrer une observation d'ovni</strong> — un dossier, un article, un rapport</td><td><code>&lt;rr0-sighting&gt;</code></td><td><code>/lib/rr0-sighting.mjs</code></td><td>249 Ko</td></tr>
      <tr><td><strong>Laisser quelqu'un en décrire ou en corriger une</strong></td><td><code>&lt;rr0-sighting-editor&gt;</code></td><td><code>/lib/rr0-sighting-editor.mjs</code></td><td>293 Ko</td></tr>
      <tr><td><strong>Montrer un ciel sans rien dedans</strong> — ce qu'un halo, une comète ou un passage satellite donnaient cette nuit-là</td><td><code>&lt;rr0-scene&gt;</code></td><td><code>/lib/rr0-scene.mjs</code></td><td>238 Ko</td></tr>
      <tr><td><strong>Montrer une observation dans une scène à vous</strong>, sans barre d'outils par-dessus</td><td><code>&lt;rr0-scene&gt;</code></td><td><code>/lib/rr0-scene.mjs</code></td><td>238 Ko</td></tr>
      <tr><td><strong>Vous ne savez pas</strong></td><td><code>&lt;rr0-sighting&gt;</code></td><td><code>/lib/rr0-sighting.mjs</code></td><td>249 Ko</td></tr>
    </table>
    </div>
    <p>En poser un sur une page, c'est <a href="/docs/share/">deux lignes</a>.</p>

    <h2>Documentation détaillée</h2>
    <p>Ce que chacun prend, ce à quoi il répond, ce qu'il dessine — une page par composant, parce
      que ce dont vous avez besoin de l'un n'est jamais ce dont vous avez besoin des deux autres
      au même moment.</p>
    <div class="uses">
      <a class="use" href="/docs/components/scene/"><h3><code>&lt;rr0-scene&gt;</code></h3><p>La forme et sa lecture, dans le vrai ciel et le vrai horizon de la date et du lieu de l'observation.</p><p class="use-more">Lire →</p></a>
      <a class="use" href="/docs/components/sighting/"><h3><code>&lt;rr0-sighting&gt;</code></h3><p>La vue standard d'un compte rendu réel : un ou plusieurs observateurs, avec leur barre d'outils.</p><p class="use-more">Lire →</p></a>
      <a class="use" href="/docs/components/edit/"><h3><code>&lt;rr0-sighting-editor&gt;</code></h3><p>Toute la barre d'outils d'écriture, pour décrire une observation ou en corriger une.</p><p class="use-more">Lire →</p></a>
    </div>

    <h2>Intégrer dans votre application</h2>
    <p>Après <code>npm install @rr0/ufoathome</code> :</p>
    <pre><code>import "@rr0/ufoathome/scene"    // enregistre &lt;rr0-scene&gt;
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

  private es(): string {
    return `
<section class="band">
  <div class="wrap prose-wide">
    <h2>Estándar, y ese es todo el diseño</h2>
    <p>Son tres <a href="https://developer.mozilla.org/en-US/docs/Web/API/Web_components">Web Components</a> — el estándar del propio navegador para un
      elemento personalizado, no un componente del <i lang="en">framework</i> de nadie. Lo que de
      ello se deriva merece explicarse, porque es lo que permite ponerte la herramienta en las manos:</p>
    <ul class="plain">
      <li><strong>Funcionan en cualquier página.</strong> Un sitio estático, WordPress, una aplicación
        React o Vue, una wiki, un archivo HTML escrito a mano. Son elementos: una página que puede
        contener un <code>&lt;video&gt;</code> puede contener estos.</li>
      <li><strong>Nada que compilar.</strong> Ni <i lang="en">bundler</i>, ni paso de compilación, ni
        configuración en tu proyecto. El módulo registra su elemento al importarlo y el navegador
        hace el resto.</li>
      <li><strong>Nada que mantener al día.</strong> No hay versión de <i lang="en">framework</i> con
        la que coincidir, así que la nueva versión mayor de otro no puede dejarlos obsoletos.</li>
      <li><strong>Su interior es suyo.</strong> Cada uno lleva su marcado y sus estilos en un
        <i lang="en">shadow root</i>, así que el CSS de tu página no puede romperlos y ellos no
        pueden romper tu página.</li>
    </ul>
    <p>Se componen en una línea: tanto <code>&lt;rr0-sighting&gt;</code> como
      <code>&lt;rr0-sighting-editor&gt;</code> contienen un <code>&lt;rr0-scene&gt;</code>, y la escena
      contiene la capa de reproducción — la línea de tiempo, los controles, el lienzo del puntero. Así
      que todo aquello a lo que responde la escena está disponible en los tres — mediante
      <code>.scene</code> y <code>.scene.ufoElement</code> desde el más externo, ya que la composición
      vive en un <i lang="en">shadow root</i>.</p>

    <h2>Para qué sirve cada uno</h2>
    <ul class="plain">
      <li><strong><code>&lt;rr0-scene&gt;</code> — el fenómeno en el mundo que lo rodea.</strong> La
        forma que dibujó un observador, su color, su halo y su movimiento, situada en el cielo, el
        horizonte, el tiempo y el suelo reales de una fecha, una hora y un lugar declarados — oculta
        por lo que había delante. Útil también por sí solo, para un cielo en el que no hay nada.</li>
      <li><strong><code>&lt;rr0-sighting&gt;</code> — el relato, para verlo.</strong>
        Una escena más quién testifica, los metadatos de la observación, sus créditos y las líneas
        que permiten a un lector llevarlo a otra parte. Así es como se ve un avistamiento publicado.</li>
      <li><strong><code>&lt;rr0-sighting-editor&gt;</code> — el relato, para reconstruirlo.</strong>
        Todo lo anterior más la barra de herramientas de edición: describir una observación, o
        corregir una.</li>
    </ul>

    <h2>Cómo encajan entre sí</h2>
    <p>Nunca escribes el anidamiento. Cada elemento construye el de debajo dentro de su propio
      <i lang="en">shadow root</i>, así que lo que contiene tu página es una sola etiqueta:</p>
    <pre><code>&lt;rr0-sighting&gt;           quién testifica, el panel de metadatos, las líneas de inserción
└─ &lt;rr0-scene&gt;           el cielo, el horizonte, el tiempo y el decorado reales, el fenómeno, la reproducción

&lt;rr0-sighting-editor&gt;    los ocho paneles de edición
└─ &lt;rr0-scene&gt;           una escena, no un avistamiento: un editor tiene su propia barra de herramientas</code></pre>
    <p>Por eso una sola etiqueta de script trae consigo los de debajo:</p>
    <div class="table-scroll">
    <table>
      <tr><th>Cargar esto</th><th>registra</th></tr>
      <tr><td><code>/lib/rr0-scene.mjs</code></td><td><code>&lt;rr0-scene&gt;</code></td></tr>
      <tr><td><code>/lib/rr0-sighting.mjs</code></td><td><code>&lt;rr0-sighting&gt;</code>, <code>&lt;rr0-scene&gt;</code></td></tr>
      <tr><td><code>/lib/rr0-sighting-editor.mjs</code></td><td><code>&lt;rr0-sighting-editor&gt;</code>, <code>&lt;rr0-scene&gt;</code></td></tr>
    </table>
    </div>
    <p>Así, una página que muestra un avistamiento y, más abajo, un cielo propio sin nada necesita un
      solo script y dos etiquetas — el segundo elemento ya está registrado.</p>
    <p>Se puede entrar en una composición, una propiedad cada vez:</p>
    <pre><code>const sighting = document.querySelector("rr0-sighting")
sighting.scene                    // el &lt;rr0-scene&gt; que compone
sighting.scene.ufoElement         // y la capa de reproducción debajo
sighting.scene.ufoElement.play()  // así que la reproducción está a dos propiedades</code></pre>
    <p><code>&lt;rr0-sighting-editor&gt;</code> se guarda su composición para sí: lo que ofrece a una
      página es el registro — <code>sightingData</code> — y el evento que avisa de que ha cambiado.</p>

    <h2>Cuál necesitas</h2>
    <p>No son variantes de un mismo <i lang="en">bundle</i>: cada uno es autónomo, así que carga solo
      el que necesites. Los tres incluyen Three.js y un catálogo de estrellas, que es lo que cuesta un
      cielo real.</p>
    <div class="table-scroll">
    <table>
      <tr><th>Lo que estás haciendo</th><th>Componente</th><th>Módulo</th><th>gzip</th></tr>
      <tr><td><strong>Mostrar un avistamiento ovni</strong> — un expediente, un artículo, un informe</td><td><code>&lt;rr0-sighting&gt;</code></td><td><code>/lib/rr0-sighting.mjs</code></td><td>249 KB</td></tr>
      <tr><td><strong>Dejar que alguien describa o corrija uno</strong></td><td><code>&lt;rr0-sighting-editor&gt;</code></td><td><code>/lib/rr0-sighting-editor.mjs</code></td><td>293 KB</td></tr>
      <tr><td><strong>Mostrar un cielo sin nada</strong> — cómo se veían esa noche un halo, un cometa o el paso de un satélite</td><td><code>&lt;rr0-scene&gt;</code></td><td><code>/lib/rr0-scene.mjs</code></td><td>238 KB</td></tr>
      <tr><td><strong>Mostrar un avistamiento dentro de una escena propia</strong>, sin barra de herramientas encima</td><td><code>&lt;rr0-scene&gt;</code></td><td><code>/lib/rr0-scene.mjs</code></td><td>238 KB</td></tr>
      <tr><td><strong>No estás seguro</strong></td><td><code>&lt;rr0-sighting&gt;</code></td><td><code>/lib/rr0-sighting.mjs</code></td><td>249 KB</td></tr>
    </table>
    </div>
    <p>Ponerlo en una página son <a href="/docs/share/">dos líneas</a>.</p>

    <h2>Documentación detallada</h2>
    <p>Qué acepta cada uno, a qué responde y qué dibuja — una página por componente, porque lo que
      necesitas de uno de ellos nunca es lo que necesitas de los otros dos en el mismo
      momento.</p>
    <div class="uses">
      <a class="use" href="/docs/components/scene/"><h3><code>&lt;rr0-scene&gt;</code></h3><p>La forma y su reproducción, en el cielo y el horizonte reales de la fecha y el lugar del registro.</p><p class="use-more">Leer →</p></a>
      <a class="use" href="/docs/components/sighting/"><h3><code>&lt;rr0-sighting&gt;</code></h3><p>La vista estándar de un relato real: uno o varios observadores, con su barra de herramientas.</p><p class="use-more">Leer →</p></a>
      <a class="use" href="/docs/components/edit/"><h3><code>&lt;rr0-sighting-editor&gt;</code></h3><p>Toda la barra de herramientas de edición, para describir una observación o corregir una.</p><p class="use-more">Leer →</p></a>
    </div>

    <h2>Integrarlo en tu aplicación</h2>
    <p>Tras <code>npm install @rr0/ufoathome</code>:</p>
    <pre><code>import "@rr0/ufoathome/scene"    // registra &lt;rr0-scene&gt;
import "@rr0/ufoathome/sighting" // registra &lt;rr0-sighting&gt;
import "@rr0/ufoathome/editor"   // registra &lt;rr0-sighting-editor&gt;</code></pre>
    <p>O copia el contenido de los directorios <code>dist-embed*</code> del paquete en tu propio
      servidor y apunta allí el <code>&lt;script src&gt;</code>. Cada módulo referencia sus propios
      recursos — el catálogo de estrellas, el audio meteorológico — <em>de forma relativa a sí mismo</em>,
      así que sigue funcionando desde cualquier ruta; basta con mantener juntos los archivos de cada
      <i lang="en">bundle</i>. Nada depende entonces de este sitio.</p>

    <h2>Idioma</h2>
    <p>Cada etiqueta se traduce por detección, sin selector: primero el idioma declarado por la propia
      página — el atributo <code>lang</code> más cercano, así que <code>&lt;html lang="fr"&gt;</code>
      obtiene etiquetas en francés —, luego las preferencias del navegador y, por último, el inglés.
      Una página que no declara nada recurre al navegador exactamente como antes.</p>
  </div>
</section>
`
  }

  private it(): string {
    return `
<section class="band">
  <div class="wrap prose-wide">
    <h2>Standard, ed è questo tutto il progetto</h2>
    <p>Sono tre <a href="https://developer.mozilla.org/en-US/docs/Web/API/Web_components">Web Component</a> — lo standard del browser stesso per un
      elemento personalizzato, non un componente del <i lang="en">framework</i> di qualcuno. Ciò che
      ne consegue merita di essere detto, perché è ciò che permette di metterti in mano lo strumento:</p>
    <ul class="plain">
      <li><strong>Funzionano in qualsiasi pagina.</strong> Un sito statico, WordPress, un'applicazione
        React o Vue, un wiki, un file HTML scritto a mano. Sono elementi: una pagina che può
        contenere un <code>&lt;video&gt;</code> può contenere anche questi.</li>
      <li><strong>Niente da compilare.</strong> Nessun <i lang="en">bundler</i>, nessuna fase di
        compilazione, nessuna configurazione nel tuo progetto. Il modulo registra il suo elemento
        all'importazione e il browser fa il resto.</li>
      <li><strong>Niente da inseguire.</strong> Non c'è una versione di <i lang="en">framework</i> a
        cui adeguarsi, quindi la nuova major release di qualcun altro non può renderli obsoleti.</li>
      <li><strong>Il loro interno è affar loro.</strong> Ognuno porta il proprio markup e i propri stili
        in uno <i lang="en">shadow root</i>, quindi il CSS della tua pagina non può romperli e loro
        non possono rompere la tua pagina.</li>
    </ul>
    <p>Si compongono in una riga: sia <code>&lt;rr0-sighting&gt;</code> sia
      <code>&lt;rr0-sighting-editor&gt;</code> contengono un <code>&lt;rr0-scene&gt;</code>, e la scena
      contiene lo strato di riproduzione — la linea temporale, i controlli, il canvas del puntatore.
      Quindi tutto ciò a cui risponde la scena è disponibile in tutti e tre — tramite
      <code>.scene</code> e <code>.scene.ufoElement</code> dal più esterno, poiché la composizione
      vive in uno <i lang="en">shadow root</i>.</p>

    <h2>A cosa serve ciascuno</h2>
    <ul class="plain">
      <li><strong><code>&lt;rr0-scene&gt;</code> — il fenomeno nel mondo che lo circonda.</strong> La
        forma disegnata da un osservatore, il suo colore, il suo alone e il suo movimento, collocata nel
        cielo, nell'orizzonte, nel meteo e nel suolo reali di una data, un'ora e un luogo dichiarati —
        nascosta da ciò che stava davanti. Utile anche da sola, per un cielo in cui non c'è niente.</li>
      <li><strong><code>&lt;rr0-sighting&gt;</code> — il resoconto, da guardare.</strong>
        Una scena più chi testimonia, i metadati dell'osservazione, i suoi crediti e le righe che
        permettono a un lettore di portarlo altrove. È così che appare un avvistamento pubblicato.</li>
      <li><strong><code>&lt;rr0-sighting-editor&gt;</code> — il resoconto, da ricostruire.</strong>
        Tutto quanto sopra più la barra degli strumenti di redazione: descrivere un'osservazione, o
        correggerne una.</li>
    </ul>

    <h2>Come si incastrano</h2>
    <p>Non scrivi mai l'annidamento. Ogni elemento costruisce quello sottostante dentro il proprio
      <i lang="en">shadow root</i>, quindi ciò che la tua pagina contiene è un solo tag:</p>
    <pre><code>&lt;rr0-sighting&gt;           chi testimonia, il pannello dei metadati, le righe di incorporamento
└─ &lt;rr0-scene&gt;           il cielo, l'orizzonte, il meteo e lo scenario reali, il fenomeno, la riproduzione

&lt;rr0-sighting-editor&gt;    gli otto pannelli di redazione
└─ &lt;rr0-scene&gt;           una scena, non un avvistamento: un editor ha la propria barra degli strumenti</code></pre>
    <p>Ecco perché un solo tag script si porta dietro quelli sottostanti:</p>
    <div class="table-scroll">
    <table>
      <tr><th>Caricando questo</th><th>si registra</th></tr>
      <tr><td><code>/lib/rr0-scene.mjs</code></td><td><code>&lt;rr0-scene&gt;</code></td></tr>
      <tr><td><code>/lib/rr0-sighting.mjs</code></td><td><code>&lt;rr0-sighting&gt;</code>, <code>&lt;rr0-scene&gt;</code></td></tr>
      <tr><td><code>/lib/rr0-sighting-editor.mjs</code></td><td><code>&lt;rr0-sighting-editor&gt;</code>, <code>&lt;rr0-scene&gt;</code></td></tr>
    </table>
    </div>
    <p>Così una pagina che mostra un avvistamento e, più in basso, un cielo tutto suo ha bisogno di un
      solo script e di due tag — il secondo elemento è già registrato.</p>
    <p>Si può entrare in una composizione, una proprietà alla volta:</p>
    <pre><code>const sighting = document.querySelector("rr0-sighting")
sighting.scene                    // il &lt;rr0-scene&gt; che compone
sighting.scene.ufoElement         // e lo strato di riproduzione sotto di esso
sighting.scene.ufoElement.play()  // quindi la riproduzione è a due proprietà di distanza</code></pre>
    <p><code>&lt;rr0-sighting-editor&gt;</code> tiene per sé la propria composizione: ciò che offre a
      una pagina è la registrazione — <code>sightingData</code> — e l'evento che segnala che è
      cambiata.</p>

    <h2>Quale ti serve</h2>
    <p>Non sono varianti di un unico <i lang="en">bundle</i>: ognuno è autonomo, quindi carica solo
      quello che ti serve. Tutti e tre includono Three.js e un catalogo stellare, che è il prezzo di
      un cielo reale.</p>
    <div class="table-scroll">
    <table>
      <tr><th>Cosa stai facendo</th><th>Componente</th><th>Modulo</th><th>gzip</th></tr>
      <tr><td><strong>Mostrare un avvistamento UFO</strong> — un fascicolo, un articolo, un rapporto</td><td><code>&lt;rr0-sighting&gt;</code></td><td><code>/lib/rr0-sighting.mjs</code></td><td>249 KB</td></tr>
      <tr><td><strong>Permettere a qualcuno di descriverne o correggerne uno</strong></td><td><code>&lt;rr0-sighting-editor&gt;</code></td><td><code>/lib/rr0-sighting-editor.mjs</code></td><td>293 KB</td></tr>
      <tr><td><strong>Mostrare un cielo senza niente</strong> — che aspetto avevano quella notte un alone, una cometa o il passaggio di un satellite</td><td><code>&lt;rr0-scene&gt;</code></td><td><code>/lib/rr0-scene.mjs</code></td><td>238 KB</td></tr>
      <tr><td><strong>Mostrare un avvistamento dentro una scena tua</strong>, senza barra degli strumenti sopra</td><td><code>&lt;rr0-scene&gt;</code></td><td><code>/lib/rr0-scene.mjs</code></td><td>238 KB</td></tr>
      <tr><td><strong>Non sei sicuro</strong></td><td><code>&lt;rr0-sighting&gt;</code></td><td><code>/lib/rr0-sighting.mjs</code></td><td>249 KB</td></tr>
    </table>
    </div>
    <p>Metterne uno in una pagina richiede <a href="/docs/share/">due righe</a>.</p>

    <h2>Documentazione dettagliata</h2>
    <p>Cosa accetta ciascuno, a cosa risponde e cosa disegna — una pagina per componente, perché ciò
      che ti serve da uno di loro non è mai ciò che ti serve dagli altri due nello stesso
      momento.</p>
    <div class="uses">
      <a class="use" href="/docs/components/scene/"><h3><code>&lt;rr0-scene&gt;</code></h3><p>La forma e la sua riproduzione, nel cielo e nell'orizzonte reali della data e del luogo della registrazione.</p><p class="use-more">Leggi →</p></a>
      <a class="use" href="/docs/components/sighting/"><h3><code>&lt;rr0-sighting&gt;</code></h3><p>La vista standard di un resoconto reale: uno o più osservatori, con la loro barra degli strumenti.</p><p class="use-more">Leggi →</p></a>
      <a class="use" href="/docs/components/edit/"><h3><code>&lt;rr0-sighting-editor&gt;</code></h3><p>L'intera barra degli strumenti di redazione, per descrivere un'osservazione o correggerne una.</p><p class="use-more">Leggi →</p></a>
    </div>

    <h2>Integrarlo nella tua applicazione</h2>
    <p>Dopo <code>npm install @rr0/ufoathome</code>:</p>
    <pre><code>import "@rr0/ufoathome/scene"    // registra &lt;rr0-scene&gt;
import "@rr0/ufoathome/sighting" // registra &lt;rr0-sighting&gt;
import "@rr0/ufoathome/editor"   // registra &lt;rr0-sighting-editor&gt;</code></pre>
    <p>Oppure copia il contenuto delle cartelle <code>dist-embed*</code> del pacchetto sul tuo
      server e punta lì il <code>&lt;script src&gt;</code>. Ogni modulo fa riferimento alle proprie
      risorse — il catalogo stellare, l'audio meteorologico — <em>in modo relativo a se stesso</em>,
      quindi continua a funzionare da qualsiasi percorso; basta tenere insieme i file di ogni
      <i lang="en">bundle</i>. A quel punto nulla dipende più da questo sito.</p>

    <h2>Lingua</h2>
    <p>Ogni etichetta è tradotta per rilevamento, senza selettore: prima la lingua dichiarata dalla
      pagina stessa — l'attributo <code>lang</code> più vicino, quindi <code>&lt;html lang="fr"&gt;</code>
      ottiene etichette in francese — poi le preferenze del browser, poi l'inglese. Una pagina che non
      dichiara nulla ricade sul browser esattamente come prima.</p>
  </div>
</section>
`
  }
}
