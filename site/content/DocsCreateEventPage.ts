import { DocsSection } from "./DocsSection.js"
import type { PageMeta, Said, SiteLanguage } from "../SitePage.js"

/** What a "create" page says, in one language. */
interface CreateDocText {
  title: string
  description: string
  lede: string
  editorHeading: string
  editorLead: string
  editorSteps: ReadonlyArray<string>
  handHeading: string
  hand: string
  handOutro: string
  nextHeading: string
  next: string
}

type EventKind = "interpretation" | "interview"

const INTERPRETATION_EXAMPLE = `{
  "events": [
    { "type": "event", "eventType": "sighting", "id": "kite", "interpretationOf": "qb",
      "title": "A kite", "url": "reading-kite.json" }
  ]
}`

const INTERVIEW_EXAMPLE = `{
  "events": [
    { "type": "event", "eventType": "interview", "id": "interview-qb-1", "interviewOf": "qb",
      "time": "2026-10-13 21:27", "medium": "video", "by": [{ "people": "BeauJerome" }],
      "title": { "en": "Video interview with Q. B." }, "url": "interview-qb-1.json" }
  ]
}`

/**
 * "How do I make one?" for the two kinds of event a case holds besides the observation (see DocsCreatePage): an interpretation, and an
 * interview. Each: in the case editor, then by hand, then what to read next. One class, since the two pages have the same shape and differ
 * in their prose.
 */
export class DocsCreateEventPage extends DocsSection {

  readonly meta: PageMeta

  constructor(private readonly kind: EventKind) {
    super()
    const t = DocsCreateEventPage.TEXT[kind]
    this.meta = {
      slug: kind === "interpretation" ? "docs/create/interpretation" : "docs/create/interview",
      navLabel: { en: t.en.title, fr: t.fr.title, es: t.es.title, it: t.it.title },
      title: { en: t.en.title, fr: t.fr.title, es: t.es.title, it: t.it.title },
      description: { en: t.en.description, fr: t.fr.description, es: t.es.description, it: t.it.description },
      asideFromNav: true
    }
  }

  private static readonly TEXT: Record<EventKind, Said<CreateDocText>> = {
    interpretation: {
      en: {
        title: "Create an interpretation",
        description: "Add an alternative explanation of what a witness saw, as an observation of its own, in the case editor or by writing the file.",
        lede: "An interpretation is an alternative explanation of what was seen (a kite, a planet, an aircraft), written as an observation of its own and replayed beside the witness's.",
        editorHeading: "In the case editor",
        editorLead: 'In the case editor, an interpretation is added with the + button, as an observation that names the one it interprets.',
        editorSteps: [
          "Open the case, or add the witness's observation to a new one. The interpretation needs a <em>primary observation</em> to be an interpretation of.",
          "Press <strong>+</strong> and keep the type <em>Observation</em>. In <em>Interpretation of</em>, choose the primary observation: that is what makes it an interpretation and not another witness.",
          "Choose where it starts: <em>a blank recording</em>, <em>a JSON file</em> or <em>an address</em>. Give it a title (“A kite”) and an author, then confirm.",
          "It opens in the observation editor. Describe what the alternative would have looked like: the bodies it is made of (the <em>Bodies</em> group), and which <em>shapes of the witness's account</em> each one explains. The player then shows the two side by side.",
          "Save the case. The primary observation cannot be deleted while an interpretation refers to it: delete the interpretations first."],
        handHeading: "By hand",
        hand: "In <code>case.json</code>, an interpretation is an event of type <code>sighting</code> that names, in <code>interpretationOf</code>, the <code>id</code> of the observation it interprets (or several), and has a <code>url</code> of its own:",
        handOutro: "Its recording is written like any observation, with <code>bodies</code> that say which shapes they <code>explain</code>.",
        nextHeading: "To go on",
        next: "<a href=\"/docs/case/\">What a case is</a>, how events are linked, and <a href=\"/docs/format/#another-reading-an-interpretation-is-another-sighting\">how an interpretation is written</a>, field by field."
      },
      fr: {
        title: "Créer une interprétation",
        description: "Ajouter une explication alternative de ce qu'un témoin a vu, comme une observation à part, dans l'éditeur de dossier ou en écrivant le fichier.",
        lede: "Une interprétation est une explication alternative de ce qui a été vu (un cerf-volant, une planète, un avion), écrite comme une observation à part et rejouée à côté de celle du témoin.",
        editorHeading: "Dans l'éditeur de dossier",
        editorLead: "Dans l'éditeur de dossier, une interprétation s'ajoute avec le bouton +, comme une observation qui nomme celle qu'elle interprète.",
        editorSteps: [
          "Ouvrez le dossier, ou ajoutez l'observation du témoin à un nouveau. L'interprétation a besoin d'une <em>observation primaire</em> dont elle est l'interprétation.",
          "Appuyez sur <strong>+</strong> et gardez le type <em>Observation</em>. Dans <em>Interprétation de</em>, choisissez l'observation primaire : c'est ce qui en fait une interprétation et non un autre témoin.",
          "Choisissez son point de départ : <em>un enregistrement vierge</em>, <em>un fichier JSON</em> ou <em>une adresse</em>. Donnez-lui un titre (« Un cerf-volant ») et un auteur, puis validez.",
          "Elle s'ouvre dans l'éditeur d'observation. Décrivez ce que l'alternative aurait donné : les corps dont elle est faite (le groupe <em>Corps</em>), et quelles <em>formes du compte rendu du témoin</em> chacun explique. Le lecteur montre alors les deux côte à côte.",
          "Sauvez le dossier. L'observation primaire ne peut pas être supprimée tant qu'une interprétation y renvoie : supprimez d'abord les interprétations."],
        handHeading: "À la main",
        hand: "Dans <code>case.json</code>, une interprétation est un événement de type <code>sighting</code> qui nomme, dans <code>interpretationOf</code>, l'<code>id</code> de l'observation qu'il interprète (ou de plusieurs), et qui a son propre <code>url</code> :",
        handOutro: "Son enregistrement s'écrit comme toute observation, avec des <code>bodies</code> qui disent quelles formes ils <code>explain</code>.",
        nextHeading: "Pour aller plus loin",
        next: "<a href=\"/docs/case/\">Ce qu'est un dossier</a>, comment les événements sont liés, et <a href=\"/docs/format/#another-reading-an-interpretation-is-another-sighting\">comment s'écrit une interprétation</a>, champ par champ."
      },
      es: {
        title: "Crear una interpretación",
        description: "Añadir una explicación alternativa de lo que vio un testigo, como una observación aparte, en el editor de casos o escribiendo el archivo.",
        lede: "Una interpretación es una explicación alternativa de lo que se vio (una cometa, un planeta, un avión), escrita como una observación aparte y reproducida junto a la del testigo.",
        editorHeading: "En el editor de casos",
        editorLead: 'En el editor de casos, una interpretación se añade con el botón +, como una observación que nombra la que interpreta.',
        editorSteps: [
          "Abre el caso, o añade la observación del testigo a uno nuevo. La interpretación necesita una <em>observación primaria</em> de la que sea interpretación.",
          "Pulsa <strong>+</strong> y deja el tipo <em>Observación</em>. En <em>Interpretación de</em>, elige la observación primaria: eso la convierte en una interpretación y no en otro testigo.",
          "Elige cómo empieza: <em>una grabación en blanco</em>, <em>un archivo JSON</em> o <em>una dirección</em>. Dale un título («Una cometa») y un autor, y confirma.",
          "Se abre en el editor de observaciones. Describe lo que habría dado la alternativa: los cuerpos de que se compone (el grupo <em>Cuerpos</em>) y qué <em>formas del relato del testigo</em> explica cada uno. El reproductor muestra entonces las dos lado a lado.",
          "Guarda el caso. La observación primaria no puede eliminarse mientras una interpretación remita a ella: elimina antes las interpretaciones."],
        handHeading: "A mano",
        hand: "En <code>case.json</code>, una interpretación es un evento de tipo <code>sighting</code> que nombra, en <code>interpretationOf</code>, el <code>id</code> de la observación que interpreta (o de varias), y tiene su propio <code>url</code>:",
        handOutro: "Su grabación se escribe como cualquier observación, con <code>bodies</code> que dicen qué formas <code>explain</code>.",
        nextHeading: "Para seguir",
        next: "<a href=\"/docs/case/\">Qué es un caso</a>, cómo se vinculan los eventos, y <a href=\"/docs/format/#another-reading-an-interpretation-is-another-sighting\">cómo se escribe una interpretación</a>, campo por campo."
      },
      it: {
        title: "Creare un'interpretazione",
        description: "Aggiungere una spiegazione alternativa di ciò che ha visto un testimone, come osservazione a parte, nell'editor di casi o scrivendo il file.",
        lede: "Un'interpretazione è una spiegazione alternativa di ciò che è stato visto (un aquilone, un pianeta, un aereo), scritta come osservazione a parte e riprodotta accanto a quella del testimone.",
        editorHeading: "Nell'editor di casi",
        editorLead: "Nell'editor di casi, un'interpretazione si aggiunge con il pulsante +, come un'osservazione che nomina quella che interpreta.",
        editorSteps: [
          "Apri il caso, o aggiungi l'osservazione del testimone a uno nuovo. L'interpretazione ha bisogno di un'<em>osservazione primaria</em> di cui sia l'interpretazione.",
          "Premi <strong>+</strong> e lascia il tipo <em>Osservazione</em>. In <em>Interpretazione di</em>, scegli l'osservazione primaria: è ciò che ne fa un'interpretazione e non un altro testimone.",
          "Scegli da dove parte: <em>una registrazione vuota</em>, <em>un file JSON</em> o <em>un indirizzo</em>. Dalle un titolo («Un aquilone») e un autore, poi conferma.",
          "Si apre nell'editor di osservazioni. Descrivi ciò che l'alternativa avrebbe dato: i corpi di cui è fatta (il gruppo <em>Corpi</em>) e quali <em>forme del resoconto del testimone</em> spiega ciascuno. Il lettore mostra allora le due affiancate.",
          "Salva il caso. L'osservazione primaria non può essere eliminata finché un'interpretazione vi rimanda: elimina prima le interpretazioni."],
        handHeading: "A mano",
        hand: "In <code>case.json</code>, un'interpretazione è un evento di tipo <code>sighting</code> che nomina, in <code>interpretationOf</code>, l'<code>id</code> dell'osservazione che interpreta (o di più), e ha un proprio <code>url</code>:",
        handOutro: "La sua registrazione si scrive come qualsiasi osservazione, con <code>bodies</code> che dicono quali forme <code>explain</code>.",
        nextHeading: "Per proseguire",
        next: "<a href=\"/docs/case/\">Che cos'è un caso</a>, come sono collegati gli eventi, e <a href=\"/docs/format/#another-reading-an-interpretation-is-another-sighting\">come si scrive un'interpretazione</a>, campo per campo."
      }
    },
    interview: {
      en: {
        title: "Create an interview",
        description: "Add an interview held with a witness to a case, with its transcript if you have one, in the case editor or by writing the files.",
        lede: "An interview is a conversation held with a witness. Add it to the case, say who took part and how, and give it its transcript if you have one.",
        editorHeading: "In the case editor",
        editorLead: 'In the case editor, an interview is added with the + button, beside the observation of the witness it was held with.',
        editorSteps: [
          "Open the case. The witness's observation has to be in it: an interview is held <em>with</em> an observation.",
          "Press <strong>+</strong> and choose the type <em>Interview</em>. Say whom it was held with (<em>Witness</em>), its title, who held it (<em>Interviewer</em>, one name or several separated by commas), the <em>Medium</em> and the date.",
          "It opens in the interview editor. The <strong>Summary</strong> group holds what it established; tick more witnesses if several were interviewed together.",
          "To add the transcript, open the <strong>File</strong> group and <em>Load a file</em>: your own format, or a WebVTT or SRT file from a recording tool, a text with a name before each turn, or plain paragraphs. What cannot be guessed (who speaks) is corrected in the text.",
          "In the <strong>Exchanges</strong> group, read it as a dialogue. Take out what must not be published (private life, an exact place) by giving the passage a <code>redacted</code> with its reason, and note who has approved the transcript.",
          "Save the case: the interview and its transcript are written beside it."],
        handHeading: "By hand",
        hand: "In <code>case.json</code>, an interview is an event of type <code>interview</code>, with the <code>id</code> of the observation it was held with in <code>interviewOf</code>, and the transcript's file as its <code>url</code>:",
        handOutro: "The transcript is a file of its own, with its speakers and its turns of speech.",
        nextHeading: "To go on",
        next: "<a href=\"/docs/interview/\">What an interview is</a>, passages taken out, approvals, links to the observation, and <a href=\"/docs/interview/#technical-part-the-files\">the transcript file</a>, field by field."
      },
      fr: {
        title: "Créer une interview",
        description: "Ajouter à un dossier une interview menée avec un témoin, avec sa transcription si vous en avez une, dans l'éditeur de dossier ou en écrivant les fichiers.",
        lede: "Une interview est une conversation menée avec un témoin. Ajoutez-la au dossier, dites qui y a pris part et comment, et donnez-lui sa transcription si vous en avez une.",
        editorHeading: "Dans l'éditeur de dossier",
        editorLead: "Dans l'éditeur de dossier, une interview s'ajoute avec le bouton +, à côté de l'observation du témoin avec qui elle a eu lieu.",
        editorSteps: [
          "Ouvrez le dossier. L'observation du témoin doit y figurer : une interview est menée <em>avec</em> une observation.",
          "Appuyez sur <strong>+</strong> et choisissez le type <em>Interview</em>. Dites avec qui elle a eu lieu (<em>Témoin</em>), son titre, qui l'a menée (<em>Enquêteur</em>, un nom ou plusieurs séparés par des virgules), le <em>Moyen</em> et la date.",
          "Elle s'ouvre dans l'éditeur d'interview. Le groupe <strong>Résumé</strong> contient ce qu'elle a établi ; cochez d'autres témoins si plusieurs ont été interrogés ensemble.",
          "Pour ajouter la transcription, ouvrez le groupe <strong>Fichier</strong> et <em>Chargez un fichier</em> : notre format, ou un fichier WebVTT ou SRT venu d'un outil d'enregistrement, un texte avec un nom avant chaque tour, ou de simples paragraphes. Ce qui ne peut pas se deviner (qui parle) se corrige dans le texte.",
          "Dans le groupe <strong>Échanges</strong>, lisez-la comme un dialogue. Retirez ce qui ne doit pas être publié (la vie privée, un lieu exact) en donnant au passage un <code>redacted</code> avec sa raison, et notez qui a approuvé la transcription.",
          "Sauvez le dossier : l'interview et sa transcription sont écrites à côté."],
        handHeading: "À la main",
        hand: "Dans <code>case.json</code>, une interview est un événement de type <code>interview</code>, avec l'<code>id</code> de l'observation avec laquelle elle a eu lieu dans <code>interviewOf</code>, et le fichier de transcription comme <code>url</code> :",
        handOutro: "La transcription est un fichier à part, avec ses locuteurs et ses tours de parole.",
        nextHeading: "Pour aller plus loin",
        next: "<a href=\"/docs/interview/\">Ce qu'est une interview</a>, les passages retirés, les approbations, les liens avec l'observation, et <a href=\"/docs/interview/#technical-part-the-files\">le fichier de transcription</a>, champ par champ."
      },
      es: {
        title: "Crear una entrevista",
        description: "Añadir a un caso una entrevista mantenida con un testigo, con su transcripción si la hay, en el editor de casos o escribiendo los archivos.",
        lede: "Una entrevista es una conversación mantenida con un testigo. Añádela al caso, di quién participó y cómo, y dale su transcripción si la tienes.",
        editorHeading: "En el editor de casos",
        editorLead: 'En el editor de casos, una entrevista se añade con el botón +, junto a la observación del testigo con quien se celebró.',
        editorSteps: [
          "Abre el caso. La observación del testigo debe estar en él: una entrevista se mantiene <em>con</em> una observación.",
          "Pulsa <strong>+</strong> y elige el tipo <em>Entrevista</em>. Indica con quién se celebró (<em>Testigo</em>), su título, quién la realizó (<em>Entrevistador</em>, un nombre o varios separados por comas), el <em>Medio</em> y la fecha.",
          "Se abre en el editor de entrevistas. El grupo <strong>Resumen</strong> contiene lo que estableció; marca más testigos si se entrevistó a varios juntos.",
          "Para añadir la transcripción, abre el grupo <strong>Archivo</strong> y <em>Carga un archivo</em>: nuestro formato, o un archivo WebVTT o SRT de una herramienta de grabación, un texto con un nombre antes de cada turno, o simples párrafos. Lo que no puede adivinarse (quién habla) se corrige en el texto.",
          "En el grupo <strong>Intercambios</strong>, léela como un diálogo. Elimina lo que no debe publicarse (vida privada, un lugar exacto) dando al pasaje un <code>redacted</code> con su razón, y anota quién ha aprobado la transcripción.",
          "Guarda el caso: la entrevista y su transcripción se escriben al lado."],
        handHeading: "A mano",
        hand: "En <code>case.json</code>, una entrevista es un evento de tipo <code>interview</code>, con el <code>id</code> de la observación con la que se celebró en <code>interviewOf</code>, y el archivo de transcripción como <code>url</code>:",
        handOutro: "La transcripción es un archivo aparte, con sus hablantes y sus turnos de palabra.",
        nextHeading: "Para seguir",
        next: "<a href=\"/docs/interview/\">Qué es una entrevista</a>, los pasajes eliminados, las aprobaciones, los vínculos con la observación y <a href=\"/docs/interview/#technical-part-the-files\">el archivo de transcripción</a>, campo por campo."
      },
      it: {
        title: "Creare un'intervista",
        description: "Aggiungere a un caso un'intervista condotta con un testimone, con la sua trascrizione se c'è, nell'editor di casi o scrivendo i file.",
        lede: "Un'intervista è una conversazione condotta con un testimone. Aggiungila al caso, di' chi vi ha preso parte e come, e dalle la sua trascrizione se ce l'hai.",
        editorHeading: "Nell'editor di casi",
        editorLead: "Nell'editor di casi, un'intervista si aggiunge con il pulsante +, accanto all'osservazione del testimone con cui si è tenuta.",
        editorSteps: [
          "Apri il caso. L'osservazione del testimone deve esservi: un'intervista si tiene <em>con</em> un'osservazione.",
          "Premi <strong>+</strong> e scegli il tipo <em>Intervista</em>. Indica con chi si è tenuta (<em>Testimone</em>), il titolo, chi l'ha condotta (<em>Intervistatore</em>, un nome o più separati da virgole), il <em>Mezzo</em> e la data.",
          "Si apre nell'editor di interviste. Il gruppo <strong>Riassunto</strong> contiene ciò che ha stabilito; spunta altri testimoni se più d'uno è stato intervistato insieme.",
          "Per aggiungere la trascrizione, apri il gruppo <strong>File</strong> e <em>Carica un file</em>: il nostro formato, o un file WebVTT o SRT di uno strumento di registrazione, un testo con un nome prima di ogni turno, o semplici paragrafi. Ciò che non si può indovinare (chi parla) si corregge nel testo.",
          "Nel gruppo <strong>Scambi</strong>, leggila come un dialogo. Togli ciò che non va pubblicato (vita privata, un luogo esatto) dando al passaggio un <code>redacted</code> con la sua ragione, e annota chi ha approvato la trascrizione.",
          "Salva il caso: l'intervista e la sua trascrizione vengono scritte accanto."],
        handHeading: "A mano",
        hand: "In <code>case.json</code>, un'intervista è un evento di tipo <code>interview</code>, con l'<code>id</code> dell'osservazione con cui si è tenuta in <code>interviewOf</code>, e il file di trascrizione come <code>url</code>:",
        handOutro: "La trascrizione è un file a parte, con i suoi parlanti e i suoi turni di parola.",
        nextHeading: "Per proseguire",
        next: "<a href=\"/docs/interview/\">Che cos'è un'intervista</a>, i passaggi tolti, le approvazioni, i legami con l'osservazione e <a href=\"/docs/interview/#technical-part-the-files\">il file di trascrizione</a>, campo per campo."
      }
    }
  }

  script(): string {
    return this.excerptsScript()
  }

  render(language: SiteLanguage): string {
    const t = DocsCreateEventPage.TEXT[this.kind][language]
    const example = (this.kind === "interpretation" ? INTERPRETATION_EXAMPLE : INTERVIEW_EXAMPLE).replace(/&/g, "&amp;").replace(/</g, "&lt;")
    return this.hero(language, this.meta.title, { en: t.lede, fr: t.lede, es: t.lede, it: t.lede }) + `
<section class="band">
  <div class="wrap prose-wide">
    <h2>${t.editorHeading}</h2>
    <p>${t.editorLead}</p>
    <ol>
      ${t.editorSteps.map(step => `<li>${step}</li>`).join("\n      ")}
    </ol>

    <h2>${t.handHeading}</h2>
    <p>${t.hand}</p>
    <pre data-schema="case"><code>${example}</code></pre>
    <p>${t.handOutro}</p>

    <h2>${t.nextHeading}</h2>
    <p>${t.next}</p>
  </div>
</section>
`
  }
}
