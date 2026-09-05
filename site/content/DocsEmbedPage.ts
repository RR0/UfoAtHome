import { DocsSection } from "./DocsSection.js"
import type { PageMeta, Said, SiteLanguage } from "../SitePage.js"

/** "I have a recording and I want it on my own page, the way a video goes on a page." */
export class DocsEmbedPage extends DocsSection {

  readonly meta: PageMeta = {
    slug: "docs/embed",
    navLabel: { en: "Putting it on a page", fr: "L'intégrer à une page" },
    title: { en: "Put a reconstruction on your page", fr: "Poser une reconstitution sur votre page" },
    description: {
      en: "Two lines of HTML, the way a video goes on a page — which element to load, what it needs, "
        + "and what to do when your host forbids scripts.",
      fr: "Deux lignes de HTML, comme on pose une vidéo — quel élément charger, ce qu'il lui faut, et "
        + "que faire quand votre hébergeur interdit les scripts."
    },
    asideFromNav: true
  }

  private readonly lede: Said<string> = {
    en: "No framework, no build step, nothing for your page to compile. Two lines, and the "
      + "reconstruction plays where you put them.",
    fr: "Aucun framework, aucune étape de compilation, rien à construire pour votre page. Deux "
      + "lignes, et la reconstitution se joue là où vous les avez posées."
  }

  render(language: SiteLanguage): string {
    return this.hero(language, this.meta.title, this.lede) + (language === "fr" ? this.fr() : this.en())
  }

  private en(): string {
    return `
<section class="band">
  <div class="wrap prose-wide">
    <h2>The two lines</h2>
    <pre><code>&lt;script type="module" src="https://ufoathome.org/lib/rr0-eyewitness.mjs"&gt;&lt;/script&gt;
&lt;rr0-eyewitness src="https://example.org/my-case/sighting.json"&gt;&lt;/rr0-eyewitness&gt;</code></pre>
    <p>The element registers itself the moment the module is imported — there is no setup call to
      make. Every reconstruction already published hands these two lines out from the <q>?</q>
      button in its own toolbar, with the absolute URLs filled in and a copy button.</p>

    <h3>What it needs</h3>
    <ul class="plain">
      <li><strong><code>type="module"</code> is not optional</strong>, and the file has to be served
        with a JavaScript MIME type. Copying the script tag without it is the commonest way for
        nothing at all to happen.</li>
      <li><strong>Your recording must be readable by the page:</strong> same site, or one
        <code>Access-Control-Allow-Origin: *</code> header on the JSON. This site serves both
        <code>/lib/*</code> and <code>/demo-data/*</code> that way, which is why the snippet above
        works from anywhere.</li>
    </ul>

    <h3>If your host forbids scripts</h3>
    <p>Most forums and many content systems will not run a module script from a post, for good
      reasons. Two things that work instead: an <code>&lt;iframe&gt;</code> pointing at a page of
      your own that holds the component, or simply
      <a href="/docs/link/">a link to the player</a>, which needs nothing but text.</p>
  </div>
</section>

<section class="band">
  <div class="wrap prose-wide">
    <h2>Which element to load</h2>
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
    <p>Each takes the same <code>src</code>. What each one can be told and asked afterwards is on
      <a href="/docs/elements/">the elements page</a>.</p>

    <h3>Several witnesses</h3>
    <p>Point <code>src</code> at a manifest instead — a plain JSON array of each witness's own
      recording URL — and the element grows a witness picker:</p>
    <pre><code>["chiles-sighting.json", "whitted-sighting.json"]</code></pre>
    <p>Nothing is duplicated in the manifest: each witness's display name and the shared case id come
      from that witness's own file. A fetched array is a manifest and a fetched object is a single
      recording, so the two are told apart without being declared.</p>
  </div>
</section>

<section class="band">
  <div class="wrap prose-wide">
    <h2>From a bundler, or from your own server</h2>
    <p>After <code>npm install @rr0/ufoathome</code>:</p>
    <pre><code>import "@rr0/ufoathome/ufo"        // registers &lt;rr0-ufo&gt;
import "@rr0/ufoathome/scene"      // registers &lt;rr0-scene&gt;
import "@rr0/ufoathome/eyewitness" // registers &lt;rr0-eyewitness&gt;
import "@rr0/ufoathome/recorder"   // registers &lt;rr0-ufo-recorder&gt;</code></pre>
    <p>Or copy the contents of the package's <code>dist-embed*</code> directories onto your own
      server and point the <code>&lt;script src&gt;</code> there. The modules reference their own
      assets — the star catalogue, the weather audio — <em>relative to themselves</em>, so they keep
      working from any path; just keep each bundle's files together.</p>
    <p>Nothing then depends on this site at all.</p>
  </div>
</section>
`
  }

  private fr(): string {
    return `
<section class="band">
  <div class="wrap prose-wide">
    <h2>Les deux lignes</h2>
    <pre><code>&lt;script type="module" src="https://ufoathome.org/lib/rr0-eyewitness.mjs"&gt;&lt;/script&gt;
&lt;rr0-eyewitness src="https://exemple.org/mon-dossier/sighting.json"&gt;&lt;/rr0-eyewitness&gt;</code></pre>
    <p>L'élément s'enregistre lui-même dès que le module est importé : il n'y a aucun appel
      d'initialisation à faire. Chaque reconstitution déjà publiée distribue ces deux lignes depuis
      le bouton <q>?</q> de sa barre d'outils, URLs absolues remplies et bouton de copie compris.</p>

    <h3>Ce qu'il lui faut</h3>
    <ul class="plain">
      <li><strong><code>type="module"</code> n'est pas facultatif</strong>, et le fichier doit être
        servi avec un type MIME JavaScript. Recopier la balise sans cela est la première cause de
        « il ne se passe rien ».</li>
      <li><strong>Votre enregistrement doit être lisible par la page :</strong> même site, ou un
        en-tête <code>Access-Control-Allow-Origin: *</code> sur le JSON. Ce site sert
        <code>/lib/*</code> et <code>/demo-data/*</code> ainsi — c'est pourquoi l'extrait ci-dessus
        fonctionne depuis n'importe où.</li>
    </ul>

    <h3>Si votre hébergeur interdit les scripts</h3>
    <p>La plupart des forums et bien des systèmes de publication n'exécuteront pas un script de
      module depuis un message, pour de bonnes raisons. Deux solutions : une
      <code>&lt;iframe&gt;</code> pointant vers une page à vous qui porte le composant, ou tout
      simplement <a href="/docs/link/">un lien vers le lecteur</a>, qui ne demande que du texte.</p>
  </div>
</section>

<section class="band">
  <div class="wrap prose-wide">
    <h2>Quel élément charger</h2>
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
    <p>Chacun prend le même <code>src</code>. Ce que l'on peut dire et demander à chacun ensuite est
      sur <a href="/docs/elements/">la page des éléments</a>.</p>

    <h3>Plusieurs témoins</h3>
    <p>Pointez <code>src</code> vers un manifeste — un simple tableau JSON des URLs de chaque
      enregistrement — et l'élément se dote d'un sélecteur de témoin :</p>
    <pre><code>["chiles-sighting.json", "whitted-sighting.json"]</code></pre>
    <p>Rien n'est dupliqué dans le manifeste : le nom affiché de chaque témoin et l'identifiant de
      dossier partagé viennent du fichier de ce témoin. Un tableau reçu est un manifeste, un objet
      reçu un enregistrement unique : les deux se distinguent sans être déclarés.</p>
  </div>
</section>

<section class="band">
  <div class="wrap prose-wide">
    <h2>Depuis un <i lang="en">bundler</i>, ou depuis votre serveur</h2>
    <p>Après <code>npm install @rr0/ufoathome</code> :</p>
    <pre><code>import "@rr0/ufoathome/ufo"        // enregistre &lt;rr0-ufo&gt;
import "@rr0/ufoathome/scene"      // enregistre &lt;rr0-scene&gt;
import "@rr0/ufoathome/eyewitness" // enregistre &lt;rr0-eyewitness&gt;
import "@rr0/ufoathome/recorder"   // enregistre &lt;rr0-ufo-recorder&gt;</code></pre>
    <p>Ou recopiez le contenu des répertoires <code>dist-embed*</code> du paquet sur votre serveur et
      pointez le <code>&lt;script src&gt;</code> dessus. Les modules référencent leurs ressources —
      catalogue d'étoiles, sons de météo — <em>relativement à eux-mêmes</em> : ils fonctionnent donc
      depuis n'importe quel chemin, il suffit de garder ensemble les fichiers d'un même
      <i lang="en">bundle</i>.</p>
    <p>Plus rien ne dépend alors de ce site.</p>
  </div>
</section>
`
  }
}
