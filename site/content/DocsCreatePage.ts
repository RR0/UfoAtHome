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
    navLabel: {
      en: "Creating an observation",
      fr: "Créer une observation",
      es: "Crear una observación",
      it: "Creare un'osservazione"
    },
    title: {
      en: "Create an observation",
      fr: "Créer une observation",
      es: "Crear una observación",
      it: "Creare un'osservazione"
    },
    description: {
      en: "Three ways to make a recording: in the editor, with an AI assistant working from the "
        + "case documents, or by writing the file yourself, whose format has its own page.",
      fr: "Trois façons de faire un enregistrement : dans l'éditeur, avec un assistant IA qui "
        + "travaille sur les documents du cas, ou en écrivant le fichier vous-même, dont le format "
        + "a sa propre page.",
      es: "Tres maneras de hacer una grabación: en el editor, con un asistente de IA que trabaja a "
        + "partir de los documentos del caso, o escribiendo tú mismo el archivo, cuyo formato "
        + "tiene su propia página.",
      it: "Tre modi per fare una registrazione: nell'editor, con un assistente IA che lavora sui "
        + "documenti del caso, o scrivendo tu stesso il file, il cui formato ha una pagina "
        + "a sé."
    },
    asideFromNav: true
  }

  private readonly lede: Said<string> = {
    en: "Draw it in the editor, have an AI assistant write it from the case file, or write it "
      + "yourself. All three produce the same thing: one JSON file that is yours, and that anybody "
      + "can replay.",
    fr: "Dessinez-la dans l'éditeur, faites-la écrire par un assistant IA à partir du dossier, ou "
      + "écrivez-la vous-même. Les trois produisent la même chose : un fichier JSON qui est le "
      + "vôtre, et que n'importe qui peut rejouer.",
    es: "Dibújala en el editor, haz que un asistente de IA la escriba a partir del expediente, o "
      + "escríbela tú mismo. Las tres dan lo mismo: un archivo JSON que es tuyo, y que cualquiera "
      + "puede volver a reproducir.",
    it: "Disegnala nell'editor, falla scrivere a un assistente IA a partire dal fascicolo, o "
      + "scrivila tu stesso. Tutti e tre producono la stessa cosa: un file JSON che è tuo, e "
      + "che chiunque può riprodurre."
  }

  render(language: SiteLanguage): string {
    return this.hero(language, this.meta.title, this.lede) + ({ en: () => this.en(), fr: () => this.fr(), es: () => this.es(), it: () => this.it() })[language]()
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
    <p>It ends with <strong>Save</strong>, which hands you a file. That file is the whole
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
    <p>Or install the <strong>UFO@home skill</strong> in your assistant: the same instructions,
      with the method, the format's rules, the schema, an example and a validator that needs only
      Python, so you only have to hand it the documents.
      <a href="/skill/ufoathome-recording.zip">Download the skill</a> (a zip to add to Claude's
      skills, or to unpack in <code>~/.claude/skills/</code> for Claude Code), or
      <a href="/skill/SKILL.md">read it first</a>.</p>
    <p>Then check what it wrote, the way you would check a colleague's work:</p>
    <ul>
      <li><strong>Play it.</strong> Open it in <a href="/play/">the player</a>, from your computer
        with the photos it names. Is the phenomenon where the drawings put it, against the right
        trees, at the right height above the horizon? Say what is off, and have it corrected.</li>
      <li><strong>Read the <code>assumed</code> values.</strong> They are the list of what nobody
        said. Each is a question for the observer, or a place where the reconstruction stands on a
        guess.</li>
      <li><strong>Finish in <a href="/edit/">the editor</a></strong> what is easier to do with a mouse than with a
        sentence: moving a building by a few metres, nudging a direction until it sits on the
        photo.</li>
      <li><strong>Show it to the observer.</strong> The only test that counts is whether they
        recognise what they saw.</li>
    </ul>
    <p>An observer who has only their own account can do this inside the editor: type it in the
      <em>Summary</em> tab, choose what drafts it (Claude today: your own API key, and the
      model), and the editor drafts the rest of the recording from it, sending nothing anywhere but
      to that model.</p>
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
    <p>Cela se termine par <strong>Sauver</strong>, qui vous remet un fichier. Ce fichier est
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
    <p>Ou installez le <strong>skill UFO@home</strong> dans votre assistant : les mêmes consignes,
      avec la méthode, les règles du format, le schéma, un exemple et un validateur qui ne demande
      que Python, si bien qu'il ne reste qu'à lui confier les documents.
      <a href="/skill/ufoathome-recording.zip">Télécharger le skill</a> (un zip à ajouter aux
      skills de Claude, ou à décompresser dans <code>~/.claude/skills/</code> pour Claude Code), ou
      <a href="/skill/SKILL.md">le lire d'abord</a>.</p>
    <p>Puis vérifiez ce qu'il a écrit, comme vous vérifieriez le travail d'un collègue :</p>
    <ul>
      <li><strong>Jouez-le.</strong> Ouvrez-le dans <a href="/play/">le lecteur</a>, depuis votre
        ordinateur avec les photos qu'il nomme. Le phénomène est-il là où les dessins le mettent,
        devant les bons arbres, à la bonne hauteur au-dessus de l'horizon ? Dites ce qui cloche, et
        faites-le corriger.</li>
      <li><strong>Lisez les valeurs <code>assumed</code>.</strong> C'est la liste de ce que
        personne n'a dit. Chacune est une question pour l'observateur, ou un endroit où la
        reconstitution repose sur une supposition.</li>
      <li><strong>Terminez dans <a href="/edit/">l'éditeur</a></strong> ce qui se fait mieux à la souris qu'avec une
        phrase : déplacer un bâtiment de quelques mètres, ajuster une direction jusqu'à ce qu'elle
        tombe sur la photo.</li>
      <li><strong>Montrez-le à l'observateur.</strong> Le seul test qui compte est qu'il reconnaisse
        ce qu'il a vu.</li>
    </ul>
    <p>Un observateur qui n'a que son propre récit peut le faire dans l'éditeur : il le tape dans
      l'onglet <em>Résumé</em>, choisit ce qui le rédige (Claude aujourd'hui : sa propre clé
      d'API, et le modèle), et l'éditeur rédige le reste de l'enregistrement à partir de lui, sans
      rien envoyer ailleurs qu'à ce modèle.</p>
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

  private es(): string {
    return `
<section class="band">
  <div class="wrap prose-wide">
    <h2>1. En el editor</h2>
    <p>La vía habitual, y la que conviene usar salvo que tengas una razón para no hacerlo. Dibuja lo
      que se vio, di cuándo y dónde, registra cómo se movió — y el cielo, el tiempo y el terreno se
      consultan por ti en lugar de recordarse.</p>
    <p class="doc-try-actions">
      <a class="btn btn-primary" href="/edit/">Abrir el editor</a>
      <a class="btn" href="/edit/#manual">Leer el manual</a>
    </p>
    <p>Termina con <strong>Guardar</strong>, que te entrega un archivo. Ese archivo es la grabación
      completa: no hay cuenta y aquí no se guarda nada. Ponlo en algún lugar con una dirección
      pública y estará listo para <a href="/docs/share/">compartir</a>.</p>
    <p>¿Ya tienes una y quieres cambiarla? El editor se abre con una grabación existente — el panel
      <q>?</q> de cada reconstrucción publicada lleva el enlace que lo hace.</p>
  </div>
</section>

<section class="band">
  <div class="wrap prose-wide">
    <h2>2. Con un asistente de IA, a partir del expediente</h2>
    <p>Cuando un caso ya tiene sus documentos (un informe, un cuestionario, una declaración, bocetos,
      fotos del lugar, un mapa), lo más rápido suele ser dárselos a un asistente de IA capaz de leer
      PDF e imágenes y de ejecutar un poco de código, indicarle esta documentación y hacer que escriba
      el archivo. Lee el relato, mide los dibujos, calcula direcciones sobre el mapa, consulta lo que
      se puede consultar y escribe lo que encontró en el formato. Después tú miras el resultado y le
      dices lo que está mal.</p>
    <p>El asistente no sabe del caso más que lo que tú le das, ni del formato más que lo que dicen
      estas páginas. Así que pídele la disciplina que mantendría un investigador:</p>
    <pre class="doc-prompt"><code>Aquí están los documentos de un caso de avistamiento. Construye una
grabación UFO@home de lo que vio el observador: el archivo JSON descrito
en https://ufoathome.org/docs/format/ , verificado con
https://ufoathome.org/sighting.schema.json .

- Indica solo lo que los documentos respaldan. Escribe cada valor que
  hayas calculado como {"value": ..., "basis": "derived", "rationale":
  "..."} y cada valor que hayas tenido que elegir con "basis": "assumed".
- El fenómeno son solo ángulos: su dirección (aim) y su tamaño aparente
  (angular) en cada momento. Los metros que dio el observador van en
  "interpretation", nunca en las formas.
- Enumera las contradicciones entre los documentos, y las preguntas que
  hay que volver a plantear al observador o al investigador.</code></pre>
    <p>O instala la <strong>skill de UFO@home</strong> en tu asistente: las mismas instrucciones,
      con el método, las reglas del formato, el esquema, un ejemplo y un validador que solo necesita
      Python, de modo que solo tengas que darle los documentos.
      <a href="/skill/ufoathome-recording.zip">Descargar la skill</a> (un zip que añadir a las
      skills de Claude, o que descomprimir en <code>~/.claude/skills/</code> para Claude Code), o
      <a href="/skill/SKILL.md">leerla primero</a>.</p>
    <p>Después comprueba lo que escribió, como comprobarías el trabajo de un colega:</p>
    <ul>
      <li><strong>Reprodúcela.</strong> Ábrela en <a href="/play/">el reproductor</a>, desde tu
        ordenador con las fotos que nombra. ¿Está el fenómeno donde lo sitúan los dibujos, delante de
        los árboles correctos, a la altura correcta sobre el horizonte? Di lo que no encaja, y haz
        que lo corrija.</li>
      <li><strong>Lee los valores <code>assumed</code>.</strong> Son la lista de lo que nadie dijo.
        Cada uno es una pregunta para el observador, o un punto donde la reconstrucción se apoya en
        una suposición.</li>
      <li><strong>Termina en <a href="/edit/">el editor</a></strong> lo que es más fácil hacer con un ratón que con una
        frase: desplazar un edificio unos metros, ajustar una dirección hasta que quede sobre la
        foto.</li>
      <li><strong>Enséñasela al observador.</strong> La única prueba que cuenta es si reconoce lo que
        vio.</li>
    </ul>
    <p>Un observador que solo tiene su propio relato puede hacerlo dentro del editor: lo escribe en
      la pestaña <em>Resumen</em>, elige qué lo redacta (hoy Claude: su propia clave de API, y el
      modelo), y el editor redacta el resto de la grabación a partir de él, sin enviar nada a ningún
      sitio salvo a ese modelo.</p>
    <p class="small">Un relato es un dato personal. Antes de dar documentos a un asistente en línea,
      quita lo que identifica al observador salvo que haya dado su consentimiento, y comprueba qué
      conserva el servicio. Y un asistente puede equivocarse con aplomo: el archivo solo vale lo que
      valen los documentos en que se basa y la comprobación posterior.</p>
  </div>
</section>

<section class="band">
  <div class="wrap prose-wide">
    <h2>3. A mano, o desde tu propio archivo</h2>
    <p>Una grabación es un archivo de forma documentada, así que nada te impide escribir una en un
      editor de texto, o generar mil desde una base de datos que ya tengas: es exactamente lo que
      escribe el propio editor.</p>
  </div>
</section>
<section class="band">
  <div class="wrap prose-wide">
    <p>Todo lo que escribe el editor, campo por campo, con un archivo completo para escribir y las
      demos que vale la pena leer, está en su propia página: <a href="/docs/format/">el archivo de avistamiento</a>.</p>
    <p class="doc-try-actions"><a class="btn btn-primary" href="/docs/format/">Leer el formato</a></p>
  </div>
</section>
`
  }

  private it(): string {
    return `
<section class="band">
  <div class="wrap prose-wide">
    <h2>1. Nell'editor</h2>
    <p>La via ordinaria, e quella da usare a meno di avere un motivo per non farlo. Disegna ciò che è
      stato visto, di' quando e dove, registra come si è mosso — e il cielo, il meteo e il terreno
      vengono ricavati per te invece che ricordati.</p>
    <p class="doc-try-actions">
      <a class="btn btn-primary" href="/edit/">Apri l'editor</a>
      <a class="btn" href="/edit/#manual">Leggi il manuale</a>
    </p>
    <p>Si conclude con <strong>Salva</strong>, che ti consegna un file. Quel file è l'intera
      registrazione: non c'è alcun account e qui non si conserva nulla. Mettilo da qualche parte con
      un indirizzo pubblico ed è pronto da <a href="/docs/share/">condividere</a>.</p>
    <p>Ne hai già una e vuoi modificarla? L'editor si apre su una registrazione esistente — il
      pannello <q>?</q> di ogni ricostruzione pubblicata contiene il link che lo fa.</p>
  </div>
</section>

<section class="band">
  <div class="wrap prose-wide">
    <h2>2. Con un assistente IA, a partire dal fascicolo</h2>
    <p>Quando un caso ha già i suoi documenti (un rapporto, un questionario, una dichiarazione,
      schizzi, foto del luogo, una mappa), la via più rapida è spesso affidarli a un assistente IA in
      grado di leggere PDF e immagini e di eseguire un po' di codice, indicargli questa
      documentazione e fargli scrivere il file. Legge il resoconto, misura i disegni, calcola le
      direzioni dalla mappa, ricava ciò che si può ricavare e scrive ciò che ha trovato nel formato.
      Poi tu guardi il risultato, e gli dici che cosa non va.</p>
    <p>L'assistente non sa del caso se non ciò che gli dai, né del formato se non ciò che dicono
      queste pagine. Chiedigli quindi la disciplina che manterrebbe un investigatore:</p>
    <pre class="doc-prompt"><code>Ecco i documenti di un caso di avvistamento. Costruisci una
registrazione UFO@home di ciò che l'osservatore ha visto: il file JSON
descritto su https://ufoathome.org/docs/format/ , verificato con
https://ufoathome.org/sighting.schema.json .

- Indica solo ciò che i documenti sostengono. Scrivi ogni valore che hai
  calcolato come {"value": ..., "basis": "derived", "rationale": "..."}
  e ogni valore che hai dovuto scegliere con "basis": "assumed".
- Il fenomeno è fatto solo di angoli: la sua direzione (aim) e la sua
  dimensione apparente (angular) in ogni istante. I metri indicati
  dall'osservatore vanno in "interpretation", mai nelle forme.
- Elenca le contraddizioni tra i documenti, e le domande da riproporre
  all'osservatore o all'investigatore.</code></pre>
    <p>Oppure installa la <strong>skill di UFO@home</strong> nel tuo assistente: le stesse
      istruzioni, con il metodo, le regole del formato, lo schema, un esempio e un validatore che
      richiede solo Python, così che non resti che affidargli i documenti.
      <a href="/skill/ufoathome-recording.zip">Scarica la skill</a> (uno zip da aggiungere alle
      skill di Claude, o da decomprimere in <code>~/.claude/skills/</code> per Claude Code), oppure
      <a href="/skill/SKILL.md">leggila prima</a>.</p>
    <p>Poi controlla ciò che ha scritto, come controlleresti il lavoro di un collega:</p>
    <ul>
      <li><strong>Riproducila.</strong> Aprila nel <a href="/play/">lettore</a>, dal tuo computer
        con le foto che nomina. Il fenomeno è dove lo mettono i disegni, davanti agli alberi giusti,
        alla giusta altezza sopra l'orizzonte? Di' che cosa non torna, e fallo correggere.</li>
      <li><strong>Leggi i valori <code>assumed</code>.</strong> Sono l'elenco di ciò che nessuno ha
        detto. Ognuno è una domanda per l'osservatore, o un punto in cui la ricostruzione poggia su
        un'ipotesi.</li>
      <li><strong>Completa nell'<a href="/edit/">editor</a></strong> ciò che è più facile fare con il mouse che con una
        frase: spostare un edificio di qualche metro, ritoccare una direzione finché non cade sulla
        foto.</li>
      <li><strong>Mostrala all'osservatore.</strong> L'unica prova che conta è se riconosce ciò che
        ha visto.</li>
    </ul>
    <p>Un osservatore che ha solo il proprio resoconto può farlo dentro l'editor: lo scrive nella
      scheda <em>Riepilogo</em>, sceglie che cosa lo redige (oggi Claude: la propria chiave API, e
      il modello), e l'editor redige il resto della registrazione a partire da esso, senza inviare
      nulla da nessuna parte se non a quel modello.</p>
    <p class="small">Un resoconto è un dato personale. Prima di affidare documenti a un assistente
      online, togli ciò che identifica l'osservatore a meno che non abbia acconsentito, e verifica
      che cosa conserva il servizio. E un assistente può sbagliare con sicurezza: il file vale quanto
      i documenti su cui si basa e la verifica che lo segue.</p>
  </div>
</section>

<section class="band">
  <div class="wrap prose-wide">
    <h2>3. A mano, o dal tuo archivio</h2>
    <p>Una registrazione è un file dalla forma documentata, quindi nulla ti impedisce di scriverne una
      in un editor di testo, o di generarne mille da un database che hai già: è esattamente ciò che
      scrive l'editor stesso.</p>
  </div>
</section>
<section class="band">
  <div class="wrap prose-wide">
    <p>Tutto ciò che l'editor scrive, campo per campo, con un file completo da digitare e le demo che
      vale la pena leggere, è nella sua pagina: <a href="/docs/format/">il file di avvistamento</a>.</p>
    <p class="doc-try-actions"><a class="btn btn-primary" href="/docs/format/">Leggi il formato</a></p>
  </div>
</section>
`
  }
}
