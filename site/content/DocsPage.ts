import type { PageMeta, Said, SiteLanguage, SitePage } from "../SitePage.js"
import { Licence } from "../Licence.js"

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
    navLabel: { en: "Documentation", fr: "Documentation", es: "Documentación", it: "Documentazione" },
    // The tab reads "Documentation — UFO@home" already (see Layout); the heading names it in full.
    title: { en: "Documentation", fr: "Documentation", es: "Documentación", it: "Documentazione" },
    description: {
      en: "What a UFO case is, its observations and interviews, how to create a recording, share a reconstruction by link "
        + "or on your own page, drive the components, and see where every piece of data comes from.",
      fr: "Ce qu'est un dossier ufologique, ses observations et ses interviews, comment créer un enregistrement, partager une reconstitution "
        + "par lien ou sur votre page, piloter les composants, et voir d'où vient chaque donnée.",
      es: "Qué es un caso ovni, sus observaciones y entrevistas, cómo crear una grabación, compartir una reconstrucción mediante un enlace "
        + "o en tu propia página, manejar los componentes y ver de dónde procede cada dato.",
      it: "Che cos'è un caso ufologico, le sue osservazioni e interviste, come creare una registrazione, condividere una ricostruzione con un link "
        + "o sulla propria pagina, pilotare i componenti e vedere da dove viene ogni dato."
    }
  }

  render(language: SiteLanguage): string {
    type Card = readonly [string, string, string]
    // What anybody with an observation asks first, then what somebody building with the components
    // or writing files by hand needs.
    const essentials: ReadonlyArray<Card> = ({
      en: [
        ["/docs/create/", "Create an observation",
          "In the editor, or by writing the file yourself. Both produce the same thing: one JSON file that is yours."],
        ["/docs/create/interpretation/", "Create an interpretation",
          "In the case editor, or in the case file: an alternative explanation of what was seen, as an observation of its own."],
        ["/docs/create/interview/", "Create an interview",
          "In the case editor, or in the files: who took part, how, and the transcript if you have one."],
        ["/docs/share/", "Share an observation",
          "A link to send, or two lines of HTML on your own page. Both with a working example you can try and copy."],
      ],
      fr: [
        ["/docs/create/", "Créer une observation",
          "Dans l'éditeur, ou en écrivant le fichier vous-même. Les deux produisent la même chose : un fichier JSON qui est le vôtre."],
        ["/docs/create/interpretation/", "Créer une interprétation",
          "Dans l'éditeur de dossier, ou dans le fichier de dossier : une explication alternative de ce qui a été vu, comme une observation à part."],
        ["/docs/create/interview/", "Créer une interview",
          "Dans l'éditeur de dossier, ou dans les fichiers : qui y a pris part, comment, et la transcription si vous en avez une."],
        ["/docs/share/", "Partager une observation",
          "Un lien à envoyer, ou deux lignes de HTML sur votre propre page. Les deux avec un exemple qui marche, à essayer et à copier."],
      ],
      es: [
        ["/docs/create/", "Crear una observación",
          "En el editor, o escribiendo tú mismo el archivo. Ambos producen lo mismo: un archivo JSON que es tuyo."],
        ["/docs/create/interpretation/", "Crear una interpretación",
          "En el editor de casos, o en el archivo del caso: una explicación alternativa de lo que se vio, como una observación aparte."],
        ["/docs/create/interview/", "Crear una entrevista",
          "En el editor de casos, o en los archivos: quién participó, cómo, y la transcripción si la tienes."],
        ["/docs/share/", "Compartir una observación",
          "Un enlace para enviar, o dos líneas de HTML en tu propia página. Ambos con un ejemplo que funciona, para probar y copiar."],
      ],
      it: [
        ["/docs/create/", "Creare un'osservazione",
          "Nell'editor, o scrivendo tu stesso il file. Entrambi producono la stessa cosa: un file JSON che è tuo."],
        ["/docs/create/interpretation/", "Creare un'interpretazione",
          "Nell'editor di casi, o nel file del caso: una spiegazione alternativa di ciò che è stato visto, come osservazione a parte."],
        ["/docs/create/interview/", "Creare un'intervista",
          "Nell'editor di casi, o nei file: chi ha preso parte, come, e la trascrizione se c'è."],
        ["/docs/share/", "Condividere un'osservazione",
          "Un link da inviare, o due righe di HTML sulla tua pagina. Entrambi con un esempio funzionante da provare e copiare."],
      ]
    } satisfies Said<ReadonlyArray<Card>>)[language]
    const understanding: ReadonlyArray<Card> = ({
      en: [
        ["/docs/case/", "What is a UFO case?",
          "What a case gathers, the three kinds of event it holds (observations, interpretations, interviews) and how they can be linked."],
        ["/docs/format/", "Observations",
          "What an observation is, then what its file holds, field by field. With a whole example."],
        ["/docs/interview/", "Interviews",
          "What an interview of a case holds: the event, its transcript, passages taken out, who approved it, links to the observation, and importing a transcript from another format."]
      ],
      fr: [
        ["/docs/case/", "Qu'est-ce qu'un dossier ufologique ?",
          "Ce qu'un dossier réunit, les trois sortes d'événements qu'il contient (observations, interprétations, interviews) et comment ils peuvent être liés."],
        ["/docs/format/", "Les observations",
          "Ce qu'est une observation, puis ce que contient son fichier, champ par champ. Avec un exemple entier."],
        ["/docs/interview/", "Les interviews",
          "Ce que contient une interview d'un dossier : l'événement, sa transcription, les passages retirés, qui l'a approuvée, les liens avec l'observation, et l'import d'une transcription d'un autre format."]
      ],
      es: [
        ["/docs/case/", "¿Qué es un caso ovni?",
          "Lo que reúne un caso, los tres tipos de evento que contiene (observaciones, interpretaciones, entrevistas) y cómo pueden estar vinculados."],
        ["/docs/format/", "Las observaciones",
          "Qué es una observación, y luego lo que contiene su archivo, campo por campo. Con un ejemplo completo."],
        ["/docs/interview/", "Las entrevistas",
          "Lo que contiene una entrevista de un caso: el evento, su transcripción, los pasajes eliminados, quién la aprobó, los vínculos con la observación y la importación de una transcripción de otro formato."]
      ],
      it: [
        ["/docs/case/", "Che cos'è un caso ufologico?",
          "Cosa riunisce un caso, i tre tipi di evento che contiene (osservazioni, interpretazioni, interviste) e come possono essere collegati."],
        ["/docs/format/", "Le osservazioni",
          "Che cos'è un'osservazione, poi che cosa contiene il suo file, campo per campo. Con un esempio completo."],
        ["/docs/interview/", "Le interviste",
          "Cosa contiene un'intervista di un caso: l'evento, la sua trascrizione, i passaggi rimossi, chi l'ha approvata, i legami con l'osservazione e l'importazione di una trascrizione da un altro formato."]
      ]
    } satisfies Said<ReadonlyArray<Card>>)[language]
    // What a case is comes first, the three pages that say it; then what to do; then what a builder needs.
    const grid = (cards: ReadonlyArray<Card>) => cards.map(([href, title, blurb]) => `      <a class="use" href="${href}">
        <h3>${title}</h3>
        <p>${blurb}</p>
      </a>`).join("\n")

    return `
<section class="band hero">
  <div class="wrap">
    <p class="eyebrow">${({ en: "Seven pages", fr: "Sept pages", es: "Siete páginas", it: "Sette pagine" })[language]}</p>
    <h1>${({
      en: "UFO@home documentation",
      fr: "Documentation d'UFO@home",
      es: "Documentación de UFO@home",
      it: "Documentazione di UFO@home"
    })[language]}</h1>
    <p class="lede">${({
      en: "What a UFO case is and what it holds, how to create an observation, how to share or embed it, and where its data comes from. Arranged by the question being asked: take the one that is yours.",
      fr: "Ce qu'est un dossier ufologique et ce qu'il contient, comment créer une observation, comment la partager ou l'intégrer, et d'où viennent ses données. Rangées par la question posée : prenez celle qui est la vôtre.",
      es: "Qué es un caso ovni y qué contiene, cómo crear una observación, cómo compartirla o integrarla y de dónde proceden sus datos. Ordenadas por la pregunta que se plantea: elige la tuya.",
      it: "Che cos'è un caso ufologico e cosa contiene, come creare un'osservazione, come condividerla o integrarla e da dove vengono i suoi dati. Ordinate secondo la domanda posta: scegli la tua."
    })[language]}</p>
  </div>
</section>

<section class="band">
  <div class="wrap">
    <h2>${({ en: "Understanding", fr: "Comprendre", es: "Comprender", it: "Capire" })[language]}</h2>
    <div class="uses uses-root">
${grid(understanding.slice(0, 1))}
    </div>
    <div class="uses uses-sub">
${grid(understanding.slice(1))}
    </div>
    <h2>${({ en: "Doing", fr: "Faire", es: "Hacer", it: "Fare" })[language]}</h2>
    <div class="uses">
${grid(essentials)}
    </div>

  </div>
</section>

<section class="band">
  <div class="wrap prose-wide">
    <h2>${({
      en: "Getting the sources",
      fr: "Installer les sources",
      es: "Obtener el código fuente",
      it: "Ottenere i sorgenti"
    })[language]}</h2>
    <p>${({
      en: "To debug a behaviour, change something, or take this code and make it your own.",
      fr: "Pour déboguer un comportement, changer quelque chose, ou partir de ce code et en faire le vôtre.",
      es: "Para depurar un comportamiento, cambiar algo, o partir de este código y hacerlo tuyo.",
      it: "Per fare il debug di un comportamento, cambiare qualcosa, o partire da questo codice e farlo tuo."
    })[language]}</p>
    <pre><code>git clone https://github.com/RR0/UfoAtHome.git
npm install
npm run dev          # ${({
      en: "local demo, Vite dev server",
      fr: "démo locale, serveur de développement Vite",
      es: "demo local, servidor de desarrollo Vite",
      it: "demo locale, server di sviluppo Vite"
    })[language]}
npm test             # vitest
npm run build:all    # ${({
      en: "the three embed bundles",
      fr: "les trois bundles d'intégration",
      es: "los tres bundles de integración",
      it: "i tre bundle di integrazione"
    })[language]}</code></pre>
    <p>${({
      en: `The catalogues are generated, not committed by hand: <code>npm run build:stars</code> (HYG),
         <code>npm run build:comets</code> (JPL Horizons), <code>npm run build:novae</code> (AAVSO
         light curves and the historical supernovae) and <code>npm run build:satellites</code>
         (CelesTrak's SATCAT) each rebuild theirs from its public source, so the data is reproducible
         as well as readable. <code>npm run build:tle</code> reduces a local copy of Laurent Chabin's
         orbital element archive (<a href="https://ufowaves.org/gp/my_tles/">ufowaves.org</a>) to the
         weekly files served under <code>/tle/</code>.`,
      fr: `Les catalogues sont engendrés, pas saisis à la main : <code>npm run build:stars</code> (HYG),
         <code>npm run build:comets</code> (JPL Horizons), <code>npm run build:novae</code> (les
         courbes AAVSO et les supernovae historiques) et <code>npm run build:satellites</code>
         (le SATCAT de CelesTrak) reconstruisent chacun le sien depuis sa source publique — la donnée
         est donc reproductible autant que lisible. <code>npm run build:tle</code> réduit une copie
         locale de l'archive d'éléments orbitaux de Laurent Chabin
         (<a href="https://ufowaves.org/gp/my_tles/">ufowaves.org</a>) aux fichiers hebdomadaires
         servis sous <code>/tle/</code>.`,
      es: `Los catálogos se generan, no se escriben a mano: <code>npm run build:stars</code> (HYG),
         <code>npm run build:comets</code> (JPL Horizons), <code>npm run build:novae</code> (las
         curvas de luz de la AAVSO y las supernovas históricas) y <code>npm run build:satellites</code>
         (el SATCAT de CelesTrak) reconstruyen cada uno el suyo a partir de su fuente pública, de modo que
         los datos son reproducibles además de legibles. <code>npm run build:tle</code> reduce una copia
         local del archivo de elementos orbitales de Laurent Chabin
         (<a href="https://ufowaves.org/gp/my_tles/">ufowaves.org</a>) a los ficheros semanales
         servidos en <code>/tle/</code>.`,
      it: `I cataloghi sono generati, non scritti a mano: <code>npm run build:stars</code> (HYG),
         <code>npm run build:comets</code> (JPL Horizons), <code>npm run build:novae</code> (le
         curve di luce dell'AAVSO e le supernove storiche) e <code>npm run build:satellites</code>
         (il SATCAT di CelesTrak) ricostruiscono ciascuno il proprio dalla sua fonte pubblica, così che
         i dati sono riproducibili oltre che leggibili. <code>npm run build:tle</code> riduce una copia
         locale dell'archivio di elementi orbitali di Laurent Chabin
         (<a href="https://ufowaves.org/gp/my_tles/">ufowaves.org</a>) ai file settimanali
         serviti sotto <code>/tle/</code>.`
    })[language]}</p>
    <p>${({
      en: `These pages are the reference. The <a href="https://github.com/RR0/UfoAtHome#readme">README</a>
         says what contributing takes: installing, rebuilding the data, testing, debugging, releasing;
         the reasoning behind each choice is in the code comments. Everything is ${Licence.mit()} — see <a href="/faq/">the FAQ</a> for what that lets you do.`,
      fr: `Ces pages sont la référence. Le <a href="https://github.com/RR0/UfoAtHome#readme">README</a>
         dit ce qu'il faut pour contribuer : installer, reconstruire les données, tester, déboguer,
         publier ; le raisonnement derrière chaque choix est dans les commentaires du code. Tout est en ${Licence.mit()} — voir <a href="/faq/">la FAQ</a> pour ce que cela vous
         autorise.`,
      es: `Estas páginas son la referencia. El <a href="https://github.com/RR0/UfoAtHome#readme">README</a>
         dice lo que hace falta para contribuir: instalar, reconstruir los datos, probar, depurar, publicar;
         el razonamiento detrás de cada decisión está en los comentarios del código. Todo está bajo ${Licence.mit()} — consulta <a href="/faq/">las preguntas frecuentes</a> para saber lo que eso te permite.`,
      it: `Queste pagine sono il riferimento. Il <a href="https://github.com/RR0/UfoAtHome#readme">README</a>
         dice cosa serve per contribuire: installare, ricostruire i dati, testare, fare il debug, pubblicare;
         il ragionamento dietro ogni scelta è nei commenti del codice. Tutto è sotto licenza ${Licence.mit()} — vedi <a href="/faq/">le FAQ</a> per sapere cosa ti consente di fare.`
    })[language]}</p>
  </div>
</section>
`
  }
}
