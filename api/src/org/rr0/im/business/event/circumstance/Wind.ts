import {Classifiable} from "../../../service/function/classification/Classifiable";

export interface Wind extends Classifiable {
  getSpeed(): number;
}
