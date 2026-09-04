# Credits

Third-party assets bundled with UFO@home, beyond what each one's own license requires no
attribution for.

## Audio (`src/assets/audio/`)

- **rain.ogg** — "Rain (loopable)" by Ylmir, [CC0](https://creativecommons.org/publicdomain/zero/1.0/)
  (Creative Commons Zero — public domain). Source: <https://opengameart.org/content/rain-loopable>.
  No attribution required; credited here anyway.
- **wind.ogg** — "Wind whoosh loop" by SketchMan3,
  [CC0](https://creativecommons.org/publicdomain/zero/1.0/). Source:
  <https://opengameart.org/content/wind-whoosh-loop>. No attribution required; credited here anyway.
- **thunder.wav** — "Thunder" (thunderclap) by Jerimee,
  [CC BY 3.0](https://creativecommons.org/licenses/by/3.0/) — **attribution required**. Source:
  <https://opengameart.org/content/thunder>.

## Published models, computed rather than bundled

The Milky Way and the zodiacal light are not images and no data is shipped for either: both are
integrated along the line of sight at runtime (`src/engine/astronomy/MilkyWay.ts`,
`ZodiacalLight.ts`), from models and measurements published in the literature. Nothing here carries
a licence — a physical model is not a copyrightable dataset — but the numbers are somebody's work
and are worth naming, so that anyone can check what this project made of them.

- **Interplanetary dust scattering** — Hong, S. S. (1985), "A new equation for the volume scattering
  function of interplanetary dust", *Astronomy & Astrophysics* 146, 67. Three Henyey-Greenstein
  lobes; the narrow backward one is the gegenschein.
- **Zodiacal light brightness and cloud shape** — Leinert, C. et al. (1998), "The 1997 reference of
  diffuse night sky brightness", *A&AS* 127, 1. The fan cloud, and the two measured surface
  brightnesses (200 S10 at right angles to the Sun in the ecliptic; 77 S10 at the ecliptic pole) —
  the first scales the model, the second is a check it was never shown.
- **Moonlit sky brightness** — Krisciunas, K. & Schaefer, B. E. (1991), "A model of the brightness of
  moonlight", *PASP* 103, 1033. Used for the Moon and, with its zenith value pinned to the twilight
  measurements, for the Sun's own twilight glow.
- **Twilight sky brightness** — the run of zenith sky brightness against solar depression follows
  Patat, F. et al. (2006), "Optical sky brightness at Paranal during twilight".
- **Galactic frame** — the IAU definition of the north galactic pole and the galactic centre.
- **Galaxy structure** — the scale lengths and heights of the thin disc, the bulge and the dust
  layer are the standard star-count values; the one amplitude that is fitted is fitted to the
  observed centre-to-anticentre brightness ratio, and says so where it is written.
