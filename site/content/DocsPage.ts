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
        ["/docs/link/", "Partager par lien",
          "J'ai un enregistrement et je veux qu'on le voie. Une URL, rien à installer — pour un courriel, un message, un forum qui n'accepte que du texte."],
        ["/docs/embed/", "L'intégrer à une page",
          "J'ai un enregistrement et je le veux sur mon site, comme on y pose une vidéo. Deux lignes de HTML, sans framework ni compilation."],
        ["/docs/elements/", "Les quatre éléments",
          "Une section par balise : ce qu'elle dessine, le balisage qu'elle accepte, et chaque attribut, propriété, méthode et événement auquel elle répond."],
        ["/docs/format/", "Le format d'enregistrement",
          "Ce que contient un sighting.json, champ par champ, avec un fichier entier à recopier et les quatre règles qui décident du sens de l'ensemble."]
      ]
      : [
        ["/docs/link/", "Share by link",
          "I have a recording and I want somebody to see it. One URL, nothing to install — for an email, a message, a forum that allows nothing but text."],
        ["/docs/embed/", "Put it on a page",
          "I have a recording and I want it on my site, the way a video goes on a page. Two lines of HTML, no framework and no build step."],
        ["/docs/elements/", "The four elements",
          "One section per tag: what it draws, the markup it takes, and every attribute, property, method and event it answers to."],
        ["/docs/format/", "The recording format",
          "What a sighting.json holds, field by field, with a whole working file to copy and the four rules that decide what any of it means."]
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
    <h1>${fr ? "Par où vous entrez." : "Whichever way you came in."}</h1>
    <p class="lede">${fr
      ? "Quatre pages, rangées par la question posée plutôt que par sujet. Prenez celle qui est la vôtre."
      : "Four pages, arranged by the question being asked rather than by subject. Take the one that is yours."}</p>
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
    <h2>${fr ? "Le construire soi-même" : "Building it yourself"}</h2>
    <pre><code>git clone https://github.com/RR0/UfoAtHome.git
npm install
npm run dev          # ${fr ? "démo locale, serveur de développement Vite" : "local demo, Vite dev server"}
npm test             # vitest
npm run build:all    # ${fr ? "les quatre bundles d'intégration" : "the four embed bundles"}
npm run build:site   # ${fr ? "ce site, dans dist-site/" : "this site, into dist-site/"}</code></pre>
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
