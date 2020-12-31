const { performance } = require("perf_hooks");
/**
 * @module 11ty/eleventy/Benchmark
 */

/**
 * Benchmark execution of something.
 */
class Benchmark {
  constructor() {
    this.reset();
  }

  /**
   * Creates a new timestamp in milliseconds.
   *
   * @public
   * @returns number
   */
  getNewTimestamp() {
    if (performance) {
      return performance.now();
    }
    return new Date().getTime();
  }

  /**
   * Resets this benchmark.
   *
   * @public
   */
  reset() {
    /**
     * Execution time.
     * @type {number}
     */
    this.timeSpent = 0;
    /**
     * Number of times this benchmark got called.
     * @type {number}
     */
    this.timesCalled = 0;
    /**
     * Timestamps in calling order.
     *
     * @type {Array<number>}
     */
    this.beforeTimers = [];
  }

  /**
   * Hook before timer is started.
   *
   * @public
   * @todo @slightlyoff: disable all of these hrtime requests when not benchmarking
   */
  before() {
    this.timesCalled++;
    this.beforeTimers.push(this.getNewTimestamp());
  }

  /**
   * Hook after the timer finished. Computes the needed time.
   *
   * @public
   * @throws {Error} If called without a previous before()
   */
  after() {
    if (!this.beforeTimers.length) {
      throw new Error("You called Benchmark after() without a before().");
    }

    let before = this.beforeTimers.pop();
    if (!this.beforeTimers.length) {
      this.timeSpent += this.getNewTimestamp() - before;
    }
  }

  /**
   * How often was this benchmark called?
   *
   * @public
   * @returns {number}
   */
  getTimesCalled() {
    return this.timesCalled;
  }

  /**
   * Total execution time used in this benchmark.
   *
   * @public
   * @returns {number}
   */
  getTotal() {
    return this.timeSpent;
  }
}

module.exports = Benchmark;
