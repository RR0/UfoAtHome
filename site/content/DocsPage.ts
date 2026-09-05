import type { PageMeta, SiteLanguage, SitePage } from "../SitePage.js"

/**
 * The documentation hub.
 *
 * It used to be one page, and the trouble with that was not its length but that length was the
 * only way through it: somebody who had a recording and wanted a link to send had to scroll past
 * the component bundles and the whole recording format to find two sentences. The four pages below
 * are split by the QUESTION being asked, not by subject — which is why sharing a link and putting
 * it on a page are separate although both are two lines long. They are asked by different people.
 */
export class DocsPage implements SitePage {

  readonly meta: PageMeta = {
    slug: "docs",
    navLabel: { en: "Documentation", fr: "Documentation" },
    title: { en: "Documentation", fr: "Documentation" },
    description: {
      en: "Share a reconstruction by link, put one on your own page, drive the four elements, or "
        + "read the recording format field by field.",
      fr: "Partager une reconstitution par lien, en poser une sur votre page, piloter les quatre "
        + "éléments, ou lire le format d'enregistrement champ par champ."
    }
  }

  render(language: SiteLanguage): string {
    const fr = language === "fr"
    const cards: ReadonlyArray<readonly [string, string, string]> = fr
      ? [
        ["/docs/create/", "Créer une observation",
          "Dans l'éditeur, ou en écrivant le fichier vous-même. Les deux produisent la même chose : un fichier JSON qui est le vôtre."],
        ["/docs/share/", "Partager une observation",
          "Un lien à envoyer, ou deux lignes de HTML sur votre propre page. Les deux avec un exemple qui marche, à essayer et à copier."],
        ["/docs/components/", "Les composants",
          "Une section par composant : ce qu'il dessine, le balisage qu'il accepte, et chaque attribut, propriété, méthode et événement auquel il répond."]
      ]
      : [
        ["/docs/create/", "Create an observation",
          "In the editor, or by writing the file yourself. Both produce the same thing: one JSON file that is yours."],
        ["/docs/share/", "Share an observation",
          "A link to send, or two lines of HTML on your own page. Both with a working example you can try and copy."],
        ["/docs/components/", "The components",
          "One section per component: what it draws, the markup it takes, and every attribute, property, method and event it answers to."]
      ]
    const grid = cards.map(([href, title, blurb]) => `      <a class="use" href="${href}">
        <h3>${title}</h3>
        <p>${blurb}</p>
        <p class="use-more">${fr ? "Lire" : "Read"} →</p>
      </a>`).join("\n")

    return `
<section class="band hero">
  <div class="wrap">
    <p class="eyebrow">Documentation</p>
    <h1>${fr ? "Trois questions, trois pages." : "Three questions, three pages."}</h1>
    <p class="lede">${fr
      ? "Rangées par la question posée plutôt que par sujet. Prenez celle qui est la vôtre."
      : "Arranged by the question being asked rather than by subject. Take the one that is yours."}</p>
  </div>
</section>

<section class="band">
  <div class="wrap">
    <div class="uses">
${grid}
    </div>
  </div>
</section>

<section class="band">
  <div class="wrap prose-wide">
    <h2>${fr ? "Installer les sources" : "Getting the sources"}</h2>
    <p>${fr
      ? "Pour déboguer un comportement, changer quelque chose, ou partir de ce code et en faire le vôtre."
      : "To debug a behaviour, change something, or take this code and make it your own."}</p>
    <pre><code>git clone https://github.com/RR0/UfoAtHome.git
npm install
npm run dev          # ${fr ? "démo locale, serveur de développement Vite" : "local demo, Vite dev server"}
npm test             # vitest
npm run build:all    # ${fr ? "les quatre bundles d'intégration" : "the four embed bundles"}</code></pre>
    <p>${fr
      ? `Les catalogues sont engendrés, pas saisis à la main : <code>npm run build:stars</code> (HYG),
         <code>npm run build:comets</code> (JPL Horizons) et <code>npm run build:satellites</code>
         (le SATCAT de CelesTrak) reconstruisent chacun le sien depuis sa source publique — la donnée
         est donc reproductible autant que lisible.`
      : `The catalogues are generated, not committed by hand: <code>npm run build:stars</code> (HYG),
         <code>npm run build:comets</code> (JPL Horizons) and <code>npm run build:satellites</code>
         (CelesTrak's SATCAT) each rebuild theirs from its public source, so the data is reproducible
         as well as readable.`}</p>
    <p>${fr
      ? `Le <a href="https://github.com/RR0/UfoAtHome#readme">README</a> porte la référence complète,
         avec le raisonnement derrière chaque choix ; c'est lui qui fait foi si ces pages et lui
         venaient à diverger. Tout est en MIT — voir <a href="/faq/">la FAQ</a> pour ce que cela vous
         autorise.`
      : `The <a href="https://github.com/RR0/UfoAtHome#readme">README</a> carries the full reference,
         including the reasoning behind each choice, and is the canonical source if these pages and it
         ever disagree. Everything is MIT — see <a href="/faq/">the FAQ</a> for what that lets you do.`}</p>
  </div>
</section>
`
  }
}
