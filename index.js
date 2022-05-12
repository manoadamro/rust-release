const github = require('@actions/github');
const core = require('@actions/core');
const glob = require('@actions/glob');
const { Octokit } = require("@octokit/rest");
const fs = require('fs')


// most @actions toolkit packages have async methods
async function run() {
  core.info("Starting...")

  try {
    // get workflow inputs
    const owner = core.getInput(`owner`, { required: true });
    const repo = core.getInput(`repo`, { required: true }).split("/").slice(-1)[0];
    const token = core.getInput('token', { required: true });
    const cargo_path = core.getInput('cargo_path', { required: false });
    const body = core.getInput('body', { required: false });
    const dry_run = core.getInput(`dry_run`, { required: false }) === 'true';

    core.info("Getting cargo file contents...");
    const cargo_content = fs.readFileSync(cargo_path, 'utf8').toString();

    core.info("Getting crate version...");
    let cargo_version_re = /version *= *"(?<version>[a-zA-Z0-9._-]+)"/u;
    let cargo_version_result = cargo_version_re.exec(cargo_content);
    let cargo_version = cargo_version_result.groups.version;
    core.info(`Got crate version ${cargo_version}`);

    // check current releases for existing version
    const release_name = `v${cargo_version}`
    const octokit = github.getOctokit(token);
    const releases = await octokit.rest.repos.listReleases({
      owner: owner,
      repo: repo,
    });
    const existing = releases.data.some(i => i.name === release_name);
    if (existing) {
      core.info(`Skipping: Release with tag ${cargo_version} already exists`)
      core.notice(`Release with tag ${cargo_version} already exists`)
    } else {
      core.info(`Creating release with tag ${cargo_version}...`)
      if(dry_run === "false") {
        const createReleaseResponse = octokit.rest.repos.createRelease({
          owner: owner,
          repo: repo,
          tag_name: release_name,
          name: release_name,
          body: body || `Release ${release_name}`,
        })

        // Get the ID, html_url, and upload URL for the created Release from the response
        const {
          data: { id: releaseId, html_url: htmlUrl, upload_url: uploadUrl }
        } = createReleaseResponse;

        // Set the output variables for use by other actions: https://github.com/actions/toolkit/tree/master/packages/core#inputsoutputs
        core.setOutput('id', releaseId);
        core.setOutput('html_url', htmlUrl);
        core.setOutput('upload_url', uploadUrl);
      } else {
        core.info(`Would create release with tag ${cargo_version}, but this is a dry run.`)
      }
      core.notice(`Created release with tag ${cargo_version}`)
    }

    // output the crate version
    core.setOutput('version', cargo_version);
  } catch (error) {
    core.setFailed(error.message);
  }
}

run();
