const core = require("@actions/core");
const { Octokit } = require("@octokit/rest");

let owner = core.getInput("owner");
let repo = core.getInput("repo");
const excludes = core.getInput("exclude").trim().split(",");
const assetName = core.getInput("assetName");
const repository = core.getInput("repository");
const token = core.getInput("token");

const octokit = new Octokit({
  auth: token,
});

if (!owner || !repo) {
  [owner, repo] = repository.split("/");
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

    let asset;
    if (assetName) {
      asset = releases[0].assets.find((x) => x.name === assetName);
      if (!asset) {
        core.setFailed(`Could not find asset ${assetName}`);
        return;
      }
    }

    if (releases.length) {
      core.setOutput("id", releases[0].id);
      core.setOutput("tag_name", releases[0].tag_name);
      core.setOutput("release_url", releases[0].url);
      core.setOutput("prerelease", releases[0].prerelease);
      core.setOutput("draft", releases[0].draft);
      core.setOutput("asset_download_url", releases[0].browser_download_url);
    } else {
      core.setFailed("No valid releases");
    }
  } catch (error) {
    core.setFailed(error.message);
  }
}

run();
