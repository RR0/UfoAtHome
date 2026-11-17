import type { BirdEditorMessages } from "./BirdEditorMessages.js"

export const birdEditorMessages_fr = {
  intro: "Des oiseaux, comme lecture du compte rendu : ce qu'il a vu était une nuée. Chaque oiseau vole sa propre trajectoire, calculée d'après l'espèce, la disposition et le trajet : ses ailes battent au rythme de son espèce, il s'incline dans les virages — calculé, pas dessiné.",
  none: "Aucun oiseau dans cet enregistrement",
  flock: "Oiseaux",
  deleteFlock: "Supprimer ces oiseaux",
  addFlock: "Ajouter des oiseaux",
  addNowhere: "Donnez d'abord un lieu à l'enregistrement : les oiseaux sont placés devant le témoin",
  explainsEachNote: "Ces oiseaux représentent chacun une forme du compte rendu, {n} dans l'ordre de la nuée : modifiez lesquelles dans le fichier de l'enregistrement.",
  path: "Trajet",
  deletePoint: "Retirer ce point",
  timelineNote: "Sur la frise, un losange pressé est le point du trajet affiché dessous, et la scène va à son instant ; faites-le glisser pour le déplacer dans le temps. Le « + » pose un point à la tête de lecture, là où sont alors les oiseaux. Avant le premier point et après le dernier, les oiseaux restent où il les place.",
  addPointHere: "Ajouter un point ici, à la tête de lecture",
  pointHere: "Un point est à la tête de lecture : pressez-le pour le modifier",
  zoomHint: "Pincez, ou Ctrl + molette, pour zoomer ; Maj + molette pour défiler",
  derivedNote: "Un champ vide montre, en grisé, la valeur utilisée : celle de l'espèce pour le battement, la façon de voler et les couleurs. Videz un champ pour y revenir."
} satisfies BirdEditorMessages
