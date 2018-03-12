import {Image} from "./Image";

/**
 * @deprecated
 */
export interface ImageObserver {
  imageUpdate(img:Image, infoflags: number, x: number, y: number, w: number, h: number): boolean;
}