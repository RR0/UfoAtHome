import type { PageMeta, Said, SiteLanguage, SitePage } from "../SitePage.js"

/** A third party the reader's browser may contact directly, and why. */
interface Recipient {
  readonly name: string
  readonly host: string
  readonly where: Said<string>
  readonly why: Said<string>
}

/**
 * What this site and its components do with the people who use them, and with the people whose
 * accounts they replay. It states what the code does, so it is to be changed with the code: a new
 * provider in `src/render3d/terrain/providers/` or `src/engine/*\/providers/` is a new row below.
 */
export class PrivacyPage implements SitePage {

  readonly meta: PageMeta = {
    slug: "privacy",
    navLabel: { en: "Privacy", fr: "Confidentialité", es: "Privacidad", it: "Privacy" },
    title: { en: "Privacy", fr: "Confidentialité", es: "Privacidad", it: "Privacy" },
    description: {
      en: "What UFO@home keeps, what it sends to third parties and why, and how observers named in a recording can ask for a change.",
      fr: "Ce qu'UFO@home conserve, ce qu'il envoie à des tiers et pourquoi, et comment un observateur cité dans un enregistrement peut demander une modification.",
      es: "Qué conserva UFO@home, qué envía a terceros y por qué, y cómo un observador citado en una grabación puede pedir un cambio.",
      it: "Che cosa conserva UFO@home, che cosa invia a terzi e perché, e come un osservatore citato in una registrazione può chiedere una modifica."
    }
  }

  private static readonly RECIPIENTS: readonly Recipient[] = [
    {
      name: "Open-Meteo", host: "api.open-meteo.com, archive-api.open-meteo.com, historical-forecast-api.open-meteo.com",
      where: { en: "Switzerland", fr: "Suisse", es: "Suiza", it: "Svizzera" },
      why: {
        en: "Weather record, upper-air winds and time zone of a place and date.",
        fr: "Météo, vents en altitude et fuseau horaire d'un lieu et d'une date.",
        es: "Tiempo, vientos en altura y huso horario de un lugar y una fecha.",
        it: "Meteo, venti in quota e fuso orario di un luogo e di una data."
      }
    },
    {
      name: "Nominatim (OpenStreetMap)", host: "nominatim.openstreetmap.org",
      where: { en: "United Kingdom (OpenStreetMap Foundation)", fr: "Royaume-Uni (OpenStreetMap Foundation)", es: "Reino Unido (OpenStreetMap Foundation)", it: "Regno Unito (OpenStreetMap Foundation)" },
      why: {
        en: "Coordinates of a place name, or the name of coordinates, in the editor.",
        fr: "Coordonnées d'un nom de lieu, ou nom de coordonnées, dans l'éditeur.",
        es: "Coordenadas de un nombre de lugar, o nombre de unas coordenadas, en el editor.",
        it: "Coordinate di un nome di luogo, o nome di alcune coordinate, nell'editor."
      }
    },
    {
      name: "Overpass (OpenStreetMap)", host: "overpass-api.de, overpass.kumi.systems, overpass.private.coffee",
      where: { en: "public instances run by volunteers, in Europe", fr: "instances publiques tenues par des bénévoles, en Europe", es: "instancias públicas mantenidas por voluntarios, en Europa", it: "istanze pubbliche gestite da volontari, in Europa" },
      why: {
        en: "Buildings around the observer, when that scenery is chosen.",
        fr: "Bâtiments autour de l'observateur, lorsque ce décor est choisi.",
        es: "Edificios alrededor del observador, cuando se elige ese entorno.",
        it: "Edifici intorno all'osservatore, quando si sceglie quell'ambiente."
      }
    },
    {
      name: "IGN Géoplateforme", host: "data.geopf.fr",
      where: { en: "France", fr: "France", es: "Francia", it: "Francia" },
      why: {
        en: "Relief, aerial photograph, LiDAR HD surroundings and map vectors of France.",
        fr: "Relief, photographie aérienne, décor LiDAR HD et vecteurs cartographiques de la France.",
        es: "Relieve, fotografía aérea, entorno LiDAR HD y vectores cartográficos de Francia.",
        it: "Rilievo, fotografia aerea, ambiente LiDAR HD e vettori cartografici della Francia."
      }
    },
    {
      name: "EOX Sentinel-2 cloudless", host: "tiles.maps.eox.at",
      where: { en: "Austria", fr: "Autriche", es: "Austria", it: "Austria" },
      why: {
        en: "Satellite imagery draped on the ground, outside France.",
        fr: "Imagerie satellite plaquée sur le sol, hors de France.",
        es: "Imágenes de satélite sobre el terreno, fuera de Francia.",
        it: "Immagini satellitari sul terreno, fuori dalla Francia."
      }
    },
    {
      name: "Esri World Imagery", host: "server.arcgisonline.com",
      where: { en: "United States", fr: "États-Unis", es: "Estados Unidos", it: "Stati Uniti" },
      why: {
        en: "Aerial imagery, where the other sources do not cover.",
        fr: "Imagerie aérienne, là où les autres sources ne couvrent pas.",
        es: "Imágenes aéreas, donde las demás fuentes no cubren.",
        it: "Immagini aeree, dove le altre fonti non coprono."
      }
    },
    {
      name: "AWS Terrain Tiles", host: "s3.amazonaws.com",
      where: { en: "United States (Amazon Web Services)", fr: "États-Unis (Amazon Web Services)", es: "Estados Unidos (Amazon Web Services)", it: "Stati Uniti (Amazon Web Services)" },
      why: {
        en: "Worldwide relief, outside France.",
        fr: "Relief mondial, hors de France.",
        es: "Relieve mundial, fuera de Francia.",
        it: "Rilievo mondiale, fuori dalla Francia."
      }
    },
    {
      name: "Panoramax", host: "api.panoramax.xyz",
      where: { en: "France (community project)", fr: "France (projet communautaire)", es: "Francia (proyecto comunitario)", it: "Francia (progetto comunitario)" },
      why: {
        en: "Street-level photographs of a place, to compare with the reconstruction.",
        fr: "Photographies au niveau de la rue d'un lieu, pour les comparer à la reconstitution.",
        es: "Fotografías a pie de calle de un lugar, para compararlas con la reconstrucción.",
        it: "Fotografie a livello stradale di un luogo, da confrontare con la ricostruzione."
      }
    },
    {
      name: "Anthropic (Claude)", host: "api.anthropic.com",
      where: { en: "United States", fr: "États-Unis", es: "Estados Unidos", it: "Stati Uniti" },
      why: {
        en: "Only when you ask the editor to draft a recording: the text you wrote, with your own key.",
        fr: "Seulement quand vous demandez à l'éditeur de rédiger un enregistrement : le texte que vous avez écrit, avec votre propre clé.",
        es: "Solo cuando pides al editor que redacte una grabación: el texto que escribiste, con tu propia clave.",
        it: "Solo quando chiedi all'editor di redigere una registrazione: il testo che hai scritto, con la tua chiave."
      }
    }
  ]

  render(language: SiteLanguage): string {
    switch (language) {
      case "fr":
        return this.fr()
      case "es":
        return this.es()
      case "it":
        return this.it()
      default:
        return this.en()
    }
  }

  private table(language: SiteLanguage, head: readonly [string, string, string]): string {
    const rows = PrivacyPage.RECIPIENTS.map(recipient => `
        <tr>
          <td><strong>${recipient.name}</strong><br><code>${recipient.host}</code></td>
          <td>${recipient.where[language]}</td>
          <td>${recipient.why[language]}</td>
        </tr>`).join("")
    return `<div class="table-scroll">
      <table>
        <thead><tr><th>${head[0]}</th><th>${head[1]}</th><th>${head[2]}</th></tr></thead>
        <tbody>${rows}
        </tbody>
      </table>
    </div>`
  }

  private en(): string {
    return `
<section class="band hero">
  <div class="wrap">
    <p class="eyebrow">Privacy</p>
    <h1>Privacy.</h1>
    <p class="lede">What this site and its components keep, what they send to others, and what happens to the people whose accounts they replay.</p>
  </div>
</section>

<section class="band">
  <div class="wrap prose-wide">
    <h2>In short</h2>
    <ul>
      <li>No account, no cookie, no advertising, no analytics, and no tracker of ours.</li>
      <li>The camera, the microphone and your position are never asked for.</li>
      <li>What you author stays in your browser until you save it as a file yourself.</li>
      <li>To draw the sky, the weather and the ground, your browser contacts the services listed below. They receive your IP address, as any site you visit does, along with what they are asked about.</li>
    </ul>

    <h2>Who is responsible</h2>
    <p>UFO@home is published by RR0 (Jérôme Beau). Questions and requests about personal data:
      <a href="mailto:contact@ufoathome.org">contact@ufoathome.org</a>. The site is served by Netlify,
      which keeps ordinary server logs (address, page, time) to run the service.</p>

    <h2>What stays on your device</h2>
    <p>The editor uses your browser's local storage for preferences only: the scenery and radius you
      chose, the model you picked. They never leave your device and need no consent.</p>
    <p>A <strong>key for drafting with Claude</strong> is kept there only if you tick the box offering to
      remember it, which is never ticked for you. Unticking it forgets the key at once. Be aware that
      a page that embeds the editor runs it in its own origin: on somebody else's site, anything else
      running on that site could read a remembered key. Leave the box unticked there.</p>
    <p>The site can also keep a copy of its pages on your device so that it works without a network.
      That copy is a cache of this site's own files and holds nothing about you.</p>

    <h2>What your browser fetches from others</h2>
    <p>Reading a recording, or using the editor, asks other services for the ground, the imagery, the
      weather and place names. Which ones depends on the recording and on the scenery chosen: a page
      that shows nothing of the ground contacts none of them. Each one sees your IP address and
      the area or date asked for; this site does not pass anything else on, and the browser sends only
      this site's address (without the page path) as the referrer.</p>
    ${this.table("en", ["Service", "Where", "What for"])}
    <p>Several of these are outside the European Union. Their own policies apply to what they receive.
      Every source is described, with its licence, on <a href="/docs/sources/">Sources and choices</a>.
      To avoid all of them, host the components yourself and point the providers at your own server
      (see the <a href="/faq/">FAQ</a>).</p>

    <h2>The people whose accounts are replayed</h2>
    <p>A recording is an observer's account, and an account is personal data. The demos published here
      follow these rules:</p>
    <ul>
      <li>An observer is named only when the case file they come from already names them, or when they
        agreed to it. Otherwise initials stand for the name.</li>
      <li>Initials are not anonymity: a precise place and date can identify somebody to those who
        know them. For a living observer who asked for it, the place is made approximate or removed.</li>
      <li>An observer can ask at any time to have their recording corrected, made less precise,
        or withdrawn, at <a href="mailto:contact@ufoathome.org">contact@ufoathome.org</a>. It is done
        in the next release, and the previous files are replaced, not kept.</li>
    </ul>
    <p>If you write a recording about someone else, the same rules are yours to follow, and the
      <a href="/docs/create/">documentation</a> says so where the format is explained.</p>

    <h2>Your rights</h2>
    <p>You may ask for access to, correction of, or erasure of what concerns you, and object to its
      use, by writing to the address above. If the answer does not satisfy you, you may complain to
      the CNIL (<a href="https://www.cnil.fr">cnil.fr</a>) or to your own data protection authority.</p>
  </div>
</section>`
  }

  private fr(): string {
    return `
<section class="band hero">
  <div class="wrap">
    <p class="eyebrow">Confidentialité</p>
    <h1>Confidentialité.</h1>
    <p class="lede">Ce que ce site et ses composants conservent, ce qu'ils envoient à d'autres, et ce que deviennent les personnes dont ils rejouent les comptes rendus.</p>
  </div>
</section>

<section class="band">
  <div class="wrap prose-wide">
    <h2>En bref</h2>
    <ul>
      <li>Pas de compte, pas de cookie, pas de publicité, pas de mesure d'audience, aucun traceur de notre part.</li>
      <li>La caméra, le micro et votre position ne sont jamais demandés.</li>
      <li>Ce que vous rédigez reste dans votre navigateur jusqu'à ce que vous l'enregistriez vous-même dans un fichier.</li>
      <li>Pour dessiner le ciel, la météo et le sol, votre navigateur contacte les services listés plus bas. Ils reçoivent votre adresse IP, comme tout site que vous visitez, avec ce qu'on leur demande.</li>
    </ul>

    <h2>Qui est responsable</h2>
    <p>UFO@home est publié par RR0 (Jérôme Beau). Questions et demandes sur les données personnelles :
      <a href="mailto:contact@ufoathome.org">contact@ufoathome.org</a>. Le site est servi par Netlify,
      qui conserve les journaux de serveur ordinaires (adresse, page, heure) pour faire fonctionner le service.</p>

    <h2>Ce qui reste sur votre appareil</h2>
    <p>L'éditeur utilise le stockage local de votre navigateur pour les préférences seulement : le décor
      et le rayon choisis, le modèle retenu. Elles ne quittent jamais votre appareil et ne demandent aucun consentement.</p>
    <p>Une <strong>clé pour rédiger avec Claude</strong> n'y est gardée que si vous cochez la case qui propose de
      la mémoriser, et elle n'est jamais cochée pour vous. La décocher oublie la clé aussitôt. Sachez
      qu'une page qui intègre l'éditeur l'exécute dans sa propre origine : sur le site de quelqu'un d'autre,
      tout ce qui s'exécute sur ce site pourrait lire une clé mémorisée. Laissez la case décochée dans ce cas.</p>
    <p>Le site peut aussi garder une copie de ses pages sur votre appareil pour fonctionner sans réseau.
      Cette copie est un cache des fichiers du site et ne contient rien sur vous.</p>

    <h2>Ce que votre navigateur récupère chez d'autres</h2>
    <p>Lire un enregistrement, ou utiliser l'éditeur, demande à d'autres services le sol, l'imagerie, la
      météo et les noms de lieux. Lesquels dépend de l'enregistrement et du décor choisi : une page qui
      ne montre rien du sol n'en contacte aucun. Chacun voit votre adresse IP et la zone ou la date
      demandée ; ce site ne transmet rien d'autre, et le navigateur n'envoie comme référent que l'adresse
      du site (sans le chemin de la page).</p>
    ${this.table("fr", ["Service", "Où", "À quoi ça sert"])}
    <p>Plusieurs se trouvent hors de l'Union européenne. Leurs propres politiques s'appliquent à ce qu'ils reçoivent.
      Chaque source est décrite, avec sa licence, sur <a href="/docs/sources/">Sources et choix</a>.
      Pour tous les éviter, hébergez les composants vous-même et pointez les fournisseurs vers votre serveur
      (voir la <a href="/faq/">FAQ</a>).</p>

    <h2>Les personnes dont on rejoue les comptes rendus</h2>
    <p>Un enregistrement est le compte rendu d'un observateur, et un compte rendu est une donnée personnelle.
      Les démos publiées ici suivent ces règles :</p>
    <ul>
      <li>Un observateur n'est nommé que si le dossier d'où il vient le nomme déjà, ou s'il y a consenti.
        Sinon, des initiales tiennent lieu de nom.</li>
      <li>Des initiales ne sont pas de l'anonymat : un lieu et une date précis peuvent identifier quelqu'un
        pour ceux qui le connaissent. Pour un observateur vivant qui le demande, le lieu est rendu approximatif ou retiré.</li>
      <li>Un observateur peut demander à tout moment que son enregistrement soit corrigé, rendu moins précis
        ou retiré, à <a href="mailto:contact@ufoathome.org">contact@ufoathome.org</a>. C'est fait à la
        version suivante, et les fichiers précédents sont remplacés, pas conservés.</li>
    </ul>
    <p>Si vous écrivez un enregistrement sur quelqu'un d'autre, les mêmes règles vous incombent, et la
      <a href="/docs/create/">documentation</a> le rappelle là où le format est expliqué.</p>

    <h2>Vos droits</h2>
    <p>Vous pouvez demander l'accès à ce qui vous concerne, sa rectification ou son effacement, et vous opposer
      à son usage, en écrivant à l'adresse ci-dessus. Si la réponse ne vous satisfait pas, vous pouvez saisir
      la CNIL (<a href="https://www.cnil.fr">cnil.fr</a>) ou l'autorité de protection des données de votre pays.</p>
  </div>
</section>`
  }

  private es(): string {
    return `
<section class="band hero">
  <div class="wrap">
    <p class="eyebrow">Privacidad</p>
    <h1>Privacidad.</h1>
    <p class="lede">Qué conservan este sitio y sus componentes, qué envían a otros, y qué ocurre con las personas cuyos relatos reproducen.</p>
  </div>
</section>

<section class="band">
  <div class="wrap prose-wide">
    <h2>En resumen</h2>
    <ul>
      <li>Sin cuenta, sin cookies, sin publicidad, sin analítica y sin ningún rastreador nuestro.</li>
      <li>Nunca se pide la cámara, el micrófono ni tu posición.</li>
      <li>Lo que redactas permanece en tu navegador hasta que lo guardes tú mismo en un archivo.</li>
      <li>Para dibujar el cielo, el tiempo y el suelo, tu navegador contacta con los servicios que se enumeran más abajo. Reciben tu dirección IP, como cualquier sitio que visitas, junto con lo que se les pide.</li>
    </ul>

    <h2>Quién es responsable</h2>
    <p>UFO@home lo publica RR0 (Jérôme Beau). Preguntas y solicitudes sobre datos personales:
      <a href="mailto:contact@ufoathome.org">contact@ufoathome.org</a>. El sitio lo sirve Netlify,
      que conserva los registros habituales del servidor (dirección, página, hora) para hacer funcionar el servicio.</p>

    <h2>Lo que queda en tu dispositivo</h2>
    <p>El editor usa el almacenamiento local de tu navegador solo para preferencias: el entorno y el radio
      elegidos, el modelo escogido. Nunca salen de tu dispositivo y no requieren consentimiento.</p>
    <p>Una <strong>clave para redactar con Claude</strong> solo se guarda ahí si marcas la casilla que ofrece
      recordarla, y nunca se marca por ti. Desmarcarla olvida la clave al instante. Ten en cuenta que una
      página que incorpora el editor lo ejecuta en su propio origen: en el sitio de otra persona, cualquier
      cosa que se ejecute en ese sitio podría leer una clave recordada. Deja la casilla desmarcada en ese caso.</p>
    <p>El sitio también puede guardar una copia de sus páginas en tu dispositivo para funcionar sin red.
      Esa copia es una caché de los archivos del propio sitio y no contiene nada sobre ti.</p>

    <h2>Lo que tu navegador obtiene de otros</h2>
    <p>Leer una grabación, o usar el editor, pide a otros servicios el suelo, las imágenes, el tiempo y los
      nombres de lugares. Cuáles depende de la grabación y del entorno elegido: una página que no muestra
      nada del suelo no contacta con ninguno. Cada uno ve tu dirección IP y la zona o la fecha solicitada;
      este sitio no transmite nada más, y el navegador solo envía como referente la dirección del sitio
      (sin la ruta de la página).</p>
    ${this.table("es", ["Servicio", "Dónde", "Para qué"])}
    <p>Varios están fuera de la Unión Europea. Sus propias políticas se aplican a lo que reciben.
      Cada fuente se describe, con su licencia, en <a href="/docs/sources/">Fuentes y decisiones</a>.
      Para evitarlos todos, aloja los componentes tú mismo y apunta los proveedores a tu propio servidor
      (véanse las <a href="/faq/">preguntas frecuentes</a>).</p>

    <h2>Las personas cuyos relatos se reproducen</h2>
    <p>Una grabación es el relato de un observador, y un relato es un dato personal. Las demos publicadas
      aquí siguen estas reglas:</p>
    <ul>
      <li>Un observador solo se nombra si el expediente del que procede ya lo nombra, o si lo consintió.
        En caso contrario, unas iniciales ocupan el lugar del nombre.</li>
      <li>Las iniciales no son anonimato: un lugar y una fecha precisos pueden identificar a alguien ante
        quienes lo conocen. Si un observador vivo lo pide, el lugar se hace aproximado o se retira.</li>
      <li>Un observador puede pedir en cualquier momento que su grabación se corrija, se haga menos precisa
        o se retire, en <a href="mailto:contact@ufoathome.org">contact@ufoathome.org</a>. Se hace en la
        versión siguiente, y los archivos anteriores se sustituyen, no se conservan.</li>
    </ul>
    <p>Si escribes una grabación sobre otra persona, las mismas reglas te corresponden a ti, y la
      <a href="/docs/create/">documentación</a> lo recuerda donde se explica el formato.</p>

    <h2>Tus derechos</h2>
    <p>Puedes pedir el acceso a lo que te concierne, su rectificación o su supresión, y oponerte a su uso,
      escribiendo a la dirección anterior. Si la respuesta no te satisface, puedes reclamar ante la CNIL
      (<a href="https://www.cnil.fr">cnil.fr</a>) o ante la autoridad de protección de datos de tu país.</p>
  </div>
</section>`
  }

  private it(): string {
    return `
<section class="band hero">
  <div class="wrap">
    <p class="eyebrow">Privacy</p>
    <h1>Privacy.</h1>
    <p class="lede">Che cosa conservano questo sito e i suoi componenti, che cosa inviano ad altri, e che cosa accade alle persone di cui riproducono i resoconti.</p>
  </div>
</section>

<section class="band">
  <div class="wrap prose-wide">
    <h2>In breve</h2>
    <ul>
      <li>Nessun account, nessun cookie, nessuna pubblicità, nessuna analisi di audience e nessun nostro tracciante.</li>
      <li>La fotocamera, il microfono e la tua posizione non vengono mai richiesti.</li>
      <li>Ciò che scrivi resta nel tuo browser finché non lo salvi tu stesso in un file.</li>
      <li>Per disegnare il cielo, il meteo e il suolo, il tuo browser contatta i servizi elencati qui sotto. Ricevono il tuo indirizzo IP, come ogni sito che visiti, insieme a ciò che viene loro chiesto.</li>
    </ul>

    <h2>Chi è responsabile</h2>
    <p>UFO@home è pubblicato da RR0 (Jérôme Beau). Domande e richieste sui dati personali:
      <a href="mailto:contact@ufoathome.org">contact@ufoathome.org</a>. Il sito è servito da Netlify,
      che conserva i normali registri del server (indirizzo, pagina, ora) per far funzionare il servizio.</p>

    <h2>Che cosa resta sul tuo dispositivo</h2>
    <p>L'editor usa l'archiviazione locale del tuo browser solo per le preferenze: l'ambiente e il raggio
      scelti, il modello selezionato. Non lasciano mai il tuo dispositivo e non richiedono consenso.</p>
    <p>Una <strong>chiave per redigere con Claude</strong> vi è conservata solo se spunti la casella che
      propone di ricordarla, e non è mai spuntata al posto tuo. Deselezionarla fa dimenticare subito la
      chiave. Tieni presente che una pagina che incorpora l'editor lo esegue nella propria origine: sul sito
      di qualcun altro, tutto ciò che vi gira potrebbe leggere una chiave ricordata. In quel caso lascia la casella deselezionata.</p>
    <p>Il sito può anche conservare una copia delle sue pagine sul tuo dispositivo per funzionare senza rete.
      Quella copia è una cache dei file del sito stesso e non contiene nulla su di te.</p>

    <h2>Che cosa il tuo browser recupera da altri</h2>
    <p>Leggere una registrazione, o usare l'editor, chiede ad altri servizi il suolo, le immagini, il meteo
      e i nomi dei luoghi. Quali dipende dalla registrazione e dall'ambiente scelto: una pagina che non
      mostra nulla del suolo non ne contatta nessuno. Ciascuno vede il tuo indirizzo IP e l'area o la data
      richiesta; questo sito non trasmette altro, e il browser invia come referente solo l'indirizzo del
      sito (senza il percorso della pagina).</p>
    ${this.table("it", ["Servizio", "Dove", "A che cosa serve"])}
    <p>Diversi si trovano fuori dall'Unione europea. Si applicano le loro politiche a ciò che ricevono.
      Ogni fonte è descritta, con la sua licenza, in <a href="/docs/sources/">Fonti e scelte</a>.
      Per evitarli tutti, ospita i componenti da te e indirizza i fornitori al tuo server
      (vedi le <a href="/faq/">domande frequenti</a>).</p>

    <h2>Le persone i cui resoconti vengono riprodotti</h2>
    <p>Una registrazione è il resoconto di un osservatore, e un resoconto è un dato personale. Le demo
      pubblicate qui seguono queste regole:</p>
    <ul>
      <li>Un osservatore è nominato solo se il fascicolo da cui proviene lo nomina già, o se vi ha acconsentito.
        Altrimenti, le iniziali tengono il posto del nome.</li>
      <li>Le iniziali non sono anonimato: un luogo e una data precisi possono identificare qualcuno agli occhi
        di chi lo conosce. Per un osservatore vivente che lo chieda, il luogo viene reso approssimativo o rimosso.</li>
      <li>Un osservatore può chiedere in qualsiasi momento che la sua registrazione sia corretta, resa meno
        precisa o ritirata, a <a href="mailto:contact@ufoathome.org">contact@ufoathome.org</a>. Avviene alla
        versione successiva, e i file precedenti sono sostituiti, non conservati.</li>
    </ul>
    <p>Se scrivi una registrazione su qualcun altro, le stesse regole spettano a te, e la
      <a href="/docs/create/">documentazione</a> lo ricorda dove spiega il formato.</p>

    <h2>I tuoi diritti</h2>
    <p>Puoi chiedere l'accesso a ciò che ti riguarda, la sua rettifica o la sua cancellazione, e opporti al suo
      uso, scrivendo all'indirizzo qui sopra. Se la risposta non ti soddisfa, puoi rivolgerti alla CNIL
      (<a href="https://www.cnil.fr">cnil.fr</a>) o all'autorità per la protezione dei dati del tuo paese.</p>
  </div>
</section>`
  }
}
