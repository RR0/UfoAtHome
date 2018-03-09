import {Runnable} from "./Runnable";

export interface Precipitations extends Runnable {
  start(): void;

  stop(): void;

  init(): void;

  //paint(g: Graphics): void;

  setWindFactor(windFactor: number): void;
}
