import type { GeoExportTexts } from "./GeoExportTexts.js"

export const geoExportTexts_fr = {
  document: "{name} — UFO@home",
  documentNote: "Ce que cette reconstitution a de géographique : où se tenait le témoin, les directions qu'énonce le témoignage, et où une lecture place ce qui aurait été vu. Rien ici n'est une mesure du phénomène.",
  folderObserver: "Témoin",
  folderSightLines: "Lignes de visée",
  folderBodies: "Ce qu'une lecture place",
  folderTraces: "Tracés de l'enquêteur",
  observerPoint: "Témoin, {s} s",
  observerPath: "Trajet du témoin",
  observerNote: "{elevation} m au-dessus du sol, regard à {heading}° du nord.",
  sightLine: "Ligne de visée — {what}, {s} s",
  sightLineNote: "La direction qu'énonce le témoignage : {azimuth}° du nord, {altitude}° au-dessus de l'horizon. Les {km} km tracés sont conventionnels : le témoignage donne une direction, pas une distance.",
  bodyPoint: "{what}",
  bodyPath: "{what} — trajet",
  bodyNote: "Où une lecture du témoignage le place. L'interprétation de quelqu'un, pas le témoignage.",
  heightNote: "Les hauteurs sont comptées depuis le sol d'où le témoin est parti.",
  unnamed: "Phénomène {id}"
} satisfies GeoExportTexts
