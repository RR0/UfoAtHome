import type { GenerativeKitMessages } from "./GenerativeKitMessages.js"

export const generativeKitMessages_es = {
  readmeFile: "LEEME.md",
  label: "Reconstrucción generada, no una imagen real",
  readme: `# Kit para IA generativa: {title}

Este kit sirve para producir, con un generador de vídeo (Runway, Kling, Luma, Veo…), una versión realista de la reconstrucción UFO@home de esta observación, sin dejar que el generador invente el testimonio.

Fuente: {source}
Hecho con UFO@home (https://ufoathome.org) el {date}.

## Contenido

- **reference.mp4**: la reconstrucción tal como la muestra el reproductor, con su sonido, sin leyenda ni logotipo ({fps} imágenes/s, {duration} s).
- **first-frame.png**: su primera imagen, para los generadores que parten de una imagen.
- **depth.mp4**: la distancia de cada píxel, blanco cerca, negro lejos y para el cielo, en una escala logarítmica de {near} m a {far} m, la misma para todo el vídeo.
- **phenomenon-mask.mp4**: en blanco, el lugar del fenómeno descrito por el testigo, ampliado {margin} píxeles: de donde el fenómeno generado no debe salir.
- **sky-mask.mp4**: en blanco, el cielo.
- **prompt.txt**: el prompt y el prompt negativo, en inglés, escritos solo a partir de lo que afirma el registro.
- **manifest.json**: la procedencia y la misma información, para un programa.

## Modo de empleo

1. En el generador, elegir un modo que parta de un vídeo («video to video», «restyle», «modify video»…) y darle reference.mp4. Si el vídeo es demasiado largo para él, cortarlo en torno al momento deseado.
2. Pegar el contenido de prompt.txt. Ajustar la transformación al mínimo que haga la imagen realista: la geometría, el horizonte, el encuadre y el movimiento deben seguir siendo los de la referencia.
3. Si el generador acepta un vídeo de control de profundidad («depth»), darle depth.mp4.
4. El generador también reproduce el fenómeno, para que tenga el mismo grano, el mismo desenfoque y la misma luz que el resto. Después, controlar el resultado superponiendo phenomenon-mask.mp4 al vídeo generado: si el fenómeno se sale, cambia de forma, tamaño, color o movimiento, o gana detalles (ojos de buey, luces, reflejos), descartar el vídeo y volver a empezar con una transformación más débil.
5. Incrustar en toda la imagen, y no en una esquina: «{label}».
6. Citar la fuente anterior allí donde se publique el vídeo.

## No hacer

- Mostrar el vídeo generado a un testigo antes de haberlo entrevistado: una imagen realista puede modificar su recuerdo.
- Dar al generador el texto del testimonio como prompt: dibujaría cada palabra, incluido lo que el testigo no dijo.
- Volver a pegar el fenómeno de reference.mp4 sobre el vídeo generado: menos realista que el resto, parecería añadido y atraería la mirada más que todo lo demás.
- Presentar el resultado como una prueba: muestra una reconstrucción, no lo que se vio.
`
} satisfies GenerativeKitMessages
