'use strict';

const Bluebird = require(`bluebird`);
const debug = require(`debug`)(`npm-deploy-git-tag`);
const gitSemverTags = Bluebird.promisify(require(`git-semver-tags`));
const readPkg = require(`read-pkg`);
const setNpmAuthTokenForCI = require(`@hutson/set-npm-auth-token-for-ci`);
const shell = require(`shelljs`);
const writePkg = require(`write-pkg`);

module.exports = deployGitTag(shell);
module.exports.deployGitTag = deployGitTag;

function deployGitTag (shell) {
  return async ({ access, skipToken } = {}) => {
    const tags = await gitSemverTags();
    if (tags.length === 0) {
      throw new Error(`No valid semantic version tag available for deploying.`);
    }
    await updateVersion(tags[0]);
    skipToken || setToken();
    await deploy({ access });
  };

  async function updateVersion (version) {
    debug(`updating version in package.json to ${version}`);

    const packageMeta = await readPkg();
    await writePkg(Object.assign(packageMeta, { version }));
  }

  function setToken () {
    if (!process.env.NPM_TOKEN) {
      throw new Error(`Cannot find NPM_TOKEN set in your environment.`);
    }
    setNpmAuthTokenForCI();
  }

  function deploy ({ access }) {
    let command = `npm publish`;

    if (typeof access === `string`) {
      command += ` --access ${access}`;
    }

    debug(`executing 'publish' command - ${command}`);
    const result = shell.exec(command, { silent: true });

    if (result.code !== 0) {
      throw new Error(result.stderr);
    }
  }
}
