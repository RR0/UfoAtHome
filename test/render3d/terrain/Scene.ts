import type { Surroundings, SurveyedBridge, SurveyedBuilding, SurveyedLine, SurveyedTree } from "../../../src/render3d/terrain/SurroundingsProvider.js"

/** What a survey found, in a test: the parts it found, and nothing for the rest. */
export class Scene {
  static of(trees: SurveyedTree[] = [], buildings: SurveyedBuilding[] = [], bridges: SurveyedBridge[] = [], lines: SurveyedLine[] = []): Surroundings {
    return { trees, buildings, bridges, lines }
  }
}
