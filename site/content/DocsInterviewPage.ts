import { DocsSection } from "./DocsSection.js"
import type { PageMeta, Said, SiteLanguage } from "../SitePage.js"

/** What the page says, in one language: the markup around it is written once, in `render`. */
interface InterviewDocText {
  lede: string
  intro: string
  eventHeading: string
  eventIntro: string
  eventRows: ReadonlyArray<[string, string]>
  fileHeading: string
  fileIntro: string
  fileRows: ReadonlyArray<[string, string]>
  segmentHeading: string
  segmentIntro: string
  segmentRows: ReadonlyArray<[string, string]>
  exampleHeading: string
  redactionHeading: string
  redaction: string
  proofreadHeading: string
  proofread: string
  peopleHeading: string
  people: string
  linksHeading: string
  links: string
  editorHeading: string
  editor: string
  importHeading: string
  importIntro: string
  importFormats: ReadonlyArray<string>
  importSpeakers: string
  importLimits: string
  dataHeading: string
  data: string
  field: string
  meaning: string
}

/** A short interview file, as the page quotes it. */
const EXAMPLE = `{
  "version": 1,
  "id": "interview-qb-1",
  "language": "fr",
  "title": { "fr": "Entretien avec Q. B." },
  "time": "2026-10-13 21:27",
  "medium": "video",
  "by": [{ "people": "BeauJerome" }],
  "interviewOf": "qb",
  "speakers": {
    "interviewer": { "role": "interviewer", "by": { "people": "BeauJerome" } },
    "witness": { "role": "witness", "title": "Q. B.", "of": "qb" }
  },
  "transcription": { "method": "automatic", "engine": "whisper.cpp large-v3-turbo" },
  "proofreading": { "interviewer": { "status": "approved" }, "witness": { "status": "pending" } },
  "segments": [
    { "speaker": "interviewer", "start": 0, "end": 4.2, "text": "Où étiez-vous ?" },
    { "speaker": "witness", "start": 5, "end": 9, "text": "Dans le parc.", "refs": [{ "at": 0.5 }] },
    { "speaker": "witness", "start": 10, "end": 18, "parts": [
      { "text": "Il n'y en a pas." },
      { "redacted": { "reason": { "fr": "Lieu précis" } } }
    ] },
    { "speaker": "interviewer", "start": 20, "end": 40, "redacted": { "reason": { "fr": "Vie privée" } } }
  ]
}`

/**
 * An interview of a case, as the documentation of its own: the event the case lists, the file it points at, what can be taken out of the
 * file and who must approve it, how it ties to the observation, the editor, and how a transcript that is not in our format is imported.
 *
 * A page of its own, as the sighting has its own (see DocsFormatPage), because an interview is a second kind of event of a case and has its
 * own file.
 */
export class DocsInterviewPage extends DocsSection {

  readonly meta: PageMeta = {
    slug: "docs/interview",
    navLabel: { en: "The interview file", fr: "Le fichier d'interview", es: "El archivo de entrevista", it: "Il file di intervista" },
    title: { en: "The interview file", fr: "Le fichier d'interview", es: "El archivo de entrevista", it: "Il file di intervista" },
    description: {
      en: "An interview of a case: the event, its transcript file, passages taken out, who approved it, its links to the observation, and how to import a transcript that is not in our format.",
      fr: "Une interview d'un dossier : l'événement, son fichier de transcription, les passages retirés, qui l'a approuvé, ses liens avec l'observation, et comment importer une transcription qui n'est pas dans notre format.",
      es: "Una entrevista de un caso: el evento, su archivo de transcripción, los pasajes eliminados, quién la aprobó, sus vínculos con la observación y cómo importar una transcripción que no está en nuestro formato.",
      it: "Un'intervista di un caso: l'evento, il suo file di trascrizione, i passaggi rimossi, chi l'ha approvata, i suoi legami con l'osservazione e come importare una trascrizione che non è nel nostro formato."
    },
    asideFromNav: true
  }

  private readonly text: Said<InterviewDocText> = {
    en: {
      lede: "An interview is the second kind of event a case can hold, after the observation. This is the event, the file that holds its transcript, and what you can do with both.",
      intro: "A case lists what happened around a case: the observers' accounts, and now the interviews held with them. An interview is not replayed: it fixes what an observer said, when, to whom and through what, and its transcript can tie each passage to a moment of the observation.",
      eventHeading: "The event in the case",
      eventIntro: "In <code>case.json</code>, an interview is an event whose <code>eventType</code> is <code>\"interview\"</code>.",
      eventRows: [
        ["id", "What other things refer to it by"],
        ["time", "When it was held, as the case writes a time"],
        ["title", "What it is called, said in as many languages as you like"],
        ["summary", "What it established, in the same way"],
        ["medium", "<code>in-person</code>, <code>phone</code>, <code>video</code>, <code>chat</code>, <code>email</code>, <code>letter</code> or <code>other</code>"],
        ["by", "Who held it: one agent, or several (<code>{ \"people\": \"…\" }</code> or <code>{ \"org\": \"…\" }</code>)"],
        ["interviewOf", "The <code>id</code> of the observation the interview was held with, or a list of them when there were several witnesses"],
        ["url", "The transcript file, when there is one, relative to the case"]
      ],
      fileHeading: "The transcript file",
      fileIntro: "A plain JSON file, <code>interview.schema.json</code> being its schema. It holds everything the event says of the interview (the summary and the file are kept the same, whichever is edited) AND what was said.",
      fileRows: [
        ["version, id, language", "<code>1</code>; the interview's id; the language it was held in"],
        ["title, time, medium, by, interviewOf, summary", "The same as the event's"],
        ["speakers", "Who speaks, by an id of your choice: <code>{ role, by?, title?, of? }</code>. <code>role</code> is <code>interviewer</code> or <code>witness</code>; <code>by</code> an agent for the interviewer; <code>title</code> what a witness is called (initials where unnamed) and <code>of</code> the observation they gave"],
        ["transcription", "How the text was obtained: <code>method</code> (<code>automatic</code> or <code>manual</code>), <code>engine</code>, and a free <code>note</code>"],
        ["proofreading", "Who approved it, by speaker (see below)"],
        ["anonymization", "What was replaced (<code>replaced</code>) and what stands in its place (<code>marker</code>)"],
        ["segments", "The turns of speech, in order"]
      ],
      segmentHeading: "A turn of speech",
      segmentIntro: "Each entry of <code>segments</code> is one turn.",
      segmentRows: [
        ["speaker", "A key of <code>speakers</code>"],
        ["start, end", "Seconds from the beginning of the recording, both optional: a transcript typed by hand has none, and a turn without a time is not in the subtitles"],
        ["text", "What was said"],
        ["redacted", "<code>{ reason }</code>: the whole turn was taken out of the published file. It then has no <code>text</code>"],
        ["parts", "Instead of <code>text</code>, when only a stretch was taken out: a list of <code>{ text }</code> and <code>{ redacted }</code>, in order"],
        ["refs", "The moments of the observation this turn tells of (see “Links with the observation”)"]
      ],
      exampleHeading: "An example",
      redactionHeading: "Taking passages out",
      redaction: "A published transcript may hold less than what was recorded: a private life, a name, an exact place. What is taken out keeps its place (speaker and times) and says <em>why</em> in <code>reason</code>, so that a reader sees a gap and its reason rather than a silent cut. When only a detail goes, use <code>parts</code>: the answer to “are there lights in the park?” stays, the streets that would identify the place go.",
      proofreadHeading: "Who approved it",
      proofread: "A transcript is proofread when every speaker has approved it. <code>proofreading</code> gives each speaker a <code>status</code>: <code>pending</code> (not asked, or no answer), <code>approved</code>, or <code>covered</code>. <code>covered</code> is for a file that holds <em>less</em> than one the speaker already approved (passages removed, nothing added): the earlier approval of the whole is enough, and <code>coveredBy</code> names that fuller version. A speaker who is not listed has not approved.",
      peopleHeading: "Several interviewers, several witnesses",
      people: "An interview may have any number of speakers. <code>by</code> lists every interviewer and <code>interviewOf</code> every observation held with; in the file the first interviewer is <code>interviewer</code>, the next <code>interviewer2</code>, and likewise <code>witness</code>, <code>witness2</code>… The editor keeps them in step with the event.",
      linksHeading: "Links with the observation",
      links: "A turn can say which moment of the observation it tells of: <code>\"refs\": [{ \"at\": 0.5 }]</code>, in seconds from the beginning of the observation. <code>sighting</code> names the observation when the interview was held with several, and <code>range</code> (<code>[from, to]</code> in characters of <code>text</code>) the part of the turn concerned. In the editor a turn with a reference has a button that shows the observation at that moment, and the observation lists, under it, the passages that tell of it (“Reported in …”), each a link back to the turn.",
      editorHeading: "In the editor",
      editor: "<code>&lt;rr0-interview&gt;</code> has three groups: the <strong>Summary</strong> (title, witnesses, medium, date, interviewers, description), the <strong>Exchanges</strong> (the interview read as a dialogue: who said what, the time of each turn as a tooltip, passages taken out blacked out with their reason, who has not approved yet) and the <strong>File</strong> (the transcript as text, completed from its schema, to load and to save). It is a chunk of its own, fetched only when a case has an interview.",
      importHeading: "Importing a transcript that is not in our format",
      importIntro: "Most transcripts come from somewhere else. In the File group, “Load a file” reads, besides JSON:",
      importFormats: [
        "<strong>WebVTT and SRT</strong>, as a recording tool or a subtitle editor writes them: the times are kept, the speaker is the <code>&lt;v Name&gt;</code> tag or a <code>Name:</code> before the text;",
        "<strong>text or Markdown with a name before each turn</strong>: <code>Name: …</code>, <code>[00:12:34] Name: …</code>, <code>Name (00:12:34): …</code>, <code>Q:</code> / <code>R:</code> or <code>Q.</code> / <code>A.</code>; a line with no name goes on the turn before;",
        "<strong>plain paragraphs</strong>: one turn each, with no speaker and no time."
      ],
      importSpeakers: "The names found are matched to the interview's: one that is among those who held it is an interviewer, one that is a witness of the case is that witness. Otherwise the first to speak is the interviewer and the others are witnesses; <code>Q</code> always asks and <code>R</code> or <code>A</code> always answers. All are <code>pending</code> approval, and the note says what file it came from.",
      importLimits: "It guesses, and says so: what it gets wrong is corrected in the File group. Word processor and PDF files are not read: save them as text first. A colon in a sentence is not taken for a speaker unless a name comes back often enough.",
      dataHeading: "In code",
      data: "<code>@rr0/data</code> reads and writes the same files: <code>RR0Interview.fromEventJson</code> / <code>toEventJson</code> for the event, <code>fromFileJson</code> / <code>toFileJson</code> for the file, and <code>proofread</code> says whether everyone approved. In UFO@home, <code>InterviewFile.toVtt</code> makes subtitles from a transcript, <code>InterviewFile.passagesAbout</code> lists the turns that tell of an observation, and <code>InterviewImport.parse</code> reads a foreign file.",
      field: "Field",
      meaning: "Meaning"
    },
    fr: {
      lede: "Une interview est le second type d'événement qu'un dossier peut contenir, après l'observation. Voici l'événement, le fichier qui contient sa transcription, et ce qu'on peut faire des deux.",
      intro: "Un dossier liste ce qui s'est passé autour d'un cas : les comptes rendus des observateurs, et maintenant les interviews menées avec eux. Une interview n'est pas rejouée : elle fixe ce qu'un observateur a dit, quand, à qui et par quel moyen, et sa transcription peut relier chaque passage à un moment de l'observation.",
      eventHeading: "L'événement dans le dossier",
      eventIntro: "Dans <code>case.json</code>, une interview est un événement dont l'<code>eventType</code> vaut <code>\"interview\"</code>.",
      eventRows: [
        ["id", "Ce par quoi d'autres éléments la désignent"],
        ["time", "Quand elle a eu lieu, comme le dossier écrit une date"],
        ["title", "Son nom, dit dans autant de langues qu'on veut"],
        ["summary", "Ce qu'elle a établi, de la même façon"],
        ["medium", "<code>in-person</code>, <code>phone</code>, <code>video</code>, <code>chat</code>, <code>email</code>, <code>letter</code> ou <code>other</code>"],
        ["by", "Qui l'a menée : un agent, ou plusieurs (<code>{ \"people\": \"…\" }</code> ou <code>{ \"org\": \"…\" }</code>)"],
        ["interviewOf", "L'<code>id</code> de l'observation avec laquelle elle a eu lieu, ou une liste quand il y avait plusieurs témoins"],
        ["url", "Le fichier de transcription, s'il y en a un, relatif au dossier"]
      ],
      fileHeading: "Le fichier de transcription",
      fileIntro: "Un fichier JSON simple, dont <code>interview.schema.json</code> est le schéma. Il contient tout ce que l'événement dit de l'interview (le résumé et le fichier restent identiques, quel que soit celui qu'on modifie) ET ce qui a été dit.",
      fileRows: [
        ["version, id, language", "<code>1</code> ; l'id de l'interview ; la langue dans laquelle elle s'est tenue"],
        ["title, time, medium, by, interviewOf, summary", "Les mêmes que ceux de l'événement"],
        ["speakers", "Qui parle, sous un id de votre choix : <code>{ role, by?, title?, of? }</code>. <code>role</code> vaut <code>interviewer</code> ou <code>witness</code> ; <code>by</code> est l'agent de l'enquêteur ; <code>title</code> comment on appelle un témoin (ses initiales s'il n'est pas nommé) et <code>of</code> l'observation qu'il a donnée"],
        ["transcription", "Comment le texte a été obtenu : <code>method</code> (<code>automatic</code> ou <code>manual</code>), <code>engine</code>, et une <code>note</code> libre"],
        ["proofreading", "Qui l'a approuvée, par locuteur (voir plus bas)"],
        ["anonymization", "Ce qui a été remplacé (<code>replaced</code>) et ce qui le remplace (<code>marker</code>)"],
        ["segments", "Les tours de parole, dans l'ordre"]
      ],
      segmentHeading: "Un tour de parole",
      segmentIntro: "Chaque entrée de <code>segments</code> est un tour.",
      segmentRows: [
        ["speaker", "Une clé de <code>speakers</code>"],
        ["start, end", "Secondes depuis le début de l'enregistrement, tous deux facultatifs : une transcription tapée à la main n'en a pas, et un tour sans temps n'est pas dans les sous-titres"],
        ["text", "Ce qui a été dit"],
        ["redacted", "<code>{ reason }</code> : le tour entier a été retiré du fichier publié. Il n'a alors pas de <code>text</code>"],
        ["parts", "À la place de <code>text</code>, quand seul un passage a été retiré : une liste de <code>{ text }</code> et de <code>{ redacted }</code>, dans l'ordre"],
        ["refs", "Les moments de l'observation que ce tour raconte (voir « Liens avec l'observation »)"]
      ],
      exampleHeading: "Un exemple",
      redactionHeading: "Retirer des passages",
      redaction: "Une transcription publiée peut contenir moins que ce qui a été enregistré : la vie privée, un nom, un lieu exact. Ce qui est retiré garde sa place (locuteur et temps) et dit <em>pourquoi</em> dans <code>reason</code>, pour qu'un lecteur voie un trou et sa raison plutôt qu'une coupe silencieuse. Quand seul un détail part, utilisez <code>parts</code> : la réponse à « y a-t-il des éclairages dans le parc ? » reste, les rues qui identifieraient le lieu s'en vont.",
      proofreadHeading: "Qui l'a approuvée",
      proofread: "Une transcription est relue quand chaque locuteur l'a approuvée. <code>proofreading</code> donne à chaque locuteur un <code>status</code> : <code>pending</code> (pas demandé, ou sans réponse), <code>approved</code>, ou <code>covered</code>. <code>covered</code> vaut pour un fichier qui contient <em>moins</em> que ce que le locuteur a déjà approuvé (passages retirés, rien d'ajouté) : l'approbation antérieure du tout suffit, et <code>coveredBy</code> nomme cette version plus complète. Un locuteur qui n'est pas listé n'a pas approuvé.",
      peopleHeading: "Plusieurs enquêteurs, plusieurs témoins",
      people: "Une interview peut avoir autant de locuteurs qu'on veut. <code>by</code> liste chaque enquêteur et <code>interviewOf</code> chaque observation avec laquelle elle a eu lieu ; dans le fichier, le premier enquêteur est <code>interviewer</code>, le suivant <code>interviewer2</code>, et de même <code>witness</code>, <code>witness2</code>… L'éditeur les garde en accord avec l'événement.",
      linksHeading: "Liens avec l'observation",
      links: "Un tour peut dire de quel moment de l'observation il parle : <code>\"refs\": [{ \"at\": 0.5 }]</code>, en secondes depuis le début de l'observation. <code>sighting</code> nomme l'observation quand l'interview en concerne plusieurs, et <code>range</code> (<code>[de, à]</code> en caractères de <code>text</code>) la partie du tour concernée. Dans l'éditeur, un tour avec une référence a un bouton qui montre l'observation à ce moment, et l'observation liste, dessous, les passages qui la racontent (« Relaté dans … »), chacun un lien en retour vers le tour.",
      editorHeading: "Dans l'éditeur",
      editor: "<code>&lt;rr0-interview&gt;</code> a trois groupes : le <strong>Résumé</strong> (titre, témoins, moyen, date, enquêteurs, description), les <strong>Échanges</strong> (l'interview lue comme un dialogue : qui a dit quoi, le temps de chaque tour en infobulle, les passages retirés noircis avec leur raison, qui n'a pas encore approuvé) et le <strong>Fichier</strong> (la transcription en texte, complétée d'après son schéma, à charger et à sauver). C'est un morceau à part, chargé seulement quand un dossier contient une interview.",
      importHeading: "Importer une transcription qui n'est pas dans notre format",
      importIntro: "La plupart des transcriptions viennent d'ailleurs. Dans le groupe Fichier, « Charger un fichier » lit, en plus du JSON :",
      importFormats: [
        "<strong>WebVTT et SRT</strong>, tels qu'un outil d'enregistrement ou un éditeur de sous-titres les écrit : les temps sont gardés, le locuteur est la balise <code>&lt;v Nom&gt;</code> ou un <code>Nom :</code> avant le texte ;",
        "<strong>du texte ou du Markdown avec un nom avant chaque tour</strong> : <code>Nom : …</code>, <code>[00:12:34] Nom : …</code>, <code>Nom (00:12:34) : …</code>, <code>Q :</code> / <code>R :</code> ou <code>Q.</code> / <code>A.</code> ; une ligne sans nom prolonge le tour précédent ;",
        "<strong>de simples paragraphes</strong> : un tour chacun, sans locuteur ni temps."
      ],
      importSpeakers: "Les noms trouvés sont rapprochés de ceux de l'interview : un nom qui est parmi ceux qui l'ont menée est un enquêteur, un nom qui est un témoin du dossier est ce témoin. Sinon, le premier à parler est l'enquêteur et les autres sont des témoins ; <code>Q</code> interroge toujours et <code>R</code> ou <code>A</code> répond toujours. Tous sont en attente d'approbation (<code>pending</code>), et la note dit de quel fichier cela vient.",
      importLimits: "Il devine, et le dit : ce qu'il rate se corrige dans le groupe Fichier. Les fichiers de traitement de texte et les PDF ne sont pas lus : enregistrez-les d'abord en texte. Un deux-points dans une phrase n'est pas pris pour un locuteur tant qu'un nom ne revient pas assez souvent.",
      dataHeading: "En code",
      data: "<code>@rr0/data</code> lit et écrit les mêmes fichiers : <code>RR0Interview.fromEventJson</code> / <code>toEventJson</code> pour l'événement, <code>fromFileJson</code> / <code>toFileJson</code> pour le fichier, et <code>proofread</code> dit si tous ont approuvé. Dans UFO@home, <code>InterviewFile.toVtt</code> fait des sous-titres d'une transcription, <code>InterviewFile.passagesAbout</code> liste les tours qui racontent une observation, et <code>InterviewImport.parse</code> lit un fichier étranger.",
      field: "Champ",
      meaning: "Signification"
    },
    es: {
      lede: "Una entrevista es el segundo tipo de evento que puede contener un caso, después de la observación. Este es el evento, el archivo con su transcripción y lo que se puede hacer con ambos.",
      intro: "Un caso enumera lo que ocurrió en torno a un suceso: los relatos de los observadores y ahora las entrevistas realizadas con ellos. Una entrevista no se reproduce: fija lo que dijo un observador, cuándo, a quién y por qué medio, y su transcripción puede vincular cada pasaje con un momento de la observación.",
      eventHeading: "El evento en el caso",
      eventIntro: "En <code>case.json</code>, una entrevista es un evento cuyo <code>eventType</code> es <code>\"interview\"</code>.",
      eventRows: [
        ["id", "Con lo que otras cosas se refieren a ella"],
        ["time", "Cuándo se celebró, como el caso escribe una fecha"],
        ["title", "Cómo se llama, en tantos idiomas como se quiera"],
        ["summary", "Lo que estableció, del mismo modo"],
        ["medium", "<code>in-person</code>, <code>phone</code>, <code>video</code>, <code>chat</code>, <code>email</code>, <code>letter</code> u <code>other</code>"],
        ["by", "Quién la realizó: un agente o varios (<code>{ \"people\": \"…\" }</code> o <code>{ \"org\": \"…\" }</code>)"],
        ["interviewOf", "El <code>id</code> de la observación con la que se celebró, o una lista si hubo varios testigos"],
        ["url", "El archivo de transcripción, si lo hay, relativo al caso"]
      ],
      fileHeading: "El archivo de transcripción",
      fileIntro: "Un archivo JSON simple, cuyo esquema es <code>interview.schema.json</code>. Contiene todo lo que el evento dice de la entrevista (el resumen y el archivo se mantienen iguales, se edite el que se edite) Y lo que se dijo.",
      fileRows: [
        ["version, id, language", "<code>1</code>; el id de la entrevista; el idioma en que se celebró"],
        ["title, time, medium, by, interviewOf, summary", "Los mismos que los del evento"],
        ["speakers", "Quién habla, con un id a tu elección: <code>{ role, by?, title?, of? }</code>. <code>role</code> es <code>interviewer</code> o <code>witness</code>; <code>by</code> el agente del entrevistador; <code>title</code> cómo se llama un testigo (sus iniciales si no se nombra) y <code>of</code> la observación que dio"],
        ["transcription", "Cómo se obtuvo el texto: <code>method</code> (<code>automatic</code> o <code>manual</code>), <code>engine</code> y una <code>note</code> libre"],
        ["proofreading", "Quién la aprobó, por hablante (véase más abajo)"],
        ["anonymization", "Lo que se sustituyó (<code>replaced</code>) y lo que ocupa su lugar (<code>marker</code>)"],
        ["segments", "Los turnos de palabra, en orden"]
      ],
      segmentHeading: "Un turno de palabra",
      segmentIntro: "Cada entrada de <code>segments</code> es un turno.",
      segmentRows: [
        ["speaker", "Una clave de <code>speakers</code>"],
        ["start, end", "Segundos desde el inicio de la grabación, ambos opcionales: una transcripción escrita a mano no los tiene, y un turno sin tiempo no está en los subtítulos"],
        ["text", "Lo que se dijo"],
        ["redacted", "<code>{ reason }</code>: el turno entero se eliminó del archivo publicado. Entonces no tiene <code>text</code>"],
        ["parts", "En lugar de <code>text</code>, cuando solo se eliminó un tramo: una lista de <code>{ text }</code> y <code>{ redacted }</code>, en orden"],
        ["refs", "Los momentos de la observación que cuenta este turno (véase «Vínculos con la observación»)"]
      ],
      exampleHeading: "Un ejemplo",
      redactionHeading: "Eliminar pasajes",
      redaction: "Una transcripción publicada puede contener menos de lo grabado: la vida privada, un nombre, un lugar exacto. Lo eliminado conserva su sitio (hablante y tiempos) y dice <em>por qué</em> en <code>reason</code>, de modo que el lector ve un hueco y su razón en lugar de un corte silencioso. Cuando solo se va un detalle, usa <code>parts</code>: la respuesta a «¿hay luces en el parque?» se queda, las calles que identificarían el lugar se van.",
      proofreadHeading: "Quién la aprobó",
      proofread: "Una transcripción está revisada cuando cada hablante la ha aprobado. <code>proofreading</code> da a cada hablante un <code>status</code>: <code>pending</code> (no se pidió o sin respuesta), <code>approved</code> o <code>covered</code>. <code>covered</code> es para un archivo que contiene <em>menos</em> de lo que el hablante ya aprobó (pasajes eliminados, nada añadido): basta la aprobación anterior del conjunto, y <code>coveredBy</code> nombra esa versión más completa. Un hablante que no figura no ha aprobado.",
      peopleHeading: "Varios entrevistadores, varios testigos",
      people: "Una entrevista puede tener cualquier número de hablantes. <code>by</code> enumera cada entrevistador e <code>interviewOf</code> cada observación con la que se celebró; en el archivo, el primer entrevistador es <code>interviewer</code>, el siguiente <code>interviewer2</code>, y lo mismo <code>witness</code>, <code>witness2</code>… El editor los mantiene de acuerdo con el evento.",
      linksHeading: "Vínculos con la observación",
      links: "Un turno puede decir de qué momento de la observación habla: <code>\"refs\": [{ \"at\": 0.5 }]</code>, en segundos desde el inicio de la observación. <code>sighting</code> nombra la observación cuando la entrevista se celebró con varias, y <code>range</code> (<code>[desde, hasta]</code> en caracteres de <code>text</code>) la parte del turno afectada. En el editor, un turno con referencia tiene un botón que muestra la observación en ese momento, y la observación enumera debajo los pasajes que la cuentan («Relatado en …»), cada uno un enlace de vuelta al turno.",
      editorHeading: "En el editor",
      editor: "<code>&lt;rr0-interview&gt;</code> tiene tres grupos: el <strong>Resumen</strong> (título, testigos, medio, fecha, entrevistadores, descripción), los <strong>Intercambios</strong> (la entrevista leída como un diálogo: quién dijo qué, el tiempo de cada turno en un globo, los pasajes eliminados ennegrecidos con su razón, quién aún no ha aprobado) y el <strong>Archivo</strong> (la transcripción como texto, completada según su esquema, para cargar y guardar). Es un fragmento aparte, que se descarga solo cuando un caso tiene una entrevista.",
      importHeading: "Importar una transcripción que no está en nuestro formato",
      importIntro: "La mayoría de las transcripciones vienen de otra parte. En el grupo Archivo, «Cargar un archivo» lee, además de JSON:",
      importFormats: [
        "<strong>WebVTT y SRT</strong>, como los escribe una herramienta de grabación o un editor de subtítulos: se conservan los tiempos, el hablante es la etiqueta <code>&lt;v Nombre&gt;</code> o un <code>Nombre:</code> antes del texto;",
        "<strong>texto o Markdown con un nombre antes de cada turno</strong>: <code>Nombre: …</code>, <code>[00:12:34] Nombre: …</code>, <code>Nombre (00:12:34): …</code>, <code>Q:</code> / <code>R:</code> o <code>Q.</code> / <code>A.</code>; una línea sin nombre continúa el turno anterior;",
        "<strong>simples párrafos</strong>: un turno cada uno, sin hablante ni tiempo."
      ],
      importSpeakers: "Los nombres hallados se emparejan con los de la entrevista: uno que figura entre quienes la realizaron es un entrevistador, uno que es testigo del caso es ese testigo. Si no, el primero en hablar es el entrevistador y los demás testigos; <code>Q</code> siempre pregunta y <code>R</code> o <code>A</code> siempre responde. Todos quedan pendientes de aprobación (<code>pending</code>), y la nota dice de qué archivo procede.",
      importLimits: "Adivina, y lo dice: lo que falla se corrige en el grupo Archivo. Los archivos de procesador de texto y los PDF no se leen: guárdalos antes como texto. Unos dos puntos en una frase no se toman por un hablante mientras un nombre no se repita lo bastante.",
      dataHeading: "En código",
      data: "<code>@rr0/data</code> lee y escribe los mismos archivos: <code>RR0Interview.fromEventJson</code> / <code>toEventJson</code> para el evento, <code>fromFileJson</code> / <code>toFileJson</code> para el archivo, y <code>proofread</code> dice si todos aprobaron. En UFO@home, <code>InterviewFile.toVtt</code> hace subtítulos de una transcripción, <code>InterviewFile.passagesAbout</code> enumera los turnos que cuentan una observación e <code>InterviewImport.parse</code> lee un archivo ajeno.",
      field: "Campo",
      meaning: "Significado"
    },
    it: {
      lede: "Un'intervista è il secondo tipo di evento che un caso può contenere, dopo l'osservazione. Ecco l'evento, il file con la sua trascrizione e ciò che si può fare con entrambi.",
      intro: "Un caso elenca ciò che è accaduto attorno a un fatto: i resoconti degli osservatori e ora le interviste condotte con loro. Un'intervista non viene riprodotta: fissa ciò che un osservatore ha detto, quando, a chi e con quale mezzo, e la sua trascrizione può collegare ogni passaggio a un momento dell'osservazione.",
      eventHeading: "L'evento nel caso",
      eventIntro: "In <code>case.json</code>, un'intervista è un evento il cui <code>eventType</code> è <code>\"interview\"</code>.",
      eventRows: [
        ["id", "Con cui altri elementi vi fanno riferimento"],
        ["time", "Quando si è tenuta, come il caso scrive una data"],
        ["title", "Come si chiama, in quante lingue si vuole"],
        ["summary", "Ciò che ha stabilito, allo stesso modo"],
        ["medium", "<code>in-person</code>, <code>phone</code>, <code>video</code>, <code>chat</code>, <code>email</code>, <code>letter</code> oppure <code>other</code>"],
        ["by", "Chi l'ha condotta: un agente o più (<code>{ \"people\": \"…\" }</code> o <code>{ \"org\": \"…\" }</code>)"],
        ["interviewOf", "L'<code>id</code> dell'osservazione con cui si è tenuta, o un elenco se c'erano più testimoni"],
        ["url", "Il file di trascrizione, se c'è, relativo al caso"]
      ],
      fileHeading: "Il file di trascrizione",
      fileIntro: "Un semplice file JSON, il cui schema è <code>interview.schema.json</code>. Contiene tutto ciò che l'evento dice dell'intervista (il riassunto e il file restano uguali, comunque si modifichi) E ciò che è stato detto.",
      fileRows: [
        ["version, id, language", "<code>1</code>; l'id dell'intervista; la lingua in cui si è tenuta"],
        ["title, time, medium, by, interviewOf, summary", "Gli stessi dell'evento"],
        ["speakers", "Chi parla, con un id a scelta: <code>{ role, by?, title?, of? }</code>. <code>role</code> è <code>interviewer</code> o <code>witness</code>; <code>by</code> l'agente dell'intervistatore; <code>title</code> come si chiama un testimone (le iniziali se non è nominato) e <code>of</code> l'osservazione che ha dato"],
        ["transcription", "Come è stato ottenuto il testo: <code>method</code> (<code>automatic</code> o <code>manual</code>), <code>engine</code> e una <code>note</code> libera"],
        ["proofreading", "Chi l'ha approvata, per parlante (vedi sotto)"],
        ["anonymization", "Ciò che è stato sostituito (<code>replaced</code>) e ciò che ne prende il posto (<code>marker</code>)"],
        ["segments", "I turni di parola, in ordine"]
      ],
      segmentHeading: "Un turno di parola",
      segmentIntro: "Ogni voce di <code>segments</code> è un turno.",
      segmentRows: [
        ["speaker", "Una chiave di <code>speakers</code>"],
        ["start, end", "Secondi dall'inizio della registrazione, entrambi facoltativi: una trascrizione scritta a mano non ne ha, e un turno senza tempo non è nei sottotitoli"],
        ["text", "Ciò che è stato detto"],
        ["redacted", "<code>{ reason }</code>: l'intero turno è stato tolto dal file pubblicato. Non ha allora <code>text</code>"],
        ["parts", "Al posto di <code>text</code>, quando è stato tolto solo un tratto: un elenco di <code>{ text }</code> e <code>{ redacted }</code>, in ordine"],
        ["refs", "I momenti dell'osservazione di cui parla questo turno (vedi «Legami con l'osservazione»)"]
      ],
      exampleHeading: "Un esempio",
      redactionHeading: "Togliere dei passaggi",
      redaction: "Una trascrizione pubblicata può contenere meno di quanto registrato: la vita privata, un nome, un luogo esatto. Ciò che viene tolto conserva il proprio posto (parlante e tempi) e dice <em>perché</em> in <code>reason</code>, così che il lettore veda un vuoto e la sua ragione anziché un taglio silenzioso. Quando se ne va solo un dettaglio, usa <code>parts</code>: la risposta a «ci sono luci nel parco?» resta, le vie che identificherebbero il luogo se ne vanno.",
      proofreadHeading: "Chi l'ha approvata",
      proofread: "Una trascrizione è rivista quando ogni parlante l'ha approvata. <code>proofreading</code> dà a ogni parlante uno <code>status</code>: <code>pending</code> (non richiesto o senza risposta), <code>approved</code> o <code>covered</code>. <code>covered</code> vale per un file che contiene <em>meno</em> di quanto il parlante ha già approvato (passaggi tolti, nulla aggiunto): basta l'approvazione precedente dell'insieme, e <code>coveredBy</code> nomina quella versione più completa. Un parlante non elencato non ha approvato.",
      peopleHeading: "Più intervistatori, più testimoni",
      people: "Un'intervista può avere un numero qualsiasi di parlanti. <code>by</code> elenca ogni intervistatore e <code>interviewOf</code> ogni osservazione con cui si è tenuta; nel file il primo intervistatore è <code>interviewer</code>, il successivo <code>interviewer2</code>, e così <code>witness</code>, <code>witness2</code>… L'editor li tiene allineati all'evento.",
      linksHeading: "Legami con l'osservazione",
      links: "Un turno può dire di quale momento dell'osservazione parla: <code>\"refs\": [{ \"at\": 0.5 }]</code>, in secondi dall'inizio dell'osservazione. <code>sighting</code> nomina l'osservazione quando l'intervista ne riguarda più d'una, e <code>range</code> (<code>[da, a]</code> in caratteri di <code>text</code>) la parte del turno interessata. Nell'editor un turno con un riferimento ha un pulsante che mostra l'osservazione in quel momento, e l'osservazione elenca sotto i passaggi che la raccontano («Riportato in …»), ciascuno un link di ritorno al turno.",
      editorHeading: "Nell'editor",
      editor: "<code>&lt;rr0-interview&gt;</code> ha tre gruppi: il <strong>Riassunto</strong> (titolo, testimoni, mezzo, data, intervistatori, descrizione), gli <strong>Scambi</strong> (l'intervista letta come un dialogo: chi ha detto cosa, il tempo di ogni turno in un suggerimento, i passaggi tolti anneriti con la loro ragione, chi non ha ancora approvato) e il <strong>File</strong> (la trascrizione come testo, completata secondo il suo schema, da caricare e salvare). È un blocco a parte, scaricato solo quando un caso ha un'intervista.",
      importHeading: "Importare una trascrizione che non è nel nostro formato",
      importIntro: "La maggior parte delle trascrizioni viene da altrove. Nel gruppo File, «Carica un file» legge, oltre al JSON:",
      importFormats: [
        "<strong>WebVTT e SRT</strong>, come li scrive uno strumento di registrazione o un editor di sottotitoli: i tempi vengono conservati, il parlante è il tag <code>&lt;v Nome&gt;</code> o un <code>Nome:</code> prima del testo;",
        "<strong>testo o Markdown con un nome prima di ogni turno</strong>: <code>Nome: …</code>, <code>[00:12:34] Nome: …</code>, <code>Nome (00:12:34): …</code>, <code>Q:</code> / <code>R:</code> o <code>Q.</code> / <code>A.</code>; una riga senza nome prosegue il turno precedente;",
        "<strong>semplici paragrafi</strong>: un turno ciascuno, senza parlante né tempo."
      ],
      importSpeakers: "I nomi trovati vengono abbinati a quelli dell'intervista: uno tra chi l'ha condotta è un intervistatore, uno che è testimone del caso è quel testimone. Altrimenti il primo a parlare è l'intervistatore e gli altri testimoni; <code>Q</code> chiede sempre e <code>R</code> o <code>A</code> risponde sempre. Tutti restano in attesa di approvazione (<code>pending</code>), e la nota dice da quale file proviene.",
      importLimits: "Tira a indovinare, e lo dice: ciò che sbaglia si corregge nel gruppo File. I file di elaboratori di testo e i PDF non vengono letti: salvali prima come testo. Due punti in una frase non sono presi per un parlante finché un nome non ritorna abbastanza spesso.",
      dataHeading: "Nel codice",
      data: "<code>@rr0/data</code> legge e scrive gli stessi file: <code>RR0Interview.fromEventJson</code> / <code>toEventJson</code> per l'evento, <code>fromFileJson</code> / <code>toFileJson</code> per il file, e <code>proofread</code> dice se tutti hanno approvato. In UFO@home, <code>InterviewFile.toVtt</code> ricava sottotitoli da una trascrizione, <code>InterviewFile.passagesAbout</code> elenca i turni che raccontano un'osservazione e <code>InterviewImport.parse</code> legge un file altrui.",
      field: "Campo",
      meaning: "Significato"
    }
  }

  render(language: SiteLanguage): string {
    const t = this.text[language]
    const table = (rows: ReadonlyArray<[string, string]>): string => `
    <div class="table-scroll"><table>
      <tr><th>${t.field}</th><th>${t.meaning}</th></tr>
      ${rows.map(([field, meaning]) => `<tr><td><code>${field.split(", ").join("</code>, <code>")}</code></td><td>${meaning}</td></tr>`).join("\n      ")}
    </table></div>`
    return this.hero(language, this.meta.title, { en: t.lede, fr: t.lede, es: t.lede, it: t.lede }) + `
<section class="band">
  <div class="wrap prose-wide">
    <p>${t.intro}</p>

    <h2>${t.eventHeading}</h2>
    <p>${t.eventIntro}</p>${table(t.eventRows)}

    <h2>${t.fileHeading}</h2>
    <p>${t.fileIntro}</p>${table(t.fileRows)}

    <h3>${t.segmentHeading}</h3>
    <p>${t.segmentIntro}</p>${table(t.segmentRows)}

    <h3>${t.exampleHeading}</h3>
    <pre><code>${EXAMPLE.replace(/&/g, "&amp;").replace(/</g, "&lt;")}</code></pre>

    <h2>${t.redactionHeading}</h2>
    <p>${t.redaction}</p>

    <h2>${t.proofreadHeading}</h2>
    <p>${t.proofread}</p>

    <h2>${t.peopleHeading}</h2>
    <p>${t.people}</p>

    <h2>${t.linksHeading}</h2>
    <p>${t.links}</p>

    <h2>${t.editorHeading}</h2>
    <p>${t.editor}</p>

    <h2>${t.importHeading}</h2>
    <p>${t.importIntro}</p>
    <ul>
      ${t.importFormats.map(format => `<li>${format}</li>`).join("\n      ")}
    </ul>
    <p>${t.importSpeakers}</p>
    <p>${t.importLimits}</p>

    <h2>${t.dataHeading}</h2>
    <p>${t.data}</p>
  </div>
</section>
`
  }
}
