'use strict';

const Bluebird = require(`bluebird`);
const latestSemverTag = Bluebird.promisify(require(`git-latest-semver-tag`));
const npm = require(`npm-utils`);
const readPkg = require(`read-pkg`);
const writePkg = require(`write-pkg`);
const program = require(`commander`);

module.exports = publishGitTag;

function publishGitTag() {
  return latestSemverTag()
    .then(latestTag => readPkg().then(pkg => writePkg(Object.assign(pkg, {version: latestTag}))))
    .then(() => program.skipToken || npm.setAuthToken())
    .then(() => npm.publish({access: program.access}))
  ;
}
