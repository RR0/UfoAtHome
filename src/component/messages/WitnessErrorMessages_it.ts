import type { WitnessErrorMessages } from "./WitnessErrorMessages.js"

export const witnessErrorMessages_it: WitnessErrorMessages = {
  "basisTitle": "Come è stato ottenuto questo valore",
  "basisField": "Base",
  "howField": "Come",
  "rationaleField": "Giustificazione",
  "basisReset": "Base riportata a «dichiarata»: il valore è stato riscritto (era: {basis}).",
  "lawSources": "Fonti: {sources}",
  "extrapolation": "Queste leggi sono misurate su osservazioni notturne: applicarle a un'osservazione diurna è un'estrapolazione.",
  "sectionAccountConditions": "Condizioni della testimonianza",
  "sectionViewing": "Condizioni di visione",
  "sectionMoon": "Calibro Luna",
  "sectionErrorParameters": "Parametri d'errore di questo testimone",
  "errorModelField": "Modello d'errore",
  "delayField": "Ritardo prima di questo racconto",
  "delayUnit": "giorni",
  "versionField": "Versione",
  "wordField": "Parola usata",
  "exposureField": "Esposizione",
  "independenceField": "Indipendenza",
  "independentYes": "senza aver parlato con gli altri testimoni",
  "independentNo": "dopo aver parlato con gli altri testimoni",
  "unknownChoice": "non si sa",
  "darkAdapted": "Adattato al buio",
  "correctedVision": "Vista corretta (occhiali, lenti)",
  "glare": "Luce intensa poco prima",
  "viewingNote": "Il vetro o il parabrezza e il binocolo si impostano in «Visione» qui sopra.",
  "moonIntro": "Il testimone mostra la Luna piena come ha mostrato l'oggetto. Il rapporto dà il suo fattore di dimensione angolare: l'unica misura che rende individuale la legge generale. Da rilevare una volta per testimone.",
  "moonField": "Luna come mostrata",
  "moonHint": "A braccio teso, 1 cm ≈ 1°",
  "moonNone": "Non ancora misurata: si applica la legge generale ({law}).",
  "moonFactor": "Fattore ×{k}: sostituisce la legge generale in tutte le dimensioni angolari di questo testimone.",
  "moonReal": "Luna reale · 0,52°",
  "parametersIntro": "Gli errori di uno stesso testimone sono legati: lo stesso fattore su tutte le dimensioni, lo stesso scarto su tutte le ore. Calcolati, mai scritti: nessun margine «±» si inserisce a mano.",
  "showMore": "Mostra",
  "basis": {
    "measured": "◆ misurata",
    "stated": "dichiarata",
    "derived": "dedotta",
    "assumed": "supposta"
  },
  "how": {
    "clock": "letta su un orologio",
    "anchored": "ancorata a un evento datato",
    "estimated": "stimata",
    "shown-on-the-spot": "mostrata sul posto",
    "arm-length-gauge": "calibro a braccio teso",
    "recalled-object": "riferita a un oggetto noto",
    "instrument": "strumento",
    "landmark": "riferimento del paesaggio",
    "occlusion": "occultazione",
    "known-size": "dimensione nota",
    "triangulation": "triangolazione"
  },
  "status": {
    "consolidated": "consolidata",
    "individual": "individuale",
    "single": "studio unico",
    "argued": "argomentata",
    "contested": "contestata"
  },
  "laws": {
    "timeClock": "± {minutes} min (letta su un orologio)",
    "timeAnchored": "± {minutes} min (ancorata a un evento datato)",
    "timeEstimated": "± {minutes} min per 9 testimoni su 10 (stimata)",
    "duration": "da {low} a {high}: ×/÷{factor} (log-normale)",
    "elevationOver": "da {low} a {high}: altezza sovrastimata",
    "measuredInstrument": "± {degrees}° (misurata)",
    "measuredLandmark": "± {degrees}° (da un riferimento)",
    "headingCross": "da {low} a {high}: ± {degrees}°, verso talvolta invertito",
    "sizeMoon": "da {low} a {high}: fattore ×{factor} del calibro Luna",
    "sizeShown": "da {low} a {high}: mostrata sul posto, da +2 a +17 %",
    "sizeRecalled": "da {low} a {high}: riferita a un oggetto noto, ~30 % troppo grande",
    "sizeArm": "da {low} a {high}: sovrastimata da ×{from} a ×{to} a braccio teso",
    "sizeGauge": "da {low} a {high}: calibro, ± {percent} %",
    "distanceAnchored": "Ancorata: il suo errore segue quello di ciò da cui è dedotta",
    "distanceNotData": "Non è un dato: sbagliata di un fattore {factor} o più senza ancoraggio"
  },
  "parameterNames": {
    "clock": "Scarto dell'orologio",
    "date": "Scarto di data",
    "heading": "Rotazione della direzione",
    "elevation": "Compressione delle altezze",
    "size": "Fattore di dimensione angolare",
    "duration": "Fattore di durata"
  },
  "parameterScopes": {
    "clock": "tutte le ore",
    "date": "la data",
    "heading": "tutte le direzioni",
    "elevation": "tutte le altezze",
    "size": "tutte le dimensioni angolari",
    "duration": "la durata e la scala della timeline"
  },
  "parameters": {
    "clockClock": "± {minutes} min (orologio)",
    "clockAnchored": "± {minutes} min (ancorata)",
    "clockEstimated": "± {minutes} min (stimata)",
    "dateShift": "±1 giorno, mese o anno; ora legale ({percent} % delle date)",
    "headingRotation": "± {degrees}°, specchio possibile",
    "elevationCompression": "sovrastimate, mai sottostimate",
    "sizeMoon": "×{factor} (calibro Luna)",
    "sizeArm": "da ×{from} a ×{to} a braccio teso",
    "sizeShown": "da +2 a +17 % mostrata sul posto",
    "durationFactor": "×/÷{factor} (log-normale)"
  },
  "words": {
    "light": "luce",
    "object": "oggetto",
    "craft": "velivolo",
    "ufo": "ufo",
    "other": "altro"
  },
  "exposures": {
    "none": "nessuna",
    "press": "stampa",
    "broadcast": "radio, televisione",
    "other-witnesses": "altri testimoni",
    "investigators": "investigatori"
  },
  "models": {
    "consolidated": "Letture consolidate (UFO@home)",
    "keul": "Keul (dimensioni mostrate sul posto)"
  },
  "candidates": {
    "title": "Spiegazioni candidate",
    "verdicts": {
      "consolidated": "Compatibile con distorsioni consolidate",
      "contested": "Solo invocando distorsioni contestate",
      "incompatible": "Incompatibile anche ai limiti"
    },
    "cost": "costo {x} σ",
    "seeVariant": "Vedi questa variante",
    "variantLabel": "Variante: {name}",
    "backToAccount": "Torna al racconto",
    "costNote": "Un costo non è una probabilità: dice quali distorsioni bisogna invocare, e di quanto.",
    "scopeNote": "Matrice di Poher (1977) per la lista di partenza; la Luna, i pianeti, i passaggi di satelliti, i rientri, i bolidi registrati e gli aerei del tracciato sono calcolati e confrontati con il racconto.",
    "fields": {
      "time": "Ora",
      "heading": "Azimut",
      "elevation": "Altezza sull'orizzonte",
      "size": "Larghezza apparente"
    },
    "biases": {
      "clock": "scarto dell'orologio {x} min",
      "heading": "rotazione della direzione {x}°",
      "elevation": "altezza sovrastimata ×{x}",
      "size": "dimensione sovrastimata ×{x}"
    },
    "reasons": {
      "never-seen": "Mai visibile da questo luogo nel margine dell'ora data.",
      "direction": "Troppo lontano dalla direzione data, anche ai limiti delle leggi.",
      "size": "Dimensione troppo diversa, anche ai limiti delle leggi."
    },
    "notAgainst": "Non è un argomento contro il racconto.",
    "noDirection": "Il racconto non colloca il fenomeno nel cielo: non c'è nulla da confrontare.",
    "noSky": "Senza data, ora e luogo, nessun astro può essere collocato.",
    "bodies": {
      "Moon": "Luna",
      "Venus": "Venere",
      "Mars": "Marte",
      "Jupiter": "Giove",
      "Saturn": "Saturno"
    },
    "aircraft": "Aeromobile {name}",
    "reentry": "Rientro {name}",
    "fireball": "Bolide {name}",
    "poherLoading": "Caricamento della matrice di Poher…",
    "poherFailed": "Non è stato possibile leggere la matrice di Poher: sono proposti solo gli astri.",
    "poherTitle": "Secondo la matrice di Poher (1977)",
    "poherIntro": "Gli altri fenomeni noti della matrice, senza traiettoria calcolata qui: il loro punteggio è il giudizio di Poher, da confrontare a mano.",
    "poherPossible": "Possibili",
    "poherExcluded": "Esclusi ({n})",
    "poherExcludedBy": "escluso da: {list}",
    "poherDoubted": "dubbio secondo stime: {list}",
    "poherScore": "punteggio {x}",
    "poherTag": "Poher: {state}",
    "poherStatePossible": "possibile, punteggio {x}",
    "poherStateExcluded": "escluso",
    "answersTitle": "Risposte dedotte dalla registrazione ({n})",
    "firm": "ferma",
    "soft": "stima, da sola non esclude nulla"
  }
}
