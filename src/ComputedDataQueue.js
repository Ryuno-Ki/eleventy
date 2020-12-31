const DependencyGraph = require("dependency-graph").DepGraph;

/**
 * @module 11ty/eleventy/ComputedDataQueue
 */

/**
 * Keeps track of the dependency graph between computed data variables
 * Removes keys from the graph when they are computed.
 */
class ComputedDataQueue {
  constructor() {
    this.graph = new DependencyGraph();
  }

  /**
   * Retrieves the overall order of the graph.
   *
   * @return {Array<string>}
   */
  getOrder() {
    return this.graph.overallOrder();
  }

  /**
   * Get the order for dependencies of given name.
   *
   * @param {string} name
   * @return {Array<string>}
   */
  getOrderFor(name) {
    return this.graph.dependenciesOf(name);
  }

  /**
   * Get the order for dependants of given name.
   *
   * @param {string} name
   * @return {Array<string>}
   */
  getDependsOn(name) {
    return this.graph.dependantsOf(name);
  }

  /**
   * tbd.
   *
   * @param {string} name
   * @param {string} prefix
   * @return {boolean}
   */
  isUsesStartsWith(name, prefix) {
    if (name.startsWith(prefix)) {
      return true;
    }
    return (
      this.graph.dependenciesOf(name).filter((entry) => {
        return entry.startsWith(prefix);
      }).length > 0
    );
  }

  /**
   * Adds a new node to the dependency graph with given name.
   *
   * @param {string} name
   */
  addNode(name) {
    if (!this.graph.hasNode(name)) {
      this.graph.addNode(name);
    }
  }

  /**
   * tbd.
   *
   * @private
   * @param {DependencyGraph<*>} graph
   * @param {string} name
   * @param {Array<string>} varsUsed
   */
  _uses(graph, name, varsUsed = []) {
    if (!graph.hasNode(name)) {
      graph.addNode(name);
    }

    for (let varUsed of varsUsed) {
      if (!graph.hasNode(varUsed)) {
        graph.addNode(varUsed);
      }
      graph.addDependency(name, varUsed);
    }
  }

  /**
   * tbd.
   *
   * @param {string} name
   * @param {Array<string>} varsUsed
   */
  uses(name, varsUsed = []) {
    this._uses(this.graph, name, varsUsed);
  }

  /**
   * Flag certain nodes as already computed.
   *
   * @param {Array<string>} varsComputed
   */
  markComputed(varsComputed = []) {
    for (let varComputed of varsComputed) {
      this.graph.removeNode(varComputed);
    }
  }
}

module.exports = ComputedDataQueue;
