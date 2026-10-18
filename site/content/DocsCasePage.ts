import { DocsSection } from "./DocsSection.js"
import type { PageMeta, Said, SiteLanguage } from "../SitePage.js"

/** What the page says, in one language: the markup around it is written once, in `render`. */
interface CaseDocText {
  lede: string
  whatHeading: string
  what: string
  eventsHeading: string
  eventsIntro: string
  observation: string
  interpretation: string
  interview: string
  refsHeading: string
  refsIntro: string
  refsRows: ReadonlyArray<[string, string]>
  refsOutro: string
  editorHeading: string
  editor: string
  editorSteps: ReadonlyArray<string>
  techHeading: string
  techIntro: string
  caseHeading: string
  eventHeading: string
  caseRows: ReadonlyArray<[string, string]>
  eventRows: ReadonlyArray<[string, string]>
  techOutro: string
  field: string
  meaning: string
  exampleHeading: string
  from: string
  to: string
  how: string
}

/** A case with one observation, an interpretation of it, and an interview held with its witness. */
const EXAMPLE = `{
  "id": "SaintLo2026",
  "title": "Saint-Lô",
  "time": "2026-08-11 02:30",
  "events": [
    { "type": "event", "eventType": "sighting", "id": "qb", "time": "2026-08-11 02:30", "title": "Q. B.", "url": "observer-saint-lo.json" },
    { "type": "event", "eventType": "sighting", "id": "kite", "interpretationOf": "qb", "title": "A kite", "url": "interpretation-kite.json" },
    { "type": "event", "eventType": "interview", "id": "interview-qb-1", "interviewOf": "qb", "time": "2026-10-13 21:27",
      "medium": "video", "by": [{ "people": "BeauJerome" }], "url": "interview-qb-1.json" }
  ]
}`

/**
 * The case, as the investigation knows it: what it gathers, the three kinds of event it holds, and how the events refer to each other. The
 * observation's and the interview's own pages (DocsFormatPage, DocsInterviewPage) hang from it, each with its technical part.
 */
export class DocsCasePage extends DocsSection {

  readonly meta: PageMeta = {
    slug: "docs/case",
    navLabel: { en: "What is a UFO case?", fr: "Qu'est-ce qu'un cas ufologique ?", es: "¿Qué es un caso ovni?", it: "Che cos'è un caso ufologico?" },
    title: { en: "What is a UFO case?", fr: "Qu'est-ce qu'un cas ufologique ?", es: "¿Qué es un caso ovni?", it: "Che cos'è un caso ufologico?" },
    description: {
      en: "A case gathers observations, other interpretations of them and interviews with witnesses, and these events refer to one another.",
      fr: "Un dossier réunit des observations, d'autres interprétations d'elles et des interviews de témoins, et ces événements se renvoient les uns aux autres.",
      es: "Un caso reúne observaciones, otras interpretaciones de ellas y entrevistas con testigos, y estos eventos se remiten unos a otros.",
      it: "Un caso riunisce osservazioni, altre interpretazioni di esse e interviste con i testimoni, e questi eventi si rimandano a vicenda."
    },
    asideFromNav: true
  }

  private readonly text: Said<CaseDocText> = {
    en: {
      lede: "In UFO@home, a case gathers everything that is known about one event: what was seen, by whom, how it can be explained, what the witnesses said when asked.",
      whatHeading: "What a case is",
      what: "A case is what an investigation is about: a night, a place, a title. It does not describe the event itself. It <strong>lists what happened around it</strong>, as <em>events</em>, each of which is a document of its own. Nobody has to write them all: a case can be one observation, and grow.",
      eventsHeading: "The events of a case",
      eventsIntro: "A case holds three kinds of event.",
      observation: "<strong>Observations.</strong> Usually at least one: the account of a witness, which UFO@home replays. A case may hold others, <strong>other witnesses</strong> of the same event, each with their own account, which can disagree. <a href=\"/docs/format/\">The observation</a> says what one is and has the technical part on its file.",
      interpretation: "<strong>Interpretations.</strong> An <strong>alternative explanation</strong> of what was seen: a kite, a planet, an aircraft, a hoax. It is itself an observation, replayed beside the witness's, so that the two can be compared. <a href=\"/docs/format/#another-reading-an-interpretation-is-another-sighting\">How an interpretation is written</a>.",
      interview: "<strong>Interviews.</strong> A conversation held with a witness, which fixes what they said when asked. It is not replayed. <a href=\"/docs/interview/\">The interview</a> says what one is and has the technical part on its file.",
      refsHeading: "Events refer to one another",
      refsIntro: "An event is rarely alone: an interpretation is an interpretation <em>of</em> something, an interview is held <em>with</em> someone. These references are what a reader follows from one to the other.",
      refsRows: [
        ["An interpretation → an observation", "An interpretation names the <strong>primary observation</strong> it explains: the witness's account it is another interpretation of. The interpretation cannot be understood without it."],
        ["An interview → an observation", "An interview names the observation of the witness it was held with, or of each witness when there were several."],
        ["An observation → an interview", "The other way round: a passage of an interview can say which <strong>moment of the observation</strong> it tells of. The observation then lists, at that moment, the passages that tell of it, each a link back to the interview."]
      ],
      refsOutro: "An event is referred to by an <code>id</code> that is its own within the case and nowhere else. Only an event that is referred to needs one.",
      editorHeading: "In the editor",
      editor: "The <a href=\"/edit/\">editor</a> opens a case as a picker of its events (“Observation of Q. B.”, “Interview of Q. B.”), the chosen one open below. The <strong>+</strong> adds an event of the kind you choose, and the <strong>File</strong> group shows the case as text.",
      editorSteps: ['<strong>Opening a case.</strong> Load a <code>case.json</code> from a file or an address, or start from one recording and choose “Add to a case”.', '<strong>The picker</strong> lists the events (“Observation of Q. B.”, an interpretation, “Interview of Q. B.”). The one you choose opens below, in its own editor: the observation editor for an observation or an interpretation, the interview editor for an interview. What you changed in the others is kept.', "<strong>The identifier</strong> beside the picker is the event's <code>id</code>, which the other events refer to it by. Give one to an event you want to refer to; the editor proposes one, and gives it to an observation an interview is held with.", '<strong>+</strong> adds an event: an observation (blank, from a file or from an address), an interpretation of an observation, or an interview (whom it was held with, a title, who held it, through what medium). The bin removes the event on show.', '<strong>The two groups</strong> of the case: <strong>Events</strong>, the picker and the event on show, and <strong>File</strong>, the <code>case.json</code> as text, completed from its own schema, to edit, load and save. The two say the same: what is changed in one is changed in the other.', '<strong>Saving</strong> downloads the case with its files (a zip when there are several). Until then the case is changed in the page only, and the editor warns before what would be lost.'],
      techHeading: "Technical part: the case file",
      techIntro: "A case is a <code>case.json</code>, <code>case.schema.json</code> being its schema: a title, a date, and its <code>events</code>. Each event has an <code>eventType</code> (<code>sighting</code>, <code>interpretation</code> or <code>interview</code>), and a <code>url</code> when it has a file of its own, relative to the case. The references are <code>interpretationOf</code> and <code>interviewOf</code>, each an <code>id</code> or a list of them.",
      eventHeading: 'The events',
      caseHeading: 'The case',
      caseRows: [['id', "The case's identifier. On rr0.org it is the dossier's directory name"], ['title', 'What the case is called'], ['summary', 'A sentence or two, in as many languages as you like: what a link to the case says of it where it is shared'], ['image', 'A picture standing for the case where it is only linked to'], ['time', 'When it happened, as RR0 writes a time (<code>"1948-07-24 02:45"</code>, <code>"1954"</code>)'], ['events', 'What happened around it, in order (see below)']],
      eventRows: [['type, eventType', '<code>"event"</code>, and the kind: <code>sighting</code> (an observation, or an interpretation of one), <code>interview</code>. A case may have kinds of its own (<code>article</code>, <code>image</code>, <code>book</code>…), which UFO@home leaves alone'], ['id', "What other events refer to it by, unique among the case's events. Only an event that is referred to needs one"], ['url', "The event's own file (an observation's recording, an interview's transcript), relative to the case"], ['time, place, title, summary, by', 'When, where, what it is called, what it established, who did it (<code>{ "people": "…" }</code> or <code>{ "org": "…" }</code>)'], ['interpretationOf', "An interpretation's: the <code>id</code>, or ids, of the primary observations it is an interpretation of"], ['interviewOf', "An interview's: the <code>id</code>, or ids, of the observations of the witnesses it was held with"], ['medium', "An interview's: <code>in-person</code>, <code>phone</code>, <code>video</code>, <code>chat</code>, <code>email</code>, <code>letter</code> or <code>other</code>"]],
      techOutro: "Everything else a case holds (its classification, its place, its sources) is RR0's to define and passes through UFO@home unread. What UFO@home replays of a case is its observations; it shows its interpretations beside them, and keeps its interviews.",
      field: 'Field',
      meaning: 'Meaning',
      exampleHeading: 'An example',
      from: "From",
      to: "To",
      how: "How"
    },
    fr: {
      lede: "Dans UFO@home, un dossier réunit tout ce que l'on sait d'un événement : ce qui a été vu, par qui, comment on peut l'expliquer, ce que les témoins ont dit quand on les a interrogés.",
      whatHeading: "Ce qu'est un dossier",
      what: "Un dossier est ce dont parle une enquête : une nuit, un lieu, un titre. Il ne décrit pas l'événement lui-même. Il <strong>liste ce qui s'est passé autour</strong>, sous forme d'<em>événements</em>, chacun étant un document à part. Personne n'a à tous les écrire : un dossier peut n'être qu'une observation, et grandir.",
      eventsHeading: "Les événements d'un dossier",
      eventsIntro: "Un dossier contient trois sortes d'événements.",
      observation: "<strong>Des observations.</strong> Généralement au moins une : le compte rendu d'un témoin, qu'UFO@home rejoue. Un dossier peut en contenir d'autres, d'<strong>autres témoins</strong> du même événement, chacun avec son propre compte rendu, qui peuvent diverger. <a href=\"/docs/format/\">L'observation</a> dit ce qu'en est une et contient la partie technique sur son fichier.",
      interpretation: "<strong>Des interprétations.</strong> Une <strong>explication alternative</strong> de ce qui a été vu : un cerf-volant, une planète, un avion, un canular. C'est elle-même une observation, rejouée à côté de celle du témoin, pour que les deux se comparent. <a href=\"/docs/format/#another-reading-an-interpretation-is-another-sighting\">Comment s'écrit une interprétation</a>.",
      interview: "<strong>Des interviews.</strong> Une conversation menée avec un témoin, qui fixe ce qu'il a dit quand on l'a interrogé. Elle n'est pas rejouée. <a href=\"/docs/interview/\">L'interview</a> dit ce qu'en est une et contient la partie technique sur son fichier.",
      refsHeading: "Les événements se renvoient les uns aux autres",
      refsIntro: "Un événement est rarement seul : une interprétation est une interprétation <em>de</em> quelque chose, une interview est menée <em>avec</em> quelqu'un. Ces renvois sont ce que suit un lecteur de l'un à l'autre.",
      refsRows: [
        ["Une interprétation → une observation", "Une interprétation nomme l'<strong>observation primaire</strong> qu'elle explique : le compte rendu du témoin dont elle est une autre interprétation. On ne peut la comprendre sans elle."],
        ["Une interview → une observation", "Une interview nomme l'observation du témoin avec qui elle a eu lieu, ou celle de chaque témoin quand ils étaient plusieurs."],
        ["Une observation → une interview", "Dans l'autre sens : un passage d'une interview peut dire de quel <strong>moment de l'observation</strong> il parle. L'observation liste alors, à ce moment, les passages qui la racontent, chacun un lien en retour vers l'interview."]
      ],
      refsOutro: "Un événement est désigné par un <code>id</code> qui lui est propre dans le dossier et nulle part ailleurs. Seul un événement auquel on renvoie en a besoin.",
      editorHeading: "Dans l'éditeur",
      editor: "L'<a href=\"/edit/\">éditeur</a> ouvre un dossier comme un sélecteur de ses événements (« Observation de Q. B. », « Interview de Q. B. »), celui choisi s'ouvrant dessous. Le <strong>+</strong> ajoute un événement du type choisi, et le groupe <strong>Fichier</strong> montre le dossier en texte.",
      editorSteps: ["<strong>Ouvrir un dossier.</strong> Chargez un <code>case.json</code> depuis un fichier ou une adresse, ou partez d'un enregistrement et choisissez « Ajouter à un dossier ».", "<strong>Le sélecteur</strong> liste les événements (« Observation de Q. B. », une interprétation, « Interview de Q. B. »). Celui que vous choisissez s'ouvre dessous, dans son propre éditeur : l'éditeur d'observation pour une observation ou une interprétation, l'éditeur d'interview pour une interview. Ce que vous avez changé dans les autres est conservé.", "<strong>L'identifiant</strong> à côté du sélecteur est l'<code>id</code> de l'événement, par lequel les autres événements le désignent. Donnez-en un à un événement auquel vous voulez renvoyer ; l'éditeur en propose un, et en donne un à l'observation avec laquelle une interview a eu lieu.", "<strong>+</strong> ajoute un événement : une observation (vierge, depuis un fichier ou une adresse), une interprétation d'une observation, ou une interview (avec qui elle a eu lieu, un titre, qui l'a menée, par quel moyen). La corbeille retire l'événement affiché.", "<strong>Les deux groupes</strong> du dossier : les <strong>Événements</strong>, le sélecteur et l'événement affiché, et le <strong>Fichier</strong>, le <code>case.json</code> en texte, complété d'après son propre schéma, à modifier, charger et sauver. Les deux disent la même chose : ce qui change dans l'un change dans l'autre.", "<strong>Sauver</strong> télécharge le dossier avec ses fichiers (un zip quand il y en a plusieurs). Jusque-là le dossier n'est modifié que dans la page, et l'éditeur prévient avant ce qui serait perdu."],
      techHeading: "Partie technique : le fichier de dossier",
      techIntro: "Un dossier est un <code>case.json</code>, dont <code>case.schema.json</code> est le schéma : un titre, une date, et ses <code>events</code>. Chaque événement a un <code>eventType</code> (<code>sighting</code>, <code>interpretation</code> ou <code>interview</code>), et une <code>url</code> quand il a un fichier à lui, relative au dossier. Les renvois sont <code>interpretationOf</code> et <code>interviewOf</code>, chacun un <code>id</code> ou une liste.",
      eventHeading: 'Les événements',
      caseHeading: 'Le dossier',
      caseRows: [['id', "L'identifiant du dossier. Sur rr0.org, c'est le nom du répertoire du dossier"], ['title', 'Le nom du dossier'], ['summary', "Une phrase ou deux, dans autant de langues qu'on veut : ce que dit d'un dossier un lien qui y mène quand on le partage"], ['image', "Une image qui représente le dossier là où il n'est que lié"], ['time', 'Quand cela s\'est passé, comme RR0 écrit une date (<code>"1948-07-24 02:45"</code>, <code>"1954"</code>)'], ['events', "Ce qui s'est passé autour, dans l'ordre (voir plus bas)"]],
      eventRows: [['type, eventType', '<code>"event"</code>, et le genre : <code>sighting</code> (une observation, ou une interprétation), <code>interview</code>. Un dossier peut avoir des genres à lui (<code>article</code>, <code>image</code>, <code>book</code>…), qu\'UFO@home laisse de côté'], ['id', 'Ce par quoi les autres événements le désignent, unique parmi les événements du dossier. Seul un événement auquel on renvoie en a besoin'], ['url', "Le fichier propre de l'événement (l'enregistrement d'une observation, la transcription d'une interview), relatif au dossier"], ['time, place, title, summary, by', 'Quand, où, son nom, ce qu\'il a établi, qui l\'a fait (<code>{ "people": "…" }</code> ou <code>{ "org": "…" }</code>)'], ['interpretationOf', "D'une interprétation : l'<code>id</code>, ou les ids, des observations primaires dont elle est une interprétation"], ['interviewOf', "D'une interview : l'<code>id</code>, ou les ids, des observations des témoins avec qui elle a eu lieu"], ['medium', "D'une interview : <code>in-person</code>, <code>phone</code>, <code>video</code>, <code>chat</code>, <code>email</code>, <code>letter</code> ou <code>other</code>"]],
      techOutro: "Tout le reste d'un dossier (sa classification, son lieu, ses sources) est à RR0 de le définir et traverse UFO@home sans être lu. Ce qu'UFO@home rejoue d'un dossier, ce sont ses observations ; il montre ses interprétations à côté, et garde ses interviews.",
      field: 'Champ',
      meaning: 'Signification',
      exampleHeading: 'Un exemple',
      from: "De",
      to: "Vers",
      how: "Comment"
    },
    es: {
      lede: "En UFO@home, un caso reúne todo lo que se sabe de un suceso: lo que se vio, quién, cómo puede explicarse, lo que dijeron los testigos al ser preguntados.",
      whatHeading: "Qué es un caso",
      what: "Un caso es de lo que trata una investigación: una noche, un lugar, un título. No describe el suceso en sí. <strong>Enumera lo que ocurrió a su alrededor</strong>, como <em>eventos</em>, cada uno un documento aparte. Nadie tiene que escribirlos todos: un caso puede ser una sola observación, y crecer.",
      eventsHeading: "Los eventos de un caso",
      eventsIntro: "Un caso contiene tres tipos de evento.",
      observation: "<strong>Observaciones.</strong> Por lo general al menos una: el relato de un testigo, que UFO@home reproduce. Un caso puede contener otras, de <strong>otros testigos</strong> del mismo suceso, cada una con su propio relato, que pueden discrepar. <a href=\"/docs/format/\">La observación</a> dice qué es una y contiene la parte técnica sobre su archivo.",
      interpretation: "<strong>Interpretaciones.</strong> Una <strong>explicación alternativa</strong> de lo que se vio: una cometa, un planeta, un avión, un engaño. Es a su vez una observación, reproducida junto a la del testigo, para poder compararlas. <a href=\"/docs/format/#another-reading-an-interpretation-is-another-sighting\">Cómo se escribe una interpretación</a>.",
      interview: "<strong>Entrevistas.</strong> Una conversación mantenida con un testigo, que fija lo que dijo al ser preguntado. No se reproduce. <a href=\"/docs/interview/\">La entrevista</a> dice qué es una y contiene la parte técnica sobre su archivo.",
      refsHeading: "Los eventos se remiten unos a otros",
      refsIntro: "Un evento rara vez está solo: una interpretación es una interpretación <em>de</em> algo, una entrevista se mantiene <em>con</em> alguien. Estas remisiones son lo que el lector sigue de uno a otro.",
      refsRows: [
        ["Una interpretación → una observación", "Una interpretación nombra la <strong>observación primaria</strong> que explica: el relato del testigo del que es otra interpretación. No se entiende sin ella."],
        ["Una entrevista → una observación", "Una entrevista nombra la observación del testigo con quien se celebró, o la de cada testigo cuando fueron varios."],
        ["Una observación → una entrevista", "En sentido inverso: un pasaje de una entrevista puede decir de qué <strong>momento de la observación</strong> habla. La observación enumera entonces, en ese momento, los pasajes que la cuentan, cada uno un enlace de vuelta a la entrevista."]
      ],
      refsOutro: "Un evento se designa por un <code>id</code> que es propio dentro del caso y en ningún otro sitio. Solo lo necesita un evento al que se remite.",
      editorHeading: "En el editor",
      editor: "El <a href=\"/edit/\">editor</a> abre un caso como un selector de sus eventos («Observación de Q. B.», «Entrevista a Q. B.»), y el elegido se abre debajo. El <strong>+</strong> añade un evento del tipo elegido, y el grupo <strong>Archivo</strong> muestra el caso como texto.",
      editorSteps: ['<strong>Abrir un caso.</strong> Carga un <code>case.json</code> desde un archivo o una dirección, o parte de una grabación y elige «Añadir a un caso».', '<strong>El selector</strong> enumera los eventos («Observación de Q. B.», una interpretación, «Entrevista a Q. B.»). El que eliges se abre debajo, en su propio editor: el de observación para una observación o una interpretación, el de entrevista para una entrevista. Lo que cambiaste en los demás se conserva.', '<strong>El identificador</strong> junto al selector es el <code>id</code> del evento, por el que los demás eventos lo designan. Da uno a un evento al que quieras remitir; el editor propone uno y se lo da a la observación con la que se celebra una entrevista.', '<strong>+</strong> añade un evento: una observación (en blanco, desde un archivo o una dirección), una interpretación de una observación o una entrevista (con quién se celebró, un título, quién la realizó, por qué medio). La papelera elimina el evento mostrado.', '<strong>Los dos grupos</strong> del caso: los <strong>Eventos</strong>, el selector y el evento mostrado, y el <strong>Archivo</strong>, el <code>case.json</code> como texto, completado según su propio esquema, para editar, cargar y guardar. Ambos dicen lo mismo: lo que cambia en uno cambia en el otro.', '<strong>Guardar</strong> descarga el caso con sus archivos (un zip cuando hay varios). Hasta entonces el caso solo cambia en la página, y el editor avisa antes de lo que se perdería.'],
      techHeading: "Parte técnica: el archivo del caso",
      techIntro: "Un caso es un <code>case.json</code>, cuyo esquema es <code>case.schema.json</code>: un título, una fecha y sus <code>events</code>. Cada evento tiene un <code>eventType</code> (<code>sighting</code>, <code>interpretation</code> o <code>interview</code>) y una <code>url</code> cuando tiene un archivo propio, relativa al caso. Las remisiones son <code>interpretationOf</code> e <code>interviewOf</code>, cada una un <code>id</code> o una lista.",
      eventHeading: 'Los eventos',
      caseHeading: 'El caso',
      caseRows: [['id', 'El identificador del caso. En rr0.org es el nombre del directorio del expediente'], ['title', 'Cómo se llama el caso'], ['summary', 'Una frase o dos, en tantos idiomas como se quiera: lo que dice de un caso un enlace que lleva a él al compartirse'], ['image', 'Una imagen que representa el caso donde solo se enlaza'], ['time', 'Cuándo ocurrió, como RR0 escribe una fecha (<code>"1948-07-24 02:45"</code>, <code>"1954"</code>)'], ['events', 'Lo que ocurrió a su alrededor, en orden (véase más abajo)']],
      eventRows: [['type, eventType', '<code>"event"</code>, y la clase: <code>sighting</code> (una observación o una interpretación), <code>interview</code>. Un caso puede tener clases propias (<code>article</code>, <code>image</code>, <code>book</code>…), que UFO@home deja de lado'], ['id', 'Con lo que los demás eventos lo designan, único entre los eventos del caso. Solo lo necesita un evento al que se remite'], ['url', 'El archivo propio del evento (la grabación de una observación, la transcripción de una entrevista), relativo al caso'], ['time, place, title, summary, by', 'Cuándo, dónde, cómo se llama, lo que estableció, quién lo hizo (<code>{ "people": "…" }</code> o <code>{ "org": "…" }</code>)'], ['interpretationOf', 'De una interpretación: el <code>id</code>, o ids, de las observaciones primarias de las que es una interpretación'], ['interviewOf', 'De una entrevista: el <code>id</code>, o ids, de las observaciones de los testigos con quienes se celebró'], ['medium', 'De una entrevista: <code>in-person</code>, <code>phone</code>, <code>video</code>, <code>chat</code>, <code>email</code>, <code>letter</code> u <code>other</code>']],
      techOutro: 'Todo lo demás de un caso (su clasificación, su lugar, sus fuentes) lo define RR0 y pasa por UFO@home sin leerse. Lo que UFO@home reproduce de un caso son sus observaciones; muestra sus interpretaciones al lado y guarda sus entrevistas.',
      field: 'Campo',
      meaning: 'Significado',
      exampleHeading: 'Un ejemplo',
      from: "De",
      to: "A",
      how: "Cómo"
    },
    it: {
      lede: "In UFO@home, un caso riunisce tutto ciò che si sa di un fatto: che cosa è stato visto, da chi, come può essere spiegato, che cosa hanno detto i testimoni quando sono stati interrogati.",
      whatHeading: "Che cos'è un caso",
      what: "Un caso è ciò di cui parla un'indagine: una notte, un luogo, un titolo. Non descrive il fatto in sé. <strong>Elenca ciò che è accaduto attorno ad esso</strong>, come <em>eventi</em>, ciascuno un documento a parte. Nessuno deve scriverli tutti: un caso può essere una sola osservazione, e crescere.",
      eventsHeading: "Gli eventi di un caso",
      eventsIntro: "Un caso contiene tre tipi di evento.",
      observation: "<strong>Osservazioni.</strong> Di solito almeno una: il resoconto di un testimone, che UFO@home riproduce. Un caso può contenerne altre, di <strong>altri testimoni</strong> dello stesso fatto, ciascuna con il proprio resoconto, che possono divergere. <a href=\"/docs/format/\">L'osservazione</a> dice che cos'è e contiene la parte tecnica sul suo file.",
      interpretation: "<strong>Interpretazioni.</strong> Una <strong>spiegazione alternativa</strong> di ciò che è stato visto: un aquilone, un pianeta, un aereo, una burla. È a sua volta un'osservazione, riprodotta accanto a quella del testimone, perché le due si possano confrontare. <a href=\"/docs/format/#another-reading-an-interpretation-is-another-sighting\">Come si scrive un\'interpretazione</a>.",
      interview: "<strong>Interviste.</strong> Una conversazione condotta con un testimone, che fissa ciò che ha detto quando è stato interrogato. Non viene riprodotta. <a href=\"/docs/interview/\">L'intervista</a> dice che cos'è e contiene la parte tecnica sul suo file.",
      refsHeading: "Gli eventi si rimandano a vicenda",
      refsIntro: "Un evento è raramente solo: un\'interpretazione è un\'interpretazione <em>di</em> qualcosa, un'intervista si tiene <em>con</em> qualcuno. Questi rimandi sono ciò che il lettore segue dall'uno all'altro.",
      refsRows: [
        ["Un\'interpretazione → un'osservazione", "Un\'interpretazione nomina l'<strong>osservazione primaria</strong> che spiega: il resoconto del testimone di cui è un'altra interpretazione. Non si capisce senza di essa."],
        ["Un'intervista → un'osservazione", "Un'intervista nomina l'osservazione del testimone con cui si è tenuta, o quella di ciascun testimone quando erano più d'uno."],
        ["Un'osservazione → un'intervista", "Nell'altro senso: un passaggio di un'intervista può dire di quale <strong>momento dell'osservazione</strong> parla. L'osservazione elenca allora, in quel momento, i passaggi che la raccontano, ciascuno un link di ritorno all'intervista."]
      ],
      refsOutro: "Un evento è designato da un <code>id</code> che gli è proprio nel caso e in nessun altro luogo. Solo un evento a cui si rimanda ne ha bisogno.",
      editorHeading: "Nell'editor",
      editor: "L'<a href=\"/edit/\">editor</a> apre un caso come un selettore dei suoi eventi («Osservazione di Q. B.», «Intervista a Q. B.»), e quello scelto si apre sotto. Il <strong>+</strong> aggiunge un evento del tipo scelto, e il gruppo <strong>File</strong> mostra il caso come testo.",
      editorSteps: ['<strong>Aprire un caso.</strong> Carica un <code>case.json</code> da un file o da un indirizzo, oppure parti da una registrazione e scegli «Aggiungi a un caso».', "<strong>Il selettore</strong> elenca gli eventi («Osservazione di Q. B.», un\'interpretazione, «Intervista a Q. B.»). Quello che scegli si apre sotto, nel suo editor: quello di osservazione per un'osservazione o un\'interpretazione, quello d'intervista per un'intervista. Ciò che hai modificato negli altri viene conservato.", "<strong>L'identificatore</strong> accanto al selettore è l'<code>id</code> dell'evento, con cui gli altri eventi lo designano. Dallo a un evento a cui vuoi rimandare; l'editor ne propone uno e lo dà all'osservazione con cui si tiene un'intervista.", "<strong>+</strong> aggiunge un evento: un'osservazione (vuota, da un file o da un indirizzo), un\'interpretazione di un'osservazione o un'intervista (con chi si è tenuta, un titolo, chi l'ha condotta, con quale mezzo). Il cestino rimuove l'evento mostrato.", "<strong>I due gruppi</strong> del caso: gli <strong>Eventi</strong>, il selettore e l'evento mostrato, e il <strong>File</strong>, il <code>case.json</code> come testo, completato secondo il suo schema, da modificare, caricare e salvare. I due dicono la stessa cosa: ciò che cambia nell'uno cambia nell'altro.", "<strong>Salvare</strong> scarica il caso con i suoi file (uno zip quando sono più d'uno). Fino ad allora il caso è modificato solo nella pagina, e l'editor avvisa prima di ciò che andrebbe perso."],
      techHeading: "Parte tecnica: il file del caso",
      techIntro: "Un caso è un <code>case.json</code>, il cui schema è <code>case.schema.json</code>: un titolo, una data e i suoi <code>events</code>. Ogni evento ha un <code>eventType</code> (<code>sighting</code>, <code>interpretation</code> o <code>interview</code>) e un <code>url</code> quando ha un file proprio, relativo al caso. I rimandi sono <code>interpretationOf</code> e <code>interviewOf</code>, ciascuno un <code>id</code> o un elenco.",
      eventHeading: 'Gli eventi',
      caseHeading: 'Il caso',
      caseRows: [['id', "L'identificatore del caso. Su rr0.org è il nome della directory del fascicolo"], ['title', 'Come si chiama il caso'], ['summary', 'Una frase o due, in quante lingue si vuole: ciò che dice di un caso un link che vi conduce quando è condiviso'], ['image', "Un'immagine che rappresenta il caso dove è solo linkato"], ['time', 'Quando è accaduto, come RR0 scrive una data (<code>"1948-07-24 02:45"</code>, <code>"1954"</code>)'], ['events', 'Ciò che è accaduto attorno, in ordine (vedi sotto)']],
      eventRows: [['type, eventType', '<code>"event"</code>, e il genere: <code>sighting</code> (un\'osservazione o un\'interpretazione), <code>interview</code>. Un caso può avere generi propri (<code>article</code>, <code>image</code>, <code>book</code>…), che UFO@home lascia da parte'], ['id', 'Con cui gli altri eventi lo designano, unico tra gli eventi del caso. Solo un evento a cui si rimanda ne ha bisogno'], ['url', "Il file proprio dell'evento (la registrazione di un'osservazione, la trascrizione di un'intervista), relativo al caso"], ['time, place, title, summary, by', 'Quando, dove, come si chiama, ciò che ha stabilito, chi l\'ha fatto (<code>{ "people": "…" }</code> o <code>{ "org": "…" }</code>)'], ['interpretationOf', "Di un\'interpretazione: l'<code>id</code>, o gli id, delle osservazioni primarie di cui è un\'interpretazione"], ['interviewOf', "Di un'intervista: l'<code>id</code>, o gli id, delle osservazioni dei testimoni con cui si è tenuta"], ['medium', "Di un'intervista: <code>in-person</code>, <code>phone</code>, <code>video</code>, <code>chat</code>, <code>email</code>, <code>letter</code> oppure <code>other</code>"]],
      techOutro: 'Tutto il resto di un caso (la sua classificazione, il suo luogo, le sue fonti) è RR0 a definirlo e attraversa UFO@home senza essere letto. Ciò che UFO@home riproduce di un caso sono le sue osservazioni; mostra le sue interpretazioni accanto e conserva le sue interviste.',
      field: 'Campo',
      meaning: 'Significato',
      exampleHeading: 'Un esempio',
      from: "Da",
      to: "A",
      how: "Come"
    }
  }

  render(language: SiteLanguage): string {
    const t = this.text[language]
    const table = (rows: ReadonlyArray<[string, string]>): string => `
    <div class="table-scroll"><table>
      <tr><th>${t.field}</th><th>${t.meaning}</th></tr>
      ${rows.map(([field, meaning]) => `<tr><td><code>${field.split(", ").join("</code>, <code>")}</code></td><td>${meaning}</td></tr>`).join("\n      ")}
    </table></div>`
    const rows = t.refsRows.map(([link, how]) => `<tr><td>${link}</td><td>${how}</td></tr>`).join("\n      ")
    return this.hero(language, this.meta.title, { en: t.lede, fr: t.lede, es: t.lede, it: t.lede }) + `
<section class="band">
  <div class="wrap prose-wide">
    <h2>${t.whatHeading}</h2>
    <p>${t.what}</p>

    <h2>${t.eventsHeading}</h2>
    <p>${t.eventsIntro}</p>
    <ul>
      <li>${t.observation}</li>
      <li>${t.interpretation}</li>
      <li>${t.interview}</li>
    </ul>

    <h2>${t.refsHeading}</h2>
    <p>${t.refsIntro}</p>
    <div class="table-scroll"><table>
      <tr><th>${t.from} → ${t.to}</th><th>${t.how}</th></tr>
      ${rows}
    </table></div>
    <p>${t.refsOutro}</p>

    <h2>${t.editorHeading}</h2>
    <p>${t.editor}</p>
    <ul>
      ${t.editorSteps.map(step => `<li>${step}</li>`).join("\n      ")}
    </ul>

    <h2>${t.techHeading}</h2>
    <p>${t.techIntro}</p>
    <h3>${t.exampleHeading}</h3>
    <pre><code>${EXAMPLE.replace(/&/g, "&amp;").replace(/</g, "&lt;")}</code></pre>
    <h3>${t.caseHeading}</h3>${table(t.caseRows)}
    <h3>${t.eventHeading}</h3>${table(t.eventRows)}
    <p>${t.techOutro}</p>
  </div>
</section>
`
  }
}
