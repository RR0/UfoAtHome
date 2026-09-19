import type { PageMeta, SiteLanguage, SitePage } from "../SitePage.js"

/**
 * The documentation hub.
 *
 * It used to be one page, and the trouble with that was not its length but that length was the
 * only way through it: somebody who had a recording and wanted a link to send had to scroll past
 * the component bundles and the whole recording format to find two sentences. The pages below
 * are split by the QUESTION being asked, not by subject — which is why sharing a link and putting
 * it on a page are separate although both are two lines long. They are asked by different people.
 *
 * The format is the exception, a page about a THING: every other one talks about the same file, and
 * needs somewhere to send the reader for what is in it (see DocsFormatPage).
 */
export class DocsPage implements SitePage {

  readonly meta: PageMeta = {
    slug: "docs",
    navLabel: { en: "Documentation", fr: "Documentation" },
    // The tab reads "Documentation — UFO@home" already (see Layout); the heading names it in full.
    title: { en: "Documentation", fr: "Documentation" },
    description: {
      en: "Create a recording, read its JSON format field by field, share a reconstruction by link "
        + "or on your own page, drive the components, and see where every piece of data comes from.",
      fr: "Créer un enregistrement, lire son format JSON champ par champ, partager une reconstitution "
        + "par lien ou sur votre page, piloter les composants, et voir d'où vient chaque donnée."
    }
  }

  render(language: SiteLanguage): string {
    const fr = language === "fr"
    const cards: ReadonlyArray<readonly [string, string, string]> = fr
      ? [
        ["/docs/create/", "Créer une observation",
          "Dans l'éditeur, ou en écrivant le fichier vous-même. Les deux produisent la même chose : un fichier JSON qui est le vôtre."],
        ["/docs/format/", "Le format JSON",
          "Ce que contient ce fichier, champ par champ : l'observation, les témoins, ce qui a été vu, la météo. Avec un exemple entier à taper."],
        ["/docs/share/", "Partager une observation",
          "Un lien à envoyer, ou deux lignes de HTML sur votre propre page. Les deux avec un exemple qui marche, à essayer et à copier."],
        ["/docs/components/", "Les composants",
          "Quatre éléments standards, une page chacun : lequel vous voulez, ce qu'il dessine, et tout ce à quoi il répond."],
        ["/docs/sources/", "Les sources et les choix",
          "D'où vient chaque donnée, quand elle est lue, d'où elle est servie, et pourquoi cette source plutôt qu'une autre."]
      ]
      : [
        ["/docs/create/", "Create an observation",
          "In the editor, or by writing the file yourself. Both produce the same thing: one JSON file that is yours."],
        ["/docs/format/", "The JSON format",
          "What that file holds, field by field: the observation, the witnesses, what was seen, the weather. With a whole example to type in."],
        ["/docs/share/", "Share an observation",
          "A link to send, or two lines of HTML on your own page. Both with a working example you can try and copy."],
        ["/docs/components/", "The components",
          "Four standard elements, one page each: which one you want, what it draws, and everything it answers to."],
        ["/docs/sources/", "Sources and choices",
          "Where each piece of data comes from, when it is read, where it is served from, and why that source over another."]
      ]
    const grid = cards.map(([href, title, blurb]) => `      <a class="use" href="${href}">
        <h3>${title}</h3>
        <p>${blurb}</p>
        <p class="use-more">${fr ? "Lire" : "Read"} →</p>
      </a>`).join("\n")

    return `
<section class="band hero">
  <div class="wrap">
    <p class="eyebrow">${fr ? "Cinq pages" : "Five pages"}</p>
    <h1>${fr ? "Documentation d'UFO@home" : "UFO@home documentation"}</h1>
    <p class="lede">${fr
      ? "Comment créer une observation, ce que contient son fichier, comment la partager ou l'intégrer, et d'où viennent ses données. Rangées par la question posée : prenez celle qui est la vôtre."
      : "How to create an observation, what its file holds, how to share or embed it, and where its data comes from. Arranged by the question being asked: take the one that is yours."}</p>
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
npm run build:all    # ${fr ? "les trois bundles d'intégration" : "the three embed bundles"}</code></pre>
    <p>${fr
      ? `Les catalogues sont engendrés, pas saisis à la main : <code>npm run build:stars</code> (HYG),
         <code>npm run build:comets</code> (JPL Horizons), <code>npm run build:novae</code> (les
         courbes AAVSO et les supernovae historiques) et <code>npm run build:satellites</code>
         (le SATCAT de CelesTrak) reconstruisent chacun le sien depuis sa source publique — la donnée
         est donc reproductible autant que lisible. <code>npm run build:tle</code> réduit une copie
         locale de l'archive d'éléments orbitaux de Laurent Chabin
         (<a href="https://ufowaves.org/gp/my_tles/">ufowaves.org</a>) aux fichiers hebdomadaires
         servis sous <code>/tle/</code>.`
      : `The catalogues are generated, not committed by hand: <code>npm run build:stars</code> (HYG),
         <code>npm run build:comets</code> (JPL Horizons), <code>npm run build:novae</code> (AAVSO
         light curves and the historical supernovae) and <code>npm run build:satellites</code>
         (CelesTrak's SATCAT) each rebuild theirs from its public source, so the data is reproducible
         as well as readable. <code>npm run build:tle</code> reduces a local copy of Laurent Chabin's
         orbital element archive (<a href="https://ufowaves.org/gp/my_tles/">ufowaves.org</a>) to the
         weekly files served under <code>/tle/</code>.`}</p>
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
