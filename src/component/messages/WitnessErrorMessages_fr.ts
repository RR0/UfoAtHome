import type { WitnessErrorMessages } from "./WitnessErrorMessages.js"

export const witnessErrorMessages_fr: WitnessErrorMessages = {
  "basisTitle": "Comment cette valeur a été obtenue",
  "basisField": "Base",
  "howField": "Comment",
  "rationaleField": "Justification",
  "basisReset": "Base remise à « déclarée » : la valeur a été retapée (était : {basis}).",
  "lawSources": "Sources : {sources}",
  "extrapolation": "Ces lois sont mesurées sur des observations de nuit : les appliquer à une observation de jour est une extrapolation.",
  "sectionAccountConditions": "Conditions du témoignage",
  "sectionViewing": "Conditions de vue",
  "sectionMoon": "Jauge Lune",
  "sectionErrorParameters": "Paramètres d'erreur de ce témoin",
  "errorModelField": "Modèle d'erreur",
  "delayField": "Délai avant ce récit",
  "delayUnit": "jours",
  "versionField": "Version",
  "wordField": "Mot employé",
  "exposureField": "Exposition",
  "independenceField": "Indépendance",
  "independentYes": "sans avoir parlé aux autres témoins",
  "independentNo": "après avoir parlé aux autres témoins",
  "unknownChoice": "on ne sait pas",
  "darkAdapted": "Adapté à l'obscurité",
  "correctedVision": "Vue corrigée (lunettes, lentilles)",
  "glare": "Lumière vive juste avant",
  "viewingNote": "La vitre ou le pare-brise et les jumelles se règlent dans « Vision » ci-dessus.",
  "moonIntro": "Le témoin montre la pleine Lune comme il a montré l'objet. Le rapport donne son propre facteur de taille angulaire : la seule mesure qui rend la loi générale individuelle. À relever une fois par témoin.",
  "moonField": "Lune telle que montrée",
  "moonHint": "À bout de bras, 1 cm ≈ 1°",
  "moonNone": "Pas encore mesurée : la loi générale s'applique ({law}).",
  "moonFactor": "Facteur ×{k} : il remplace la loi générale dans toutes les tailles angulaires de ce témoin.",
  "moonReal": "Lune réelle · 0,52°",
  "parametersIntro": "Les erreurs d'un même témoin sont liées : il applique le même facteur à toutes ses tailles, le même décalage à toutes ses heures. Calculées, jamais saisies : aucune marge « ± » ne se tape à la main.",
  "showMore": "Afficher",
  "basis": {
    "measured": "◆ mesurée",
    "stated": "déclarée",
    "derived": "déduite",
    "assumed": "supposée"
  },
  "how": {
    "clock": "lue sur une horloge",
    "anchored": "ancrée à un événement daté",
    "estimated": "estimée",
    "shown-on-the-spot": "montrée sur place",
    "arm-length-gauge": "jauge à bout de bras",
    "recalled-object": "rapportée à un objet connu",
    "instrument": "instrument",
    "landmark": "repère du paysage",
    "occlusion": "occultation",
    "known-size": "taille connue",
    "triangulation": "triangulation"
  },
  "status": {
    "consolidated": "consolidée",
    "individual": "individuelle",
    "single": "étude unique",
    "argued": "argumentée",
    "contested": "contestée"
  },
  "laws": {
    "timeClock": "± {minutes} min (heure lue sur une horloge)",
    "timeAnchored": "± {minutes} min (ancrée à un événement daté)",
    "timeEstimated": "± {minutes} min pour 9 témoins sur 10 (estimée)",
    "duration": "{low} à {high} : ×/÷{factor} (log-normale)",
    "elevationOver": "{low} à {high} : hauteur surestimée",
    "measuredInstrument": "± {degrees}° (mesurée)",
    "measuredLandmark": "± {degrees}° (d'après un repère)",
    "headingCross": "{low} à {high} : ± {degrees}°, sens parfois inversé",
    "sizeMoon": "{low} à {high} : facteur ×{factor} de la jauge Lune",
    "sizeShown": "{low} à {high} : montrée sur place, +2 à +17 %",
    "sizeRecalled": "{low} à {high} : rapportée à un objet connu, ~30 % trop grande",
    "sizeArm": "{low} à {high} : surestimée ×{from} à ×{to} à bout de bras",
    "sizeGauge": "{low} à {high} : jauge, ± {percent} %",
    "distanceAnchored": "Ancrée : l'erreur suit celle de ce dont elle est déduite",
    "distanceNotData": "Pas une donnée : faux d'un facteur {factor} et plus sans ancrage"
  },
  "parameterNames": {
    "clock": "Décalage d'horloge",
    "date": "Décalage de date",
    "heading": "Rotation du cap",
    "elevation": "Compression des hauteurs",
    "size": "Facteur de taille angulaire",
    "duration": "Facteur de durée"
  },
  "parameterScopes": {
    "clock": "toutes les heures",
    "date": "la date",
    "heading": "tous les caps",
    "elevation": "toutes les hauteurs",
    "size": "toutes les tailles angulaires",
    "duration": "la durée et l'échelle de la timeline"
  },
  "parameters": {
    "clockClock": "± {minutes} min (horloge)",
    "clockAnchored": "± {minutes} min (ancrée)",
    "clockEstimated": "± {minutes} min (estimée)",
    "dateShift": "±1 jour, mois ou année ; heure d'été ({percent} % des dates)",
    "headingRotation": "± {degrees}°, miroir possible",
    "elevationCompression": "surestimées, jamais sous-estimées",
    "sizeMoon": "×{factor} (jauge Lune)",
    "sizeArm": "×{from} à ×{to} à bout de bras",
    "sizeShown": "+2 à +17 % montrée sur place",
    "durationFactor": "×/÷{factor} (log-normale)"
  },
  "words": {
    "light": "lumière",
    "object": "objet",
    "craft": "engin",
    "ufo": "ovni",
    "other": "autre"
  },
  "exposures": {
    "none": "aucune",
    "press": "presse",
    "broadcast": "radio, télévision",
    "other-witnesses": "autres témoins",
    "investigators": "enquêteurs"
  },
  "models": {
    "consolidated": "Lectures consolidées (UFO@home)",
    "keul": "Keul (tailles montrées sur place)"
  },
  "candidates": {
    "title": "Explications candidates",
    "verdicts": {
      "consolidated": "Compatible avec des biais consolidés",
      "contested": "Seulement en invoquant des biais contestés",
      "incompatible": "Incompatible même aux bornes"
    },
    "cost": "coût {x} σ",
    "seeVariant": "Voir cette variante",
    "variantLabel": "Variante : {name}",
    "backToAccount": "Revenir au récit",
    "costNote": "Un coût n'est pas une probabilité : il dit quels biais il faut invoquer, et de combien.",
    "scopeNote": "Candidats calculés : la Lune et les planètes assez brillantes pour ce ciel. Les interprétations posées dans l'enregistrement ne sont pas encore confrontées ici.",
    "fields": {
      "time": "Heure",
      "heading": "Azimut",
      "elevation": "Hauteur sur l'horizon",
      "size": "Largeur apparente"
    },
    "biases": {
      "clock": "décalage d'horloge {x} min",
      "heading": "rotation du cap {x}°",
      "elevation": "hauteur surestimée ×{x}",
      "size": "taille surestimée ×{x}"
    },
    "reasons": {
      "never-seen": "Jamais visible depuis ce lieu dans la marge de l'heure donnée.",
      "direction": "Trop loin de la direction donnée, même aux bornes des lois.",
      "size": "Taille trop différente, même aux bornes des lois."
    },
    "notAgainst": "Ce n'est pas un argument contre le récit.",
    "noDirection": "Le récit ne situe pas le phénomène dans le ciel : il n'y a rien à confronter.",
    "noSky": "Sans date, heure et lieu, aucun astre ne peut être placé.",
    "bodies": {
      "Moon": "Lune",
      "Venus": "Vénus",
      "Mars": "Mars",
      "Jupiter": "Jupiter",
      "Saturn": "Saturne"
    }
  }
}
