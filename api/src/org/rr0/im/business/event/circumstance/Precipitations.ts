import {Classifiable} from "../../../service/function/classification/Classifiable";

export interface Precipitations extends Classifiable {
  getMilimeters (): number;

  /**
   * @return The expected visibility given that Precipitations
   */
  getVisibility(): number;

  /**
   * @return The expected humidity given that Precipitations
   */
  getHumidity(): number;
}
