const { performance } = require("perf_hooks");

const BenchmarkGroup = require("./BenchmarkGroup");

/**
 * @module 11ty/eleventy/BenchmarkManager
 */

/**
 * Manages instances of BenchmarkGroup
 */
class BenchmarkManager {
  constructor() {
    /** @type {Object<string, BenchmarkGroup>} */
    this.benchmarkGroups = {};
    this.isVerbose = true;
    this.start = this.getNewTimestamp();
  }

  /**
   * Resets all BenchmarkGroups
   */
  reset() {
    this.start = this.getNewTimestamp();

    for (var j in this.benchmarkGroups) {
      this.benchmarkGroups[j].reset();
    }
  }

  /**
   * Creates a new timestamp in milliseconds.
   *
   * @return number
   */
  getNewTimestamp() {
    if (performance) {
      return performance.now();
    }
    return new Date().getTime();
  }

  /**
   * Sets the verbosity level.
   *
   * @param {boolean} isVerbose
   */
  setVerboseOutput(isVerbose) {
    this.isVerbose = !!isVerbose;
  }

  /**
   * Get or creates a new BenchmarkGroup.
   *
   * @param {string} name The name of the BenchmarkGroup
   * @return {BenchmarkGroup}
   */
  getBenchmarkGroup(name) {
    if (!this.benchmarkGroups[name]) {
      this.benchmarkGroups[name] = new BenchmarkGroup();

      // Special behavior for aggregate benchmarks
      // so they don’t console.log every time
      if (name === "Aggregate") {
        this.benchmarkGroups[name].setIsVerbose(false);
      } else {
        this.benchmarkGroups[name].setIsVerbose(this.isVerbose);
      }
    }

    return this.benchmarkGroups[name];
  }

  /**
   * Retrieves all BenchmarkGroups.
   *
   * @return {Object<string, BenchmarkGroup>}
   */
  getAll() {
    return this.benchmarkGroups;
  }

  /**
   * Get one or many BenchmarkGroups.
   *
   * @param {string?} name The name of the BenchmarkGroup
   * @return {BenchmarkGroup|Object<string, BenchmarkGroup>}
   */
  get(name) {
    if (name) {
      return this.getBenchmarkGroup(name);
    }

    return this.getAll();
  }

  /**
   * Mark all BenchmarkGroups as finished.
   */
  finish() {
    let totalTimeSpentBenchmarking = this.getNewTimestamp() - this.start;
    for (var j in this.benchmarkGroups) {
      this.benchmarkGroups[j].finish(j, totalTimeSpentBenchmarking);
    }
  }
}

let manager = new BenchmarkManager();
module.exports = manager;
