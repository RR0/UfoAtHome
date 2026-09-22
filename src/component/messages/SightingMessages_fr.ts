import type { SightingMessages } from "./SightingMessages.js"
import { sightingLabels_fr } from "./SightingLabels_fr.js"

export const sightingMessages_fr: SightingMessages = {
  ...sightingLabels_fr,
  testimonyBy: "Compte rendu de",
  unnamedWitness: "Observateur {n}",
  about: "À propos",
  close: "Fermer",
  observation: "Observation",
  date: "Date",
  location: "Lieu",
  case: "Dossier",
  description: "Description",
  credits: "Crédits",
  editThisObservation: "Éditer cette observation",
  embed: "Intégrer",
  embedReplay: "Relecture",
  embedEdit: "Édition",
  embedCopy: "Copier",
  embedCopied: "Copié",
  showLabels: "Afficher ce qu'elle indique",
  interpretation: "Interprétation",
  testimony: "Compte rendu",
  interpretationBy: "{title}, par {by}",
  confrontation: "Face au compte rendu",
  confrontationDirection: "écart de {deg}°",
  confrontationWidth: "largeur ×{ratio}",
  confrontationHeight: "hauteur ×{ratio}",
  showComparison: "Comparer au compte rendu",
  hideComparison: "Ne plus comparer au compte rendu",
  hideLabels: "Masquer ce qu'elle indique"
}
