import type { DroneEditorMessages } from "./DroneEditorMessages.js"

export const droneEditorMessages_fr = {
  intro: "Des drones, comme lecture du compte rendu : ce qu'il a vu était un drone, ou plusieurs. Chacun vole sa propre trajectoire, calculée d'après sa cellule et son trajet : il s'arrête où son trajet s'arrête, s'incline vers où il va et contre le vent, et ses feux clignotent comme ils le font — calculé, pas dessiné.",
  none: "Aucun drone dans cet enregistrement",
  drone: "Drones",
  deleteDrone: "Supprimer ces drones",
  addDrone: "Ajouter un drone",
  addNowhere: "Donnez d'abord un lieu à l'enregistrement : un drone est placé devant le témoin",
  explainsEachNote: "Ces drones représentent chacun une forme du compte rendu, {n} dans leur ordre : modifiez lesquelles dans le fichier de l'enregistrement.",
  path: "Trajet",
  deletePoint: "Retirer ce point",
  timelineNote: "Sur la frise, un losange pressé est le point du trajet affiché dessous, et la scène va à son instant ; faites-le glisser pour le déplacer dans le temps. Le « + » pose un point à la tête de lecture, là où est alors le drone. Deux points au même endroit font un vol stationnaire : un multirotor s'y arrête, comme au premier point et au dernier.",
  addPointHere: "Ajouter un point ici, à la tête de lecture",
  pointHere: "Un point est à la tête de lecture : pressez-le pour le modifier",
  zoomHint: "Pincez, ou Ctrl + molette, pour zoomer ; Maj + molette pour défiler",
  derivedNote: "Un champ vide montre, en grisé, la valeur utilisée : celle de sa cellule pour sa couleur et ses feux. Videz un champ pour y revenir."
} satisfies DroneEditorMessages
