module.exports =
/******/ (() => { // webpackBootstrap
/******/ 	var __webpack_modules__ = ({

/***/ 654:
/***/ ((__unused_webpack_module, __unused_webpack_exports, __webpack_require__) => {

const core = __webpack_require__(27);
const { Octokit } = __webpack_require__(512);
const got = __webpack_require__(774);
const { pipeline } = __webpack_require__(413);
const { createWriteStream, mkdir, mkdtempSync } = __webpack_require__(747);
const { promisify } = __webpack_require__(669);
const { dirname, resolve, join } = __webpack_require__(622);
const os = __webpack_require__(87);

const asyncPipeline = promisify(pipeline);
const asyncMkdir = promisify(mkdir);

// const repository = core.getInput('repository');
let owner = core.getInput("owner");
let repo = core.getInput("repo");
const excludes = core.getInput("excludes").trim().split(",");
const assetName = core.getInput("assetName");
const assetOutputPath = core.getInput("assetOutputPath");
const repository = core.getInput("repository");
const token = core.getInput("token");

const octokit = new Octokit({
  auth: token,
});

if (!owner || !repo) {
  [owner, repo] = repository.split("/");
}

const getAssetLocation = () => {
  if (!assetName) return undefined;

  if (assetOutputPath) {
    return resolve(assetOutputPath);
  }
  const dir = mkdtempSync(join(os.tmpdir(), "out-"));
  return join(dir, assetName);
};

async function downloadGithubAsset(assetId) {
  const assetAbsoluteOutputPath = getAssetLocation();
  const headers = {
    Accept: "application/octet-stream",
    Authorization: token,
    "User-Agent": "",
  };

  await asyncMkdir(dirname(assetAbsoluteOutputPath), { recursive: true });

  await asyncPipeline(
    got.stream(`https://api.github.com/repos/${owner}/${repo}/releases/assets/${assetId}`, {
      method: "GET",
      headers,
    }),
    createWriteStream(assetAbsoluteOutputPath)
  );
  return assetAbsoluteOutputPath;
}

async function run() {
  try {
    let releases = await octokit.repos.listReleases({
      owner,
      repo,
    });
    releases = releases.data;

    if (excludes.includes("release")) {
      releases = releases.filter((x) => x.prerelease === true || x.draft === true);
    }

    if (excludes.includes("prerelease")) {
      releases = releases.filter((x) => x.prerelease !== true);
    }

    if (excludes.includes("draft")) {
      releases = releases.filter((x) => x.draft !== true);
    }

    if (assetName) {
      const asset = releases[0].assets.find((x) => x.name === assetName);
      if (asset) {
        try {
          const path = await downloadGithubAsset(asset.id);
          core.setOutput("asset_path", path);
        } catch (e) {
          core.setFailed("Failed to download the asset");
          return;
        }
      } else {
        core.setFailed("Asset was not found");
        return;
      }
    }

    if (releases.length) {
      core.setOutput("id", releases[0].id);
      core.setOutput("version", releases[0].id);
      core.setOutput("release_url", releases[0].url);
      core.setOutput("assets_url", releases[0].assets_url);
      core.setOutput("prerelease", releases[0].prerelease);
      core.setOutput("draft", releases[0].prerelease);
    } else {
      core.setFailed("No valid releases");
    }
  } catch (error) {
    core.setFailed(error.message);
  }
}

run();


/***/ }),

/***/ 27:
/***/ ((module) => {

module.exports = eval("require")("@actions/core");


/***/ }),

/***/ 512:
/***/ ((module) => {

module.exports = eval("require")("@octokit/rest");


/***/ }),

/***/ 774:
/***/ ((module) => {

module.exports = eval("require")("got");


/***/ }),

/***/ 747:
/***/ ((module) => {

"use strict";
module.exports = require("fs");;

/***/ }),

/***/ 87:
/***/ ((module) => {

"use strict";
module.exports = require("os");;

/***/ }),

/***/ 622:
/***/ ((module) => {

"use strict";
module.exports = require("path");;

/***/ }),

/***/ 413:
/***/ ((module) => {

"use strict";
module.exports = require("stream");;

/***/ }),

/***/ 669:
/***/ ((module) => {

"use strict";
module.exports = require("util");;

/***/ })

/******/ 	});
/************************************************************************/
/******/ 	// The module cache
/******/ 	var __webpack_module_cache__ = {};
/******/ 	
/******/ 	// The require function
/******/ 	function __webpack_require__(moduleId) {
/******/ 		// Check if module is in cache
/******/ 		if(__webpack_module_cache__[moduleId]) {
/******/ 			return __webpack_module_cache__[moduleId].exports;
/******/ 		}
/******/ 		// Create a new module (and put it into the cache)
/******/ 		var module = __webpack_module_cache__[moduleId] = {
/******/ 			// no module.id needed
/******/ 			// no module.loaded needed
/******/ 			exports: {}
/******/ 		};
/******/ 	
/******/ 		// Execute the module function
/******/ 		var threw = true;
/******/ 		try {
/******/ 			__webpack_modules__[moduleId](module, module.exports, __webpack_require__);
/******/ 			threw = false;
/******/ 		} finally {
/******/ 			if(threw) delete __webpack_module_cache__[moduleId];
/******/ 		}
/******/ 	
/******/ 		// Return the exports of the module
/******/ 		return module.exports;
/******/ 	}
/******/ 	
/************************************************************************/
/******/ 	/* webpack/runtime/compat */
/******/ 	
/******/ 	__webpack_require__.ab = __dirname + "/";/************************************************************************/
/******/ 	// module exports must be returned from runtime so entry inlining is disabled
/******/ 	// startup
/******/ 	// Load entry module and return exports
/******/ 	return __webpack_require__(654);
/******/ })()
;