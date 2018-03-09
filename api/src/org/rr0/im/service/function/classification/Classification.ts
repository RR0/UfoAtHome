import {Category} from "./Category";

/**
 * A named function system.
 * Such a function contains one or more mutualy exclusive categories.
 */
export interface Classification extends Function {
  /**
   * Add a category to this Classification
   *
   * @param someCategory
   */
  add(someCategory: Category): void;

  getName(): String;

  /**
   * @associates <{org.rr0.im.service.function.classification.Category}>
   * @supplierCardinality 1..*
   * @link aggregation
   */
  getCategories(): Category[];

  /**
   * Returns the Category of a Classifiable object.
   *
   * @param classifiable A Classifiable object
   * @return The object Category in this Classification
   */
  getCategory(classifiable: Object): Category;

  /** @link dependency */
  /*# Classifiable lnkClassifiable; */
}
