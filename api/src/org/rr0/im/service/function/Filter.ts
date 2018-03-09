/**
 * A filter in which data can fall.
 */
export interface Filter extends Function {
  /**
   * Check if an object is acepted by this filter.
   *
   * @param filterable The object to classify
   * @return If the classifiable belongs to this category.
   */
  accept(filterable: Object): boolean;
}
