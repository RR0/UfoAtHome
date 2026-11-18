import type { DroneEditorMessages } from "./DroneEditorMessages.js"

export const droneEditorMessages_es = {
  intro: "Drones, como lectura del relato: lo que vio era un dron, o varios. Cada uno vuela su propia trayectoria, calculada según su célula y su trayecto: se detiene donde su trayecto se detiene, se inclina hacia donde va y contra el viento, y sus luces parpadean como lo hacen — calculado, no dibujado.",
  none: "Ningún dron en esta grabación",
  drone: "Drones",
  deleteDrone: "Eliminar estos drones",
  addDrone: "Añadir un dron",
  addNowhere: "Dé primero un lugar a la grabación: un dron se coloca delante del testigo",
  explainsEachNote: "Estos drones representan cada uno una forma del relato, {n} en su orden: cambie cuáles en el archivo de la grabación.",
  path: "Trayecto",
  deletePoint: "Quitar este punto",
  timelineNote: "En la línea de tiempo, un rombo pulsado es el punto del trayecto que se muestra debajo, y la escena va a su instante; arrástrelo para moverlo en el tiempo. El «+» pone un punto en el cabezal de reproducción, donde está entonces el dron. Dos puntos en el mismo sitio son un vuelo estacionario: un multirrotor se detiene allí, y en el primer punto y el último.",
  addPointHere: "Añadir un punto aquí, en el cabezal",
  pointHere: "Hay un punto en el cabezal: púlselo para editarlo",
  zoomHint: "Pellizque, o Ctrl + rueda, para ampliar; Mayús + rueda para desplazarse",
  derivedNote: "Un campo vacío muestra, en gris, el valor en uso: el de su célula para su color y sus luces. Vacíe un campo para volver a él."
} satisfies DroneEditorMessages
