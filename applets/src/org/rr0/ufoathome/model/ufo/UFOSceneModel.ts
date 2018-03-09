import {UFO} from "./UFO";
import {SkyModel} from "../sky/SkyModel";
import {WitnessModel} from "./WitnessModel";

export class UFOSceneModel extends SkyModel {
  private buildings = new Hashtable();
  protected descriptions = new Hashtable();
  protected witness = new WitnessModel();

  public createUFO(name: String): UFO {
    const ufo = new UFO(name);
    this.sources.put(name, ufo);
    return ufo;
  }

  public getBuidling(objectName: String): MapElement {
    return <MapElement>this.buildings.get(objectName);
  }

  public setDescription(timeKey: String, description: String) {
    this.descriptions.put(timeKey, description);
  }

  public getDescription(timeKey: String): String {
    return <String> this.descriptions.get(timeKey);
  }

  public getWitness(): WitnessModel {
    return this.witness;
  }
}
