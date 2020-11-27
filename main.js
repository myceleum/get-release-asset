const core = require("@actions/core");
const { Octokit } = require("@octokit/rest");
const got = require("got");
const { pipeline } = require("stream");
const { createWriteStream, mkdir, mkdtempSync } = require("fs");
const { promisify } = require("util");
const { dirname, resolve, join } = require("path");
const os = require("os");

const asyncPipeline = promisify(pipeline);
const asyncMkdir = promisify(mkdir);

let owner = core.getInput("owner") || "myceleum";
let repo = core.getInput("repo") || "daemon";
const excludes = core.getInput("exclude").trim().split(",");
const assetName = core.getInput("assetName");
const assetOutputPath = core.getInput("assetOutputPath");
const repository = core.getInput("repository");
const token = core.getInput("token") || process.env.AUTH_TOKEN;

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
      releases = releases.filter((x) => !(x.prerelease === false && x.draft === false));
    }

    if (excludes.includes("prerelease")) {
      releases = releases.filter((x) => x.prerelease !== true);
    }

    if (excludes.includes("draft")) {
      releases = releases.filter((x) => x.draft !== true);
    }

    console.log(releases[0]);

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
      core.setOutput("tag_name", releases[0].tag_name);
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
