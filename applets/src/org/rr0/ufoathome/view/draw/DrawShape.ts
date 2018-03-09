import {MessageEditable} from "../gui/MessageEditable";

/**
 * A shape that can be manipulated in a DrawView.
 */
export /*abstract */ class DrawShape implements Cloneable, MessageEditable {
  protected bounds: Rectangle;
  protected color: Color;
  protected selected: boolean;
  protected angle: number;
  protected component: Component;
  private transparency: number;
  public CORNER_SIZE: number = 6;
  public HALF_CORNER_SIZE: number = CORNER_SIZE / 2;
  private colorModel: DirectColorModel;
  private colorMask: number;
  private haloScale: number;
  private haloImage: Image;
  private alphaMask: number;
  protected title: String;

  constructor(component: Component) {
    this.component = component;
    this.colorModel = (DirectColorModel); this.component.getColorModel();
    this.colorMask = this.colorModel.getRedMask() | this.colorModel.getGreenMask() | this.colorModel.getBlueMask();
    this.alphaMask = this.colorModel.getAlphaMask();
    this.bounds = new Rectangle();
  }

  public getTransparency(): number {
    return this.transparency;
  }

  public setTransparency(alpha: number): void {
    this.transparency = alpha;
  }

  public setAngle(angle: number): void {
    this.angle = angle;
  }

  protected /*abstract */compute(): void {
    throw Error('Not implemented below');
  }

  public setLocation(x: number, y: number): void {
    this.setX(x);
    this.setY(y);
  }

  public getColor(): Color {
    return this.color;
  }

  /**
   * Return the bounding box of the shape.
   */
  public getBounds(): Rectangle {
    return this.bounds;
  }

  public getSize(): Dimension {
    return this.bounds.getSize();
  }

  public void;

  setWidth(width: number) {
    this.bounds.width = width;
  }

  public setHeight(height: number): void {
    this.bounds.height = height;
  }

  public getX(): number {
    return this.bounds.x;
  }

  public setColor(green: Color): void {
    this.color = green;
  }

  public paint(g: Graphics, bounds: Rectangle): void {
    this.paint(g, this.getColor(), bounds);
  }

  public /*abstract*/ void;

  paint(Graphics

  g;
,
  Color;
  color;
,
  Rectangle;
  bounds;
);

  public void;

  setSelected(b: boolean) {
    this.selected = b;
  }

  public isSelected(): boolean {
    return this.selected;
  }

  public getY(): number {
    return this.bounds.y;
  }

  public setX(x: number): void {
    this.bounds.x = x;
  }

  public setY(y: number): void {
    this.bounds.y = y;
  }

  public paint(g: Graphics): void {
    if (this.haloScale > 0) {
      this.paintHalo(g, this.bounds);
    }
    if (this.transparency > 0) {
      this.paintTransparent(g, this.getBounds(), this.transparency);
    } else {
      this.paint(g, this.getColor(), this.bounds);
    }
    if (this.isSelected()) {
      this.paintSelection(g, this.bounds);
    }
  }

  public scale(scaleFactor: number): void {
    this.scaleWidth(scaleFactor);
    this.scaleHeight(scaleFactor);
  }

  public setHaloScale(haloScale: number): void {
    this.haloScale = haloScale;
    let oldWidth: number = this.getWidth();
    let oldHeight: number = this.getHeight();
    this.scale(this.haloScale);
    this.bounds.x += (oldWidth - this.bounds.width) / 2;
    this.bounds.y += (oldHeight - this.bounds.height) / 2;
    const haloImage = this.component.createImage(this.bounds.width, this.bounds.height);
    let haloTransparency: number = 0xFF;
    let scaleFact: number = 0.1;
    let scale: number = haloScale;
    while (scale > 1.0 + scaleFact) {
      oldWidth = this.getWidth();
      oldHeight = this.getHeight();
      scale(1.0 - scaleFact);
      this.bounds.x += (oldWidth - this.bounds.width) / 2;
      this.bounds.y += (oldHeight - this.bounds.height) / 2;
      haloTransparency -= 10;
      this.paintTransparent(haloImage.getGraphics(), this.getBounds(), haloTransparency);
      scale -= scaleFact;
    }
  }

  private paintHalo(g: Graphics, bounds: Rectangle): void {
    const width: number = this.haloImage.getWidth(component);
    const height: number = this.haloImage.getHeight(component);
    const x: number = this.getX() - ((width - bounds.width) / 2);
    const y: number = this.getY() - ((height - bounds.height) / 2);
    const pixels: number[] = new int[width * height];
    const memImg: MemoryImageSource = new MemoryImageSource(width, height, pixels, 0, width);
    const pixelGrabber: PixelGrabber = new PixelGrabber(this.haloImage, 0, 0, width, height, pixels, 0, width);
    paint(this.haloImage.getGraphics(), this.getColor(), new Rectangle(0, 0, width, height));
    const newAlpha: number = (0xFF - this.transparency) << 24;
    try {
      pixelGrabber.grabPixels();
      if ((pixelGrabber.getStatus() & ImageObserver.ABORT) != 0) {
        console.error("image data fetch aborted or errored");
      }
      for (let i = 0; i < pixels.length; i++) {
        const pixelPresent: boolean = pixels[i] != -1053730 && pixels[i] != -1250856 && pixels[i] != -16777200 && pixels[i] != -15658735;
        if (pixelPresent) {
          pixels[i] &= colorMask;
          pixels[i] |= newAlpha;
        } else {
          pixels[i] = 0;
        }
      }

      const imageToDraw: Image = component.createImage(memImg);
      memImg.newPixels();
      g.drawImage(imageToDraw, x, y, component);
    } catch (InterruptedException
    e;
  )
    {
      e.printStackTrace();
    }
  }

  private paintTransparent(g: Graphics, bounds: Rectangle, transparency: number): void {
    const pixels: int[] = new number[bounds.width * bounds.height];
    const memImg: MemoryImageSource = new MemoryImageSource(bounds.width, bounds.height, pixels, 0, bounds.width);
    const image: Image = this.component.createImage(bounds.width, bounds.height);
    const pixelGrabber: PixelGrabber = new PixelGrabber(image, 0, 0, bounds.width, bounds.height, pixels, 0, bounds.width);
    paint(image.getGraphics(), this.getColor(), new Rectangle(0, 0, bounds.width, bounds.height));
    let newAlpha: number = (0xFF - transparency) << 24;
    try {
      pixelGrabber.grabPixels();
      if ((pixelGrabber.getStatus() & ImageObserver.ABORT) != 0) {
        console.error("image data fetch aborted or errored");
      }
      for (let i = 0; i < pixels.length; i++) {
        const pixelPresent: boolean = pixels[i] != -1053730 && pixels[i] != -1250856 && pixels[i] != -16777200 && pixels[i] != -15658735;
        if (pixelPresent) {
          pixels[i] &= this.colorMask;
          pixels[i] |= newAlpha;
        } else {
          pixels[i] = 0;
        }
      }

      const imageToDraw: Image = component.createImage(memImg);
      memImg.newPixels();
      g.drawImage(imageToDraw, bounds.x, bounds.y, this.component);
    } catch (InterruptedException
    e;
  )
    {
      e.printStackTrace();
    }
  }

  protected paintSelection(g: Graphics, bounds: Rectangle): void {
    const selectColor: Color = Color.lightGray;
    g.setColor(selectColor);
    g.drawRect(bounds.x, bounds.y, bounds.width, bounds.height);
    g.fillRect(bounds.x - this.HALF_CORNER_SIZE, bounds.y - this.HALF_CORNER_SIZE, this.CORNER_SIZE, this.CORNER_SIZE);
    const halfWidth: number = bounds.width / 2;
    const halfHeigth: number = bounds.height / 2;
    g.fillRect(bounds.x + halfWidth - this.HALF_CORNER_SIZE, bounds.y - this.HALF_CORNER_SIZE, this.CORNER_SIZE, this.CORNER_SIZE);
    g.fillRect(bounds.x + bounds.width - this.HALF_CORNER_SIZE, bounds.y - this.HALF_CORNER_SIZE, this.CORNER_SIZE, this.CORNER_SIZE);
    g.fillRect(bounds.x + bounds.width - this.HALF_CORNER_SIZE, bounds.y + halfHeigth - this.HALF_CORNER_SIZE, this.CORNER_SIZE, this.CORNER_SIZE);
    g.fillRect(bounds.x + bounds.width - this.HALF_CORNER_SIZE, bounds.y + bounds.height - this.HALF_CORNER_SIZE, this.CORNER_SIZE, this.CORNER_SIZE);
    g.fillRect(bounds.x + halfWidth - this.HALF_CORNER_SIZE, bounds.y + bounds.height - this.HALF_CORNER_SIZE, this.CORNER_SIZE, this.CORNER_SIZE);
    g.fillRect(bounds.x - this.HALF_CORNER_SIZE, bounds.y + bounds.height - this.HALF_CORNER_SIZE, this.CORNER_SIZE, this.CORNER_SIZE);
    g.fillRect(bounds.x - this.HALF_CORNER_SIZE, bounds.y + halfHeigth - this.HALF_CORNER_SIZE, this.CORNER_SIZE, this.CORNER_SIZE);
  }

  public getHeight(): number {
    return this.bounds.height;
  }

  public getWidth(): number {
    return this.bounds.width;
  }

  public clone(): Object {
    const clone: DrawShape = <DrawShape>super.clone();
    clone.bounds = new Rectangle(this.bounds);
    if (this.color != null) {
      clone.color = new Color(this.color.getRGB());
    }
    return clone;
  }

  public scaleWidth(widthRatio: number): void {
    const newWidth: number = <number>Math.round(this.bounds.width * widthRatio);
    this.setWidth(newWidth);
  }

  public scaleHeight(heightRatio: number): void {
    const newHeight: number = <number> Math.round(this.bounds.height * heightRatio);
    this.setHeight(newHeight);
  }

  public contains(x: number, y: number): boolean {
    return this.getBounds().contains(x, y);
  }

  public equals(o: Object): boolean {
    if (this == o) return true;
    if (!(o instanceof DrawShape)) return false;

    const drawShape: DrawShape = <DrawShape>o;

    if (this.angle != drawShape.angle) return false;
    if (!this.color.equals(drawShape.color)) return false;

    return true;
  }

  public hashCode(): null {
    let result: number;
    let temp: number;
    result = this.color.hashCode();
    temp = this.angle != +0.0 ? Double.doubleToLongBits(this.angle) : 0;
    result = 29 * result + <number> (temp ^ (temp >>> 32));
    return result;
  }

  public setTitle(newValue: String): void {
    this.title = newValue;
  }

  public getTitle(): String {
    return this.title;
  }
}
