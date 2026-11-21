import { DocsSection } from "./DocsSection.js"
import type { PageMeta, Said, SiteLanguage } from "../SitePage.js"

/** What the page says, in one language: the markup around it is written once, in `render`. */
interface CaseDocText {
  lede: string
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
    navLabel: { en: "What is a UFO case?", fr: "Qu'est-ce qu'un dossier ufologique ?", es: "¿Qué es un caso ovni?", it: "Che cos'è un caso ufologico?" },
    title: { en: "What is a UFO case?", fr: "Qu'est-ce qu'un dossier ufologique ?", es: "¿Qué es un caso ovni?", it: "Che cos'è un caso ufologico?" },
    description: {
      en: "A case gathers observations, other readings of them and interviews with witnesses, and these events refer to one another.",
      fr: "Un dossier réunit des observations, des lectures qu'on en fait et des interviews de témoins, et ces événements se renvoient les uns aux autres.",
      es: "Un caso reúne observaciones, las lecturas que se hacen de ellas y entrevistas con testigos, y estos eventos se remiten unos a otros.",
      it: "Un caso riunisce osservazioni, le letture che se ne fanno e interviste con i testimoni, e questi eventi si rimandano a vicenda."
    },
    asideFromNav: true
  }

  private readonly text: Said<CaseDocText> = {
    en: {
      lede: "In UFO@home, a case gathers everything that is known about one event: what was seen, by whom, how it can be explained, what the witnesses said when asked.",
      what: "A case is what an investigation is about: a night, a place, a title. It does not describe the event itself. It <strong>lists what happened around it</strong>, as <em>events</em>, each of which is a document of its own. Nobody has to write them all: a case can be one observation, and grow.",
      eventsHeading: "The events of a case",
      eventsIntro: "A case holds three kinds of event.",
      observation: "<strong><a href=\"/docs/format/\">Observations</a>.</strong> Usually at least one: the account of a witness, which UFO@home replays. A case may hold others, <em>other witnesses</em> of the same event, each with their own account, which can disagree.",
      interpretation: "<strong><a href=\"/docs/format/readings/#another-reading-an-interpretation-is-another-sighting\">Readings</a>.</strong> An <em>alternative explanation</em> of what was seen: a kite, a planet, an aircraft, a hoax. It is itself an observation, replayed beside the witness's, so that the two can be compared. When chosen in the player, it is the reading that is shown whole: its own recording (another hour, another lens, with the witness's phenomenon drawn in it to compare) and its own cover picture in place of the account's. What it was tested against appears as a chip in the Summary: its verdict (red, orange or green), with its findings a click away. Editing it opens it in the editor, within its case.",
      interview: "<strong><a href=\"/docs/interview/\">Interviews</a>.</strong> A conversation held with a witness, which fixes what they said when asked. It is not replayed.",
      refsHeading: "The events of a case can be linked",
      refsIntro: "An event is rarely alone: a reading is a reading <em>of</em> something, an interview is held <em>with</em> someone. These references are what a reader follows from one to the other.",
      refsRows: [
        ["A reading → an observation", "A reading names the <strong>primary observation</strong> it explains: the witness's account it is another reading of. The reading cannot be understood without it."],
        ["An interview → an observation", "An interview names the observation of the witness it was held with, or of each witness when there were several."],
        ["An observation → an interview", "The other way round: a passage of an interview can say which <strong>moment of the observation</strong> it tells of. The observation then lists, at that moment, the passages that tell of it, each a link back to the interview."]
      ],
      refsOutro: "An event is referred to by an <code>id</code> that is its own within the case and nowhere else. Only an event that is referred to needs one.",
      editorHeading: "In the case editor",
      editor: "The <a href=\"/edit/\">editor</a> opens a case on its history: its events as cards in the order of time (“Observation of Q. B.”, “Interview of Q. B.”), the one opened shown beside them or in their place. <strong>+ Add an event</strong> adds an event of the kind you choose, and the <strong>File</strong> tab shows the case as text.",
      editorSteps: ["<strong>Opening a case.</strong> Load a <code>case.json</code> from a file or an address, or start from one recording and choose “Add to a case”.", "<strong>The history</strong> lists the events as cards, in the order of time (“Observation of Q. B.”, a reading, “Interview of Q. B.”), with chips to show or hide each kind and a button to group the readings under the observation they read. A card opens its event in its own editor: the observation editor for an observation or a reading, the interview editor for an interview; beside the list when the width allows, else in its place. What you changed in the others is kept.", "<strong>The identifier</strong> of an event, its <code>id</code>, which the other events refer to it by, is not typed in: the editor gives one to an event that has none (the one its recording states for its witness, else one made from its title), and it is changed in the <em>File</em> tab only.", "<strong>+ Add an event</strong> adds an event: an observation (blank, from a file or from an address), a reading of an observation, or an interview (whom it was held with, a title, who held it, through what medium). In the corner of each card, the bin removes the event, the padlock freezes it and the icon beside it clones it.", "<strong>The two tabs</strong> of the case: <em>Events</em>, its history and the event open, and <em>File</em>, the <code>case.json</code> as text, completed from its own schema, to edit, load and save. The two say the same: what is changed in one is changed in the other.", "<strong>Saving</strong> downloads the case with its files (a zip when there are several: <em>Also save the observations</em>, under the arrow beside <em>Save</em>, says whether they go with it). <em>Save</em> is on while changes are not saved: until then they are in the page only, and the editor warns before what would lose them.", "<strong>Reading it.</strong> <em>Read</em> shows the case as a reader sees it: its history beside what is open of it when the width allows, with a field at its top that keeps only the events holding every word typed in it. The reader's pencil comes back to the editor as it was left."],
      techHeading: "Technical part: the case file",
      techIntro: "A case is a <code>case.json</code>, <code>case.schema.json</code> being its schema: a title, a date, and its <code>events</code>. Each event has an <code>eventType</code> (<code>sighting</code>, <code>interpretation</code> or <code>interview</code>), and a <code>url</code> when it has a file of its own, relative to the case. The references are <code>interpretationOf</code> and <code>interviewOf</code>, each an <code>id</code> or a list of them.",
      eventHeading: 'The events',
      caseHeading: 'The case',
      caseRows: [['id', "The case's identifier. On rr0.org it is the dossier's directory name"], ['title', 'What the case is called'], ['summary', 'A sentence or two, in as many languages as you like: what a link to the case says of it where it is shared'], ['image', 'A picture standing for the case where it is only linked to'], ['time', 'When it happened, as RR0 writes a time (<code>"1948-07-24 02:45"</code>, <code>"1954"</code>)'], ['events', 'What happened around it, in order (see below)']],
      eventRows: [['type, eventType', '<code>"event"</code>, and the kind: <code>sighting</code> (an observation, or a reading of one), <code>interview</code>. A case may have kinds of its own (<code>article</code>, <code>image</code>, <code>book</code>…), which UFO@home leaves alone'], ['id', "What other events refer to it by, unique among the case's events. Only an event that is referred to needs one"], ['url', "The event's own file (an observation's recording, an interview's transcript), relative to the case"], ['time, place, title, summary, by', 'When, where, what it is called, what it established, who did it (<code>{ "people": "…" }</code> or <code>{ "org": "…" }</code>)'], ['interpretationOf', "A reading's: the <code>id</code>, or ids, of the primary observations it is a reading of"], ['interviewOf', "An interview's: the <code>id</code>, or ids, of the observations of the witnesses it was held with"], ['medium', "An interview's: <code>in-person</code>, <code>phone</code>, <code>video</code>, <code>chat</code>, <code>email</code>, <code>letter</code> or <code>other</code>"]],
      techOutro: "Everything else a case holds (its classification, its place, its sources) is RR0's to define and passes through UFO@home unread. What UFO@home replays of a case is its observations; it shows its readings beside them, and keeps its interviews.",
      field: 'Field',
      meaning: 'Meaning',
      exampleHeading: 'An example',
      from: "From",
      to: "To",
      how: "How"
    },
    fr: {
      lede: "Dans UFO@home, un dossier réunit tout ce que l'on sait d'un événement : ce qui a été vu, par qui, comment on peut l'expliquer, ce que les témoins ont dit quand on les a interrogés.",
      what: "Un dossier est ce dont parle une enquête : une nuit, un lieu, un titre. Il ne décrit pas l'événement lui-même. Il <strong>liste ce qui s'est passé autour</strong>, sous forme d'<em>événements</em>, chacun étant un document à part. Personne n'a à tous les écrire : un dossier peut n'être qu'une observation, et grandir.",
      eventsHeading: "Les événements d'un dossier",
      eventsIntro: "Un dossier contient trois types d'événements.",
      observation: "<strong><a href=\"/docs/format/\">Des observations</a>.</strong> Généralement au moins une : le compte rendu d'un témoin, qu'UFO@home rejoue. Un dossier peut en contenir plusieurs, faites par d'<em>autres témoins</em> du même événement : chacun a son propre compte rendu, et ces comptes rendus peuvent diverger.",
      interpretation: "<strong><a href=\"/docs/format/readings/#another-reading-an-interpretation-is-another-sighting\">Des lectures</a>.</strong> Une <em>explication alternative</em> de ce qui a été vu : un cerf-volant, une planète, un avion, un canular. C'est elle-même une observation, rejouée à côté de celle du témoin, pour que les deux puissent être comparées. Quand on la choisit dans le lecteur, c'est elle qui est montrée en entier : son propre enregistrement (une autre heure, une autre optique, avec le phénomène du témoin dessiné dedans pour comparer) et sa propre image d'accueil à la place de celle du compte rendu. Ce à quoi elle a été confrontée apparaît dans le Résumé sous forme d'une pastille : son verdict (rouge, orange ou vert), dont un clic affiche les constats. La modifier l'ouvre dans l'éditeur, au sein de son dossier.",
      interview: "<strong><a href=\"/docs/interview/\">Des interviews</a>.</strong> Une conversation menée avec un témoin, qui fixe ce qu'il a dit quand on l'a interrogé. Elle n'est pas rejouée.",
      refsHeading: "Les événements d'un dossier peuvent être liés",
      refsIntro: "Un événement est rarement seul : une lecture est une lecture <em>de</em> quelque chose, une interview est menée <em>avec</em> quelqu'un. Ce sont ces renvois qui permettent de passer d'un événement à l'autre.",
      refsRows: [
        ["Une lecture → une observation", "Une lecture nomme l'<strong>observation primaire</strong> qu'elle explique : le compte rendu du témoin dont elle est une autre lecture. On ne peut la comprendre sans elle."],
        ["Une interview → une observation", "Une interview nomme l'observation du témoin avec qui elle a eu lieu, ou celle de chaque témoin quand ils étaient plusieurs."],
        ["Une observation → une interview", "Dans l'autre sens : un passage d'une interview peut dire de quel <strong>moment de l'observation</strong> il parle. L'observation liste alors, à ce moment, les passages qui en parlent, chacun étant un lien vers l'interview."]
      ],
      refsOutro: "Un événement est désigné par un <code>id</code> qui lui est propre dans le dossier et nulle part ailleurs. Seul un événement auquel on renvoie en a besoin.",
      editorHeading: "Dans l'éditeur de dossier",
      editor: "L'<a href=\"/edit/\">éditeur</a> ouvre un dossier sur son historique : ses événements en cartes dans l'ordre du temps (« Observation de Q. B. », « Interview de Q. B. »), celui qu'on ouvre montré à côté d'eux ou à leur place. <strong>+ Ajouter un événement</strong> ajoute un événement du type choisi, et l'onglet <strong>Fichier</strong> montre le dossier en texte.",
      editorSteps: ["<strong>Ouvrir un dossier.</strong> Chargez un <code>case.json</code> depuis un fichier ou une adresse, ou partez d'un enregistrement et choisissez « Ajouter à un dossier ».", "<strong>L'historique</strong> liste les événements en cartes, dans l'ordre du temps (« Observation de Q. B. », une lecture, « Interview de Q. B. »), avec des pastilles pour montrer ou cacher chaque type et un bouton pour regrouper les lectures sous l'observation qu'elles lisent. Une carte ouvre son événement dans son propre éditeur : l'éditeur d'observation pour une observation ou une lecture, l'éditeur d'interview pour une interview ; à côté de la liste si la largeur le permet, sinon à sa place. Ce que vous avez changé dans les autres est conservé.", "<strong>L'identifiant</strong> d'un événement, son <code>id</code>, par lequel les autres événements le désignent, ne se saisit pas : l'éditeur en donne un à l'événement qui n'en a pas (celui que son enregistrement donne à son témoin, sinon un identifiant tiré de son titre), et il ne se change que dans l'onglet <em>Fichier</em>.", "<strong>+ Ajouter un événement</strong> ajoute un événement : une observation (vierge, depuis un fichier ou une adresse), une lecture d'une observation, ou une interview (avec qui elle a eu lieu, un titre, qui l'a menée, par quel moyen). Dans le coin de chaque carte, la corbeille retire l'événement, le cadenas le gèle et l'icône à côté le clone.", "<strong>Les deux onglets</strong> du dossier : <em>Événements</em> contient son historique et l'événement ouvert ; <em>Fichier</em> montre le <code>case.json</code> en texte, avec une complétion tirée de son schéma, pour le modifier, le charger ou le sauver. Les deux disent la même chose : ce qui change dans l'un change dans l'autre.", "<strong>Sauver</strong> télécharge le dossier avec ses fichiers (un zip quand il y en a plusieurs : <em>Sauver aussi les observations</em>, sous la flèche à côté de <em>Sauver</em>, dit si elles en font partie). <em>Sauver</em> est actif tant que des modifications ne sont pas sauvées : jusque-là, elles n'existent que dans la page, et l'éditeur vous avertit avant toute action qui les ferait perdre.", "<strong>Le lire.</strong> <em>Lire</em> montre le dossier tel qu'un lecteur le voit : son historique à côté de ce qui en est ouvert si la largeur le permet, avec en tête un champ qui ne garde que les événements contenant chaque mot qu'on y tape. Le crayon du lecteur ramène à l'éditeur tel qu'on l'a laissé."],
      techHeading: "Partie technique : le fichier de dossier",
      techIntro: "Un dossier est un <code>case.json</code>, dont <code>case.schema.json</code> est le schéma : un titre, une date, et ses <code>events</code>. Chaque événement a un <code>eventType</code> (<code>sighting</code>, <code>interpretation</code> ou <code>interview</code>), et une <code>url</code> quand il a un fichier à lui, relative au dossier. Les renvois sont <code>interpretationOf</code> et <code>interviewOf</code>, chacun un <code>id</code> ou une liste.",
      eventHeading: 'Les événements',
      caseHeading: 'Le dossier',
      caseRows: [['id', "L'identifiant du dossier. Sur rr0.org, c'est le nom du répertoire du dossier"], ['title', 'Le nom du dossier'], ['summary', "Une phrase ou deux, dans autant de langues qu'on veut : le texte qui accompagne un lien vers le dossier quand on le partage"], ['image', "Une image qui représente le dossier là où on ne fait qu'y renvoyer par un lien"], ['time', 'Quand cela s\'est passé, comme RR0 écrit une date (<code>"1948-07-24 02:45"</code>, <code>"1954"</code>)'], ['events', "Ce qui s'est passé autour, dans l'ordre (voir plus bas)"]],
      eventRows: [['type, eventType', '<code>"event"</code>, et son type : <code>sighting</code> (une observation, ou une lecture), <code>interview</code>. Un dossier peut avoir des types à lui (<code>article</code>, <code>image</code>, <code>book</code>…), qu\'UFO@home laisse de côté'], ['id', 'Ce par quoi les autres événements le désignent, unique parmi les événements du dossier. Seul un événement auquel on renvoie en a besoin'], ['url', "Le fichier propre de l'événement (l'enregistrement d'une observation, la transcription d'une interview), relatif au dossier"], ['time, place, title, summary, by', 'Quand, où, son nom, ce qu\'il a établi, qui l\'a fait (<code>{ "people": "…" }</code> ou <code>{ "org": "…" }</code>)'], ['interpretationOf', "D'une lecture : l'<code>id</code>, ou les ids, des observations primaires dont elle est une lecture"], ['interviewOf', "D'une interview : l'<code>id</code>, ou les ids, des observations des témoins avec qui elle a eu lieu"], ['medium', "D'une interview : <code>in-person</code>, <code>phone</code>, <code>video</code>, <code>chat</code>, <code>email</code>, <code>letter</code> ou <code>other</code>"]],
      techOutro: "Tout le reste d'un dossier (sa classification, son lieu, ses sources) est défini par RR0 : UFO@home le laisse passer sans le lire. Ce qu'UFO@home rejoue d'un dossier, ce sont ses observations ; il montre ses lectures à côté, et garde ses interviews.",
      field: 'Champ',
      meaning: 'Signification',
      exampleHeading: 'Un exemple',
      from: "De",
      to: "Vers",
      how: "Comment"
    },
    es: {
      lede: "En UFO@home, un caso reúne todo lo que se sabe de un suceso: lo que se vio, quién, cómo puede explicarse, lo que dijeron los testigos al ser preguntados.",
      what: "Un caso es de lo que trata una investigación: una noche, un lugar, un título. No describe el suceso en sí. <strong>Enumera lo que ocurrió a su alrededor</strong>, como <em>eventos</em>, cada uno un documento aparte. Nadie tiene que escribirlos todos: un caso puede ser una sola observación, y crecer.",
      eventsHeading: "Los eventos de un caso",
      eventsIntro: "Un caso contiene tres tipos de evento.",
      observation: "<strong><a href=\"/docs/format/\">Observaciones</a>.</strong> Por lo general al menos una: el relato de un testigo, que UFO@home reproduce. Un caso puede contener otras, de <em>otros testigos</em> del mismo suceso, cada una con su propio relato, que pueden discrepar.",
      interpretation: "<strong><a href=\"/docs/format/readings/#another-reading-an-interpretation-is-another-sighting\">Lecturas</a>.</strong> Una <em>explicación alternativa</em> de lo que se vio: una cometa, un planeta, un avión, un engaño. Es a su vez una observación, reproducida junto a la del testigo, para poder compararlas. Cuando se elige en el reproductor, es la lectura la que se muestra entera: su propia grabación (otra hora, otra óptica, con el fenómeno del testigo dibujado en ella para comparar) y su propia imagen de portada en lugar de la del relato. Aquello con lo que se contrastó aparece en el Resumen como una etiqueta: su veredicto (rojo, naranja o verde), con sus pruebas a un clic. Editarla la abre en el editor, dentro de su caso.",
      interview: "<strong><a href=\"/docs/interview/\">Entrevistas</a>.</strong> Una conversación mantenida con un testigo, que fija lo que dijo al ser preguntado. No se reproduce.",
      refsHeading: "Los eventos de un caso pueden estar vinculados",
      refsIntro: "Un evento rara vez está solo: una lectura es una lectura <em>de</em> algo, una entrevista se mantiene <em>con</em> alguien. Estas remisiones son lo que el lector sigue de uno a otro.",
      refsRows: [
        ["Una lectura → una observación", "Una lectura nombra la <strong>observación primaria</strong> que explica: el relato del testigo del que es otra lectura. No se entiende sin ella."],
        ["Una entrevista → una observación", "Una entrevista nombra la observación del testigo con quien se celebró, o la de cada testigo cuando fueron varios."],
        ["Una observación → una entrevista", "En sentido inverso: un pasaje de una entrevista puede decir de qué <strong>momento de la observación</strong> habla. La observación enumera entonces, en ese momento, los pasajes que la cuentan, cada uno un enlace de vuelta a la entrevista."]
      ],
      refsOutro: "Un evento se designa por un <code>id</code> que es propio dentro del caso y en ningún otro sitio. Solo lo necesita un evento al que se remite.",
      editorHeading: "En el editor de casos",
      editor: "El <a href=\"/edit/\">editor</a> abre un caso en su historial: sus eventos como tarjetas en orden cronológico («Observación de Q. B.», «Entrevista a Q. B.»), el que se abre mostrado junto a ellos o en su lugar. <strong>+ Añadir un evento</strong> añade un evento del tipo que elijas, y la pestaña <strong>Archivo</strong> muestra el caso como texto.",
      editorSteps: ["<strong>Abrir un caso.</strong> Carga un <code>case.json</code> desde un archivo o una dirección, o parte de una grabación y elige «Añadir a un caso».", "<strong>El historial</strong> lista los eventos como tarjetas, en orden cronológico («Observación de Q. B.», una lectura, «Entrevista a Q. B.»), con pastillas para mostrar u ocultar cada tipo y un botón para agrupar las lecturas bajo la observación que leen. Una tarjeta abre su evento en su propio editor: el editor de observaciones para una observación o una lectura, el editor de entrevistas para una entrevista; junto a la lista si el ancho lo permite, si no en su lugar. Lo que cambiaste en los demás se conserva.", "<strong>El identificador</strong> de un evento, su <code>id</code>, por el que los demás eventos lo designan, no se escribe: el editor da uno al evento que no lo tiene (el que su grabación da a su testigo, si no uno sacado de su título), y solo se cambia en la pestaña <em>Archivo</em>.", "<strong>+ Añadir un evento</strong> añade un evento: una observación (en blanco, desde un archivo o desde una dirección), una lectura de una observación, o una entrevista (con quién se mantuvo, un título, quién la condujo, por qué medio). En la esquina de cada tarjeta, la papelera quita el evento, el candado lo congela y el icono contiguo lo clona.", "<strong>Las dos pestañas</strong> del caso: <em>Eventos</em>, su historial y el evento abierto, y <em>Archivo</em>, el <code>case.json</code> como texto, completado según su propio esquema, para editar, cargar y guardar. Las dos dicen lo mismo: lo que se cambia en una se cambia en la otra.", "<strong>Guardar</strong> descarga el caso con sus archivos (un zip cuando hay varios: <em>Guardar también las observaciones</em>, bajo la flecha junto a <em>Guardar</em>, dice si van con él). <em>Guardar</em> está activo mientras haya cambios sin guardar: hasta entonces solo están en la página, y el editor avisa antes de lo que los haría perder.", "<strong>Leerlo.</strong> <em>Leer</em> muestra el caso tal como lo ve un lector: su historial junto a lo que está abierto de él si el ancho lo permite, con un campo en lo alto que solo conserva los eventos que contienen cada palabra escrita en él. El lápiz del lector vuelve al editor tal como se dejó."],
      techHeading: "Parte técnica: el archivo del caso",
      techIntro: "Un caso es un <code>case.json</code>, cuyo esquema es <code>case.schema.json</code>: un título, una fecha y sus <code>events</code>. Cada evento tiene un <code>eventType</code> (<code>sighting</code>, <code>interpretation</code> o <code>interview</code>) y una <code>url</code> cuando tiene un archivo propio, relativa al caso. Las remisiones son <code>interpretationOf</code> e <code>interviewOf</code>, cada una un <code>id</code> o una lista.",
      eventHeading: 'Los eventos',
      caseHeading: 'El caso',
      caseRows: [['id', 'El identificador del caso. En rr0.org es el nombre del directorio del expediente'], ['title', 'Cómo se llama el caso'], ['summary', 'Una frase o dos, en tantos idiomas como se quiera: lo que dice de un caso un enlace que lleva a él al compartirse'], ['image', 'Una imagen que representa el caso donde solo se enlaza'], ['time', 'Cuándo ocurrió, como RR0 escribe una fecha (<code>"1948-07-24 02:45"</code>, <code>"1954"</code>)'], ['events', 'Lo que ocurrió a su alrededor, en orden (véase más abajo)']],
      eventRows: [['type, eventType', '<code>"event"</code>, y la clase: <code>sighting</code> (una observación o una lectura), <code>interview</code>. Un caso puede tener clases propias (<code>article</code>, <code>image</code>, <code>book</code>…), que UFO@home deja de lado'], ['id', 'Con lo que los demás eventos lo designan, único entre los eventos del caso. Solo lo necesita un evento al que se remite'], ['url', 'El archivo propio del evento (la grabación de una observación, la transcripción de una entrevista), relativo al caso'], ['time, place, title, summary, by', 'Cuándo, dónde, cómo se llama, lo que estableció, quién lo hizo (<code>{ "people": "…" }</code> o <code>{ "org": "…" }</code>)'], ['interpretationOf', 'De una lectura: el <code>id</code>, o ids, de las observaciones primarias de las que es una lectura'], ['interviewOf', 'De una entrevista: el <code>id</code>, o ids, de las observaciones de los testigos con quienes se celebró'], ['medium', 'De una entrevista: <code>in-person</code>, <code>phone</code>, <code>video</code>, <code>chat</code>, <code>email</code>, <code>letter</code> u <code>other</code>']],
      techOutro: 'Todo lo demás de un caso (su clasificación, su lugar, sus fuentes) lo define RR0 y pasa por UFO@home sin leerse. Lo que UFO@home reproduce de un caso son sus observaciones; muestra sus lecturas al lado y guarda sus entrevistas.',
      field: 'Campo',
      meaning: 'Significado',
      exampleHeading: 'Un ejemplo',
      from: "De",
      to: "A",
      how: "Cómo"
    },
    it: {
      lede: "In UFO@home, un caso riunisce tutto ciò che si sa di un fatto: che cosa è stato visto, da chi, come può essere spiegato, che cosa hanno detto i testimoni quando sono stati interrogati.",
      what: "Un caso è ciò di cui parla un'indagine: una notte, un luogo, un titolo. Non descrive il fatto in sé. <strong>Elenca ciò che è accaduto attorno ad esso</strong>, come <em>eventi</em>, ciascuno un documento a parte. Nessuno deve scriverli tutti: un caso può essere una sola osservazione, e crescere.",
      eventsHeading: "Gli eventi di un caso",
      eventsIntro: "Un caso contiene tre tipi di evento.",
      observation: "<strong><a href=\"/docs/format/\">Osservazioni</a>.</strong> Di solito almeno una: il resoconto di un testimone, che UFO@home riproduce. Un caso può contenerne altre, di <em>altri testimoni</em> dello stesso fatto, ciascuna con il proprio resoconto, che possono divergere.",
      interpretation: "<strong><a href=\"/docs/format/readings/#another-reading-an-interpretation-is-another-sighting\">Letture</a>.</strong> Una <em>spiegazione alternativa</em> di ciò che è stato visto: un aquilone, un pianeta, un aereo, una burla. È a sua volta un'osservazione, riprodotta accanto a quella del testimone, perché le due si possano confrontare. Quando la si sceglie nel lettore, è la lettura a essere mostrata per intero: la sua registrazione (un'altra ora, un'altra ottica, con il fenomeno del testimone disegnato al suo interno per confrontare) e la sua immagine di copertina al posto di quella del resoconto. Ciò con cui è stata confrontata compare nel Riepilogo come un'etichetta: il suo verdetto (rosso, arancione o verde), con le sue verifiche a un clic. Modificarla la apre nell'editor, all'interno del suo caso.",
      interview: "<strong><a href=\"/docs/interview/\">Interviste</a>.</strong> Una conversazione condotta con un testimone, che fissa ciò che ha detto quando è stato interrogato. Non viene riprodotta.",
      refsHeading: "Gli eventi di un caso possono essere collegati",
      refsIntro: "Un evento è raramente solo: una lettura è una lettura <em>di</em> qualcosa, un'intervista si tiene <em>con</em> qualcuno. Questi rimandi sono ciò che il lettore segue dall'uno all'altro.",
      refsRows: [
        ["Una lettura → un'osservazione", "Una lettura nomina l'<strong>osservazione primaria</strong> che spiega: il resoconto del testimone di cui è un'altra lettura. Non si capisce senza di essa."],
        ["Un'intervista → un'osservazione", "Un'intervista nomina l'osservazione del testimone con cui si è tenuta, o quella di ciascun testimone quando erano più d'uno."],
        ["Un'osservazione → un'intervista", "Nell'altro senso: un passaggio di un'intervista può dire di quale <strong>momento dell'osservazione</strong> parla. L'osservazione elenca allora, in quel momento, i passaggi che la raccontano, ciascuno un link di ritorno all'intervista."]
      ],
      refsOutro: "Un evento è designato da un <code>id</code> che gli è proprio nel caso e in nessun altro luogo. Solo un evento a cui si rimanda ne ha bisogno.",
      editorHeading: "Nell'editor di casi",
      editor: "L'<a href=\"/edit/\">editor</a> apre un caso sulla sua cronologia: i suoi eventi come schede in ordine di tempo («Osservazione di Q. B.», «Intervista a Q. B.»), quello aperto mostrato accanto a essi o al loro posto. <strong>+ Aggiungi un evento</strong> aggiunge un evento del tipo che scegli, e la scheda <strong>File</strong> mostra il caso come testo.",
      editorSteps: ["<strong>Aprire un caso.</strong> Carica un <code>case.json</code> da un file o da un indirizzo, oppure parti da una registrazione e scegli «Aggiungi a un caso».", "<strong>La cronologia</strong> elenca gli eventi come schede, in ordine di tempo («Osservazione di Q. B.», una lettura, «Intervista a Q. B.»), con pastiglie per mostrare o nascondere ciascun tipo e un pulsante per raggruppare le letture sotto l'osservazione che leggono. Una scheda apre il suo evento nel suo editor: l'editor di osservazioni per un'osservazione o una lettura, l'editor di interviste per un'intervista; accanto all'elenco se la larghezza lo consente, altrimenti al suo posto. Ciò che hai cambiato negli altri viene conservato.", "<strong>L'identificativo</strong> di un evento, il suo <code>id</code>, con cui gli altri eventi lo designano, non si digita: l'editor ne dà uno all'evento che non ne ha (quello che la sua registrazione dà al suo testimone, altrimenti uno ricavato dal suo titolo), e si cambia solo nella scheda <em>File</em>.", "<strong>+ Aggiungi un evento</strong> aggiunge un evento: un'osservazione (vuota, da un file o da un indirizzo), una lettura di un'osservazione, o un'intervista (con chi si è svolta, un titolo, chi l'ha condotta, con quale mezzo). Nell'angolo di ogni scheda, il cestino toglie l'evento, il lucchetto lo congela e l'icona accanto lo clona.", "<strong>Le due schede</strong> del caso: <em>Eventi</em>, la sua cronologia e l'evento aperto, e <em>File</em>, il <code>case.json</code> come testo, completato secondo il suo schema, da modificare, caricare e salvare. Le due dicono la stessa cosa: ciò che si cambia nell'una si cambia nell'altra.", "<strong>Salvare</strong> scarica il caso con i suoi file (uno zip quando sono più di uno: <em>Salva anche le osservazioni</em>, sotto la freccia accanto a <em>Salva</em>, dice se ne fanno parte). <em>Salva</em> è attivo finché ci sono modifiche non salvate: fino ad allora sono solo nella pagina, e l'editor avverte prima di ciò che le farebbe perdere.", "<strong>Leggerlo.</strong> <em>Leggi</em> mostra il caso come lo vede un lettore: la sua cronologia accanto a ciò che ne è aperto se la larghezza lo consente, con in cima un campo che tiene solo gli eventi che contengono ogni parola digitata. La matita del lettore riporta all'editor com'era stato lasciato."],
      techHeading: "Parte tecnica: il file del caso",
      techIntro: "Un caso è un <code>case.json</code>, il cui schema è <code>case.schema.json</code>: un titolo, una data e i suoi <code>events</code>. Ogni evento ha un <code>eventType</code> (<code>sighting</code>, <code>interpretation</code> o <code>interview</code>) e un <code>url</code> quando ha un file proprio, relativo al caso. I rimandi sono <code>interpretationOf</code> e <code>interviewOf</code>, ciascuno un <code>id</code> o un elenco.",
      eventHeading: 'Gli eventi',
      caseHeading: 'Il caso',
      caseRows: [['id', "L'identificatore del caso. Su rr0.org è il nome della directory del fascicolo"], ['title', 'Come si chiama il caso'], ['summary', 'Una frase o due, in quante lingue si vuole: ciò che dice di un caso un link che vi conduce quando è condiviso'], ['image', "Un'immagine che rappresenta il caso dove è solo linkato"], ['time', 'Quando è accaduto, come RR0 scrive una data (<code>"1948-07-24 02:45"</code>, <code>"1954"</code>)'], ['events', 'Ciò che è accaduto attorno, in ordine (vedi sotto)']],
      eventRows: [['type, eventType', '<code>"event"</code>, e il genere: <code>sighting</code> (un\'osservazione o una lettura), <code>interview</code>. Un caso può avere generi propri (<code>article</code>, <code>image</code>, <code>book</code>…), che UFO@home lascia da parte'], ['id', 'Con cui gli altri eventi lo designano, unico tra gli eventi del caso. Solo un evento a cui si rimanda ne ha bisogno'], ['url', "Il file proprio dell'evento (la registrazione di un'osservazione, la trascrizione di un'intervista), relativo al caso"], ['time, place, title, summary, by', 'Quando, dove, come si chiama, ciò che ha stabilito, chi l\'ha fatto (<code>{ "people": "…" }</code> o <code>{ "org": "…" }</code>)'], ['interpretationOf', "Di una lettura: l'<code>id</code>, o gli id, delle osservazioni primarie di cui è una lettura"], ['interviewOf', "Di un'intervista: l'<code>id</code>, o gli id, delle osservazioni dei testimoni con cui si è tenuta"], ['medium', "Di un'intervista: <code>in-person</code>, <code>phone</code>, <code>video</code>, <code>chat</code>, <code>email</code>, <code>letter</code> oppure <code>other</code>"]],
      techOutro: 'Tutto il resto di un caso (la sua classificazione, il suo luogo, le sue fonti) è RR0 a definirlo e attraversa UFO@home senza essere letto. Ciò che UFO@home riproduce di un caso sono le sue osservazioni; mostra le sue letture accanto e conserva le sue interviste.',
      field: 'Campo',
      meaning: 'Significato',
      exampleHeading: 'Un esempio',
      from: "Da",
      to: "A",
      how: "Come"
    }
  }

  script(): string {
    return this.excerptsScript()
  }

  render(language: SiteLanguage): string {
    const t = this.text[language]
    const table = (rows: ReadonlyArray<[string, string]>): string => `
    <div class="table-scroll"><table>
      <tr><th>${t.field}</th><th>${t.meaning}</th></tr>
      ${rows.map(([field, meaning]) => `<tr><td><code>${field.split(", ").join("</code>, <code>")}</code></td><td>${meaning}</td></tr>`).join("\n      ")}
    </table></div>`
    const rows = t.refsRows.map(([link, how]) => `<tr><td>${link}</td><td>${how}</td></tr>`).join("\n      ")
    // What a case is stands under the title as its subtitle: the page starts on the events.
    const lede = `${t.lede} ${t.what.replace(/<strong>/g, "<em>").replace(/<\/strong>/g, "</em>")}`
    return this.hero(language, this.meta.title, { en: lede, fr: lede, es: lede, it: lede }) + `
<section class="band">
  <div class="wrap prose-wide">
    <h2>${t.eventsHeading}</h2>
    <p>${t.eventsIntro}</p>
    <ul>
      <li>${t.observation}
        <ul>
          <li>${t.interpretation}</li>
        </ul>
      </li>
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
    <p class="small">${this.excerptNote(language)}</p>
    <h3>${t.exampleHeading}</h3>
    <pre data-schema="case"><code>${EXAMPLE.replace(/&/g, "&amp;").replace(/</g, "&lt;")}</code></pre>
    <h3>${t.caseHeading}</h3>${table(t.caseRows)}
    <h3>${t.eventHeading}</h3>${table(t.eventRows)}
    <p>${t.techOutro}</p>${this.caseEditor(language)}
  </div>
</section>
`
  }

  /** `<rr0-case-editor>`, the editor this page's "In the case editor" is about. */
  private caseEditor(language: SiteLanguage): string {
    const said = (en: string, fr: string, es: string, it: string): Said<string> => ({ en, fr, es, it })
    return this.componentSection(language, "rr0-case-editor",
      said(
        "The editor of a case: its events in the order of time, each opened in the editor of its kind, and the case file as text.",
        "L'éditeur de dossier : ses événements dans l'ordre du temps, chacun ouvert dans l'éditeur de son type, et le fichier de dossier en texte.",
        "El editor de casos: sus eventos en orden cronológico, cada uno abierto en el editor de su tipo, y el archivo del caso como texto.",
        "L'editor di casi: i suoi eventi in ordine di tempo, ciascuno aperto nell'editor del suo tipo, e il file del caso come testo."),
      `<script type="module" src="https://ufoathome.org/lib/rr0-sighting-editor.mjs"></script>
<rr0-case-editor src="/cases/saint-lo/case.json"></rr0-case-editor>`,
      said(
        "The module of the recording's editor registers it, with the <code>&lt;rr0-sighting-editor&gt;</code> it holds. The editor of an interview is fetched the first time an interview is shown.",
        "C'est le module de l'éditeur d'enregistrement qui déclare cet élément, ainsi que le <code>&lt;rr0-sighting-editor&gt;</code> qu'il contient. L'éditeur d'interview est chargé la première fois qu'une interview est montrée.",
        "El módulo del editor de grabaciones lo registra, con el <code>&lt;rr0-sighting-editor&gt;</code> que contiene. El editor de entrevistas se descarga la primera vez que se muestra una entrevista.",
        "Il modulo dell'editor di registrazioni lo registra, con il <code>&lt;rr0-sighting-editor&gt;</code> che contiene. L'editor di interviste viene scaricato la prima volta che si mostra un'intervista."),
      [
        ["src", "attribute", said(
          "The address of a case (<code>case.json</code>), or of one recording, which it then offers to add to a case.",
          "L'adresse d'un dossier (<code>case.json</code>), ou d'un seul enregistrement, qu'il propose alors d'ajouter à un dossier.",
          "La dirección de un caso (<code>case.json</code>), o de una sola grabación, que entonces ofrece añadir a un caso.",
          "L'indirizzo di un caso (<code>case.json</code>), o di una sola registrazione, che allora propone di aggiungere a un caso.")],
        ["track", "attribute", said(
          "The address of the recording to open first, relative to the case; by default the first witness's.",
          "L'adresse de l'enregistrement à ouvrir d'abord, relative au dossier ; par défaut celui du premier témoin.",
          "La dirección de la grabación que se abre primero, relativa al caso; por defecto la del primer testigo.",
          "L'indirizzo della registrazione da aprire per prima, relativo al caso; per impostazione predefinita quella del primo testimone.")],
        ["sightingData", "property", said(
          "The recording on show, as a plain object.",
          "L'enregistrement affiché, comme objet simple.",
          "La grabación mostrada, como objeto simple.",
          "La registrazione mostrata, come oggetto semplice.")],
        ["sightingEditor", "property", said(
          "The <code>&lt;rr0-sighting-editor&gt;</code> that holds it, for whoever needs more of it than this element offers.",
          "Le <code>&lt;rr0-sighting-editor&gt;</code> qui le contient, pour qui a besoin de plus que ce que cet élément offre.",
          "El <code>&lt;rr0-sighting-editor&gt;</code> que lo contiene, para quien necesite más de lo que este elemento ofrece.",
          "Il <code>&lt;rr0-sighting-editor&gt;</code> che lo contiene, per chi ha bisogno di più di ciò che questo elemento offre.")],
        ["caseSession", "property", said(
          "The case being edited, when one is open.",
          "Le dossier en cours d'édition, quand un est ouvert.",
          "El caso que se está editando, cuando hay uno abierto.",
          "Il caso in modifica, quando ce n'è uno aperto.")],
        ["dirty", "property", said(
          "True when the case, or any recording of it, has changes not saved.",
          "Vrai quand le dossier, ou l'un de ses enregistrements, a des modifications non sauvées.",
          "Verdadero cuando el caso, o alguna de sus grabaciones, tiene cambios sin guardar.",
          "Vero quando il caso, o una sua registrazione, ha modifiche non salvate.")]
      ])
  }
}
