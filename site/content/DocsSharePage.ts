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
      en: "Three ways to let somebody see a reconstruction: a link, two lines on your own page, or a video file, "
        + "with a kit to make it realistic with a video generator. The first two with a working example you can try and copy.",
      fr: "Trois façons de faire voir une reconstitution : un lien, deux lignes sur votre propre page, ou un fichier "
        + "vidéo, avec un kit pour la rendre réaliste avec un générateur vidéo. Les deux premières avec un exemple qui marche, à essayer et à copier.",
      es: "Tres maneras de mostrar una reconstrucción a alguien: un enlace, dos líneas en tu propia página, o un archivo "
        + "de vídeo, con un kit para hacerla realista con un generador de vídeo. Las dos primeras con un ejemplo que funciona, para probar y copiar.",
      it: "Tre modi per far vedere una ricostruzione a qualcuno: un link, due righe sulla tua pagina, o un file "
        + "video, con un kit per renderla realistica con un generatore video. I primi due con un esempio funzionante, da provare e copiare."
    },
    modules: ["/lib/rr0-sighting.mjs"],
    asideFromNav: true
  }

  private readonly lede: Said<string> = {
    en: "The first two start from the same thing: a recording, at a URL; the third, from the player itself. Nothing is uploaded here and there "
      + "is no account — the file stays yours, wherever you keep it.",
    fr: "Les deux premières partent de la même chose : un enregistrement, à une URL ; la troisième, du lecteur lui-même. Rien n'est téléversé ici "
      + "et il n'y a pas de compte — le fichier reste le vôtre, où que vous le gardiez.",
    es: "Las dos primeras parten de lo mismo: una grabación, en una URL; la tercera, del propio reproductor. Aquí no se sube nada y no hay "
      + "cuenta — el archivo sigue siendo tuyo, dondequiera que lo guardes.",
    it: "I primi due partono dalla stessa cosa: una registrazione, a un URL; il terzo, dal lettore stesso. Qui non si carica nulla e "
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

/* How it opens, from the options block: the same words the player's Share button writes. */
const option = id => document.getElementById("share-opt-" + id)
const startSeconds = () => {
  const seconds = Math.floor(Number(option("start").value))
  return option("start-on").checked && Number.isFinite(seconds) && seconds >= 0 ? seconds : undefined
}
const query = () => {
  const parts = []
  if (startSeconds() !== undefined) parts.push("t=" + startSeconds())
  if (!option("labels").checked) parts.push("labels=0")
  if (option("map").checked) parts.push("map=1")
  if (!option("moments").checked) parts.push("moments=0")
  if (option("compare").checked) parts.push("compare=1")
  return parts.length ? "&" + parts.join("&") : ""
}
const attributes = () => {
  let text = ""
  if (startSeconds() !== undefined) text += ' start-time="' + startSeconds() + '"'
  if (option("labels").checked) text += " show-labels"
  if (option("map").checked) text += " show-observer-map"
  if (!option("moments").checked) text += " hide-milestones"
  if (option("compare").checked) text += " compare-account"
  return text
}

const playerLink = url => location.origin + player + "?file=" + encodeURIComponent(url) + query()

const embedMarkup = url =>
  '<script type="module" src="' + location.origin + '/lib/rr0-sighting.mjs"><' + '/script>\\n' +
  '<rr0-sighting src="' + url + '"' + attributes() + '><' + '/rr0-sighting>'

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
for (const id of ["start-on", "start", "labels", "map", "moments", "compare"]) {
  option(id).addEventListener("input", () => {
    refreshLink()
    refreshEmbed()
  })
}
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
    <h2>How it opens</h2>
    <p>The player's <strong>Share</strong> button gives the same two things as this page, on one screen: the <strong>Link</strong> or the <strong>Embed</strong> code of the player. The editor shares itself, with the <strong>Share</strong> button of its own header: the link or the code of the editor opened on the same file, or on the same case. The options below are those it offers, each starting as the player is at that moment; they apply to the link and to the code of the sections that follow.</p>
    <fieldset class="doc-options">
      <label class="doc-option-start"><input id="share-opt-start-on" type="checkbox"> Start at
        <input id="share-opt-start" type="number" min="0" step="1" value="0" aria-label="Start at"> s</label>
      <label><input id="share-opt-labels" type="checkbox" checked> Show summary chips</label>
      <label><input id="share-opt-map" type="checkbox"> Open map</label>
      <label><input id="share-opt-moments" type="checkbox" checked> Show moments</label>
      <label><input id="share-opt-compare" type="checkbox"> Compare account</label>
    </fieldset>
    <h3>What each one writes</h3>
    <div class="table-scroll"><table>
      <tr><th>Option</th><th>In the address</th><th>On the element</th></tr>
      <tr><td>Start <code>n</code> seconds in (or <code>1:30</code>, <code>1m30s</code>, <code>PT1M30S</code>)</td><td><code>d=n</code></td><td><code>start-time="n"</code></td></tr>
      <tr><td>Start at a time said during the observation (<code>02:33:15</code>, or <code>2026-08-11T02:33:15</code>)</td><td><code>t=02:33:15</code></td><td><code>start-clock="02:33:15"</code></td></tr>
      <tr><td>Show summary chips</td><td>nothing — they are on; <code>labels=0</code> hides them</td><td><code>show-labels</code></td></tr>
      <tr><td>Open map</td><td><code>map=1</code></td><td><code>show-observer-map</code></td></tr>
      <tr><td>Show moments</td><td><code>moments=0</code> hides them</td><td><code>hide-milestones</code> when off</td></tr>
      <tr><td>Compare account</td><td><code>compare=1</code></td><td><code>compare-account</code></td></tr>
      <tr><td>Open a case on one of its recordings</td><td><code>observer=ObserverId</code> (or a file name, or its number in the list)</td><td><code>observer="ObserverId"</code></td></tr>
      </table></div>
    <p class="small">The summary chips are the strip of what the recording states, under the picture: the date said in words with its weekday, the position, the witness, the weather, and a <q>Description</q> chip showing the first words of the account, which opens the whole text in place of the chips (a cross puts them back). The player's own page shows them unless <code>labels=0</code>; the element itself shows them only with <code>show-labels</code>. The editor's own sharing takes none of these options: it gives the file at its address, and says so when changes are not saved yet.</p>
  </div>
</section>
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
    <p>Where the link is shown as a card (a social network, a messaging app, a forum that unfolds
      links), the card can say more than the project's logo. The server reads your file when the link is
      fetched: the card shows the observation's name, its <code>image</code> (an address, absolute or relative to the
      file) and its <code>summary</code> (a sentence or two, as a plain string or one per language). Without a
      <code>summary</code>, the card says who saw it, in which case and when, as far as the file and its address
      tell; without an <code>image</code>, it shows the logo. A case file takes the same two fields. <code>summaryTime</code> (seconds) tells the project's capture tool which instant of the simulation to photograph for the <code>image</code>, when the first one does not show the phenomenon.</p>
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
      <a href="/docs/format/#components">the components page</a>.</p>
    <p class="small">The script's address has no version in it, so your page follows each release
      without being edited: browsers ask on every visit whether it changed, and the answer costs
      nothing while it has not.</p>
    <p class="small">To keep the rendering you checked instead, tick <strong>Pin version</strong>
      in the share dialog: the script then comes from the package as published on npm, served by
      jsDelivr, which keeps every version:
      <code>https://cdn.jsdelivr.net/npm/@rr0/ufoathome@<var>version</var>/dist-embed-sighting/rr0-sighting.mjs</code>. Your page then gets none of the later fixes, but it reads recordings written
      for later versions as long as their format has not changed (see
      <a href="/docs/format/">the format's versions</a>). The box pins the link too: it then ends
      with <code>&amp;v=<var>version</var></code>, and the page it opens, today's, loads that version's
      player or editor from the same place.</p>
  </div>
</section>

<section class="band">
  <div class="wrap prose-wide">
    <h2>3. As a video file</h2>
    <p>The player's <strong>Record a video of the observation</strong> button (the camera, among its controls) makes an MP4 of the
      reconstruction, with its sound, to send or publish wherever a video goes. It opens what the video is made with:</p>
    <ul>
      <li><strong>Size</strong>: as on screen, or 720, 1080 or 2160 lines, in the picture's proportions;</li>
      <li><strong>Caption</strong>, <strong>Time</strong>, <strong>Map</strong>: what of the player's words and map is written over the picture;</li>
      <li><strong>Start</strong> and <strong>End</strong>: the part of the observation filmed, as the counter reads it (<strong>Here</strong> takes where the playback stands); the whole of it by default.</li>
    </ul>
    <p><strong>Record</strong> makes it. Each frame is drawn and waited for, however long it takes, so the video runs at 30 frames a second
      whatever the machine, and the same recording always makes the same video; the button shows how far it has got, and a click on it
      stops it. Nothing leaves your browser. The file says what it is: a faint logo in a corner, and in its metadata the observation, the
      address of the recording and the words <em>a simulation, not a recording of the observation</em>. Only in browsers that can encode
      video (WebCodecs): elsewhere the button is not shown.</p>
    <h3>A kit for a video generator</h3>
    <p>The same panel's <strong>Generative AI kit</strong> button makes, from the same size, start and end, a zip for making a realistic
      version of the reconstruction with a video generator of your choosing (Runway, Kling, Luma, Veo…), on your own account, without
      letting it invent the testimony:</p>
    <ul>
      <li><code>reference.mp4</code>: the video, with its sound, and nothing written over it (no caption, map, logo or photograph of the place: a generator would redraw them as part of the scene);</li>
      <li><code>depth.mp4</code>: how far each pixel is, white near, black far and for the sky, on one logarithmic scale from 1 m to 20 km;</li>
      <li><code>phenomenon-mask.mp4</code>, <code>sky-mask.mp4</code>: in white, where the phenomenon stands, and the sky;</li>
      <li><code>first-frame.png</code>, for generators that start from an image;</li>
      <li><code>prompt.txt</code>: a prompt and a negative prompt written from the recording's own statements only (place, time, the phenomenon as drawn, what happens, the weather), never from the testimony's text, every word of which a generator would draw;</li>
      <li>instructions in your language, and <code>manifest.json</code>, the provenance.</li>
    </ul>
    <p>The reference video guides the generator: its geometry, horizon, framing and motion are to be kept, only the textures made
      photographic. The phenomenon is rendered by the generator like the rest, so that it has the same grain, blur and light. The mask is
      what the result is <strong>checked</strong> against: a video whose phenomenon leaves it, changes shape, size, colour or motion, or
      gains details (portholes, lights, reflections) is rejected. It is never pasted back over the result, which would look stuck on.</p>
    <p class="small">A generated video is a reconstruction, not evidence. Burn into the whole picture that it is generated, cite the
      recording, and never show it to a witness before interviewing them: a realistic picture can change what they remember.</p>
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
    <h2>Comment elle s'ouvre</h2>
    <p>Le bouton <strong>Partager</strong> du lecteur donne les mêmes deux choses que cette page, sur un seul écran : le <strong>lien</strong> ou le code d'<strong>intégration</strong> du lecteur. L'éditeur se partage lui-même, avec le bouton <strong>Partager</strong> de son propre en-tête : le lien ou le code de l'éditeur ouvert sur le même fichier, ou sur le même dossier. Les options ci-dessous sont celles qu'il propose, chacune partant de l'état du lecteur à cet instant ; elles s'appliquent au lien et au code des sections suivantes.</p>
    <fieldset class="doc-options">
      <label class="doc-option-start"><input id="share-opt-start-on" type="checkbox"> Commencer à
        <input id="share-opt-start" type="number" min="0" step="1" value="0" aria-label="Commencer à"> s</label>
      <label><input id="share-opt-labels" type="checkbox" checked> Afficher les chips</label>
      <label><input id="share-opt-map" type="checkbox"> Ouvrir la carte</label>
      <label><input id="share-opt-moments" type="checkbox" checked> Afficher les moments</label>
      <label><input id="share-opt-compare" type="checkbox"> Comparer au compte rendu</label>
    </fieldset>
    <h3>Ce que chacune écrit</h3>
    <div class="table-scroll"><table>
      <tr><th>Option</th><th>Dans l'adresse</th><th>Sur l'élément</th></tr>
      <tr><td>Commencer <code>n</code> secondes après le début (ou <code>1:30</code>, <code>1m30s</code>, <code>PT1M30S</code>)</td><td><code>d=n</code></td><td><code>start-time="n"</code></td></tr>
      <tr><td>Commencer à une heure dite pendant l'observation (<code>02:33:15</code>, ou <code>2026-08-11T02:33:15</code>)</td><td><code>t=02:33:15</code></td><td><code>start-clock="02:33:15"</code></td></tr>
      <tr><td>Afficher les chips</td><td>rien — ils sont affichés ; <code>labels=0</code> les masque</td><td><code>show-labels</code></td></tr>
      <tr><td>Ouvrir la carte</td><td><code>map=1</code></td><td><code>show-observer-map</code></td></tr>
      <tr><td>Afficher les moments</td><td><code>moments=0</code> les masque</td><td><code>hide-milestones</code> quand décoché</td></tr>
      <tr><td>Comparer au compte rendu</td><td><code>compare=1</code></td><td><code>compare-account</code></td></tr>
      <tr><td>Ouvrir un dossier sur l'un de ses enregistrements</td><td><code>observer=IdObservateur</code> (ou un nom de fichier, ou son rang dans la liste)</td><td><code>observer="IdObservateur"</code></td></tr>
      </table></div>
    <p class="small">Les chips de résumé sont le bandeau de ce que l'enregistrement énonce, sous l'image : la date dite en toutes lettres avec son jour de la semaine, la position, le témoin, la météo, et un chip <q>Description</q> qui montre les premiers mots du récit et ouvre le texte entier à la place des chips (une croix les rend). La page du lecteur les affiche sauf avec <code>labels=0</code> ; l'élément lui-même ne les affiche qu'avec <code>show-labels</code>. Le partage de l'éditeur ne prend aucune de ces options : il donne le fichier à son adresse, et le dit quand des modifications ne sont pas encore enregistrées.</p>
  </div>
</section>
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
    <p>Là où le lien s'affiche en carte (réseau social, messagerie, forum qui déplie les liens), la
      carte peut en dire plus que le logo du projet. Le serveur lit votre fichier quand le lien est consulté :
      la carte montre le nom de l'observation, son <code>image</code> (une adresse, absolue ou relative au
      fichier) et son <code>summary</code> (une phrase ou deux, en simple texte ou une par langue). Sans
      <code>summary</code>, la carte dit qui l'a vue, dans quel dossier et quand, autant que le fichier et son
      adresse le disent ; sans <code>image</code>, elle montre le logo. Un fichier de dossier prend les deux mêmes champs. <code>summaryTime</code> (secondes) dit à l'outil de capture du projet quel instant de la simulation photographier pour l'<code>image</code>, quand le premier ne montre pas le phénomène.</p>
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
      <a href="/docs/format/#components">la page des composants</a>.</p>
    <p class="small">L'adresse du script ne porte pas de version : votre page suit donc chaque
      version sans être modifiée. Les navigateurs demandent à chaque visite s'il a changé, et la
      réponse ne coûte rien tant qu'il n'a pas changé.</p>
    <p class="small">Pour garder plutôt le rendu que vous avez vérifié, cochez <strong>Épingler la
      version</strong> dans la boîte de partage : le script vient alors du paquet publié sur npm,
      servi par jsDelivr, qui garde toutes les versions :
      <code>https://cdn.jsdelivr.net/npm/@rr0/ufoathome@<var>version</var>/dist-embed-sighting/rr0-sighting.mjs</code>. Votre page ne reçoit plus les corrections ultérieures, mais lit les
      enregistrements écrits pour des versions plus récentes tant que leur format n'a pas changé
      (voir <a href="/docs/format/">les versions du format</a>). La case épingle aussi le lien : il se
      termine alors par <code>&amp;v=<var>version</var></code>, et la page qu'il ouvre, celle du jour,
      charge le lecteur ou l'éditeur de cette version au même endroit.</p>
  </div>
</section>

<section class="band">
  <div class="wrap prose-wide">
    <h2>3. En fichier vidéo</h2>
    <p>Le bouton <strong>Enregistrer une vidéo de l'observation</strong> du lecteur (la caméra, parmi ses commandes) fait un MP4 de
      la reconstitution, avec son son, à envoyer ou publier partout où va une vidéo. Il ouvre ce avec quoi la vidéo est faite :</p>
    <ul>
      <li><strong>Taille</strong> : comme à l'écran, ou 720, 1080 ou 2160 lignes, dans les proportions de l'image ;</li>
      <li><strong>Légende</strong>, <strong>Heure</strong>, <strong>Carte</strong> : ce qui, des textes et de la carte du lecteur, est écrit sur l'image ;</li>
      <li><strong>Début</strong> et <strong>Fin</strong> : la partie de l'observation filmée, comme le compteur l'affiche (<strong>Ici</strong> prend l'endroit où en est la lecture) ; toute l'observation par défaut.</li>
    </ul>
    <p><strong>Enregistrer</strong> la fabrique. Chaque image est dessinée et attendue, quel que soit le temps qu'elle prend : la vidéo
      tourne donc à 30 images par seconde quelle que soit la machine, et le même enregistrement fait toujours la même vidéo. Le bouton
      affiche où elle en est, et un clic dessus l'arrête. Rien ne quitte votre navigateur. Le fichier dit ce qu'il est : un logo discret
      dans un coin et, dans ses métadonnées, l'observation, l'adresse de l'enregistrement et la mention <em>une simulation, pas un
      enregistrement de l'observation</em>. Seulement dans les navigateurs qui savent encoder une vidéo (WebCodecs) : ailleurs, le bouton
      n'apparaît pas.</p>
    <h3>Un kit pour générateur vidéo</h3>
    <p>Le bouton <strong>Kit pour IA générative</strong> du même panneau fait, avec la même taille, le même début et la même fin, un zip
      pour produire une version réaliste de la reconstitution avec le générateur vidéo de votre choix (Runway, Kling, Luma, Veo…), sur
      votre propre compte, sans le laisser inventer le témoignage :</p>
    <ul>
      <li><code>reference.mp4</code> : la vidéo, avec son son, sans rien d'écrit dessus (ni légende, ni carte, ni logo, ni photo du lieu : un générateur les redessinerait comme faisant partie de la scène) ;</li>
      <li><code>depth.mp4</code> : la distance de chaque pixel, blanc près, noir loin et pour le ciel, sur une même échelle logarithmique de 1 m à 20 km ;</li>
      <li><code>phenomenon-mask.mp4</code>, <code>sky-mask.mp4</code> : en blanc, la place du phénomène, et le ciel ;</li>
      <li><code>first-frame.png</code>, pour les générateurs qui partent d'une image ;</li>
      <li><code>prompt.txt</code> : un prompt et un prompt négatif écrits à partir des seuls énoncés de l'enregistrement (lieu, heure, phénomène tel que dessiné, ce qui se passe, météo), jamais à partir du texte du témoignage, dont un générateur dessinerait chaque mot ;</li>
      <li>un mode d'emploi dans votre langue, et <code>manifest.json</code>, la provenance.</li>
    </ul>
    <p>La vidéo de référence guide le générateur : sa géométrie, son horizon, son cadrage et son mouvement sont à garder, seules les
      textures sont rendues photographiques. Le phénomène est rendu par le générateur comme le reste, pour qu'il ait le même grain, le même
      flou et la même lumière. Le masque sert à <strong>contrôler</strong> le résultat : une vidéo dont le phénomène en sort, change de
      forme, de taille, de couleur ou de mouvement, ou gagne des détails (hublots, lumières, reflets) est rejetée. Il n'est jamais recollé
      sur le résultat, où il aurait l'air rapporté.</p>
    <p class="small">Une vidéo générée est une reconstitution, pas une preuve. Incrustez sur toute l'image qu'elle est générée, citez
      l'enregistrement, et ne la montrez jamais à un témoin avant de l'avoir interrogé : une image réaliste peut modifier son souvenir.</p>
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
    <h2>Cómo se abre</h2>
    <p>El botón <strong>Compartir</strong> del reproductor da las mismas dos cosas que esta página, en una sola pantalla: el <strong>enlace</strong> o el código para <strong>insertar</strong> del reproductor. El editor se comparte a sí mismo, con el botón <strong>Compartir</strong> de su propia cabecera: el enlace o el código del editor abierto sobre el mismo archivo, o sobre el mismo caso. Las opciones de abajo son las que ofrece, cada una partiendo del estado del reproductor en ese momento; se aplican al enlace y al código de las secciones siguientes.</p>
    <fieldset class="doc-options">
      <label class="doc-option-start"><input id="share-opt-start-on" type="checkbox"> Empezar en
        <input id="share-opt-start" type="number" min="0" step="1" value="0" aria-label="Empezar en"> s</label>
      <label><input id="share-opt-labels" type="checkbox" checked> Mostrar los chips</label>
      <label><input id="share-opt-map" type="checkbox"> Abrir el mapa</label>
      <label><input id="share-opt-moments" type="checkbox" checked> Mostrar los momentos</label>
      <label><input id="share-opt-compare" type="checkbox"> Comparar con el relato</label>
    </fieldset>
    <h3>Lo que escribe cada una</h3>
    <div class="table-scroll"><table>
      <tr><th>Opción</th><th>En la dirección</th><th>En el elemento</th></tr>
      <tr><td>Empezar <code>n</code> segundos después del inicio (o <code>1:30</code>, <code>1m30s</code>, <code>PT1M30S</code>)</td><td><code>d=n</code></td><td><code>start-time="n"</code></td></tr>
      <tr><td>Empezar a una hora dicha durante la observación (<code>02:33:15</code>, o <code>2026-08-11T02:33:15</code>)</td><td><code>t=02:33:15</code></td><td><code>start-clock="02:33:15"</code></td></tr>
      <tr><td>Mostrar los chips</td><td>nada — están activados; <code>labels=0</code> los oculta</td><td><code>show-labels</code></td></tr>
      <tr><td>Abrir el mapa</td><td><code>map=1</code></td><td><code>show-observer-map</code></td></tr>
      <tr><td>Mostrar los momentos</td><td><code>moments=0</code> los oculta</td><td><code>hide-milestones</code> si se desmarca</td></tr>
      <tr><td>Comparar con el relato</td><td><code>compare=1</code></td><td><code>compare-account</code></td></tr>
      <tr><td>Abrir un caso en una de sus grabaciones</td><td><code>observer=IdObservador</code> (o un nombre de archivo, o su número en la lista)</td><td><code>observer="IdObservador"</code></td></tr>
      </table></div>
    <p class="small">Los chips del resumen son la franja de lo que la grabación enuncia, bajo la imagen: la fecha dicha con palabras y su día de la semana, la posición, el testigo, el tiempo, y un chip <q>Descripción</q> que muestra las primeras palabras del relato y abre el texto entero en lugar de los chips (una cruz los devuelve). La página del reproductor los muestra salvo con <code>labels=0</code>; el elemento solo los muestra con <code>show-labels</code>. El compartir del editor no admite ninguna de estas opciones: da el archivo en su dirección, y lo indica cuando hay cambios aún sin guardar.</p>
  </div>
</section>
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
    <p>Donde el enlace se muestra como tarjeta (red social, mensajería, foro que despliega los enlaces),
      la tarjeta puede decir más que el logotipo del proyecto. El servidor lee tu archivo cuando se consulta el
      enlace: la tarjeta muestra el nombre de la observación, su <code>image</code> (una dirección, absoluta o
      relativa al archivo) y su <code>summary</code> (una frase o dos, en texto simple o una por idioma). Sin
      <code>summary</code>, la tarjeta dice quién la vio, en qué expediente y cuándo, en la medida en que el
      archivo y su dirección lo dicen; sin <code>image</code>, muestra el logotipo. Un archivo de expediente admite los dos mismos campos. <code>summaryTime</code> (segundos) indica a la herramienta de captura del proyecto qué instante de la simulación fotografiar para la <code>image</code>, cuando el primero no muestra el fenómeno.</p>
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
      <a href="/docs/format/#components">la página de los componentes</a>.</p>
    <p class="small">La dirección del script no lleva versión, así que tu página sigue cada versión
      sin que haya que editarla: los navegadores preguntan en cada visita si ha cambiado, y la
      respuesta no cuesta nada mientras no haya cambiado.</p>
    <p class="small">Para conservar en cambio la representación que comprobaste, marca <strong>Fijar
      la versión</strong> en el cuadro de compartir: el script viene entonces del paquete publicado en
      npm, servido por jsDelivr, que conserva todas las versiones:
      <code>https://cdn.jsdelivr.net/npm/@rr0/ufoathome@<var>version</var>/dist-embed-sighting/rr0-sighting.mjs</code>. Tu página ya no recibe las correcciones posteriores, pero lee las grabaciones
      escritas para versiones más recientes mientras su formato no haya cambiado (ver
      <a href="/docs/format/">las versiones del formato</a>). La casilla fija también el enlace: termina
      entonces con <code>&amp;v=<var>version</var></code>, y la página que abre, la de hoy, carga el
      reproductor o el editor de esa versión desde el mismo sitio.</p>
  </div>
</section>

<section class="band">
  <div class="wrap prose-wide">
    <h2>3. Como archivo de vídeo</h2>
    <p>El botón <strong>Grabar un vídeo de la observación</strong> del reproductor (la cámara, entre sus controles) hace un MP4
      de la reconstrucción, con su sonido, para enviarlo o publicarlo dondequiera que vaya un vídeo. Abre aquello con lo que se hace el vídeo:</p>
    <ul>
      <li><strong>Tamaño</strong>: como en pantalla, o 720, 1080 o 2160 líneas, en las proporciones de la imagen;</li>
      <li><strong>Leyenda</strong>, <strong>Hora</strong>, <strong>Mapa</strong>: lo que, de los textos y el mapa del reproductor, se escribe sobre la imagen;</li>
      <li><strong>Inicio</strong> y <strong>Fin</strong>: la parte de la observación filmada, tal como la muestra el contador (<strong>Aquí</strong> toma el punto en que está la reproducción); toda la observación por defecto.</li>
    </ul>
    <p><strong>Grabar</strong> lo fabrica. Cada imagen se dibuja y se espera, tarde lo que tarde: el vídeo va así a 30 imágenes por
      segundo sea cual sea la máquina, y la misma grabación hace siempre el mismo vídeo. El botón muestra por dónde va, y un clic en él lo
      detiene. Nada sale de tu navegador. El archivo dice lo que es: un logotipo discreto en una esquina y, en sus metadatos, la
      observación, la dirección de la grabación y la mención <em>una simulación, no una grabación de la observación</em>. Solo en los
      navegadores que saben codificar vídeo (WebCodecs): en los demás, el botón no aparece.</p>
    <h3>Un kit para un generador de vídeo</h3>
    <p>El botón <strong>Kit para IA generativa</strong> del mismo panel hace, con el mismo tamaño, inicio y fin, un zip para producir una
      versión realista de la reconstrucción con el generador de vídeo que elijas (Runway, Kling, Luma, Veo…), en tu propia cuenta, sin
      dejar que invente el testimonio:</p>
    <ul>
      <li><code>reference.mp4</code>: el vídeo, con su sonido, sin nada escrito encima (ni leyenda, ni mapa, ni logotipo, ni foto del lugar: un generador los redibujaría como parte de la escena);</li>
      <li><code>depth.mp4</code>: la distancia de cada píxel, blanco cerca, negro lejos y para el cielo, en una misma escala logarítmica de 1 m a 20 km;</li>
      <li><code>phenomenon-mask.mp4</code>, <code>sky-mask.mp4</code>: en blanco, el lugar del fenómeno, y el cielo;</li>
      <li><code>first-frame.png</code>, para los generadores que parten de una imagen;</li>
      <li><code>prompt.txt</code>: un prompt y un prompt negativo escritos solo a partir de lo que afirma la grabación (lugar, hora, el fenómeno tal como está dibujado, lo que ocurre, el tiempo), nunca a partir del texto del testimonio, del que un generador dibujaría cada palabra;</li>
      <li>instrucciones en tu idioma, y <code>manifest.json</code>, la procedencia.</li>
    </ul>
    <p>El vídeo de referencia guía al generador: hay que conservar su geometría, su horizonte, su encuadre y su movimiento, y solo hacer
      fotográficas las texturas. El fenómeno lo reproduce el generador como el resto, para que tenga el mismo grano, el mismo desenfoque y
      la misma luz. La máscara sirve para <strong>controlar</strong> el resultado: se descarta un vídeo cuyo fenómeno se sale de ella,
      cambia de forma, tamaño, color o movimiento, o gana detalles (ojos de buey, luces, reflejos). Nunca se vuelve a pegar sobre el
      resultado, donde parecería añadido.</p>
    <p class="small">Un vídeo generado es una reconstrucción, no una prueba. Incrusta en toda la imagen que es generado, cita la
      grabación, y no lo muestres nunca a un testigo antes de haberlo entrevistado: una imagen realista puede modificar su recuerdo.</p>
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
    <h2>Come si apre</h2>
    <p>Il pulsante <strong>Condividi</strong> del lettore dà le stesse due cose di questa pagina, in una sola schermata: il <strong>link</strong> o il codice da <strong>incorporare</strong> del lettore. L'editor condivide sé stesso, con il pulsante <strong>Condividi</strong> della sua intestazione: il link o il codice dell'editor aperto sullo stesso file, o sullo stesso caso. Le opzioni qui sotto sono quelle che offre, ciascuna a partire dallo stato del lettore in quel momento; valgono per il link e per il codice delle sezioni seguenti.</p>
    <fieldset class="doc-options">
      <label class="doc-option-start"><input id="share-opt-start-on" type="checkbox"> Inizia a
        <input id="share-opt-start" type="number" min="0" step="1" value="0" aria-label="Inizia a"> s</label>
      <label><input id="share-opt-labels" type="checkbox" checked> Mostra i chip</label>
      <label><input id="share-opt-map" type="checkbox"> Apri la mappa</label>
      <label><input id="share-opt-moments" type="checkbox" checked> Mostra i momenti</label>
      <label><input id="share-opt-compare" type="checkbox"> Confronta col resoconto</label>
    </fieldset>
    <h3>Che cosa scrive ciascuna</h3>
    <div class="table-scroll"><table>
      <tr><th>Opzione</th><th>Nell'indirizzo</th><th>Sull'elemento</th></tr>
      <tr><td>Inizia <code>n</code> secondi dopo l'inizio (o <code>1:30</code>, <code>1m30s</code>, <code>PT1M30S</code>)</td><td><code>d=n</code></td><td><code>start-time="n"</code></td></tr>
      <tr><td>Inizia a un'ora detta durante l'osservazione (<code>02:33:15</code>, o <code>2026-08-11T02:33:15</code>)</td><td><code>t=02:33:15</code></td><td><code>start-clock="02:33:15"</code></td></tr>
      <tr><td>Mostra i chip</td><td>niente — sono attivi; <code>labels=0</code> li nasconde</td><td><code>show-labels</code></td></tr>
      <tr><td>Apri la mappa</td><td><code>map=1</code></td><td><code>show-observer-map</code></td></tr>
      <tr><td>Mostra i momenti</td><td><code>moments=0</code> li nasconde</td><td><code>hide-milestones</code> se deselezionato</td></tr>
      <tr><td>Confronta col resoconto</td><td><code>compare=1</code></td><td><code>compare-account</code></td></tr>
      <tr><td>Aprire un caso su una delle sue registrazioni</td><td><code>observer=IdOsservatore</code> (o un nome di file, o la sua posizione nell'elenco)</td><td><code>observer="IdOsservatore"</code></td></tr>
      </table></div>
    <p class="small">I chip del riepilogo sono la striscia di ciò che la registrazione enuncia, sotto l'immagine: la data detta a parole con il suo giorno della settimana, la posizione, il testimone, il meteo, e un chip <q>Descrizione</q> che mostra le prime parole del resoconto e apre il testo intero al posto dei chip (una croce li riporta). La pagina del lettore li mostra salvo con <code>labels=0</code>; l'elemento stesso li mostra solo con <code>show-labels</code>. La condivisione dell'editor non accetta nessuna di queste opzioni: dà il file al suo indirizzo, e lo segnala quando ci sono modifiche non ancora salvate.</p>
  </div>
</section>
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
    <p>Dove il link viene mostrato come scheda (social network, messaggistica, forum che espande i link),
      la scheda può dire più del logo del progetto. Il server legge il tuo file quando il link viene consultato:
      la scheda mostra il nome dell'osservazione, la sua <code>image</code> (un indirizzo, assoluto o relativo al
      file) e il suo <code>summary</code> (una o due frasi, in testo semplice o una per lingua). Senza
      <code>summary</code>, la scheda dice chi l'ha vista, in quale fascicolo e quando, per quanto il file e il suo
      indirizzo lo dicono; senza <code>image</code>, mostra il logo. Un file di fascicolo accetta gli stessi due campi. <code>summaryTime</code> (secondi) dice allo strumento di cattura del progetto quale istante della simulazione fotografare per l'<code>image</code>, quando il primo non mostra il fenomeno.</p>
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
      <a href="/docs/format/#components">pagina dei componenti</a>.</p>
    <p class="small">L'indirizzo dello script non contiene una versione, quindi la tua pagina
      segue ogni rilascio senza essere modificata: i browser chiedono a ogni visita se è cambiato, e
      la risposta non costa nulla finché non è cambiato.</p>
    <p class="small">Per mantenere invece la resa che hai verificato, seleziona <strong>Fissare la
      versione</strong> nella finestra di condivisione: lo script viene allora dal pacchetto
      pubblicato su npm, servito da jsDelivr, che conserva tutte le versioni:
      <code>https://cdn.jsdelivr.net/npm/@rr0/ufoathome@<var>version</var>/dist-embed-sighting/rr0-sighting.mjs</code>. La tua pagina non riceve più le correzioni successive, ma legge le
      registrazioni scritte per versioni più recenti finché il loro formato non è cambiato (vedi
      <a href="/docs/format/">le versioni del formato</a>). La casella fissa anche il link: termina
      allora con <code>&amp;v=<var>version</var></code>, e la pagina che apre, quella di oggi, carica il
      lettore o l'editor di quella versione dallo stesso posto.</p>
  </div>
</section>

<section class="band">
  <div class="wrap prose-wide">
    <h2>3. Come file video</h2>
    <p>Il pulsante <strong>Registrare un video dell'osservazione</strong> del lettore (la videocamera, tra i suoi comandi) fa un MP4
      della ricostruzione, con il suo sonoro, da inviare o pubblicare ovunque vada un video. Apre ciò con cui il video è fatto:</p>
    <ul>
      <li><strong>Dimensione</strong>: come sullo schermo, o 720, 1080 o 2160 righe, nelle proporzioni dell'immagine;</li>
      <li><strong>Didascalia</strong>, <strong>Ora</strong>, <strong>Mappa</strong>: ciò che, dei testi e della mappa del lettore, è scritto sull'immagine;</li>
      <li><strong>Inizio</strong> e <strong>Fine</strong>: la parte dell'osservazione filmata, come la mostra il contatore (<strong>Qui</strong> prende il punto in cui è la riproduzione); tutta l'osservazione per impostazione predefinita.</li>
    </ul>
    <p><strong>Registra</strong> lo produce. Ogni immagine viene disegnata e attesa, qualunque sia il tempo che richiede: il video va così
      a 30 immagini al secondo qualunque sia la macchina, e la stessa registrazione fa sempre lo stesso video. Il pulsante mostra a che
      punto è, e un clic su di esso lo ferma. Nulla lascia il tuo browser. Il file dice che cosa è: un logo discreto in un angolo e, nei
      suoi metadati, l'osservazione, l'indirizzo della registrazione e la dicitura <em>una simulazione, non una registrazione
      dell'osservazione</em>. Solo nei browser che sanno codificare un video (WebCodecs): altrove, il pulsante non compare.</p>
    <h3>Un kit per un generatore video</h3>
    <p>Il pulsante <strong>Kit per IA generativa</strong> dello stesso pannello fa, con la stessa dimensione, lo stesso inizio e la stessa
      fine, uno zip per produrre una versione realistica della ricostruzione con il generatore video che preferisci (Runway, Kling, Luma,
      Veo…), sul tuo account, senza lasciargli inventare la testimonianza:</p>
    <ul>
      <li><code>reference.mp4</code>: il video, con il suo sonoro, senza nulla scritto sopra (né didascalia, né mappa, né logo, né foto del luogo: un generatore li ridisegnerebbe come parte della scena);</li>
      <li><code>depth.mp4</code>: la distanza di ogni pixel, bianco vicino, nero lontano e per il cielo, su una stessa scala logaritmica da 1 m a 20 km;</li>
      <li><code>phenomenon-mask.mp4</code>, <code>sky-mask.mp4</code>: in bianco, il posto del fenomeno, e il cielo;</li>
      <li><code>first-frame.png</code>, per i generatori che partono da un'immagine;</li>
      <li><code>prompt.txt</code>: un prompt e un prompt negativo scritti solo a partire da ciò che afferma la registrazione (luogo, ora, il fenomeno come è disegnato, ciò che accade, il tempo), mai dal testo della testimonianza, di cui un generatore disegnerebbe ogni parola;</li>
      <li>le istruzioni nella tua lingua, e <code>manifest.json</code>, la provenienza.</li>
    </ul>
    <p>Il video di riferimento guida il generatore: la sua geometria, il suo orizzonte, la sua inquadratura e il suo movimento vanno
      mantenuti, solo le texture rese fotografiche. Il fenomeno è reso dal generatore come il resto, perché abbia la stessa grana, la stessa
      sfocatura e la stessa luce. La maschera serve a <strong>controllare</strong> il risultato: un video il cui fenomeno ne esce, cambia
      forma, dimensione, colore o movimento, o acquista dettagli (oblò, luci, riflessi) viene scartato. Non viene mai reincollata sul
      risultato, dove sembrerebbe aggiunta.</p>
    <p class="small">Un video generato è una ricostruzione, non una prova. Sovrimprimi su tutta l'immagine che è generato, cita la
      registrazione, e non mostrarlo mai a un testimone prima di averlo intervistato: un'immagine realistica può modificarne il ricordo.</p>
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
