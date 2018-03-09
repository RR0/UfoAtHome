/**
 * Model of a sky at a given date, location (latitude+longitude), azimut and altitude.
 */
import {DrawModel} from "../../view/draw/DrawModel";

export class SkyModel extends DrawModel {
    public static DEGREES_TO_RADIANS = 0.017453292519943295;
    private static TWO_PI = 6.2831853071795862;

    /**
     * Sideral time
     */
    private theta: number;

    /**
     * Longitude
     */
    private lambda: number;

    /**
     * Latitude
     */
    private phi: number;

    private longitude: number;
    private latitude: number;

    private z: number[];
    private w: number[];
    private s: number[];
    private ex: number[];
    private ey: number[];
    private m: number[];
    private azimut: number;
    private altitude: number;
    private factor: number;
    private lastTime:GregorianCalendar ;

    computeMatrix() {
        const d = Math.cos(this.phi);
      const d1 = Math.sin(this.phi);
      const d2 = Math.cos(this.theta);
      const d3 = Math.sin(this.theta);
        const z = new number[3];
        z[0] = d * d2;
        z[1] = d * d3;
        z[2] = d1;
        w = new double[3];
        w[0] = d3;
        w[1] = -d2;
        w[2] = 0.0D;
        s = new double[3];
        s[0] = d1 * d2;
        s[1] = d1 * d3;
        s[2] = -d;
        m = new double[3];
        for (int i = 0; i < 3; i++) {
            m[i] = Math.cos(altitude) * (Math.cos(azimut) * s[i] + Math.sin(azimut) * w[i]) + Math.sin(altitude) * z[i];
        }

        ex = vectorialProduct(m, z);
        double d4 = montant(ex);
        if (d4 > 1E-010D) {
            for (int j = 0; j < 3; j++) {
                ex[j] /= d4;
            }
        } else {
            for (int k = 0; k < 3; k++) {
                ex[k] = Math.cos(azimut) * w[k] - Math.sin(azimut) * s[k];
            }
        }
        ey = vectorialProduct(ex, m);
        for (int l = 0; l < 3; l++) {
            ex[l] *= factor;
            ey[l] *= factor;
        }
    }

    /**
     * Compute the scalar product of 2 vectors.
     *
     * @param vector1 The first vector
     * @param vector2 The second vector
     * @return The cosinus of the angle between the 2 vectors (0 if the vectors are orthogonal).
     */
     scalarProduct(double vector1[], double vector2[]):number {
        return vector1[0] * vector2[0]
                       + vector1[1] * vector2[1]
                       + vector1[2] * vector2[2];
    }

    public mScalarProduct(double vector[]):number {
        return scalarProduct(vector, m);
    }

    public exScalarProduct(double vector[]):number {
        return scalarProduct(vector, ex);
    }

    public eyScalarProduct(double vector[]) :number{
        return scalarProduct(vector, ey);
    }

     montant(double vector[]):number {
        return Math.sqrt(vector[0] * vector[0] + vector[1] * vector[1] + vector[2] * vector[2]);
    }

    vectorialProduct(double vector1[], double vector2[]):number[] {
        double ad2[] = new double[3];
        ad2[0] = vector1[1] * vector2[2] - vector1[2] * vector2[1];
        ad2[1] = vector1[2] * vector2[0] - vector1[0] * vector2[2];
        ad2[2] = vector1[0] * vector2[1] - vector1[1] * vector2[0];
        return ad2;
    }

    public setTime(GregorianCalendar time) {
        if (time == null) return;
        computeMatrix();
        lastTime = time;
        theta = sideralTime(time, time.get(GregorianCalendar.HOUR_OF_DAY) + getOffset(), longitude);
        GregorianCalendar otherCalendar = (GregorianCalendar) GregorianCalendar.getInstance();
        otherCalendar.set(Calendar.YEAR, 1985);
        otherCalendar.set(Calendar.MONTH, 7);
        otherCalendar.set(Calendar.DAY_OF_MONTH, 2);
        long otherDate = dateFortl(otherCalendar);
        double daysInYear = 365.24250000000001D;
        double d1 = 0.00022361740152968684D;
        double d2 = 9.7171690918465393E-005D;
        double d3 = (double) (dateFortl(time) - otherDate) / daysInYear;
        for (int i = 0; i < STARS.length; i++) {
            CelestialBody star = STARS[i];
            double rightAscension = star.getRightAscension();
            double declination = star.getDeclination();
            double newAlpha = rightAscension + d3 * (d1 + d2 * Math.tan(declination) * Math.sin(rightAscension));
            star.setCurrentAlpha(newAlpha);
            double newDelta = declination + d3 * d2 * Math.cos(rightAscension);
            star.setCurrentDelta(newDelta);
        }
        //        float floatTime = (float) theta;
        for (int i = 0; i < PLANETS.length; i++) {
            Planet planet = PLANETS[i];
            double rightAscension = planet.getRightAscension();
            double declination = planet.getDeclination();
            planet.setTime((float) d3);
            double newAlpha = rightAscension + d3 * (d1 + d2 * Math.tan(declination) * Math.sin(rightAscension));
            planet.setCurrentAlpha(newAlpha);
            double newDelta = declination + d3 * d2 * Math.cos(rightAscension);
            planet.setCurrentDelta(newDelta);
        }
    }

    sideralTime(GregorianCalendar someCalendar, int gmtHour, double geoLongitude):number {
        int someMinutes = someCalendar.get(Calendar.MINUTE);
        long l1 = dateFortl(someCalendar) - 0xadcb0L;
        double d2 = (double) gmtHour / 24D + someMinutes / 1440D;
        double d3 = d2 * 1.00273790934D + (double) (l1 - 12785L) * 0.0027379093400000001D;
        d3 += 0.27942091899999999D + geoLongitude / TWO_PI;
        d3 -= Math.floor(d3);
        d3 *= TWO_PI;
        return d3;
    }

    dateFortl(GregorianCalendar currentTime):number {
        int someYear = currentTime.get(Calendar.YEAR);
        long l = (long) someYear - 1L;
        long l1 = ((l * 365L + l / 4L) - l / 100L) + l / 400L;
        int someMonth = currentTime.get(Calendar.MONTH) + 1;
        for (int i1 = 1; i1 < someMonth; i1++) {
            l1 += monthDays[i1];
        }

        if (someMonth > 2 && currentTime.isLeapYear(someYear)) {
            l1++;
        }
        int someDayOfMonth = currentTime.get(Calendar.DATE);
        l1 += someDayOfMonth - 1;
        return l1;
    }

    public setZoomFactor( as:number) {
        super.setZoomFactor(as);
        factor = 180D / Math.tan((((double) as) * DEGREES_TO_RADIANS) / 2D);
        computeMatrix();
    }

    public  getStar(int mouseX, int mouseY, int xCenter, int yCenter):CelestialBody {
        CelestialBody star = null;
        double d6 = 10000D;
        for (int i = 0; i < STARS.length; i++) {
            double ad[] = STARS[i].getCoordinates();
            double d2 = mScalarProduct(ad);
            if (d2 > 0) {
                double d = (int) Math.round((double) xCenter + exScalarProduct(ad) / d2);
                double d1 = (int) Math.round((double) yCenter - eyScalarProduct(ad) / d2);
                double d3 = d - (double) mouseX;
                double d4 = d1 - (double) mouseY;
                double d5 = d3 * d3 + d4 * d4;
                if (d5 < d6) {
                    d6 = d5;
                    star = STARS[i];
                    break;
                }
            }
        }
        return star;
    }

    public  setAltitude(int altitudeDegrees) :boolean{
        boolean handled = (altitudeDegrees <= 90 && altitudeDegrees >= -90);
        if (handled) {
            altitude = ((double) altitudeDegrees) * DEGREES_TO_RADIANS;
            computeMatrix();
        }
        return handled;
    }

    public int setAzimut(int azimutDegrees) {
        if (azimutDegrees < 0) {
            azimutDegrees = 360 + azimutDegrees;
        }
        azimutDegrees %= 360;
        boolean handled = (azimutDegrees >= 0 && azimutDegrees <= 360);
        if (handled) {
            this.azimut = ((double) azimutDegrees) * DEGREES_TO_RADIANS;
            computeMatrix();
        }
        return azimutDegrees;
    }

    public setLongitude(double longitudeDegrees) {
        longitude = longitudeDegrees * DEGREES_TO_RADIANS;
        lambda = longitude;
        computeMatrix();
        setTime(lastTime);
    }

    public setLatitude(double latitudeDegrees) {
        latitude = latitudeDegrees * DEGREES_TO_RADIANS;
        phi = latitude;
        computeMatrix();
        setTime(lastTime);
    }

    final static double RURAL_VISIBLE_MAGNITUDE = 6D;
    final static double URBAN_VISIBLE_MAGNITUDE = 5D;
    final static double TELESCOPE_VISIBLE_MAGNITUDE = 8D;

    public static final double DEGREES_89 = 1.5533430342749532D;

    private final int monthDays[] = {0, 31, 28, 31, 30, 31, 30, 31, 31, 30, 31, 30, 31};

    final CelestialBody[] STARS = new CelestialBody[]{
                        new CelestialBody("30 Psc", 0.0D, 1.0D, 13D, -1, 6D, 5D, 41D, 4.4100000000000001D, 4.4100000000000001D),
                        new CelestialBody("Alpha And (Sirrah)", 0.0D, 7D, 38.200000000000003D, 1, 29D, 0.0D, 38D, 2.0600000000000001D, 2.0600000000000001D),
                        new CelestialBody("Beta  Cas (Caph)", 0.0D, 8D, 23.899999999999999D, 1, 59D, 4D, 11D, 2.27D, 2.27D),
                        new CelestialBody("Epsilon Phe", 0.0D, 8D, 40.700000000000003D, -1, 45D, 49D, 39D, 3.8799999999999999D, 3.8799999999999999D),
                        new CelestialBody("Gamma Peg (Algenib)", 0.0D, 12D, 29.300000000000001D, 1, 15D, 6D, 11D, 2.8300000000000001D, 2.8300000000000001D),
                        new CelestialBody("7 Cet", 0.0D, 13D, 54.299999999999997D, -1, 19D, 0.0D, 47D, 4.4400000000000004D, 4.4400000000000004D),
                        new CelestialBody("Iota Cet", 0.0D, 18D, 41.299999999999997D, -1, 8D, 54D, 15D, 3.5600000000000001D, 3.5600000000000001D),
                        new CelestialBody("Zeta Tuc", 0.0D, 19D, 19.399999999999999D, -1, 64D, 57D, 36D, 4.2300000000000004D, 4.2300000000000004D),
                        new CelestialBody("Beta Hyi", 0.0D, 25D, 0.5D, -1, 77D, 20D, 9D, 2.7999999999999998D, 2.7999999999999998D),
                        new CelestialBody("Kappa Phe", 0.0D, 25D, 29.5D, -1, 43D, 45D, 37D, 3.9399999999999999D, 3.9399999999999999D),
                        new CelestialBody("Alpha Phe", 0.0D, 25D, 34.200000000000003D, -1, 42D, 23D, 5D, 2.3900000000000001D, 2.3900000000000001D),
                        new CelestialBody("Beta1 Tuc", 0.0D, 30D, 53.200000000000003D, -1, 63D, 2D, 17D, 4.3700000000000001D, 4.3700000000000001D),
                        new CelestialBody("Kappa Cas", 0.0D, 32D, 10D, 1, 62D, 51D, 7D, 4.1600000000000001D, 4.1600000000000001D),
                        new CelestialBody("Pi And", 0.0D, 36D, 6.2000000000000002D, 1, 33D, 38D, 23D, 4.3600000000000003D, 4.3600000000000003D),
                        new CelestialBody("Zeta Cas", 0.0D, 36D, 9.5D, 1, 53D, 49D, 2D, 3.6600000000000001D, 3.6600000000000001D),
                        new CelestialBody("Epsilon And", 0.0D, 37D, 47.200000000000003D, 1, 29D, 13D, 59D, 4.3700000000000001D, 4.3700000000000001D),
                        new CelestialBody("Delta And", 0.0D, 38D, 33D, 1, 30D, 46D, 55D, 3.27D, 3.27D),
                        new CelestialBody("Alpha Cas (Schedir)", 0.0D, 39D, 40.700000000000003D, 1, 56D, 27D, 29D, 2.23D, 2.23D),
                        new CelestialBody("Eta Phe", 0.0D, 42D, 42.399999999999999D, -1, 57D, 32D, 33D, 4.3600000000000003D, 4.3600000000000003D),
                        new CelestialBody("Beta Cet (Deneb Kaitos)", 0.0D, 42D, 51.700000000000003D, -1, 18D, 3D, 58D, 2.04D, 2.04D),
                        new CelestialBody("Zeta And", 0.0D, 46D, 34.100000000000001D, 1, 24D, 11D, 19D, 4.0599999999999996D, 4.0599999999999996D),
                        new CelestialBody("Delta Psc", 0.0D, 47D, 55.700000000000003D, 1, 7D, 30D, 23D, 4.4299999999999997D, 4.4299999999999997D),
                        new CelestialBody("Eta Cas", 0.0D, 48D, 13D, 1, 57D, 44D, 21D, 3.4399999999999999D, 3.4399999999999999D),
                        new CelestialBody("Gamma Cas", 0.0D, 55D, 49.5D, 1, 60D, 38D, 18D, 2.4700000000000002D, 2.4700000000000002D),
                        new CelestialBody("My And", 0.0D, 55D, 56.700000000000003D, 1, 38D, 25D, 15D, 3.8700000000000001D, 3.8700000000000001D),
                        new CelestialBody("Eta And", 0.0D, 56D, 25.899999999999999D, 1, 23D, 20D, 23D, 4.4199999999999999D, 4.4199999999999999D),
                        new CelestialBody("Alpha Scl", 0.0D, 57D, 54.5D, -1, 29D, 26D, 9D, 4.3099999999999996D, 4.3099999999999996D),
                        new CelestialBody("Epsilon Psc", 1.0D, 2D, 11.4D, 1, 7D, 48D, 44D, 4.2800000000000002D, 4.2800000000000002D),
                        new CelestialBody("Beta Phe", 1.0D, 5D, 26.300000000000001D, -1, 46D, 47D, 46D, 3.3100000000000001D, 3.3100000000000001D),
                        new CelestialBody("BS 285", 1.0D, 6D, 33.899999999999999D, 1, 86D, 10D, 48D, 4.25D, 4.25D),
                        new CelestialBody("Zeta Phe", 1.0D, 7D, 46.700000000000003D, -1, 55D, 19D, 23D, 3.9199999999999999D, 3.9199999999999999D),
                        new CelestialBody("Eta Cet", 1.0D, 7D, 51.600000000000001D, -1, 10D, 15D, 32D, 3.4500000000000002D, 3.4500000000000002D),
                        new CelestialBody("Phi And", 1.0D, 8D, 39.399999999999999D, 1, 47D, 9D, 53D, 4.25D, 4.25D),
                        new CelestialBody("Beta And (Mirach)", 1.0D, 8D, 55D, 1, 35D, 32D, 38D, 2.0600000000000001D, 2.0600000000000001D),
                        new CelestialBody("Theta Cas", 1.0D, 10D, 12.800000000000001D, 1, 55D, 4D, 23D, 4.3300000000000001D, 4.3300000000000001D),
                        new CelestialBody("Theta Cet", 1.0D, 23D, 17.899999999999999D, -1, 8D, 15D, 29D, 3.6000000000000001D, 3.6000000000000001D),
                        new CelestialBody("Delta Cas", 1.0D, 24D, 51.5D, 1, 60D, 9D, 37D, 2.6800000000000002D, 2.6800000000000002D),
                        new CelestialBody("Gamma Phe", 1.0D, 27D, 44.200000000000003D, -1, 43D, 23D, 32D, 3.4100000000000001D, 3.4100000000000001D),
                        new CelestialBody("Delta Phe", 1.0D, 30D, 39D, -1, 49D, 8D, 52D, 3.9500000000000002D, 3.9500000000000002D),
                        new CelestialBody("Eta Psc", 1.0D, 30D, 42.299999999999997D, 1, 15D, 16D, 17D, 3.6200000000000001D, 3.6200000000000001D),
                        new CelestialBody("Ypsilon And", 1.0D, 35D, 56.5D, 1, 41D, 20D, 0.0D, 4.0899999999999999D, 4.0899999999999999D),
                        new CelestialBody("51 And", 1.0D, 37D, 5.7999999999999998D, 1, 48D, 33D, 19D, 3.5699999999999998D, 3.5699999999999998D),
                        new CelestialBody("Alpha Eri (Achernar)", 1.0D, 37D, 10.6D, -1, 57D, 18D, 36D, 0.46000000000000002D, 0.46000000000000002D),
                        new CelestialBody("Ny Psc", 1.0D, 40D, 40.5D, 1, 5D, 24D, 53D, 4.4400000000000004D, 4.4400000000000004D),
                        new CelestialBody("Phi Per", 1.0D, 42D, 44.700000000000003D, 1, 50D, 36D, 58D, 4.0700000000000003D, 4.0700000000000003D),
                        new CelestialBody("Tau Cet", 1.0D, 43D, 23.699999999999999D, -1, 16D, 0.0D, 49D, 3.5D, 3.5D),
                        new CelestialBody("Omikron Psc", 1.0D, 44D, 37.600000000000001D, 1, 9D, 5D, 6D, 4.2599999999999998D, 4.2599999999999998D),
                        new CelestialBody("Zeta Cet", 1.0D, 50D, 44.600000000000001D, -1, 10D, 24D, 23D, 3.73D, 3.73D),
                        new CelestialBody("Alpha Tri", 1.0D, 52D, 15.1D, 1, 29D, 30D, 31D, 3.4100000000000001D, 3.4100000000000001D),
                        new CelestialBody("Psi Phe", 1.0D, 53D, 3.8999999999999999D, -1, 46D, 22D, 24D, 4.4100000000000001D, 4.4100000000000001D),
                        new CelestialBody("Epsilon Cas", 1.0D, 53D, 20.399999999999999D, 1, 63D, 35D, 57D, 3.3799999999999999D, 3.3799999999999999D),
                        new CelestialBody("Beta Ari", 1.0D, 53D, 50.200000000000003D, 1, 20D, 44D, 15D, 2.6400000000000001D, 2.6400000000000001D),
                        new CelestialBody("Chi Eri", 1.0D, 55D, 23.699999999999999D, -1, 51D, 40D, 51D, 3.7000000000000002D, 3.7000000000000002D),
                        new CelestialBody("Alpha Hyi", 1.0D, 58D, 18.899999999999999D, -1, 61D, 38D, 24D, 2.8599999999999999D, 2.8599999999999999D),
                        new CelestialBody("Ypsilon Cet", 1.0D, 59D, 19.300000000000001D, -1, 21D, 8D, 52D, 4D, 4D),
                        new CelestialBody("Alpha Psc", 2D, 1.0D, 17.699999999999999D, 1, 2D, 41D, 39D, 3.79D, 3.79D),
                        new CelestialBody("50 Cas", 2D, 2D, 10.5D, 1, 72D, 21D, 7D, 3.98D, 3.98D),
                        new CelestialBody("Gamma1 And (Alamak)", 2D, 3D, 0.29999999999999999D, 1, 42D, 15D, 38D, 2.2599999999999998D, 2.2599999999999998D),
                        new CelestialBody("Alpha Ari", 2D, 6D, 21.199999999999999D, 1, 23D, 23D, 40D, 2D, 2D),
                        new CelestialBody("Beta Tri", 2D, 8D, 40.600000000000001D, 1, 34D, 55D, 9D, 3D, 3D),
                        new CelestialBody("Xi1 Cet", 2D, 12D, 13.800000000000001D, 1, 8D, 46D, 45D, 4.3700000000000001D, 4.3700000000000001D),
                        new CelestialBody("Phi Eri", 2D, 15D, 59.5D, -1, 51D, 34D, 45D, 3.5600000000000001D, 3.5600000000000001D),
                        new CelestialBody("Gamma Tri", 2D, 16D, 26.899999999999999D, 1, 33D, 46D, 51D, 4.0099999999999998D, 4.0099999999999998D),
                        new CelestialBody("Alpha UMi (Polaris)", 2D, 16D, 51.299999999999997D, 1, 89D, 11D, 56D, 2.02D, 2.02D),
                        new CelestialBody("Omikron Cet (Mira)", 2D, 18D, 36.700000000000003D, -1, 3D, 2D, 35D, 10D, 2D),
                        new CelestialBody("Delta Hyi", 2D, 21D, 29.399999999999999D, -1, 68D, 43D, 31D, 4.0899999999999999D, 4.0899999999999999D),
                        new CelestialBody("Kappa Eri", 2D, 26D, 27.300000000000001D, -1, 47D, 46D, 7D, 4.25D, 4.25D),
                        new CelestialBody("Xi2 Cet", 2D, 27D, 23.199999999999999D, 1, 8D, 23D, 44D, 4.2800000000000002D, 4.2800000000000002D),
                        new CelestialBody("Delta Cet", 2D, 38D, 44.299999999999997D, 1, 0.0D, 15D, 59D, 4.0700000000000003D, 4.0700000000000003D),
                        new CelestialBody("Epsilon Hyi", 2D, 39D, 21.899999999999999D, -1, 68D, 19D, 44D, 4.1100000000000003D, 4.1100000000000003D),
                        new CelestialBody("Iota Eri", 2D, 40D, 5.7000000000000002D, -1, 39D, 55D, 1.0D, 4.1100000000000003D, 4.1100000000000003D),
                        new CelestialBody("Gamma Cet", 2D, 42D, 32.899999999999999D, 1, 3D, 10D, 31D, 3.4700000000000002D, 3.4700000000000002D),
                        new CelestialBody("Theta Per", 2D, 43D, 12.199999999999999D, 1, 49D, 10D, 4D, 4.1200000000000001D, 4.1200000000000001D),
                        new CelestialBody("Pi Cet", 2D, 43D, 25.899999999999999D, -1, 13D, 55D, 11D, 4.25D, 4.25D),
                        new CelestialBody("My Cet", 2D, 44D, 9.4000000000000004D, 1, 10D, 3D, 13D, 4.2699999999999996D, 4.2699999999999996D),
                        new CelestialBody("Tau1 Eri", 2D, 44D, 25.5D, -1, 18D, 38D, 0.0D, 4.4699999999999998D, 4.4699999999999998D),
                        new CelestialBody("Beta For", 2D, 48D, 29D, -1, 32D, 27D, 59D, 4.46D, 4.46D),
                        new CelestialBody("41 Ari", 2D, 49D, 7.5999999999999996D, 1, 27D, 12D, 5D, 3.6299999999999999D, 3.6299999999999999D),
                        new CelestialBody("Eta Per", 2D, 49D, 37.899999999999999D, 1, 55D, 50D, 10D, 3.7599999999999998D, 3.7599999999999998D),
                        new CelestialBody("16 Per", 2D, 49D, 39.799999999999997D, 1, 38D, 15D, 35D, 4.2300000000000004D, 4.2300000000000004D),
                        new CelestialBody("Tau Per", 2D, 53D, 13.4D, 1, 52D, 42D, 14D, 3.9500000000000002D, 3.9500000000000002D),
                        new CelestialBody("R Hor", 2D, 53D, 23.899999999999999D, -1, 49D, 56D, 57D, 4D, 4D),
                        new CelestialBody("Eta Eri", 2D, 55D, 43.100000000000001D, -1, 8D, 57D, 19D, 3.8900000000000001D, 3.8900000000000001D),
                        new CelestialBody("Theta1 Eri", 2D, 57D, 42.700000000000003D, -1, 40D, 21D, 45D, 2.9100000000000001D, 2.9100000000000001D),
                        new CelestialBody("Theta2 Eri", 2D, 57D, 43.299999999999997D, -1, 40D, 21D, 44D, 4.4199999999999999D, 4.4199999999999999D),
                        new CelestialBody("Alpha Cet (Menkar)", 3D, 1.0D, 31.199999999999999D, 1, 4D, 2D, 0.0D, 2.5299999999999998D, 2.5299999999999998D),
                        new CelestialBody("Tau3 Eri", 3D, 1.0D, 45.100000000000001D, -1, 23D, 40D, 51D, 4.0899999999999999D, 4.0899999999999999D),
                        new CelestialBody("Gamma Per", 3D, 3D, 44.399999999999999D, 1, 53D, 27D, 2D, 2.9300000000000002D, 2.9300000000000002D),
                        new CelestialBody("Rho Per", 3D, 4D, 14.6D, 1, 38D, 47D, 5D, 3.3900000000000001D, 3.3900000000000001D),
                        new CelestialBody("Beta Per (Algol)", 3D, 7D, 13.300000000000001D, 1, 40D, 54D, 2D, 2.1200000000000001D, 2.1200000000000001D),
                        new CelestialBody("Iota Per", 3D, 8D, 0.90000000000000002D, 1, 49D, 33D, 32D, 4.0499999999999998D, 4.0499999999999998D),
                        new CelestialBody("Kappa Per", 3D, 8D, 30.800000000000001D, 1, 44D, 48D, 11D, 3.7999999999999998D, 3.7999999999999998D),
                        new CelestialBody("Delta Ari", 3D, 10D, 47.899999999999999D, 1, 19D, 40D, 21D, 4.3499999999999996D, 4.3499999999999996D),
                        new CelestialBody("Alpha For", 3D, 11D, 27.300000000000001D, -1, 29D, 2D, 37D, 3.8700000000000001D, 3.8700000000000001D),
                        new CelestialBody("Tau4 Eri", 3D, 18D, 52.299999999999997D, -1, 21D, 48D, 36D, 3.6899999999999999D, 3.6899999999999999D),
                        new CelestialBody("BS 1008", 3D, 19D, 20.899999999999999D, -1, 43D, 7D, 29D, 4.2699999999999996D, 4.2699999999999996D),
                        new CelestialBody("BS 999", 3D, 19D, 27.600000000000001D, 1, 28D, 59D, 48D, 4.4699999999999998D, 4.4699999999999998D),
                        new CelestialBody("Alpha Per (Mirfak)", 3D, 23D, 16.899999999999999D, 1, 49D, 48D, 38D, 1.8D, 1.8D),
                        new CelestialBody("Omikron Tau", 3D, 24D, 1.8999999999999999D, 1, 8D, 58D, 43D, 3.6000000000000001D, 3.6000000000000001D),
                        new CelestialBody("Xi Tau", 3D, 26D, 22.899999999999999D, 1, 9D, 40D, 58D, 3.7400000000000002D, 3.7400000000000002D),
                        new CelestialBody("BS 1035", 3D, 27D, 53.200000000000003D, 1, 59D, 53D, 27D, 4.21D, 4.21D),
                        new CelestialBody("Sigma Per", 3D, 29D, 32.799999999999997D, 1, 47D, 56D, 46D, 4.3499999999999996D, 4.3499999999999996D),
                        new CelestialBody("5 Tau", 3D, 30D, 4.2999999999999998D, 1, 12D, 53D, 16D, 4.1100000000000003D, 4.1100000000000003D),
                        new CelestialBody("Epsilon Eri", 3D, 32D, 14.800000000000001D, -1, 9D, 30D, 24D, 3.73D, 3.73D),
                        new CelestialBody("Tau5 Eri", 3D, 33D, 8.8000000000000007D, -1, 21D, 40D, 51D, 4.2599999999999998D, 4.2599999999999998D),
                        new CelestialBody("Psi Per", 3D, 35D, 27.300000000000001D, 1, 48D, 8D, 43D, 4.2300000000000004D, 4.2300000000000004D),
                        new CelestialBody("10 Tau", 3D, 36D, 7.9000000000000004D, 1, 0.0D, 21D, 23D, 4.2800000000000002D, 4.2800000000000002D),
                        new CelestialBody("Delta Per", 3D, 41D, 53.299999999999997D, 1, 47D, 44D, 32D, 3.0099999999999998D, 3.0099999999999998D),
                        new CelestialBody("Delta Eri", 3D, 42D, 33.200000000000003D, -1, 9D, 48D, 43D, 3.54D, 3.54D),
                        new CelestialBody("Omikron Per", 3D, 43D, 24.399999999999999D, 1, 32D, 14D, 35D, 3.8300000000000001D, 3.8300000000000001D),
                        new CelestialBody("17 Tau", 3D, 44D, 0.69999999999999996D, 1, 24D, 4D, 7D, 3.7000000000000002D, 3.7000000000000002D),
                        new CelestialBody("Beta Ret", 3D, 44D, 0.90000000000000002D, -1, 64D, 51D, 9D, 3.8500000000000001D, 3.8500000000000001D),
                        new CelestialBody("Ny Per", 3D, 44D, 12.300000000000001D, 1, 42D, 32D, 1.0D, 3.77D, 3.77D),
                        new CelestialBody("19 Tau", 3D, 44D, 20.600000000000001D, 1, 24D, 25D, 21D, 4.2999999999999998D, 4.2999999999999998D),
                        new CelestialBody("20 Tau", 3D, 44D, 57.700000000000003D, 1, 24D, 19D, 24D, 3.8799999999999999D, 3.8799999999999999D),
                        new CelestialBody("Pi Eri", 3D, 45D, 27.300000000000001D, -1, 12D, 8D, 48D, 4.4199999999999999D, 4.4199999999999999D),
                        new CelestialBody("23 Tau", 3D, 45D, 27.800000000000001D, 1, 23D, 54D, 14D, 4.1799999999999997D, 4.1799999999999997D),
                        new CelestialBody("Tau6 Eri", 3D, 46D, 13.4D, -1, 23D, 17D, 31D, 4.2300000000000004D, 4.2300000000000004D),
                        new CelestialBody("Eta Tau (Alcyone)", 3D, 46D, 37.200000000000003D, 1, 24D, 3D, 40D, 2.8700000000000001D, 2.8700000000000001D),
                        new CelestialBody("Gamma Hyi", 3D, 47D, 27.300000000000001D, -1, 74D, 17D, 1.0D, 3.2400000000000002D, 3.2400000000000002D),
                        new CelestialBody("BS 1155", 3D, 48D, 10.9D, 1, 65D, 28D, 57D, 4.4699999999999998D, 4.4699999999999998D),
                        new CelestialBody("27 Tau", 3D, 48D, 17.899999999999999D, 1, 24D, 0.0D, 36D, 3.6299999999999999D, 3.6299999999999999D),
                        new CelestialBody("BS 1195", 3D, 48D, 54.700000000000003D, -1, 36D, 14D, 37D, 4.1699999999999999D, 4.1699999999999999D),
                        new CelestialBody("Zeta Per", 3D, 53D, 13.1D, 1, 31D, 50D, 29D, 2.8500000000000001D, 2.8500000000000001D),
                        new CelestialBody("Epsilon Per", 3D, 56D, 52.600000000000001D, 1, 39D, 58D, 9D, 2.8900000000000001D, 2.8900000000000001D),
                        new CelestialBody("Gamma Eri", 3D, 57D, 21.100000000000001D, -1, 13D, 32D, 57D, 2.9500000000000002D, 2.9500000000000002D),
                        new CelestialBody("Xi Per", 3D, 58D, 1.3D, 1, 35D, 45D, 1.0D, 4.04D, 4.04D),
                        new CelestialBody("Lambda Tau", 3D, 59D, 52.5D, 1, 12D, 27D, 1.0D, 3.4700000000000002D, 3.4700000000000002D),
                        new CelestialBody("Ny Tau", 4D, 2D, 23D, 1, 5D, 56D, 59D, 3.9100000000000001D, 3.9100000000000001D),
                        new CelestialBody("37 Tau", 4D, 3D, 50.200000000000003D, 1, 22D, 2D, 35D, 4.3600000000000003D, 4.3600000000000003D),
                        new CelestialBody("Lambda Per", 4D, 5D, 29.899999999999999D, 1, 50D, 18D, 46D, 4.29D, 4.29D),
                        new CelestialBody("48 Per", 4D, 7D, 36.299999999999997D, 1, 47D, 40D, 29D, 4.04D, 4.04D),
                        new CelestialBody("Omikron1 Eri", 4D, 11D, 9.4000000000000004D, -1, 6D, 52D, 29D, 4.04D, 4.04D),
                        new CelestialBody("Alpha Hor", 4D, 13D, 31.199999999999999D, -1, 42D, 19D, 47D, 3.8599999999999999D, 3.8599999999999999D),
                        new CelestialBody("My Per", 4D, 13D, 49.700000000000003D, 1, 48D, 22D, 25D, 4.1399999999999997D, 4.1399999999999997D),
                        new CelestialBody("Alpha Ret", 4D, 14D, 14.199999999999999D, -1, 62D, 30D, 36D, 3.3500000000000001D, 3.3500000000000001D),
                        new CelestialBody("Omikron2 Eri", 4D, 14D, 36.200000000000003D, -1, 7D, 40D, 29D, 4.4299999999999997D, 4.4299999999999997D),
                        new CelestialBody("My Tau", 4D, 14D, 44.700000000000003D, 1, 8D, 51D, 24D, 4.29D, 4.29D),
                        new CelestialBody("Gamma Dor", 4D, 15D, 38.799999999999997D, -1, 51D, 31D, 22D, 4.25D, 4.25D),
                        new CelestialBody("Epsilon Ret", 4D, 16D, 13.800000000000001D, -1, 59D, 20D, 12D, 4.4400000000000004D, 4.4400000000000004D),
                        new CelestialBody("41 Eri", 4D, 17D, 20.699999999999999D, -1, 33D, 50D, 0.0D, 3.5600000000000001D, 3.5600000000000001D),
                        new CelestialBody("Gamma Tau", 4D, 18D, 58D, 1, 15D, 35D, 36D, 3.6299999999999999D, 3.6299999999999999D),
                        new CelestialBody("Delta Tau", 4D, 22D, 5.7999999999999998D, 1, 17D, 30D, 33D, 3.7599999999999998D, 3.7599999999999998D),
                        new CelestialBody("43 Eri", 4D, 23D, 29.5D, -1, 34D, 3D, 0.0D, 3.9500000000000002D, 3.9500000000000002D),
                        new CelestialBody("Kappa Tau", 4D, 24D, 30.199999999999999D, 1, 22D, 15D, 41D, 4.2199999999999998D, 4.2199999999999998D),
                        new CelestialBody("68 Tau", 4D, 24D, 39D, 1, 17D, 53D, 45D, 4.2999999999999998D, 4.2999999999999998D),
                        new CelestialBody("Ypsilon Tau", 4D, 25D, 26.300000000000001D, 1, 22D, 46D, 53D, 4.29D, 4.29D),
                        new CelestialBody("71 Tau", 4D, 25D, 31.100000000000001D, 1, 15D, 35D, 10D, 4.4900000000000002D, 4.4900000000000002D),
                        new CelestialBody("Theta1 Tau", 4D, 27D, 44.700000000000003D, 1, 15D, 55D, 51D, 3.8500000000000001D, 3.8500000000000001D),
                        new CelestialBody("Epsilon Tau", 4D, 27D, 46.100000000000001D, 1, 19D, 8D, 57D, 3.54D, 3.54D),
                        new CelestialBody("Theta2 Tau", 4D, 27D, 50D, 1, 15D, 50D, 22D, 3.4199999999999999D, 3.4199999999999999D),
                        new CelestialBody("Alpha Dor", 4D, 33D, 40.899999999999999D, -1, 55D, 4D, 29D, 3.27D, 3.27D),
                        new CelestialBody("88 Tau", 4D, 34D, 51.399999999999999D, 1, 10D, 7D, 55D, 4.25D, 4.25D),
                        new CelestialBody("Ypsilon2 Eri", 4D, 34D, 59.200000000000003D, -1, 30D, 35D, 29D, 3.8199999999999998D, 3.8199999999999998D),
                        new CelestialBody("Alpha Tau (Aldebaran)", 4D, 35D, 5.2000000000000002D, 1, 16D, 28D, 51D, 0.84999999999999998D, 0.84999999999999998D),
                        new CelestialBody("Ny Eri", 4D, 35D, 35.600000000000001D, -1, 3D, 22D, 53D, 3.9300000000000002D, 3.9300000000000002D),
                        new CelestialBody("58 Per", 4D, 35D, 40.899999999999999D, 1, 41D, 14D, 9D, 4.25D, 4.25D),
                        new CelestialBody("90 Tau", 4D, 37D, 20.699999999999999D, 1, 12D, 28D, 57D, 4.2699999999999996D, 4.2699999999999996D),
                        new CelestialBody("53 Eri", 4D, 37D, 30.899999999999999D, -1, 14D, 19D, 54D, 3.8700000000000001D, 3.8700000000000001D),
                        new CelestialBody("54 Eri", 4D, 39D, 48.399999999999999D, -1, 19D, 41D, 56D, 4.3200000000000003D, 4.3200000000000003D),
                        new CelestialBody("Alpha Cae", 4D, 40D, 5.5999999999999996D, -1, 41D, 53D, 28D, 4.4500000000000002D, 4.4500000000000002D),
                        new CelestialBody("Tau Tau", 4D, 41D, 22.399999999999999D, 1, 22D, 55D, 48D, 4.2800000000000002D, 4.2800000000000002D),
                        new CelestialBody("My Eri", 4D, 44D, 46.600000000000001D, -1, 3D, 16D, 50D, 4.0199999999999996D, 4.0199999999999996D),
                        new CelestialBody("Pi3 Ori", 4D, 49D, 3.1000000000000001D, 1, 6D, 56D, 12D, 3.1899999999999999D, 3.1899999999999999D),
                        new CelestialBody("Pi2 Ori", 4D, 49D, 49.200000000000003D, 1, 8D, 52D, 34D, 4.3600000000000003D, 4.3600000000000003D),
                        new CelestialBody("Pi4 Ori", 4D, 50D, 26D, 1, 5D, 34D, 52D, 3.6899999999999999D, 3.6899999999999999D),
                        new CelestialBody("Omega Eri", 4D, 52D, 10.9D, -1, 5D, 28D, 35D, 4.3899999999999997D, 4.3899999999999997D),
                        new CelestialBody("Alpha Cam", 4D, 52D, 36.100000000000001D, 1, 66D, 19D, 10D, 4.29D, 4.29D),
                        new CelestialBody("Pi5 Ori", 4D, 53D, 29.699999999999999D, 1, 2D, 25D, 4D, 3.7200000000000002D, 3.7200000000000002D),
                        new CelestialBody("Omikron2 Ori", 4D, 55D, 33.299999999999997D, 1, 13D, 29D, 32D, 4.0700000000000003D, 4.0700000000000003D),
                        new CelestialBody("Iota Aur", 4D, 56D, 2.7999999999999998D, 1, 33D, 8D, 39D, 2.6899999999999999D, 2.6899999999999999D),
                        new CelestialBody("7 Cam", 4D, 56D, 7.2000000000000002D, 1, 53D, 43D, 48D, 4.4699999999999998D, 4.4699999999999998D),
                        new CelestialBody("Pi6 Ori", 4D, 57D, 47.700000000000003D, 1, 1.0D, 41D, 34D, 4.4699999999999998D, 4.4699999999999998D),
                        new CelestialBody("Epsilon Aur", 5D, 0.0D, 55.600000000000001D, 1, 43D, 48D, 10D, 2.9900000000000002D, 2.9900000000000002D),
                        new CelestialBody("Zeta Aur", 5D, 1.0D, 27.699999999999999D, 1, 41D, 3D, 20D, 3.75D, 3.75D),
                        new CelestialBody("Beta Cam", 5D, 2D, 7.4000000000000004D, 1, 60D, 25D, 21D, 4.0300000000000002D, 4.0300000000000002D),
                        new CelestialBody("Epsilon Lep", 5D, 4D, 50.799999999999997D, -1, 22D, 23D, 24D, 3.1899999999999999D, 3.1899999999999999D),
                        new CelestialBody("Eta Aur", 5D, 5D, 29.699999999999999D, 1, 41D, 12D, 57D, 3.1699999999999999D, 3.1699999999999999D),
                        new CelestialBody("Beta Eri", 5D, 7D, 8.0999999999999996D, -1, 5D, 6D, 16D, 2.79D, 2.79D),
                        new CelestialBody("Lambda Eri", 5D, 8D, 27.100000000000001D, -1, 8D, 46D, 19D, 4.2699999999999996D, 4.2699999999999996D),
                        new CelestialBody("Iota Lep", 5D, 11D, 37.200000000000003D, -1, 11D, 53D, 9D, 4.4500000000000002D, 4.4500000000000002D),
                        new CelestialBody("My Lep", 5D, 12D, 16.699999999999999D, -1, 16D, 13D, 19D, 3.3100000000000001D, 3.3100000000000001D),
                        new CelestialBody("Rho Ori", 5D, 12D, 31.899999999999999D, 1, 2D, 50D, 41D, 4.46D, 4.46D),
                        new CelestialBody("Kappa Lep", 5D, 12D, 33.600000000000001D, -1, 12D, 57D, 29D, 4.3600000000000003D, 4.3600000000000003D),
                        new CelestialBody("Beta Ori (Rigel)", 5D, 13D, 50.399999999999999D, -1, 8D, 13D, 4D, 0.12D, 0.12D),
                        new CelestialBody("Alpha Aur (Capella)", 5D, 15D, 37D, 1, 45D, 59D, 4D, 0.080000000000000002D, 0.080000000000000002D),
                        new CelestialBody("Tau Ori", 5D, 16D, 54.100000000000001D, -1, 6D, 51D, 34D, 3.6000000000000001D, 3.6000000000000001D),
                        new CelestialBody("Lambda Lep", 5D, 18D, 54.399999999999999D, -1, 13D, 11D, 28D, 4.29D, 4.29D),
                        new CelestialBody("29 Ori", 5D, 23D, 14.9D, -1, 7D, 49D, 14D, 4.1399999999999997D, 4.1399999999999997D),
                        new CelestialBody("Eta Ori", 5D, 23D, 44.799999999999997D, -1, 2D, 24D, 35D, 3.3599999999999999D, 3.3599999999999999D),
                        new CelestialBody("Gamma Ori (Bellatrix)", 5D, 24D, 21.100000000000001D, 1, 6D, 20D, 14D, 1.6399999999999999D, 1.6399999999999999D),
                        new CelestialBody("Beta Tau (Elnath)", 5D, 25D, 22.5D, 1, 28D, 35D, 46D, 1.6499999999999999D, 1.6499999999999999D),
                        new CelestialBody("Beta Lep", 5D, 27D, 37.399999999999999D, -1, 20D, 46D, 14D, 2.8399999999999999D, 2.8399999999999999D),
                        new CelestialBody("32 Ori", 5D, 30D, 0.5D, 1, 5D, 56D, 16D, 4.2000000000000002D, 4.2000000000000002D),
                        new CelestialBody("Epsilon Col", 5D, 30D, 41.799999999999997D, -1, 35D, 28D, 51D, 3.8700000000000001D, 3.8700000000000001D),
                        new CelestialBody("Delta Ori", 5D, 31D, 15.9D, -1, 0.0D, 18D, 33D, 2.23D, 2.23D),
                        new CelestialBody("119 Tau", 5D, 31D, 21.699999999999999D, 1, 18D, 35D, 4D, 4.3799999999999999D, 4.3799999999999999D),
                        new CelestialBody("Alpha Lep", 5D, 32D, 5.4000000000000004D, -1, 17D, 49D, 55D, 2.5800000000000001D, 2.5800000000000001D),
                        new CelestialBody("Beta Dor", 5D, 33D, 29.899999999999999D, -1, 62D, 29D, 57D, 3.3999999999999999D, 3.3999999999999999D),
                        new CelestialBody("Phi1 Ori", 5D, 34D, 1.3999999999999999D, 1, 9D, 28D, 50D, 4.4100000000000001D, 4.4100000000000001D),
                        new CelestialBody("Lambda Ori", 5D, 34D, 20.300000000000001D, 1, 9D, 55D, 31D, 3.3900000000000001D, 3.3900000000000001D),
                        new CelestialBody("Iota Ori", 5D, 34D, 43.399999999999999D, -1, 5D, 55D, 7D, 2.7599999999999998D, 2.7599999999999998D),
                        new CelestialBody("Epsilon Ori (Alnilam)", 5D, 35D, 28.600000000000001D, -1, 1.0D, 12D, 38D, 1.7D, 1.7D),
                        new CelestialBody("Phi2 Ori", 5D, 36D, 6.5D, 1, 9D, 17D, 1.0D, 4.0899999999999999D, 4.0899999999999999D),
                        new CelestialBody("Zeta Tau", 5D, 36D, 46.600000000000001D, 1, 21D, 8D, 5D, 3D, 3D),
                        new CelestialBody("Sigma Ori", 5D, 38D, 1.0D, -1, 2D, 36D, 28D, 3.8100000000000001D, 3.8100000000000001D),
                        new CelestialBody("Alpha Col", 5D, 39D, 7.4000000000000004D, -1, 34D, 4D, 53D, 2.6400000000000001D, 2.6400000000000001D),
                        new CelestialBody("Zeta Ori (Alnitak))", 5D, 40D, 1.6000000000000001D, -1, 1.0D, 56D, 58D, 1.77D, 1.77D),
                        new CelestialBody("Zeta Ori", 5D, 40D, 1.6000000000000001D, -1, 1.0D, 56D, 58D, 4.21D, 4.21D),
                        new CelestialBody("Gamma Lep", 5D, 43D, 51.5D, -1, 22D, 27D, 9D, 3.6000000000000001D, 3.6000000000000001D),
                        new CelestialBody("Delta Dor", 5D, 44D, 44.799999999999997D, -1, 65D, 44D, 28D, 4.3499999999999996D, 4.3499999999999996D),
                        new CelestialBody("Zeta Lep", 5D, 46D, 17.899999999999999D, -1, 14D, 49D, 36D, 3.5499999999999998D, 3.5499999999999998D),
                        new CelestialBody("Beta Pic", 5D, 46D, 56.5D, -1, 51D, 4D, 17D, 3.8500000000000001D, 3.8500000000000001D),
                        new CelestialBody("Kappa Ori", 5D, 47D, 4.0999999999999996D, -1, 9D, 40D, 27D, 2.0600000000000001D, 2.0600000000000001D),
                        new CelestialBody("Beta Col", 5D, 50D, 26.899999999999999D, -1, 35D, 46D, 24D, 3.1200000000000001D, 3.1200000000000001D),
                        new CelestialBody("Ny Aur", 5D, 50D, 29D, 1, 39D, 8D, 43D, 3.9700000000000002D, 3.9700000000000002D),
                        new CelestialBody("Delta Lep", 5D, 50D, 41.799999999999997D, -1, 20D, 52D, 47D, 3.8100000000000001D, 3.8100000000000001D),
                        new CelestialBody("Chi1 Ori", 5D, 53D, 31.399999999999999D, 1, 20D, 16D, 28D, 4.4100000000000001D, 4.4100000000000001D),
                        new CelestialBody("Alpha Ori (Beteigeuze)", 5D, 54D, 23.199999999999999D, 1, 7D, 24D, 19D, 0.5D, 0.5D),
                        new CelestialBody("Eta Lep", 5D, 55D, 44.600000000000001D, -1, 14D, 10D, 11D, 3.71D, 3.71D),
                        new CelestialBody("Gamma Col", 5D, 57D, 1.3D, -1, 35D, 17D, 4D, 4.3600000000000003D, 4.3600000000000003D),
                        new CelestialBody("Delta Aur", 5D, 58D, 20D, 1, 54D, 17D, 5D, 3.7200000000000002D, 3.7200000000000002D),
                        new CelestialBody("Beta Aur (Menkalinam)", 5D, 58D, 27.899999999999999D, 1, 44D, 56D, 50D, 1.8999999999999999D, 1.8999999999999999D),
                        new CelestialBody("Eta Col", 5D, 58D, 42.100000000000001D, -1, 42D, 48D, 56D, 3.96D, 3.96D),
                        new CelestialBody("Theta Aur", 5D, 58D, 43.899999999999999D, 1, 37D, 12D, 45D, 2.6200000000000001D, 2.6200000000000001D),
                        new CelestialBody("Pi Aur", 5D, 58D, 51.5D, 1, 45D, 56D, 12D, 4.2599999999999998D, 4.2599999999999998D),
                        new CelestialBody("My Ori", 6D, 1.0D, 35.100000000000001D, 1, 9D, 38D, 54D, 4.1200000000000001D, 4.1200000000000001D),
                        new CelestialBody("1 Gem", 6D, 3D, 14.300000000000001D, 1, 23D, 15D, 54D, 4.1600000000000001D, 4.1600000000000001D),
                        new CelestialBody("Ny Ori", 6D, 6D, 44.600000000000001D, 1, 14D, 46D, 16D, 4.4199999999999999D, 4.4199999999999999D),
                        new CelestialBody("Xi Ori", 6D, 11D, 6.9000000000000004D, 1, 14D, 12D, 46D, 4.4800000000000004D, 4.4800000000000004D),
                        new CelestialBody("Eta Gem", 6D, 14D, 0.10000000000000001D, 1, 22D, 30D, 43D, 3.2799999999999998D, 3.2799999999999998D),
                        new CelestialBody("Gamma Mon", 6D, 14D, 8.9000000000000004D, -1, 6D, 16D, 11D, 3.98D, 3.98D),
                        new CelestialBody("Kappa Aur", 6D, 14D, 27.199999999999999D, 1, 29D, 30D, 16D, 4.3499999999999996D, 4.3499999999999996D),
                        new CelestialBody("Kappa Col", 6D, 16D, 2.1000000000000001D, -1, 35D, 8D, 7D, 4.3700000000000001D, 4.3700000000000001D),
                        new CelestialBody("2 Lyn", 6D, 18D, 20.699999999999999D, 1, 59D, 1.0D, 3D, 4.4800000000000004D, 4.4800000000000004D),
                        new CelestialBody("Zeta CMa", 6D, 19D, 45.399999999999999D, -1, 30D, 3D, 23D, 3.02D, 3.02D),
                        new CelestialBody("Delta Col", 6D, 21D, 35D, -1, 33D, 25D, 43D, 3.8500000000000001D, 3.8500000000000001D),
                        new CelestialBody("Beta CMa (Mirzam)", 6D, 22D, 3.6000000000000001D, -1, 17D, 56D, 53D, 1.98D, 1.98D),
                        new CelestialBody("My Gem", 6D, 22D, 5D, 1, 22D, 31D, 19D, 2.8799999999999999D, 2.8799999999999999D),
                        new CelestialBody("8 Mon", 6D, 22D, 60D, 1, 4D, 36D, 4D, 4.3300000000000001D, 4.3300000000000001D),
                        new CelestialBody("Alpha Car (Canopus)", 6D, 23D, 37.799999999999997D, -1, 52D, 41D, 15D, -0.71999999999999997D, -0.71999999999999997D),
                        new CelestialBody("Lambda CMa", 6D, 27D, 37.899999999999999D, -1, 32D, 34D, 14D, 4.4800000000000004D, 4.4800000000000004D),
                        new CelestialBody("Ny Gem", 6D, 28D, 6.0999999999999996D, 1, 20D, 13D, 20D, 4.1500000000000004D, 4.1500000000000004D),
                        new CelestialBody("Xi1 CMa", 6D, 31D, 15.1D, -1, 23D, 24D, 26D, 4.3399999999999999D, 4.3399999999999999D),
                        new CelestialBody("13 Mon", 6D, 32D, 7.2000000000000002D, 1, 7D, 20D, 40D, 4.5D, 4.5D),
                        new CelestialBody("BS 2435", 6D, 34D, 39.399999999999999D, -1, 52D, 57D, 48D, 4.3899999999999997D, 4.3899999999999997D),
                        new CelestialBody("Ny2 CMa", 6D, 36D, 3.1000000000000001D, -1, 19D, 14D, 35D, 3.9500000000000002D, 3.9500000000000002D),
                        new CelestialBody("Gamma Gem (Alhena)", 6D, 36D, 52.5D, 1, 16D, 24D, 45D, 1.9299999999999999D, 1.9299999999999999D),
                        new CelestialBody("Ny3 CMa", 6D, 37D, 15.1D, -1, 18D, 13D, 27D, 4.4299999999999997D, 4.4299999999999997D),
                        new CelestialBody("Ny Pup", 6D, 37D, 19D, -1, 43D, 10D, 58D, 3.1699999999999999D, 3.1699999999999999D),
                        new CelestialBody("Epsilon Gem", 6D, 43D, 2.3999999999999999D, 1, 25D, 8D, 47D, 2.98D, 2.98D),
                        new CelestialBody("30 Gem", 6D, 43D, 10.199999999999999D, 1, 13D, 14D, 36D, 4.4900000000000002D, 4.4900000000000002D),
                        new CelestialBody("Xi Gem", 6D, 44D, 28.5D, 1, 12D, 54D, 43D, 3.3599999999999999D, 3.3599999999999999D),
                        new CelestialBody("Alpha CMa (Sirius)", 6D, 44D, 30.600000000000001D, -1, 16D, 41D, 44D, -1.46D, -1.46D),
                        new CelestialBody("18 Mon", 6D, 47D, 6.2999999999999998D, 1, 2D, 25D, 44D, 4.4699999999999998D, 4.4699999999999998D),
                        new CelestialBody("Alpha Pic", 6D, 48D, 2.6000000000000001D, -1, 61D, 55D, 32D, 3.27D, 3.27D),
                        new CelestialBody("Kappa CMa", 6D, 49D, 17.899999999999999D, -1, 32D, 29D, 28D, 3.96D, 3.96D),
                        new CelestialBody("BS 2554", 6D, 49D, 32.399999999999999D, -1, 53D, 36D, 18D, 4.4000000000000004D, 4.4000000000000004D),
                        new CelestialBody("Tau Pup", 6D, 49D, 34.600000000000001D, -1, 50D, 35D, 50D, 2.9300000000000002D, 2.9300000000000002D),
                        new CelestialBody("Theta Gem", 6D, 51D, 50D, 1, 33D, 58D, 47D, 3.6000000000000001D, 3.6000000000000001D),
                        new CelestialBody("Theta CMa", 6D, 53D, 30.899999999999999D, -1, 12D, 1.0D, 11D, 4.0700000000000003D, 4.0700000000000003D),
                        new CelestialBody("Omikron1 CMa", 6D, 53D, 31.800000000000001D, -1, 24D, 9D, 55D, 3.8599999999999999D, 3.8599999999999999D),
                        new CelestialBody("Iota CMa", 6D, 55D, 29.399999999999999D, -1, 17D, 2D, 5D, 4.3799999999999999D, 4.3799999999999999D),
                        new CelestialBody("15 Lyn", 6D, 56D, 1.3999999999999999D, 1, 58D, 26D, 35D, 4.3499999999999996D, 4.3499999999999996D),
                        new CelestialBody("Epsilon CMa (Adhara)", 6D, 58D, 3.2999999999999998D, -1, 28D, 57D, 6D, 1.5D, 1.5D),
                        new CelestialBody("Sigma CMa", 7D, 1.0D, 8.5D, -1, 27D, 54D, 49D, 3.46D, 3.46D),
                        new CelestialBody("Omikron2 CMa", 7D, 2D, 25.100000000000001D, -1, 23D, 48D, 42D, 3.0299999999999998D, 3.0299999999999998D),
                        new CelestialBody("Gamma CMa", 7D, 3D, 6.0999999999999996D, -1, 15D, 36D, 40D, 4.1100000000000003D, 4.1100000000000003D),
                        new CelestialBody("Zeta Gem", 7D, 3D, 15D, 1, 20D, 35D, 33D, 3.79D, 3.79D),
                        new CelestialBody("Delta CMa (Wezen)", 7D, 7D, 48.100000000000001D, -1, 26D, 22D, 11D, 1.8600000000000001D, 1.8600000000000001D),
                        new CelestialBody("Gamma1 Vol", 7D, 8D, 49.899999999999999D, -1, 70D, 28D, 25D, 3.6200000000000001D, 3.6200000000000001D),
                        new CelestialBody("Gamma2 Vol", 7D, 8D, 52.600000000000001D, -1, 70D, 28D, 32D, 3.5600000000000001D, 3.5600000000000001D),
                        new CelestialBody("Tau Gem", 7D, 10D, 13D, 1, 30D, 16D, 12D, 4.4100000000000001D, 4.4100000000000001D),
                        new CelestialBody("Delta Mon", 7D, 11D, 7.4000000000000004D, -1, 0.0D, 28D, 5D, 4.1500000000000004D, 4.1500000000000004D),
                        new CelestialBody("BS 2740", 7D, 12D, 8.8000000000000007D, -1, 46D, 44D, 5D, 4.4900000000000002D, 4.4900000000000002D),
                        new CelestialBody("Omega CMa", 7D, 14D, 13.4D, -1, 26D, 44D, 49D, 3.8500000000000001D, 3.8500000000000001D),
                        new CelestialBody("Pi Pup", 7D, 16D, 37.799999999999997D, -1, 37D, 4D, 15D, 2.7000000000000002D, 2.7000000000000002D),
                        new CelestialBody("Delta Vol", 7D, 16D, 50.399999999999999D, -1, 67D, 55D, 51D, 3.98D, 3.98D),
                        new CelestialBody("Lambda Gem", 7D, 17D, 15.6D, 1, 16D, 34D, 2D, 3.5800000000000001D, 3.5800000000000001D),
                        new CelestialBody("Tau CMa", 7D, 18D, 6.4000000000000004D, -1, 24D, 55D, 38D, 4.3899999999999997D, 4.3899999999999997D),
                        new CelestialBody("Delta Gem", 7D, 19D, 15.5D, 1, 22D, 0.0D, 36D, 3.5299999999999998D, 3.5299999999999998D),
                        new CelestialBody("Eta CMa", 7D, 23D, 31.300000000000001D, -1, 29D, 16D, 28D, 2.4399999999999999D, 2.4399999999999999D),
                        new CelestialBody("Iota Gem", 7D, 24D, 49.600000000000001D, 1, 27D, 49D, 40D, 3.79D, 3.79D),
                        new CelestialBody("Beta CMi", 7D, 26D, 21.899999999999999D, 1, 8D, 19D, 10D, 2.8999999999999999D, 2.8999999999999999D),
                        new CelestialBody("Gamma CMi", 7D, 27D, 22.399999999999999D, 1, 8D, 57D, 21D, 4.3200000000000003D, 4.3200000000000003D),
                        new CelestialBody("Rho Gem", 7D, 28D, 10.800000000000001D, 1, 31D, 48D, 51D, 4.1799999999999997D, 4.1799999999999997D),
                        new CelestialBody("Sigma Pup", 7D, 28D, 46.200000000000003D, -1, 43D, 16D, 18D, 3.25D, 3.25D),
                        new CelestialBody("BS 2906", 7D, 33D, 25.899999999999999D, -1, 22D, 15D, 51D, 4.4500000000000002D, 4.4500000000000002D),
                        new CelestialBody("Alpha Gem (Castor)", 7D, 33D, 40.5D, 1, 31D, 55D, 16D, 1.99D, 1.99D),
                        new CelestialBody("Alpha Gem", 7D, 33D, 40.5D, 1, 31D, 55D, 16D, 2.8500000000000001D, 2.8500000000000001D),
                        new CelestialBody("Ypsilon Gem", 7D, 35D, 1.8D, 1, 26D, 55D, 44D, 4.0599999999999996D, 4.0599999999999996D),
                        new CelestialBody("BS 2948", 7D, 38D, 13.699999999999999D, -1, 26D, 46D, 6D, 4.5D, 4.5D),
                        new CelestialBody("Alpha CMi (Procyon)", 7D, 38D, 32.600000000000001D, 1, 5D, 15D, 46D, 0.38D, 0.38D),
                        new CelestialBody("Alpha Mon", 7D, 40D, 33.299999999999997D, -1, 9D, 31D, 0.0D, 3.9300000000000002D, 3.9300000000000002D),
                        new CelestialBody("Zeta Vol", 7D, 42D, 0.40000000000000002D, -1, 72D, 34D, 17D, 3.9500000000000002D, 3.9500000000000002D),
                        new CelestialBody("Sigma Gem", 7D, 42D, 24.399999999999999D, 1, 28D, 55D, 10D, 4.2800000000000002D, 4.2800000000000002D),
                        new CelestialBody("3 Pup", 7D, 43D, 13.5D, -1, 28D, 55D, 11D, 3.96D, 3.96D),
                        new CelestialBody("Kappa Gem", 7D, 43D, 34.399999999999999D, 1, 24D, 26D, 1.0D, 3.5699999999999998D, 3.5699999999999998D),
                        new CelestialBody("Beta Gem (Pollux)", 7D, 44D, 25.800000000000001D, 1, 28D, 3D, 43D, 1.1399999999999999D, 1.1399999999999999D),
                        new CelestialBody("BS 3017", 7D, 44D, 44.299999999999997D, -1, 37D, 55D, 59D, 3.5899999999999999D, 3.5899999999999999D),
                        new CelestialBody("Omikron Pup", 7D, 47D, 29D, -1, 25D, 54D, 2D, 4.5D, 4.5D),
                        new CelestialBody("Xi Pup", 7D, 48D, 41D, -1, 24D, 49D, 22D, 3.3399999999999999D, 3.3399999999999999D),
                        new CelestialBody("BS 3055", 7D, 48D, 47.799999999999997D, -1, 46D, 20D, 11D, 4.1100000000000003D, 4.1100000000000003D),
                        new CelestialBody("BS 3080", 7D, 51D, 43.100000000000001D, -1, 40D, 32D, 17D, 3.73D, 3.73D),
                        new CelestialBody("BS 3084", 7D, 52D, 7.7999999999999998D, -1, 38D, 49D, 30D, 4.4900000000000002D, 4.4900000000000002D),
                        new CelestialBody("BS 3090", 7D, 52D, 52.600000000000001D, -1, 48D, 3D, 53D, 4.2400000000000002D, 4.2400000000000002D),
                        new CelestialBody("11 Pup", 7D, 56D, 14.1D, -1, 22D, 50D, 27D, 4.2000000000000002D, 4.2000000000000002D),
                        new CelestialBody("Chi Car", 7D, 56D, 24.600000000000001D, -1, 52D, 56D, 35D, 3.4700000000000002D, 3.4700000000000002D),
                        new CelestialBody("V Pup", 7D, 57D, 49.399999999999999D, -1, 49D, 12D, 19D, 4.4100000000000001D, 4.4100000000000001D),
                        new CelestialBody("BS 3145", 8D, 1.0D, 30.699999999999999D, 1, 2D, 22D, 30D, 4.3899999999999997D, 4.3899999999999997D),
                        new CelestialBody("Zeta Pup", 8D, 3D, 4.5D, -1, 39D, 57D, 43D, 2.25D, 2.25D),
                        new CelestialBody("Rho Pup", 8D, 6D, 55.600000000000001D, -1, 24D, 15D, 43D, 2.8100000000000001D, 2.8100000000000001D),
                        new CelestialBody("Zeta Mon", 8D, 7D, 51.899999999999999D, -1, 2D, 56D, 27D, 4.3399999999999999D, 4.3399999999999999D),
                        new CelestialBody("Epsilon Vol", 8D, 7D, 53.299999999999997D, -1, 68D, 34D, 29D, 4.3499999999999996D, 4.3499999999999996D),
                        new CelestialBody("16 Pup", 8D, 8D, 22.699999999999999D, -1, 19D, 12D, 7D, 4.4000000000000004D, 4.4000000000000004D),
                        new CelestialBody("Gamma1 Vel", 8D, 9D, 2.5D, -1, 47D, 18D, 9D, 4.2699999999999996D, 4.2699999999999996D),
                        new CelestialBody("Gamma2 Vel", 8D, 9D, 5.2000000000000002D, -1, 47D, 17D, 37D, 1.78D, 1.78D),
                        new CelestialBody("BS 3225", 8D, 10D, 50.399999999999999D, -1, 39D, 34D, 30D, 4.4500000000000002D, 4.4500000000000002D),
                        new CelestialBody("BS 3243", 8D, 13D, 32D, -1, 40D, 18D, 12D, 4.4400000000000004D, 4.4400000000000004D),
                        new CelestialBody("Beta Cnc", 8D, 15D, 43.799999999999997D, 1, 9D, 13D, 51D, 3.52D, 3.52D),
                        new CelestialBody("BS 3270", 8D, 18D, 0.69999999999999996D, -1, 36D, 36D, 50D, 4.4500000000000002D, 4.4500000000000002D),
                        new CelestialBody("Alpha Cha", 8D, 18D, 55.100000000000001D, -1, 76D, 52D, 27D, 4.0700000000000003D, 4.0700000000000003D),
                        new CelestialBody("Theta Cha", 8D, 21D, 5.7999999999999998D, -1, 77D, 26D, 17D, 4.3499999999999996D, 4.3499999999999996D),
                        new CelestialBody("31 Lyn", 8D, 21D, 50.799999999999997D, 1, 43D, 14D, 8D, 4.25D, 4.25D),
                        new CelestialBody("Epsilon Car", 8D, 22D, 13.1D, -1, 59D, 27D, 45D, 1.8600000000000001D, 1.8600000000000001D),
                        new CelestialBody("BS 3314", 8D, 24D, 56.200000000000003D, -1, 3D, 51D, 31D, 3.8999999999999999D, 3.8999999999999999D),
                        new CelestialBody("Beta Vol", 8D, 25D, 35D, -1, 66D, 5D, 19D, 3.77D, 3.77D),
                        new CelestialBody("Omikron UMa", 8D, 29D, 4.0999999999999996D, 1, 60D, 46D, 4D, 3.3599999999999999D, 3.3599999999999999D),
                        new CelestialBody("Delta Hya", 8D, 36D, 53.299999999999997D, 1, 5D, 45D, 18D, 4.1600000000000001D, 4.1600000000000001D),
                        new CelestialBody("BS 3426", 8D, 37D, 8D, -1, 42D, 56D, 17D, 4.1399999999999997D, 4.1399999999999997D),
                        new CelestialBody("Sigma Hya", 8D, 38D, 0.0D, 1, 3D, 23D, 35D, 4.4400000000000004D, 4.4400000000000004D),
                        new CelestialBody("Beta Pyx", 8D, 39D, 32.100000000000001D, -1, 35D, 15D, 23D, 3.9700000000000002D, 3.9700000000000002D),
                        new CelestialBody("Omikron Vel", 8D, 39D, 52.700000000000003D, -1, 52D, 52D, 12D, 3.6200000000000001D, 3.6200000000000001D),
                        new CelestialBody("BS 3445", 8D, 40D, 8.6999999999999993D, -1, 46D, 35D, 48D, 3.8399999999999999D, 3.8399999999999999D),
                        new CelestialBody("BS 3457", 8D, 40D, 17.899999999999999D, -1, 59D, 42D, 33D, 4.3300000000000001D, 4.3300000000000001D),
                        new CelestialBody("Eta Hya", 8D, 42D, 28D, 1, 3D, 27D, 5D, 4.2999999999999998D, 4.2999999999999998D),
                        new CelestialBody("Alpha Pyx", 8D, 43D, 0.5D, -1, 33D, 8D, 1.0D, 3.6800000000000002D, 3.6800000000000002D),
                        new CelestialBody("Delta Cnc", 8D, 43D, 51.700000000000003D, 1, 18D, 12D, 30D, 3.9399999999999999D, 3.9399999999999999D),
                        new CelestialBody("BS 3477", 8D, 43D, 52.899999999999999D, -1, 42D, 35D, 47D, 4.0499999999999998D, 4.0499999999999998D),
                        new CelestialBody("Delta Vel", 8D, 44D, 18.199999999999999D, -1, 54D, 39D, 18D, 1.96D, 1.96D),
                        new CelestialBody("BS 3487", 8D, 45D, 32.200000000000003D, -1, 45D, 59D, 18D, 3.9100000000000001D, 3.9100000000000001D),
                        new CelestialBody("12 Hya", 8D, 45D, 41.399999999999999D, -1, 13D, 29D, 39D, 4.3200000000000003D, 4.3200000000000003D),
                        new CelestialBody("Iota Cnc", 8D, 45D, 49.299999999999997D, 1, 28D, 48D, 49D, 4.0199999999999996D, 4.0199999999999996D),
                        new CelestialBody("Epsilon Hya", 8D, 46D, 0.5D, 1, 6D, 28D, 21D, 3.3799999999999999D, 3.3799999999999999D),
                        new CelestialBody("BS 3498", 8D, 46D, 20.199999999999999D, -1, 56D, 42D, 58D, 4.4900000000000002D, 4.4900000000000002D),
                        new CelestialBody("Rho Hya", 8D, 47D, 39.899999999999999D, 1, 5D, 53D, 31D, 4.3600000000000003D, 4.3600000000000003D),
                        new CelestialBody("Gamma Pyx", 8D, 49D, 55D, -1, 27D, 39D, 20D, 4.0099999999999998D, 4.0099999999999998D),
                        new CelestialBody("Zeta Hya", 8D, 54D, 37.700000000000003D, 1, 6D, 0.0D, 5D, 3.1099999999999999D, 3.1099999999999999D),
                        new CelestialBody("BS 3571", 8D, 54D, 43.200000000000003D, -1, 60D, 35D, 20D, 3.8399999999999999D, 3.8399999999999999D),
                        new CelestialBody("Alpha Cnc", 8D, 57D, 41.700000000000003D, 1, 11D, 54D, 52D, 4.25D, 4.25D),
                        new CelestialBody("Iota UMa", 8D, 58D, 13.199999999999999D, 1, 48D, 5D, 57D, 3.1400000000000001D, 3.1400000000000001D),
                        new CelestialBody("BS 3591", 8D, 59D, 32.899999999999999D, -1, 41D, 11D, 49D, 4.4500000000000002D, 4.4500000000000002D),
                        new CelestialBody("BS 3579", 8D, 59D, 42.100000000000001D, 1, 41D, 50D, 27D, 3.9700000000000002D, 3.9700000000000002D),
                        new CelestialBody("Alpha Vol", 9D, 2D, 13.300000000000001D, -1, 66D, 20D, 17D, 4D, 4D),
                        new CelestialBody("Kappa UMa", 9D, 2D, 38.399999999999999D, 1, 47D, 12D, 53D, 3.6000000000000001D, 3.6000000000000001D),
                        new CelestialBody("BS 3614", 9D, 3D, 39.200000000000003D, -1, 47D, 2D, 23D, 3.75D, 3.75D),
                        new CelestialBody("BS 3643", 9D, 5D, 7.2999999999999998D, -1, 72D, 32D, 40D, 4.4800000000000004D, 4.4800000000000004D),
                        new CelestialBody("Lambda Vel", 9D, 7D, 27.699999999999999D, -1, 43D, 22D, 25D, 2.21D, 2.21D),
                        new CelestialBody("15 UMa", 9D, 7D, 51.200000000000003D, 1, 51D, 39D, 50D, 4.4800000000000004D, 4.4800000000000004D),
                        new CelestialBody("a Car", 9D, 10D, 35.100000000000001D, -1, 58D, 54D, 27D, 3.4399999999999999D, 3.4399999999999999D),
                        new CelestialBody("BS 3663", 9D, 10D, 57D, -1, 62D, 15D, 27D, 3.9700000000000002D, 3.9700000000000002D),
                        new CelestialBody("Beta Car (Miaplacidus)", 9D, 13D, 2.7999999999999998D, -1, 69D, 39D, 27D, 1.6799999999999999D, 1.6799999999999999D),
                        new CelestialBody("Theta Hya", 9D, 13D, 36.600000000000001D, 1, 2D, 22D, 33D, 3.8799999999999999D, 3.8799999999999999D),
                        new CelestialBody("BS 3696", 9D, 15D, 47.600000000000001D, -1, 57D, 28D, 49D, 4.3399999999999999D, 4.3399999999999999D),
                        new CelestialBody("Iota Car", 9D, 16D, 42.100000000000001D, -1, 59D, 12D, 51D, 2.25D, 2.25D),
                        new CelestialBody("38 Lyn", 9D, 17D, 56.700000000000003D, 1, 36D, 51D, 53D, 3.8199999999999998D, 3.8199999999999998D),
                        new CelestialBody("Alpha Lyn", 9D, 20D, 10.5D, 1, 34D, 27D, 16D, 3.1299999999999999D, 3.1299999999999999D),
                        new CelestialBody("Kappa Vel", 9D, 21D, 39.899999999999999D, -1, 54D, 56D, 54D, 2.5D, 2.5D),
                        new CelestialBody("Kappa Leo", 9D, 23D, 48.700000000000003D, 1, 26D, 14D, 43D, 4.46D, 4.46D),
                        new CelestialBody("Alpha Hya (Alphard)", 9D, 26D, 52.5D, -1, 8D, 35D, 43D, 1.98D, 1.98D),
                        new CelestialBody("Psi Vel", 9D, 30D, 7.7000000000000002D, -1, 40D, 24D, 10D, 3.6000000000000001D, 3.6000000000000001D),
                        new CelestialBody("23 UMa", 9D, 30D, 23.800000000000001D, 1, 63D, 7D, 34D, 3.6699999999999999D, 3.6699999999999999D),
                        new CelestialBody("N Vel", 9D, 30D, 46.799999999999997D, -1, 56D, 58D, 13D, 3.1299999999999999D, 3.1299999999999999D),
                        new CelestialBody("Lambda Leo", 9D, 30D, 53.700000000000003D, 1, 23D, 1.0D, 57D, 4.3099999999999996D, 4.3099999999999996D),
                        new CelestialBody("R Car", 9D, 31D, 52.799999999999997D, -1, 62D, 43D, 28D, 4D, 4D),
                        new CelestialBody("Theta UMa", 9D, 31D, 53.600000000000001D, 1, 51D, 44D, 39D, 3.1699999999999999D, 3.1699999999999999D),
                        new CelestialBody("26 UMa", 9D, 33D, 50.200000000000003D, 1, 52D, 7D, 0.0D, 4.5D, 4.5D),
                        new CelestialBody("BS 3825", 9D, 34D, 1.3999999999999999D, -1, 59D, 9D, 53D, 4.0800000000000001D, 4.0800000000000001D),
                        new CelestialBody("BS 3751", 9D, 35D, 5.7999999999999998D, 1, 81D, 23D, 31D, 4.29D, 4.29D),
                        new CelestialBody("BS 3836", 9D, 36D, 18.5D, -1, 49D, 17D, 23D, 4.3499999999999996D, 4.3499999999999996D),
                        new CelestialBody("Iota Hya", 9D, 39D, 6.9000000000000004D, -1, 1.0D, 4D, 36D, 3.9100000000000001D, 3.9100000000000001D),
                        new CelestialBody("Omikron Leo", 9D, 40D, 22.699999999999999D, 1, 9D, 57D, 32D, 3.52D, 3.52D),
                        new CelestialBody("l Car", 9D, 44D, 50.899999999999999D, -1, 62D, 26D, 27D, 3.3999999999999999D, 3.3999999999999999D),
                        new CelestialBody("Epsilon Leo", 9D, 45D, 1.8D, 1, 23D, 50D, 29D, 2.98D, 2.98D),
                        new CelestialBody("Ypsilon Car", 9D, 46D, 44.399999999999999D, -1, 65D, 0.0D, 16D, 2.9700000000000002D, 2.9700000000000002D),
                        new CelestialBody("R Leo", 9D, 46D, 46.799999999999997D, 1, 11D, 29D, 47D, 4.4000000000000004D, 4.4000000000000004D),
                        new CelestialBody("Ypsilon UMa", 9D, 49D, 58D, 1, 59D, 6D, 27D, 3.7999999999999998D, 3.7999999999999998D),
                        new CelestialBody("Ypsilon1 Hya", 9D, 50D, 46.799999999999997D, -1, 14D, 46D, 42D, 4.1200000000000001D, 4.1200000000000001D),
                        new CelestialBody("My Leo", 9D, 51D, 56.5D, 1, 26D, 4D, 33D, 3.8799999999999999D, 3.8799999999999999D),
                        new CelestialBody("Phi Vel", 9D, 56D, 21.100000000000001D, -1, 54D, 29D, 54D, 3.54D, 3.54D),
                        new CelestialBody("Eta Leo", 10D, 6D, 32.600000000000001D, 1, 16D, 50D, 1.0D, 3.52D, 3.52D),
                        new CelestialBody("21 LMi", 10D, 6D, 34.600000000000001D, 1, 35D, 18D, 57D, 4.4800000000000004D, 4.4800000000000004D),
                        new CelestialBody("31 Leo", 10D, 7D, 8.0999999999999996D, 1, 10D, 4D, 9D, 4.3700000000000001D, 4.3700000000000001D),
                        new CelestialBody("Alpha Sex", 10D, 7D, 11.800000000000001D, -1, 0.0D, 18D, 2D, 4.4900000000000002D, 4.4900000000000002D),
                        new CelestialBody("Alpha Leo (Regulus)", 10D, 7D, 36D, 1, 12D, 2D, 19D, 1.3500000000000001D, 1.3500000000000001D),
                        new CelestialBody("Lambda Hya", 10D, 9D, 52.799999999999997D, -1, 12D, 16D, 56D, 3.6099999999999999D, 3.6099999999999999D),
                        new CelestialBody("Omega Car", 10D, 13D, 23.699999999999999D, -1, 69D, 57D, 57D, 3.3199999999999998D, 3.3199999999999998D),
                        new CelestialBody("BS 4023", 10D, 14D, 7.5D, -1, 42D, 3D, 0.0D, 3.8500000000000001D, 3.8500000000000001D),
                        new CelestialBody("Zeta Leo", 10D, 15D, 53.100000000000001D, 1, 23D, 29D, 24D, 3.4399999999999999D, 3.4399999999999999D),
                        new CelestialBody("Lambda UMa", 10D, 16D, 13.6D, 1, 42D, 59D, 14D, 3.4500000000000002D, 3.4500000000000002D),
                        new CelestialBody("BS 4050", 10D, 16D, 35.799999999999997D, -1, 61D, 15D, 35D, 3.3999999999999999D, 3.3999999999999999D),
                        new CelestialBody("Gamma1 Leo (Algieba)", 10D, 19D, 10.5D, 1, 19D, 54D, 55D, 2.6099999999999999D, 2.6099999999999999D),
                        new CelestialBody("Gamma2 Leo", 10D, 19D, 10.800000000000001D, 1, 19D, 54D, 51D, 3.7999999999999998D, 3.7999999999999998D),
                        new CelestialBody("BS 4074", 10D, 20D, 22.300000000000001D, -1, 55D, 58D, 12D, 4.5D, 4.5D),
                        new CelestialBody("My UMa", 10D, 21D, 28.100000000000001D, 1, 41D, 34D, 22D, 3.0499999999999998D, 3.0499999999999998D),
                        new CelestialBody("BS 4102", 10D, 24D, 6.5999999999999996D, -1, 73D, 57D, 28D, 4D, 4D),
                        new CelestialBody("My Hya", 10D, 25D, 23.300000000000001D, -1, 16D, 45D, 43D, 3.8100000000000001D, 3.8100000000000001D),
                        new CelestialBody("Alpha Ant", 10D, 26D, 29.199999999999999D, -1, 30D, 59D, 37D, 4.25D, 4.25D),
                        new CelestialBody("Beta LMi", 10D, 27D, 2.8999999999999999D, 1, 36D, 46D, 55D, 4.21D, 4.21D),
                        new CelestialBody("BS 4114", 10D, 27D, 20.699999999999999D, -1, 58D, 39D, 55D, 3.8199999999999998D, 3.8199999999999998D),
                        new CelestialBody("BS 4140", 10D, 31D, 30.399999999999999D, -1, 61D, 36D, 38D, 3.3199999999999998D, 3.3199999999999998D),
                        new CelestialBody("Rho Leo", 10D, 32D, 2.8999999999999999D, 1, 9D, 22D, 53D, 3.8500000000000001D, 3.8500000000000001D),
                        new CelestialBody("BS 4159", 10D, 35D, 1.7D, -1, 57D, 28D, 57D, 4.4500000000000002D, 4.4500000000000002D),
                        new CelestialBody("Gamma Cha", 10D, 35D, 18.300000000000001D, -1, 78D, 31D, 57D, 4.1100000000000003D, 4.1100000000000003D),
                        new CelestialBody("BS 4167", 10D, 36D, 41.399999999999999D, -1, 48D, 9D, 1.0D, 3.8399999999999999D, 3.8399999999999999D),
                        new CelestialBody("BS 4180", 10D, 38D, 43.600000000000001D, -1, 55D, 31D, 39D, 4.2800000000000002D, 4.2800000000000002D),
                        new CelestialBody("Theta Car", 10D, 42D, 26.199999999999999D, -1, 64D, 19D, 6D, 2.7599999999999998D, 2.7599999999999998D),
                        new CelestialBody("Delta2 Cha", 10D, 45D, 39.200000000000003D, -1, 80D, 27D, 49D, 4.4500000000000002D, 4.4500000000000002D),
                        new CelestialBody("My Vel", 10D, 46D, 8.5999999999999996D, -1, 49D, 20D, 36D, 2.6899999999999999D, 2.6899999999999999D),
                        new CelestialBody("Ny Hya", 10D, 48D, 54.5D, -1, 16D, 7D, 3D, 3.1099999999999999D, 3.1099999999999999D),
                        new CelestialBody("46 LMi", 10D, 52D, 30.199999999999999D, 1, 34D, 17D, 36D, 3.8300000000000001D, 3.8300000000000001D),
                        new CelestialBody("BS 4257", 10D, 52D, 54.100000000000001D, -1, 58D, 46D, 34D, 3.7799999999999998D, 3.7799999999999998D),
                        new CelestialBody("54 Leo", 10D, 54D, 49.799999999999997D, 1, 24D, 49D, 38D, 4.3200000000000003D, 4.3200000000000003D),
                        new CelestialBody("Alpha Crt", 10D, 59D, 4D, -1, 18D, 13D, 17D, 4.0800000000000001D, 4.0800000000000001D),
                        new CelestialBody("BS 4293", 10D, 59D, 29.199999999999999D, -1, 42D, 8D, 53D, 4.3899999999999997D, 4.3899999999999997D),
                        new CelestialBody("Beta UMa (Merak)", 11D, 0.0D, 58.399999999999999D, 1, 56D, 27D, 37D, 2.3700000000000001D, 2.3700000000000001D),
                        new CelestialBody("60 Leo", 11D, 1.0D, 33.399999999999999D, 1, 20D, 15D, 28D, 4.4199999999999999D, 4.4199999999999999D),
                        new CelestialBody("Alpha UMa (Dubhe)", 11D, 2D, 50.5D, 1, 61D, 49D, 46D, 1.79D, 1.79D),
                        new CelestialBody("BS 4337", 11D, 7D, 58D, -1, 58D, 53D, 47D, 3.9100000000000001D, 3.9100000000000001D),
                        new CelestialBody("Psi UMa", 11D, 8D, 51.100000000000001D, 1, 44D, 34D, 39D, 3.0099999999999998D, 3.0099999999999998D),
                        new CelestialBody("Beta Crt", 11D, 10D, 56.600000000000001D, -1, 22D, 44D, 47D, 4.4800000000000004D, 4.4800000000000004D),
                        new CelestialBody("Delta Leo", 11D, 13D, 20.300000000000001D, 1, 20D, 36D, 12D, 2.5600000000000001D, 2.5600000000000001D),
                        new CelestialBody("Theta Leo", 11D, 13D, 28.800000000000001D, 1, 15D, 30D, 32D, 3.3399999999999999D, 3.3399999999999999D),
                        new CelestialBody("Phi Leo", 11D, 15D, 55.399999999999999D, -1, 3D, 34D, 20D, 4.4699999999999998D, 4.4699999999999998D),
                        new CelestialBody("Xi UMa", 11D, 17D, 24.699999999999999D, 1, 31D, 36D, 39D, 3.79D, 3.79D),
                        new CelestialBody("Ny UMa", 11D, 17D, 41.899999999999999D, 1, 33D, 10D, 25D, 3.48D, 3.48D),
                        new CelestialBody("Delta Crt", 11D, 18D, 36.899999999999999D, -1, 14D, 42D, 0.0D, 3.5600000000000001D, 3.5600000000000001D),
                        new CelestialBody("Pi Cen", 11D, 20D, 20.600000000000001D, -1, 54D, 24D, 41D, 3.8900000000000001D, 3.8900000000000001D),
                        new CelestialBody("Sigma Leo", 11D, 20D, 23.300000000000001D, 1, 6D, 6D, 32D, 4.0499999999999998D, 4.0499999999999998D),
                        new CelestialBody("Iota Leo", 11D, 23D, 10.199999999999999D, 1, 10D, 36D, 33D, 3.9399999999999999D, 3.9399999999999999D),
                        new CelestialBody("Gamma Crt", 11D, 24D, 9.4000000000000004D, -1, 17D, 36D, 15D, 4.0800000000000001D, 4.0800000000000001D),
                        new CelestialBody("Lambda Dra", 11D, 30D, 33.299999999999997D, 1, 69D, 24D, 41D, 3.8399999999999999D, 3.8399999999999999D),
                        new CelestialBody("Xi Hya", 11D, 32D, 17.199999999999999D, -1, 31D, 46D, 38D, 3.54D, 3.54D),
                        new CelestialBody("Lambda Cen", 11D, 35D, 6.4000000000000004D, -1, 62D, 56D, 22D, 3.1299999999999999D, 3.1299999999999999D),
                        new CelestialBody("Ypsilon Leo", 11D, 36D, 12.4D, -1, 0.0D, 44D, 37D, 4.2999999999999998D, 4.2999999999999998D),
                        new CelestialBody("Lambda Mus", 11D, 44D, 55D, -1, 66D, 38D, 54D, 3.6400000000000001D, 3.6400000000000001D),
                        new CelestialBody("Ny Vir", 11D, 45D, 6.7999999999999998D, 1, 6D, 36D, 38D, 4.0300000000000002D, 4.0300000000000002D),
                        new CelestialBody("Chi UMa", 11D, 45D, 17.300000000000001D, 1, 47D, 51D, 36D, 3.71D, 3.71D),
                        new CelestialBody("BS 4522", 11D, 45D, 48.399999999999999D, -1, 61D, 5D, 52D, 4.1100000000000003D, 4.1100000000000003D),
                        new CelestialBody("Beta Leo (Denebola)", 11D, 48D, 19.199999999999999D, 1, 14D, 39D, 11D, 2.1400000000000001D, 2.1400000000000001D),
                        new CelestialBody("BS 4537", 11D, 48D, 58.399999999999999D, -1, 63D, 42D, 28D, 4.3200000000000003D, 4.3200000000000003D),
                        new CelestialBody("Beta Vir", 11D, 49D, 56.399999999999999D, 1, 1.0D, 50D, 47D, 3.6099999999999999D, 3.6099999999999999D),
                        new CelestialBody("BS 4546", 11D, 50D, 24.899999999999999D, -1, 45D, 5D, 35D, 4.46D, 4.46D),
                        new CelestialBody("Beta Hya", 11D, 52D, 10.5D, -1, 33D, 49D, 38D, 4.2800000000000002D, 4.2800000000000002D),
                        new CelestialBody("Gamma UMa (Phekda)", 11D, 53D, 4.2999999999999998D, 1, 53D, 46D, 31D, 2.4399999999999999D, 2.4399999999999999D),
                        new CelestialBody("Theta1 Cru", 12D, 2D, 16.899999999999999D, -1, 63D, 13D, 56D, 4.3300000000000001D, 4.3300000000000001D),
                        new CelestialBody("Omikron Vir", 12D, 4D, 28.199999999999999D, 1, 8D, 48D, 49D, 4.1200000000000001D, 4.1200000000000001D),
                        new CelestialBody("Eta Cru", 12D, 6D, 7.0999999999999996D, -1, 64D, 31D, 58D, 4.1500000000000004D, 4.1500000000000004D),
                        new CelestialBody("BS 4618", 12D, 7D, 19.899999999999999D, -1, 50D, 34D, 50D, 4.4699999999999998D, 4.4699999999999998D),
                        new CelestialBody("Delta Cen", 12D, 7D, 36.200000000000003D, -1, 50D, 38D, 30D, 2.6000000000000001D, 2.6000000000000001D),
                        new CelestialBody("Alpha Crv", 12D, 7D, 39.799999999999997D, -1, 24D, 38D, 53D, 4.0199999999999996D, 4.0199999999999996D),
                        new CelestialBody("Epsilon Crv", 12D, 9D, 22.600000000000001D, -1, 22D, 32D, 21D, 3D, 3D),
                        new CelestialBody("Rho Cen", 12D, 10D, 53.399999999999999D, -1, 52D, 17D, 16D, 3.96D, 3.96D),
                        new CelestialBody("Delta Cru", 12D, 14D, 22.100000000000001D, -1, 58D, 40D, 6D, 2.7999999999999998D, 2.7999999999999998D),
                        new CelestialBody("Delta UMa (Megrez)", 12D, 14D, 42.799999999999997D, 1, 57D, 6D, 47D, 3.3100000000000001D, 3.3100000000000001D),
                        new CelestialBody("Gamma Crv", 12D, 15D, 3.5D, -1, 17D, 27D, 41D, 2.5899999999999999D, 2.5899999999999999D),
                        new CelestialBody("Epsilon Mus", 12D, 16D, 46.700000000000003D, -1, 67D, 52D, 49D, 4.1100000000000003D, 4.1100000000000003D),
                        new CelestialBody("Beta Cha", 12D, 17D, 28.399999999999999D, -1, 79D, 13D, 54D, 4.2599999999999998D, 4.2599999999999998D),
                        new CelestialBody("Zeta Cru", 12D, 17D, 38.600000000000001D, -1, 63D, 55D, 21D, 4.04D, 4.04D),
                        new CelestialBody("Eta Vir", 12D, 19D, 9.8000000000000007D, -1, 0.0D, 35D, 11D, 3.8900000000000001D, 3.8900000000000001D),
                        new CelestialBody("Epsilon Cru", 12D, 20D, 34.200000000000003D, -1, 60D, 19D, 16D, 3.5899999999999999D, 3.5899999999999999D),
                        new CelestialBody("Alpha1 Cru (Acrux)", 12D, 25D, 47.100000000000001D, -1, 63D, 1.0D, 8D, 1.5800000000000001D, 1.5800000000000001D),
                        new CelestialBody("Alpha2 Cru", 12D, 25D, 47.700000000000003D, -1, 63D, 1.0D, 10D, 2.0899999999999999D, 2.0899999999999999D),
                        new CelestialBody("Gamma Com", 12D, 26D, 13D, 1, 28D, 20D, 56D, 4.3499999999999996D, 4.3499999999999996D),
                        new CelestialBody("Sigma Cen", 12D, 27D, 15.1D, -1, 50D, 9D, 2D, 3.9100000000000001D, 3.9100000000000001D),
                        new CelestialBody("Delta Crv (Algorab)", 12D, 29D, 6.7000000000000002D, -1, 16D, 26D, 5D, 2.9500000000000002D, 2.9500000000000002D),
                        new CelestialBody("Gamma Cru", 12D, 30D, 21.300000000000001D, -1, 57D, 1.0D, 56D, 1.6299999999999999D, 1.6299999999999999D),
                        new CelestialBody("Eta Crv", 12D, 31D, 19.300000000000001D, -1, 16D, 6D, 58D, 4.3099999999999996D, 4.3099999999999996D),
                        new CelestialBody("Gamma Mus", 12D, 31D, 35.299999999999997D, -1, 72D, 3D, 11D, 3.8700000000000001D, 3.8700000000000001D),
                        new CelestialBody("Kappa Dra", 12D, 32D, 52.100000000000001D, 1, 69D, 52D, 5D, 3.8700000000000001D, 3.8700000000000001D),
                        new CelestialBody("Beta CVn", 12D, 33D, 3.2999999999999998D, 1, 41D, 26D, 10D, 4.2599999999999998D, 4.2599999999999998D),
                        new CelestialBody("Beta Crv", 12D, 33D, 37.399999999999999D, -1, 23D, 19D, 0.0D, 2.6499999999999999D, 2.6499999999999999D),
                        new CelestialBody("Alpha Mus", 12D, 36D, 18.5D, -1, 69D, 3D, 21D, 2.6899999999999999D, 2.6899999999999999D),
                        new CelestialBody("Tau Cen", 12D, 36D, 54.299999999999997D, -1, 48D, 27D, 42D, 3.8599999999999999D, 3.8599999999999999D),
                        new CelestialBody("Gamma Cen", 12D, 40D, 42.700000000000003D, -1, 48D, 52D, 49D, 2.1699999999999999D, 2.1699999999999999D),
                        new CelestialBody("Gamma Vir", 12D, 40D, 55.5D, -1, 1.0D, 22D, 12D, 2.75D, 2.75D),
                        new CelestialBody("Gamma Vir", 12D, 40D, 55.5D, -1, 1.0D, 22D, 12D, 3.6800000000000002D, 3.6800000000000002D),
                        new CelestialBody("Beta Mus", 12D, 45D, 22.899999999999999D, -1, 68D, 1.0D, 45D, 3.0499999999999998D, 3.0499999999999998D),
                        new CelestialBody("Beta Cru", 12D, 46D, 52D, -1, 59D, 36D, 35D, 1.25D, 1.25D),
                        new CelestialBody("BS 4888", 12D, 52D, 17.300000000000001D, -1, 48D, 51D, 52D, 4.3300000000000001D, 4.3300000000000001D),
                        new CelestialBody("BS 4889", 12D, 52D, 37.799999999999997D, -1, 40D, 6D, 1.0D, 4.2699999999999996D, 4.2699999999999996D),
                        new CelestialBody("Epsilon UMa (Alioth)", 12D, 53D, 23.600000000000001D, 1, 56D, 2D, 18D, 1.77D, 1.77D),
                        new CelestialBody("My1 Cru", 12D, 53D, 44.100000000000001D, -1, 57D, 5D, 57D, 4.0300000000000002D, 4.0300000000000002D),
                        new CelestialBody("Delta Vir", 12D, 54D, 52.399999999999999D, 1, 3D, 28D, 34D, 3.3799999999999999D, 3.3799999999999999D),
                        new CelestialBody("Alpha2 CVn", 12D, 55D, 21.100000000000001D, 1, 38D, 23D, 48D, 2.8999999999999999D, 2.8999999999999999D),
                        new CelestialBody("Delta Mus", 13D, 1.0D, 15.6D, -1, 71D, 28D, 16D, 3.6200000000000001D, 3.6200000000000001D),
                        new CelestialBody("Epsilon Vir (Vindemiatrix)", 13D, 1.0D, 27.300000000000001D, 1, 11D, 2D, 13D, 2.8300000000000001D, 2.8300000000000001D),
                        new CelestialBody("Xi2 Cen", 13D, 6D, 3.5D, -1, 49D, 49D, 44D, 4.2699999999999996D, 4.2699999999999996D),
                        new CelestialBody("Theta Vir", 13D, 9D, 11.9D, -1, 5D, 27D, 43D, 4.3799999999999999D, 4.3799999999999999D),
                        new CelestialBody("Beta Com", 13D, 11D, 11.800000000000001D, 1, 27D, 57D, 5D, 4.2599999999999998D, 4.2599999999999998D),
                        new CelestialBody("Gamma Hya", 13D, 18D, 7.9000000000000004D, -1, 23D, 5D, 43D, 3D, 3D),
                        new CelestialBody("Iota Cen", 13D, 19D, 46.700000000000003D, -1, 36D, 38D, 10D, 2.75D, 2.75D),
                        new CelestialBody("Zeta UMa (Mizar)", 13D, 23D, 20.600000000000001D, 1, 55D, 0.0D, 3D, 2.0499999999999998D, 2.0499999999999998D),
                        new CelestialBody("Zeta UMa (Mizar)", 13D, 23D, 21.5D, 1, 54D, 59D, 50D, 3.9500000000000002D, 3.9500000000000002D),
                        new CelestialBody("Alpha Vir (Spica)", 13D, 24D, 25.699999999999999D, -1, 11D, 5D, 9D, 0.96999999999999997D, 0.96999999999999997D),
                        new CelestialBody("80 UMa", 13D, 24D, 38.700000000000003D, 1, 55D, 3D, 48D, 4.0099999999999998D, 4.0099999999999998D),
                        new CelestialBody("BS 5089", 13D, 30D, 12D, -1, 39D, 19D, 58D, 3.8799999999999999D, 3.8799999999999999D),
                        new CelestialBody("Zeta Vir", 13D, 33D, 57.200000000000003D, -1, 0.0D, 31D, 20D, 3.3700000000000001D, 3.3700000000000001D),
                        new CelestialBody("Epsilon Cen", 13D, 38D, 57.799999999999997D, -1, 53D, 23D, 35D, 2.2999999999999998D, 2.2999999999999998D),
                        new CelestialBody("1 Cen", 13D, 44D, 51.600000000000001D, -1, 32D, 58D, 15D, 4.2300000000000004D, 4.2300000000000004D),
                        new CelestialBody("Tau Boo", 13D, 46D, 34.399999999999999D, 1, 17D, 31D, 43D, 4.5D, 4.5D),
                        new CelestialBody("Eta UMa (Benetnasch)", 13D, 46D, 58.200000000000003D, 1, 49D, 23D, 8D, 1.8600000000000001D, 1.8600000000000001D),
                        new CelestialBody("2 Cen", 13D, 48D, 36.100000000000001D, -1, 34D, 22D, 44D, 4.1900000000000004D, 4.1900000000000004D),
                        new CelestialBody("Ny Cen", 13D, 48D, 37.799999999999997D, -1, 41D, 36D, 57D, 3.4100000000000001D, 3.4100000000000001D),
                        new CelestialBody("My Cen", 13D, 48D, 44.299999999999997D, -1, 42D, 24D, 7D, 3.04D, 3.04D),
                        new CelestialBody("Ypsilon Boo", 13D, 48D, 46.700000000000003D, 1, 15D, 52D, 10D, 4.0599999999999996D, 4.0599999999999996D),
                        new CelestialBody("Eta Boo", 13D, 53D, 59.799999999999997D, 1, 18D, 28D, 12D, 2.6800000000000002D, 2.6800000000000002D),
                        new CelestialBody("Zeta Cen", 13D, 54D, 37.799999999999997D, -1, 47D, 13D, 3D, 2.5499999999999998D, 2.5499999999999998D),
                        new CelestialBody("Phi Cen", 13D, 57D, 23.100000000000001D, -1, 42D, 1.0D, 50D, 3.8300000000000001D, 3.8300000000000001D),
                        new CelestialBody("Ypsilon1 Cen", 13D, 57D, 46.700000000000003D, -1, 44D, 44D, 0.0D, 3.8700000000000001D, 3.8700000000000001D),
                        new CelestialBody("Ypsilon2 Cen", 14D, 0.0D, 48.899999999999999D, -1, 45D, 32D, 1.0D, 4.3399999999999999D, 4.3399999999999999D),
                        new CelestialBody("Tau Vir", 14D, 0.0D, 54.5D, 1, 1.0D, 36D, 52D, 4.2599999999999998D, 4.2599999999999998D),
                        new CelestialBody("Beta Cen (Agena)", 14D, 2D, 47.5D, -1, 60D, 18D, 13D, 0.60999999999999999D, 0.60999999999999999D),
                        new CelestialBody("Alpha Dra", 14D, 3D, 59.700000000000003D, 1, 64D, 26D, 42D, 3.6499999999999999D, 3.6499999999999999D),
                        new CelestialBody("Chi Cen", 14D, 5D, 9.4000000000000004D, -1, 41D, 6D, 38D, 4.3600000000000003D, 4.3600000000000003D),
                        new CelestialBody("Pi Hya", 14D, 5D, 32.600000000000001D, -1, 26D, 36D, 47D, 3.27D, 3.27D),
                        new CelestialBody("Theta Cen", 14D, 5D, 49.5D, -1, 36D, 17D, 57D, 2.0600000000000001D, 2.0600000000000001D),
                        new CelestialBody("Kappa Vir", 14D, 12D, 7.2000000000000002D, -1, 10D, 12D, 24D, 4.1900000000000004D, 4.1900000000000004D),
                        new CelestialBody("Alpha Boo (Arcturus)", 14D, 14D, 60D, 1, 19D, 15D, 27D, -0.040000000000000001D, -0.040000000000000001D),
                        new CelestialBody("Iota Vir", 14D, 15D, 15.199999999999999D, -1, 5D, 55D, 54D, 4.0800000000000001D, 4.0800000000000001D),
                        new CelestialBody("Lambda Boo", 14D, 15D, 50D, 1, 46D, 9D, 17D, 4.1799999999999997D, 4.1799999999999997D),
                        new CelestialBody("Iota Lup", 14D, 18D, 28.199999999999999D, -1, 45D, 59D, 30D, 3.5499999999999998D, 3.5499999999999998D),
                        new CelestialBody("BS 5358", 14D, 19D, 18.300000000000001D, -1, 56D, 19D, 14D, 4.3300000000000001D, 4.3300000000000001D),
                        new CelestialBody("Psi Cen", 14D, 19D, 40.200000000000003D, -1, 37D, 49D, 9D, 4.0499999999999998D, 4.0499999999999998D),
                        new CelestialBody("BS 5378", 14D, 22D, 8.4000000000000004D, -1, 39D, 26D, 47D, 4.4199999999999999D, 4.4199999999999999D),
                        new CelestialBody("Delta Oct", 14D, 24D, 28.199999999999999D, -1, 83D, 36D, 10D, 4.3200000000000003D, 4.3200000000000003D),
                        new CelestialBody("Theta Boo", 14D, 24D, 42.200000000000003D, 1, 51D, 55D, 3D, 4.0499999999999998D, 4.0499999999999998D),
                        new CelestialBody("Tau2 Lup", 14D, 25D, 14.6D, -1, 45D, 18D, 52D, 4.3499999999999996D, 4.3499999999999996D),
                        new CelestialBody("5 UMi", 14D, 27D, 32.600000000000001D, 1, 75D, 45D, 38D, 4.25D, 4.25D),
                        new CelestialBody("Rho Boo", 14D, 31D, 12.300000000000001D, 1, 30D, 26D, 5D, 3.5800000000000001D, 3.5800000000000001D),
                        new CelestialBody("Gamma Boo", 14D, 31D, 29.600000000000001D, 1, 38D, 22D, 17D, 3.0299999999999998D, 3.0299999999999998D),
                        new CelestialBody("Sigma Lup", 14D, 31D, 38D, -1, 50D, 23D, 36D, 4.4199999999999999D, 4.4199999999999999D),
                        new CelestialBody("Sigma Boo", 14D, 34D, 2.8999999999999999D, 1, 29D, 48D, 28D, 4.46D, 4.46D),
                        new CelestialBody("Eta Cen", 14D, 34D, 34.899999999999999D, -1, 42D, 5D, 41D, 2.3100000000000001D, 2.3100000000000001D),
                        new CelestialBody("Rho Lup", 14D, 36D, 54.299999999999997D, -1, 49D, 21D, 47D, 4.0499999999999998D, 4.0499999999999998D),
                        new CelestialBody("Alpha1 Cen (Toliman)", 14D, 38D, 36.600000000000001D, -1, 60D, 46D, 34D, 0.33000000000000002D, 0.33000000000000002D),
                        new CelestialBody("Alpha2 Cen", 14D, 38D, 36.600000000000001D, -1, 60D, 46D, 34D, 1.7D, 1.7D),
                        new CelestialBody("Zeta Boo", 14D, 40D, 27.300000000000001D, 1, 13D, 47D, 24D, 3.7799999999999998D, 3.7799999999999998D),
                        new CelestialBody("Zeta Boo", 14D, 40D, 27.300000000000001D, 1, 13D, 47D, 24D, 4.4299999999999997D, 4.4299999999999997D),
                        new CelestialBody("Alpha Lup", 14D, 40D, 57.600000000000001D, -1, 47D, 19D, 36D, 2.2999999999999998D, 2.2999999999999998D),
                        new CelestialBody("BS 5471", 14D, 41D, 3.2999999999999998D, -1, 37D, 43D, 55D, 4D, 4D),
                        new CelestialBody("Alpha Cir", 14D, 41D, 19.399999999999999D, -1, 64D, 54D, 46D, 3.1899999999999999D, 3.1899999999999999D),
                        new CelestialBody("My Vir", 14D, 42D, 17.699999999999999D, -1, 5D, 35D, 45D, 3.8799999999999999D, 3.8799999999999999D),
                        new CelestialBody("BS 5485", 14D, 42D, 46D, -1, 35D, 6D, 43D, 4.0499999999999998D, 4.0499999999999998D),
                        new CelestialBody("Epsilon Boo", 14D, 44D, 21.199999999999999D, 1, 27D, 8D, 6D, 2.3999999999999999D, 2.3999999999999999D),
                        new CelestialBody("109 Vir", 14D, 45D, 30.899999999999999D, 1, 1.0D, 57D, 12D, 3.7200000000000002D, 3.7200000000000002D),
                        new CelestialBody("Alpha Aps", 14D, 46D, 0.80000000000000004D, -1, 78D, 59D, 4D, 3.8300000000000001D, 3.8300000000000001D),
                        new CelestialBody("58 Hya", 14D, 49D, 26.100000000000001D, -1, 27D, 54D, 2D, 4.4100000000000001D, 4.4100000000000001D),
                        new CelestialBody("Alpha2 Lib (Zuben Elgenubi)", 14D, 50D, 4.5D, -1, 15D, 58D, 56D, 2.75D, 2.75D),
                        new CelestialBody("Omikron Lup", 14D, 50D, 41.299999999999997D, -1, 43D, 30D, 58D, 4.3200000000000003D, 4.3200000000000003D),
                        new CelestialBody("Beta UMi (Kochab)", 14D, 50D, 44.200000000000003D, 1, 74D, 12D, 53D, 2.0800000000000001D, 2.0800000000000001D),
                        new CelestialBody("16 Lib", 14D, 56D, 25.5D, -1, 4D, 17D, 17D, 4.4900000000000002D, 4.4900000000000002D),
                        new CelestialBody("Beta Lup", 14D, 57D, 34.600000000000001D, -1, 43D, 4D, 35D, 2.6800000000000002D, 2.6800000000000002D),
                        new CelestialBody("Kappa Cen", 14D, 58D, 12.800000000000001D, -1, 42D, 2D, 48D, 3.1299999999999999D, 3.1299999999999999D),
                        new CelestialBody("Beta Boo", 15D, 1.0D, 24D, 1, 40D, 26D, 50D, 3.5D, 3.5D),
                        new CelestialBody("110 Vir", 15D, 2D, 10D, 1, 2D, 8D, 51D, 4.4000000000000004D, 4.4000000000000004D),
                        new CelestialBody("Sigma Lib", 15D, 3D, 13.1D, -1, 25D, 13D, 32D, 3.29D, 3.29D),
                        new CelestialBody("Lambda Lup", 15D, 7D, 51.700000000000003D, -1, 45D, 13D, 29D, 4.0499999999999998D, 4.0499999999999998D),
                        new CelestialBody("Kappa Lup", 15D, 10D, 55.299999999999997D, -1, 48D, 41D, 1.0D, 3.8700000000000001D, 3.8700000000000001D),
                        new CelestialBody("Zeta Lup", 15D, 11D, 14.300000000000001D, -1, 52D, 2D, 41D, 3.4100000000000001D, 3.4100000000000001D),
                        new CelestialBody("Delta Boo", 15D, 14D, 55.100000000000001D, 1, 33D, 22D, 6D, 3.4700000000000002D, 3.4700000000000002D),
                        new CelestialBody("Beta Lib (Zuben Elschemali)", 15D, 16D, 13.5D, -1, 9D, 19D, 48D, 2.6099999999999999D, 2.6099999999999999D),
                        new CelestialBody("Beta Cir", 15D, 16D, 22.300000000000001D, -1, 58D, 44D, 53D, 4.0700000000000003D, 4.0700000000000003D),
                        new CelestialBody("2 Lup", 15D, 16D, 56.700000000000003D, -1, 30D, 5D, 46D, 4.3399999999999999D, 4.3399999999999999D),
                        new CelestialBody("My Lup", 15D, 17D, 31.199999999999999D, -1, 47D, 49D, 21D, 4.2699999999999996D, 4.2699999999999996D),
                        new CelestialBody("Gamma TrA", 15D, 17D, 32.5D, -1, 68D, 37D, 37D, 2.8900000000000001D, 2.8900000000000001D),
                        new CelestialBody("Delta Lup", 15D, 20D, 25D, -1, 40D, 35D, 45D, 3.2200000000000002D, 3.2200000000000002D),
                        new CelestialBody("Gamma UMi", 15D, 20D, 44.600000000000001D, 1, 71D, 53D, 8D, 3.0499999999999998D, 3.0499999999999998D),
                        new CelestialBody("Phi1 Lup", 15D, 20D, 53D, -1, 36D, 12D, 34D, 3.5600000000000001D, 3.5600000000000001D),
                        new CelestialBody("Epsilon Lup", 15D, 21D, 41.5D, -1, 44D, 38D, 17D, 3.3700000000000001D, 3.3700000000000001D),
                        new CelestialBody("My1 Boo", 15D, 23D, 56.5D, 1, 37D, 25D, 39D, 4.3099999999999996D, 4.3099999999999996D),
                        new CelestialBody("Iota Dra", 15D, 24D, 36.299999999999997D, 1, 59D, 1.0D, 0.0D, 3.29D, 3.29D),
                        new CelestialBody("Beta CrB", 15D, 27D, 13.9D, 1, 29D, 9D, 19D, 3.6800000000000002D, 3.6800000000000002D),
                        new CelestialBody("Theta CrB", 15D, 32D, 20.699999999999999D, 1, 31D, 24D, 27D, 4.1399999999999997D, 4.1399999999999997D),
                        new CelestialBody("Alpha CrB (Gemma)", 15D, 34D, 4.4000000000000004D, 1, 26D, 45D, 47D, 2.23D, 2.23D),
                        new CelestialBody("Delta Ser", 15D, 34D, 6.5D, 1, 10D, 35D, 13D, 4.2300000000000004D, 4.2300000000000004D),
                        new CelestialBody("Gamma Lup", 15D, 34D, 10.199999999999999D, -1, 41D, 7D, 8D, 2.7799999999999998D, 2.7799999999999998D),
                        new CelestialBody("Gamma Lib", 15D, 34D, 42.799999999999997D, -1, 14D, 44D, 31D, 3.9100000000000001D, 3.9100000000000001D),
                        new CelestialBody("Epsilon TrA", 15D, 35D, 22.899999999999999D, -1, 66D, 16D, 10D, 4.1100000000000003D, 4.1100000000000003D),
                        new CelestialBody("Ypsilon Lib", 15D, 36D, 8.5D, -1, 28D, 5D, 16D, 3.5800000000000001D, 3.5800000000000001D),
                        new CelestialBody("Omega Lup", 15D, 37D, 4.4000000000000004D, -1, 42D, 31D, 14D, 4.3300000000000001D, 4.3300000000000001D),
                        new CelestialBody("Tau Lib", 15D, 37D, 45.799999999999997D, -1, 29D, 43D, 51D, 3.6600000000000001D, 3.6600000000000001D),
                        new CelestialBody("Gamma CrB", 15D, 42D, 8D, 1, 26D, 20D, 28D, 3.8399999999999999D, 3.8399999999999999D),
                        new CelestialBody("Alpha Ser (Unuk)", 15D, 43D, 33.200000000000003D, 1, 6D, 28D, 14D, 2.6499999999999999D, 2.6499999999999999D),
                        new CelestialBody("Zeta UMi", 15D, 44D, 33.299999999999997D, 1, 77D, 50D, 22D, 4.3200000000000003D, 4.3200000000000003D),
                        new CelestialBody("Beta Ser", 15D, 45D, 31.100000000000001D, 1, 15D, 28D, 0.0D, 3.6699999999999999D, 3.6699999999999999D),
                        new CelestialBody("Lambda Ser", 15D, 45D, 44.299999999999997D, 1, 7D, 23D, 53D, 4.4299999999999997D, 4.4299999999999997D),
                        new CelestialBody("Kappa Ser", 15D, 48D, 5.2000000000000002D, 1, 18D, 11D, 9D, 4.0899999999999999D, 4.0899999999999999D),
                        new CelestialBody("My Ser", 15D, 48D, 51.700000000000003D, -1, 3D, 23D, 12D, 3.54D, 3.54D),
                        new CelestialBody("Chi Lup", 15D, 50D, 2.1000000000000001D, -1, 33D, 35D, 2D, 3.9500000000000002D, 3.9500000000000002D),
                        new CelestialBody("Epsilon Ser", 15D, 50D, 5.5D, 1, 4D, 31D, 15D, 3.71D, 3.71D),
                        new CelestialBody("Theta Lib", 15D, 52D, 59.899999999999999D, -1, 16D, 41D, 15D, 4.1500000000000004D, 4.1500000000000004D),
                        new CelestialBody("Beta TrA", 15D, 53D, 51.399999999999999D, -1, 63D, 23D, 13D, 2.8500000000000001D, 2.8500000000000001D),
                        new CelestialBody("Gamma Ser", 15D, 55D, 47D, 1, 15D, 42D, 30D, 3.8500000000000001D, 3.8500000000000001D),
                        new CelestialBody("Rho Sco", 15D, 55D, 59.299999999999997D, -1, 29D, 10D, 21D, 3.8799999999999999D, 3.8799999999999999D),
                        new CelestialBody("Epsilon CrB", 15D, 56D, 59.200000000000003D, 1, 26D, 55D, 10D, 4.1500000000000004D, 4.1500000000000004D),
                        new CelestialBody("Pi Sco", 15D, 57D, 58.399999999999999D, -1, 26D, 4D, 23D, 2.8900000000000001D, 2.8900000000000001D),
                        new CelestialBody("T CrB", 15D, 58D, 53.700000000000003D, 1, 25D, 57D, 39D, 11D, 2D),
                        new CelestialBody("Eta Lup", 15D, 59D, 9.4000000000000004D, -1, 38D, 21D, 23D, 3.4100000000000001D, 3.4100000000000001D),
                        new CelestialBody("Delta Sco", 15D, 59D, 28.5D, -1, 22D, 34D, 52D, 2.3199999999999998D, 2.3199999999999998D),
                        new CelestialBody("Theta Dra", 16D, 1.0D, 36.899999999999999D, 1, 58D, 36D, 14D, 4.0099999999999998D, 4.0099999999999998D),
                        new CelestialBody("Xi Sco", 16D, 3D, 34.200000000000003D, -1, 11D, 20D, 2D, 4.1600000000000001D, 4.1600000000000001D),
                        new CelestialBody("Beta1 Sco (Akrab)", 16D, 4D, 35.5D, -1, 19D, 45D, 59D, 2.6200000000000001D, 2.6200000000000001D),
                        new CelestialBody("Theta Lup", 16D, 5D, 38.200000000000003D, -1, 36D, 45D, 50D, 4.2300000000000004D, 4.2300000000000004D),
                        new CelestialBody("Omega1 Sco", 16D, 5D, 57.399999999999999D, -1, 20D, 37D, 51D, 3.96D, 3.96D),
                        new CelestialBody("Omega2 Sco", 16D, 6D, 33.200000000000003D, -1, 20D, 49D, 49D, 4.3200000000000003D, 4.3200000000000003D),
                        new CelestialBody("Phi Her", 16D, 8D, 18.699999999999999D, 1, 44D, 58D, 21D, 4.2599999999999998D, 4.2599999999999998D),
                        new CelestialBody("Ny Sco", 16D, 11D, 9.0999999999999996D, -1, 19D, 25D, 25D, 4.0099999999999998D, 4.0099999999999998D),
                        new CelestialBody("Delta Oph", 16D, 13D, 35.100000000000001D, -1, 3D, 39D, 28D, 2.7400000000000002D, 2.7400000000000002D),
                        new CelestialBody("Delta TrA", 16D, 14D, 6.5999999999999996D, -1, 63D, 38D, 59D, 3.8500000000000001D, 3.8500000000000001D),
                        new CelestialBody("Epsilon Oph", 16D, 17D, 33.200000000000003D, -1, 4D, 39D, 28D, 3.2400000000000002D, 3.2400000000000002D),
                        new CelestialBody("Gamma2 Nor", 16D, 18D, 45.100000000000001D, -1, 50D, 7D, 16D, 4.0199999999999996D, 4.0199999999999996D),
                        new CelestialBody("Tau Her", 16D, 19D, 18.199999999999999D, 1, 46D, 20D, 51D, 3.8900000000000001D, 3.8900000000000001D),
                        new CelestialBody("Sigma Sco", 16D, 20D, 18.300000000000001D, -1, 25D, 33D, 32D, 2.8900000000000001D, 2.8900000000000001D),
                        new CelestialBody("Gamma Her", 16D, 21D, 16.800000000000001D, 1, 19D, 11D, 12D, 3.75D, 3.75D),
                        new CelestialBody("Psi Oph", 16D, 23D, 15.199999999999999D, -1, 20D, 0.0D, 15D, 4.5D, 4.5D),
                        new CelestialBody("Eta Dra", 16D, 23D, 47.5D, 1, 61D, 32D, 49D, 2.7400000000000002D, 2.7400000000000002D),
                        new CelestialBody("Epsilon Nor", 16D, 26D, 7.0999999999999996D, -1, 47D, 31D, 23D, 4.4699999999999998D, 4.4699999999999998D),
                        new CelestialBody("Chi Oph", 16D, 26D, 10.9D, -1, 18D, 25D, 27D, 4.4199999999999999D, 4.4199999999999999D),
                        new CelestialBody("Alpha Sco (Antares)", 16D, 28D, 31D, -1, 26D, 24D, 3D, 0.95999999999999996D, 0.95999999999999996D),
                        new CelestialBody("Beta Her", 16D, 29D, 35.799999999999997D, 1, 21D, 31D, 14D, 2.77D, 2.77D),
                        new CelestialBody("Lambda Oph", 16D, 30D, 10.9D, 1, 2D, 0.0D, 54D, 3.8199999999999998D, 3.8199999999999998D),
                        new CelestialBody("Phi Oph", 16D, 30D, 18.399999999999999D, -1, 16D, 34D, 55D, 4.2800000000000002D, 4.2800000000000002D),
                        new CelestialBody("BS 6143", 16D, 30D, 25.899999999999999D, -1, 34D, 40D, 25D, 4.2300000000000004D, 4.2300000000000004D),
                        new CelestialBody("Gamma Aps", 16D, 31D, 11.9D, -1, 78D, 52D, 0.0D, 3.8900000000000001D, 3.8900000000000001D),
                        new CelestialBody("Omega Oph", 16D, 31D, 16.5D, -1, 21D, 26D, 10D, 4.4500000000000002D, 4.4500000000000002D),
                        new CelestialBody("Sigma Her", 16D, 33D, 38.100000000000001D, 1, 42D, 27D, 59D, 4.2000000000000002D, 4.2000000000000002D),
                        new CelestialBody("Tau Sco", 16D, 34D, 58.700000000000003D, -1, 28D, 11D, 13D, 2.8199999999999998D, 2.8199999999999998D),
                        new CelestialBody("BS 6166", 16D, 35D, 25.100000000000001D, -1, 35D, 13D, 36D, 4.1600000000000001D, 4.1600000000000001D),
                        new CelestialBody("Zeta Oph", 16D, 36D, 21.600000000000001D, -1, 10D, 32D, 19D, 2.5600000000000001D, 2.5600000000000001D),
                        new CelestialBody("Zeta Her", 16D, 40D, 44.399999999999999D, 1, 31D, 37D, 43D, 2.8100000000000001D, 2.8100000000000001D),
                        new CelestialBody("Beta Aps", 16D, 40D, 59.100000000000001D, -1, 77D, 29D, 21D, 4.2400000000000002D, 4.2400000000000002D),
                        new CelestialBody("Eta Her", 16D, 42D, 23.899999999999999D, 1, 38D, 56D, 58D, 3.5299999999999998D, 3.5299999999999998D),
                        new CelestialBody("Alpha TrA", 16D, 47D, 7.2999999999999998D, -1, 69D, 0.0D, 9D, 1.9199999999999999D, 1.9199999999999999D),
                        new CelestialBody("Epsilon UMi", 16D, 47D, 25.100000000000001D, 1, 82D, 3D, 46D, 4.2300000000000004D, 4.2300000000000004D),
                        new CelestialBody("Eta Ara", 16D, 48D, 31.699999999999999D, -1, 59D, 1.0D, 0.0D, 3.7599999999999998D, 3.7599999999999998D),
                        new CelestialBody("Epsilon Sco", 16D, 49D, 13.4D, -1, 34D, 16D, 4D, 2.29D, 2.29D),
                        new CelestialBody("My1 Sco", 16D, 50D, 53.200000000000003D, -1, 38D, 1.0D, 25D, 3.0800000000000001D, 3.0800000000000001D),
                        new CelestialBody("My2 Sco", 16D, 51D, 21.100000000000001D, -1, 37D, 59D, 38D, 3.5699999999999998D, 3.5699999999999998D),
                        new CelestialBody("Iota Oph", 16D, 53D, 19.300000000000001D, 1, 10D, 11D, 19D, 4.3799999999999999D, 4.3799999999999999D),
                        new CelestialBody("Zeta2 Sco", 16D, 53D, 33.600000000000001D, -1, 42D, 20D, 15D, 3.6200000000000001D, 3.6200000000000001D),
                        new CelestialBody("Kappa Oph", 16D, 56D, 58.899999999999999D, 1, 9D, 23D, 49D, 3.2000000000000002D, 3.2000000000000002D),
                        new CelestialBody("Zeta Ara", 16D, 57D, 25D, -1, 55D, 58D, 6D, 3.1299999999999999D, 3.1299999999999999D),
                        new CelestialBody("Epsilon1 Ara", 16D, 58D, 25.5D, -1, 53D, 8D, 22D, 4.0599999999999996D, 4.0599999999999996D),
                        new CelestialBody("Epsilon Her", 16D, 59D, 44.100000000000001D, 1, 30D, 56D, 50D, 3.9199999999999999D, 3.9199999999999999D),
                        new CelestialBody("Zeta Dra", 17D, 8D, 44.5D, 1, 65D, 43D, 57D, 3.1699999999999999D, 3.1699999999999999D),
                        new CelestialBody("Eta Oph", 17D, 9D, 32.700000000000003D, -1, 15D, 42D, 28D, 2.4300000000000002D, 2.4300000000000002D),
                        new CelestialBody("Eta Sco", 17D, 11D, 6.7999999999999998D, -1, 43D, 13D, 16D, 3.3300000000000001D, 3.3300000000000001D),
                        new CelestialBody("Alpha1 Her (Ras Algethi)", 17D, 13D, 59.200000000000003D, 1, 14D, 24D, 22D, 3.0800000000000001D, 3.0800000000000001D),
                        new CelestialBody("Delta Her", 17D, 14D, 26.199999999999999D, 1, 24D, 51D, 21D, 3.1400000000000001D, 3.1400000000000001D),
                        new CelestialBody("Pi Her", 17D, 14D, 32.5D, 1, 36D, 49D, 30D, 3.1600000000000001D, 3.1600000000000001D),
                        new CelestialBody("Ny Ser", 17D, 20D, 0.69999999999999996D, -1, 12D, 49D, 59D, 4.3300000000000001D, 4.3300000000000001D),
                        new CelestialBody("Xi Oph", 17D, 20D, 8D, -1, 21D, 5D, 54D, 4.3899999999999997D, 4.3899999999999997D),
                        new CelestialBody("Theta Oph", 17D, 21D, 7.0999999999999996D, -1, 24D, 59D, 9D, 3.27D, 3.27D),
                        new CelestialBody("Beta Ara", 17D, 24D, 5.5999999999999996D, -1, 55D, 31D, 3D, 2.8500000000000001D, 2.8500000000000001D),
                        new CelestialBody("Gamma Ara", 17D, 24D, 10.300000000000001D, -1, 56D, 21D, 55D, 3.3399999999999999D, 3.3399999999999999D),
                        new CelestialBody("44 Oph", 17D, 25D, 29D, -1, 24D, 9D, 46D, 4.1699999999999999D, 4.1699999999999999D),
                        new CelestialBody("Sigma Oph", 17D, 25D, 47.700000000000003D, 1, 4D, 9D, 8D, 4.3399999999999999D, 4.3399999999999999D),
                        new CelestialBody("45 Oph", 17D, 26D, 25.699999999999999D, -1, 29D, 51D, 18D, 4.29D, 4.29D),
                        new CelestialBody("Ypsilon Sco", 17D, 29D, 46.600000000000001D, -1, 37D, 17D, 7D, 2.6899999999999999D, 2.6899999999999999D),
                        new CelestialBody("Delta Ara", 17D, 29D, 47.299999999999997D, -1, 60D, 40D, 23D, 3.6200000000000001D, 3.6200000000000001D),
                        new CelestialBody("Beta Dra", 17D, 30D, 6.2000000000000002D, 1, 52D, 18D, 42D, 2.79D, 2.79D),
                        new CelestialBody("Lambda Her", 17D, 30D, 9.0999999999999996D, 1, 26D, 7D, 16D, 4.4100000000000001D, 4.4100000000000001D),
                        new CelestialBody("Alpha Ara", 17D, 30D, 43.200000000000003D, -1, 49D, 51D, 57D, 2.9500000000000002D, 2.9500000000000002D),
                        new CelestialBody("Lambda Sco", 17D, 32D, 37.399999999999999D, -1, 37D, 5D, 39D, 1.6299999999999999D, 1.6299999999999999D),
                        new CelestialBody("Alpha Oph (Ras Alhague)", 17D, 34D, 15.699999999999999D, 1, 12D, 34D, 12D, 2.0800000000000001D, 2.0800000000000001D),
                        new CelestialBody("BS 6546", 17D, 35D, 32.799999999999997D, -1, 38D, 37D, 34D, 4.29D, 4.29D),
                        new CelestialBody("Theta Sco (Sargas)", 17D, 36D, 16.600000000000001D, -1, 42D, 59D, 23D, 1.8700000000000001D, 1.8700000000000001D),
                        new CelestialBody("Xi Ser", 17D, 36D, 45.299999999999997D, -1, 15D, 23D, 25D, 3.54D, 3.54D),
                        new CelestialBody("Delta UMi", 17D, 36D, 51.5D, 1, 86D, 35D, 43D, 4.3600000000000003D, 4.3600000000000003D),
                        new CelestialBody("Iota Her", 17D, 39D, 3.2999999999999998D, 1, 46D, 0.0D, 49D, 3.7999999999999998D, 3.7999999999999998D),
                        new CelestialBody("Omikron Ser", 17D, 40D, 35.899999999999999D, -1, 12D, 52D, 6D, 4.2599999999999998D, 4.2599999999999998D),
                        new CelestialBody("Kappa Sco", 17D, 41D, 29D, -1, 39D, 1.0D, 25D, 2.4100000000000001D, 2.4100000000000001D),
                        new CelestialBody("Beta Oph", 17D, 42D, 45.399999999999999D, 1, 4D, 34D, 21D, 2.77D, 2.77D),
                        new CelestialBody("Eta Pav", 17D, 44D, 18.600000000000001D, -1, 64D, 43D, 6D, 3.6200000000000001D, 3.6200000000000001D),
                        new CelestialBody("My Her", 17D, 45D, 53.5D, 1, 27D, 43D, 43D, 3.4199999999999999D, 3.4199999999999999D),
                        new CelestialBody("Iota1 Sco", 17D, 46D, 34.200000000000003D, -1, 40D, 7D, 21D, 3.0299999999999998D, 3.0299999999999998D),
                        new CelestialBody("X Sgr", 17D, 46D, 38.799999999999997D, -1, 27D, 49D, 34D, 4.2000000000000002D, 4.2000000000000002D),
                        new CelestialBody("Gamma Oph", 17D, 47D, 9.9000000000000004D, 1, 2D, 42D, 43D, 3.75D, 3.75D),
                        new CelestialBody("BS 6630", 17D, 48D, 52.299999999999997D, -1, 37D, 2D, 23D, 3.21D, 3.21D),
                        new CelestialBody("Xi Dra", 17D, 53D, 16.600000000000001D, 1, 56D, 52D, 29D, 3.75D, 3.75D),
                        new CelestialBody("Theta Her", 17D, 55D, 45.299999999999997D, 1, 37D, 15D, 7D, 3.8599999999999999D, 3.8599999999999999D),
                        new CelestialBody("Gamma Dra", 17D, 56D, 16.100000000000001D, 1, 51D, 29D, 25D, 2.23D, 2.23D),
                        new CelestialBody("Xi Her", 17D, 57D, 12.1D, 1, 29D, 14D, 56D, 3.7000000000000002D, 3.7000000000000002D),
                        new CelestialBody("Ny Her", 17D, 57D, 56.899999999999999D, 1, 30D, 11D, 24D, 4.4100000000000001D, 4.4100000000000001D),
                        new CelestialBody("Ny Oph", 17D, 58D, 13.699999999999999D, -1, 9D, 46D, 22D, 3.3399999999999999D, 3.3399999999999999D),
                        new CelestialBody("67 Oph", 17D, 59D, 55.100000000000001D, 1, 2D, 55D, 53D, 3.9700000000000002D, 3.9700000000000002D),
                        new CelestialBody("68 Oph", 18D, 1.0D, 1.0D, 1, 1.0D, 18D, 17D, 4.4500000000000002D, 4.4500000000000002D),
                        new CelestialBody("W Sgr", 18D, 4D, 5.7000000000000002D, -1, 29D, 34D, 54D, 4.2999999999999998D, 4.2999999999999998D),
                        new CelestialBody("70 Oph", 18D, 4D, 43.299999999999997D, 1, 2D, 30D, 8D, 4.0300000000000002D, 4.0300000000000002D),
                        new CelestialBody("Gamma Sgr", 18D, 4D, 52.600000000000001D, -1, 30D, 25D, 31D, 2.9900000000000002D, 2.9900000000000002D),
                        new CelestialBody("Theta Ara", 18D, 5D, 30.100000000000001D, -1, 50D, 5D, 37D, 3.6600000000000001D, 3.6600000000000001D),
                        new CelestialBody("72 Oph", 18D, 6D, 39.700000000000003D, 1, 9D, 33D, 40D, 3.73D, 3.73D),
                        new CelestialBody("Omikron Her", 18D, 6D, 58.600000000000001D, 1, 28D, 45D, 36D, 3.8300000000000001D, 3.8300000000000001D),
                        new CelestialBody("Pi Pav", 18D, 7D, 11.1D, -1, 63D, 40D, 13D, 4.3499999999999996D, 4.3499999999999996D),
                        new CelestialBody("102 Her", 18D, 8D, 8.3000000000000007D, 1, 20D, 48D, 42D, 4.3600000000000003D, 4.3600000000000003D),
                        new CelestialBody("My Sgr", 18D, 12D, 53.799999999999997D, -1, 21D, 3D, 49D, 3.8599999999999999D, 3.8599999999999999D),
                        new CelestialBody("Eta Sgr", 18D, 16D, 38.799999999999997D, -1, 36D, 46D, 2D, 3.1099999999999999D, 3.1099999999999999D),
                        new CelestialBody("Kappa Lyr", 18D, 19D, 21.199999999999999D, 1, 36D, 3D, 27D, 4.3300000000000001D, 4.3300000000000001D),
                        new CelestialBody("Delta Sgr", 18D, 20D, 4D, -1, 29D, 50D, 7D, 2.7000000000000002D, 2.7000000000000002D),
                        new CelestialBody("Eta Ser", 18D, 20D, 33.600000000000001D, -1, 2D, 54D, 12D, 3.2599999999999998D, 3.2599999999999998D),
                        new CelestialBody("Phi Dra", 18D, 20D, 58D, 1, 71D, 19D, 50D, 4.2199999999999998D, 4.2199999999999998D),
                        new CelestialBody("Chi Dra", 18D, 21D, 19.100000000000001D, 1, 72D, 43D, 37D, 3.5699999999999998D, 3.5699999999999998D),
                        new CelestialBody("Xi Pav", 18D, 21D, 53.5D, -1, 61D, 30D, 7D, 4.3600000000000003D, 4.3600000000000003D),
                        new CelestialBody("109 Her", 18D, 23D, 4.7999999999999998D, 1, 21D, 45D, 45D, 3.8399999999999999D, 3.8399999999999999D),
                        new CelestialBody("Epsilon Sgr (Kaus Australis)", 18D, 23D, 12.6D, -1, 34D, 23D, 33D, 1.8500000000000001D, 1.8500000000000001D),
                        new CelestialBody("Alpha Tel", 18D, 25D, 53.899999999999999D, -1, 45D, 58D, 39D, 3.5099999999999998D, 3.5099999999999998D),
                        new CelestialBody("Lambda Sgr", 18D, 27D, 4.5999999999999996D, -1, 25D, 25D, 50D, 2.8100000000000001D, 2.8100000000000001D),
                        new CelestialBody("Zeta Tel", 18D, 27D, 42.899999999999999D, -1, 49D, 4D, 48D, 4.1299999999999999D, 4.1299999999999999D),
                        new CelestialBody("Alpha Sct", 18D, 34D, 25.100000000000001D, -1, 8D, 15D, 18D, 3.8500000000000001D, 3.8500000000000001D),
                        new CelestialBody("Alpha Lyr (Wega)", 18D, 36D, 26.899999999999999D, 1, 38D, 46D, 11D, 0.029999999999999999D, 0.029999999999999999D),
                        new CelestialBody("Zeta Pav", 18D, 41D, 21D, -1, 71D, 26D, 32D, 4.0099999999999998D, 4.0099999999999998D),
                        new CelestialBody("Zeta1 Lyr", 18D, 44D, 16.399999999999999D, 1, 37D, 35D, 22D, 4.3600000000000003D, 4.3600000000000003D),
                        new CelestialBody("Phi Sgr", 18D, 44D, 45.100000000000001D, -1, 27D, 0.0D, 24D, 3.1699999999999999D, 3.1699999999999999D),
                        new CelestialBody("110 Her", 18D, 45D, 2.2999999999999998D, 1, 20D, 31D, 55D, 4.1900000000000004D, 4.1900000000000004D),
                        new CelestialBody("111 Her", 18D, 46D, 22.800000000000001D, 1, 18D, 9D, 53D, 4.3600000000000003D, 4.3600000000000003D),
                        new CelestialBody("Beta Sct", 18D, 46D, 24.300000000000001D, -1, 4D, 45D, 51D, 4.2199999999999998D, 4.2199999999999998D),
                        new CelestialBody("Beta Lyr", 18D, 49D, 32.700000000000003D, 1, 33D, 20D, 43D, 3.4500000000000002D, 3.4500000000000002D),
                        new CelestialBody("Lambda Pav", 18D, 50D, 52.600000000000001D, -1, 62D, 12D, 20D, 4.2199999999999998D, 4.2199999999999998D),
                        new CelestialBody("Delta2 Lyr", 18D, 53D, 59.799999999999997D, 1, 36D, 52D, 48D, 4.2999999999999998D, 4.2999999999999998D),
                        new CelestialBody("Sigma Sgr", 18D, 54D, 22D, -1, 26D, 18D, 56D, 2.02D, 2.02D),
                        new CelestialBody("R Lyr", 18D, 54D, 53.600000000000001D, 1, 43D, 55D, 36D, 4.04D, 4.04D),
                        new CelestialBody("Kappa Pav", 18D, 55D, 27.699999999999999D, -1, 67D, 15D, 12D, 3.8999999999999999D, 3.8999999999999999D),
                        new CelestialBody("Theta1 Ser", 18D, 55D, 29.899999999999999D, 1, 4D, 11D, 2D, 4.0599999999999996D, 4.0599999999999996D),
                        new CelestialBody("Xi2 Sgr", 18D, 56D, 51.899999999999999D, -1, 21D, 7D, 36D, 3.5099999999999998D, 3.5099999999999998D),
                        new CelestialBody("Gamma Lyr", 18D, 58D, 24.100000000000001D, 1, 32D, 40D, 9D, 3.2400000000000002D, 3.2400000000000002D),
                        new CelestialBody("Epsilon Aql", 18D, 58D, 57.899999999999999D, 1, 15D, 2D, 52D, 4.0199999999999996D, 4.0199999999999996D),
                        new CelestialBody("12 Aql", 19D, 0.0D, 54.399999999999999D, -1, 5D, 45D, 37D, 4.0199999999999996D, 4.0199999999999996D),
                        new CelestialBody("Zeta Sgr", 19D, 1.0D, 41.399999999999999D, -1, 29D, 54D, 7D, 2.6000000000000001D, 2.6000000000000001D),
                        new CelestialBody("Omikron Sgr", 19D, 3D, 48.899999999999999D, -1, 21D, 45D, 49D, 3.77D, 3.77D),
                        new CelestialBody("Zeta Aql", 19D, 4D, 44.600000000000001D, 1, 13D, 50D, 28D, 2.9900000000000002D, 2.9900000000000002D),
                        new CelestialBody("Gamma Cra", 19D, 5D, 26.399999999999999D, -1, 37D, 5D, 6D, 4.21D, 4.21D),
                        new CelestialBody("Lambda Aql", 19D, 5D, 28.800000000000001D, -1, 4D, 54D, 18D, 3.4399999999999999D, 3.4399999999999999D),
                        new CelestialBody("Tau Sgr", 19D, 6D, 2.1000000000000001D, -1, 27D, 41D, 33D, 3.3199999999999998D, 3.3199999999999998D),
                        new CelestialBody("Alpha Cra", 19D, 8D, 29.199999999999999D, -1, 37D, 55D, 41D, 4.1100000000000003D, 4.1100000000000003D),
                        new CelestialBody("Pi Sgr", 19D, 8D, 54.100000000000001D, -1, 21D, 2D, 51D, 2.8900000000000001D, 2.8900000000000001D),
                        new CelestialBody("Beta Cra", 19D, 9D, 2D, -1, 39D, 21D, 53D, 4.1100000000000003D, 4.1100000000000003D),
                        new CelestialBody("Delta Dra", 19D, 12D, 33.200000000000003D, 1, 67D, 38D, 10D, 3.0699999999999998D, 3.0699999999999998D),
                        new CelestialBody("Eta Lyr", 19D, 13D, 15.9D, 1, 39D, 7D, 14D, 4.3899999999999997D, 4.3899999999999997D),
                        new CelestialBody("Tau Dra", 19D, 15D, 50.100000000000001D, 1, 73D, 19D, 44D, 4.4500000000000002D, 4.4500000000000002D),
                        new CelestialBody("Theta Lyr", 19D, 15D, 51.899999999999999D, 1, 38D, 6D, 27D, 4.3600000000000003D, 4.3600000000000003D),
                        new CelestialBody("Kappa Cyg", 19D, 16D, 46.100000000000001D, 1, 53D, 20D, 29D, 3.77D, 3.77D),
                        new CelestialBody("Rho1 Sgr", 19D, 20D, 49.899999999999999D, -1, 17D, 52D, 31D, 3.9300000000000002D, 3.9300000000000002D),
                        new CelestialBody("Beta1 Sgr", 19D, 21D, 35.899999999999999D, -1, 44D, 29D, 14D, 4.0099999999999998D, 4.0099999999999998D),
                        new CelestialBody("Beta2 Sgr", 19D, 22D, 10.4D, -1, 44D, 49D, 41D, 4.29D, 4.29D),
                        new CelestialBody("Alpha Sgr", 19D, 22D, 53D, -1, 40D, 38D, 39D, 3.9700000000000002D, 3.9700000000000002D),
                        new CelestialBody("Delta Aql", 19D, 24D, 46D, 1, 3D, 5D, 7D, 3.3599999999999999D, 3.3599999999999999D),
                        new CelestialBody("Alpha Vul", 19D, 28D, 6.0999999999999996D, 1, 24D, 38D, 6D, 4.4400000000000004D, 4.4400000000000004D),
                        new CelestialBody("Iota Cyg", 19D, 29D, 20.399999999999999D, 1, 51D, 41D, 55D, 3.79D, 3.79D),
                        new CelestialBody("Beta Cyg", 19D, 30D, 8.1999999999999993D, 1, 27D, 55D, 43D, 3.0800000000000001D, 3.0800000000000001D),
                        new CelestialBody("My Aql", 19D, 33D, 22.899999999999999D, 1, 7D, 20D, 51D, 4.4500000000000002D, 4.4500000000000002D),
                        new CelestialBody("Iota Aql", 19D, 35D, 58.299999999999997D, -1, 1.0D, 19D, 10D, 4.3600000000000003D, 4.3600000000000003D),
                        new CelestialBody("Theta Cyg", 19D, 36D, 3.1000000000000001D, 1, 50D, 11D, 13D, 4.4800000000000004D, 4.4800000000000004D),
                        new CelestialBody("Alpha Sge", 19D, 39D, 26.899999999999999D, 1, 17D, 58D, 47D, 4.3700000000000001D, 4.3700000000000001D),
                        new CelestialBody("Beta Sge", 19D, 40D, 23.899999999999999D, 1, 17D, 26D, 30D, 4.3700000000000001D, 4.3700000000000001D),
                        new CelestialBody("Delta Cyg", 19D, 44D, 31.300000000000001D, 1, 45D, 5D, 42D, 2.8700000000000001D, 2.8700000000000001D),
                        new CelestialBody("Gamma Aql", 19D, 45D, 34.200000000000003D, 1, 10D, 34D, 38D, 2.7200000000000002D, 2.7200000000000002D),
                        new CelestialBody("Delta Sge", 19D, 46D, 44.5D, 1, 18D, 29D, 52D, 3.8199999999999998D, 3.8199999999999998D),
                        new CelestialBody("Epsilon Dra", 19D, 48D, 13.6D, 1, 70D, 13D, 52D, 3.8300000000000001D, 3.8300000000000001D),
                        new CelestialBody("Chi Cyg", 19D, 50D, 0.40000000000000002D, 1, 32D, 52D, 37D, 4.2300000000000004D, 4.2300000000000004D),
                        new CelestialBody("Alpha Aql (Atair)", 19D, 50D, 4.5999999999999996D, 1, 8D, 49D, 46D, 0.77000000000000002D, 0.77000000000000002D),
                        new CelestialBody("Eta Aql", 19D, 51D, 44.100000000000001D, 1, 0.0D, 58D, 4D, 3.8999999999999999D, 3.8999999999999999D),
                        new CelestialBody("Iota Sgr", 19D, 54D, 15.800000000000001D, -1, 41D, 54D, 27D, 4.1299999999999999D, 4.1299999999999999D),
                        new CelestialBody("Beta Aql", 19D, 54D, 36.100000000000001D, 1, 6D, 22D, 12D, 3.71D, 3.71D),
                        new CelestialBody("Eta Cyg", 19D, 55D, 45.700000000000003D, 1, 35D, 2D, 40D, 3.8900000000000001D, 3.8900000000000001D),
                        new CelestialBody("Gamma Sge", 19D, 58D, 6.7000000000000002D, 1, 19D, 27D, 8D, 3.4700000000000002D, 3.4700000000000002D),
                        new CelestialBody("Theta1 Sgr", 19D, 58D, 47.700000000000003D, -1, 35D, 18D, 59D, 4.3700000000000001D, 4.3700000000000001D),
                        new CelestialBody("Epsilon Pav", 19D, 58D, 56.100000000000001D, -1, 72D, 57D, 1.0D, 3.96D, 3.96D),
                        new CelestialBody("Delta Pav", 20D, 7D, 18.800000000000001D, -1, 66D, 13D, 13D, 3.5600000000000001D, 3.5600000000000001D),
                        new CelestialBody("Kappa Cep", 20D, 9D, 23.800000000000001D, 1, 77D, 40D, 6D, 4.3899999999999997D, 4.3899999999999997D),
                        new CelestialBody("Theta Aql", 20D, 10D, 33.399999999999999D, -1, 0.0D, 51D, 54D, 3.23D, 3.23D),
                        new CelestialBody("33 Cyg", 20D, 13D, 3.7000000000000002D, 1, 56D, 31D, 23D, 4.2999999999999998D, 4.2999999999999998D),
                        new CelestialBody("Omikron1 Cyg", 20D, 13D, 10.5D, 1, 46D, 41D, 49D, 3.79D, 3.79D),
                        new CelestialBody("Omikron2 Cyg", 20D, 15D, 1.3999999999999999D, 1, 47D, 40D, 10D, 3.98D, 3.98D),
                        new CelestialBody("Alpha1 Cap", 20D, 16D, 50.700000000000003D, -1, 12D, 33D, 13D, 4.2400000000000002D, 4.2400000000000002D),
                        new CelestialBody("Alpha2 Cap", 20D, 17D, 15D, -1, 12D, 35D, 26D, 3.5600000000000001D, 3.5600000000000001D),
                        new CelestialBody("Beta Cap", 20D, 20D, 11.800000000000001D, -1, 14D, 49D, 40D, 3.0800000000000001D, 3.0800000000000001D),
                        new CelestialBody("Gamma Cyg", 20D, 21D, 42.5D, 1, 40D, 12D, 35D, 2.2000000000000002D, 2.2000000000000002D),
                        new CelestialBody("39 Cyg", 20D, 23D, 16.800000000000001D, 1, 32D, 8D, 35D, 4.4299999999999997D, 4.4299999999999997D),
                        new CelestialBody("Alpha Pav", 20D, 24D, 30.5D, -1, 56D, 46D, 57D, 1.9399999999999999D, 1.9399999999999999D),
                        new CelestialBody("41 Cyg", 20D, 28D, 48.200000000000003D, 1, 30D, 19D, 11D, 4.0099999999999998D, 4.0099999999999998D),
                        new CelestialBody("Theta Cep", 20D, 29D, 20.399999999999999D, 1, 62D, 56D, 43D, 4.2199999999999998D, 4.2199999999999998D),
                        new CelestialBody("Epsilon Del", 20D, 32D, 31.199999999999999D, 1, 11D, 15D, 12D, 4.0300000000000002D, 4.0300000000000002D),
                        new CelestialBody("Alpha Ind", 20D, 36D, 33.100000000000001D, -1, 47D, 20D, 34D, 3.1099999999999999D, 3.1099999999999999D),
                        new CelestialBody("Beta Del", 20D, 36D, 52.200000000000003D, 1, 14D, 32D, 39D, 3.6299999999999999;D, 3.6299999999999999;D;),
                        new CelestialBody("71 Aql", 20;D, 37;D, 35.399999999999999;D, -1, 1.0;D, 9;D, 23;D, 4.3200000000000003;D, 4.3200000000000003;D;),
                        new CelestialBody("Alpha Del", 20;D, 38;D, 57.899999999999999;D, 1, 15;D, 51;D, 37;D, 3.77;D, 3.77;D;),
                        new CelestialBody("Alpha Cyg (Deneb)", 20;D, 40;D, 56.200000000000003;D, 1, 45;D, 13;D, 41;D, 1.25;D, 1.25;D;),
                        new CelestialBody("Delta Del", 20;D, 42;D, 46.899999999999999;D, 1, 15;D, 1.0;D, 19;D, 4.4299999999999997;D, 4.4299999999999997;D;),
                        new CelestialBody("Beta Pav", 20;D, 43;D, 39.899999999999999;D, -1, 66;D, 15;D, 22;D, 3.4199999999999999;D, 3.4199999999999999;D;),
                        new CelestialBody("Eta Cep", 20;D, 44;D, 59.799999999999997;D, 1, 61;D, 46;D, 56;D, 3.4300000000000002;D, 3.4300000000000002;D;),
                        new CelestialBody("52 Cyg", 20;D, 45;D, 3.7999999999999998;D, 1, 30;D, 39;D, 59;D, 4.2199999999999998;D, 4.2199999999999998;D;),
                        new CelestialBody("Psi Cap", 20;D, 45;D, 14.300000000000001;D, -1, 25;D, 19;D, 25;D, 4.1399999999999997;D, 4.1399999999999997;D;),
                        new CelestialBody("Epsilon Cyg", 20;D, 45;D, 37.5;D, 1, 33;D, 54;D, 56;D, 2.46;D, 2.46;D;),
                        new CelestialBody("Gamma2 Del", 20;D, 45;D, 59.100000000000001;D, 1, 16;D, 4;D, 17;D, 4.2699999999999996;D, 4.2699999999999996;D;),
                        new CelestialBody("Epsilon Aqr", 20;D, 46;D, 53.5;D, -1, 9;D, 32;D, 58;D, 3.77;D, 3.77;D;),
                        new CelestialBody("3 Aqr", 20;D, 46;D, 58.399999999999999;D, -1, 5;D, 4;D, 53;D, 4.4199999999999999;D, 4.4199999999999999;D;),
                        new CelestialBody("Omega Cap", 20;D, 50;D, 57.5;D, -1, 26;D, 58;D, 27;D, 4.1100000000000003;D, 4.1100000000000003;D;),
                        new CelestialBody("Beta Ind", 20;D, 53;D, 41.100000000000001;D, -1, 58;D, 30;D, 35;D, 3.6499999999999999;D, 3.6499999999999999;D;),
                        new CelestialBody("Ny Cyg", 20;D, 56;D, 37.899999999999999;D, 1, 41;D, 6;D, 40;D, 3.9399999999999999;D, 3.9399999999999999;D;),
                        new CelestialBody("Xi Cyg", 21;D, 4;D, 24.199999999999999;D, 1, 43;D, 52;D, 11;D, 3.7200000000000002;D, 3.7200000000000002;D;),
                        new CelestialBody("Theta Cap", 21;D, 5;D, 8;D, -1, 17;D, 17;D, 28;D, 4.0700000000000003;D, 4.0700000000000003;D;),
                        new CelestialBody("24 Cap", 21;D, 6;D, 16.899999999999999;D, -1, 25;D, 3;D, 52;D, 4.5;D, 4.5;D;),
                        new CelestialBody("Zeta Cyg", 21;D, 12;D, 19.100000000000001;D, 1, 30;D, 10;D, 1.0;D, 3.2000000000000002;D, 3.2000000000000002;D;),
                        new CelestialBody("Delta Equ", 21;D, 13;D, 46.5;D, 1, 9;D, 56;D, 52;D, 4.4900000000000002;D, 4.4900000000000002;D;),
                        new CelestialBody("Tau Cyg", 21;D, 14;D, 12.699999999999999;D, 1, 37;D, 59;D, 0.0;D, 3.7200000000000002;D, 3.7200000000000002;D;),
                        new CelestialBody("Alpha Equ", 21;D, 15;D, 6;D, 1, 5;D, 11;D, 15;D, 3.9199999999999999;D, 3.9199999999999999;D;),
                        new CelestialBody("Sigma Cyg", 21;D, 16;D, 50.700000000000003;D, 1, 39;D, 20;D, 1.0;D, 4.2300000000000004;D, 4.2300000000000004;D;),
                        new CelestialBody("Ypsilon Cyg", 21;D, 17;D, 19.300000000000001;D, 1, 34;D, 50;D, 8;D, 4.4299999999999997;D, 4.4299999999999997;D;),
                        new CelestialBody("Alpha Cep (Alderamin)", 21;D, 18;D, 14.1;D, 1, 62;D, 31;D, 26;D, 2.4399999999999999;D, 2.4399999999999999;D;),
                        new CelestialBody("Theta Ind", 21;D, 18;D, 50.399999999999999;D, -1, 53;D, 30;D, 40;D, 4.3899999999999997;D, 4.3899999999999997;D;),
                        new CelestialBody("1 Peg", 21;D, 21;D, 24.899999999999999;D, 1, 19;D, 44;D, 31;D, 4.0800000000000001;D, 4.0800000000000001;D;),
                        new CelestialBody("Iota Cap", 21;D, 21;D, 26.399999999999999;D, -1, 16;D, 53;D, 49;D, 4.2800000000000002;D, 4.2800000000000002;D;),
                        new CelestialBody("Gamma Pav", 21;D, 25;D, 15.5;D, -1, 65;D, 25;D, 58;D, 4.2199999999999998;D, 4.2199999999999998;D;),
                        new CelestialBody("Zeta Cap", 21;D, 25;D, 50.5;D, -1, 22;D, 28;D, 29;D, 3.7400000000000002;D, 3.7400000000000002;D;),
                        new CelestialBody("Beta Cep", 21;D, 28;D, 28.600000000000001;D, 1, 70;D, 29;D, 49;D, 3.23;D, 3.23;D;),
                        new CelestialBody("Beta Aqr", 21;D, 30;D, 47.799999999999997;D, -1, 5;D, 38;D, 8;D, 2.9100000000000001;D, 2.9100000000000001;D;),
                        new CelestialBody("Rho Cyg", 21;D, 33;D, 26.100000000000001;D, 1, 45;D, 31;D, 39;D, 4.0199999999999996;D, 4.0199999999999996;D;),
                        new CelestialBody("Gamma Cap", 21;D, 39;D, 17.300000000000001;D, -1, 16;D, 43;D, 42;D, 3.6800000000000002;D, 3.6800000000000002;D;),
                        new CelestialBody("Ny Oct", 21;D, 39;D, 54.399999999999999;D, -1, 77;D, 27;D, 19;D, 3.7599999999999998;D, 3.7599999999999998;D;),
                        new CelestialBody("My Cep", 21;D, 43;D, 3.7999999999999998;D, 1, 58;D, 42;D, 48;D, 4.0800000000000001;D, 4.0800000000000001;D;),
                        new CelestialBody("Epsilon Peg", 21;D, 43;D, 28.399999999999999;D, 1, 9;D, 48;D, 29;D, 2.3900000000000001;D, 2.3900000000000001;D;),
                        new CelestialBody("9 Peg", 21;D, 43;D, 49.5;D, 1, 17;D, 16;D, 59;D, 4.3399999999999999;D, 4.3399999999999999;D;),
                        new CelestialBody("Kappa Peg", 21;D, 43;D, 59.299999999999997;D, 1, 25;D, 34;D, 41;D, 4.1299999999999999;D, 4.1299999999999999;D;),
                        new CelestialBody("Iota PsA", 21;D, 44;D, 5.2000000000000002;D, -1, 33;D, 5;D, 33;D, 4.3399999999999999;D, 4.3399999999999999;D;),
                        new CelestialBody("Ny Cep", 21;D, 45;D, 1.8;D, 1, 61;D, 3;D, 13;D, 4.29;D, 4.29;D;),
                        new CelestialBody("Delta Cap", 21;D, 46;D, 14.5;D, -1, 16;D, 11;D, 37;D, 2.8700000000000001;D, 2.8700000000000001;D;),
                        new CelestialBody("Pi2 Cyg", 21;D, 46;D, 15.4;D, 1, 49;D, 14;D, 32;D, 4.2300000000000004;D, 4.2300000000000004;D;),
                        new CelestialBody("Gamma Gru", 21;D, 53;D, 3.2999999999999998;D, -1, 37;D, 26;D, 1.0;D, 3.0099999999999998;D, 3.0099999999999998;D;),
                        new CelestialBody("Delta Ind", 21;D, 56;D, 56.299999999999997;D, -1, 55;D, 3;D, 44;D, 4.4000000000000004;D, 4.4000000000000004;D;),
                        new CelestialBody("Xi Cep", 22;D, 3;D, 22.199999999999999;D, 1, 64;D, 33;D, 25;D, 4.29;D, 4.29;D;),
                        new CelestialBody("Alpha Aqr", 22;D, 5;D, 2.3999999999999999;D, -1, 0.0;D, 23;D, 26;D, 2.96;D, 2.96;D;),
                        new CelestialBody("Lambda Gru", 22;D, 5;D, 14.699999999999999;D, -1, 39;D, 36;D, 49;D, 4.46;D, 4.46;D;),
                        new CelestialBody("Iota Aqr", 22;D, 5;D, 39.299999999999997;D, -1, 13;D, 56;D, 26;D, 4.2699999999999996;D, 4.2699999999999996;D;),
                        new CelestialBody("Iota Peg", 22;D, 6;D, 20.100000000000001;D, 1, 25;D, 16;D, 26;D, 3.7599999999999998;D, 3.7599999999999998;D;),
                        new CelestialBody("Alpha Gru (Alnair)", 22;D, 7;D, 19.5;D, -1, 47;D, 1.0;D, 54;D, 1.74;D, 1.74;D;),
                        new CelestialBody("My PsA", 22;D, 7;D, 32.399999999999999;D, -1, 33;D, 3;D, 35;D, 4.5;D, 4.5;D;),
                        new CelestialBody("Pi Peg", 22;D, 9;D, 20.5;D, 1, 33;D, 6;D, 24;D, 4.29;D, 4.29;D;),
                        new CelestialBody("Theta Peg", 22;D, 9;D, 28.100000000000001;D, 1, 6;D, 7;D, 34;D, 3.5299999999999998;D, 3.5299999999999998;D;),
                        new CelestialBody("Zeta Cep", 22;D, 10;D, 21;D, 1, 58;D, 7;D, 46;D, 3.3500000000000001;D, 3.3500000000000001;D;),
                        new CelestialBody("BS 8485", 22;D, 13;D, 15.300000000000001;D, 1, 39;D, 38;D, 33;D, 4.4900000000000002;D, 4.4900000000000002;D;),
                        new CelestialBody("Epsilon Cep", 22;D, 14;D, 29.800000000000001;D, 1, 56;D, 58;D, 16;D, 4.1900000000000004;D, 4.1900000000000004;D;),
                        new CelestialBody("1 Lac", 22;D, 15;D, 20.199999999999999;D, 1, 37;D, 40;D, 35;D, 4.1299999999999999;D, 4.1299999999999999;D;),
                        new CelestialBody("Theta Aqr", 22;D, 16;D, 4.2000000000000002;D, -1, 7;D, 51;D, 21;D, 4.1600000000000001;D, 4.1600000000000001;D;),
                        new CelestialBody("Alpha Tuc", 22;D, 17;D, 31.100000000000001;D, -1, 60;D, 19;D, 56;D, 2.8599999999999999;D, 2.8599999999999999;D;),
                        new CelestialBody("Gamma Aqr", 22;D, 20;D, 54.5;D, -1, 1.0;D, 27;D, 39;D, 3.8399999999999999;D, 3.8399999999999999;D;),
                        new CelestialBody("Beta Lac", 22;D, 22;D, 59.299999999999997;D, 1, 52;D, 9;D, 22;D, 4.4299999999999997;D, 4.4299999999999997;D;),
                        new CelestialBody("Delta Tuc", 22;D, 26;D, 18.899999999999999;D, -1, 65;D, 2;D, 26;D, 4.4800000000000004;D, 4.4800000000000004;D;),
                        new CelestialBody("Zeta1 Aqr", 22;D, 28;D, 4.9000000000000004;D, -1, 0.0;D, 5;D, 41;D, 3.6499999999999999;D, 3.6499999999999999;D;),
                        new CelestialBody("Zeta2 Aqr", 22;D, 28;D, 5.2999999999999998;D, -1, 0.0;D, 5;D, 41;D, 4.4199999999999999;D, 4.4199999999999999;D;),
                        new CelestialBody("Delta1 Gru", 22;D, 28;D, 24.399999999999999;D, -1, 43;D, 34;D, 12;D, 3.9700000000000002;D, 3.9700000000000002;D;),
                        new CelestialBody("Delta Cep", 22;D, 28;D, 37.799999999999997;D, 1, 58;D, 20;D, 27;D, 3.75;D, 3.75;D;),
                        new CelestialBody("Delta2 Gru", 22;D, 28;D, 53.700000000000003;D, -1, 43;D, 49;D, 26;D, 4.1100000000000003;D, 4.1100000000000003;D;),
                        new CelestialBody("5 Lac", 22;D, 28;D, 55.5;D, 1, 47;D, 37;D, 57;D, 4.3600000000000003;D, 4.3600000000000003;D;),
                        new CelestialBody("Beta PsA", 22;D, 30;D, 41.100000000000001;D, -1, 32;D, 25;D, 14;D, 4.29;D, 4.29;D;),
                        new CelestialBody("Alpha Lac", 22;D, 30;D, 41.5;D, 1, 50;D, 12;D, 28;D, 3.77;D, 3.77;D;),
                        new CelestialBody("Eta Aqr", 22;D, 34;D, 36.700000000000003;D, -1, 0.0;D, 11;D, 33;D, 4.0199999999999996;D, 4.0199999999999996;D;),
                        new CelestialBody("Epsilon PsA", 22;D, 39;D, 51.399999999999999;D, -1, 27;D, 7;D, 10;D, 4.1699999999999999;D, 4.1699999999999999;D;),
                        new CelestialBody("11 Lac", 22;D, 39;D, 52.600000000000001;D, 1, 44;D, 12;D, 2;D, 4.46;D, 4.46;D;),
                        new CelestialBody("Zeta Peg", 22;D, 40;D, 44.299999999999997;D, 1, 10;D, 45;D, 20;D, 3.3999999999999999;D, 3.3999999999999999;D;),
                        new CelestialBody("Beta Gru", 22;D, 41;D, 48.399999999999999;D, -1, 46;D, 57;D, 39;D, 2.1099999999999999;D, 2.1099999999999999;D;),
                        new CelestialBody("Eta Peg", 22;D, 42;D, 19.300000000000001;D, 1, 30;D, 8;D, 43;D, 2.9399999999999999;D, 2.9399999999999999;D;),
                        new CelestialBody("Beta Oct", 22;D, 44;D, 38.100000000000001;D, -1, 81;D, 27;D, 29;D, 4.1500000000000004;D, 4.1500000000000004;D;),
                        new CelestialBody("Lambda Peg", 22;D, 45;D, 49.899999999999999;D, 1, 23;D, 29;D, 21;D, 3.9500000000000002;D, 3.9500000000000002;D;),
                        new CelestialBody("Xi Peg", 22;D, 45;D, 58.100000000000001;D, 1, 12;D, 5;D, 54;D, 4.1900000000000004;D, 4.1900000000000004;D;),
                        new CelestialBody("Epsilon Gru", 22;D, 47;D, 41.100000000000001;D, -1, 51;D, 23;D, 36;D, 3.4900000000000002;D, 3.4900000000000002;D;),
                        new CelestialBody("Tau Aqr", 22;D, 48;D, 49.5;D, -1, 13;D, 40;D, 10;D, 4.0099999999999998;D, 4.0099999999999998;D;),
                        new CelestialBody("Iota Cep", 22;D, 49;D, 9.6999999999999993;D, 1, 66;D, 7;D, 27;D, 3.52;D, 3.52;D;),
                        new CelestialBody("My Peg", 22;D, 49;D, 18.100000000000001;D, 1, 24;D, 31;D, 29;D, 3.48;D, 3.48;D;),
                        new CelestialBody("Gamma PsA", 22;D, 51;D, 43.399999999999999;D, -1, 32;D, 57;D, 10;D, 4.46;D, 4.46;D;),
                        new CelestialBody("Lambda Aqr", 22;D, 51;D, 51.5;D, -1, 7;D, 39;D, 25;D, 3.7400000000000002;D, 3.7400000000000002;D;),
                        new CelestialBody("Delta Aqr", 22;D, 53;D, 52.899999999999999;D, -1, 15;D, 53;D, 53;D, 3.27;D, 3.27;D;),
                        new CelestialBody("Delta PsA", 22;D, 55;D, 8.9000000000000004;D, -1, 32;D, 37;D, 3;D, 4.21;D, 4.21;D;),
                        new CelestialBody("Alpha PsA (Fomalhaut)", 22;D, 56;D, 51.100000000000001;D, -1, 29;D, 41;D, 58;D, 1.1599999999999999;D, 1.1599999999999999;D;),
                        new CelestialBody("Zeta Gru", 23;D, 0.0;D, 1.8;D, -1, 52;D, 49;D, 55;D, 4.1200000000000001;D, 4.1200000000000001;D;),
                        new CelestialBody("Omikron And", 23;D, 1.0;D, 15.1;D, 1, 42;D, 14;D, 53;D, 3.6200000000000001;D, 3.6200000000000001;D;),
                        new CelestialBody("Beta Peg (Scheat)", 23;D, 3;D, 4.2000000000000002;D, 1, 28;D, 0.0;D, 14;D, 2.4199999999999999;D, 2.4199999999999999;D;),
                        new CelestialBody("Alpha Peg (Markab)", 23;D, 4;D, 2.2999999999999998;D, 1, 15;D, 7;D, 37;D, 2.4900000000000002;D, 2.4900000000000002;D;),
                        new CelestialBody("86 Aqr", 23;D, 5;D, 54.200000000000003;D, -1, 23;D, 49;D, 18;D, 4.4699999999999998;D, 4.4699999999999998;D;),
                        new CelestialBody("Theta Gru", 23;D, 6;D, 4;D, -1, 43;D, 35;D, 57;D, 4.2800000000000002;D, 4.2800000000000002;D;),
                        new CelestialBody("Pi Cep", 23;D, 7;D, 26;D, 1, 75;D, 18;D, 33;D, 4.4100000000000001;D, 4.4100000000000001;D;),
                        new CelestialBody("88 Aqr", 23;D, 8;D, 40.5;D, -1, 21;D, 15;D, 5;D, 3.6600000000000001;D, 3.6600000000000001;D;),
                        new CelestialBody("Iota Gru", 23;D, 9;D, 32.5;D, -1, 45;D, 19;D, 31;D, 3.8999999999999999;D, 3.8999999999999999;D;),
                        new CelestialBody("Phi Aqr", 23;D, 13;D, 34.299999999999997;D, -1, 6;D, 7;D, 38;D, 4.2199999999999998;D, 4.2199999999999998;D;),
                        new CelestialBody("Psi1 Aqr", 23;D, 15;D, 7.9000000000000004;D, -1, 9;D, 10;D, 1.0;D, 4.21;D, 4.21;D;),
                        new CelestialBody("Gamma Psc", 23;D, 16;D, 24.800000000000001;D, 1, 3;D, 12;D, 11;D, 3.6899999999999999;D, 3.6899999999999999;D;),
                        new CelestialBody("Gamma Tuc", 23;D, 16;D, 35.399999999999999;D, -1, 58;D, 18;D, 55;D, 3.9900000000000002;D, 3.9900000000000002;D;),
                        new CelestialBody("Psi2 Aqr", 23;D, 17;D, 9;D, -1, 9;D, 15;D, 42;D, 4.3899999999999997;D, 4.3899999999999997;D;),
                        new CelestialBody("Gamma Scl", 23;D, 18;D, 2.6000000000000001;D, -1, 32;D, 36;D, 40;D, 4.4100000000000001;D, 4.4100000000000001;D;),
                        new CelestialBody("98 Aqr", 23;D, 22;D, 12.6;D, -1, 20;D, 10;D, 47;D, 3.9700000000000002;D, 3.9700000000000002;D;),
                        new CelestialBody("Ypsilon Peg", 23;D, 24;D, 39.299999999999997;D, 1, 23;D, 19;D, 27;D, 4.4100000000000001;D, 4.4100000000000001;D;),
                        new CelestialBody("99 Aqr", 23;D, 25;D, 17.100000000000001;D, -1, 20;D, 43;D, 17;D, 4.3899999999999997;D, 4.3899999999999997;D;),
                        new CelestialBody("Theta Psc", 23;D, 27;D, 13.9;D, 1, 6;D, 17;D, 57;D, 4.2800000000000002;D, 4.2800000000000002;D;),
                        new CelestialBody("Beta Scl", 23;D, 32;D, 11.800000000000001;D, -1, 37;D, 53;D, 56;D, 4.3700000000000001;D, 4.3700000000000001;D;),
                        new CelestialBody("Lambda And", 23;D, 36;D, 51.100000000000001;D, 1, 46;D, 22;D, 46;D, 3.8199999999999998;D, 3.8199999999999998;D;),
                        new CelestialBody("Iota And", 23;D, 37;D, 25.300000000000001;D, 1, 43;D, 11;D, 16;D, 4.29;D, 4.29;D;),
                        new CelestialBody("Gamma Cep", 23;D, 38;D, 44.600000000000001;D, 1, 77;D, 33;D, 5;D, 3.21;D, 3.21;D;),
                        new CelestialBody("Iota Psc", 23;D, 39;D, 12.199999999999999;D, 1, 5;D, 32;D, 52;D, 4.1299999999999999;D, 4.1299999999999999;D;),
                        new CelestialBody("Kappa And", 23;D, 39;D, 41.5;D, 1, 44;D, 15;D, 13;D, 4.1399999999999997;D, 4.1399999999999997;D;),
                        new CelestialBody("Lambda Psc", 23;D, 41;D, 18.399999999999999;D, 1, 1.0;D, 42;D, 1.0;D, 4.5;D, 4.5;D;),
                        new CelestialBody("Omega2 Aqr", 23;D, 41;D, 58.299999999999997;D, -1, 14;D, 37;D, 31;D, 4.4900000000000002;D, 4.4900000000000002;D;),
                        new CelestialBody("Omega Psc", 23;D, 58;D, 34;D, 1, 6;D, 46;D, 59;D, 4.0099999999999998;D, 4.0099999999999998;D;),
                        new CelestialBody("Epsilon Tuc", 23;D, 59;D, 10.300000000000001;D, -1, 65;D, 39;D, 28;D, 4.5;D, 4.5;D;)
}
private Planet[]; PLANETS = {
            new Planet("Sun", 0),      // Not a planet, I know
            new Planet("Moon", 1),     // Not a planet, I know
            new Planet("Mercury", 2),
            new Planet("Venus", 3),
            new Planet("Mars", 4),
            new Planet("Jupiter", 5),
            new Planet("Saturn", 6),
            new Planet("Uranus", 7),
            new Planet("Neptune", 8)
    };

    public double; getAltitude(); {
        return altitude;
    }

    public double; getFactor(); {
        return factor;
    }

    public Planet[]; getPlanets(); {
        return PLANETS;
    }

    /*    final String genitiv[][] = {
            {
                "And", "Andromedae"
            }, {
                "Ant", "Antliae"
            }, {
                "Aps", "Apodis"
            }, {
                "Aqr", "Aquarii"
            }, {
                "Aql", "Aquilae"
            }, {
                "Ara", "Arae"
            }, {
                "Ari", "Arietis"
            }, {
                "Aur", "Aurigae"
            }, {
                "Boo", "Bootis"
            }, {
                "Cae", "Caeli"
            }, {
                "Cam", "Camelopardalis"
            }, {
                "Cnc", "Cancri"
            }, {
                "CVn", "Canum Venaticorum"
            }, {
                "CMa", "Canis Maioris"
            }, {
                "CMi", "Canis Minoris"
            }, {
                "Cap", "Capricorni"
            }, {
                "Car", "Carinae"
            }, {
                "Cas", "Cassiopeiae"
            }, {
                "Cen", "Centauri"
            }, {
                "Cep", "Cephei"
            }, {
                "Cet", "Ceti"
            }, {
                "Cha", "Chamaeleontis"
            }, {
                "Cir", "Circini"
            }, {
                "Col", "Columbae"
            }, {
                "Com", "Comae Berenices"
            }, {
                "CrA", "Coronae Australis"
            }, {
                "CrB", "Coronae Borealis"
            }, {
                "Crv", "Corvi"
            }, {
                "Crt", "Crateris"
            }, {
                "Cru", "Crucis"
            }, {
                "Cyg", "Cygni"
            }, {
                "Del", "Delphini"
            }, {
                "Dor", "Doradus"
            }, {
                "Dra", "Draconis"
            }, {
                "Equ", "Equulei"
            }, {
                "Eri", "Eridani"
            }, {
                "For", "Fornacis"
            }, {
                "Gem", "Geminorum"
            }, {
                "Gru", "Gruis"
            }, {
                "Her", "Herculis"
            }, {
                "Hor", "Horologii"
            }, {
                "Hya", "Hydrae"
            }, {
                "Hyi", "Hydri"
            }, {
                "Ind", "Indi"
            }, {
                "Lac", "Lacertae"
            }, {
                "Leo", "Leonis"
            }, {
                "LMi", "Leonis Minoris"
            }, {
                "Lep", "Leporis"
            }, {
                "Lib", "Librae"
            }, {
                "Lup", "Lupi"
            }, {
                "Lyn", "Lyncis"
            }, {
                "Lyr", "Lyrae"
            }, {
                "Men", "Mensae"
            }, {
                "Mic", "Microscopii"
            }, {
                "Mon", "Monocerotis"
            }, {
                "Mus", "Muscae"
            }, {
                "Nor", "Normae"
            }, {
                "Oct", "Octantis"
            }, {
                "Oph", "Ophiuchi"
            }, {
                "Ori", "Orionis"
            }, {
                "Pav", "Pavonis"
            }, {
                "Peg", "Pegasi"
            }, {
                "Per", "Persei"
            }, {
                "Phe", "Phoenicis"
            }, {
                "Pic", "Pictoris"
            }, {
                "Psc", "Piscium"
            }, {
                "PsA", "Piscis Austrini"
            }, {
                "Pup", "Puppis"
            }, {
                "Pyx", "Pyxidis"
            }, {
                "Ret", "Reticuli"
            }, {
                "Sge", "Sagittae"
            }, {
                "Sgr", "Sagittarii"
            }, {
                "Sco", "Scorpii"
            }, {
                "Scl", "Sculptoris"
            }, {
                "Sct", "Scuti"
            }, {
                "Ser", "Serpentis"
            }, {
                "Sex", "Sextantis"
            }, {
                "Tau", "Tauri"
            }, {
                "Tel", "Telescopii"
            }, {
                "Tri", "Trianguli"
            }, {
                "TrA", "Trianguli Australis"
            }, {
                "Tuc", "Tucanae"
            }, {
                "UMa", "Ursae Maioris"
            }, {
                "UMi", "Ursae Minoris"
            }, {
                "Vel", "Velorum"
            }, {
                "Vir", "Virginis"
            }, {
                "Vol", "Volantis"
            }, {
                "Vul", "Vulpeculae"
            }
        };
    */
    public double; getLongitude(); {
        return longitude;
    }

    public double; getLatitude(); {
        return latitude;
    }

    public int; getOffset(); {
        int; offset = getTimeZone().getOffset(lastTime.get(Calendar.ERA),
                        lastTime.get(Calendar.YEAR),
                        lastTime.get(Calendar.MONTH),
                        lastTime.get(Calendar.DAY_OF_MONTH),
                        lastTime.get(Calendar.DAY_OF_WEEK),
                        lastTime.get(Calendar.MILLISECOND)
                );
        return offset;
    }

    public String; toString(); {
        StringBuffer; uudfBuffer = new StringBuffer();
        uudfBuffer.append("<location");
        uudfBuffer.append(" longitude=\"").append(longitude).append("\"");
        uudfBuffer.append(" latitude=\"").append(latitude).append("\"");
        uudfBuffer.append(" azimut=\"").append(azimut).append("\"");
        uudfBuffer.append(" altitude=\"").append(altitude).append("\"");
        uudfBuffer.append("/>");
        uudfBuffer.append("\n");
        uudfBuffer.append(super.toString());
        return uudfBuffer.toString();
    }

    public int; getZoomFactor(); {
        return (int); factor;
    }
}
