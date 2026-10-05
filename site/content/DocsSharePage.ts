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
  private static readonly SAMPLE = "https://ufoathome.org/demo-data/observer-socorro.json"

  readonly meta: PageMeta = {
    slug: "docs/share",
    navLabel: {
      en: "Sharing an observation",
      fr: "Partager une observation",
      es: "Compartir una observación",
      it: "Condividere un'osservazione"
    },
    title: {
      en: "Share an observation",
      fr: "Partager une observation",
      es: "Compartir una observación",
      it: "Condividere un'osservazione"
    },
    description: {
      en: "Two ways to let somebody see a reconstruction: a link, or two lines on your own page. "
        + "Both with a working example you can try and copy.",
      fr: "Deux façons de faire voir une reconstitution : un lien, ou deux lignes sur votre propre "
        + "page. Les deux avec un exemple qui marche, à essayer et à copier.",
      es: "Dos maneras de mostrar una reconstrucción a alguien: un enlace, o dos líneas en tu propia "
        + "página. Ambas con un ejemplo que funciona, para probar y copiar.",
      it: "Due modi per far vedere una ricostruzione a qualcuno: un link, o due righe sulla tua "
        + "pagina. Entrambi con un esempio funzionante, da provare e copiare."
    },
    modules: ["/lib/rr0-sighting.mjs"],
    asideFromNav: true
  }

  private readonly lede: Said<string> = {
    en: "Both start from the same thing: a recording, at a URL. Nothing is uploaded here and there "
      + "is no account — the file stays yours, wherever you keep it.",
    fr: "Les deux partent de la même chose : un enregistrement, à une URL. Rien n'est téléversé ici "
      + "et il n'y a pas de compte — le fichier reste le vôtre, où que vous le gardiez.",
    es: "Las dos parten de lo mismo: una grabación, en una URL. Aquí no se sube nada y no hay "
      + "cuenta — el archivo sigue siendo tuyo, dondequiera que lo guardes.",
    it: "Entrambi partono dalla stessa cosa: una registrazione, a un URL. Qui non si carica nulla e "
      + "non c'è alcun account — il file resta tuo, ovunque tu lo tenga."
  }

  script(language: SiteLanguage): string {
    const said: Said<Record<string, string>> = {
      en: {
        copy: "Copy",
        copied: "Copied",
        copyLink: "Copy the link",
        copyCode: "Copy the code",
        notAnAddress: "That is not a valid address — it needs a full one, starting with https://"
      },
      fr: {
        copy: "Copier",
        copied: "Copié",
        copyLink: "Copier le lien",
        copyCode: "Copier le code",
        notAnAddress: "Ce n'est pas une adresse valide — il en faut une complète, commençant par https://"
      },
      es: {
        copy: "Copiar",
        copied: "Copiado",
        copyLink: "Copiar el enlace",
        copyCode: "Copiar el código",
        notAnAddress: "Esa no es una dirección válida — hace falta una completa, que empiece por https://"
      },
      it: {
        copy: "Copia",
        copied: "Copiato",
        copyLink: "Copia il link",
        copyCode: "Copia il codice",
        notAnAddress: "Questo non è un indirizzo valido — ne serve uno completo, che inizi con https://"
      }
    }
    const messages = JSON.stringify(said[language])
    return `const messages = ${messages}
const player = ${JSON.stringify("/play/")}

const linkField = document.getElementById("share-link-url")
const linkOut = document.getElementById("share-link-out")
const linkOpen = document.getElementById("share-link-open")
const linkCopy = document.getElementById("share-link-copy")

const embedField = document.getElementById("share-embed-url")
const embedCode = document.getElementById("share-embed-code")
const embedPre = document.getElementById("share-embed-pre")
const embedMount = document.getElementById("share-embed-view")
const embedCopy = document.getElementById("share-embed-copy")
const embedTry = document.getElementById("share-embed-try")
const preview = document.getElementById("share-preview")

const playerLink = url => location.origin + player + "?file=" + encodeURIComponent(url)

const embedMarkup = url =>
  '<script type="module" src="' + location.origin + '/lib/rr0-sighting.mjs"><' + '/script>\\n' +
  '<rr0-sighting src="' + url + '"><' + '/rr0-sighting>'

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

/**
 * Whether the field holds something that can actually be turned into a link.
 *
 * No backtick in here: this whole script is a template literal and one would end it. The field is
 * type="url", so the browser itself is the judge — both stricter and more forgiving than anything
 * worth writing here. Empty counts as invalid too: the field is not required, so the browser calls
 * it valid, but there is still nothing to compose.
 */
const addressOf = field => {
  const value = field.value.trim()
  const valid = value !== "" && field.checkValidity()
  field.setAttribute("aria-invalid", String(!valid))
  return valid ? value : undefined
}

const refreshLink = () => {
  const url = addressOf(linkField)
  linkOut.classList.toggle("is-invalid", !url)
  linkOut.textContent = url ? playerLink(url) : messages.notAnAddress
  // A link that cannot be built is not offered: an anchor to a half-composed URL would open a
  // player on nothing, and a copy button would put nonsense in the clipboard.
  linkOpen.href = url ? playerLink(url) : "#"
  linkOpen.toggleAttribute("aria-disabled", !url)
  linkCopy.disabled = !url
}
linkField.addEventListener("input", refreshLink)
linkCopy.addEventListener("click", () => copyFrom(linkCopy, linkOut.textContent, linkOut, messages.copyLink))
refreshLink()

/* Set once the read-only CodeMirror below has arrived; until then the plain <pre> IS the snippet,
   so a reader with a slow connection or a blocked module still sees the code. */
let embedView

const refreshEmbed = () => {
  const url = addressOf(embedField)
  const code = url ? embedMarkup(url) : messages.notAnAddress
  embedCode.classList.toggle("is-invalid", !url)
  embedCode.textContent = code
  if (embedView) embedView.value = code
  embedCopy.disabled = !url
  embedTry.disabled = !url
}
embedField.addEventListener("input", refreshEmbed)
// The preview is reloaded on request rather than on every keystroke: each load fetches a recording
// and builds a sky, and doing that per character typed would be rude to the reader's machine and
// to whoever is hosting the file.
embedTry.addEventListener("click", () => {
  const url = addressOf(embedField)
  if (url) preview.setAttribute("src", url)
})
refreshEmbed()
preview.setAttribute("src", embedField.value.trim())

/* Highlighting is worth having and worth nothing to wait for, so the snippet is plain text first
   and coloured a moment later. CodeMirror is heavier than the three lines it draws; deferring it
   keeps that weight off the page's first paint, which the live preview below already spends. */
void (async () => {
  try {
    const { HtmlView } = await import(SITE_LIB + "/site-html-view.mjs")
    embedView = new HtmlView(embedMount, embedCode.textContent)
    embedPre.hidden = true
  } catch {
    /* No highlighting, then. The <pre> is still there and still says the same thing. */
  }
})()

/* The copy button reads the string the page composed, never the view showing it: CodeMirror wraps
   long lines, and a reader copying from the rendering would get the wrap as a newline. */
embedCopy.addEventListener("click", () => copyFrom(embedCopy, embedMarkup(embedField.value.trim()), embedCode, messages.copyCode))`
  }

  render(language: SiteLanguage): string {
    return this.hero(language, this.meta.title, this.lede) + ({ en: () => this.en(), fr: () => this.fr(), es: () => this.es(), it: () => this.it() })[language]()
  }

  private en(): string {
    const sample = DocsSharePage.SAMPLE
    return `
<section class="band">
  <div class="wrap prose-wide">
    <h2>1. A link to ufoathome's player</h2>
    <p>The simplest of the two, and the only one that needs nothing at all of the place you are
      sending it to. Anybody who follows it sees the observation played in the real sky of the date
      and place it states, in their own language.</p>

    <div class="doc-try">
      <label for="share-link-url">The address of your recording</label>
      <input id="share-link-url" type="url" spellcheck="false" value="${sample}"
             placeholder="https://yoursite.org/my-case/sighting.json">
      <p class="doc-try-out"><code id="share-link-out"></code></p>
      <p class="doc-try-actions">
        <a class="btn btn-primary" id="share-link-open" href="/play/" target="_blank" rel="noopener">Try it</a>
        <button class="btn" type="button" id="share-link-copy">Copy the link</button>
      </p>
    </div>

    <p>Good for an email, a message, a comment, a forum that allows nothing but text — anywhere you
      can put a URL. The field above starts on one of this site's own recordings so the button does
      something; the address you put there is your own, on your own host, and this site never needs
      a copy of it.</p>
  </div>
</section>

<section class="band">
  <div class="wrap prose-wide">
    <h2>2. On your own page</h2>
    <p>Two lines of HTML put the reconstruction itself in your page, the way a video goes in a page.
      No framework, and nothing for your site to build.</p>

    <div class="doc-try">
      <label for="share-embed-url">The address of your recording</label>
      <input id="share-embed-url" type="url" spellcheck="false" value="${sample}"
             placeholder="https://yoursite.org/my-case/sighting.json">
      <pre id="share-embed-pre"><code id="share-embed-code"></code></pre>
      <div id="share-embed-view" class="code-view"></div>
      <p class="doc-try-actions">
        <button class="btn btn-primary" type="button" id="share-embed-copy">Copy the code</button>
        <button class="btn" type="button" id="share-embed-try">Show the result</button>
      </p>
    </div>

    <p class="doc-try-label">The result:</p>
    <div class="stage stage-padded">
      <rr0-sighting id="share-preview"></rr0-sighting>
    </div>

    <p>That is a live element, not a picture — the same one those two lines would give you. Which of
      the three components to use instead, and everything they can be told, is on
      <a href="/docs/components/">the components page</a>.</p>
    <p class="small">The script's address has no version in it, so your page follows each release
      without being edited: browsers ask on every visit whether it changed, and the answer costs
      nothing while it has not.</p>
  </div>
</section>

<section class="band">
  <div class="wrap prose-wide">
    <h2>What a recording needs to be shareable</h2>
    <p><strong>One thing: a public address.</strong> Anywhere a browser can fetch it from — a static
      site, a file host, a repository's pages. A file on your own disk has no URL anybody else can
      follow, and that is the only real requirement.</p>
    <p class="small">If the address is public, opens fine in your own browser, and the player still
      says it could not be read, the cause is almost always the same one: the server is not telling
      browsers that other sites may read the file. The remedy is one response header,
      <code>Access-Control-Allow-Origin: *</code>, on the JSON. Most static hosts — GitHub Pages,
      Netlify, S3 — either send it already or let you add it in a line of configuration; if the
      server is not yours, that is the single thing to ask its administrator for. The player and
      the editor both say so when they detect it, so you should not have to guess.</p>
    <p>Nowhere to put it yet? <a href="/edit/">The editor</a> also takes a recording pasted
      straight in, which is enough to check one before publishing it — though a pasted one cannot,
      of course, be shared by link.</p>
    <p>Don't have a recording at all? <a href="/docs/create/">Make one</a>; what goes in the file
      is described on <a href="/docs/format/">the sighting file</a>'s page.</p>
  </div>
</section>
`
  }

  private fr(): string {
    const sample = DocsSharePage.SAMPLE
    return `
<section class="band">
  <div class="wrap prose-wide">
    <h2>1. Un lien vers le lecteur d'ufoathome</h2>
    <p>Le plus simple des deux, et le seul qui n'exige rien de l'endroit où vous l'envoyez. Qui le
      suit voit l'observation jouée sous le ciel réel de la date et du lieu qu'elle énonce, dans sa
      propre langue.</p>

    <div class="doc-try">
      <label for="share-link-url">L'adresse de votre enregistrement</label>
      <input id="share-link-url" type="url" spellcheck="false" value="${sample}"
             placeholder="https://votresite.org/mon-dossier/sighting.json">
      <p class="doc-try-out"><code id="share-link-out"></code></p>
      <p class="doc-try-actions">
        <a class="btn btn-primary" id="share-link-open" href="/play/" target="_blank" rel="noopener">Essayer</a>
        <button class="btn" type="button" id="share-link-copy">Copier le lien</button>
      </p>
    </div>

    <p>Bon pour un courriel, un message, un commentaire, un forum qui n'accepte que du texte —
      partout où l'on peut mettre une URL. Le champ ci-dessus part d'un enregistrement de ce site
      pour que le bouton fasse quelque chose ; l'adresse que vous y mettez est la vôtre, sur votre
      hébergement, et ce site n'en a jamais besoin d'une copie.</p>
  </div>
</section>

<section class="band">
  <div class="wrap prose-wide">
    <h2>2. Dans votre propre page</h2>
    <p>Deux lignes de HTML posent la reconstitution elle-même dans votre page, comme on y pose une
      vidéo. Aucun <i lang="en">framework</i>, et rien à construire pour votre site.</p>

    <div class="doc-try">
      <label for="share-embed-url">L'adresse de votre enregistrement</label>
      <input id="share-embed-url" type="url" spellcheck="false" value="${sample}"
             placeholder="https://votresite.org/mon-dossier/sighting.json">
      <pre id="share-embed-pre"><code id="share-embed-code"></code></pre>
      <div id="share-embed-view" class="code-view"></div>
      <p class="doc-try-actions">
        <button class="btn btn-primary" type="button" id="share-embed-copy">Copier le code</button>
        <button class="btn" type="button" id="share-embed-try">Voir le résultat</button>
      </p>
    </div>

    <p class="doc-try-label">Le résultat :</p>
    <div class="stage stage-padded">
      <rr0-sighting id="share-preview"></rr0-sighting>
    </div>

    <p>C'est un élément vivant, pas une image — celui-là même que ces deux lignes vous donneraient.
      Lequel des trois composants employer à la place, et tout ce qu'on peut leur dire, est sur
      <a href="/docs/components/">la page des composants</a>.</p>
    <p class="small">L'adresse du script ne porte pas de version : votre page suit donc chaque
      version sans être modifiée. Les navigateurs demandent à chaque visite s'il a changé, et la
      réponse ne coûte rien tant qu'il n'a pas changé.</p>
  </div>
</section>

<section class="band">
  <div class="wrap prose-wide">
    <h2>Ce qu'il faut à un enregistrement pour être partageable</h2>
    <p><strong>Une chose : une adresse publique.</strong> N'importe où un navigateur peut aller la
      chercher — un site statique, un hébergeur de fichiers, les pages d'un dépôt. Un fichier sur
      votre disque n'a pas d'URL que quelqu'un d'autre puisse suivre, et c'est là la seule vraie
      exigence.</p>
    <p class="small">Si l'adresse est publique, s'ouvre bien dans votre propre navigateur, et que le
      lecteur dit malgré tout n'avoir pas pu la lire, la cause est presque toujours la même : le
      serveur ne dit pas aux navigateurs que d'autres sites ont le droit de lire le fichier. Le
      remède est un en-tête de réponse, <code>Access-Control-Allow-Origin: *</code>, sur le JSON. La
      plupart des hébergements statiques — GitHub Pages, Netlify, S3 — l'envoient déjà ou permettent
      de l'ajouter en une ligne de configuration ; si le serveur n'est pas le vôtre, c'est la seule
      chose à demander à son administrateur. Le lecteur et l'éditeur le disent quand ils le
      détectent, vous ne devriez donc pas avoir à le deviner.</p>
    <p>Nulle part où le poser encore ? <a href="/edit/">L'éditeur</a> accepte aussi un
      enregistrement collé directement, ce qui suffit à en vérifier un avant de le publier — mais un
      enregistrement collé ne se partage évidemment pas par lien.</p>
    <p>Pas d'enregistrement du tout ? <a href="/docs/create/">Créez-en un</a> ; ce que contient le
      fichier est décrit sur la page du <a href="/docs/format/">fichier d'observation</a>.</p>
  </div>
</section>
`
  }

  private es(): string {
    const sample = DocsSharePage.SAMPLE
    return `
<section class="band">
  <div class="wrap prose-wide">
    <h2>1. Un enlace al reproductor de ufoathome</h2>
    <p>La más sencilla de las dos, y la única que no exige nada del lugar al que lo envías. Quien lo
      siga verá la observación reproducida bajo el cielo real de la fecha y el lugar que indica, en
      su propio idioma.</p>

    <div class="doc-try">
      <label for="share-link-url">La dirección de tu grabación</label>
      <input id="share-link-url" type="url" spellcheck="false" value="${sample}"
             placeholder="https://tusitio.org/mi-caso/sighting.json">
      <p class="doc-try-out"><code id="share-link-out"></code></p>
      <p class="doc-try-actions">
        <a class="btn btn-primary" id="share-link-open" href="/play/" target="_blank" rel="noopener">Probar</a>
        <button class="btn" type="button" id="share-link-copy">Copiar el enlace</button>
      </p>
    </div>

    <p>Sirve para un correo, un mensaje, un comentario, un foro que solo admite texto — en cualquier
      sitio donde se pueda poner una URL. El campo de arriba empieza con una de las grabaciones de
      este sitio para que el botón haga algo; la dirección que pongas ahí es la tuya, en tu propio
      alojamiento, y este sitio nunca necesita una copia.</p>
  </div>
</section>

<section class="band">
  <div class="wrap prose-wide">
    <h2>2. En tu propia página</h2>
    <p>Dos líneas de HTML ponen la reconstrucción misma en tu página, igual que se pone un vídeo.
      Sin <i lang="en">framework</i>, y nada que construir para tu sitio.</p>

    <div class="doc-try">
      <label for="share-embed-url">La dirección de tu grabación</label>
      <input id="share-embed-url" type="url" spellcheck="false" value="${sample}"
             placeholder="https://tusitio.org/mi-caso/sighting.json">
      <pre id="share-embed-pre"><code id="share-embed-code"></code></pre>
      <div id="share-embed-view" class="code-view"></div>
      <p class="doc-try-actions">
        <button class="btn btn-primary" type="button" id="share-embed-copy">Copiar el código</button>
        <button class="btn" type="button" id="share-embed-try">Ver el resultado</button>
      </p>
    </div>

    <p class="doc-try-label">El resultado:</p>
    <div class="stage stage-padded">
      <rr0-sighting id="share-preview"></rr0-sighting>
    </div>

    <p>Es un elemento vivo, no una imagen — el mismo que te darían esas dos líneas. Cuál de los tres
      componentes usar en su lugar, y todo lo que se les puede indicar, está en
      <a href="/docs/components/">la página de los componentes</a>.</p>
    <p class="small">La dirección del script no lleva versión, así que tu página sigue cada versión
      sin que haya que editarla: los navegadores preguntan en cada visita si ha cambiado, y la
      respuesta no cuesta nada mientras no haya cambiado.</p>
  </div>
</section>

<section class="band">
  <div class="wrap prose-wide">
    <h2>Lo que necesita una grabación para poder compartirse</h2>
    <p><strong>Una cosa: una dirección pública.</strong> Cualquier lugar desde el que un navegador
      pueda obtenerla — un sitio estático, un alojamiento de archivos, las páginas de un repositorio.
      Un archivo en tu propio disco no tiene una URL que otra persona pueda seguir, y ese es el único
      requisito real.</p>
    <p class="small">Si la dirección es pública, se abre bien en tu propio navegador, y aun así el
      reproductor dice que no pudo leerla, la causa es casi siempre la misma: el servidor no les dice
      a los navegadores que otros sitios pueden leer el archivo. El remedio es una cabecera de
      respuesta, <code>Access-Control-Allow-Origin: *</code>, en el JSON. La mayoría de los
      alojamientos estáticos — GitHub Pages, Netlify, S3 — ya la envían o permiten añadirla con una
      línea de configuración; si el servidor no es tuyo, eso es lo único que hay que pedirle a su
      administrador. El reproductor y el editor lo indican cuando lo detectan, así que no deberías
      tener que adivinarlo.</p>
    <p>¿Todavía no tienes dónde ponerla? <a href="/edit/">El editor</a> también acepta una
      grabación pegada directamente, lo que basta para comprobarla antes de publicarla — aunque una
      grabación pegada, claro está, no se puede compartir por enlace.</p>
    <p>¿No tienes ninguna grabación? <a href="/docs/create/">Crea una</a>; lo que contiene el archivo
      se describe en la página del <a href="/docs/format/">archivo de avistamiento</a>.</p>
  </div>
</section>
`
  }

  private it(): string {
    const sample = DocsSharePage.SAMPLE
    return `
<section class="band">
  <div class="wrap prose-wide">
    <h2>1. Un link al lettore di ufoathome</h2>
    <p>Il più semplice dei due, e l'unico che non richiede nulla al luogo in cui lo invii. Chi lo
      segue vede l'osservazione riprodotta sotto il cielo reale della data e del luogo che indica,
      nella propria lingua.</p>

    <div class="doc-try">
      <label for="share-link-url">L'indirizzo della tua registrazione</label>
      <input id="share-link-url" type="url" spellcheck="false" value="${sample}"
             placeholder="https://tuosito.org/mio-caso/sighting.json">
      <p class="doc-try-out"><code id="share-link-out"></code></p>
      <p class="doc-try-actions">
        <a class="btn btn-primary" id="share-link-open" href="/play/" target="_blank" rel="noopener">Provalo</a>
        <button class="btn" type="button" id="share-link-copy">Copia il link</button>
      </p>
    </div>

    <p>Va bene per un'email, un messaggio, un commento, un forum che accetta solo testo — ovunque si
      possa mettere un URL. Il campo qui sopra parte da una delle registrazioni di questo sito perché
      il pulsante faccia qualcosa; l'indirizzo che ci metti è il tuo, sul tuo hosting, e a
      questo sito non serve mai una copia.</p>
  </div>
</section>

<section class="band">
  <div class="wrap prose-wide">
    <h2>2. Nella tua pagina</h2>
    <p>Due righe di HTML mettono la ricostruzione stessa nella tua pagina, come si mette un video.
      Nessun <i lang="en">framework</i>, e niente da compilare per il tuo sito.</p>

    <div class="doc-try">
      <label for="share-embed-url">L'indirizzo della tua registrazione</label>
      <input id="share-embed-url" type="url" spellcheck="false" value="${sample}"
             placeholder="https://tuosito.org/mio-caso/sighting.json">
      <pre id="share-embed-pre"><code id="share-embed-code"></code></pre>
      <div id="share-embed-view" class="code-view"></div>
      <p class="doc-try-actions">
        <button class="btn btn-primary" type="button" id="share-embed-copy">Copia il codice</button>
        <button class="btn" type="button" id="share-embed-try">Mostra il risultato</button>
      </p>
    </div>

    <p class="doc-try-label">Il risultato:</p>
    <div class="stage stage-padded">
      <rr0-sighting id="share-preview"></rr0-sighting>
    </div>

    <p>È un elemento vivo, non un'immagine — lo stesso che ti darebbero quelle due righe. Quale dei
      tre componenti usare invece, e tutto ciò che si può indicare loro, è nella
      <a href="/docs/components/">pagina dei componenti</a>.</p>
    <p class="small">L'indirizzo dello script non contiene una versione, quindi la tua pagina
      segue ogni rilascio senza essere modificata: i browser chiedono a ogni visita se è cambiato, e
      la risposta non costa nulla finché non è cambiato.</p>
  </div>
</section>

<section class="band">
  <div class="wrap prose-wide">
    <h2>Che cosa serve a una registrazione per essere condivisibile</h2>
    <p><strong>Una cosa: un indirizzo pubblico.</strong> Qualunque posto da cui un browser possa
      prenderla — un sito statico, un servizio di hosting di file, le pagine di un repository. Un file
      sul tuo disco non ha un URL che qualcun altro possa seguire, ed è questo l'unico vero
      requisito.</p>
    <p class="small">Se l'indirizzo è pubblico, si apre bene nel tuo browser, e il lettore dice
      comunque di non essere riuscito a leggerlo, la causa è quasi sempre la stessa: il server non
      dice ai browser che altri siti possono leggere il file. Il rimedio è un'intestazione di
      risposta, <code>Access-Control-Allow-Origin: *</code>, sul JSON. La maggior parte degli hosting
      statici — GitHub Pages, Netlify, S3 — la inviano già o permettono di aggiungerla con una riga di
      configurazione; se il server non è tuo, è l'unica cosa da chiedere al suo amministratore. Il
      lettore e l'editor lo segnalano quando lo rilevano, quindi non dovresti doverlo indovinare.</p>
    <p>Non hai ancora dove metterla? <a href="/edit/">L'editor</a> accetta anche una
      registrazione incollata direttamente, il che basta per verificarla prima di pubblicarla — anche
      se una registrazione incollata, ovviamente, non si può condividere tramite link.</p>
    <p>Non hai nessuna registrazione? <a href="/docs/create/">Creane una</a>; che cosa contiene
      il file è descritto nella pagina del <a href="/docs/format/">file di avvistamento</a>.</p>
  </div>
</section>
`
  }
}
