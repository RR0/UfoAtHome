import {AbstractController} from "../../control/AbstractController";
import {SkyView} from "./SkyView";
import {KeyEvent} from "../../control/KeyEvent";

export class SkyController extends AbstractController {
    private double magnitudeMax;

    private azimutDegrees;
    private altitudeDegrees: number;
    private longitudeDegrees: number;
    private latitudeDegrees: number;
    private skyListeners = [];
    private  weatherImage:Image;
    private model3D:Model3d ;
    private model:SkyModel ;
    private view:SkyView ;
    private messageProducer:MessageProducer ;
    public BACKGROUND_LAYER: number;
    public STARS_LAYER: number;
    public PLANETS_LAYER: number;
    public WEATHER_BACKGROUND_LAYER: number;
    public GROUND_LAYER: number;
    public RUNNABLE_WEATHER: number;

    public SkyController( model:SkyModel, view:SkyView , messageProducer:MessageProducer ) {
        this.model = model;
        this.view = view;
        this.messageProducer = messageProducer;
        //        drawController = new DrawController(view, model, samplingRate, locale);
        //        magnitudeMax = RURAL_VISIBLE_MAGNITUDE;
        this.magnitudeMax = SkyModel.URBAN_VISIBLE_MAGNITUDE;
        //        magnitudeMax = TELESCOPE_VISIBLE_MAGNITUDE;

        this.BACKGROUND_LAYER = this.newLayer();
      this.STARS_LAYER = this.newLayer();
      this.PLANETS_LAYER = this.newLayer();
      this.WEATHER_BACKGROUND_LAYER = this.newLayer();
      this.GROUND_LAYER = this.newLayer();
      this.RUNNABLE_WEATHER = this.newLayer();
      this.lastLayersStartBit = layersStartBit;
    }

    public getOffset(): number {
        return this.model.getOffset();
    }

    public keyPressed( e:KeyEvent) {
        switch (e.getKeyCode()) {
            case KeyEvent.VK_UP:
    this.setAltitude(this.getAltitude() + 1, this);
  this.modified(this.GROUND_LAYER);    // TODO(JBE):
                e.consume();
                break;
            case KeyEvent.VK_DOWN:
    this.setAltitude(this.getAltitude() - 1, this);
                e.consume();
                break;
            case KeyEvent.VK_LEFT:
    this.setAzimut(this.getAzimut() - 1, this);
                e.consume();
                break;
            case KeyEvent.VK_RIGHT:
    this.setAzimut(this.getAzimut() + 1, this);
                e.consume();
                break;
        }
    }

    /**
     * Paint celestial bodies (stars, planets) on the sky
     *
     * @param layers
     */
    private paintBodies(layers:BitSet ) {
        this.view.setColor(Color.white);
        if (this.isToDraw(layers, this.STARS_LAYER)) {
            const stars:CelestialBody[] = this.model.STARS;
            for (let i = 0; i < stars.length; i++) {
              this.paintStar(stars[i]);
            }
        }

        if (this.isToDraw(layers, this.PLANETS_LAYER)) {
            const planets:Planet[] = this.model.getPlanets();
            for (let i = 0; i < planets.length; i++) {
              this.paintPlanet(planets[i]);
            }
        }
    }

    private paintStar( star:CelestialBody) {
        const starCoordinates: number[] = star.getCoordinates();
        const model:SkyModel = this.model;
        const scalarProduct: number = model.mScalarProduct(starCoordinates);
        if (scalarProduct > 0) {
            const xDelta = (int) Math.round(model.exScalarProduct(starCoordinates) / scalarProduct);
          const yDelta = (int) Math.round(model.eyScalarProduct(starCoordinates) / scalarProduct);

            if (this.view.isVisible(xDelta, yDelta)) {
                double mag = magnitudeMax - star.getMagnitudeMax();
                if (mag > magnitudeMax) {
                    mag = magnitudeMax;
                }
                int fullMag = (int) mag;
                int halfMag = fullMag / 2;

                view.paintStar(xDelta, yDelta, halfMag, fullMag);
            }
        }
    }

    private void paintPlanet(Planet planet) {
        double starCoordinates[] = planet.getCoordinates();
        SkyModel skyModel = model;
        double scalarProduct = skyModel.mScalarProduct(starCoordinates);
        if (scalarProduct > 0) {
            int xDelta = (int) Math.round(skyModel.exScalarProduct(starCoordinates) / scalarProduct);
            int yDelta = (int) Math.round(skyModel.eyScalarProduct(starCoordinates) / scalarProduct);

            SkyView skyView = view;
            if (skyView.isVisible(xDelta, yDelta)) {
                double mag = magnitudeMax - planet.getMagnitudeMax();
                if (mag > magnitudeMax) {
                    mag = magnitudeMax;
                }
                int fullMag = (int) mag;
                int halfMag = fullMag / 2;

                xDelta = -xDelta;
                String planetName = planet.getName();
                if (planetName.equals("Sun")) {
                    skyView.paintSun(xDelta, yDelta, halfMag, fullMag);
                } else if (planetName.equals("Moon")) {
                    skyView.paintMoon(xDelta, yDelta, halfMag, fullMag);
                } else {
                    skyView.paintPlanet(xDelta, yDelta, halfMag, fullMag);
                }
            }
        }
    }

    /**
     * @param someAzimut Azimut, in degrees
     * @param source
     */
    public boolean setAzimut(int someAzimut, Object source) {
        int newAzimut = model.setAzimut(someAzimut);
        float azimutDelta = (((float) newAzimut) - ((float) azimutDegrees));
        boolean handled = azimutDelta != 0;
        if (handled) {
            azimutDegrees = newAzimut;
            model3D.incTrans(-azimutDelta, 0, 0);
            fireAzimutChanged(new SkyEvent(source, new Integer(azimutDegrees)));
        }
        return handled;
    }

    public boolean setAltitude(int degrees, Object source) {
        boolean handled = model.setAltitude(degrees);
        if (handled) {
            float altitudeDelta = (((float) degrees) - ((float) altitudeDegrees));
            altitudeDegrees = degrees;
            model3D.incTrans(0, -altitudeDelta / 10, 0);
            fireAltitudeChanged(new SkyEvent(source, new Integer(altitudeDegrees)));
        }
        return handled;
    }

    public void setLatitude(double latitude) {
        this.latitudeDegrees = latitude;
        model.setLatitude(latitude);
        fireLatitudeChanged(new SkyEvent(this, new Double(latitudeDegrees)));
    }

    public void setLongitude(double longitude) {
        this.longitudeDegrees = longitude;
        model.setLongitude(longitude);
        fireLongitudeChanged(new SkyEvent(this, new Double(longitudeDegrees)));
    }

    public int getAzimut() {
        return azimutDegrees;
    }

    public int getAltitude() {
        return altitudeDegrees;
    }

    public int getZoomFactor() {
        return model.getZoomFactor();
    }

    public double getLongitude() {
        return longitudeDegrees;
    }

    public double getLatitude() {
        return latitudeDegrees;
    }

    public void addSkyListener(SkyListener skyListener) {
        skyListeners.addElement(skyListener);
    }

    public void fireAzimutChanged(SkyEvent event) {
        for (int i = 0; i < skyListeners.size(); i++) {
            SkyListener skyListener = (SkyListener) skyListeners.elementAt(i);
            skyListener.azimutChanged(event);
        }
    }

    public void fireAltitudeChanged(SkyEvent event) {
        for (int i = 0; i < skyListeners.size(); i++) {
            SkyListener skyListener = (SkyListener) skyListeners.elementAt(i);
            skyListener.altitudeChanged(event);
        }
    }

    public void fireLatitudeChanged(SkyEvent event) {
        for (int i = 0; i < skyListeners.size(); i++) {
            SkyListener skyListener = (SkyListener) skyListeners.elementAt(i);
            skyListener.latitudeChanged(event);
        }
    }

    public void fireLongitudeChanged(SkyEvent event) {
        for (int i = 0; i < skyListeners.size(); i++) {
            SkyListener skyListener = (SkyListener) skyListeners.elementAt(i);
            skyListener.longitudeChanged(event);
        }
    }

    public URL setLandscape(URL landscapeURL, int minAltitude, int maxAltitude, int minAzimut, int maxAzimut) {
        Image landscapeImage;
        if (landscapeURL != null) {
            try {
                landscapeImage = getImage(landscapeURL, view);
                draw();
            } catch (Exception e) {
                e.printStackTrace();
                return null;
            }
        } else {
            landscapeImage = null;
        }
        view.setLandscape(landscapeImage, minAltitude, maxAltitude, maxAzimut, maxAzimut);
        return landscapeURL;
    }

    public URL setWeather(URL url) {
        try {
            weatherImage = getImage(url, view);
            draw();
        } catch (Exception e) {
            e.printStackTrace();
            weatherImage = null;
        }
        return url;
    }

    public void setPrecipitations(String weatherKey, AbstractController drawer) {
        if (weatherKey.equals("precipitations.Snow")) {
            SnowPrecipitations weatherRunnable = new SnowPrecipitations(drawer);
            view.setWeatherRunnable(weatherRunnable);
        } else if (weatherKey.equals("precipitations.Rain")) {
            RainPrecipitations weatherRunnable = new RainPrecipitations(drawer);
            view.setWeatherRunnable(weatherRunnable);
        } else {
            view.setWeatherRunnable(null);
        }
    }

    public void setWind(String weatherKey) {
        Precipitations weatherRunnable = view.getWeatherRunnable();
        if (weatherRunnable != null) {
            int windFactor;
            if (weatherKey.equals("wind.None")) {
                windFactor = 0;
            } else if (weatherKey.equals("wind.Low")) {
                windFactor = 1;
            } else if (weatherKey.equals("wind.Moderate")) {
                windFactor = 2;
            } else if (weatherKey.equals("wind.Windy")) {
                windFactor = 3;
            } else {
                System.err.println("Unsupported wind type: " + weatherKey);
                return;
            }
            weatherRunnable.setWindFactor(windFactor);
        }
    }

    public void mouseClicked(MouseEvent e) {
        backgroundClicked(e);
    }

    public void mouseReleased(MouseEvent e) {
        setLastPos(-1, -1);
    }

    public void mouseEntered(MouseEvent e) {
        //        drawController.mouseEntered(e);
    }

    public void mouseExited(MouseEvent e) {
        //        drawController.mouseExited(e);
    }

    public void start() {
        //        drawController.start();
        Properties parameters = new Properties();
        Dimension size = view.getSize();
        model3D = new CastleBSP(parameters, size.width, size.height);
        view.setModel3D(model3D);
    }

    //    public boolean isPlaying() {
    //        return drawController.isPlaying();
    //    }

    public void fireMessage(String s, MessageEditable editable) {
        messageProducer.fireMessage(s, editable);
    }

    public void setTime(GregorianCalendar currentTime) {
        super.setTime(currentTime);
        model.setTimeZone(currentTime.getTimeZone());
        model.setTime(currentTime);
    }

    protected void showShapeMenu(int mouseX, int mouseY) {
        //        drawController.showShapeMenu(mouseX, mouseY);
    }

    public void mouseMoved(MouseEvent mouseEvent) {
        int mouseX = mouseEvent.getX();
        int mouseY = mouseEvent.getY();
        String name = model3D.inside(mouseX, mouseY);
        if (name != null) {
            fireMessage(name, null);
        } else if (view.skyContains(mouseX, mouseY)) {
            CelestialBody star = SkyController.this.getModel().getStar(mouseX, mouseY, view.getXCenter(), view.getYCenter());
            if (star != null) {
                String starName = star.getName();
                fireMessage(starName + " (RA=" + star.getRightAscension() + ", declination=" + star.getDeclination() + ")", null);
            }
        } else {
            fireMessage("Ground", null);
        }
    }

    public void mouseDragged(MouseEvent e) {
        int lastX1 = getLastX();
        if (lastX1 >= 0) {
            int lastY1 = getLastY();
            int deltaY = e.getY() - lastY1;
            int newAltitude = altitudeDegrees - deltaY;
            if (setAltitude(newAltitude, this)) {
                e.consume();
            }
            int deltaX = e.getX() - lastX1;
            int newAzimut = azimutDegrees + deltaX;
            if (setAzimut(newAzimut, this)) {
                e.consume();
            }
        }
        setLastPos(e.getX(), e.getY());
        draw();
    }

    public void draw(BitSet requiredLayers) {
        GregorianCalendar currentTime = getCurrentTime();
        if (isToDraw(requiredLayers, BACKGROUND_LAYER)) {
            view.paintBackground(currentTime);
        }
        paintBodies(requiredLayers);
        if (isToDraw(requiredLayers, WEATHER_BACKGROUND_LAYER)) {
            view.paintWeatherBackground(weatherImage, azimutDegrees);
        }
        if (isToDraw(requiredLayers, GROUND_LAYER)) {
            view.paintGround(currentTime, model.getAltitude(), model.getFactor(), azimutDegrees);
        }
        if (isToDraw(requiredLayers, RUNNABLE_WEATHER)) {
            paintWeatherRunnable();
        }
        display();
    }

    public void paintWeatherRunnable() {
        view.paintWeatherRunnable();
    }

    public void setZoomFactor(int x) {
        model.setZoomFactor(x);
    }

    //    public void play(boolean on) {
    //        drawController.play(on);
    //    }

    //    public String getTimeKey() {
    //        return drawController.getTimeKey();
    //    }

    //    public void setTimeKey(String timeKey) {
    //        drawController.setTimeKey(timeKey);
    //    }

    //    public void setDateFormat(DateFormat dateFormat) {
    //        drawController.setDateFormat(dateFormat);
    //    }

    public SkyModel getModel() {
        return model;
    }

    public AbstractView getView() {
        return view;
    }
}
