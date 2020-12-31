const TemplateConfig = require("./TemplateConfig");
const debug = require("debug")("Eleventy:Config");

/**
 * @module 11ty/eleventy/Config
 */

debug("Setting up global TemplateConfig.");
/**
 * Provides global TemplateConfig.
 */
let config = new TemplateConfig();

module.exports = config;
