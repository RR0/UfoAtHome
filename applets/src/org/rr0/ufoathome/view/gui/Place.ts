import {TimeZone} from "../../TimeZone";
import {Country} from "./Country";

export class Place {
  public static COUNTRIES = [
    new Country("Belgique"),
    new Country("Canada"),
    new Country("Place.FRANCE"),
  ];
  private static BELGIUM = this.COUNTRIES[0];
  private static CANADA = this.COUNTRIES[1];
  private static FRANCE = this.COUNTRIES[2];

  public static PLACES = [
    new Place(Place.BELGIUM, "Anvers", 51.217, 4.417, +1),
    new Place(Place.BELGIUM, "Bruges", 51.217, 3.233, +1),
    new Place(Place.BELGIUM, "Bruxelles", 50.833, 4.333, +1),
    new Place(Place.BELGIUM, "Charleroi", 50.417, 4.433, +1),
    new Place(Place.BELGIUM, "Courtrai", 50.833, 3.267, +1),
    new Place(Place.BELGIUM, "Gand", 51.05, 3.717, +1),
    new Place(Place.BELGIUM, "Hasselt", 51.2, 5.417, +1),
    new Place(Place.BELGIUM, "Li�ge", 50.633, 5.567, +1),
    new Place(Place.BELGIUM, "Mons", 50.45, 3.933, +1),
    new Place(Place.BELGIUM, "Namur", 50.467, 4.867, +1),
    new Place(Place.BELGIUM, "Ostend", 51.217, 2.917, +1),
    new Place(Place.BELGIUM, "Turnhout", 51.317, 4.95, +1),
    new Place(Place.BELGIUM, "Wavre", 50.933, 4.1, +1),
    new Place(Place.CANADA, "Brampton", 43.683, -79.767, -5),
    new Place(Place.CANADA, "Burnaby", 49.25, -122.95, -8),
    new Place(Place.CANADA, "Calgary", 51.083, -114.083, -7),
    new Place(Place.CANADA, "Edmonton", 53.55, -113.5, -7),
    new Place(Place.CANADA, "Gatineau", 45.483, -75.65, -5),
    new Place(Place.CANADA, "Hamilton", 43.25, -79.833, -5),
    new Place(Place.CANADA, "Kitchener", 43.45, -80.5, -5),
    new Place(Place.CANADA, "Laval", 45.6, -73.733, -5),
    new Place(Place.CANADA, "London", 42.983, -81.25, -5),
    new Place(Place.CANADA, "Longueuil", 45.533, -73.517, -5),
    new Place(Place.CANADA, "Markham", 43.867, -79.267, -5),
    new Place(Place.CANADA, "Mississauga", 43.15, -79.5, -5),
    new Place(Place.CANADA, "Montr�al", 45.5, -73.583, -5),
    new Place(Place.CANADA, "Ottawa", 45.417, -75.7, -5),
    new Place(Place.CANADA, "Qu�bec", 46.8, -71.25, -5),
    new Place(Place.CANADA, "Surrey", 46.067, -62.817, -4),
    new Place(Place.CANADA, "Toronto", 43.667, -79.417, -5),
    new Place(Place.CANADA, "Vancouver", 49.25, -123.133, -8),
    new Place(Place.CANADA, "Winnipeg", 49.883, -97.167, -6),
    new Place(Place.FRANCE, "Agen", 44.18, 0.65, +1),
    new Place(Place.FRANCE, "Aix-en-Provence", 43.53, 5.43, +1),
    new Place(Place.FRANCE, "Ajaccio", 41.93, 8.72, +1),
    new Place(Place.FRANCE, "Albi", 43.93, 2.15, +1),
    new Place(Place.FRANCE, "Alen�on", 48.42, 0.08, +1),
    new Place(Place.FRANCE, "Amiens", 49.88, 2.3, +1),
    new Place(Place.FRANCE, "Angers", 47.48, -0.53, +1),
    new Place(Place.FRANCE, "Angoul�me", 45.83, -0.17, +1),
    new Place(Place.FRANCE, "Arles", 43.68, 4.63, +1),
    new Place(Place.FRANCE, "Arras", 50.28, 2.77, +1),
    new Place(Place.FRANCE, "Aurillac", 44.93, 2.43, +1),
    new Place(Place.FRANCE, "Annecy", 45.9, 6.12, +1),
    new Place(Place.FRANCE, "Auxerre", 47.82, 3.58, +1),
    new Place(Place.FRANCE, "Avignon", 43.93, 4.8, +1),
    new Place(Place.FRANCE, "Bastia", 42.68, 9.45, +1),
    new Place(Place.FRANCE, "Bayonne", 43.5, -1.93, +1),
    new Place(Place.FRANCE, "Belfort", 47.63, 6.87, +1),
    new Place(Place.FRANCE, "Besan�on", 47.23, 6.03, +1),
    new Place(Place.FRANCE, "B�ziers", 43.35, 3.22, +1),
    new Place(Place.FRANCE, "Biarritz", 43.48, -1.55, +1),
    new Place(Place.FRANCE, "Bordeaux", 44.83, -0.57, +1),
    new Place(Place.FRANCE, "Boulogne", 50.72, 1.62, +1),
    new Place(Place.FRANCE, "Bourges", 47.08, 2.38, +1),
    new Place(Place.FRANCE, "Brest", 48.4, -4.5, +1),
    new Place(Place.FRANCE, "Brive-la-gaillarde", 45.15, 1.55, +1),
    new Place(Place.FRANCE, "Caen", 49.18, -0.36, +1),
    new Place(Place.FRANCE, "Calais", 50.95, 1.87, +1),
    new Place(Place.FRANCE, "Cambrai", 50.17, 3.23, +1),
    new Place(Place.FRANCE, "Carcassone", 43.22, 2.35, +1),
    new Place(Place.FRANCE, "Chalon-sur-sa�ne", 46.78, 4.85, +1),
    new Place(Place.FRANCE, "Cannes", 43.55, 7, +1),
    new Place(Place.FRANCE, "Chartres", 48.45, 1.5, +1),
    new Place(Place.FRANCE, "Chambery", 45.55, 5.92, +1),
    new Place(Place.FRANCE, "Cherbourg", 49.63, -1.62, +1),
    new Place(Place.FRANCE, "Clermont-Ferrand", 45.78, 3.08, +1),
    new Place(Place.FRANCE, "Colmar", 48.08, 7.35, +1),
    new Place(Place.FRANCE, "Dieppe", 49.92, 1.08, +1),
    new Place(Place.FRANCE, "Digne", 44.05, 6.23, +1),
    new Place(Place.FRANCE, "Dijon", 47.32, 5.02, +1),
    new Place(Place.FRANCE, "Dunkerque", 51.03, 2.37, +1),
    new Place(Place.FRANCE, "Epinal", 48.18, 6.47, +1),
    new Place(Place.FRANCE, "Gap", 44.55, 6.08, +1),
    new Place(Place.FRANCE, "Grenoble", 45.18, 5.72, +1),
    new Place(Place.FRANCE, "Laval", 48.07, -0.75, +1),
    new Place(Place.FRANCE, "La Rochelle", 46.17, -1.15, +1),
    new Place(Place.FRANCE, "Le Havre", 49.5, 0.1, +1),
    new Place(Place.FRANCE, "Le Mans", 48.02, -0.2, +1),
    new Place(Place.FRANCE, "Lens", 50.43, 2.83, +1),
    new Place(Place.FRANCE, "Lille", 50.63, 3.07, +1),
    new Place(Place.FRANCE, "Limoges", 45.82, 1.23, +1),
    new Place(Place.FRANCE, "Lorient", 47.75, -3.35, +1),
    new Place(Place.FRANCE, "Lyon", 45.77, 4.83, +1),
    new Place(Place.FRANCE, "M�con", 46.3, 4.83, +1),
    new Place(Place.FRANCE, "Marseille", 43.3, 5.37, +1),
    new Place(Place.FRANCE, "Metz", 49.12, 6.18, +1),
    new Place(Place.FRANCE, "Monaco", 43.72, 7.43, +1),
    new Place(Place.FRANCE, "Montauban", 44.02, 1.33, +1),
    new Place(Place.FRANCE, "Mont�limar", 44.55, 4.75, +1),
    new Place(Place.FRANCE, "Montlu�on", 46.33, 2.6, +1),
    new Place(Place.FRANCE, "Montb�liard", 47.52, 6.8, +1),
    new Place(Place.FRANCE, "Montpellier", 43.6, 3.87, +1),
    new Place(Place.FRANCE, "Mulhouse", 47.75, 7.35, +1),
    new Place(Place.FRANCE, "Nancy", 48.7, 6.2, +1),
    new Place(Place.FRANCE, "Nantes", 47.23, -1.58, +1),
    new Place(Place.FRANCE, "Narbonne", 43.18, 3, +1),
    new Place(Place.FRANCE, "Nevers", 47, 3.15, +1),
    new Place(Place.FRANCE, "Nice", 43.7, 7.27, +1),
    new Place(Place.FRANCE, "N�mes", 43.83, 4.35, +1),
    new Place(Place.FRANCE, "Orl�ans", 47.9, 1.9, +1),
    new Place(Place.FRANCE, "Paris", 48.87, 2.33, +1),
    new Place(Place.FRANCE, "Pau", 43.3, -0.37, +1),
    new Place(Place.FRANCE, "P�rigueux", 45.2, 0.73, +1),
    new Place(Place.FRANCE, "Perpignan", 45.7, 2.9, +1),
    new Place(Place.FRANCE, "Poitiers", 46.58, -0.33, +1),
    new Place(Place.FRANCE, "Quimper", 48, -4.1, +1),
    new Place(Place.FRANCE, "Reims", 49.25, 4.08, +1),
    new Place(Place.FRANCE, "Rennes", 48.08, -1.68, +1),
    new Place(Place.FRANCE, "Roanne", 46.03, 4.08, +1),
    new Place(Place.FRANCE, "Rodez", 44.35, 2.57, +1),
    new Place(Place.FRANCE, "Rouen", 49.43, 1.08, +1),
    new Place(Place.FRANCE, "Saint-Brieuc", 48.53, -2.75, +1),
    new Place(Place.FRANCE, "Saint-Dizier", 48.63, 4.97, +1),
    new Place(Place.FRANCE, "Saint-Etienne", 45.43, 4.38, +1),
    new Place(Place.FRANCE, "Saint-Nazaire", 47.28, -2.2, +1),
    new Place(Place.FRANCE, "Saint-Quentin", 49.85, 3.28, +1),
    new Place(Place.FRANCE, "Sedan", 49.7, 4.95, +1),
    new Place(Place.FRANCE, "Sens", 48.3, 3.3, +1),
    new Place(Place.FRANCE, "Strasbourg", 48.58, 7.75, +1),
    new Place(Place.FRANCE, "Tarbes", 43.23, -0.08, +1),
    new Place(Place.FRANCE, "Toulon", 43.12, 5.93, +1),
    new Place(Place.FRANCE, "Toulouse", 43.62, 1.45, +1),
    new Place(Place.FRANCE, "Tours", 47.38, 0.68, +1),
    new Place(Place.FRANCE, "Troyes", 48.3, 4.8, +1),
    new Place(Place.FRANCE, "Valence", 44.93, 4.9, +1),
    new Place(Place.FRANCE, "Valenciennes", 50.37, 3.53, +1),
    new Place(Place.FRANCE, "Vannes", 47.67, -2.73, +1)
  ];

  constructor(country: Country, someName: String, someLatitude: number, someLongitude: number, rawOffset: number) {
    this.country = country;
    this.name = someName;
    this.timeZone = new SimpleTimeZone(rawOffset, "GMT");
//        longitude = (someLongitude * 2.0F * 3.141593F) / 360F;
//        latitude = (someLatitude * 2.0F * 3.141593F) / 360F;
    this.longideg = someLongitude;
    this.latdeg = someLatitude;
  }

//    private float longitude;
//    private float latitude;
  private name: String;
  private country: Country;

  public getName(): String {
    return name;
  }

  public getTimeZone(): TimeZone {
    return this.timeZone;
  }

  public getCountry(): Country {
    return this.country;
  }

  public getLongideg(): number {
    return this.longideg;
  }

  public getLatdeg(): number {
    return this.latdeg;
  }

  private longideg: number;
  private latdeg: number;
  private timeZone: TimeZone;
}
