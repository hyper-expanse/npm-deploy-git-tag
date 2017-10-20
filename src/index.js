'use strict';

const Bluebird = require(`bluebird`);
const debug = require(`debug`)(`npm-publish-git-tag`);
const latestSemverTag = Bluebird.promisify(require(`git-latest-semver-tag`));
const readPkg = require(`read-pkg`);
const setNpmAuthTokenForCI = require(`set-npm-auth-token-for-ci`);
const shell = require(`shelljs`);
const writePkg = require(`write-pkg`);

module.exports = npmPublishGitTag(shell);
module.exports.npmPublishGitTag = npmPublishGitTag;

function npmPublishGitTag(shell) {
  return options =>
    latestSemverTag()
      .then(latestTag => readPkg().then(pkg => writePkg(Object.assign(pkg, {version: latestTag}))))
      .then(setNpmAuthTokenForCI)
      .then(() => publish({access: options.access}));

  function publish(options) {
    let command = `npm publish`;

    if (typeof options.access === `string`) {
      debug(`publishing package with the following access level`, options.access);
      command += ` --access ${options.access}`;
    }

    debug(`executing publish command`, command);
    return shell.exec(command);
  }
}
