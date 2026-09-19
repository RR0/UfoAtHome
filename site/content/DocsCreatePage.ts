import { DocsSection } from "./DocsSection.js"
import type { PageMeta, Said, SiteLanguage } from "../SitePage.js"

/**
 * "How do I make one?" — the editor, or the file written by hand.
 *
 * The file's own reference is DocsFormatPage: every other page talks about that file too (the
 * player takes one, the components read one, sharing is sending one), and a format described
 * halfway down the page about making one could only be linked to as "scroll down".
 */
export class DocsCreatePage extends DocsSection {

  readonly meta: PageMeta = {
    slug: "docs/create",
    navLabel: { en: "Creating an observation", fr: "Créer une observation" },
    title: { en: "Create an observation", fr: "Créer une observation" },
    description: {
      en: "Two ways to make a recording: in the editor, or by writing the file yourself, whose "
        + "format has its own page.",
      fr: "Deux façons de faire un enregistrement : dans l'éditeur, ou en écrivant le fichier "
        + "vous-même, dont le format a sa propre page."
    },
    asideFromNav: true
  }

  private readonly lede: Said<string> = {
    en: "Draw it in the editor, or write the file yourself. Both produce the same thing: one JSON "
      + "file that is yours, and that anybody can replay.",
    fr: "Dessinez-la dans l'éditeur, ou écrivez le fichier vous-même. Les deux produisent la même "
      + "chose : un fichier JSON qui est le vôtre, et que n'importe qui peut rejouer."
  }

  render(language: SiteLanguage): string {
    return this.hero(language, this.meta.title, this.lede) + (language === "fr" ? this.fr() : this.en())
  }

  private en(): string {
    return `
<section class="band">
  <div class="wrap prose-wide">
    <h2>1. In the editor</h2>
    <p>The ordinary way, and the one to use unless you have a reason not to. Draw what was seen, say
      when and where, record how it moved — and the sky, the weather and the ground are looked up
      for you rather than remembered.</p>
    <p class="doc-try-actions">
      <a class="btn btn-primary" href="/edit/">Open the editor</a>
      <a class="btn" href="/edit/#manual">Read the manual</a>
    </p>
    <p>It ends with <strong>Export</strong>, which hands you a file. That file is the whole
      recording: there is no account and nothing kept here. Put it somewhere with a public address
      and it is ready to <a href="/docs/share/">share</a>.</p>
    <p>Already have one and want to change it? The editor opens on an existing recording — the
      <q>?</q> panel of every published reconstruction carries the link that does it.</p>
  </div>
</section>

<section class="band">
  <div class="wrap prose-wide">
    <h2>2. By hand, or from your own archive</h2>
    <p>A recording is a file with a documented shape, so nothing stops you writing one in a text
      editor, or generating a thousand from a database you already have: it is exactly what the
      editor itself writes.</p>
  </div>
</section>
<section class="band">
  <div class="wrap prose-wide">
    <p>Everything the editor writes, field by field, with a whole file to type in and the demos
      worth reading, is on its own page: <a href="/docs/format/">the sighting file</a>.</p>
    <p class="doc-try-actions"><a class="btn btn-primary" href="/docs/format/">Read the format</a></p>
  </div>
</section>
`
  }

  private fr(): string {
    return `
<section class="band">
  <div class="wrap prose-wide">
    <h2>1. Dans l'éditeur</h2>
    <p>La voie ordinaire, et celle à prendre sauf raison contraire. Dessinez ce qui a été vu, dites
      quand et où, enregistrez le mouvement — et le ciel, la météo et le sol sont relevés pour vous
      plutôt que remémorés.</p>
    <p class="doc-try-actions">
      <a class="btn btn-primary" href="/edit/">Ouvrir l'éditeur</a>
      <a class="btn" href="/edit/#manual">Lire le manuel</a>
    </p>
    <p>Cela se termine par <strong>Exporter</strong>, qui vous remet un fichier. Ce fichier est
      l'enregistrement complet : il n'y a pas de compte, et rien n'est conservé ici. Posez-le
      quelque part avec une adresse publique et il est prêt à <a href="/docs/share/">partager</a>.</p>
    <p>Vous en avez déjà un et voulez le modifier ? L'éditeur s'ouvre sur un enregistrement
      existant — le panneau <q>?</q> de toute reconstitution publiée porte le lien qui le fait.</p>
  </div>
</section>

<section class="band">
  <div class="wrap prose-wide">
    <h2>2. À la main, ou depuis vos propres archives</h2>
    <p>Un enregistrement est un fichier de forme documentée : rien ne vous empêche d'en écrire un
      dans un éditeur de texte, ni d'en engendrer mille depuis une base que vous avez déjà : c'est
      exactement ce que l'éditeur lui-même écrit.</p>
  </div>
</section>
<section class="band">
  <div class="wrap prose-wide">
    <p>Tout ce que l'éditeur écrit, champ par champ, avec un fichier entier à taper et les démos qui
      valent la lecture, est sur sa propre page : <a href="/docs/format/">le fichier d'observation</a>.</p>
    <p class="doc-try-actions"><a class="btn btn-primary" href="/docs/format/">Lire le format</a></p>
  </div>
</section>
`
  }
}
