import { DocsSection } from "./DocsSection.js"
import type { PageMeta, Said, SiteLanguage } from "../SitePage.js"

/**
 * "I have a recording. How do I let somebody see it?"
 *
 * Two ways, and both are shown working rather than described: each carries a field already filled
 * with a real recording, so a reader can press the button before understanding anything, then
 * replace the URL with their own and press it again.
 */
export class DocsSharePage extends DocsSection {

  /** A real recording on this site, absolute so that anything copied out of the page works when
   * pasted anywhere. */
  private static readonly SAMPLE = "https://ufoathome.org/demo-data/witness-socorro.json"

  readonly meta: PageMeta = {
    slug: "docs/share",
    navLabel: { en: "Sharing an observation", fr: "Partager une observation" },
    title: { en: "Share an observation", fr: "Partager une observation" },
    description: {
      en: "Two ways to let somebody see a reconstruction: a link, or two lines on your own page. "
        + "Both with a working example you can try and copy.",
      fr: "Deux façons de faire voir une reconstitution : un lien, ou deux lignes sur votre propre "
        + "page. Les deux avec un exemple qui marche, à essayer et à copier."
    },
    modules: ["/lib/rr0-eyewitness.mjs"],
    asideFromNav: true
  }

  private readonly lede: Said<string> = {
    en: "Both start from the same thing: a recording, at a URL. Nothing is uploaded here and there "
      + "is no account — the file stays yours, wherever you keep it.",
    fr: "Les deux partent de la même chose : un enregistrement, à une URL. Rien n'est téléversé ici "
      + "et il n'y a pas de compte — le fichier reste le vôtre, où que vous le gardiez."
  }

  script(language: SiteLanguage): string {
    const fr = language === "fr"
    const messages = JSON.stringify({
      copy: fr ? "Copier" : "Copy",
      copied: fr ? "Copié" : "Copied",
      copyLink: fr ? "Copier le lien" : "Copy the link",
      copyCode: fr ? "Copier le code" : "Copy the code"
    })
    return `const messages = ${messages}
const player = ${JSON.stringify(fr ? "/player/" : "/player/")}

const linkField = document.getElementById("share-link-url")
const linkOut = document.getElementById("share-link-out")
const linkOpen = document.getElementById("share-link-open")
const linkCopy = document.getElementById("share-link-copy")

const embedField = document.getElementById("share-embed-url")
const embedCode = document.getElementById("share-embed-code")
const embedCopy = document.getElementById("share-embed-copy")
const embedTry = document.getElementById("share-embed-try")
const preview = document.getElementById("share-preview")

const playerLink = url => location.origin + player + "?sighting=" + encodeURIComponent(url)

const embedMarkup = url =>
  '<script type="module" src="' + location.origin + '/lib/rr0-eyewitness.mjs"><' + '/script>\\n' +
  '<rr0-eyewitness src="' + url + '"><' + '/rr0-eyewitness>'

/** Clipboard writes are refused in an insecure context and by some permission settings, so the
 * fallback selects the text instead of failing silently — the reader can then copy it themselves. */
const copyFrom = async (button, text, element, label) => {
  try {
    await navigator.clipboard.writeText(text)
    button.textContent = messages.copied
    setTimeout(() => (button.textContent = label), 1500)
  } catch {
    const range = document.createRange()
    range.selectNodeContents(element)
    const selection = getSelection()
    selection.removeAllRanges()
    selection.addRange(range)
  }
}

const refreshLink = () => {
  const url = linkField.value.trim()
  const href = playerLink(url)
  linkOut.textContent = href
  linkOpen.href = href
}
linkField.addEventListener("input", refreshLink)
linkCopy.addEventListener("click", () => copyFrom(linkCopy, linkOut.textContent, linkOut, messages.copyLink))
refreshLink()

const refreshEmbed = () => {
  embedCode.textContent = embedMarkup(embedField.value.trim())
}
embedField.addEventListener("input", refreshEmbed)
embedCopy.addEventListener("click", () => copyFrom(embedCopy, embedCode.textContent, embedCode, messages.copyCode))
// The preview is reloaded on request rather than on every keystroke: each load fetches a recording
// and builds a sky, and doing that per character typed would be rude to the reader's machine and
// to whoever is hosting the file.
embedTry.addEventListener("click", () => preview.setAttribute("src", embedField.value.trim()))
refreshEmbed()
preview.setAttribute("src", embedField.value.trim())`
  }

  render(language: SiteLanguage): string {
    return this.hero(language, this.meta.title, this.lede) + (language === "fr" ? this.fr() : this.en())
  }

  private en(): string {
    const sample = DocsSharePage.SAMPLE
    return `
<section class="band">
  <div class="wrap prose-wide">
    <h2>1. A link</h2>
    <p>The simplest of the two, and the only one that needs nothing at all of the place you are
      sending it to. Anybody who follows it sees the observation played in the real sky of the date
      and place it states, in their own language.</p>

    <div class="doc-try">
      <label for="share-link-url">The address of your recording</label>
      <input id="share-link-url" type="text" spellcheck="false" value="${sample}">
      <p class="doc-try-out"><code id="share-link-out"></code></p>
      <p class="doc-try-actions">
        <a class="btn btn-primary" id="share-link-open" href="/player/" target="_blank" rel="noopener">Try it</a>
        <button class="btn" type="button" id="share-link-copy">Copy the link</button>
      </p>
    </div>

    <p>Good for an email, a message, a comment, a forum that allows nothing but text — anywhere you
      can put a URL.</p>
  </div>
</section>

<section class="band">
  <div class="wrap prose-wide">
    <h2>2. On your own page</h2>
    <p>Two lines of HTML put the reconstruction itself in your page, the way a video goes in a page.
      No framework, and nothing for your site to build.</p>

    <div class="doc-try">
      <label for="share-embed-url">The address of your recording</label>
      <input id="share-embed-url" type="text" spellcheck="false" value="${sample}">
      <pre><code id="share-embed-code"></code></pre>
      <p class="doc-try-actions">
        <button class="btn btn-primary" type="button" id="share-embed-copy">Copy the code</button>
        <button class="btn" type="button" id="share-embed-try">Show the result</button>
      </p>
    </div>

    <p class="doc-try-label">The result:</p>
    <div class="stage stage-padded">
      <rr0-eyewitness id="share-preview"></rr0-eyewitness>
    </div>

    <p>That is a live element, not a picture — the same one those two lines would give you. Which of
      the four components to use instead, and everything they can be told, is on
      <a href="/docs/components/">the components page</a>.</p>
  </div>
</section>

<section class="band">
  <div class="wrap prose-wide">
    <h2>What a recording needs to be shareable</h2>
    <ul class="plain">
      <li><strong>A public address.</strong> Anything a browser can fetch. A file on your own disk
        has no URL that anybody else can follow.</li>
      <li><strong>Readable from another site.</strong> One
        <code>Access-Control-Allow-Origin: *</code> header on the JSON file. Most static hosts —
        GitHub Pages, Netlify, S3 — either send it already or let you add it in a line of
        configuration. If the file opens fine in a browser but the player says it could not be
        loaded, this is almost always why.</li>
    </ul>
    <p>Nowhere to put it yet? <a href="/player/">The player</a> also takes a recording pasted
      straight in, which is enough to check one before publishing it — though a pasted one cannot,
      of course, be shared by link.</p>
    <p>Don't have a recording at all? <a href="/docs/create/">Make one.</a></p>
  </div>
</section>
`
  }

  private fr(): string {
    const sample = DocsSharePage.SAMPLE
    return `
<section class="band">
  <div class="wrap prose-wide">
    <h2>1. Un lien</h2>
    <p>Le plus simple des deux, et le seul qui n'exige rien de l'endroit où vous l'envoyez. Qui le
      suit voit l'observation jouée sous le ciel réel de la date et du lieu qu'elle énonce, dans sa
      propre langue.</p>

    <div class="doc-try">
      <label for="share-link-url">L'adresse de votre enregistrement</label>
      <input id="share-link-url" type="text" spellcheck="false" value="${sample}">
      <p class="doc-try-out"><code id="share-link-out"></code></p>
      <p class="doc-try-actions">
        <a class="btn btn-primary" id="share-link-open" href="/player/" target="_blank" rel="noopener">Essayer</a>
        <button class="btn" type="button" id="share-link-copy">Copier le lien</button>
      </p>
    </div>

    <p>Bon pour un courriel, un message, un commentaire, un forum qui n'accepte que du texte —
      partout où l'on peut mettre une URL.</p>
  </div>
</section>

<section class="band">
  <div class="wrap prose-wide">
    <h2>2. Sur votre propre page</h2>
    <p>Deux lignes de HTML posent la reconstitution elle-même dans votre page, comme on y pose une
      vidéo. Aucun <i lang="en">framework</i>, et rien à construire pour votre site.</p>

    <div class="doc-try">
      <label for="share-embed-url">L'adresse de votre enregistrement</label>
      <input id="share-embed-url" type="text" spellcheck="false" value="${sample}">
      <pre><code id="share-embed-code"></code></pre>
      <p class="doc-try-actions">
        <button class="btn btn-primary" type="button" id="share-embed-copy">Copier le code</button>
        <button class="btn" type="button" id="share-embed-try">Voir le résultat</button>
      </p>
    </div>

    <p class="doc-try-label">Le résultat :</p>
    <div class="stage stage-padded">
      <rr0-eyewitness id="share-preview"></rr0-eyewitness>
    </div>

    <p>C'est un élément vivant, pas une image — celui-là même que ces deux lignes vous donneraient.
      Lequel des quatre composants employer à la place, et tout ce qu'on peut leur dire, est sur
      <a href="/docs/components/">la page des composants</a>.</p>
  </div>
</section>

<section class="band">
  <div class="wrap prose-wide">
    <h2>Ce qu'il faut à un enregistrement pour être partageable</h2>
    <ul class="plain">
      <li><strong>Une adresse publique.</strong> Tout ce qu'un navigateur peut aller chercher. Un
        fichier sur votre disque n'a pas d'URL que quelqu'un d'autre puisse suivre.</li>
      <li><strong>Lisible depuis un autre site.</strong> Un en-tête
        <code>Access-Control-Allow-Origin: *</code> sur le fichier JSON. La plupart des hébergements
        statiques — GitHub Pages, Netlify, S3 — l'envoient déjà ou permettent de l'ajouter en une
        ligne de configuration. Si le fichier s'ouvre bien dans un navigateur mais que le lecteur dit
        n'avoir pas pu le charger, c'est presque toujours cela.</li>
    </ul>
    <p>Nulle part où le poser encore ? <a href="/player/">Le lecteur</a> accepte aussi un
      enregistrement collé directement, ce qui suffit à en vérifier un avant de le publier — mais un
      enregistrement collé ne se partage évidemment pas par lien.</p>
    <p>Pas d'enregistrement du tout ? <a href="/docs/create/">Créez-en un.</a></p>
  </div>
</section>
`
  }
}
