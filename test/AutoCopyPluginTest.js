import test from "ava";
import fs from "node:fs";
import { rimrafSync } from "rimraf";
import { TemplatePath } from "@11ty/eleventy-utils";

import { AutoCopyPlugin } from "../src/Plugins/AutoCopyPlugin.js";
import { TransformPlugin as InputPathToUrlTransformPlugin } from "../src/Plugins/InputPathToUrl.js";
import { default as HtmlBasePlugin } from "../src/Plugins/HtmlBasePlugin.js";
import Eleventy from "../src/Eleventy.js";

test("Basic usage", async (t) => {
	let elev = new Eleventy("./test/stubs-autocopy/", "./test/stubs-autocopy/_site-basica", {
		configPath: false,
		config: function (eleventyConfig) {
			eleventyConfig.addPlugin(AutoCopyPlugin, {
				match: "**/*.png"
			});

			eleventyConfig.on("eleventy.passthrough", copyMap => {
				t.deepEqual(copyMap, {
					map: {
						"/test/possum.png": TemplatePath.normalizeOperatingSystemFilePath("test/stubs-autocopy/possum.png")
					}
				})
			});

			eleventyConfig.addTemplate("test.njk", `<img src="possum.png">`)
		},
	});

	elev.disableLogger();

	let [copy, templates] = await elev.write();

	t.is(copy.length, 1);
	t.is(templates.length, 1);

	t.deepEqual(templates[0], {
		inputPath: './test/stubs-autocopy/test.njk',
		outputPath: './test/stubs-autocopy/_site-basica/test/index.html',
		url: '/test/',
		content: '<img src="possum.png">',
		rawInput: '<img src="possum.png">'
	});

	t.deepEqual(copy[0], {
		count: 1,
		map: {
			"test/stubs-autocopy/possum.png": TemplatePath.normalizeOperatingSystemFilePath("test/stubs-autocopy/_site-basica/test/possum.png"),
		}
	});

	t.is(fs.existsSync("test/stubs-autocopy/_site-basica/test/possum.png"), true);
	t.is(fs.existsSync("test/stubs-autocopy/_site-basica/test/index.html"), true);
});

test.after.always("cleanup dirs", () => {
	rimrafSync("test/stubs-autocopy/_site-basica");
});

test("More complex image path (parent dir)", async (t) => {
	let elev = new Eleventy("./test/stubs-autocopy/", "./test/stubs-autocopy/_site-basicb", {
		configPath: false,
		config: function (eleventyConfig) {
			eleventyConfig.addPlugin(AutoCopyPlugin, {
				match: "**/*.png"
			});

			eleventyConfig.on("eleventy.passthrough", copyMap => {
				t.deepEqual(copyMap, {
					map: {
						"/stubs-img-transform/possum.png": TemplatePath.normalizeOperatingSystemFilePath("test/stubs-img-transform/possum.png")
					}
				})
			});

			eleventyConfig.addTemplate("test.njk", `<img src="../stubs-img-transform/possum.png">`)
		},
	});

	elev.disableLogger();

	let [copy, templates] = await elev.write();

	t.is(copy.length, 1);
	t.is(templates.length, 1);

	t.deepEqual(templates[0], {
		inputPath: './test/stubs-autocopy/test.njk',
		outputPath: './test/stubs-autocopy/_site-basicb/test/index.html',
		url: '/test/',
		content: '<img src="../stubs-img-transform/possum.png">',
		rawInput: '<img src="../stubs-img-transform/possum.png">'
	});

	t.deepEqual(copy[0], {
		count: 1,
		map: {
			// test/stubs-autocopy/test.njk => "../stubs-img-transform/possum.png"
			"test/stubs-img-transform/possum.png": TemplatePath.normalizeOperatingSystemFilePath("test/stubs-autocopy/_site-basicb/stubs-img-transform/possum.png"),
		}
	});

	t.is(fs.existsSync("test/stubs-autocopy/_site-basicb/stubs-img-transform/possum.png"), true);
	t.is(fs.existsSync("test/stubs-autocopy/_site-basicb/test/index.html"), true);
});

test.after.always("cleanup dirs", () => {
	rimrafSync("test/stubs-autocopy/_site-basicb");
});

test("No matches", async (t) => {
	let elev = new Eleventy("./test/stubs-autocopy/", "./test/stubs-autocopy/_site2", {
		configPath: false,
		config: function (eleventyConfig) {
			eleventyConfig.addPlugin(AutoCopyPlugin, {
				match: "**/*.jpeg"
			});

			eleventyConfig.on("eleventy.passthrough", copyMap => {
				t.deepEqual(copyMap, { map: {} })
			});

			eleventyConfig.addTemplate("test.njk", `<img src="lol.lol">`)
		},
	});

	elev.disableLogger();

	let [copy, templates] = await elev.write();

	t.is(copy.length, 0);
	t.is(templates.length, 1);

	t.is(fs.existsSync("test/stubs-autocopy/_site2/test/lol.lol"), false);
	t.is(fs.existsSync("test/stubs-autocopy/_site2/test/index.html"), true);
});

test.after.always("cleanup dirs", () => {
	rimrafSync("test/stubs-autocopy/_site2");
});

test("Match but does not exist (throws error)", async (t) => {
	let elev = new Eleventy("./test/stubs-autocopy/", "./test/stubs-autocopy/_site3", {
		configPath: false,
		config: function (eleventyConfig) {
			eleventyConfig.addPlugin(AutoCopyPlugin, {
				match: "**/*.png"
			});

			eleventyConfig.on("eleventy.passthrough", copyMap => {
				t.deepEqual(copyMap, { map: {} })
			});

			eleventyConfig.addTemplate("test.njk", `<img src="missing.png">`)
		},
	});

	elev.disableLogger();

	await t.throwsAsync(async () => {
		await elev.write();
	}, {
		message: `Having trouble writing to "./test/stubs-autocopy/_site3/test/index.html" from "./test/stubs-autocopy/test.njk"`
	});

	t.is(fs.existsSync("test/stubs-autocopy/_site3/test/index.html"), false);
});

test.after.always("cleanup dirs", () => {
	rimrafSync("test/stubs-autocopy/_site3");
});

test("Match but does not exist (no error, using `failOnError: false`)", async (t) => {
	let elev = new Eleventy("./test/stubs-autocopy/", "./test/stubs-autocopy/_site4", {
		configPath: false,
		config: function (eleventyConfig) {
			eleventyConfig.addPlugin(AutoCopyPlugin, {
				match: "**/*.png",
				failOnError: false,
			});

			eleventyConfig.on("eleventy.passthrough", copyMap => {
				t.deepEqual(copyMap, { map: {} })
			});

			eleventyConfig.addTemplate("test.njk", `<img src="missing.png">`)
		},
	});

	elev.disableLogger();

	let [copy, templates] = await elev.write();

	t.is(copy.length, 0);
	t.is(templates.length, 1);

	t.is(fs.existsSync("test/stubs-autocopy/_site4/test/missing.png"), false);
	t.is(fs.existsSync("test/stubs-autocopy/_site4/test/index.html"), true);
});

test.after.always("cleanup dirs", () => {
	rimrafSync("test/stubs-autocopy/_site4");
});

test("Copying dotfiles are not allowed", async (t) => {
	let elev = new Eleventy("./test/stubs-autocopy/", "./test/stubs-autocopy/_site5", {
		configPath: false,
		config: function (eleventyConfig) {
			eleventyConfig.addPlugin(AutoCopyPlugin, {
				match: "**/*", // WARNING don’t do this
				// copyOptions: { debug: true },
			});

			eleventyConfig.on("eleventy.passthrough", copyMap => {
				t.deepEqual(copyMap, { map: {} })
			});

			eleventyConfig.addTemplate("test.njk", `<img src=".gitkeep">`)
		},
	});

	elev.disableLogger();

	let [copy, templates] = await elev.write();

	t.is(copy.length, 1);
	t.is(copy[0].count, 0);
	t.is(templates.length, 1);

	t.is(fs.existsSync("test/stubs-autocopy/_site5/.gitkeep"), false);
	t.is(fs.existsSync("test/stubs-autocopy/_site5/test/.gitkeep"), false);
	t.is(fs.existsSync("test/stubs-autocopy/_site5/test/index.html"), true);
});

test.after.always("cleanup dirs", () => {
	rimrafSync("test/stubs-autocopy/_site5");
});

test("Using with InputPathToUrl plugin", async (t) => {
	let elev = new Eleventy("./test/stubs-autocopy/", "./test/stubs-autocopy/_site6", {
		configPath: false,
		config: function (eleventyConfig) {
			// order of addPlugin shouldn’t matter here
			eleventyConfig.addPlugin(AutoCopyPlugin, {
				match: "**/*.{html,njk}", // you probably wouldn’t do this
			});

			eleventyConfig.addPlugin(InputPathToUrlTransformPlugin);

			eleventyConfig.on("eleventy.passthrough", copyMap => {
				t.deepEqual(copyMap, { map: {} })
			});

			eleventyConfig.addTemplate("test1.njk", `Test 1`)
			eleventyConfig.addTemplate("test2.njk", `<a href="test1.njk">Test 2</a>`)
		},
	});

	elev.disableLogger();

	let [copy, templates] = await elev.write();

	t.is(copy.length, 0);
	t.is(templates.length, 2);

	t.is(templates.filter(entry => entry.url.endsWith("/test2/"))[0].content, `<a href="/test1/">Test 2</a>`);

	t.is(fs.existsSync("test/stubs-autocopy/_site6/test2/test1.njk"), false);
	t.is(fs.existsSync("test/stubs-autocopy/_site6/test2/index.html"), true);
});

test.after.always("cleanup dirs", () => {
	rimrafSync("test/stubs-autocopy/_site6");
});

test("Using with InputPathToUrl plugin (reverse addPlugin order)", async (t) => {
	let elev = new Eleventy("./test/stubs-autocopy/", "./test/stubs-autocopy/_site7", {
		configPath: false,
		config: function (eleventyConfig) {
			// order of addPlugin shouldn’t matter here
			eleventyConfig.addPlugin(InputPathToUrlTransformPlugin);

			eleventyConfig.addPlugin(AutoCopyPlugin, {
				match: "**/*.{html,njk}", // you probably wouldn’t do this
			});

			eleventyConfig.on("eleventy.passthrough", copyMap => {
				t.deepEqual(copyMap, { map: {} })
			});

			eleventyConfig.addTemplate("test1.njk", `Test 1`)
			eleventyConfig.addTemplate("test2.njk", `<a href="test1.njk">Test 2</a>`)
		},
	});

	elev.disableLogger();

	let [copy, templates] = await elev.write();

	t.is(copy.length, 0);
	t.is(templates.length, 2);
	t.is(templates.filter(entry => entry.url.endsWith("/test2/"))[0].content, `<a href="/test1/">Test 2</a>`);

	t.is(fs.existsSync("test/stubs-autocopy/_site7/test2/test1.njk"), false);
	t.is(fs.existsSync("test/stubs-autocopy/_site7/test2/index.html"), true);
});

test.after.always("cleanup dirs", () => {
	rimrafSync("test/stubs-autocopy/_site7");
});

test("Use with HtmlBasePlugin usage", async (t) => {
	let elev = new Eleventy("./test/stubs-autocopy/", "./test/stubs-autocopy/_site8a", {
		configPath: false,
		pathPrefix: "yolo",
		config: function (eleventyConfig) {
			eleventyConfig.addPlugin(HtmlBasePlugin);
			eleventyConfig.addPlugin(AutoCopyPlugin, {
				match: "**/*.png"
			});

			eleventyConfig.on("eleventy.passthrough", copyMap => {
				t.deepEqual(copyMap, {
					map: {
						"/test/possum.png": TemplatePath.normalizeOperatingSystemFilePath("test/stubs-autocopy/possum.png")
					}
				})
			});

			eleventyConfig.addTemplate("test.njk", `<img src="possum.png"><img src="/test/possum.png">`)
		},
	});

	elev.disableLogger();

	let [copy, templates] = await elev.write();

	t.is(copy.length, 1);
	t.is(templates.length, 1);

	t.deepEqual(templates[0], {
		inputPath: './test/stubs-autocopy/test.njk',
		outputPath: './test/stubs-autocopy/_site8a/test/index.html',
		url: '/test/',
		content: '<img src="possum.png"><img src="/yolo/test/possum.png">',
		rawInput: '<img src="possum.png"><img src="/test/possum.png">'
	});

	t.deepEqual(copy[0], {
		count: 1,
		map: {
			"test/stubs-autocopy/possum.png": TemplatePath.normalizeOperatingSystemFilePath("test/stubs-autocopy/_site8a/test/possum.png"),
		}
	});

	t.is(fs.existsSync("test/stubs-autocopy/_site8a/test/possum.png"), true);
	t.is(fs.existsSync("test/stubs-autocopy/_site8a/test/index.html"), true);
});

test.after.always("cleanup dirs", () => {
	rimrafSync("test/stubs-autocopy/_site8a");
});

test("Using with InputPathToUrl plugin and HtmlBasePlugin", async (t) => {
	let elev = new Eleventy("./test/stubs-autocopy/", "./test/stubs-autocopy/_site8b", {
		configPath: false,
		pathPrefix: "yolo",
		config: function (eleventyConfig) {
			// order of addPlugin shouldn’t matter here
			eleventyConfig.addPlugin(AutoCopyPlugin, {
				match: "**/*.{html,njk}", // you probably wouldn’t do this
			});

			eleventyConfig.addPlugin(InputPathToUrlTransformPlugin);
			eleventyConfig.addPlugin(HtmlBasePlugin);

			eleventyConfig.on("eleventy.passthrough", copyMap => {
				t.deepEqual(copyMap, { map: {} })
			});

			eleventyConfig.addTemplate("test1.njk", `Test 1`)
			eleventyConfig.addTemplate("test2.njk", `<a href="test1.njk">Test 2</a>`)
		},
	});

	elev.disableLogger();

	let [copy, templates] = await elev.write();

	t.is(copy.length, 0);
	t.is(templates.length, 2);

	t.is(templates.filter(entry => entry.url.endsWith("/test2/"))[0].content, `<a href="/yolo/test1/">Test 2</a>`);

	t.is(fs.existsSync("test/stubs-autocopy/_site8b/test2/test1.njk"), false);
	t.is(fs.existsSync("test/stubs-autocopy/_site8b/test2/index.html"), true);
});

test.after.always("cleanup dirs", () => {
	rimrafSync("test/stubs-autocopy/_site8b");
});

test("Multiple addPlugin calls (use both globs)", async (t) => {
	let elev = new Eleventy("./test/stubs-autocopy/", "./test/stubs-autocopy/_site9", {
		configPath: false,
		config: function (eleventyConfig) {
			eleventyConfig.addPlugin(AutoCopyPlugin, {
				match: "**/*.jpg"
			});
			eleventyConfig.addPlugin(AutoCopyPlugin, {
				match: "**/*.png"
			});

			eleventyConfig.on("eleventy.passthrough", copyMap => {
				t.deepEqual(copyMap, {
					map: {
						"/test/possum.jpg": TemplatePath.normalizeOperatingSystemFilePath("test/stubs-autocopy/possum.jpg"),
						"/test/possum.png": TemplatePath.normalizeOperatingSystemFilePath("test/stubs-autocopy/possum.png"),
					}
				})
			});

			eleventyConfig.addTemplate("test.njk", `<img src="possum.png"><img src="possum.jpg">`)
		},
	});

	elev.disableLogger();

	let [copy, templates] = await elev.write();

	t.is(copy.length, 2);
	t.is(templates.length, 1);

	t.deepEqual(templates[0], {
		inputPath: './test/stubs-autocopy/test.njk',
		outputPath: './test/stubs-autocopy/_site9/test/index.html',
		url: '/test/',
		content: '<img src="possum.png"><img src="possum.jpg">',
		rawInput: '<img src="possum.png"><img src="possum.jpg">'
	});

	t.deepEqual(copy[0], {
		count: 1,
		map: {
			"test/stubs-autocopy/possum.png": TemplatePath.normalizeOperatingSystemFilePath("test/stubs-autocopy/_site9/test/possum.png"),
		}
	});
	t.deepEqual(copy[1], {
		count: 1,
		map: {
			"test/stubs-autocopy/possum.jpg": TemplatePath.normalizeOperatingSystemFilePath("test/stubs-autocopy/_site9/test/possum.jpg"),
		}
	});

	t.is(fs.existsSync("test/stubs-autocopy/_site9/test/possum.jpg"), true);
	t.is(fs.existsSync("test/stubs-autocopy/_site9/test/possum.png"), true);
	t.is(fs.existsSync("test/stubs-autocopy/_site9/test/index.html"), true);
});

test.after.always("cleanup dirs", () => {
	rimrafSync("test/stubs-autocopy/_site9");
});

test("Array of globs", async (t) => {
	let elev = new Eleventy("./test/stubs-autocopy/", "./test/stubs-autocopy/_site10", {
		configPath: false,
		config: function (eleventyConfig) {
			eleventyConfig.addPlugin(AutoCopyPlugin, {
				match: ["**/*.jpg", "**/*.png"]
			});

			eleventyConfig.on("eleventy.passthrough", copyMap => {
				t.deepEqual(copyMap, {
					map: {
						"/test/possum.jpg": TemplatePath.normalizeOperatingSystemFilePath("test/stubs-autocopy/possum.jpg"),
						"/test/possum.png": TemplatePath.normalizeOperatingSystemFilePath("test/stubs-autocopy/possum.png"),
					}
				})
			});

			eleventyConfig.addTemplate("test.njk", `<img src="possum.png"><img src="possum.jpg">`)
		},
	});

	elev.disableLogger();

	let [copy, templates] = await elev.write();

	t.is(copy.length, 2);
	t.is(templates.length, 1);

	t.deepEqual(templates[0], {
		inputPath: './test/stubs-autocopy/test.njk',
		outputPath: './test/stubs-autocopy/_site10/test/index.html',
		url: '/test/',
		content: '<img src="possum.png"><img src="possum.jpg">',
		rawInput: '<img src="possum.png"><img src="possum.jpg">'
	});

	t.deepEqual(copy[0], {
		count: 1,
		map: {
			"test/stubs-autocopy/possum.png": TemplatePath.normalizeOperatingSystemFilePath("test/stubs-autocopy/_site10/test/possum.png"),
		}
	});
	t.deepEqual(copy[1], {
		count: 1,
		map: {
			"test/stubs-autocopy/possum.jpg": TemplatePath.normalizeOperatingSystemFilePath("test/stubs-autocopy/_site10/test/possum.jpg"),
		}
	});

	t.is(fs.existsSync("test/stubs-autocopy/_site10/test/possum.jpg"), true);
	t.is(fs.existsSync("test/stubs-autocopy/_site10/test/possum.png"), true);
	t.is(fs.existsSync("test/stubs-autocopy/_site10/test/index.html"), true);
});

test.after.always("cleanup dirs", () => {
	rimrafSync("test/stubs-autocopy/_site10");
});

test("overwrite: false", async (t) => {
	fs.mkdirSync("./test/stubs-autocopy/_site11/test/", { recursive: true })
	fs.copyFileSync("./test/stubs-autocopy/possum.png", "./test/stubs-autocopy/_site11/test/possum.png");

	let elev = new Eleventy("./test/stubs-autocopy/", "./test/stubs-autocopy/_site11", {
		configPath: false,
		config: function (eleventyConfig) {
			eleventyConfig.addPlugin(AutoCopyPlugin, {
				match: "**/*.png",
				copyOptions: {
					overwrite: false
				}
			});

			eleventyConfig.on("eleventy.passthrough", copyMap => {
				t.deepEqual(copyMap, {
					map: {}
				})
			});

			eleventyConfig.addTemplate("test.njk", `<img src="possum.png">`)
		},
	});

	elev.disableLogger();

	let [copy, templates] = await elev.write();

	t.is(copy.length, 1);
	t.is(templates.length, 1);

	t.deepEqual(templates[0], {
		inputPath: './test/stubs-autocopy/test.njk',
		outputPath: './test/stubs-autocopy/_site11/test/index.html',
		url: '/test/',
		content: '<img src="possum.png">',
		rawInput: '<img src="possum.png">'
	});

	t.deepEqual(copy[0], {
		count: 0,
		map: {}
	});

	t.is(fs.existsSync("test/stubs-autocopy/_site11/test/possum.png"), true);
	t.is(fs.existsSync("test/stubs-autocopy/_site11/test/index.html"), true);
});

test.after.always("cleanup dirs", () => {
	rimrafSync("test/stubs-autocopy/_site11");
});
