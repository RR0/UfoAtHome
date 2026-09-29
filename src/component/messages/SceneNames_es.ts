import type { SceneNames } from "./SceneNames.js"

/**
 * The Spanish names of the things a scene and its catalogues hold — see SceneNames.
 */
export const sceneNames_es: SceneNames = {
  bodies: {
    sun: "Sol",
    moon: "Luna",
    Venus: "Venus",
    Mars: "Marte",
    Jupiter: "Júpiter",
    Saturn: "Saturno"
  },
  // Only the names Spanish really writes its own way; every other star keeps its international form.
  stars: {
    Sirius: "Sirio",
    Canopus: "Canopo",
    Arcturus: "Arturo",
    Capella: "Capela",
    Procyon: "Proción",
    Aldebaran: "Aldebarán",
    Spica: "Espiga",
    Pollux: "Pólux",
    Castor: "Cástor",
    Regulus: "Régulo"
  },
  comets: {
    "halley-1910": "cometa Halley",
    "brooks-1911": "cometa Brooks",
    "skjellerup-maristany-1927": "cometa Skjellerup-Maristany",
    "de-kock-paraskevopoulos-1941": "cometa de Kock-Paraskevopoulos",
    "southern-1947": "cometa austral",
    "eclipse-1948": "cometa del eclipse",
    "arend-roland-1957": "cometa Arend-Roland",
    "mrkos-1957": "cometa Mrkos",
    "seki-lines-1962": "cometa Seki-Lines",
    "ikeya-seki-1965": "cometa Ikeya-Seki",
    "bennett-1970": "cometa Bennett",
    "white-ortiz-bolelli-1970": "cometa White-Ortiz-Bolelli",
    "kohoutek-1973": "cometa Kohoutek",
    "west-1976": "cometa West",
    "iras-araki-alcock-1983": "cometa IRAS-Araki-Alcock",
    "halley-1986": "cometa Halley",
    "hyakutake-1996": "cometa Hyakutake",
    "hale-bopp-1997": "cometa Hale-Bopp",
    "mcnaught-2007": "cometa McNaught",
    "lovejoy-2011": "cometa Lovejoy",
    "panstarrs-2013": "cometa PANSTARRS",
    "neowise-2020": "cometa NEOWISE",
    "tsuchinshan-atlas-2024": "cometa Tsuchinshan-ATLAS"
  },
  novae: {
    "sn-1006": "supernova de 1006",
    "sn-1054": "supernova de 1054",
    "sn-1181": "supernova de 1181",
    "sn-1572": "supernova de Tycho",
    "sn-1604": "supernova de Kepler",
    "t-crb-1866": "nova de la Corona Boreal 1866",
    "t-aur-1891": "nova de Auriga 1891",
    "gk-per-1901": "nova de Perseo 1901",
    "dn-gem-1912": "nova de Géminis 1912",
    "v603-aql-1918": "nova del Águila 1918",
    "v476-cyg-1920": "nova del Cisne 1920",
    "rr-pic-1925": "nova del Pintor 1925",
    "dq-her-1934": "nova de Hércules 1934",
    "cp-lac-1936": "nova del Lagarto 1936",
    "cp-pup-1942": "nova de la Popa 1942",
    "t-crb-1946": "nova de la Corona Boreal 1946",
    "v446-her-1960": "nova de Hércules 1960",
    "v533-her-1963": "nova de Hércules 1963",
    "hr-del-1967": "nova del Delfín 1967",
    "lv-vul-1968": "nova de la Zorra 1968",
    "fh-ser-1970": "nova de la Serpiente 1970",
    "v1500-cyg-1975": "nova del Cisne 1975",
    "v842-cen-1986": "nova del Centauro 1986",
    "sn-1987a": "supernova 1987A",
    "v1974-cyg-1992": "nova del Cisne 1992",
    "v382-vel-1999": "nova de las Velas 1999",
    "v1494-aql-1999": "nova del Águila 1999",
    "v4743-sgr-2002": "nova de Sagitario 2002",
    "rs-oph-2006": "nova de Ofiuco 2006",
    "v1280-sco-2007": "nova de Escorpio 2007",
    "v339-del-2013": "nova del Delfín 2013",
    "v1369-cen-2013": "nova del Centauro 2013",
    "rs-oph-2021": "nova de Ofiuco 2021"
  },
  satelliteClasses: {
    echo: "los globos Echo",
    "iridium-flares": "los destellos de los Iridium",
    iss: "la Estación Espacial Internacional",
    "starlink-trains": "los trenes de Starlink"
  },
  showers: {
    quadrantids: "Cuadrántidas",
    lyrids: "Líridas de abril",
    "eta-aquariids": "Eta Acuáridas",
    "alpha-capricornids": "Alfa Capricórnidas",
    "southern-delta-aquariids": "Delta Acuáridas del Sur",
    perseids: "Perseidas",
    "southern-taurids": "Táuridas del Sur",
    draconids: "Dracónidas de octubre",
    orionids: "Oriónidas",
    "northern-taurids": "Táuridas del Norte",
    leonids: "Leónidas",
    geminids: "Gemínidas",
    ursids: "Úrsidas"
  },
  lightRigs: {
    "airliner": "Avión de pasajeros",
    "helicopter": "Helicóptero",
    "car-headlights": "Coche, faros encendidos",
    "car-hazards": "Coche, luces de emergencia",
    "emergency-beacons": "Rotativos de vehículo de emergencia",
    "streetlamp": "Farola"
  },
  instruments: {
    eye: "A simple vista",
    "rectilinear-lens": "Cámara, modelo desconocido",
    "instamatic-126": "Instamatic, película 126",
    "slr-35mm-50": "Réflex 35 mm, objetivo 50 mm",
    "slr-35mm-zoom": "Réflex 35 mm, zoom 70-210 mm",
    "phone-landscape": "Teléfono, en horizontal",
    "phone-portrait": "Teléfono, en vertical"
  },
  decorKinds: {
    building: "Edificio",
    tree: "Árbol",
    shrub: "Arbusto",
    bridge: "Puente",
    crop: "Hilera de cultivo",
    mound: "Montón de piedras",
    streetlight: "Farola",
    vehicle: "Vehículo",
    observer: "Observador",
    aircraft: "Aeronave",
    entity: "Ser"
  },
  // O for oeste, as on a Spanish compass.
  compassPoints: ["N", "NNE", "NE", "ENE", "E", "ESE", "SE", "SSE", "S", "SSO", "SO", "OSO", "O", "ONO", "NO", "NNO"],
  // Every point is masculine ("el noroeste"), so "a" + "el" is always "al".
  towards: point => `al ${point}`,
  starTooltip: "{name} — mag {mag}, {alt}° sobre el horizonte",
  starTooltipBelow: "{name} — mag {mag}, {alt}° bajo la horizontal",
  satelliteTooltip: "{name} — satélite, mag {mag}, a {height} km de altitud",
  credits: "Créditos"
}
