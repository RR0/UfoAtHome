import { DocsSection } from "./DocsSection.js"
import type { PageMeta, Said, SiteLanguage } from "../SitePage.js"

/**
 * "How do I make one?" — the editor, an AI assistant working from the case file, or the file
 * written by hand.
 *
 * The assistant is here because it is how every published demo was actually made: the documents of
 * a case handed to a language model, which wrote the file, then a few rounds of corrections. An
 * outsider given only a GEIPAN file and the public docs did the same for Maffliers (2026-09-28);
 * what they stumbled on was fixed in the format page and the loader, and the method they followed
 * is what the section below asks for.
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
      en: "Three ways to make a recording: in the editor, with an AI assistant working from the "
        + "case documents, or by writing the file yourself, whose format has its own page.",
      fr: "Trois façons de faire un enregistrement : dans l'éditeur, avec un assistant IA qui "
        + "travaille sur les documents du cas, ou en écrivant le fichier vous-même, dont le format "
        + "a sa propre page."
    },
    asideFromNav: true
  }

  private readonly lede: Said<string> = {
    en: "Draw it in the editor, have an AI assistant write it from the case file, or write it "
      + "yourself. All three produce the same thing: one JSON file that is yours, and that anybody "
      + "can replay.",
    fr: "Dessinez-la dans l'éditeur, faites-la écrire par un assistant IA à partir du dossier, ou "
      + "écrivez-la vous-même. Les trois produisent la même chose : un fichier JSON qui est le "
      + "vôtre, et que n'importe qui peut rejouer."
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
    <h2>2. With an AI assistant, from the case file</h2>
    <p>When a case already has its documents (a report, a questionnaire, a statement, sketches,
      photos of the place, a map), the quickest way is often to hand them to an AI assistant that
      can read PDFs and images and run a little code, point it at this documentation, and have it
      write the file. It reads the account, measures the drawings, computes directions from the map,
      looks up what can be looked up, and writes what it found in the format. You then look at the
      result, and tell it what is wrong.</p>
    <p>The assistant knows nothing about the case but what you give it, and nothing about the
      format but what these pages say. So ask it for the discipline an investigator would keep:</p>
    <pre class="doc-prompt"><code>Here are the documents of a sighting case. Build a UFO@home recording
of what the observer saw: the JSON file described at
https://ufoathome.org/docs/format/ , checked against
https://ufoathome.org/sighting.schema.json .

- State only what the documents support. Write each value you worked
  out as {"value": ..., "basis": "derived", "rationale": "..."} and
  each value you had to choose as "basis": "assumed".
- The phenomenon is angles only: its direction (aim) and apparent size
  (angular) at each moment. Metres the observer gave go in
  "interpretation", never in the shapes.
- List the contradictions between the documents, and the questions to
  put back to the observer or the investigator.</code></pre>
    <p>Then check what it wrote, the way you would check a colleague's work:</p>
    <ul>
      <li><strong>Play it.</strong> Open it in <a href="/play/">the player</a>, from your computer
        with the photos it names. Is the phenomenon where the drawings put it, against the right
        trees, at the right height above the horizon? Say what is off, and have it corrected.</li>
      <li><strong>Read the <code>assumed</code> values.</strong> They are the list of what nobody
        said. Each is a question for the observer, or a place where the reconstruction stands on a
        guess.</li>
      <li><strong>Finish in the editor</strong> what is easier to do with a mouse than with a
        sentence: moving a building by a few metres, nudging a direction until it sits on the
        photo.</li>
      <li><strong>Show it to the observer.</strong> The only test that counts is whether they
        recognise what they saw.</li>
    </ul>
    <p>An observer who has only their own account can do this inside the editor: type it in the
      <em>Observation</em> tab, and with a key for Claude's API the editor drafts the rest of the
      recording from it, sending nothing anywhere but to that model.</p>
    <p class="small">An account is personal data. Before handing documents to an online assistant,
      remove what identifies the observer unless they agreed to it, and check what the service
      keeps. And an assistant can be wrong with confidence: the file is only as good as the
      documents behind it and the checking after it.</p>
  </div>
</section>

<section class="band">
  <div class="wrap prose-wide">
    <h2>3. By hand, or from your own archive</h2>
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
    <h2>2. Avec un assistant IA, à partir du dossier</h2>
    <p>Quand un cas a déjà ses documents (un rapport, un questionnaire, un procès-verbal, des
      croquis, des photos des lieux, une carte), le plus rapide est souvent de les confier à un
      assistant IA capable de lire des PDF et des images et d'exécuter un peu de code, de lui
      indiquer cette documentation, et de lui faire écrire le fichier. Il lit le récit, mesure les
      dessins, calcule des directions sur la carte, cherche ce qui peut l'être, et écrit ce qu'il a
      trouvé dans le format. Vous regardez ensuite le résultat, et lui dites ce qui ne va pas.</p>
    <p>L'assistant ne sait du cas que ce que vous lui donnez, et du format que ce que disent ces
      pages. Demandez-lui donc la discipline que garderait un enquêteur :</p>
    <pre class="doc-prompt"><code>Voici les documents d'un cas d'observation. Construis un enregistrement
UFO@home de ce que l'observateur a vu : le fichier JSON décrit sur
https://ufoathome.org/docs/format/ , vérifié avec
https://ufoathome.org/sighting.schema.json .

- N'énonce que ce que les documents appuient. Écris chaque valeur que
  tu as calculée sous la forme {"value": ..., "basis": "derived",
  "rationale": "..."} et chaque valeur que tu as dû choisir avec
  "basis": "assumed".
- Le phénomène n'est que des angles : sa direction (aim) et sa taille
  apparente (angular) à chaque instant. Les mètres donnés par
  l'observateur vont dans "interpretation", jamais dans les formes.
- Liste les contradictions entre les documents, et les questions à
  reposer à l'observateur ou à l'enquêteur.</code></pre>
    <p>Puis vérifiez ce qu'il a écrit, comme vous vérifieriez le travail d'un collègue :</p>
    <ul>
      <li><strong>Jouez-le.</strong> Ouvrez-le dans <a href="/play/">le lecteur</a>, depuis votre
        ordinateur avec les photos qu'il nomme. Le phénomène est-il là où les dessins le mettent,
        devant les bons arbres, à la bonne hauteur au-dessus de l'horizon ? Dites ce qui cloche, et
        faites-le corriger.</li>
      <li><strong>Lisez les valeurs <code>assumed</code>.</strong> C'est la liste de ce que
        personne n'a dit. Chacune est une question pour l'observateur, ou un endroit où la
        reconstitution repose sur une supposition.</li>
      <li><strong>Terminez dans l'éditeur</strong> ce qui se fait mieux à la souris qu'avec une
        phrase : déplacer un bâtiment de quelques mètres, ajuster une direction jusqu'à ce qu'elle
        tombe sur la photo.</li>
      <li><strong>Montrez-le à l'observateur.</strong> Le seul test qui compte est qu'il reconnaisse
        ce qu'il a vu.</li>
    </ul>
    <p>Un observateur qui n'a que son propre récit peut le faire dans l'éditeur : il le tape dans
      l'onglet <em>Observation</em>, et avec une clé d'API Claude l'éditeur rédige le reste de
      l'enregistrement à partir de lui, sans rien envoyer ailleurs qu'à ce modèle.</p>
    <p class="small">Un compte rendu est une donnée personnelle. Avant de confier des documents à un
      assistant en ligne, retirez ce qui identifie l'observateur s'il n'y a pas consenti, et
      vérifiez ce que le service conserve. Et un assistant peut se tromper avec assurance : le
      fichier ne vaut que par les documents qui le fondent et la vérification qui le suit.</p>
  </div>
</section>

<section class="band">
  <div class="wrap prose-wide">
    <h2>3. À la main, ou depuis vos propres archives</h2>
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
