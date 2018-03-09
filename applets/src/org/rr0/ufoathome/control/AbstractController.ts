import {AbstractView} from "../view/AbstractView";
import {MessageProducer} from "../model/ufo/MessageProducer";
import {BitSet} from "../BitSet";
import {GregorianCalendar} from "../GregorianCalendar";
import {ResourceBundle} from "../ResourceBundle";
import {Hashtable} from "../Hashtable";
import {Image} from "../view/gui/Image";
import {Component} from "../view/gui/Component";

export class AbstractController extends MouseAdapter implements MouseMotionListener, KeyListener, MessageProducer {
  private imageCache = new Hashtable();
  protected lastX = -1;
  protected lastY = -1;
  protected currentTime: GregorianCalendar;
  protected messagesBundle: ResourceBundle;
  protected animationListeners = [];
  protected static lastLayersStartBit = 0;
  protected layersStartBit: number = AbstractController.lastLayersStartBit;
  public ALL_LAYERS = new BitSet();
  public layersToDraw = new BitSet();

  public AbstractController() {
    this.messagesBundle = ResourceBundle.getBundle("org.rr0.is.presentation.view.report.applet.StarSkyLabels");
  }

  public getLayersStartBit() {
    return this.layersStartBit;
  }

  public getImage(url: URL, creator: Component): Image {
    let img: Image;
    let o: Object = this.imageCache.get(url);
    if (o != null) {
      return <Image>o;
    }
    try {
      this.fireMessage("LoadingImage", null);
      o = url.getContent();
      if (o == null) {
        return null;
      }
      if (o instanceof Image) {
        img = <Image> o;
      } else {
        const imageProducer = (ImageProducer);o;
        img = creator.createImage(imageProducer);
        creator.prepareImage(img, new ImageObserver();{
        private boolean;

        public
          imageUpdate(
            img;
        :
          Image,
            infoflags;
        :
          number, x;
        :
          number, y;
        :
          number, w;
        :
          number, h;
        :
          number;
        ):
          boolean;
          {
            if ((infoflags & ImageObserver.ALLBITS) != 0) {
              loading = false;
            } else if (!loading && (infoflags & ImageObserver.SOMEBITS) != 0) {
              //                            String message = messagesBundle.getString("LoadingImage");
              //                            fireMessage(message);
              loading = true;
            } else if ((infoflags & ImageObserver.ERROR) != 0) {
              System.err.println("Error while loading " + img);
            }
            const b = creator.imageUpdate(img, infoflags, x, y, w, h);
            return b;
          }
        }
      )
      }

      this.imageCache.put(url, img);
      return img;

    } catch (ex) {
      ex.printStackTrace();
      return null;
    }
  }

  public getLastX() {
    return this.lastX;
  }

  public getLastY() {
    return this.lastY;
  }

  public setLastPos(lastX: number, lastY: number) {
    this.lastX = lastX;
    this.lastY = lastY;
  }

  public getCurrentTime(): GregorianCalendar {
    return this.currentTime;
  }

  public setTime(currentTime: GregorianCalendar) {
    this.currentTime = currentTime;
  }

  public getMessagesBundle(): ResourceBundle {
    return this.messagesBundle;
  }

  public draw(requiredLayers: BitSet) {
    // Clear
    for (let i = 0; i < this.numberlayersToDraw.length; i++) {
      this.layersToDraw.clear(i);
    }
  }

  protected fireTimeChanged(currentTime: GregorianCalendar) {
    for (let i = 0; i < this.animationListeners.length; i++) {
      const animationListener = (AnimationListener);
      this.animationListeners.elementAt(i);
      const animationEvent = new AnimationEvent(this, currentTime);
      animationListener.timeChanged(animationEvent);
    }
  }

  public getView(): AbstractView {
    throw Error('Not implemented belmow')
  }

  public display() {
    this.getView().displayBuffered();
  }

  public selectObject(objectName: String) {
    // Do nothing by default
  }

  public setZoomFactor(x: number) {
    // Do nothing by default
  }

  /**
   * Invoked when left click on background (i.e. not on a specific object).
   *
   * @param e The mouse event
   */
  public backgroundClicked(e: MouseEvent) {
    // Do nothing by default
    e.preventDefault();
  }

  public keyPressed(e: KeyEvent) {
    // Do nothing by default
    e.preventDefault();
  }

  public keyTyped(e: KeyEvent) {
    // Do nothing by default
    e.preventDefault();
  }

  public keyReleased(e: KeyEvent) {
    // Do nothing by default
    e.preventDefault();
  }

  protected isToDraw(layers: BitSet, someLayer: number): boolean {
    const layerActive = layers.get(someLayer) && this.layersToDraw.get(someLayer);
    return layerActive;
  }

  public draw() {
    this.draw(this.ALL_LAYERS);
    this.display();
  }

  protected newLayer(): number {
    this.ALL_LAYERS.set(this.layersStartBit);
    return this.layersStartBit++;
  }

  public modified(layer: number) {
    for (let i = 0; i <= layer; i++) {
      this.layersToDraw.set(i);
    }
  }
}
