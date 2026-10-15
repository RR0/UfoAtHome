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
        en: "Only when you ask the editor to draft a recording with an AI: the text you wrote, with your own key.",
        fr: "Seulement quand vous demandez à l'éditeur de rédiger un enregistrement via IA : le texte que vous avez écrit, avec votre propre clé.",
        es: "Solo cuando pides al editor que redacte una grabación con IA: el texto que escribiste, con tu propia clave.",
        it: "Solo quando chiedi all'editor di redigere una registrazione con l'IA: il testo che hai scritto, con la tua chiave."
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
    <p>If you choose to have an AI draft your recording from a description, you are asked for a key (for Claude, or for another model later). It is optional: you can write the file by hand, or fill in the editor,
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
      What each one provides, and under which licence, is on <a href="/docs/sources/">Sources and choices</a>; this table only says who receives your request.
      To avoid all of them, host the components yourself and point the providers at your own server
      (see the <a href="/faq/">FAQ</a>).</p>

    <h2>Nothing is written to a server</h2>
    <p>UFO@home only reads: what you type, the weather, the ground and the imagery around the observer. It never sends a
      recording, a name or a draft to a server of ours, and has no account that could hold one. The only outputs are the ones
      you start yourself: <strong>Save</strong> exports the sighting file to your device, which you can then replay or publish on the site of your
      choice, public or internal.</p>

    <h2>Publishing is the user's responsibility</h2>
    <p>UFO@home is only a tool. You can play a simulation just for yourself, or choose to share it. Whoever publishes a
      recording is responsible for what it contains, as for any publication: text, photograph, video. The tool cannot take that
      place: removing a surname field from the editor would never stop anyone from writing that name in an identifier or a
      description. Before publishing an account about someone else, make sure they know and agree, or use initials and an
      approximate place: a precise place and date can identify a person even without a name. To help, the editor shows what a recording names or locates (a name, an address, an e-mail address, a telephone number) when you save it, and offers to write names as initials; it decides nothing for you.</p>

    <h2>No AI is used while an observation plays</h2>
    <p>UFO@home reads a JSON file, however it was made: by hand, with the editor, or with an AI that turned a description into
      one. AI is only an <em>option</em> for those who want to produce a recording faster, never an obligation. The different
      ways to create a recording are on <a href="/docs/create/">Create an observation</a>. If you use it, the editor sends the
      description you wrote to the model you chose, with your key, only when you ask; what you send, and checking what comes
      back, is your responsibility.</p>

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
    <p>Si vous choisissez de faire rédiger votre enregistrement par une IA à partir d'une description, une clé vous est demandée (pour Claude, ou pour un autre modèle plus tard). C'est facultatif : vous pouvez écrire le fichier
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
      Ce que chacune fournit, et sous quelle licence, est sur <a href="/docs/sources/">Sources et choix</a> ; ce tableau dit seulement qui reçoit votre requête.
      Pour tous les éviter, hébergez les composants vous-même et pointez les fournisseurs vers votre serveur
      (voir la <a href="/faq/">FAQ</a>).</p>

    <h2>Rien n'est écrit sur un serveur</h2>
    <p>UFO@home ne fait que lire : ce que vous saisissez, la météo, le sol et l'imagerie autour de l'observateur. Il n'envoie jamais
      un enregistrement, un nom ou un brouillon à un serveur de notre côté, et n'a aucun compte qui pourrait en conserver. Les seules
      sorties sont celles que vous déclenchez vous-même : <strong>Enregistrer</strong> exporte le fichier d'observation sur votre appareil, que vous
      pouvez ensuite rejouer ou publier sur le site de votre choix, public ou interne.</p>

    <h2>Publier est la responsabilité de l'utilisateur</h2>
    <p>UFO@home n'est qu'un outil. Vous pouvez jouer une simulation juste pour vous, ou choisir de la diffuser. Celui qui publie
      un enregistrement répond de ce qu'il contient, comme pour toute publication : texte, photo, vidéo. L'outil ne
      peut pas s'y substituer : retirer un champ « nom de famille » de l'éditeur n'empêcherait jamais personne d'écrire ce nom dans
      un identifiant ou une description. Avant de publier le compte rendu de quelqu'un d'autre, assurez-vous qu'il le sait et
      l'accepte, ou utilisez des initiales et un lieu approximatif : un lieu et une date précis peuvent identifier une personne même
      sans nom. Pour vous aider, l'éditeur montre ce qu'un enregistrement nomme ou situe (un nom, une adresse, une adresse électronique, un numéro de téléphone) quand vous le sauvez, et propose d'écrire les noms en initiales ; il ne décide rien à votre place.</p>

    <h2>Aucune IA n'intervient quand une observation se joue</h2>
    <p>UFO@home lit un fichier JSON, quelle que soit la façon dont il a été fait : à la main, avec l'éditeur, ou avec une IA qui a
      transformé une description en fichier. L'IA n'est qu'une <em>option</em> pour qui veut produire un enregistrement plus vite,
      jamais une obligation. Les différentes façons de créer un enregistrement sont expliquées sur
      <a href="/docs/create/">Créer une observation</a>. Si vous y recourez, l'éditeur envoie la description que vous avez écrite au
      modèle que vous avez choisi, avec votre clé, seulement quand vous le demandez ; ce que vous envoyez, et la vérification de ce
      qui en revient, relèvent de votre responsabilité.</p>

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
    <p>Si decides que una IA redacte tu grabación a partir de una descripción, se te pide una clave (para Claude, o para otro modelo más adelante). Es opcional: puedes escribir el archivo a mano, o rellenar el editor,
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
      Lo que aporta cada una, y con qué licencia, está en <a href="/docs/sources/">Fuentes y decisiones</a>; esta tabla solo dice quién recibe tu petición.
      Para evitarlos todos, aloja los componentes tú mismo y apunta los proveedores a tu propio servidor
      (véanse las <a href="/faq/">preguntas frecuentes</a>).</p>

    <h2>No se escribe nada en un servidor</h2>
    <p>UFO@home solo lee: lo que escribes, el tiempo, el suelo y las imágenes alrededor del observador. Nunca envía una
      grabación, un nombre o un borrador a un servidor nuestro, y no tiene ninguna cuenta que pudiera guardarlos. Las únicas
      salidas son las que inicias tú mismo: <strong>Guardar</strong> exporta el archivo de la observación a tu dispositivo, que luego puedes
      reproducir o publicar en el sitio que elijas, público o interno.</p>

    <h2>Publicar es responsabilidad del usuario</h2>
    <p>UFO@home es solo una herramienta. Puedes reproducir una simulación solo para ti, o elegir difundirla. Quien publica una
      grabación responde de lo que contiene, como en cualquier publicación: texto, fotografía, vídeo. La herramienta no
      puede ocupar ese lugar: quitar un campo «apellido» del editor nunca impediría que alguien escriba ese nombre en un
      identificador o una descripción. Antes de publicar el relato de otra persona, asegúrate de que lo sabe y lo acepta, o usa
      iniciales y un lugar aproximado: un lugar y una fecha precisos pueden identificar a una persona incluso sin nombre. Para ayudarte, el editor muestra lo que una grabación nombra o sitúa (un nombre, una dirección, un correo electrónico, un número de teléfono) cuando la guardas, y propone escribir los nombres como iniciales; no decide nada por ti.</p>

    <h2>Ninguna IA interviene mientras se reproduce una observación</h2>
    <p>UFO@home lee un archivo JSON, sea cual sea la forma en que se hizo: a mano, con el editor, o con una IA que convirtió una
      descripción en uno. La IA es solo una <em>opción</em> para quien quiere producir una grabación más rápido, nunca una
      obligación. Las distintas formas de crear una grabación se explican en
      <a href="/docs/create/">Crear una observación</a>. Si recurres a ella, el editor envía la descripción que escribiste al modelo que
      elegiste, con tu clave, solo cuando lo pides; lo que envías, y la comprobación de lo que vuelve, son responsabilidad tuya.</p>

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
    <p>Se scegli di far redigere la tua registrazione a un'IA a partire da una descrizione, ti viene chiesta una chiave (per Claude, o per un altro modello in futuro). È facoltativa: puoi scrivere il file a mano, o compilare
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
      Che cosa fornisce ciascuna, e con quale licenza, è in <a href="/docs/sources/">Fonti e scelte</a>; questa tabella dice solo chi riceve la tua richiesta.
      Per evitarli tutti, ospita i componenti da te e indirizza i fornitori al tuo server
      (vedi le <a href="/faq/">domande frequenti</a>).</p>

    <h2>Non viene scritto nulla su un server</h2>
    <p>UFO@home si limita a leggere: ciò che scrivi, il meteo, il suolo e le immagini intorno all'osservatore. Non invia mai una
      registrazione, un nome o una bozza a un nostro server, e non ha alcun account che possa conservarli. Le uniche uscite sono
      quelle che avvii tu: <strong>Salva</strong> esporta il file dell'osservazione sul tuo dispositivo, che puoi poi riprodurre o pubblicare sul sito
      che preferisci, pubblico o interno.</p>

    <h2>Pubblicare è responsabilità dell'utente</h2>
    <p>UFO@home è solo uno strumento. Puoi riprodurre una simulazione solo per te, o scegliere di diffonderla. Chi pubblica una
      registrazione risponde di ciò che contiene, come per qualsiasi pubblicazione: testo, fotografia, video. Lo
      strumento non può prenderne il posto: togliere un campo «cognome» dall'editor non impedirebbe mai a qualcuno di scrivere quel
      nome in un identificativo o in una descrizione. Prima di pubblicare il resoconto di un'altra persona, assicurati che lo sappia
      e lo accetti, oppure usa le iniziali e un luogo approssimativo: un luogo e una data precisi possono identificare una persona
      anche senza nome. Per aiutarti, l'editor mostra ciò che una registrazione nomina o colloca (un nome, un indirizzo, un indirizzo e-mail, un numero di telefono) quando la salvi, e propone di scrivere i nomi come iniziali; non decide nulla al posto tuo.</p>

    <h2>Nessuna IA interviene mentre un'osservazione viene riprodotta</h2>
    <p>UFO@home legge un file JSON, comunque sia stato fatto: a mano, con l'editor, o con un'IA che ha trasformato una descrizione
      in uno. L'IA è solo un'<em>opzione</em> per chi vuole produrre una registrazione più in fretta, mai un obbligo. I diversi modi
      di creare una registrazione sono spiegati in <a href="/docs/create/">Creare un'osservazione</a>. Se vi ricorri, l'editor invia
      la descrizione che hai scritto al modello che hai scelto, con la tua chiave, solo quando lo chiedi; ciò che invii, e la verifica
      di ciò che ne torna, sono responsabilità tua.</p>

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
