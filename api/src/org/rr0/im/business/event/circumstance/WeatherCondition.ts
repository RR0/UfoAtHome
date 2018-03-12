import {Clouds} from "./Clouds";
import {Temperature} from "./Temperature";
import {Wind} from "./Wind";
import {Precipitations} from "./Precipitations";

export interface WeatherCondition {
  getClouds(): Clouds;

  getTemperature(): Temperature;

  getWind(): Wind;

  getPrecipitations(): Precipitations;
}
