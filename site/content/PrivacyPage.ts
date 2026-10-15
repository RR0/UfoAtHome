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
      <li>Nothing is ever written to a server: the tool only reads. The only output is the file you choose to export.</li>
      <li>To draw the sky, the weather and the ground, your browser contacts the services listed below. They receive your IP address, as any site you visit does, along with what they are asked about.</li>
    </ul>

    <h2>Who is responsible</h2>
    <p>UFO@home is published by RR0 (Jérôme Beau). Questions and requests about personal data:
      <a href="mailto:contact@ufoathome.org">contact@ufoathome.org</a>. The site is served by Netlify,
      which keeps ordinary server logs (address, page, time) to run the service.</p>

    <h2>What stays on your device</h2>
    <p>The editor uses your browser's local storage for preferences only: the scenery and radius you
      chose, the model you picked. They never leave your device and need no consent.</p>
    <p>A <strong>key for drafting with Claude</strong> (or another model, later) is asked for only if you choose to have an AI
      draft your recording from a description. It is optional: you can write the file by hand, or fill in the editor,
      and never meet it. It is kept in your browser only, never on a server (there is none of ours that stores anything),
      and only if you tick the box offering to remember it; otherwise you enter it each time. Unticking it forgets it at once.
      Be aware that a page that embeds the editor runs it in its own origin: on somebody else's site, anything else
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

    <h2>Nothing is written to a server</h2>
    <p>UFO@home only reads: what you type, the weather, the ground and the imagery around the observer. It never sends a
      recording, a name or a draft to a server of ours, and has no account that could hold one. The only outputs are the ones
      you start yourself: <strong>Save</strong> exports the sighting file, which you can then replay or publish on the site of your
      choice, public or internal.</p>

    <h2>Publishing, and responsibility</h2>
    <p>Whoever publishes a recording is responsible for what it contains, as for any text or photograph. The tool cannot take
      that place: removing a surname field from the editor would never stop anyone from writing that name in an identifier or a
      description. Before publishing an account about someone else, make sure they know and agree, or use initials and an
      approximate place: a precise place and date can identify a person even without a name. The
      <a href="/docs/create/">documentation</a> says so where the format is explained.</p>

    <h2>AI is a choice, not part of the tool</h2>
    <p>UFO@home is not an AI tool. It reads a JSON file, whether it was written by hand, produced with the editor, or by an AI
      that turned a description into one. Using an AI to go faster is the user's choice, and so is the responsibility for what is
      sent to it and for checking what comes back. In the editor, drafting sends the description you wrote to the model you chose,
      with your key, only when you ask.</p>

    <h2>The demos on this site</h2>
    <p>RR0 publishes the demos here. An observer is named in them only because they agreed to it with us, or because they published their own account themselves, in an interview for instance; otherwise initials stand for the name. If you are an observer they replay and want a correction, a less precise place or a
      withdrawal, write to <a href="mailto:contact@ufoathome.org">contact@ufoathome.org</a>.</p>

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
      <li>Rien n'est jamais écrit sur un serveur : l'outil ne fait que lire. La seule sortie est le fichier que vous choisissez d'exporter.</li>
      <li>Pour dessiner le ciel, la météo et le sol, votre navigateur contacte les services listés plus bas. Ils reçoivent votre adresse IP, comme tout site que vous visitez, avec ce qu'on leur demande.</li>
    </ul>

    <h2>Qui est responsable</h2>
    <p>UFO@home est publié par RR0 (Jérôme Beau). Questions et demandes sur les données personnelles :
      <a href="mailto:contact@ufoathome.org">contact@ufoathome.org</a>. Le site est servi par Netlify,
      qui conserve les journaux de serveur ordinaires (adresse, page, heure) pour faire fonctionner le service.</p>

    <h2>Ce qui reste sur votre appareil</h2>
    <p>L'éditeur utilise le stockage local de votre navigateur pour les préférences seulement : le décor
      et le rayon choisis, le modèle retenu. Elles ne quittent jamais votre appareil et ne demandent aucun consentement.</p>
    <p>Une <strong>clé pour rédiger avec Claude</strong> (ou un autre modèle, plus tard) n'est demandée que si vous choisissez de
      faire rédiger votre enregistrement par une IA à partir d'une description. C'est facultatif : vous pouvez écrire le fichier
      à la main, ou remplir l'éditeur, sans jamais la rencontrer. Elle reste dans votre navigateur uniquement, jamais sur un serveur
      (nous n'en avons aucun qui conserve quoi que ce soit), et seulement si vous cochez la case qui propose de la mémoriser ;
      sinon vous la saisissez à chaque fois. La décocher l'oublie aussitôt. Sachez qu'une page qui intègre l'éditeur l'exécute dans sa
      propre origine : sur le site de quelqu'un d'autre, tout ce qui s'exécute sur ce site pourrait lire une clé mémorisée.
      Laissez la case décochée dans ce cas.</p>
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

    <h2>Rien n'est écrit sur un serveur</h2>
    <p>UFO@home ne fait que lire : ce que vous saisissez, la météo, le sol et l'imagerie autour de l'observateur. Il n'envoie jamais
      un enregistrement, un nom ou un brouillon à un serveur de notre côté, et n'a aucun compte qui pourrait en conserver. Les seules
      sorties sont celles que vous déclenchez vous-même : <strong>Enregistrer</strong> exporte le fichier d'observation, que vous
      pouvez ensuite rejouer ou publier sur le site de votre choix, public ou interne.</p>

    <h2>Publier, et la responsabilité</h2>
    <p>Qui publie un enregistrement est responsable de ce qu'il contient, comme pour tout texte ou toute photographie. L'outil ne
      peut pas s'y substituer : retirer un champ « nom de famille » de l'éditeur n'empêcherait jamais personne d'écrire ce nom dans
      un identifiant ou une description. Avant de publier le compte rendu de quelqu'un d'autre, assurez-vous qu'il le sait et
      l'accepte, ou utilisez des initiales et un lieu approximatif : un lieu et une date précis peuvent identifier une personne même
      sans nom. La <a href="/docs/create/">documentation</a> le rappelle là où le format est expliqué.</p>

    <h2>L'IA est un choix, pas une partie de l'outil</h2>
    <p>UFO@home n'est pas un outil d'IA. Il lit un fichier JSON, qu'il ait été écrit à la main, produit avec l'éditeur, ou par une IA
      qui a transformé une description en fichier. Utiliser une IA pour aller plus vite est le choix de l'utilisateur, et c'est aussi à lui
      de répondre de ce qui lui est envoyé et de vérifier ce qui en revient. Dans l'éditeur, la rédaction envoie la description que vous
      avez écrite au modèle que vous avez choisi, avec votre clé, seulement quand vous le demandez.</p>

    <h2>Les démos de ce site</h2>
    <p>RR0 publie les démos d'ici. Un observateur n'y est nommé que parce qu'il y a consenti auprès de nous, ou parce qu'il a publié lui-même son témoignage, dans une interview par exemple ; sinon des initiales tiennent lieu de nom. Si vous êtes un observateur dont l'une d'elles rejoue le compte rendu et souhaitez une correction,
      un lieu moins précis ou un retrait, écrivez à <a href="mailto:contact@ufoathome.org">contact@ufoathome.org</a>.</p>

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
      <li>Nunca se escribe nada en un servidor: la herramienta solo lee. La única salida es el archivo que eliges exportar.</li>
      <li>Para dibujar el cielo, el tiempo y el suelo, tu navegador contacta con los servicios que se enumeran más abajo. Reciben tu dirección IP, como cualquier sitio que visitas, junto con lo que se les pide.</li>
    </ul>

    <h2>Quién es responsable</h2>
    <p>UFO@home lo publica RR0 (Jérôme Beau). Preguntas y solicitudes sobre datos personales:
      <a href="mailto:contact@ufoathome.org">contact@ufoathome.org</a>. El sitio lo sirve Netlify,
      que conserva los registros habituales del servidor (dirección, página, hora) para hacer funcionar el servicio.</p>

    <h2>Lo que queda en tu dispositivo</h2>
    <p>El editor usa el almacenamiento local de tu navegador solo para preferencias: el entorno y el radio
      elegidos, el modelo escogido. Nunca salen de tu dispositivo y no requieren consentimiento.</p>
    <p>Una <strong>clave para redactar con Claude</strong> (u otro modelo, más adelante) solo se pide si decides que una IA
      redacte tu grabación a partir de una descripción. Es opcional: puedes escribir el archivo a mano, o rellenar el editor,
      sin encontrarla nunca. Se guarda únicamente en tu navegador, nunca en un servidor (no tenemos ninguno que conserve nada),
      y solo si marcas la casilla que ofrece recordarla; si no, la introduces cada vez. Desmarcarla la olvida al instante.
      Ten en cuenta que una página que incorpora el editor lo ejecuta en su propio origen: en el sitio de otra persona,
      cualquier cosa que se ejecute en ese sitio podría leer una clave recordada. Deja la casilla desmarcada en ese caso.</p>
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

    <h2>No se escribe nada en un servidor</h2>
    <p>UFO@home solo lee: lo que escribes, el tiempo, el suelo y las imágenes alrededor del observador. Nunca envía una
      grabación, un nombre o un borrador a un servidor nuestro, y no tiene ninguna cuenta que pudiera guardarlos. Las únicas
      salidas son las que inicias tú mismo: <strong>Guardar</strong> exporta el archivo de la observación, que luego puedes
      reproducir o publicar en el sitio que elijas, público o interno.</p>

    <h2>Publicar, y la responsabilidad</h2>
    <p>Quien publica una grabación es responsable de lo que contiene, como con cualquier texto o fotografía. La herramienta no
      puede ocupar ese lugar: quitar un campo «apellido» del editor nunca impediría que alguien escriba ese nombre en un
      identificador o una descripción. Antes de publicar el relato de otra persona, asegúrate de que lo sabe y lo acepta, o usa
      iniciales y un lugar aproximado: un lugar y una fecha precisos pueden identificar a una persona incluso sin nombre. La
      <a href="/docs/create/">documentación</a> lo recuerda donde se explica el formato.</p>

    <h2>La IA es una elección, no parte de la herramienta</h2>
    <p>UFO@home no es una herramienta de IA. Lee un archivo JSON, ya lo haya escrito alguien a mano, producido el editor, o una IA
      que convirtió una descripción en uno. Usar una IA para ir más rápido es decisión del usuario, y también lo es responder de lo
      que se le envía y comprobar lo que devuelve. En el editor, la redacción envía la descripción que escribiste al modelo que
      elegiste, con tu clave, solo cuando lo pides.</p>

    <h2>Las demos de este sitio</h2>
    <p>RR0 publica las demos de aquí. Un observador solo aparece nombrado en ellas porque lo consintió ante nosotros, o porque él mismo publicó su testimonio, en una entrevista por ejemplo; si no, unas iniciales ocupan el lugar del nombre. Si eres un observador cuyo relato reproduce una de ellas y quieres una corrección, un lugar
      menos preciso o una retirada, escribe a <a href="mailto:contact@ufoathome.org">contact@ufoathome.org</a>.</p>

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
      <li>Non viene mai scritto nulla su un server: lo strumento si limita a leggere. L'unica uscita è il file che scegli di esportare.</li>
      <li>Per disegnare il cielo, il meteo e il suolo, il tuo browser contatta i servizi elencati qui sotto. Ricevono il tuo indirizzo IP, come ogni sito che visiti, insieme a ciò che viene loro chiesto.</li>
    </ul>

    <h2>Chi è responsabile</h2>
    <p>UFO@home è pubblicato da RR0 (Jérôme Beau). Domande e richieste sui dati personali:
      <a href="mailto:contact@ufoathome.org">contact@ufoathome.org</a>. Il sito è servito da Netlify,
      che conserva i normali registri del server (indirizzo, pagina, ora) per far funzionare il servizio.</p>

    <h2>Che cosa resta sul tuo dispositivo</h2>
    <p>L'editor usa l'archiviazione locale del tuo browser solo per le preferenze: l'ambiente e il raggio
      scelti, il modello selezionato. Non lasciano mai il tuo dispositivo e non richiedono consenso.</p>
    <p>Una <strong>chiave per redigere con Claude</strong> (o con un altro modello, in futuro) viene richiesta solo se scegli di far
      redigere la tua registrazione a un'IA a partire da una descrizione. È facoltativa: puoi scrivere il file a mano, o compilare
      l'editor, senza incontrarla mai. Resta solo nel tuo browser, mai su un server (non ne abbiamo nessuno che conservi qualcosa),
      e solo se spunti la casella che propone di ricordarla; altrimenti la inserisci ogni volta. Deselezionarla la fa dimenticare subito.
      Tieni presente che una pagina che incorpora l'editor lo esegue nella propria origine: sul sito di qualcun altro, tutto ciò che
      vi gira potrebbe leggere una chiave ricordata. In quel caso lascia la casella deselezionata.</p>
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

    <h2>Non viene scritto nulla su un server</h2>
    <p>UFO@home si limita a leggere: ciò che scrivi, il meteo, il suolo e le immagini intorno all'osservatore. Non invia mai una
      registrazione, un nome o una bozza a un nostro server, e non ha alcun account che possa conservarli. Le uniche uscite sono
      quelle che avvii tu: <strong>Salva</strong> esporta il file dell'osservazione, che puoi poi riprodurre o pubblicare sul sito
      che preferisci, pubblico o interno.</p>

    <h2>Pubblicare, e la responsabilità</h2>
    <p>Chi pubblica una registrazione è responsabile di ciò che contiene, come per qualsiasi testo o fotografia. Lo strumento non
      può prenderne il posto: togliere un campo «cognome» dall'editor non impedirebbe mai a qualcuno di scrivere quel nome in un
      identificativo o in una descrizione. Prima di pubblicare il resoconto di un'altra persona, assicurati che lo sappia e lo
      accetti, oppure usa le iniziali e un luogo approssimativo: un luogo e una data precisi possono identificare una persona anche
      senza nome. La <a href="/docs/create/">documentazione</a> lo ricorda dove spiega il formato.</p>

    <h2>L'IA è una scelta, non parte dello strumento</h2>
    <p>UFO@home non è uno strumento di IA. Legge un file JSON, scritto a mano, prodotto con l'editor, o da un'IA che ha trasformato
      una descrizione in uno. Usare un'IA per fare più in fretta è una scelta dell'utente, e sua è anche la responsabilità di ciò che
      le viene inviato e della verifica di ciò che ne torna. Nell'editor, la redazione invia la descrizione che hai scritto al modello
      che hai scelto, con la tua chiave, solo quando lo chiedi.</p>

    <h2>Le demo di questo sito</h2>
    <p>RR0 pubblica le demo qui presenti. Un osservatore vi è nominato solo perché ha acconsentito presso di noi, o perché ha pubblicato egli stesso la propria testimonianza, in un'intervista ad esempio; altrimenti le iniziali tengono il posto del nome. Se sei un osservatore il cui resoconto è riprodotto da una di esse e vuoi una correzione,
      un luogo meno preciso o un ritiro, scrivi a <a href="mailto:contact@ufoathome.org">contact@ufoathome.org</a>.</p>

    <h2>I tuoi diritti</h2>
    <p>Puoi chiedere l'accesso a ciò che ti riguarda, la sua rettifica o la sua cancellazione, e opporti al suo
      uso, scrivendo all'indirizzo qui sopra. Se la risposta non ti soddisfa, puoi rivolgerti alla CNIL
      (<a href="https://www.cnil.fr">cnil.fr</a>) o all'autorità per la protezione dei dati del tuo paese.</p>
  </div>
</section>`
  }
}
