import type { GenerativeKitMessages } from "./GenerativeKitMessages.js"

export const generativeKitMessages_en = {
  readmeFile: "README.md",
  label: "Generated reconstruction, not real footage",
  readme: `# Generative AI kit: {title}

This kit is for making, with a video generator (Runway, Kling, Luma, Veo…), a realistic version of the UFO@home reconstruction of this observation, without letting the generator invent the testimony.

Source: {source}
Made with UFO@home (https://ufoathome.org) on {date}.

## Contents

- **reference.mp4**: the reconstruction as the player shows it, with its sound, without caption or logo ({fps} frames/s, {duration} s).
- **first-frame.png**: its first frame, for generators that start from an image.
- **depth.mp4**: how far each pixel is, white near, black far and for the sky, on a logarithmic scale from {near} m to {far} m, the same for the whole video.
- **phenomenon-mask.mp4**: in white, where the phenomenon the witness described stands, grown by {margin} pixels: what the generated phenomenon must not leave.
- **sky-mask.mp4**: in white, the sky.
- **prompt.txt**: the prompt and the negative prompt, written from the recording's own statements only.
- **manifest.json**: the provenance and the same information, for a program.

## How to use it

1. In the generator, choose a mode that starts from a video ("video to video", "restyle", "modify video"…) and give it reference.mp4. If the video is too long for it, cut it around the moment you want.
2. Paste the contents of prompt.txt. Set the transformation to the lowest that makes the picture realistic: the geometry, the horizon, the framing and the motion must stay those of the reference.
3. If the generator takes a depth control video, give it depth.mp4.
4. The generator renders the phenomenon too, so that it has the same grain, blur and light as the rest. Then check the result by laying phenomenon-mask.mp4 over the generated video: if the phenomenon leaves it, changes shape, size, colour or motion, or gains details (portholes, lights, reflections), reject the video and start again with a weaker transformation.
5. Burn into the whole picture, not into a corner: "{label}".
6. Cite the source above wherever the video is published.

## Do not

- Show the generated video to a witness before interviewing them: a realistic picture can change what they remember.
- Give the generator the witness's account as its prompt: it would draw every word of it, what the witness did not say included.
- Paste the phenomenon of reference.mp4 back over the generated video: less realistic than the rest, it would look stuck on and draw the eye more than anything else.
- Present the result as evidence: it shows a reconstruction, not what was seen.
`
} satisfies GenerativeKitMessages
