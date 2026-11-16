import type { TypedArray, WebGLRenderer, WebGLRenderTarget } from "three"

/**
 * A synchronous read of a render target's pixels that works whatever was read before it.
 *
 * three's asynchronous read-back (readRenderTargetPixelsAsync: the eye's meter, the probe's irradiance, the sky's tables) can leave its
 * pixel-pack buffer bound, and a synchronous read then fails with nothing but a console warning ("readPixels: PIXEL_PACK buffer should not
 * be bound"), handing back zeros. It met the Moon's sky first (black, the eye adapting to a moonless night under a 91 % Moon), then the
 * kit's depth and masks, then the silhouette of the cabin the eye is in: Mount Rainier's player read its six views 174 times as nothing,
 * and the cabin hid no veil behind its roof. Every synchronous read goes through here.
 */
export class PixelRead {
  static now(renderer: WebGLRenderer, target: WebGLRenderTarget, x: number, y: number, width: number, height: number, buffer: TypedArray): void {
    const gl = renderer.getContext() as WebGL2RenderingContext
    if (typeof WebGL2RenderingContext !== "undefined" && gl instanceof WebGL2RenderingContext) gl.bindBuffer(gl.PIXEL_PACK_BUFFER, null)
    renderer.readRenderTargetPixels(target, x, y, width, height, buffer)
  }
}
