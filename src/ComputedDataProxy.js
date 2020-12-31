const lodashSet = require("lodash/set");
const lodashGet = require("lodash/get");
const lodashIsPlainObject = require("lodash/isPlainObject");

/**
 * @module 11ty/eleventy/ComputedDataProxy
 */

/**
 * Calculates computed data using Proxies
 */
class ComputedDataProxy {
  /**
   * @param {Array<string>|Set<string>} computedKeys The computed keys
   */
  constructor(computedKeys) {
    if (Array.isArray(computedKeys)) {
      this.computedKeys = new Set(computedKeys);
    } else {
      this.computedKeys = computedKeys;
    }
  }

  /**
   * Checks data on plain object or Array type.
   *
   * @param {*} data
   * @return {boolean}
   */
  isArrayOrPlainObject(data) {
    return Array.isArray(data) || lodashIsPlainObject(data);
  }

  /**
   * Get data by key reference.
   *
   * @param {*} data
   * @param {Set<string>} keyRef
   * @return {*}
   */
  getProxyData(data, keyRef) {
    // Set defaults for keys not already set on parent data
    let undefinedValue = "__11TY_UNDEFINED__";
    if (this.computedKeys) {
      for (let key of this.computedKeys) {
        if (lodashGet(data, key, undefinedValue) === undefinedValue) {
          lodashSet(data, key, "");
        }
      }
    }

    let proxyData = this._getProxyData(data, keyRef);
    return proxyData;
  }

  /**
   * Proxy an object.
   *
   * @param {Object} dataObj The original object to proxy.
   * @param {Set<string>} keyRef
   * @param {string} parentKey
   * @return {*}
   * @todo Better annotation for return type
   */
  _getProxyForObject(dataObj, keyRef, parentKey = "") {
    return new Proxy(
      {},
      {
        /**
         * @param {Object<string, *>} obj
         * @param {string} key
         * @return {*}
         */
        get: (obj, key) => {
          if (typeof key !== "string") {
            return obj[key];
          }

          let newKey = `${parentKey ? `${parentKey}.` : ""}${key}`;

          // Issue #1137
          // Special case for Collections, always return an Array for collection keys
          // so they it works fine with Array methods like `filter`, `map`, etc
          if (newKey === "collections") {
            keyRef.add(newKey);
            return new Proxy(
              {},
              {
                /**
                 * @param {Object<string, *>} obj
                 * @param {string} key
                 * @return {*}
                 */
                get: (target, key) => {
                  if (typeof key === "string") {
                    keyRef.add(`collections.${key}`);
                    return [];
                  }
                  return target[key];
                },
              }
            );
          }

          let newData = this._getProxyData(dataObj[key], keyRef, newKey);
          if (!this.isArrayOrPlainObject(newData)) {
            keyRef.add(newKey);
          }
          return newData;
        },
      }
    );
  }

  /**
   * tbd.
   * @param {Array<*>} dataArr
   * @param {Set<string>} keyRef
   * @param {string} parentKey
   * @return {*}
   * @todo Better return type annotation
   */
  _getProxyForArray(dataArr, keyRef, parentKey = "") {
    return new Proxy(new Array(dataArr.length), {
      /**
       * @param {Object<string, *>} obj
       * @param {string} key
       * @return {*}
       */
      get: (obj, key) => {
        if (Array.prototype.hasOwnProperty(key)) {
          // remove `filter`, `constructor`, `map`, etc
          keyRef.add(parentKey);
          return obj[key];
        }

        // Hm, this needs to be better
        if (key === "then") {
          keyRef.add(parentKey);
          return;
        }

        let newKey = `${parentKey}[${key}]`;
        let newData = this._getProxyData(dataArr[key], keyRef, newKey);
        if (!this.isArrayOrPlainObject(newData)) {
          keyRef.add(newKey);
        }
        return newData;
      },
    });
  }

  /**
   * tbd.
   *
   * @param {*} data
   * @param {Set<string>} keyRef
   * @param {string} parentKey
   * @return {*}
   * @todo Better return type annotation
   */
  _getProxyData(data, keyRef, parentKey = "") {
    if (lodashIsPlainObject(data)) {
      return this._getProxyForObject(data, keyRef, parentKey);
    } else if (Array.isArray(data)) {
      return this._getProxyForArray(data, keyRef, parentKey);
    }

    // everything else!
    return data;
  }

  /**
   * tbd.
   *
   * @param {function} fn
   * @param {Object} data
   * @return {Promise<Array<*>>}
   */
  async findVarsUsed(fn, data = {}) {
    /** @type {Set<string>} */
    let keyRef = new Set();

    // careful, logging proxyData will mess with test results!
    let proxyData = this.getProxyData(data, keyRef);

    // squelch console logs for this fake proxy data pass 😅
    // let savedLog = console.log;
    // console.log = () => {};
    await fn(proxyData);
    // console.log = savedLog;

    return Array.from(keyRef);
  }
}

module.exports = ComputedDataProxy;
