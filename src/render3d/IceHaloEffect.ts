import { AdditiveBlending, BackSide, Mesh, ShaderMaterial, SphereGeometry, Vector3 } from "three"
import { IceHalos } from "../engine/atmosphere/IceHalos.js"

/**
 * Draws what ice crystals do to the light of the Sun or the Moon: the 22-degree halo, the two
 * sundogs beside it, and the pillar standing above a low source.
 *
 * Drawn on a SPHERE rather than as a screen-space overlay, and that decision is the whole reason
 * this is simple. A halo is a fixed angle from the source — 22 degrees of sky, not 22 anythings of
 * screen — so a shader that works from the direction of each fragment gets it right under every
 * projection this scene has, the witness's own equidistant eye included, with no reconstruction of
 * view rays and no special case. Painting a ring at a screen radius would be right for one lens and
 * wrong for the other.
 *
 * WHAT IT DRAWS is decided by IceHalos, which derives every angle from the refractive index of ice
 * rather than storing it. Nothing in this file knows that the halo is at 22 degrees; it is handed
 * the number, and hands it to the shader.
 *
 * WHAT IT DOES NOT DO is claim brightness. Real halo intensity is a Monte-Carlo problem over crystal
 * habit, size and how well the plates are aligned, and no weather record holds those. The strength
 * here follows the one thing the record does hold — how much ice cloud there was — and the display
 * is drawn faint. It says "this could have stood here, like this"; it does not say how vivid it was.
 */
export class IceHaloEffect {
  /** Just inside the sky dome, so it is painted over the sky and under everything else. */
  private static readonly RADIUS = 880

  readonly object: Mesh
  private readonly material: ShaderMaterial

  constructor() {
    this.material = new ShaderMaterial({
      uniforms: {
        uSource: { value: new Vector3(0, 1, 0) },
        /** Up in world space — the axis the parhelia sit either side of, and the pillar along. */
        uUp: { value: new Vector3(0, 1, 0) },
        uStrength: { value: 0 },
        /** Inner (red) and outer (blue) radius of the common halo, radians. */
        uHaloInner: { value: 0 },
        uHaloOuter: { value: 0 },
        /** Half-angle between the source and each sundog, radians. Zero when the Sun is too high
         * for them to form at all. */
        uParhelion: { value: 0 },
        uPillar: { value: 0 },
        uTint: { value: new Vector3(1, 0.97, 0.92) }
      },
      vertexShader: `
        varying vec3 vDirection;
        void main() {
          vDirection = normalize((modelMatrix * vec4(position, 1.0)).xyz - cameraPosition);
          gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
        }
      `,
      fragmentShader: `
        precision highp float;
        varying vec3 vDirection;
        uniform vec3 uSource;
        uniform vec3 uUp;
        uniform float uStrength;
        uniform float uHaloInner;
        uniform float uHaloOuter;
        uniform float uParhelion;
        uniform float uPillar;
        uniform vec3 uTint;

        void main() {
          vec3 dir = normalize(vDirection);
          vec3 sun = normalize(uSource);
          float angle = acos(clamp(dot(dir, sun), -1.0, 1.0));
          vec3 light = vec3(0.0);

          // THE 22-DEGREE HALO. A hard inner edge and a long outer tail, which is not a stylistic
          // choice: no ray is deviated by less than the minimum, so there is nothing at all inside
          // the ring, while beyond it rays of every larger deviation pile up and thin out. The
          // colour comes from the red and blue edges being at genuinely different angles.
          float inside = smoothstep(uHaloInner - 0.004, uHaloInner + 0.001, angle);
          // The outer tail runs about a degree and a half, not five. It used to reach 0.09 radians,
          // which put the ring's own glow straight over where the sundogs stand at 24.7 degrees and
          // washed them out — they read as half hidden behind the halo, which is what a reader saw.
          float outside = 1.0 - smoothstep(uHaloOuter, uHaloOuter + 0.026, angle);
          float ring = inside * outside;
          float across = clamp((angle - uHaloInner) / max(uHaloOuter - uHaloInner, 1e-4), 0.0, 1.0);
          // Red at the inner edge running to a cold white outward — the spectrum smeared across the
          // band rather than a single tinted circle.
          vec3 ringColour = mix(vec3(1.0, 0.55, 0.35), vec3(0.72, 0.80, 1.0), across);
          light += ring * ringColour * 0.30;

          if (uParhelion > 0.0) {
            // THE SUNDOGS. Both sit at the source's own altitude, one either side, which is why
            // they keep station with an observer who moves: they are an angle, not a place. Built
            // by swinging the source's direction about the vertical rather than about the line of
            // sight, so they stay level with it however high it stands.
            vec3 east = normalize(cross(uUp, sun));
            vec3 alongHorizon = normalize(cross(east, uUp));
            float height = dot(sun, uUp);
            // The direction at the same height, swung by the parhelion's own azimuth offset.
            float span = cos(uParhelion);
            float cosSwing = clamp((span - height * height) / max(1.0 - height * height, 1e-4), -1.0, 1.0);
            float swing = acos(cosSwing);
            for (int side = 0; side < 2; side++) {
              float sign = side == 0 ? 1.0 : -1.0;
              vec3 dog = normalize(uUp * height + (alongHorizon * cos(swing) + east * sign * sin(swing)) * sqrt(max(1.0 - height * height, 0.0)));
              float apart = acos(clamp(dot(dir, dog), -1.0, 1.0));
              // A real parhelion is not a symmetric blob. Its SUNWARD edge is sharp, red and bright
              // — that is the minimum-deviation edge, with nothing closer to the Sun than it — and a
              // white tail streams outward from it. So the core is cut off hard on the inside and
              // allowed to run on the outside, and the colour follows: red at the sharp edge, white
              // down the tail.
              float fromSun = acos(clamp(dot(dir, sun), -1.0, 1.0));
              float beyond = fromSun - uParhelion;
              float core = exp(-apart * apart / 0.00028);
              float sunward = 1.0 - smoothstep(-0.012, -0.002, beyond);
              float tail = exp(-max(beyond, 0.0) / 0.055) * exp(-apart * apart / 0.0016);
              vec3 warm = vec3(1.0, 0.66, 0.36);
              vec3 pale = vec3(0.95, 0.95, 1.0);
              light += core * mix(warm, pale, clamp(beyond / 0.03, 0.0, 1.0)) * 1.9;
              light += tail * pale * 0.35 * (1.0 - sunward);
            }
          }

          if (uPillar > 0.0) {
            // THE PILLAR. A reflection off the flat undersides of falling plates, so it carries no
            // colour of its own — the source's own tint, stretched vertically and dying away with
            // distance from it.
            vec3 east = normalize(cross(uUp, sun));
            float sideways = abs(dot(dir, east));
            float vertical = abs(dot(dir, uUp) - dot(sun, uUp));
            float shaft = exp(-sideways * sideways / 0.0009) * exp(-vertical * vertical / 0.03);
            light += shaft * uTint * uPillar * 0.5;
          }

          gl_FragColor = vec4(light * uStrength, 1.0);
        }
      `,
      transparent: true,
      blending: AdditiveBlending,
      depthWrite: false,
      side: BackSide,
      fog: false
    })
    this.object = new Mesh(new SphereGeometry(IceHaloEffect.RADIUS, 64, 32), this.material)
    this.object.renderOrder = -1
    this.object.frustumCulled = false
    this.object.visible = false
  }

  /**
   * Points the display at a light source and sets how strongly the sky could have shown it.
   *
   * `strength` of zero takes the whole thing down, which is the usual state of the sky: no ice
   * cloud, no display.
   */
  update(source: { x: number; y: number; z: number }, sourceAltitudeDeg: number, strength: number, tint: [number, number, number]): void {
    if (strength <= 0 || sourceAltitudeDeg <= 0) {
      // Zeroed as well as hidden. Leaving the old value in the uniform changes nothing on screen —
      // the mesh is not drawn — but it leaves the effect REPORTING a strength it is not showing,
      // which is how a probe of the live scene ends up believing a display is up when it is not.
      this.material.uniforms.uStrength.value = 0
      this.object.visible = false
      return
    }
    const toRadians = (degrees: number) => (degrees * Math.PI) / 180
    const uniforms = this.material.uniforms
    uniforms.uSource.value.set(source.x, source.y, source.z).normalize()
    uniforms.uStrength.value = strength
    uniforms.uHaloInner.value = toRadians(IceHalos.halo22().redAngleDeg!)
    uniforms.uHaloOuter.value = toRadians(IceHalos.halo22().blueAngleDeg!)
    const parhelia = IceHalos.parheliaDistanceDeg(sourceAltitudeDeg)
    uniforms.uParhelion.value = parhelia === undefined ? 0 : toRadians(parhelia)
    // Fading in as the source sinks, rather than switching on: the reflection geometry closes
    // gradually, and a pillar that appeared the instant the Sun crossed twenty degrees would be a
    // rendering artefact rather than a sight.
    uniforms.uPillar.value = Math.max(0, 1 - sourceAltitudeDeg / IceHalos.PILLAR_MAX_SOURCE_ALTITUDE_DEG)
    uniforms.uTint.value.set(tint[0], tint[1], tint[2])
    this.object.visible = true
  }

  dispose(): void {
    this.object.geometry.dispose()
    this.material.dispose()
  }
}
