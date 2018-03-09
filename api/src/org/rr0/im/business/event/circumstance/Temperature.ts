import {Classifiable} from "../../../service/function/classification/Classifiable";

export interface Temperature extends Classifiable {
  getCelcius (): number;
  getFarenheit (): number;
}
