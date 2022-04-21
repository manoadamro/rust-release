const core = require('@actions/core');
const github = require('@actions/github');
const glob = require('@actions/glob');
const { promises: fs } = require('fs')

async function get_cargo_content(cargo_path) {
  await fs.access(cargo_path, async error => {
    if (error) {
      throw new Error(`Action failed to read file ${cargo_path} (${error})`)
    } else {
      await fs.readFile(cargo_path, 'utf8')
    }
  })
}

async function get_crate_version(cargo_content) {
  let cargo_version_re = /version *= *"(?<version>[a-zA-Z0-9._-]+)"/u;
  let cargo_version_result = cargo_version_re.exec(cargo_content);
  let cargo_version = cargo_version_result.groups.version;
  if (!cargo_version) {
    throw new Error("Action failed to find version in crate.")
  }
}

// most @actions toolkit packages have async methods
async function run() {
  try {
    // get workflow inputs
    const token = core.getInput('token', { required: true });
    const branch = core.getInput('branch', { required: true });
    const cargo_path = core.getInput('cargo', { required: true })

    const octokit = github.getOctokit(token)

    // get crate version from Cargo.toml
    const version = get_cargo_content(cargo_path).then(get_crate_version)

    // check current releases for existing version
    const releases = await octokit.rest.release.get({
      owner: 'octokit',
      repo: 'rest.js',
      pull_number: 123,
      mediaType: {
        format: 'diff'
      }
    });
    console.log(releases);

    // create a new release

    // output the crate version
    core.setOutput('version', version);
  } catch (error) {
    core.setFailed(error.message);
  }
}

run();