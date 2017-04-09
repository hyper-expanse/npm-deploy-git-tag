'use strict';

const tags = require(`ggit`).tags;
const npm = require(`npm-utils`);
const readPkg = require(`read-pkg`);
const writePkg = require(`write-pkg`);

module.exports = publishGitTag;

function publishGitTag() {
  return tags()
    .then(tags => tags[tags.length - 1])
    .then(gitTag => readPkg().then(pkg => writePkg(Object.assign(pkg, {version: gitTag.tag}))))
    .then(npm.setAuthToken)
    .then(npm.publish)
  ;
}
