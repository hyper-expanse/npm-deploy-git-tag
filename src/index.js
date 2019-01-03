'use strict';

const Bluebird = require(`bluebird`);
const debug = require(`debug`)(`npm-publish-git-tag`);
const latestSemverTag = Bluebird.promisify(require(`git-latest-semver-tag`));
const readPkg = require(`read-pkg`);
const semver = require(`semver`);
const setNpmAuthTokenForCI = require(`@hutson/set-npm-auth-token-for-ci`);
const shell = require(`shelljs`);
const writePkg = require(`write-pkg`);

module.exports = npmPublishGitTag(shell);
module.exports.npmPublishGitTag = npmPublishGitTag;

function npmPublishGitTag(shell) {
  return options =>
    latestSemverTag()
      .then(latestTag => semver.valid(latestTag) ? latestTag : (function () {
        throw new Error(`No valid semantic version tag available for publishing.`);
      })())
      .then(latestTag => readPkg().then(pkg => writePkg(Object.assign(pkg, {version: latestTag}))))
      .then(() => options.skipToken || setToken())
      .then(() => publish({access: options.access}));

  function setToken() {
    if (!process.env.NPM_TOKEN) {
      throw new Error(`Cannot find NPM_TOKEN set in your environment.`);
    }
    setNpmAuthTokenForCI();
  }

  function publish(options) {
    let command = `npm publish`;

    if (typeof options.access === `string`) {
      debug(`publishing package with the following access level`, options.access);
      command += ` --access ${options.access}`;
    }

    debug(`executing publish command - ${command}`);
    const result = shell.exec(command, {silent: true});

    if (result.code !== 0) {
      throw new Error(result.stderr);
    }

    return true;
  }
}
