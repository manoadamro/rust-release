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

    id             = null
    tag_name       = null
    html_url       = null
    upload_url     = null
    is_new_release = null

    release = null
    const existing = releases.data.some(i => i.name === release_name);
    if (existing) {
      release = releases.data.filter(i => i.name === release_name)[0];
      core.info(`Skipping: Release with tag ${cargo_version} already exists`);
      core.notice(`Release with tag ${cargo_version} already exists`);
      is_new_release = false;
    } else {
      core.info(`Creating release with tag ${cargo_version}...`)
      if(dry_run === 'false') {
        release = octokit.rest.repos.createRelease({
          owner: owner,
          repo: repo,
          tag_name: release_name,
          name: release_name,
          body: bodyFileContent || body || `Release ${release_name}`,
        });
        is_new_release = true;
      } else {
        is_new_release = false;
        core.setOutput('is_new_release', false);
        core.info(`Would create release with tag ${cargo_version}, but this is a dry run.`);
      }
      core.notice(`Created release with tag ${cargo_version}`);
    }

    // Set output variables
    core.setOutput('cargo_version', cargo_version);
    if (release != null) {
      // Set the output variables for use by other actions: https://github.com/actions/toolkit/tree/master/packages/core#inputsoutputs
      id         = release.id
      tag_name   = release.tag_name
      html_url   = release.html_url
      upload_url = release.upload_url
    }
    core.setOutput('id', id);
    core.setOutput('tag_name', tag_name);
    core.setOutput('html_url', html_url);
    core.setOutput('upload_url', upload_url);
    core.setOutput('is_new_release', is_new_release);

    // Log the output variables
    core.info(`Cargo Version: ${cargo_version}`);
    core.info(`Release ID: ${id}`);
    core.info(`Release Tag Name: ${tag_name}`);
    core.info(`Release HTML URL: ${html_url}`);
    core.info(`Release Upload URL: ${upload_url}`);
    core.info(`Is new release: ${is_new_release}`);
    
  } catch (error) {
    core.setFailed(error.message);
  }
}

run();
