import { DocsSection } from "./DocsSection.js"
import type { PageMeta, Said, SiteLanguage } from "../SitePage.js"

/** What the page says, in one language: the markup around it is written once, in `render`. */
interface InterviewDocText {
  lede: string
  intro: string
  /** What an interview is, said as the investigation knows it before any file is mentioned. */
  concept: string
  placeHeading: string
  place: string
  /** The break between what an author needs to know and what a programmer does. */
  techHeading: string
  techIntro: string
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
  transcribeHeading: string
  transcribe: string
  transcribeWays: ReadonlyArray<string>
  transcribeVoices: string
  dataHeading: string
  data: string
  field: string
  meaning: string
}

/** A short interview file, as the page quotes it. */
/** What the page says of questionnaires: the template a form is drawn from, and how its answers become an interview's turns. */
interface QuestionnaireDocText {
  heading: string
  concept: string
  exchanges: string
  when: string
  /** Confidential answers, sealed for the recipient. */
  sealed: string
  techHeading: string
  techIntro: string
  templateRows: ReadonlyArray<[string, string]>
  fieldHeading: string
  fieldRows: ReadonlyArray<[string, string]>
  exampleHeading: string
  exampleIntro: string
}

const QUESTIONNAIRE_EXAMPLE = `{
  "id": "my-questionnaire",
  "version": "2026-1",
  "title": { "en": "Sighting questionnaire", "fr": "Questionnaire d'observation" },
  "intro": { "en": "Thank you for telling us.\\n\\nAnswer what you remember; say when you are not sure." },
  "sections": [{
    "title": { "en": "When and where" },
    "fields": [
      { "id": "1", "question": { "en": "Date" }, "kind": "date", "feeds": "date" },
      { "id": "2", "question": { "en": "Time it began" }, "kind": "time", "feeds": "startTime" },
      { "id": "3", "question": { "en": "Direction at the start" }, "kind": "text", "feeds": "startAzimuth",
        "images": [{ "src": "compass.png", "alt": { "en": "Compass rose" } }] },
      { "id": "4", "question": { "en": "What did you hear?" }, "kind": "choice", "multiple": true, "required": false,
        "choices": [{ "value": "nothing", "label": { "en": "Nothing" } }, { "value": "hum", "label": { "en": "A hum" } }] }
    ]
  }]
}`

const QUESTIONNAIRE_EXCHANGES = `"questionnaire": { "id": "my-questionnaire", "version": "2026-1" },
"segments": [
  { "speaker": "interviewer", "field": "1", "text": "Date" },
  { "speaker": "witness", "field": "1", "text": "early July 1965" },
  { "speaker": "interviewer", "field": "2", "text": "Time it began" },
  { "speaker": "interviewer", "field": "4", "text": "What did you hear?" },
  { "speaker": "witness", "field": "4", "text": "nothing; hum" }
]`

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
 * An interview, first as the investigation knows it (a conversation with a witness, which the case keeps and ties to the observation), then
 * what can be taken out of it and who approves it, the editor and the import of a transcript, and last, set apart as the technical part, the
 * event and the file.
 *
 * A page of its own, as the observation has its own (see DocsFormatPage), because an interview is a second kind of event of a case
 * (see DocsCasePage) and has its own file.
 */
export class DocsInterviewPage extends DocsSection {

  readonly meta: PageMeta = {
    slug: "docs/interview",
    navLabel: { en: "Interviews", fr: "Les interviews", es: "Las entrevistas", it: "Le interviste" },
    title: { en: "Interviews", fr: "Les interviews", es: "Las entrevistas", it: "Le interviste" },
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
      lede: 'An interview is a conversation with a witness. The case keeps what it established, and may keep the transcript.',
      intro: "An investigator rarely stops at a witness's first account. They go back to the witness: to fix a figure, to ask what was not said, to check what does not add up. That conversation is an interview, and a case can hold it next to the accounts it is about.",
      concept: 'An interview is a <strong>conversation held with one or several witnesses</strong> of the case, by one or several people (an investigator, an association), at a given time and through some <strong>medium</strong>: face to face, by phone, in a video call, by chat, by email or by letter. What the case keeps of it is what it <strong>established</strong> (a short description, in as many languages as you like) and, when there is one, its <strong>transcript</strong>: who said what, and when. The transcript is what a reader can check the description against.',
      placeHeading: 'Its place in the case',
      place: 'A case holds <a href="/docs/case/">events</a>. An interview is one of them, and it <strong>refers to the observation</strong> of the witness it was held with (to the observations, when several witnesses were interviewed together). The reference goes both ways: a passage of the transcript can say which <strong>moment of the observation</strong> it tells of, and the observation then lists, at that moment, the passages that tell of it. Nothing of an interview is replayed: the observation is what is replayed, the interview is what explains its figures.',
      techHeading: 'Technical part: the files',
      techIntro: 'What follows is for whoever writes these files by hand, generates them, or reads them in code. In the editor none of it has to be known.',
      eventHeading: "The event in the case",
      eventIntro: "In <code>case.json</code>, an interview is an event whose <code>eventType</code> is <code>\"interview\"</code>.",
      eventRows: [
        ["id", "What other things refer to it by"],
        ["time", "When it was held, as the case writes a time"],
        ["title", "What it is called, said in as many languages as you like"],
        ["summary", "What it established, in the same way"],
        ["medium", "<code>in-person</code>, <code>phone</code>, <code>video</code>, <code>chat</code>, <code>email</code>, <code>letter</code>, <code>questionnaire</code> or <code>other</code>"],
        ["questionnaire", "For an interview held through a questionnaire: <code>{ id, version }</code> of the questionnaire it was filled in on (<code>geipan-qt-2025</code>, GEIPAN’s technical questionnaire, or another: see “Questionnaires”). It is then also a form to fill in, each answer the witness’s turn after its question"],
        ["by", "Who held it: one agent, or several (<code>{ \"people\": \"…\" }</code> or <code>{ \"org\": \"…\" }</code>)"],
        ["interviewOf", "The <code>id</code> of the observation the interview was held with, or a list of them when there were several witnesses"],
        ["url", "The transcript file, when there is one, relative to the case"]
      ],
      fileHeading: "The transcript file",
      fileIntro: "A plain JSON file, <code>interview.schema.json</code> being its schema. It holds everything the event says of the interview (the summary and the file are kept the same, whichever is edited) AND what was said.",
      fileRows: [
        ["version, id, language", "<code>1</code>; the interview's id; the language it was held in"],
        ["title, time, medium, by, interviewOf, summary", "The same as the event's"],
        ["speakers", "Who speaks, by an id of your choice: <code>{ role, by?, title?, of? }</code>. <code>role</code> is <code>interviewer</code>, <code>witness</code>, or <code>unattributed</code> for a voice a transcription found that nobody has named yet; <code>by</code> an agent for the interviewer; <code>title</code> what a witness is called (initials where unnamed) and <code>of</code> the observation they gave"],
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
        ["text", "What was said, as plain text or HTML (a link, a title in italics, a foreign word in its language: what a page publishing it would write), escaped as any JSON string. The format says who speaks and when; the rest is HTML's"],
        ["redacted", "<code>{ reason }</code>: the whole turn was taken out of the published file. It then has no <code>text</code>"],
        ["parts", "Instead of <code>text</code>, when only a stretch was taken out: a list of <code>{ text }</code> and <code>{ redacted }</code>, in order"],
        ["refs", "The moments of the observation this turn tells of (see “Its place in the case”)"],
        ["field", "In a questionnaire the witness filled in (<code>medium</code> <code>questionnaire</code>): the field this turn asks or answers, numbered or named as the questionnaire does. A field left empty has its question only; a “don’t know” is kept as said and is no answer to build on"],
        ["files", "The files the turn gives (a field of kind <code>files</code>): <code>{ src, name?, type? }</code>, <code>src</code> relative to the interview's file. Its <code>text</code> names them. A file given from the witness's disk is written, when the case is saved, in a folder named after the interview (<code>interview-qb-files/</code>)"]
      ],
      exampleHeading: "An example",
      redactionHeading: "Taking passages out",
      redaction: "A published transcript may hold less than what was recorded: a private life, a name, an exact place. What is taken out keeps its place (speaker and times) and says <em>why</em> in <code>reason</code>, so that a reader sees a gap and its reason rather than a silent cut. When only a detail goes, use <code>parts</code>: the answer to “are there lights in the park?” stays, the streets that would identify the place go. In the editor, select words of a turn: why they go is asked right there, freely, the reasons the interview already gives offered first. A passage taken out, pressed, says its reason, to change it, and is put back while its text is known.",
      proofreadHeading: "Who approved it",
      proofread: "A transcript is proofread when every speaker has approved it. <code>proofreading</code> gives each speaker a <code>status</code>: <code>pending</code> (not asked, or no answer), <code>approved</code>, or <code>covered</code>. <code>covered</code> is for a file that holds <em>less</em> than one the speaker already approved (passages removed, nothing added): the earlier approval of the whole is enough, and <code>coveredBy</code> names that fuller version. A speaker who is not listed has not approved.",
      peopleHeading: "Several interviewers, several witnesses",
      people: "An interview may have any number of speakers. <code>by</code> lists every interviewer and <code>interviewOf</code> every observation held with; in the file the first interviewer is <code>interviewer</code>, the next <code>interviewer2</code>, and likewise <code>witness</code>, <code>witness2</code>… The editor keeps them in step with the event.",
      linksHeading: "Links with the observation",
      links: "In the editor, a turn that refers to a moment of the observation has a button that shows the observation at that moment; the observation in turn lists, under that moment, the passages that tell of it (“Reported in …”), each a link back to the turn. In the file, the reference is written <code>\"refs\": [{ \"at\": 0.5 }]</code>, in seconds from the beginning of the observation; <code>sighting</code> names the observation when the interview was held with several, and <code>range</code> (<code>[from, to]</code> in characters of <code>text</code>) the part of the turn concerned.",
      editorHeading: "In the interview editor",
      editor: "<code>&lt;rr0-interview-editor&gt;</code> has three groups: the <strong>Summary</strong> (title, witnesses, medium, date, interviewers, description), the <strong>Exchanges</strong> (the interview read as a dialogue: who said what, the time of each turn as a tooltip, passages taken out blacked out with their reason, who has not approved yet) and the <strong>File</strong> (the transcript as text, completed from its schema, to load and to save). It is a chunk of its own, fetched only when a case has an interview.",
      importHeading: "Importing a transcript that is not in our format",
      importIntro: "Most transcripts come from somewhere else. In the File group, “Load a file” reads, besides JSON:",
      importFormats: [
        "<strong>WebVTT and SRT</strong>, as a recording tool or a subtitle editor writes them: the times are kept, the speaker is the <code>&lt;v Name&gt;</code> tag or a <code>Name:</code> before the text;",
        "<strong>text or Markdown with a name before each turn</strong>: <code>Name: …</code>, <code>[00:12:34] Name: …</code>, <code>Name (00:12:34): …</code>, <code>Q:</code> / <code>R:</code> or <code>Q.</code> / <code>A.</code>; a line with no name goes on the turn before;",
        "<strong>plain paragraphs</strong>: one turn each, with no speaker and no time."
      ],
      importSpeakers: "The names found are matched to the interview's: one that is among those who held it is an interviewer, one that is a witness of the case is that witness. Otherwise the first to speak is the interviewer and the others are witnesses; <code>Q</code> always asks and <code>R</code> or <code>A</code> always answers. All are <code>pending</code> approval, and the note says what file it came from.",
      importLimits: "It guesses, and says so: what it gets wrong is corrected in the File group. Word processor and PDF files are not read: save them as text first. A colon in a sentence is not taken for a speaker unless a name comes back often enough.",
      transcribeHeading: "Transcribing the recording",
      transcribe: "Once the interview has a recording (the <strong>Recordings</strong> button of the player), <strong>Transcribe the recording</strong>, at the top of the Exchanges group, makes its turns of speech, with their times. It replaces the transcript in place; the recordings, the title and the rest of the file stay. Two ways, chosen beside the button:",
      transcribeWays: [
        "<strong>Whisper, in your browser</strong> (the default): nothing leaves your computer. The first time, the model (Whisper large-v3-turbo, about 760 MB) is downloaded, then kept by the browser. On a recent computer with WebGPU it transcribes about six times faster than the recording plays (an hour and a half in about a quarter of an hour); without WebGPU it is much slower.",
        "<strong>A service on your own key</strong> (Groq, OpenAI, AssemblyAI): faster, and the recording is <em>sent</em> to it, which the editor says before anything goes. The key is asked for beside the choice, kept in the page's memory until it is reloaded, and never stored."
      ],
      transcribeVoices: "A transcription does not know whose each voice is: every turn is given to a <em>voice to attribute</em> (role <code>unattributed</code>), never guessed to be the interviewer's or the witness's. The case's interviewers and witnesses are speakers already, and <strong>Who speaks…</strong> under each turn gives it to the right one; a voice nobody speaks with any more goes. AssemblyAI tells the voices apart: its turns come as <em>Voice A</em>, <em>Voice B</em>…, and saying who one of them is gives that person all its turns at once. A voice to attribute is not asked to proofread. The file says how it was made: <code>transcription.method</code> is <code>automatic</code> and <code>engine</code> names the model. Another way of transcribing can be added as a module (see Modules (<code>case-template</code>), point <code>transcription</code>).",
      dataHeading: "In code",
      data: "<code>@rr0/data</code> reads and writes the same files: <code>RR0Interview.fromEventJson</code> / <code>toEventJson</code> for the event, <code>fromFileJson</code> / <code>toFileJson</code> for the file, and <code>proofread</code> says whether everyone approved. In UFO@home, <code>InterviewFile.toVtt</code> makes subtitles from a transcript, <code>InterviewFile.passagesAbout</code> lists the turns that tell of an observation, and <code>InterviewImport.parse</code> reads a foreign file.",
      field: "Field",
      meaning: "Meaning"
    },
    fr: {
      lede: "Une interview est une conversation avec un témoin. Le dossier garde ce qu'elle a établi, et peut garder sa transcription.",
      intro: "Un enquêteur s'arrête rarement au premier compte rendu d'un témoin. Il revient vers lui : pour fixer une valeur, demander ce qui n'a pas été dit, vérifier ce qui ne colle pas. Cette conversation est une interview, et un dossier peut la garder à côté des comptes rendus dont elle parle.",
      concept: "Une interview est une <strong>conversation menée avec un ou plusieurs témoins</strong> du dossier, par une ou plusieurs personnes (un enquêteur, une association), à un moment donné et par un certain <strong>moyen</strong> : face à face, téléphone, visioconférence, chat, mail ou courrier. Ce que le dossier en garde, c'est ce qu'elle a <strong>établi</strong> (une courte description, dans autant de langues qu'on veut) et, quand il y en a une, sa <strong>transcription</strong> : qui a dit quoi, et quand. C'est à la transcription qu'un lecteur peut confronter cette description.",
      placeHeading: 'Sa place dans le dossier',
      place: 'Un dossier contient des <a href="/docs/case/">événements</a>. Une interview en est un, et elle <strong>renvoie à l\'observation</strong> du témoin avec qui elle a eu lieu (aux observations, quand plusieurs témoins ont été interrogés ensemble). Le renvoi va dans les deux sens : un passage de la transcription peut dire de quel <strong>moment de l\'observation</strong> il parle, et l\'observation liste alors, à ce moment, les passages qui en parlent. Rien d\'une interview n\'est rejoué : seule l\'observation est rejouée, et l\'interview explique d\'où viennent ses valeurs.',
      techHeading: 'Partie technique : les fichiers',
      techIntro: "Ce qui suit est pour qui écrit ces fichiers à la main, les génère ou les lit en code. Dans l'éditeur, rien de cela n'a besoin d'être connu.",
      eventHeading: "L'événement dans le dossier",
      eventIntro: "Dans <code>case.json</code>, une interview est un événement dont l'<code>eventType</code> vaut <code>\"interview\"</code>.",
      eventRows: [
        ["id", "Ce par quoi d'autres éléments la désignent"],
        ["time", "Quand elle a eu lieu, comme le dossier écrit une date"],
        ["title", "Son nom, dit dans autant de langues qu'on veut"],
        ["summary", "Ce qu'elle a établi, de la même façon"],
        ["medium", "<code>in-person</code>, <code>phone</code>, <code>video</code>, <code>chat</code>, <code>email</code>, <code>letter</code>, <code>questionnaire</code> ou <code>other</code>"],
        ["questionnaire", "Pour une interview tenue par questionnaire : <code>{ id, version }</code> du questionnaire sur lequel elle a été remplie (<code>geipan-qt-2025</code>, le questionnaire technique du GEIPAN, ou un autre : voir « Les questionnaires »). Elle est alors aussi un formulaire à remplir, chaque réponse étant le tour du témoin après sa question"],
        ["by", "Qui l'a menée : un agent, ou plusieurs (<code>{ \"people\": \"…\" }</code> ou <code>{ \"org\": \"…\" }</code>)"],
        ["interviewOf", "L'<code>id</code> de l'observation avec laquelle elle a eu lieu, ou une liste quand il y avait plusieurs témoins"],
        ["url", "Le fichier de transcription, s'il y en a un, relatif au dossier"]
      ],
      fileHeading: "Le fichier de transcription",
      fileIntro: "Un fichier JSON simple, dont <code>interview.schema.json</code> est le schéma. Il contient tout ce que l'événement dit de l'interview (le résumé de l'événement et celui du fichier restent identiques, quel que soit celui qu'on modifie), et en plus ce qui a été dit.",
      fileRows: [
        ["version, id, language", "<code>1</code> ; l'id de l'interview ; la langue dans laquelle elle s'est tenue"],
        ["title, time, medium, by, interviewOf, summary", "Les mêmes que ceux de l'événement"],
        ["speakers", "Qui parle, sous un id de votre choix : <code>{ role, by?, title?, of? }</code>. <code>role</code> vaut <code>interviewer</code>, <code>witness</code>, ou <code>unattributed</code> pour une voix trouvée par une transcription que personne n'a encore nommée ; <code>by</code> identifie l'enquêteur ; <code>title</code> comment on appelle un témoin (ses initiales s'il n'est pas nommé) et <code>of</code> l'observation qu'il a donnée"],
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
        ["text", "Ce qui a été dit, en texte brut ou en HTML (un lien, un titre en italique, un mot étranger dans sa langue : ce qu'écrirait une page qui le publie), échappé comme toute chaîne JSON. Le format dit qui parle et quand ; le reste revient au HTML"],
        ["redacted", "<code>{ reason }</code> : le tour entier a été retiré du fichier publié. Il n'a alors pas de <code>text</code>"],
        ["parts", "À la place de <code>text</code>, quand seul un passage a été retiré : une liste de <code>{ text }</code> et de <code>{ redacted }</code>, dans l'ordre"],
        ["refs", "Les moments de l'observation que ce tour raconte (voir « Sa place dans le dossier »)"],
        ["field", "Dans un questionnaire rempli par le témoin (<code>medium</code> <code>questionnaire</code>) : le champ que ce tour pose ou auquel il répond, numéroté ou nommé comme le questionnaire le fait. Un champ laissé vide n'a que sa question ; un « je ne sais pas » est gardé tel qu'il a été dit et n'est pas une réponse sur laquelle bâtir"],
        ["files", "Les fichiers que le tour donne (un champ de sorte <code>files</code>) : <code>{ src, name?, type? }</code>, <code>src</code> relatif au fichier de l'interview. Son <code>text</code> les nomme. Un fichier donné depuis le disque du témoin est écrit, quand le dossier est sauvé, dans un dossier au nom de l'interview (<code>interview-qb-files/</code>)"]
      ],
      exampleHeading: "Un exemple",
      redactionHeading: "Retirer des passages",
      redaction: "Une transcription publiée peut contenir moins que ce qui a été enregistré : la vie privée, un nom, un lieu exact. Un passage retiré garde sa place (locuteur et instants) et indique <em>pourquoi</em> il a été retiré (champ <code>reason</code>), pour qu'un lecteur voie un trou et sa raison plutôt qu'une coupure invisible. Quand seul un détail doit disparaître, on ne retire qu'une partie du tour (<code>parts</code>) : la réponse à « y a-t-il des éclairages dans le parc ? » reste, les rues qui identifieraient le lieu s'en vont. Dans l'éditeur, sélectionnez des mots d'un tour : la raison est demandée sur place, librement, celles que l'interview donne déjà proposées en premier. Un passage retiré, cliqué, montre sa raison, pour la changer, et se rétablit tant que son texte est connu.",
      proofreadHeading: "Qui l'a approuvée",
      proofread: "Une transcription est considérée comme relue quand chaque locuteur l'a approuvée. Pour cela, <code>proofreading</code> donne à chaque locuteur un <code>status</code> : <code>pending</code> (pas demandé, ou sans réponse), <code>approved</code>, ou <code>covered</code>. <code>covered</code> vaut pour un fichier qui contient <em>moins</em> que la version que le locuteur a déjà approuvée (passages retirés, rien d'ajouté) : l'approbation antérieure du tout suffit, et <code>coveredBy</code> nomme cette version plus complète. Un locuteur qui n'est pas listé n'a pas approuvé.",
      peopleHeading: "Plusieurs enquêteurs, plusieurs témoins",
      people: "Une interview peut réunir autant de locuteurs qu'on veut : plusieurs enquêteurs, plusieurs témoins. L'événement les liste tous (les enquêteurs dans <code>by</code>, les observations des témoins interrogés dans <code>interviewOf</code>) ; dans le fichier de transcription, le premier enquêteur s'appelle <code>interviewer</code>, le suivant <code>interviewer2</code>, et de même <code>witness</code>, <code>witness2</code>… L'éditeur maintient cette liste en accord avec l'événement.",
      linksHeading: "Liens avec l'observation",
      links: "Dans l'éditeur, un tour qui renvoie à un moment de l'observation porte un bouton qui montre l'observation à ce moment ; de son côté, l'observation liste sous ce moment les passages qui en parlent (« Relaté dans … »), chacun étant un lien vers le tour. Dans le fichier, ce renvoi s'écrit <code>\"refs\": [{ \"at\": 0.5 }]</code>, en secondes depuis le début de l'observation ; <code>sighting</code> nomme l'observation quand l'interview en concerne plusieurs, et <code>range</code> (<code>[de, à]</code> en caractères de <code>text</code>) la partie du tour concernée.",
      editorHeading: "Dans l'éditeur d'interview",
      editor: "<code>&lt;rr0-interview-editor&gt;</code> a trois groupes : le <strong>Résumé</strong> (titre, témoins, moyen, date, enquêteurs, description), les <strong>Échanges</strong> (l'interview lue comme un dialogue : qui a dit quoi, le temps de chaque tour en infobulle, les passages retirés noircis avec leur raison, qui n'a pas encore approuvé) et le <strong>Fichier</strong> (la transcription en texte, avec une complétion tirée de son schéma, à charger et à sauver). Son code est chargé à part, seulement quand un dossier contient une interview.",
      importHeading: "Importer une transcription qui n'est pas dans notre format",
      importIntro: "La plupart des transcriptions viennent d'ailleurs. Dans le groupe Fichier, « Charger un fichier » lit, en plus du JSON :",
      importFormats: [
        "<strong>WebVTT et SRT</strong>, tels qu'un outil d'enregistrement ou un éditeur de sous-titres les écrit : les temps sont gardés, le locuteur est la balise <code>&lt;v Nom&gt;</code> ou un <code>Nom :</code> avant le texte ;",
        "<strong>du texte ou du Markdown avec un nom avant chaque tour</strong> : <code>Nom : …</code>, <code>[00:12:34] Nom : …</code>, <code>Nom (00:12:34) : …</code>, <code>Q :</code> / <code>R :</code> ou <code>Q.</code> / <code>A.</code> ; une ligne sans nom prolonge le tour précédent ;",
        "<strong>de simples paragraphes</strong> : un tour chacun, sans locuteur ni temps."
      ],
      importSpeakers: "Les noms trouvés sont rapprochés de ceux de l'interview : un nom qui figure parmi ses enquêteurs devient un enquêteur, un nom de témoin du dossier devient ce témoin. Sinon, le premier à parler est l'enquêteur et les autres sont des témoins ; <code>Q</code> interroge toujours et <code>R</code> ou <code>A</code> répond toujours. Tous sont en attente d'approbation (<code>pending</code>), et la note de <code>transcription</code> indique le fichier d'origine.",
      importLimits: "L'import procède par déduction, et le signale : ses erreurs se corrigent dans le groupe Fichier. Les fichiers de traitement de texte et les PDF ne sont pas lus : enregistrez-les d'abord en texte. Un deux-points au milieu d'une phrase n'est pris pour l'annonce d'un locuteur que si le même nom revient assez souvent.",
      transcribeHeading: "Transcrire l'enregistrement",
      transcribe: "Une fois que l'interview a un enregistrement (bouton <strong>Enregistrements</strong> du lecteur), le bouton <strong>Transcrire l'enregistrement</strong>, en haut du groupe Échanges, le découpe en tours de parole, avec leurs instants. La transcription existante est remplacée ; les enregistrements, le titre et le reste du fichier sont conservés. Deux moyens sont proposés, à choisir à côté du bouton :",
      transcribeWays: [
        "<strong>Whisper, dans votre navigateur</strong> (par défaut) : rien ne quitte votre ordinateur. La première fois, le modèle (Whisper large-v3-turbo, environ 760 Mo) est téléchargé, puis gardé par le navigateur. Sur un ordinateur récent avec WebGPU, il transcrit environ six fois plus vite que l'enregistrement ne se joue (une heure et demie en un quart d'heure environ) ; sans WebGPU, c'est beaucoup plus lent.",
        "<strong>Un service, avec votre propre clé</strong> (Groq, OpenAI, AssemblyAI) : plus rapide, mais l'enregistrement lui est <em>envoyé</em>, et l'éditeur vous prévient avant tout envoi. La clé est demandée à côté du choix, gardée dans la mémoire de la page jusqu'à son rechargement, et jamais enregistrée."
      ],
      transcribeVoices: "Une transcription automatique ne sait pas à qui appartient chaque voix : chaque tour est attribué à une <em>voix à attribuer</em> (rôle <code>unattributed</code>), et n'est jamais supposé venir de l'enquêteur ou du témoin. Les enquêteurs et les témoins du dossier figurent déjà parmi les locuteurs : sous chaque tour, <strong>Qui parle…</strong> permet de l'attribuer au bon. Une voix à laquelle plus aucun tour n'est attribué disparaît. AssemblyAI sépare les voix : ses tours arrivent comme <em>Voix A</em>, <em>Voix B</em>…, et dire qui est l'une d'elles lui attribue tous ses tours d'un coup. Une voix à attribuer n'a pas à approuver la transcription. Le fichier dit comment il a été fait : <code>transcription.method</code> vaut <code>automatic</code> et <code>engine</code> nomme le modèle. Une autre façon de transcrire peut s'ajouter comme module (voir Modules (<code>case-template</code>), point <code>transcription</code>).",
      dataHeading: "En code",
      data: "<code>@rr0/data</code> lit et écrit les mêmes fichiers : <code>RR0Interview.fromEventJson</code> / <code>toEventJson</code> pour l'événement, <code>fromFileJson</code> / <code>toFileJson</code> pour le fichier, et <code>proofread</code> dit si tous ont approuvé. Dans UFO@home, <code>InterviewFile.toVtt</code> fait des sous-titres d'une transcription, <code>InterviewFile.passagesAbout</code> liste les tours qui racontent une observation, et <code>InterviewImport.parse</code> lit un fichier d'un autre format.",
      field: "Champ",
      meaning: "Signification"
    },
    es: {
      lede: 'Una entrevista es una conversación con un testigo. El caso conserva lo que estableció y puede conservar su transcripción.',
      intro: 'Un investigador rara vez se queda en el primer relato de un testigo. Vuelve a él: para fijar una cifra, preguntar lo que no se dijo, comprobar lo que no cuadra. Esa conversación es una entrevista, y un caso puede guardarla junto a los relatos de los que habla.',
      concept: 'Una entrevista es una <strong>conversación mantenida con uno o varios testigos</strong> del caso, por una o varias personas (un investigador, una asociación), en un momento dado y por algún <strong>medio</strong>: en persona, por teléfono, videollamada, chat, correo electrónico o carta. Lo que el caso conserva de ella es lo que <strong>estableció</strong> (una breve descripción, en tantos idiomas como se quiera) y, cuando existe, su <strong>transcripción</strong>: quién dijo qué y cuándo. La transcripción es lo que un lector puede contrastar con la descripción.',
      placeHeading: 'Su lugar en el caso',
      place: 'Un caso contiene <a href="/docs/case/">eventos</a>. Una entrevista es uno de ellos y <strong>remite a la observación</strong> del testigo con quien se celebró (a las observaciones, cuando se entrevistó a varios testigos juntos). La remisión va en ambos sentidos: un pasaje de la transcripción puede decir de qué <strong>momento de la observación</strong> habla, y la observación enumera entonces, en ese momento, los pasajes que la cuentan. Nada de una entrevista se reproduce: la observación es lo que se reproduce, la entrevista es lo que explica sus cifras.',
      techHeading: 'Parte técnica: los archivos',
      techIntro: 'Lo que sigue es para quien escribe estos archivos a mano, los genera o los lee en código. En el editor no hace falta saber nada de ello.',
      eventHeading: "El evento en el caso",
      eventIntro: "En <code>case.json</code>, una entrevista es un evento cuyo <code>eventType</code> es <code>\"interview\"</code>.",
      eventRows: [
        ["id", "Con lo que otras cosas se refieren a ella"],
        ["time", "Cuándo se celebró, como el caso escribe una fecha"],
        ["title", "Cómo se llama, en tantos idiomas como se quiera"],
        ["summary", "Lo que estableció, del mismo modo"],
        ["medium", "<code>in-person</code>, <code>phone</code>, <code>video</code>, <code>chat</code>, <code>email</code>, <code>letter</code>, <code>questionnaire</code> u <code>other</code>"],
        ["questionnaire", "Para una entrevista hecha mediante cuestionario: <code>{ id, version }</code> del cuestionario en el que se rellenó (<code>geipan-qt-2025</code>, el cuestionario técnico del GEIPAN, u otro: véase «Los cuestionarios»). Es entonces también un formulario que rellenar, cada respuesta el turno del testigo tras su pregunta"],
        ["by", "Quién la realizó: un agente o varios (<code>{ \"people\": \"…\" }</code> o <code>{ \"org\": \"…\" }</code>)"],
        ["interviewOf", "El <code>id</code> de la observación con la que se celebró, o una lista si hubo varios testigos"],
        ["url", "El archivo de transcripción, si lo hay, relativo al caso"]
      ],
      fileHeading: "El archivo de transcripción",
      fileIntro: "Un archivo JSON simple, cuyo esquema es <code>interview.schema.json</code>. Contiene todo lo que el evento dice de la entrevista (el resumen y el archivo se mantienen iguales, se edite el que se edite) Y lo que se dijo.",
      fileRows: [
        ["version, id, language", "<code>1</code>; el id de la entrevista; el idioma en que se celebró"],
        ["title, time, medium, by, interviewOf, summary", "Los mismos que los del evento"],
        ["speakers", "Quién habla, con un id a tu elección: <code>{ role, by?, title?, of? }</code>. <code>role</code> es <code>interviewer</code>, <code>witness</code>, o <code>unattributed</code> para una voz encontrada por una transcripción que nadie ha nombrado todavía; <code>by</code> el agente del entrevistador; <code>title</code> cómo se llama un testigo (sus iniciales si no se nombra) y <code>of</code> la observación que dio"],
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
        ["text", "Lo que se dijo, como texto plano o HTML (un enlace, un título en cursiva, una palabra extranjera en su idioma: lo que escribiría una página que lo publica), escapado como cualquier cadena JSON. El formato dice quién habla y cuándo; el resto es cosa del HTML"],
        ["redacted", "<code>{ reason }</code>: el turno entero se eliminó del archivo publicado. Entonces no tiene <code>text</code>"],
        ["parts", "En lugar de <code>text</code>, cuando solo se eliminó un tramo: una lista de <code>{ text }</code> y <code>{ redacted }</code>, en orden"],
        ["refs", "Los momentos de la observación que cuenta este turno (véase «Su lugar en el caso»)"],
        ["field", "En un cuestionario rellenado por el testigo (<code>medium</code> <code>questionnaire</code>): el campo que este turno pregunta o responde, numerado o nombrado como lo hace el cuestionario. Un campo dejado vacío solo tiene su pregunta; un «no sé» se guarda tal como se dijo y no es una respuesta sobre la que construir"],
        ["files", "Los archivos que da el turno (un campo de tipo <code>files</code>): <code>{ src, name?, type? }</code>, <code>src</code> relativo al archivo de la entrevista. Su <code>text</code> los nombra. Un archivo dado desde el disco del testigo se escribe, al guardar el caso, en una carpeta con el nombre de la entrevista (<code>interview-qb-files/</code>)"]
      ],
      exampleHeading: "Un ejemplo",
      redactionHeading: "Eliminar pasajes",
      redaction: "Una transcripción publicada puede contener menos de lo grabado: la vida privada, un nombre, un lugar exacto. Lo eliminado conserva su sitio (hablante y tiempos) y dice <em>por qué</em> en <code>reason</code>, de modo que el lector ve un hueco y su razón en lugar de un corte silencioso. Cuando solo se va un detalle, usa <code>parts</code>: la respuesta a «¿hay luces en el parque?» se queda, las calles que identificarían el lugar se van. En el editor, selecciona palabras de un turno: el motivo se pide allí mismo, libremente, con los que la entrevista ya da propuestos primero. Un pasaje retirado, pulsado, muestra su motivo, para cambiarlo, y se restablece mientras su texto se conoce.",
      proofreadHeading: "Quién la aprobó",
      proofread: "Una transcripción está revisada cuando cada hablante la ha aprobado. <code>proofreading</code> da a cada hablante un <code>status</code>: <code>pending</code> (no se pidió o sin respuesta), <code>approved</code> o <code>covered</code>. <code>covered</code> es para un archivo que contiene <em>menos</em> de lo que el hablante ya aprobó (pasajes eliminados, nada añadido): basta la aprobación anterior del conjunto, y <code>coveredBy</code> nombra esa versión más completa. Un hablante que no figura no ha aprobado.",
      peopleHeading: "Varios entrevistadores, varios testigos",
      people: "Una entrevista puede tener cualquier número de hablantes. <code>by</code> enumera cada entrevistador e <code>interviewOf</code> cada observación con la que se celebró; en el archivo, el primer entrevistador es <code>interviewer</code>, el siguiente <code>interviewer2</code>, y lo mismo <code>witness</code>, <code>witness2</code>… El editor los mantiene de acuerdo con el evento.",
      linksHeading: "Vínculos con la observación",
      links: "Un turno puede decir de qué momento de la observación habla: <code>\"refs\": [{ \"at\": 0.5 }]</code>, en segundos desde el inicio de la observación. <code>sighting</code> nombra la observación cuando la entrevista se celebró con varias, y <code>range</code> (<code>[desde, hasta]</code> en caracteres de <code>text</code>) la parte del turno afectada. En el editor, un turno con referencia tiene un botón que muestra la observación en ese momento, y la observación enumera debajo los pasajes que la cuentan («Relatado en …»), cada uno un enlace de vuelta al turno.",
      editorHeading: "En el editor de entrevistas",
      editor: "<code>&lt;rr0-interview-editor&gt;</code> tiene tres grupos: el <strong>Resumen</strong> (título, testigos, medio, fecha, entrevistadores, descripción), los <strong>Intercambios</strong> (la entrevista leída como un diálogo: quién dijo qué, el tiempo de cada turno en un globo, los pasajes eliminados ennegrecidos con su razón, quién aún no ha aprobado) y el <strong>Archivo</strong> (la transcripción como texto, completada según su esquema, para cargar y guardar). Es un fragmento aparte, que se descarga solo cuando un caso tiene una entrevista.",
      importHeading: "Importar una transcripción que no está en nuestro formato",
      importIntro: "La mayoría de las transcripciones vienen de otra parte. En el grupo Archivo, «Cargar un archivo» lee, además de JSON:",
      importFormats: [
        "<strong>WebVTT y SRT</strong>, como los escribe una herramienta de grabación o un editor de subtítulos: se conservan los tiempos, el hablante es la etiqueta <code>&lt;v Nombre&gt;</code> o un <code>Nombre:</code> antes del texto;",
        "<strong>texto o Markdown con un nombre antes de cada turno</strong>: <code>Nombre: …</code>, <code>[00:12:34] Nombre: …</code>, <code>Nombre (00:12:34): …</code>, <code>Q:</code> / <code>R:</code> o <code>Q.</code> / <code>A.</code>; una línea sin nombre continúa el turno anterior;",
        "<strong>simples párrafos</strong>: un turno cada uno, sin hablante ni tiempo."
      ],
      importSpeakers: "Los nombres hallados se emparejan con los de la entrevista: uno que figura entre quienes la realizaron es un entrevistador, uno que es testigo del caso es ese testigo. Si no, el primero en hablar es el entrevistador y los demás testigos; <code>Q</code> siempre pregunta y <code>R</code> o <code>A</code> siempre responde. Todos quedan pendientes de aprobación (<code>pending</code>), y la nota dice de qué archivo procede.",
      importLimits: "Adivina, y lo dice: lo que falla se corrige en el grupo Archivo. Los archivos de procesador de texto y los PDF no se leen: guárdalos antes como texto. Unos dos puntos en una frase no se toman por un hablante mientras un nombre no se repita lo bastante.",
      transcribeHeading: "Transcribir la grabación",
      transcribe: "Cuando la entrevista tiene una grabación (botón <strong>Grabaciones</strong> del reproductor), <strong>Transcribir la grabación</strong>, en lo alto del grupo Intercambios, saca de ella los turnos de palabra, con sus tiempos. Reemplaza la transcripción en su sitio; las grabaciones, el título y el resto del archivo se quedan. Dos maneras, a elegir junto al botón:",
      transcribeWays: [
        "<strong>Whisper, en tu navegador</strong> (por defecto): nada sale de tu ordenador. La primera vez se descarga el modelo (Whisper large-v3-turbo, unos 760 MB), que el navegador conserva. En un ordenador reciente con WebGPU transcribe unas seis veces más rápido de lo que dura la grabación (hora y media en un cuarto de hora aproximadamente); sin WebGPU es mucho más lento.",
        "<strong>Un servicio con tu propia clave</strong> (Groq, OpenAI, AssemblyAI): más rápido, y la grabación se le <em>envía</em>, lo que el editor dice antes de que nada salga. La clave se pide junto a la elección, se guarda en la memoria de la página hasta que se recarga y nunca se almacena."
      ],
      transcribeVoices: "Una transcripción no sabe de quién es cada voz: cada turno se da a una <em>voz por atribuir</em> (rol <code>unattributed</code>), nunca se supone que sea la del entrevistador o la del testigo. Los entrevistadores y los testigos del caso ya son hablantes, y <strong>Quién habla…</strong>, bajo cada turno, lo da al correcto; una voz a la que ya no se da ningún turno desaparece. AssemblyAI separa las voces: sus turnos llegan como <em>Voz A</em>, <em>Voz B</em>…, y decir quién es una de ellas le da todos sus turnos de una vez. A una voz por atribuir no se le pide revisar. El archivo dice cómo se hizo: <code>transcription.method</code> es <code>automatic</code> y <code>engine</code> nombra el modelo. Otra manera de transcribir puede añadirse como módulo (ver Módulos (<code>case-template</code>), punto <code>transcription</code>).",
      dataHeading: "En código",
      data: "<code>@rr0/data</code> lee y escribe los mismos archivos: <code>RR0Interview.fromEventJson</code> / <code>toEventJson</code> para el evento, <code>fromFileJson</code> / <code>toFileJson</code> para el archivo, y <code>proofread</code> dice si todos aprobaron. En UFO@home, <code>InterviewFile.toVtt</code> hace subtítulos de una transcripción, <code>InterviewFile.passagesAbout</code> enumera los turnos que cuentan una observación e <code>InterviewImport.parse</code> lee un archivo ajeno.",
      field: "Campo",
      meaning: "Significado"
    },
    it: {
      lede: "Un'intervista è una conversazione con un testimone. Il caso conserva ciò che ha stabilito e può conservarne la trascrizione.",
      intro: "Un investigatore raramente si ferma al primo resoconto di un testimone. Torna da lui: per fissare un valore, chiedere ciò che non è stato detto, verificare ciò che non torna. Quella conversazione è un'intervista, e un caso può conservarla accanto ai resoconti di cui parla.",
      concept: "Un'intervista è una <strong>conversazione condotta con uno o più testimoni</strong> del caso, da una o più persone (un investigatore, un'associazione), in un dato momento e con un certo <strong>mezzo</strong>: di persona, per telefono, in videochiamata, in chat, per email o per lettera. Ciò che il caso ne conserva è ciò che ha <strong>stabilito</strong> (una breve descrizione, in quante lingue si vuole) e, quando c'è, la sua <strong>trascrizione</strong>: chi ha detto che cosa e quando. La trascrizione è ciò con cui un lettore può confrontare la descrizione.",
      placeHeading: 'Il suo posto nel caso',
      place: 'Un caso contiene <a href="/docs/case/">eventi</a>. Un\'intervista è uno di essi e <strong>rimanda all\'osservazione</strong> del testimone con cui si è tenuta (alle osservazioni, quando più testimoni sono stati intervistati insieme). Il rimando va in entrambe le direzioni: un passaggio della trascrizione può dire di quale <strong>momento dell\'osservazione</strong> parla, e l\'osservazione elenca allora, in quel momento, i passaggi che la raccontano. Nulla di un\'intervista viene riprodotto: l\'osservazione è ciò che si riproduce, l\'intervista è ciò che ne spiega i valori.',
      techHeading: 'Parte tecnica: i file',
      techIntro: "Quanto segue è per chi scrive questi file a mano, li genera o li legge nel codice. Nell'editor non serve conoscerne nulla.",
      eventHeading: "L'evento nel caso",
      eventIntro: "In <code>case.json</code>, un'intervista è un evento il cui <code>eventType</code> è <code>\"interview\"</code>.",
      eventRows: [
        ["id", "Con cui altri elementi vi fanno riferimento"],
        ["time", "Quando si è tenuta, come il caso scrive una data"],
        ["title", "Come si chiama, in quante lingue si vuole"],
        ["summary", "Ciò che ha stabilito, allo stesso modo"],
        ["medium", "<code>in-person</code>, <code>phone</code>, <code>video</code>, <code>chat</code>, <code>email</code>, <code>letter</code>, <code>questionnaire</code> oppure <code>other</code>"],
        ["questionnaire", "Per un'intervista tenuta tramite questionario: <code>{ id, version }</code> del questionario su cui è stata compilata (<code>geipan-qt-2025</code>, il questionario tecnico del GEIPAN, o un altro: vedi «I questionari»). È allora anche un modulo da compilare, ogni risposta il turno del testimone dopo la sua domanda"],
        ["by", "Chi l'ha condotta: un agente o più (<code>{ \"people\": \"…\" }</code> o <code>{ \"org\": \"…\" }</code>)"],
        ["interviewOf", "L'<code>id</code> dell'osservazione con cui si è tenuta, o un elenco se c'erano più testimoni"],
        ["url", "Il file di trascrizione, se c'è, relativo al caso"]
      ],
      fileHeading: "Il file di trascrizione",
      fileIntro: "Un semplice file JSON, il cui schema è <code>interview.schema.json</code>. Contiene tutto ciò che l'evento dice dell'intervista (il riassunto e il file restano uguali, comunque si modifichi) E ciò che è stato detto.",
      fileRows: [
        ["version, id, language", "<code>1</code>; l'id dell'intervista; la lingua in cui si è tenuta"],
        ["title, time, medium, by, interviewOf, summary", "Gli stessi dell'evento"],
        ["speakers", "Chi parla, con un id a scelta: <code>{ role, by?, title?, of? }</code>. <code>role</code> è <code>interviewer</code>, <code>witness</code>, o <code>unattributed</code> per una voce trovata da una trascrizione che nessuno ha ancora nominato; <code>by</code> l'agente dell'intervistatore; <code>title</code> come si chiama un testimone (le iniziali se non è nominato) e <code>of</code> l'osservazione che ha dato"],
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
        ["text", "Ciò che è stato detto, come testo semplice o HTML (un link, un titolo in corsivo, una parola straniera nella sua lingua: ciò che scriverebbe una pagina che lo pubblica), con l'escape di qualsiasi stringa JSON. Il formato dice chi parla e quando; il resto spetta all'HTML"],
        ["redacted", "<code>{ reason }</code>: l'intero turno è stato tolto dal file pubblicato. Non ha allora <code>text</code>"],
        ["parts", "Al posto di <code>text</code>, quando è stato tolto solo un tratto: un elenco di <code>{ text }</code> e <code>{ redacted }</code>, in ordine"],
        ["refs", "I momenti dell'osservazione di cui parla questo turno (vedi «Il suo posto nel caso»)"],
        ["field", "In un questionario compilato dal testimone (<code>medium</code> <code>questionnaire</code>): il campo che questo turno chiede o a cui risponde, numerato o nominato come fa il questionario. Un campo lasciato vuoto ha solo la domanda; un «non so» è conservato così com'è stato detto e non è una risposta su cui costruire"],
        ["files", "I file che il turno fornisce (un campo di tipo <code>files</code>): <code>{ src, name?, type? }</code>, <code>src</code> relativo al file dell'intervista. Il suo <code>text</code> li nomina. Un file dato dal disco del testimone è scritto, quando il caso è salvato, in una cartella col nome dell'intervista (<code>interview-qb-files/</code>)"]
      ],
      exampleHeading: "Un esempio",
      redactionHeading: "Togliere dei passaggi",
      redaction: "Una trascrizione pubblicata può contenere meno di quanto registrato: la vita privata, un nome, un luogo esatto. Ciò che viene tolto conserva il proprio posto (parlante e tempi) e dice <em>perché</em> in <code>reason</code>, così che il lettore veda un vuoto e la sua ragione anziché un taglio silenzioso. Quando se ne va solo un dettaglio, usa <code>parts</code>: la risposta a «ci sono luci nel parco?» resta, le vie che identificherebbero il luogo se ne vanno. Nell'editor, seleziona parole di un turno: il motivo è chiesto lì stesso, liberamente, con quelli che l'intervista già dà proposti per primi. Un passaggio rimosso, premuto, mostra il suo motivo, per cambiarlo, e si ripristina finché il suo testo è noto.",
      proofreadHeading: "Chi l'ha approvata",
      proofread: "Una trascrizione è rivista quando ogni parlante l'ha approvata. <code>proofreading</code> dà a ogni parlante uno <code>status</code>: <code>pending</code> (non richiesto o senza risposta), <code>approved</code> o <code>covered</code>. <code>covered</code> vale per un file che contiene <em>meno</em> di quanto il parlante ha già approvato (passaggi tolti, nulla aggiunto): basta l'approvazione precedente dell'insieme, e <code>coveredBy</code> nomina quella versione più completa. Un parlante non elencato non ha approvato.",
      peopleHeading: "Più intervistatori, più testimoni",
      people: "Un'intervista può avere un numero qualsiasi di parlanti. <code>by</code> elenca ogni intervistatore e <code>interviewOf</code> ogni osservazione con cui si è tenuta; nel file il primo intervistatore è <code>interviewer</code>, il successivo <code>interviewer2</code>, e così <code>witness</code>, <code>witness2</code>… L'editor li tiene allineati all'evento.",
      linksHeading: "Legami con l'osservazione",
      links: "Un turno può dire di quale momento dell'osservazione parla: <code>\"refs\": [{ \"at\": 0.5 }]</code>, in secondi dall'inizio dell'osservazione. <code>sighting</code> nomina l'osservazione quando l'intervista ne riguarda più d'una, e <code>range</code> (<code>[da, a]</code> in caratteri di <code>text</code>) la parte del turno interessata. Nell'editor un turno con un riferimento ha un pulsante che mostra l'osservazione in quel momento, e l'osservazione elenca sotto i passaggi che la raccontano («Riportato in …»), ciascuno un link di ritorno al turno.",
      editorHeading: "Nell'editor di interviste",
      editor: "<code>&lt;rr0-interview-editor&gt;</code> ha tre gruppi: il <strong>Riassunto</strong> (titolo, testimoni, mezzo, data, intervistatori, descrizione), gli <strong>Scambi</strong> (l'intervista letta come un dialogo: chi ha detto cosa, il tempo di ogni turno in un suggerimento, i passaggi tolti anneriti con la loro ragione, chi non ha ancora approvato) e il <strong>File</strong> (la trascrizione come testo, completata secondo il suo schema, da caricare e salvare). È un blocco a parte, scaricato solo quando un caso ha un'intervista.",
      importHeading: "Importare una trascrizione che non è nel nostro formato",
      importIntro: "La maggior parte delle trascrizioni viene da altrove. Nel gruppo File, «Carica un file» legge, oltre al JSON:",
      importFormats: [
        "<strong>WebVTT e SRT</strong>, come li scrive uno strumento di registrazione o un editor di sottotitoli: i tempi vengono conservati, il parlante è il tag <code>&lt;v Nome&gt;</code> o un <code>Nome:</code> prima del testo;",
        "<strong>testo o Markdown con un nome prima di ogni turno</strong>: <code>Nome: …</code>, <code>[00:12:34] Nome: …</code>, <code>Nome (00:12:34): …</code>, <code>Q:</code> / <code>R:</code> o <code>Q.</code> / <code>A.</code>; una riga senza nome prosegue il turno precedente;",
        "<strong>semplici paragrafi</strong>: un turno ciascuno, senza parlante né tempo."
      ],
      importSpeakers: "I nomi trovati vengono abbinati a quelli dell'intervista: uno tra chi l'ha condotta è un intervistatore, uno che è testimone del caso è quel testimone. Altrimenti il primo a parlare è l'intervistatore e gli altri testimoni; <code>Q</code> chiede sempre e <code>R</code> o <code>A</code> risponde sempre. Tutti restano in attesa di approvazione (<code>pending</code>), e la nota dice da quale file proviene.",
      importLimits: "Tira a indovinare, e lo dice: ciò che sbaglia si corregge nel gruppo File. I file di elaboratori di testo e i PDF non vengono letti: salvali prima come testo. Due punti in una frase non sono presi per un parlante finché un nome non ritorna abbastanza spesso.",
      transcribeHeading: "Trascrivere la registrazione",
      transcribe: "Quando l'intervista ha una registrazione (pulsante <strong>Registrazioni</strong> del lettore), <strong>Trascrivi la registrazione</strong>, in cima al gruppo Scambi, ne ricava i turni di parola, con i loro tempi. La trascrizione viene sostituita sul posto; le registrazioni, il titolo e il resto del file restano. Due modi, da scegliere accanto al pulsante:",
      transcribeWays: [
        "<strong>Whisper, nel tuo browser</strong> (predefinito): nulla lascia il tuo computer. La prima volta il modello (Whisper large-v3-turbo, circa 760 MB) viene scaricato e poi conservato dal browser. Su un computer recente con WebGPU trascrive circa sei volte più veloce della durata della registrazione (un'ora e mezza in circa un quarto d'ora); senza WebGPU è molto più lento.",
        "<strong>Un servizio con la tua chiave</strong> (Groq, OpenAI, AssemblyAI): più veloce, e la registrazione gli viene <em>inviata</em>, cosa che l'editor dice prima che parta qualsiasi cosa. La chiave viene chiesta accanto alla scelta, tenuta nella memoria della pagina fino al ricaricamento e mai salvata."
      ],
      transcribeVoices: "Una trascrizione non sa di chi sia ogni voce: ogni turno è dato a una <em>voce da attribuire</em> (ruolo <code>unattributed</code>), mai supposta essere quella dell'intervistatore o del testimone. Gli intervistatori e i testimoni del caso sono già parlanti, e <strong>Chi parla…</strong>, sotto ogni turno, lo dà a quello giusto; una voce a cui non è più dato alcun turno scompare. AssemblyAI separa le voci: i suoi turni arrivano come <em>Voce A</em>, <em>Voce B</em>…, e dire chi è una di esse le dà tutti i suoi turni in una volta. A una voce da attribuire non si chiede di rileggere. Il file dice come è stato fatto: <code>transcription.method</code> è <code>automatic</code> e <code>engine</code> nomina il modello. Un altro modo di trascrivere può aggiungersi come modulo (vedi Moduli (<code>case-template</code>), punto <code>transcription</code>).",
      dataHeading: "Nel codice",
      data: "<code>@rr0/data</code> legge e scrive gli stessi file: <code>RR0Interview.fromEventJson</code> / <code>toEventJson</code> per l'evento, <code>fromFileJson</code> / <code>toFileJson</code> per il file, e <code>proofread</code> dice se tutti hanno approvato. In UFO@home, <code>InterviewFile.toVtt</code> ricava sottotitoli da una trascrizione, <code>InterviewFile.passagesAbout</code> elenca i turni che raccontano un'osservazione e <code>InterviewImport.parse</code> legge un file altrui.",
      field: "Campo",
      meaning: "Significato"
    }
  }

  script(): string {
    return this.excerptsScript()
  }

  /** `<rr0-interview>`, the interview as a page shows it, which the editor's Exchanges group shows too. */
  private reader(language: SiteLanguage): string {
    const said = (en: string, fr: string, es: string, it: string): Said<string> => ({ en, fr, es, it })
    return this.componentSection(language, "rr0-interview",
      said(
        "An interview read as a dialogue: who said what, as the HTML it may be, the passages taken out as bars that say why, the time of each turn when it is pointed at, and the passages that tell of a moment of the observation as buttons that go there. It draws in the page itself, not in a shadow root, so the page's styles reach the text and its links.",
        "Une interview lue comme un dialogue : qui a dit quoi, avec la mise en forme HTML de chaque tour, les passages retirés sous forme de barres qui disent pourquoi, l'heure de chaque tour au survol, et des boutons qui mènent au moment de l'observation dont parle un passage. Le composant s'affiche dans la page elle-même, pas dans un <i lang=\"en\">shadow root</i> : les styles de la page s'appliquent donc au texte et à ses liens.",
        "Una entrevista leída como un diálogo: quién dijo qué, tal como lo dice su HTML, los pasajes retirados como barras que dicen por qué, la hora de cada turno al pasar el puntero, y los pasajes que cuentan un momento de la observación como botones que llevan a él. Dibuja en la propia página, no en una raíz oculta: los estilos de la página alcanzan el texto y sus enlaces.",
        "Un'intervista letta come un dialogo: chi ha detto cosa, come lo dice il suo HTML, i passaggi rimossi come barre che dicono perché, l'ora di ogni turno al passaggio del puntatore, e i passaggi che raccontano un momento dell'osservazione come pulsanti che ci portano. Disegna nella pagina stessa, non in una radice ombra: gli stili della pagina raggiungono il testo e i suoi link."),
      `<script src="https://ufoathome.org/lib/rr0-interview.mjs" type="module"></script>
<rr0-sighting id="player" src="case.json"></rr0-sighting>
<rr0-interview src="interview.json" player="player"></rr0-interview>`,
      said(
        "A module of its own, light: it holds the dialogue and nothing of the scene or of the editors.",
        "Un module à part, léger : il contient le dialogue et rien de la scène ni des éditeurs.",
        "Un módulo aparte, ligero: contiene el diálogo y nada de la escena ni de los editores.",
        "Un modulo a parte, leggero: contiene il dialogo e niente della scena né degli editor."),
      [
        ["src", "attribute", said(
          "The interview's file, relative to the page. Its links are relative to it.",
          "Le fichier de l'interview, relatif à la page. Ses liens sont relatifs à lui.",
          "El archivo de la entrevista, relativo a la página. Sus enlaces son relativos a él.",
          "Il file dell'intervista, relativo alla pagina. I suoi link sono relativi ad esso.")],
        ["player", "attribute", said(
          "The <code>id</code> of an <code>&lt;rr0-sighting&gt;</code> of the page: a passage followed to its moment shows the observation there, at that moment.",
          "L'<code>id</code> d'un <code>&lt;rr0-sighting&gt;</code> de la page : un passage suivi jusqu'à son moment y montre l'observation, à ce moment.",
          "El <code>id</code> de un <code>&lt;rr0-sighting&gt;</code> de la página: un pasaje seguido hasta su momento muestra allí la observación, en ese momento.",
          "L'<code>id</code> di un <code>&lt;rr0-sighting&gt;</code> della pagina: un passaggio seguito fino al suo momento vi mostra l'osservazione, in quel momento.")],
        ["interview", "property", said(
          "The interview shown, set directly instead of fetched.",
          "L'interview montrée, donnée directement au lieu d'être lue.",
          "La entrevista mostrada, dada directamente en lugar de leída.",
          "L'intervista mostrata, data direttamente invece che letta.")],
        ["documentUrl", "property", said(
          "What the links of an interview set directly are relative to.",
          "Ce à quoi les liens d'une interview donnée directement sont relatifs.",
          "Aquello a lo que son relativos los enlaces de una entrevista dada directamente.",
          "Ciò a cui sono relativi i link di un'intervista data direttamente.")],
        ["revealSegment(index)", "method", said(
          "Shows that turn and where it is.",
          "Montre ce tour et où il est.",
          "Muestra ese turno y dónde está.",
          "Mostra quel turno e dove si trova.")],
        ["interviewseek", "event", said(
          "Sent, and bubbling, when a reader follows a turn to the moment of the observation it tells of: <code>detail</code> is <code>{ sighting, at }</code>.",
          "Envoyé, en remontant, quand un lecteur suit un tour jusqu'au moment de l'observation qu'il raconte : <code>detail</code> vaut <code>{ sighting, at }</code>.",
          "Enviado, y propagado, cuando un lector sigue un turno hasta el momento de la observación que cuenta: <code>detail</code> es <code>{ sighting, at }</code>.",
          "Inviato, e propagato, quando un lettore segue un turno fino al momento dell'osservazione che racconta: <code>detail</code> è <code>{ sighting, at }</code>.")]
      ])
  }

  /** `<rr0-interview-editor>`, the editor this page's "In the editor" is about. */
  private component(language: SiteLanguage): string {
    const said = (en: string, fr: string, es: string, it: string): Said<string> => ({ en, fr, es, it })
    return this.componentSection(language, "rr0-interview-editor",
      said(
        "The editor of one interview of a case: its summary, its exchanges and its transcript file. The case editor shows it in place of the recording's editor when an interview is chosen.",
        "L'éditeur d'une interview d'un dossier : son résumé, ses échanges et son fichier de transcription. L'éditeur de dossier le montre à la place de l'éditeur d'enregistrement quand une interview est choisie.",
        "El editor de una entrevista de un caso: su resumen, sus intercambios y su archivo de transcripción. El editor de casos lo muestra en lugar del editor de grabaciones cuando se elige una entrevista.",
        "L'editor di un'intervista di un caso: il suo riassunto, i suoi scambi e il suo file di trascrizione. L'editor di casi lo mostra al posto dell'editor di registrazioni quando si sceglie un'intervista."),
      `const interview = document.createElement("rr0-interview-editor")
interview.documentUrl = "https://example.org/cases/saint-lo/case.json"
interview.witnesses = [{ id: "qb", label: "Q. B." }]
interview.event = { type: "event", eventType: "interview", interviewOf: "qb" }
interview.addEventListener("interviewchange", event => console.log(event.detail.field))`,
      said(
        "Not a bundle of its own: the case editor's module fetches it, and defines it, the first time an interview is shown, since most cases have none.",
        "Pas un module à part : celui de l'éditeur de dossier le charge, et le définit, la première fois qu'une interview est montrée, puisque la plupart des dossiers n'en ont pas.",
        "No es un módulo aparte: el del editor de casos lo descarga, y lo define, la primera vez que se muestra una entrevista, ya que la mayoría de los casos no tienen ninguna.",
        "Non è un modulo a parte: quello dell'editor di casi lo scarica, e lo definisce, la prima volta che si mostra un'intervista, poiché la maggior parte dei casi non ne ha."),
      [
        ["event", "property", said(
          "The interview's event of the case, edited in place.",
          "L'événement du dossier qui est l'interview, modifié en place.",
          "El evento del caso que es la entrevista, editado en su sitio.",
          "L'evento del caso che è l'intervista, modificato sul posto.")],
        ["witnesses", "property", said(
          "The witnesses it may have been held with, <code>[{ id, label }]</code>: one box each, at least one checked.",
          "Les témoins avec qui elle a pu avoir lieu, <code>[{ id, label }]</code> : une case chacun, une au moins cochée.",
          "Los testigos con quienes pudo celebrarse, <code>[{ id, label }]</code>: una casilla cada uno, al menos una marcada.",
          "I testimoni con cui può essersi tenuta, <code>[{ id, label }]</code>: una casella ciascuno, almeno una spuntata.")],
        ["documentUrl", "property", said(
          "What the transcript's <code>url</code> is relative to: the address of the case.",
          "Ce à quoi l'<code>url</code> de la transcription est relative : l'adresse du dossier.",
          "Aquello a lo que es relativa la <code>url</code> de la transcripción: la dirección del caso.",
          "Ciò a cui è relativo l'<code>url</code> della trascrizione: l'indirizzo del caso.")],
        ["transcriptText", "property", said(
          "The transcript as text, once edited or loaded; undefined until then, when it is fetched from the event's <code>url</code>.",
          "La transcription en texte, une fois modifiée ou chargée ; indéfinie avant, quand elle est lue à l'<code>url</code> de l'événement.",
          "La transcripción como texto, una vez editada o cargada; indefinida hasta entonces, cuando se lee de la <code>url</code> del evento.",
          "La trascrizione come testo, una volta modificata o caricata; indefinita fino ad allora, quando viene letta dall'<code>url</code> dell'evento.")],
        ["readonly", "attribute", said(
          "Only shows the interview.",
          "Ne fait que montrer l'interview.",
          "Solo muestra la entrevista.",
          "Mostra soltanto l'intervista.")],
        ["revealSegment(index)", "method", said(
          "Opens the Exchanges group at that turn and shows where it is.",
          "Ouvre le groupe Échanges à ce tour et montre où il est.",
          "Abre el grupo Intercambios en ese turno y muestra dónde está.",
          "Apre il gruppo Scambi a quel turno e mostra dove si trova.")],
        ["interviewchange", "event", said(
          "Sent, and bubbling, at each edit: <code>detail</code> is <code>{ field, event, text? }</code>, the transcript's text being in <code>text</code>.",
          "Envoyé, en remontant, à chaque modification : <code>detail</code> vaut <code>{ field, event, text? }</code>, le texte de la transcription étant dans <code>text</code>.",
          "Enviado, y propagado, en cada edición: <code>detail</code> es <code>{ field, event, text? }</code>, con el texto de la transcripción en <code>text</code>.",
          "Inviato, e propagato, a ogni modifica: <code>detail</code> è <code>{ field, event, text? }</code>, con il testo della trascrizione in <code>text</code>.")],
        ["interviewseek", "event", said(
          "Sent, and bubbling, when a reader follows a turn to the moment of the observation it tells of: <code>detail</code> is <code>{ sighting, at }</code>, <code>at</code> in seconds since the start of the observation.",
          "Envoyé, en remontant, quand un lecteur suit un tour jusqu'au moment de l'observation qu'il raconte : <code>detail</code> vaut <code>{ sighting, at }</code>, <code>at</code> en secondes depuis le début de l'observation.",
          "Enviado, y propagado, cuando un lector sigue un turno hasta el momento de la observación que cuenta: <code>detail</code> es <code>{ sighting, at }</code>, con <code>at</code> en segundos desde el inicio de la observación.",
          "Inviato, e propagato, quando un lettore segue un turno fino al momento dell'osservazione che racconta: <code>detail</code> è <code>{ sighting, at }</code>, con <code>at</code> in secondi dall'inizio dell'osservazione.")]
      ])
  }

  private readonly questionnaireText: Said<QuestionnaireDocText> = {
    en: {
      heading: "Questionnaires",
      concept: "An interview may be held through a <strong>questionnaire</strong>: a form the witness fills in, alone or with an investigator. UFO@home knows none in particular. A questionnaire is a <strong>template</strong>, a JSON file that says its questions, in sections, and the kind of answer each asks; the form is drawn from it. Which questionnaires a new case asks its witness to fill in is said by the case template (<code>case-template</code>) the page names, and by nothing else: without one, no case is given a questionnaire. GEIPAN's technical questionnaire is one such template, shipped with UFO@home (<code>geipan-qt-2025</code>); any other can be named by its address.",
      exchanges: "The form is a view of the interview, not a file of its own. Each question is a turn of the interviewer, with its <code>field</code>; each answer is the witness's turn right after it, with the same <code>field</code>, in the words typed or ticked. A question left empty has no answer turn: it stays unanswered, never an absence. So the Exchanges group reads a filled questionnaire as a dialogue, and a value of the observation set from an answer cites that turn (<code>source.said</code>).",
      when: "A date or a time is always offered two ways: <strong>precise</strong>, the browser's picker, or <strong>imprecise</strong>, in the witness's own words (“around 9 pm”, “early July”), which a picker would force into a figure they never gave. Only what reads as a figure is set in the observation.",
      sealed: "Some answers are for the organisation that receives the testimony only: a precise address, a name. Such a question is <code>confidential</code>. The case template names that organisation, its <code>recipient</code>, with its <strong>public</strong> key; the interview keeps it (<code>questionnaire.recipient</code>). Each confidential answer is then encrypted in the browser with a key drawn for it alone (AES-GCM), and that key with the recipient's public key (RSA-OAEP). The case can go anywhere, be shared or published: everybody sees that an answer was given and why it is confidential, only the holder of the private key reads it, and nobody had to send a key to anybody. In clear, the answer stays in the page it was typed in only; once reloaded, it can be replaced, not shown. Without a recipient, a confidential answer is kept in no file at all. UFO@home holds no key that opens them: the recipient brings its own <a href=\"/docs/modules/\">module</a>, at the <code>sealed</code> extension point, whose <em>Open with…</em> button in the Exchanges reads an answer with its private key, in the page only.",
      techHeading: "The questionnaire template",
      techIntro: "A template is read by its id when UFO@home ships it, otherwise from its address, its pictures' <code>src</code> relative to it.",
      templateRows: [
        ["id", "What an interview names it by (<code>questionnaire.id</code>)"],
        ["version", "Its version, as its publisher names it (<code>questionnaire.version</code>)"],
        ["language", "The language its questions are in"],
        ["title", "Its name, in as many languages as you like"],
        ["intro", "What the witness reads before the questions; a blank line separates paragraphs. Without it the form says what it is"],
        ["source", "<code>{ publisher, title, url, date }</code>: the questionnaire as published, linked from the form"],
        ["note", "What this template keeps or leaves out of the published questionnaire"],
        ["stops", "The titles of the parts of a printed questionnaire that ask nothing to put in a case (personal details, a grant of rights): what is under them in a filled one is not read as answers"],
        ["sections", "<code>{ title, intro?, images?, fields }</code>, in order"]
      ],
      fieldHeading: "A question",
      fieldRows: [
        ["id", "Its number or name, as the questionnaire gives it: the <code>field</code> of its turns"],
        ["question", "What is asked"],
        ["hint", "Said under the question"],
        ["kind", "<code>text</code> (a line), <code>long</code> (a text, the default), <code>date</code>, <code>time</code>, <code>choice</code>, <code>scale</code> or <code>files</code> (files the witness gives: a map they marked, a sketch, a photo drawn over)"],
        ["accept", "For <code>files</code>: the kinds of file it takes, as a file picker says them (<code>image/*,.pdf,.kml</code>)"],
        ["choices", "For <code>choice</code> and <code>scale</code>: <code>{ value, label }</code>, the value being what the answer turn says"],
        ["multiple", "For <code>choice</code>: several may be ticked (a multiple-choice question), written one after another separated by <code>; </code>"],
        ["required", "<code>false</code> when not every witness is asked it"],
        ["images", "<code>{ src, alt, caption? }</code>, shown under the question: a compass rose, heights above the horizon"],
        ["confidential", "An answer only the recipient may read: <code>{ reason }</code>. It is written taken out (<code>redacted</code>, with that reason) and its text sealed for the recipient (<code>redacted.sealed</code>)"],
        ["feeds", "What the answer may set in the observation: <code>narrative</code>, <code>date</code>, <code>startTime</code>, <code>duration</code>, <code>color</code>, <code>startAzimuth</code>, <code>startElevation</code>, <code>endAzimuth</code>, <code>endElevation</code>"]
      ],
      exampleHeading: "An example",
      exampleIntro: "A template, then the interview it makes once filled in: the second question left empty has no answer turn."
    },
    fr: {
      heading: "Les questionnaires",
      concept: "Une interview peut être tenue par <strong>questionnaire</strong> : un formulaire que le témoin remplit, seul ou avec un enquêteur. UFO@home n'en connaît aucun en particulier. Un questionnaire est un <strong>modèle</strong>, un fichier JSON qui dit ses questions, par sections, et le genre de réponse que chacune demande ; le formulaire en est tiré. Quels questionnaires un nouveau dossier demande à son témoin de remplir, c'est le modèle de dossier (<code>case-template</code>) que nomme la page qui le dit, et rien d'autre : sans lui, aucun dossier ne reçoit de questionnaire. Le questionnaire technique du GEIPAN est un tel modèle, livré avec UFO@home (<code>geipan-qt-2025</code>) ; tout autre peut être nommé par son adresse.",
      exchanges: "Le formulaire est une vue de l'interview, pas un fichier à part. Chaque question est un tour de l'enquêteur, avec son <code>field</code> ; chaque réponse est le tour du témoin juste après, avec le même <code>field</code>, dans les mots tapés ou cochés. Une question laissée vide n'a pas de tour de réponse : elle reste sans réponse, jamais une absence. Le groupe Échanges lit donc un questionnaire rempli comme un dialogue, et une valeur de l'observation tirée d'une réponse cite ce tour (<code>source.said</code>).",
      when: "Une date ou une heure est toujours proposée de deux façons : <strong>précise</strong>, avec le sélecteur du navigateur, ou <strong>imprécise</strong>, dans les mots du témoin (« vers 21 h », « début juillet »), qu'un sélecteur forcerait en un chiffre qu'il n'a jamais donné. Seul ce qui se lit comme un chiffre est reporté dans l'observation.",
      sealed: "Certaines réponses ne sont que pour l'organisme qui reçoit le témoignage : une adresse précise, un nom. Une telle question est <code>confidential</code>. Le modèle de dossier nomme cet organisme, son <code>recipient</code>, avec sa clé <strong>publique</strong> ; l'interview la garde (<code>questionnaire.recipient</code>). Chaque réponse confidentielle est alors chiffrée dans le navigateur avec une clé tirée pour elle seule (AES-GCM), et cette clé avec la clé publique du destinataire (RSA-OAEP). Le dossier peut aller partout, être partagé ou publié : chacun voit qu'une réponse a été donnée et pourquoi elle est confidentielle, seul le détenteur de la clé privée la lit, et personne n'a eu à envoyer de clé à personne. En clair, la réponse ne reste que dans la page où elle a été tapée ; une fois celle-ci rechargée, elle peut être remplacée, pas affichée. Sans destinataire, une réponse confidentielle n'est gardée dans aucun fichier. UFO@home ne détient aucune clé qui les ouvre : le destinataire apporte son propre <a href=\"/docs/modules/\">module</a>, au point d'extension <code>sealed</code>, dont le bouton <em>Ouvrir avec…</em> des Échanges lit une réponse avec sa clé privée, dans la page seulement.",
      techHeading: "Le modèle de questionnaire",
      techIntro: "Un modèle est lu par son id quand UFO@home le livre, sinon à son adresse, le <code>src</code> de ses images étant relatif à celle-ci.",
      templateRows: [
        ["id", "Ce par quoi une interview le nomme (<code>questionnaire.id</code>)"],
        ["version", "Sa version, telle que son éditeur la nomme (<code>questionnaire.version</code>)"],
        ["language", "La langue de ses questions"],
        ["title", "Son nom, dans autant de langues qu'on veut"],
        ["intro", "Ce que le témoin lit avant les questions ; une ligne vide sépare les paragraphes. Sans lui, le formulaire dit ce qu'il est"],
        ["source", "<code>{ publisher, title, url, date }</code> : le questionnaire tel que publié, lié depuis le formulaire"],
        ["note", "Ce que ce modèle garde ou laisse du questionnaire publié"],
        ["stops", "Les titres des parties d'un questionnaire imprimé qui ne demandent rien à mettre dans un dossier (état civil, cession de droits) : ce qui est dessous dans un questionnaire rempli n'est pas lu comme des réponses"],
        ["sections", "<code>{ title, intro?, images?, fields }</code>, dans l'ordre"]
      ],
      fieldHeading: "Une question",
      fieldRows: [
        ["id", "Son numéro ou son nom, comme le questionnaire le donne : le <code>field</code> de ses tours"],
        ["question", "Ce qui est demandé"],
        ["hint", "Dit sous la question"],
        ["kind", "<code>text</code> (une ligne), <code>long</code> (un texte, par défaut), <code>date</code>, <code>time</code>, <code>choice</code>, <code>scale</code> ou <code>files</code> (des fichiers que le témoin donne : un plan qu'il a annoté, un croquis, une photo dessinée par-dessus)"],
        ["accept", "Pour <code>files</code> : les sortes de fichier qu'il prend, comme un sélecteur de fichier les dit (<code>image/*,.pdf,.kml</code>)"],
        ["choices", "Pour <code>choice</code> et <code>scale</code> : <code>{ value, label }</code>, la valeur étant ce que dit le tour de réponse"],
        ["multiple", "Pour <code>choice</code> : plusieurs peuvent être cochés (un QCM), écrits à la suite séparés par <code>; </code>"],
        ["required", "<code>false</code> quand elle n'est pas posée à tout témoin"],
        ["images", "<code>{ src, alt, caption? }</code>, montrées sous la question : une rose des vents, les hauteurs au-dessus de l'horizon"],
        ["confidential", "Une réponse que seul le destinataire peut lire : <code>{ reason }</code>. Elle est écrite caviardée (<code>redacted</code>, avec cette raison) et son texte scellé pour le destinataire (<code>redacted.sealed</code>)"],
        ["feeds", "Ce que la réponse peut reporter dans l'observation : <code>narrative</code>, <code>date</code>, <code>startTime</code>, <code>duration</code>, <code>color</code>, <code>startAzimuth</code>, <code>startElevation</code>, <code>endAzimuth</code>, <code>endElevation</code>"]
      ],
      exampleHeading: "Un exemple",
      exampleIntro: "Un modèle, puis l'interview qu'il donne une fois rempli : la deuxième question laissée vide n'a pas de tour de réponse."
    },
    es: {
      heading: "Los cuestionarios",
      concept: "Una entrevista puede hacerse mediante un <strong>cuestionario</strong>: un formulario que el testigo rellena, solo o con un investigador. UFO@home no conoce ninguno en particular. Un cuestionario es una <strong>plantilla</strong>, un archivo JSON que dice sus preguntas, por secciones, y el tipo de respuesta que pide cada una; el formulario se saca de ella. Qué cuestionarios pide un caso nuevo a su testigo lo dice la plantilla de caso (<code>case-template</code>) que nombra la página, y nada más: sin ella, ningún caso recibe cuestionario. El cuestionario técnico del GEIPAN es una de esas plantillas, incluida en UFO@home (<code>geipan-qt-2025</code>); cualquier otra puede nombrarse por su dirección.",
      exchanges: "El formulario es una vista de la entrevista, no un archivo aparte. Cada pregunta es un turno del investigador, con su <code>field</code>; cada respuesta es el turno del testigo justo después, con el mismo <code>field</code>, en las palabras escritas o marcadas. Una pregunta dejada vacía no tiene turno de respuesta: queda sin respuesta, nunca es una ausencia. Así el grupo Intercambios lee un cuestionario rellenado como un diálogo, y un valor de la observación sacado de una respuesta cita ese turno (<code>source.said</code>).",
      when: "Una fecha o una hora se ofrece siempre de dos maneras: <strong>precisa</strong>, con el selector del navegador, o <strong>imprecisa</strong>, con las palabras del testigo («hacia las 21 h», «a principios de julio»), que un selector forzaría en una cifra que nunca dio. Solo lo que se lee como una cifra se lleva a la observación.",
      sealed: "Algunas respuestas son solo para el organismo que recibe el testimonio: una dirección precisa, un nombre. Una pregunta así es <code>confidential</code>. La plantilla de caso nombra ese organismo, su <code>recipient</code>, con su clave <strong>pública</strong>; la entrevista la conserva (<code>questionnaire.recipient</code>). Cada respuesta confidencial se cifra entonces en el navegador con una clave sacada solo para ella (AES-GCM), y esa clave con la clave pública del destinatario (RSA-OAEP). El caso puede ir a cualquier parte, compartirse o publicarse: todos ven que se dio una respuesta y por qué es confidencial, solo quien tiene la clave privada la lee, y nadie tuvo que enviar una clave a nadie. En claro, la respuesta solo queda en la página donde se escribió; una vez recargada, puede sustituirse, no mostrarse. Sin destinatario, una respuesta confidencial no se guarda en ningún archivo. UFO@home no tiene ninguna clave que las abra: el destinatario trae su propio <a href=\"/docs/modules/\">módulo</a>, en el punto de extensión <code>sealed</code>, cuyo botón <em>Abrir con…</em> de los Intercambios lee una respuesta con su clave privada, solo en la página.",
      techHeading: "La plantilla de cuestionario",
      techIntro: "Una plantilla se lee por su id cuando UFO@home la incluye, si no en su dirección, con el <code>src</code> de sus imágenes relativo a esta.",
      templateRows: [
        ["id", "Lo que una entrevista usa para nombrarla (<code>questionnaire.id</code>)"],
        ["version", "Su versión, como la nombra su editor (<code>questionnaire.version</code>)"],
        ["language", "El idioma de sus preguntas"],
        ["title", "Su nombre, en tantos idiomas como se quiera"],
        ["intro", "Lo que el testigo lee antes de las preguntas; una línea vacía separa los párrafos. Sin él, el formulario dice lo que es"],
        ["source", "<code>{ publisher, title, url, date }</code>: el cuestionario tal como se publicó, enlazado desde el formulario"],
        ["note", "Lo que esta plantilla conserva o deja del cuestionario publicado"],
        ["stops", "Los títulos de las partes de un cuestionario impreso que no piden nada que poner en un caso (datos personales, cesión de derechos): lo que hay debajo en uno rellenado no se lee como respuestas"],
        ["sections", "<code>{ title, intro?, images?, fields }</code>, en orden"]
      ],
      fieldHeading: "Una pregunta",
      fieldRows: [
        ["id", "Su número o su nombre, como lo da el cuestionario: el <code>field</code> de sus turnos"],
        ["question", "Lo que se pregunta"],
        ["hint", "Dicho bajo la pregunta"],
        ["kind", "<code>text</code> (una línea), <code>long</code> (un texto, por defecto), <code>date</code>, <code>time</code>, <code>choice</code>, <code>scale</code> o <code>files</code> (archivos que da el testigo: un plano que anotó, un croquis, una foto dibujada encima)"],
        ["accept", "Para <code>files</code>: los tipos de archivo que acepta, como los dice un selector de archivos (<code>image/*,.pdf,.kml</code>)"],
        ["choices", "Para <code>choice</code> y <code>scale</code>: <code>{ value, label }</code>, siendo el valor lo que dice el turno de respuesta"],
        ["multiple", "Para <code>choice</code>: se pueden marcar varias (una pregunta de opción múltiple), escritas una tras otra separadas por <code>; </code>"],
        ["required", "<code>false</code> cuando no se pregunta a todo testigo"],
        ["images", "<code>{ src, alt, caption? }</code>, mostradas bajo la pregunta: una rosa de los vientos, las alturas sobre el horizonte"],
        ["confidential", "Una respuesta que solo el destinatario puede leer: <code>{ reason }</code>. Se escribe eliminada (<code>redacted</code>, con esa razón) y su texto sellado para el destinatario (<code>redacted.sealed</code>)"],
        ["feeds", "Lo que la respuesta puede llevar a la observación: <code>narrative</code>, <code>date</code>, <code>startTime</code>, <code>duration</code>, <code>color</code>, <code>startAzimuth</code>, <code>startElevation</code>, <code>endAzimuth</code>, <code>endElevation</code>"]
      ],
      exampleHeading: "Un ejemplo",
      exampleIntro: "Una plantilla, y luego la entrevista que da una vez rellenada: la segunda pregunta dejada vacía no tiene turno de respuesta."
    },
    it: {
      heading: "I questionari",
      concept: "Un'intervista può essere tenuta tramite <strong>questionario</strong>: un modulo che il testimone compila, da solo o con un investigatore. UFO@home non ne conosce nessuno in particolare. Un questionario è un <strong>modello</strong>, un file JSON che dice le sue domande, per sezioni, e il tipo di risposta che ciascuna chiede; il modulo ne è tratto. Quali questionari un nuovo caso chiede al suo testimone lo dice il modello di caso (<code>case-template</code>) che la pagina nomina, e nient'altro: senza, nessun caso riceve un questionario. Il questionario tecnico del GEIPAN è uno di questi modelli, fornito con UFO@home (<code>geipan-qt-2025</code>); qualsiasi altro può essere nominato con il suo indirizzo.",
      exchanges: "Il modulo è una vista dell'intervista, non un file a parte. Ogni domanda è un turno dell'investigatore, con il suo <code>field</code>; ogni risposta è il turno del testimone subito dopo, con lo stesso <code>field</code>, nelle parole scritte o spuntate. Una domanda lasciata vuota non ha turno di risposta: resta senza risposta, mai un'assenza. Così il gruppo Scambi legge un questionario compilato come un dialogo, e un valore dell'osservazione tratto da una risposta cita quel turno (<code>source.said</code>).",
      when: "Una data o un'ora è sempre proposta in due modi: <strong>precisa</strong>, con il selettore del browser, o <strong>imprecisa</strong>, nelle parole del testimone («verso le 21», «inizio luglio»), che un selettore forzerebbe in una cifra mai data. Solo ciò che si legge come una cifra è riportato nell'osservazione.",
      sealed: "Alcune risposte sono solo per l'organismo che riceve la testimonianza: un indirizzo preciso, un nome. Una tale domanda è <code>confidential</code>. Il modello di caso nomina quell'organismo, il suo <code>recipient</code>, con la sua chiave <strong>pubblica</strong>; l'intervista la conserva (<code>questionnaire.recipient</code>). Ogni risposta riservata è allora cifrata nel browser con una chiave estratta solo per lei (AES-GCM), e quella chiave con la chiave pubblica del destinatario (RSA-OAEP). Il caso può andare ovunque, essere condiviso o pubblicato: tutti vedono che una risposta è stata data e perché è riservata, solo chi detiene la chiave privata la legge, e nessuno ha dovuto inviare una chiave a nessuno. In chiaro, la risposta resta solo nella pagina in cui è stata scritta; una volta ricaricata, può essere sostituita, non mostrata. Senza destinatario, una risposta riservata non è conservata in nessun file. UFO@home non detiene alcuna chiave che le apra: il destinatario porta il proprio <a href=\"/docs/modules/\">modulo</a>, al punto di estensione <code>sealed</code>, il cui pulsante <em>Aprire con…</em> degli Scambi legge una risposta con la sua chiave privata, solo nella pagina.",
      techHeading: "Il modello di questionario",
      techIntro: "Un modello è letto con il suo id quando UFO@home lo fornisce, altrimenti al suo indirizzo, con il <code>src</code> delle sue immagini relativo a questo.",
      templateRows: [
        ["id", "Ciò con cui un'intervista lo nomina (<code>questionnaire.id</code>)"],
        ["version", "La sua versione, come la nomina il suo editore (<code>questionnaire.version</code>)"],
        ["language", "La lingua delle sue domande"],
        ["title", "Il suo nome, in quante lingue si vuole"],
        ["intro", "Ciò che il testimone legge prima delle domande; una riga vuota separa i paragrafi. Senza, il modulo dice ciò che è"],
        ["source", "<code>{ publisher, title, url, date }</code>: il questionario come pubblicato, collegato dal modulo"],
        ["note", "Ciò che questo modello tiene o lascia del questionario pubblicato"],
        ["stops", "I titoli delle parti di un questionario stampato che non chiedono nulla da mettere in un caso (dati personali, cessione di diritti): ciò che c'è sotto in uno compilato non è letto come risposte"],
        ["sections", "<code>{ title, intro?, images?, fields }</code>, in ordine"]
      ],
      fieldHeading: "Una domanda",
      fieldRows: [
        ["id", "Il suo numero o nome, come lo dà il questionario: il <code>field</code> dei suoi turni"],
        ["question", "Ciò che è chiesto"],
        ["hint", "Detto sotto la domanda"],
        ["kind", "<code>text</code> (una riga), <code>long</code> (un testo, predefinito), <code>date</code>, <code>time</code>, <code>choice</code>, <code>scale</code> o <code>files</code> (file che il testimone fornisce: una mappa annotata, uno schizzo, una foto disegnata sopra)"],
        ["accept", "Per <code>files</code>: i tipi di file che accetta, come li dice un selettore di file (<code>image/*,.pdf,.kml</code>)"],
        ["choices", "Per <code>choice</code> e <code>scale</code>: <code>{ value, label }</code>, il valore essendo ciò che dice il turno di risposta"],
        ["multiple", "Per <code>choice</code>: se ne possono spuntare diverse (una domanda a scelta multipla), scritte una dopo l'altra separate da <code>; </code>"],
        ["required", "<code>false</code> quando non è chiesta a ogni testimone"],
        ["images", "<code>{ src, alt, caption? }</code>, mostrate sotto la domanda: una rosa dei venti, le altezze sopra l'orizzonte"],
        ["confidential", "Una risposta che solo il destinatario può leggere: <code>{ reason }</code>. È scritta rimossa (<code>redacted</code>, con quel motivo) e il suo testo sigillato per il destinatario (<code>redacted.sealed</code>)"],
        ["feeds", "Ciò che la risposta può riportare nell'osservazione: <code>narrative</code>, <code>date</code>, <code>startTime</code>, <code>duration</code>, <code>color</code>, <code>startAzimuth</code>, <code>startElevation</code>, <code>endAzimuth</code>, <code>endElevation</code>"]
      ],
      exampleHeading: "Un esempio",
      exampleIntro: "Un modello, poi l'intervista che dà una volta compilato: la seconda domanda lasciata vuota non ha turno di risposta."
    }
  }

  render(language: SiteLanguage): string {
    const t = this.text[language]
    const q = this.questionnaireText[language]
    const table = (rows: ReadonlyArray<[string, string]>): string => `
    <div class="table-scroll"><table>
      <tr><th>${t.field}</th><th>${t.meaning}</th></tr>
      ${rows.map(([field, meaning]) => `<tr><td><code>${field.split(", ").join("</code>, <code>")}</code></td><td>${meaning}</td></tr>`).join("\n      ")}
    </table></div>`
    return this.hero(language, this.meta.title, { en: t.lede, fr: t.lede, es: t.lede, it: t.lede }) + `
<section class="band">
  <div class="wrap prose-wide">
    <p>${t.intro}</p>

    <p>${t.concept}</p>

    <h2>${t.peopleHeading}</h2>
    <p>${t.people}</p>

    <h2>${t.placeHeading}</h2>
    <p>${t.place}</p>
    <p>${t.links}</p>

    <h2>${t.redactionHeading}</h2>
    <p>${t.redaction}</p>

    <h2>${t.proofreadHeading}</h2>
    <p>${t.proofread}</p>

    <h2>${t.editorHeading}</h2>
    <p>${t.editor}</p>

    <h2>${t.importHeading}</h2>
    <p>${t.importIntro}</p>
    <ul>
      ${t.importFormats.map(format => `<li>${format}</li>`).join("\n      ")}
    </ul>
    <p>${t.importSpeakers}</p>
    <p>${t.importLimits}</p>

    <h2>${t.transcribeHeading}</h2>
    <p>${t.transcribe}</p>
    <ul>
      ${t.transcribeWays.map(way => `<li>${way}</li>`).join("\n      ")}
    </ul>
    <p>${t.transcribeVoices}</p>

    <h2>${q.heading}</h2>
    <p>${q.concept}</p>
    <p>${q.exchanges}</p>
    <p>${q.when}</p>
    <p>${q.sealed}</p>

    <h2>${t.techHeading}</h2>
    <p>${t.techIntro}</p>

    <h3>${t.eventHeading}</h3>
    <p>${t.eventIntro}</p>${table(t.eventRows)}

    <h3>${t.fileHeading}</h3>
    <p>${t.fileIntro}</p>${table(t.fileRows)}

    <h4>${t.segmentHeading}</h4>
    <p>${t.segmentIntro}</p>${table(t.segmentRows)}

    <p class="small">${this.excerptNote(language)}</p>
    <h4>${t.exampleHeading}</h4>
    <pre data-schema="interview"><code>${EXAMPLE.replace(/&/g, "&amp;").replace(/</g, "&lt;")}</code></pre>

    <h3>${q.techHeading}</h3>
    <p>${q.techIntro}</p>${table(q.templateRows)}

    <h4>${q.fieldHeading}</h4>${table(q.fieldRows)}

    <h4>${q.exampleHeading}</h4>
    <p>${q.exampleIntro}</p>
    <pre><code>${QUESTIONNAIRE_EXAMPLE.replace(/&/g, "&amp;").replace(/</g, "&lt;")}</code></pre>
    <pre><code>${QUESTIONNAIRE_EXCHANGES.replace(/&/g, "&amp;").replace(/</g, "&lt;")}</code></pre>

    <h3>${t.dataHeading}</h3>
    <p>${t.data}</p>${this.reader(language)}${this.component(language)}
  </div>
</section>
`
  }
}
