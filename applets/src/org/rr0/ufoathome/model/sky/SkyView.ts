import {DrawView} from "../../view/draw/DrawView";
import {Precipitations} from "../ufo/Precipitations";
import {Image} from "../../view/gui/Image";
import {Color} from "../../view/gui/Color";
import {GregorianCalendar} from "../../GregorianCalendar";
import {Calendar} from "../../Calendar";
import {SkyModel} from "./SkyModel";
import {Rectangle} from "../../view/gui/Rectangle";

/**
 * A drawable sky view.
 */
export class SkyView extends DrawView {
  private SKY_WIDTH: number;
  private SKY_HEIGHT: number;
  public HALF_SKY_WIDTH: number;
  public HALF_SKY_HEIGHT: number;
  public FULL_WIDTH: number;

  private xCenter: number;
  private yCenter: number;
  protected horizonY: number;
  private hour: number;
  private weatherRunnable: Precipitations;
  private landscapeImage: Image;
  private minAltitude: number;
  private maxAltitude: number;
  private altitudePixels: number;
  private maxPixels: number;
  private maxAzimut: number;
  private model3d: Model3d;

  constructor() {
    super();
  }

  public paintStar(xDelta: number, yDelta: number, halfRadius: number, radius: number): void {
    const x = (this.xCenter + xDelta) - halfRadius;
    const y = this.yCenter - yDelta - halfRadius;
    this.bufferedGraphics.fillOval(x, y, radius, radius);
  }

  public setColor(color: Color): void {
    this.bufferedGraphics.setColor(color);
  }

  public skyContains(mouseX: number, mouseY: number): boolean {
    return this.contains(mouseX, mouseY) && mouseY < this.horizonY;
  }

  public paintGround(time: GregorianCalendar, altitude: number, factor: number, azimut: number): void {
    if (altitude > SkyModel.DEGREES_89) {
      this.horizonY = this.yCenter + this.SKY_HEIGHT * 2;
    } else if (altitude < -SkyModel.DEGREES_89) {
      this.horizonY = this.yCenter - this.HALF_SKY_HEIGHT;
    } else {
      const alt = factor * Math.tan(altitude);
      this.horizonY = Math.round(this.yCenter + alt);
    }
    if (this.horizonY < this.yCenter - this.HALF_SKY_HEIGHT) {
      this.horizonY = this.yCenter - this.HALF_SKY_HEIGHT;
    }
    if (this.horizonY < this.yCenter + this.HALF_SKY_HEIGHT) {
      const hour = time.get(Calendar.HOUR_OF_DAY);
      const i = this.hourColors[hour][1][0] + 50;
      const col: Color = new Color(i, currentGreen, currentBlue);
      this.bufferedGraphics.setColor(col);
      this.bufferedGraphics.fillRect(this.xCenter - this.HALF_SKY_WIDTH, this.horizonY, this.SKY_WIDTH, (this.yCenter + this.HALF_SKY_HEIGHT) - this.horizonY);
    }
    if (this.landscapeImage != null) {
      const
        landscapeY = this.horizonY - this.maxPixels;
      let
        landscapeHeight = ((this.maxAltitude - this.minAltitude) * this.altitudePixels);
      if (landscapeY + landscapeHeight > this.SKY_HEIGHT) {
        landscapeHeight = this.SKY_HEIGHT - landscapeY;
      }
      const pixelsPerAzimut = this.FULL_WIDTH / 360;
      const
        landscapeWidth = (this.maxAzimut * pixelsPerAzimut);
      const
        landscapeX = -(azimut * 4)/* - (int) (minAzimut * pixelsPerAzimut)*/;
      this.bufferedGraphics.drawImage(this.landscapeImage, landscapeX, landscapeY, landscapeWidth, this.horizonY, this);
    }
    if (this.model3d != null) {
      this.model3d.paint(this.bufferedGraphics, this.horizonY);
    }
  }

  public paintBackground(time: GregorianCalendar): void {
    const xStart = this.xCenter - this.HALF_SKY_WIDTH;
    const rectangle = new Rectangle(xStart, this.yCenter - this.HALF_SKY_HEIGHT, this.SKY_WIDTH, this.SKY_HEIGHT);
    this.hour = time.get(Calendar.HOUR_OF_DAY);
    const
      startColor = new Color(this.hourColors[this.hour][0][0], currentGreen, currentBlue);
    const
      endColor = new Color(this.hourColors[this.hour][1][0], currentGreen, currentBlue);
    let
      currentRed = startColor.getRed();
    let
      currentGreen = startColor.getGreen();
    let
      currentBlue = startColor.getBlue();
    const
      redDelta = rectangle.height / (endColor.getRed() - currentRed);
    const
      greenDelta = rectangle.height / (endColor.getGreen() - currentGreen);
    const
      blueDelta = rectangle.height / (endColor.getBlue() - currentBlue);

    let yDelta: number = 0;
    if (Math.abs(redDelta) > yDelta) {
      yDelta = Math.abs(redDelta);
    }
    if (Math.abs(greenDelta) > yDelta) {
      yDelta = Math.abs(greenDelta);
    }
    if (Math.abs(blueDelta) > yDelta) {
      yDelta = Math.abs(blueDelta);
    }

    let hY = this.horizonY;
    this.bufferedGraphics.setClip(xStart, this.yCenter - this.HALF_SKY_HEIGHT, this.SKY_WIDTH, this.SKY_HEIGHT);
    //        setBackground(SystemColor.control);
    //        bufferedGraphics.fillRect(0, SKY_HEIGHT, getSize().width, getSize().height);
    for (let y = hY; y > rectangle.x - yDelta; y -= yDelta) {
      const currentColor = new Color(currentRed, currentGreen, currentBlue);
      this.bufferedGraphics.setColor(currentColor);
      this.bufferedGraphics.fillRect(xStart, y, rectangle.width, yDelta);
      if (currentRed > endColor.getRed()) {
        currentRed += redDelta;
        if (currentRed < 0) {
          currentRed = 0;
        }
      }
      if (currentGreen > endColor.getGreen()) {
        currentGreen += greenDelta;
        if (currentGreen < 0) {
          currentGreen = 0;
        }
      }
      if (currentBlue > endColor.getBlue()) {
        currentBlue += blueDelta;
        if (currentBlue < 0) {
          currentBlue = 0;
        }
      }
    }
  }

  public start() {
    //        setSize(getSize().width, getSize().height);
    super.start();
  }

  public setBounds(x: number, y: number, width: number, height: number) {
    this.SKY_WIDTH = width;
    this.xCenter = this.SKY_WIDTH / 2;
    this.HALF_SKY_WIDTH = this.SKY_WIDTH / 2;
    this.SKY_HEIGHT = Math.round(this.SKY_WIDTH * 0.675);
    super.setBounds(x, y, this.SKY_WIDTH, this.SKY_HEIGHT);
    this.yCenter = this.SKY_HEIGHT / 2;
    this.HALF_SKY_HEIGHT = this.SKY_HEIGHT / 2;
    this.FULL_WIDTH = this.SKY_WIDTH * 4;
    this.altitudePixels = (this.SKY_HEIGHT / 180) * 2.225;
  }

  public setModel3D(someModel3D: Model3d) {
    this.model3d = someModel3D;
  }

  public isVisible(xDelta: number, yDelta: number) {
    return Math.abs(xDelta) < this.HALF_SKY_WIDTH && Math.abs(yDelta) < this.HALF_SKY_HEIGHT;
  }

  public getXCenter() {
    return this.xCenter;
  }

  public getYCenter() {
    return this.yCenter;
  }

  private hourColors = [
    [[20, 20, 50], [0, 0, 0]], // 0
    [[20, 20, 50], [0, 0, 0]], // 1
    [[20, 20, 50], [0, 0, 0]], // 2
    [[20, 20, 50], [0, 0, 10]], // 3
    [[70, 70, 100], [0, 0, 20]], // 4
    [[120, 120, 185], [0, 0, 30]], // 5
    [[130, 130, 195], [0, 0, 40]], // 6
    [[150, 150, 220], [50, 50, 150]], // 7
    [[235, 245, 255], [150, 150, 200]], // 8
    [[235, 245, 255], [150, 150, 240]], // 9
    [[235, 245, 255], [150, 150, 240]], // 10
    [[235, 245, 255], [150, 150, 240]], // 11
    [[235, 245, 255], [150, 150, 240]], // 12
    [[235, 245, 255], [150, 150, 240]], // 13
    [[235, 245, 255], [150, 150, 240]], // 14
    [[235, 245, 255], [150, 150, 240]], // 15
    [[235, 245, 255], [150, 150, 240]], // 16
    [[220, 220, 235], [140, 140, 200]], // 17
    [[200, 200, 225], [120, 120, 160]], // 18
    [[220, 180, 200], [20, 20, 110]], // 19
    [[210, 170, 255], [10, 10, 100]], // 20
    [[90, 125, 220], [0, 0, 90]], // 21
    [[50, 50, 100], [0, 0, 30]], // 22
    [[20, 20, 50], [0, 0, 0]], // 23
  ];

  public paintPlanet(xDelta: number, yDelta: number, halfMagnitude: number, fullMagnitude: number) {
    //        int radius = fullMagnitude;
    const radius = 7;
    this.bufferedGraphics.setColor(Color.white);
    const x = this.xCenter - xDelta;
    const y = this.yCenter - yDelta;
    this.bufferedGraphics.fillOval(x, y, radius, radius);
  }

  public paintSun(xDelta: number, yDelta: number, halfMagnitude: number, fullMagnitude: number) {
    //        int radius = fullMagnitude;
    const radius = 20;
    const x = this.xCenter - xDelta;
    const y = this.yCenter - yDelta;
    for (let i = 0; i < radius; i++) {
      const color = new Color(255, this.currentGreen, currentBlue);
      this.bufferedGraphics.setColor(color);
      this.bufferedGraphics.fillOval(x + i / 2, y + i / 2, radius - i, radius - i);
    }
  }

  public paintMoon(xDelta: number, yDelta: number, halfMagnitude: number, fullMagnitude: number) {
    //        int radius = fullMagnitude;
    const radius = 12;
    this.bufferedGraphics.setColor(Color.white);
    const x = this.xCenter - xDelta;
    const y = this.yCenter - yDelta;
    this.bufferedGraphics.fillOval(x, y, radius, radius);
    const backgroundColor = new Color(this.hourColors[this.hour][1][0], currentGreen, currentBlue);
    this.bufferedGraphics.setColor(backgroundColor);
    this.bufferedGraphics.fillOval(x + radius / 3, y, radius - radius / 4, radius);
  }

  public paintWeatherBackground(weatherImage: Image, azimut: number) {
    if (weatherImage != null) {
      //            int imageHeight = weatherImage.getHeight(this);
      //            int startY = horizonY - imageHeight > 0 ? 0 : horizonY - imageHeight;
      this.bufferedGraphics.drawImage(weatherImage, -azimut * 4, 0, this.FULL_WIDTH, this.horizonY, this);
      /*
                  final int startY = 0;
                  final int startX1 = -azimut * 4;
                  final int startX2 = startX1 + SKY_WIDTH;
                  final int startX3 = startX2 + SKY_WIDTH;
                  final int startX4 = startX3 + SKY_WIDTH;
                  if (startX1 > -SKY_WIDTH) {
                      bufferedGraphics.drawImage(weatherImage, startX1, startY, SKY_WIDTH, horizonY, this);
                  }
                  if (startX2 > -SKY_WIDTH) {
                      bufferedGraphics.drawImage(weatherImage, startX2, startY, SKY_WIDTH, horizonY, this);
                  }
                  if (startX3 > -SKY_WIDTH) {
                      bufferedGraphics.drawImage(weatherImage, startX3, startY, SKY_WIDTH, horizonY, this);
                  }
                  if (startX4 > -SKY_WIDTH) {
                      bufferedGraphics.drawImage(weatherImage, startX4, startY, SKY_WIDTH, horizonY, this);
                  }
      */
    }
  }

  public setWeatherRunnable(weatherRunnable: Precipitations) {
    if (this.weatherRunnable != null) {
      this.weatherRunnable.stop();
    }
    this.weatherRunnable = weatherRunnable;
    if (this.weatherRunnable != null) {
      this.weatherRunnable.init();
      this.weatherRunnable.start();
    }
  }

  public getWeatherRunnable(): Precipitations {
    return this.weatherRunnable;
  }

  public paintWeatherRunnable() {
    if (this.weatherRunnable != null) {
      this.weatherRunnable.paint(this.bufferedGraphics);
    }
  }

  public setLandscape(landscapeImage: Image, minAltitude: number, maxAltitude: number, minAzimut: number, maxAzimut: number) {
    this.landscapeImage = landscapeImage;
    this.minAltitude = minAltitude;
    this.maxAltitude = maxAltitude;
    this.maxAzimut = maxAzimut;
    this.maxPixels = this.maxAltitude * this.altitudePixels;
  }

  public getHorizonY(): number {
    return this.horizonY;
  }
}
