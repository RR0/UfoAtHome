package org.rr0.ufoathome.view.gui;

import java.util.SimpleTimeZone;
import java.util.TimeZone;

class Place {
    public static final Country COUNTRIES [] = {
        new Country("Belgique"),
        new Country("Canada"),
        new Country("France"),
    };
    private static final Country BELGIUM = COUNTRIES[0];
    private static final Country CANADA = COUNTRIES[1];
    private static final Country FRANCE = COUNTRIES[2];

    public static final Place PLACES [] = {
        new Place(BELGIUM, "Anvers", 51.217F, 4.417F, +1),
        new Place(BELGIUM, "Bruges", 51.217F, 3.233F, +1),
        new Place(BELGIUM, "Bruxelles", 50.833F, 4.333F, +1),
        new Place(BELGIUM, "Charleroi", 50.417F, 4.433F, +1),
        new Place(BELGIUM, "Courtrai", 50.833F, 3.267F, +1),
        new Place(BELGIUM, "Gand", 51.05F, 3.717F, +1),
        new Place(BELGIUM, "Hasselt", 51.2F, 5.417F, +1),
        new Place(BELGIUM, "Liège", 50.633F, 5.567F, +1),
        new Place(BELGIUM, "Mons", 50.45F, 3.933F, +1),
        new Place(BELGIUM, "Namur", 50.467F, 4.867F, +1),
        new Place(BELGIUM, "Ostend", 51.217F, 2.917F, +1),
        new Place(BELGIUM, "Turnhout", 51.317F, 4.95F, +1),
        new Place(BELGIUM, "Wavre", 50.933F, 4.1F, +1),
        new Place(CANADA, "Brampton", 43.683F, -79.767F, -5),
        new Place(CANADA, "Burnaby", 49.25F, -122.95F, -8),
        new Place(CANADA, "Calgary", 51.083F, -114.083F, -7),
        new Place(CANADA, "Edmonton", 53.55F, -113.5F, -7),
        new Place(CANADA, "Gatineau", 45.483F, -75.65F, -5),
        new Place(CANADA, "Hamilton", 43.25F, -79.833F, -5),
        new Place(CANADA, "Kitchener", 43.45F, -80.5F, -5),
        new Place(CANADA, "Laval", 45.6F, -73.733F, -5),
        new Place(CANADA, "London", 42.983F, -81.25F, -5),
        new Place(CANADA, "Longueuil", 45.533F, -73.517F, -5),
        new Place(CANADA, "Markham", 43.867F, -79.267F, -5),
        new Place(CANADA, "Mississauga", 43.15F, -79.5F, -5),
        new Place(CANADA, "Montréal", 45.5F, -73.583F, -5),
        new Place(CANADA, "Ottawa", 45.417F, -75.7F, -5),
        new Place(CANADA, "Québec", 46.8F, -71.25F, -5),
        new Place(CANADA, "Surrey", 46.067F, -62.817F, -4),
        new Place(CANADA, "Toronto", 43.667F, -79.417F, -5),
        new Place(CANADA, "Vancouver", 49.25F, -123.133F, -8),
        new Place(CANADA, "Winnipeg", 49.883F, -97.167F, -6),
        new Place(FRANCE, "Agen", 44.18F, 0.65F, +1),
        new Place(FRANCE, "Aix-en-Provence", 43.53F, 5.43F, +1),
        new Place(FRANCE, "Ajaccio", 41.93F, 8.72F, +1),
        new Place(FRANCE, "Albi", 43.93F, 2.15F, +1),
        new Place(FRANCE, "Alençon", 48.42F, 0.08F, +1),
        new Place(FRANCE, "Amiens", 49.88F, 2.3F, +1),
        new Place(FRANCE, "Angers", 47.48F, -0.53F, +1),
        new Place(FRANCE, "Angoulème", 45.83F, -0.17F, +1),
        new Place(FRANCE, "Arles", 43.68F, 4.63F, +1),
        new Place(FRANCE, "Arras", 50.28F, 2.77F, +1),
        new Place(FRANCE, "Aurillac", 44.93F, 2.43F, +1),
        new Place(FRANCE, "Annecy", 45.9F, 6.12F, +1),
        new Place(FRANCE, "Auxerre", 47.82F, 3.58F, +1),
        new Place(FRANCE, "Avignon", 43.93F, 4.8F, +1),
        new Place(FRANCE, "Bastia", 42.68F, 9.45F, +1),
        new Place(FRANCE, "Bayonne", 43.5F, -1.93F, +1),
        new Place(FRANCE, "Belfort", 47.63F, 6.87F, +1),
        new Place(FRANCE, "Besançon", 47.23F, 6.03F, +1),
        new Place(FRANCE, "Béziers", 43.35F, 3.22F, +1),
        new Place(FRANCE, "Biarritz", 43.48F, -1.55F, +1),
        new Place(FRANCE, "Bordeaux", 44.83F, -0.57F, +1),
        new Place(FRANCE, "Boulogne", 50.72F, 1.62F, +1),
        new Place(FRANCE, "Bourges", 47.08F, 2.38F, +1),
        new Place(FRANCE, "Brest", 48.4F, -4.5F, +1),
        new Place(FRANCE, "Brive-la-gaillarde", 45.15F, 1.55F, +1),
        new Place(FRANCE, "Caen", 49.18F, -0.36F, +1),
        new Place(FRANCE, "Calais", 50.95F, 1.87F, +1),
        new Place(FRANCE, "Cambrai", 50.17F, 3.23F, +1),
        new Place(FRANCE, "Carcassone", 43.22F, 2.35F, +1),
        new Place(FRANCE, "Chalon-sur-saône", 46.78F, 4.85F, +1),
        new Place(FRANCE, "Cannes", 43.55F, 7F, +1),
        new Place(FRANCE, "Chartres", 48.45F, 1.5F, +1),
        new Place(FRANCE, "Chambery", 45.55F, 5.92F, +1),
        new Place(FRANCE, "Cherbourg", 49.63F, -1.62F, +1),
        new Place(FRANCE, "Clermont-Ferrand", 45.78F, 3.08F, +1),
        new Place(FRANCE, "Colmar", 48.08F, 7.35F, +1),
        new Place(FRANCE, "Dieppe", 49.92F, 1.08F, +1),
        new Place(FRANCE, "Digne", 44.05F, 6.23F, +1),
        new Place(FRANCE, "Dijon", 47.32F, 5.02F, +1),
        new Place(FRANCE, "Dunkerque", 51.03F, 2.37F, +1),
        new Place(FRANCE, "Epinal", 48.18F, 6.47F, +1),
        new Place(FRANCE, "Gap", 44.55F, 6.08F, +1),
        new Place(FRANCE, "Grenoble", 45.18F, 5.72F, +1),
        new Place(FRANCE, "Laval", 48.07F, -0.75F, +1),
        new Place(FRANCE, "La Rochelle", 46.17F, -1.15F, +1),
        new Place(FRANCE, "Le Havre", 49.5F, 0.1F, +1),
        new Place(FRANCE, "Le Mans", 48.02F, -0.2F, +1),
        new Place(FRANCE, "Lens", 50.43F, 2.83F, +1),
        new Place(FRANCE, "Lille", 50.63F, 3.07F, +1),
        new Place(FRANCE, "Limoges", 45.82F, 1.23F, +1),
        new Place(FRANCE, "Lorient", 47.75F, -3.35F, +1),
        new Place(FRANCE, "Lyon", 45.77F, 4.83F, +1),
        new Place(FRANCE, "Mâcon", 46.3F, 4.83F, +1),
        new Place(FRANCE, "Marseille", 43.3F, 5.37F, +1),
        new Place(FRANCE, "Metz", 49.12F, 6.18F, +1),
        new Place(FRANCE, "Monaco", 43.72F, 7.43F, +1),
        new Place(FRANCE, "Montauban", 44.02F, 1.33F, +1),
        new Place(FRANCE, "Montélimar", 44.55F, 4.75F, +1),
        new Place(FRANCE, "Montluçon", 46.33F, 2.6F, +1),
        new Place(FRANCE, "Montbéliard", 47.52F, 6.8F, +1),
        new Place(FRANCE, "Montpellier", 43.6F, 3.87F, +1),
        new Place(FRANCE, "Mulhouse", 47.75F, 7.35F, +1),
        new Place(FRANCE, "Nancy", 48.7F, 6.2F, +1),
        new Place(FRANCE, "Nantes", 47.23F, -1.58F, +1),
        new Place(FRANCE, "Narbonne", 43.18F, 3F, +1),
        new Place(FRANCE, "Nevers", 47F, 3.15F, +1),
        new Place(FRANCE, "Nice", 43.7F, 7.27F, +1),
        new Place(FRANCE, "Nîmes", 43.83F, 4.35F, +1),
        new Place(FRANCE, "Orléans", 47.9F, 1.9F, +1),
        new Place(FRANCE, "Paris", 48.87F, 2.33F, +1),
        new Place(FRANCE, "Pau", 43.3F, -0.37F, +1),
        new Place(FRANCE, "Périgueux", 45.2F, 0.73F, +1),
        new Place(FRANCE, "Perpignan", 45.7F, 2.9F, +1),
        new Place(FRANCE, "Poitiers", 46.58F, -0.33F, +1),
        new Place(FRANCE, "Quimper", 48F, -4.1F, +1),
        new Place(FRANCE, "Reims", 49.25F, 4.08F, +1),
        new Place(FRANCE, "Rennes", 48.08F, -1.68F, +1),
        new Place(FRANCE, "Roanne", 46.03F, 4.08F, +1),
        new Place(FRANCE, "Rodez", 44.35F, 2.57F, +1),
        new Place(FRANCE, "Rouen", 49.43F, 1.08F, +1),
        new Place(FRANCE, "Saint-Brieuc", 48.53F, -2.75F, +1),
        new Place(FRANCE, "Saint-Dizier", 48.63F, 4.97F, +1),
        new Place(FRANCE, "Saint-Etienne", 45.43F, 4.38F, +1),
        new Place(FRANCE, "Saint-Nazaire", 47.28F, -2.2F, +1),
        new Place(FRANCE, "Saint-Quentin", 49.85F, 3.28F, +1),
        new Place(FRANCE, "Sedan", 49.7F, 4.95F, +1),
        new Place(FRANCE, "Sens", 48.3F, 3.3F, +1),
        new Place(FRANCE, "Strasbourg", 48.58F, 7.75F, +1),
        new Place(FRANCE, "Tarbes", 43.23F, -0.08F, +1),
        new Place(FRANCE, "Toulon", 43.12F, 5.93F, +1),
        new Place(FRANCE, "Toulouse", 43.62F, 1.45F, +1),
        new Place(FRANCE, "Tours", 47.38F, 0.68F, +1),
        new Place(FRANCE, "Troyes", 48.3F, 4.8F, +1),
        new Place(FRANCE, "Valence", 44.93F, 4.9F, +1),
        new Place(FRANCE, "Valenciennes", 50.37F, 3.53F, +1),
        new Place(FRANCE, "Vannes", 47.67F, -2.73F, +1)
    };

    public Place(Country country, String someName, float someLatitude, float someLongitude, int rawOffset) {
        this.country = country;
        name = someName;
        timeZone = new SimpleTimeZone(rawOffset, "GMT");
//        longitude = (someLongitude * 2.0F * 3.141593F) / 360F;
//        latitude = (someLatitude * 2.0F * 3.141593F) / 360F;
        longideg = someLongitude;
        latdeg = someLatitude;
    }

//    private float longitude;
//    private float latitude;
    private String name;
    private Country country;

    public String getName() {
        return name;
    }

    public TimeZone getTimeZone() {
        return timeZone;
    }

    public Country getCountry() {
        return country;
    }

    public float getLongideg() {
        return longideg;
    }

    public float getLatdeg() {
        return latdeg;
    }

    private float longideg;
    private float latdeg;
    private TimeZone timeZone;
}
