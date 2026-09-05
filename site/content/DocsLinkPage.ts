import { DocsSection } from "./DocsSection.js"
import type { PageMeta, Said, SiteLanguage } from "../SitePage.js"

/** "I have a recording and I want to send someone a link to it." */
export class DocsLinkPage extends DocsSection {

  readonly meta: PageMeta = {
    slug: "docs/link",
    navLabel: { en: "Sharing a link", fr: "Partager un lien" },
    title: { en: "Share a reconstruction by link", fr: "Partager une reconstitution par lien" },
    description: {
      en: "One URL that opens any recording in the player, for an email, a message, or a forum that "
        + "allows nothing but text.",
      fr: "Une URL qui ouvre n'importe quel enregistrement dans le lecteur — pour un courriel, un "
        + "message, ou un forum qui n'accepte que du texte."
    },
    asideFromNav: true
  }

  private readonly lede: Said<string> = {
    en: "Nothing to install, nothing to host but the recording itself. Hand somebody a link and they "
      + "see the observation, in their own language, in the sky it states.",
    fr: "Rien à installer, rien à héberger que l'enregistrement lui-même. Donnez un lien à quelqu'un "
      + "et il voit l'observation, dans sa langue, sous le ciel qu'elle énonce."
  }

  render(language: SiteLanguage): string {
    return this.hero(language, this.meta.title, this.lede) + (language === "fr" ? this.fr() : this.en())
  }

  private en(): string {
    return `
<section class="band">
  <div class="wrap prose-wide">
    <h2>The link</h2>
    <pre><code>https://ufoathome.org/player/?sighting=https://example.org/my-case/sighting.json</code></pre>
    <p>That is the whole of it. The player fetches the recording, computes the sky of the date and
      place it states, and plays it. There is no account at either end, and the reader needs nothing
      installed.</p>
    <p>Try it on one of this site's own: <a href="/player/?sighting=/demo-data/example-minimal.json">a
      minimal recording</a>, or <a href="/player/?sighting=Socorro">Socorro</a> — a bare name with no
      slash is looked for among the demos, and then among rr0.org's case directories.</p>

    <h2>Two conditions</h2>
    <ul class="plain">
      <li><strong>The recording has to be reachable.</strong> A public URL — anything a browser can
        fetch. A file on your own disk has no URL anyone else can follow.</li>
      <li><strong>And readable from another site.</strong> One
        <code>Access-Control-Allow-Origin: *</code> header on the JSON. Most static hosts (GitHub
        Pages, Netlify, S3) either send it or let you add it in a line of configuration; if the file
        opens in a browser but the player says it could not be loaded, this is almost always why.</li>
    </ul>
    <p>Nowhere to put the file? Paste it instead: <a href="/player/">the player</a> takes a
      recording typed or pasted straight in, which is enough to check one before publishing it —
      though of course a pasted one cannot be shared by link.</p>

    <h2>What the reader gets</h2>
    <p>The observation named in the page's own title, playing in its real sky, with a
      <q>?</q> panel carrying its date, its place, its case id, its description and its credits —
      and a button to open the same recording in the editor and change anything in it.</p>
    <p>The page picks its own language from the reader's browser, so one link serves everybody.</p>

    <h2>The short form</h2>
    <p><code>ufoathome.org/&lt;name&gt;</code> — the shape links took before this site existed —
      still resolves to the player. It is kept for the links already out there; for anything new the
      explicit <code>?sighting=</code> form says what it means.</p>
    <p>Want it on a page of yours rather than on this one? That is
      <a href="/docs/embed/">two lines of HTML</a>.</p>
  </div>
</section>
`
  }

  private fr(): string {
    return `
<section class="band">
  <div class="wrap prose-wide">
    <h2>Le lien</h2>
    <pre><code>https://ufoathome.org/player/?sighting=https://exemple.org/mon-dossier/sighting.json</code></pre>
    <p>C'est tout. Le lecteur va chercher l'enregistrement, calcule le ciel de la date et du lieu
      qu'il énonce, et le joue. Il n'y a de compte ni d'un côté ni de l'autre, et le lecteur n'a
      rien à installer.</p>
    <p>Essayez sur ceux de ce site :
      <a href="/player/?sighting=/demo-data/example-minimal.json">un enregistrement minimal</a>, ou
      <a href="/player/?sighting=Socorro">Socorro</a> — un nom seul, sans barre oblique, est cherché
      parmi les démos, puis parmi les dossiers de rr0.org.</p>

    <h2>Deux conditions</h2>
    <ul class="plain">
      <li><strong>L'enregistrement doit être atteignable.</strong> Une URL publique — tout ce qu'un
        navigateur peut aller chercher. Un fichier sur votre disque n'a pas d'URL que quelqu'un
        d'autre puisse suivre.</li>
      <li><strong>Et lisible depuis un autre site.</strong> Un en-tête
        <code>Access-Control-Allow-Origin: *</code> sur le JSON. La plupart des hébergements
        statiques (GitHub Pages, Netlify, S3) l'envoient ou permettent de l'ajouter en une ligne de
        configuration ; si le fichier s'ouvre dans un navigateur mais que le lecteur dit n'avoir
        pas pu le charger, c'est presque toujours cela.</li>
    </ul>
    <p>Nulle part où poser le fichier ? Collez-le : <a href="/player/">le lecteur</a> accepte un
      enregistrement tapé ou collé directement, ce qui suffit à en vérifier un avant de le publier —
      mais un enregistrement collé ne se partage évidemment pas par lien.</p>

    <h2>Ce que voit le destinataire</h2>
    <p>L'observation, nommée dans le titre même de la page, jouée sous son ciel réel, avec un
      panneau <q>?</q> portant sa date, son lieu, son identifiant de dossier, sa description et ses
      crédits — et un bouton pour ouvrir le même enregistrement dans l'éditeur et y changer ce que
      l'on veut.</p>
    <p>La page choisit sa langue d'après le navigateur de qui l'ouvre : un seul lien sert tout le
      monde.</p>

    <h2>La forme courte</h2>
    <p><code>ufoathome.org/&lt;nom&gt;</code> — la forme des liens antérieurs à ce site — aboutit
      toujours au lecteur. Elle est conservée pour les liens déjà en circulation ; pour du nouveau,
      la forme explicite <code>?sighting=</code> dit ce qu'elle fait.</p>
    <p>Vous le voulez sur une page à vous plutôt que sur celle-ci ? C'est
      <a href="/docs/embed/">deux lignes de HTML</a>.</p>
  </div>
</section>
`
  }
}
