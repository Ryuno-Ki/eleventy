const chalk = require("chalk");

const Benchmark = require("./Benchmark");
const debugBenchmark = require("debug")("Eleventy:Benchmark");

/**
 * @module 11ty/eleventy/BenchmarkGroup
 */

/**
 * Group instances of {@link 11ty/eleventy/Benchmark~Benchmark|Benchmark}s
 */
class BenchmarkGroup {
  constructor() {
    /** @type {Object<string, Benchmark>} */
    this.benchmarks = {};
    /**
     * Warning: aggregate benchmarks automatically default to false via BenchmarkManager->getBenchmarkGroup
     */
    this.isVerbose = true;
    this.minimumThresholdMs = 0;
    this.minimumThresholdPercent = 8;
  }

  /**
   * Determines the new verbosity.
   *
   * @param {boolean} isVerbose
   */
  setIsVerbose(isVerbose) {
    this.isVerbose = isVerbose;
  }

  /**
   * Resets all benchmarks.
   */
  reset() {
    for (var type in this.benchmarks) {
      this.benchmarks[type].reset();
    }
  }

  // TODO use addAsync everywhere instead
  /**
   *
   * @param {string}   type Sets new Benchmark for this type
   * @param {*} callback The code to benchmark
   */
  add(type, callback) {
    let benchmark = (this.benchmarks[type] = new Benchmark());

    // @ts-ignore
    return function (...args) {
      benchmark.before();
      // TODO: What object `this` is pointing to here?
      // @ts-ignore
      let ret = callback.call(this, ...args);
      benchmark.after();
      return ret;
    };
  }

  // callback must return a promise
  // async addAsync(type, callback) {
  //   let benchmark = (this.benchmarks[type] = new Benchmark());

  //   benchmark.before();
  //   // don’t await here.
  //   let promise = callback.call(this);
  //   promise.then(function() {
  //     benchmark.after();
  //   });
  //   return promise;
  // }

  /**
   * Sets the minimum treshold in milliseconds.
   *
   * @param {string} minimumThresholdMs
   */
  setMinimumThresholdMs(minimumThresholdMs) {
    let val = parseInt(minimumThresholdMs, 10);
    if (isNaN(val)) {
      throw new Error("`setMinimumThresholdMs` expects a number argument.");
    }
    this.minimumThresholdMs = val;
  }

  /**
   * Sets the minimum treshold in percent.
   *
   * @param {string} minimumThresholdPercent
   */
  setMinimumThresholdPercent(minimumThresholdPercent) {
    let val = parseInt(minimumThresholdPercent, 10);
    if (isNaN(val)) {
      throw new Error(
        "`setMinimumThresholdPercent` expects a number argument."
      );
    }
    this.minimumThresholdPercent = val;
  }

  /**
   * Returns the benchmark for this type.
   *
   * @param {string} type
   * @returns {Benchmark}
   */
  get(type) {
    if (!this.benchmarks[type]) {
      this.benchmarks[type] = new Benchmark();
    }
    return this.benchmarks[type];
  }

  /**
   * Report benchmark to STDOUT.
   *
   * @param {string} label
   * @param {number} totalTimeSpent
   */
  finish(label, totalTimeSpent) {
    for (var type in this.benchmarks) {
      let bench = this.benchmarks[type];
      let isAbsoluteMinimumComparison = this.minimumThresholdMs > 0;
      let totalForBenchmark = bench.getTotal();
      let percent = (totalForBenchmark * 100) / totalTimeSpent;

      let extraOutput = [];
      if (!isAbsoluteMinimumComparison) {
        extraOutput.push(`${percent.toFixed(1)}%`);
      }
      let timesCalledCount = bench.getTimesCalled();
      if (timesCalledCount > 1) {
        extraOutput.push(`called ${timesCalledCount}×`);
        extraOutput.push(
          `${(totalForBenchmark / timesCalledCount).toFixed(1)}ms each`
        );
      }

      let str = chalk.yellow(
        `Benchmark (${label}): ${type} took ${totalForBenchmark.toFixed(0)}ms ${
          extraOutput.length ? `(${extraOutput.join(", ")})` : ""
        }`
      );

      if (
        (isAbsoluteMinimumComparison &&
          totalForBenchmark >= this.minimumThresholdMs) ||
        percent > this.minimumThresholdPercent
      ) {
        if (this.isVerbose) {
          console.log(str);
        }
      }

      if (totalForBenchmark.toFixed(0) > 0) {
        debugBenchmark(str);
      }
    }
  }
}

module.exports = BenchmarkGroup;
