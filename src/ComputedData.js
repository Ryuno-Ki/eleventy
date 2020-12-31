const lodashGet = require("lodash/get");
const lodashSet = require("lodash/set");

const ComputedDataQueue = require("./ComputedDataQueue");
const ComputedDataTemplateString = require("./ComputedDataTemplateString");
const ComputedDataProxy = require("./ComputedDataProxy");

const debug = require("debug")("Eleventy:ComputedData");

/**
 * @module 11ty/eleventy/ComputedData
 */

/**
 * Holds all computed data.
 */
class ComputedData {
  constructor() {
    this.computed = {};
    /** @type {Object<string, boolean>} */
    this.templateStringKeyLookup = {};
    /** @type {Set<string>} */
    this.computedKeys = new Set();
    /** @type {Object<string, Array<string>>} */
    this.declaredDependencies = {};
    this.queue = new ComputedDataQueue();
  }

  /**
   * Adds a new entry to the dependency graph to compute data.
   *
   * @param {string} key
   * @param {*} fn
   * @param {Array<string>} declaredDependencies
   */
  add(key, fn, declaredDependencies = []) {
    this.computedKeys.add(key);
    this.declaredDependencies[key] = declaredDependencies;

    lodashSet(this.computed, key, fn);
  }

  /**
   * Adds a template string to computed data and memoizes it.
   *
   * @param {string} key The lookup key.
   * @param {function} fn A stored callback.
   * @param {Array<string>} declaredDependencies Other keys to resolve before this
   */
  addTemplateString(key, fn, declaredDependencies = []) {
    this.add(key, fn, declaredDependencies);
    this.templateStringKeyLookup[key] = true;
  }

  /**
   * Determine the order of resolving of values.
   *
   * @param {*} data
   */
  async resolveVarOrder(data) {
    let proxyByTemplateString = new ComputedDataTemplateString(
      this.computedKeys
    );
    let proxyByProxy = new ComputedDataProxy(this.computedKeys);

    for (let key of this.computedKeys) {
      let computed = lodashGet(this.computed, key);

      if (typeof computed !== "function") {
        // add nodes for non functions (primitives like booleans, etc)
        this.queue.addNode(key);
      } else {
        this.queue.uses(key, this.declaredDependencies[key]);

        let isTemplateString = !!this.templateStringKeyLookup[key];
        let proxy = isTemplateString ? proxyByTemplateString : proxyByProxy;
        let varsUsed = await proxy.findVarsUsed(computed, data);

        debug("%o accesses %o variables", key, varsUsed);
        let filteredVarsUsed = varsUsed.filter((varUsed) => {
          return (
            (varUsed !== key && this.computedKeys.has(varUsed)) ||
            varUsed.startsWith("collections.")
          );
        });
        this.queue.uses(key, filteredVarsUsed);
      }
    }
  }

  /**
   * tbd.
   *
   * @private
   * @async
   * @param {*} data
   * @param {Array<string>} order
   */
  async _setupDataEntry(data, order) {
    debug("Computed data order of execution: %o", order);

    for (let key of order) {
      let computed = lodashGet(this.computed, key);
      if (typeof computed === "function") {
        // TODO: Is it possible to type the return value of `computed`?
        // @ts-ignore
        let ret = await computed(data);
        lodashSet(data, key, ret);
      } else if (computed !== undefined) {
        lodashSet(data, key, computed);
      }
    }
  }

  /**
   * tbd.
   *
   * @param {*} data
   * @param {function} orderFilter Filter to apply to order
   */
  async setupData(data, orderFilter) {
    await this.resolveVarOrder(data);

    await this.processRemainingData(data, orderFilter);
  }

  /**
   * tbd.
   *
   * @param {*} data
   * @param {function?} orderFilter The filter to apply to order
   */
  async processRemainingData(data, orderFilter) {
    // process all variables
    let order = this.queue.getOrder();
    if (orderFilter && typeof orderFilter === "function") {
      order = order.filter(orderFilter.bind(this.queue));
    }

    await this._setupDataEntry(data, order);
    this.queue.markComputed(order);
  }
}

module.exports = ComputedData;
