const core = require('@actions/core');
const github = require('@actions/github');
const fs = require('fs')


// most @actions toolkit packages have async methods
async function run() {
  core.info("Starting...")

  try {
    // Get authenticated GitHub client (Ocktokit): https://github.com/actions/toolkit/tree/master/packages/github#usage
    const octokit = github.getOctokit(process.env.GITHUB_TOKEN);

    // Get owner and repo from context of payload that triggered the action
    const { owner: currentOwner, repo: currentRepo } = github.context.repo;
        
    // get workflow inputs
    const cargo_path = core.getInput('cargo_path', { required: false });
    const body = core.getInput('body', { required: false });
    const body_path = core.getInput('body_path', { required: false });
    const owner = core.getInput('owner', { required: false }) || currentOwner;
    const repo = core.getInput('repo', { required: false }) || currentRepo;
    const dry_run = core.getInput('dry_run', { required: false });

    core.info("Getting content of the body...");
    let bodyFileContent = null;
    if (body_path !== '' && !!body_path) {
      try {
        bodyFileContent = fs.readFileSync(body_path, { encoding: 'utf8' });
      } catch (error) {
        core.setFailed(error.message);
      }
    }

    core.info("Getting cargo file contents...");
    const cargo_content = fs.readFileSync(cargo_path, 'utf8').toString();

    core.info("Getting crate version...");
    let cargo_version_re = /version *= *"(?<version>[a-zA-Z0-9._-]+)"/u;
    let cargo_version_result = cargo_version_re.exec(cargo_content);
    let cargo_version = cargo_version_result.groups.version;
    core.info(`Got crate version ${cargo_version}`);

    // check current releases for existing version
    const release_name = `v${cargo_version}`
    const releases = await octokit.rest.repos.listReleases({
      owner: owner,
      repo: repo,
    });
    release = null
    const existing = releases.data.some(i => i.name === release_name);
    if (existing) {
      release = releases.data.filter(i => i.name === release_name)[0];
      core.info(`Skipping: Release with tag ${cargo_version} already exists`)
      core.notice(`Release with tag ${cargo_version} already exists`)
    } else {
      core.info(`Creating release with tag ${cargo_version}...`)
      if(dry_run === 'false') {
        release = octokit.rest.repos.createRelease({
          owner: owner,
          repo: repo,
          tag_name: release_name,
          name: release_name,
          body: body || `Release ${release_name}`,
        })
      } else {
        core.info(`Would create release with tag ${cargo_version}, but this is a dry run.`)
      }
      core.notice(`Created release with tag ${cargo_version}`)
    }

    if (release != null) {
      // // Get the ID, html_url, and upload URL for the created Release from the response
      // const {
      //   data: { id: releaseId, html_url: htmlUrl, upload_url: uploadUrl }
      // } = release;

      // Set the output variables for use by other actions: https://github.com/actions/toolkit/tree/master/packages/core#inputsoutputs
      core.setOutput('id', release.id);
      core.setOutput('html_url', release.html_url);
      core.setOutput('upload_url', release.upload_url);
    }

    // output the crate version
    core.setOutput('version', cargo_version);
  } catch (error) {
    core.setFailed(error.message);
  }
}

run();
