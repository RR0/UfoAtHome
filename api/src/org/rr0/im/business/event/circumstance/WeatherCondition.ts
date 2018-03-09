import {Clouds} from "./Clouds";
import {Temperature} from "./Temperature";
import {Wind} from "./Wind";

export interface WeatherCondition {
  getClouds(): Clouds;

  getTemperature(): Temperature;

  getWind(): Wind;

  getPrecipitations(): Precipitations;
}
