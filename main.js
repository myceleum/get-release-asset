const core = require("@actions/core");
const { Octokit } = require("@octokit/rest");
const got = require("got");
const { pipeline } = require("stream");
const { createWriteStream, mkdir, mkdtempSync } = require("fs");
const { promisify } = require("util");
const { dirname, resolve, join } = require("path");
const extract = require("extract-zip");
const os = require("os");

const asyncPipeline = promisify(pipeline);
const asyncMkdir = promisify(mkdir);

let owner = core.getInput("owner");
let repo = core.getInput("repo");
const excludes = core.getInput("exclude").trim().split(",");
const assetName = core.getInput("assetName");
const repository = core.getInput("repository");
const token = core.getInput("token");
const assetOutputPath = core.getInput("outputPath");
const unzipEnabled = core.getInput("unzip");
const unzipPath = core.getInput("unzipPath");

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

async function downloadGithubAsset(url) {
  const assetAbsoluteOutputPath = getAssetLocation();
  const headers = {
    Accept: "application/octet-stream",
    "User-Agent": "",
  };

  await asyncMkdir(dirname(assetAbsoluteOutputPath), { recursive: true });

  await asyncPipeline(
    got.stream(url, {
      method: "GET",
      headers,
    }),
    createWriteStream(assetAbsoluteOutputPath)
  );
  return assetAbsoluteOutputPath;
}

const unzipAsset = async (assetPath) => {
  // Either use the unzipPath if specified or the dirctory of the asset
  const outPath = resolve(unzipPath || dirname(assetPath));
  await asyncMkdir(dirname(outPath), { recursive: true });
  await extract(resolve(assetPath), { dir: outPath });
};

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

    let asset;
    if (assetName) {
      asset = releases[0].assets.find((x) => x.name === assetName);
      if (!asset) {
        core.setFailed(`Could not find asset ${assetName}`);
        return;
      }
      try {
        const url = asset.url.slice(8);
        const assetPath = await downloadGithubAsset(`https://${token}:@${url}`);

        if (unzipEnabled) {
          try {
            await unzipAsset(assetPath);
            core.setOutput("unzip_success", true);
          } catch (e) {
            core.setFailed("Failed to unzip the asset");
            return;
          }
        }
        core.setOutput("asset_url", asset.url);
        core.setOutput("asset_path", assetPath);
      } catch (e) {
        core.setFailed("Failed to download asset");
        return;
      }
    }

    if (releases.length) {
      core.setOutput("id", releases[0].id);
      core.setOutput("tag_name", releases[0].tag_name);
      core.setOutput("release_url", releases[0].url);
      core.setOutput("prerelease", releases[0].prerelease);
      core.setOutput("draft", releases[0].draft);
    } else {
      core.setFailed("No valid releases");
    }
  } catch (error) {
    core.setFailed(error.message);
  }
}

run();
