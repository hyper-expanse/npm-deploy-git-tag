'use strict';

var tags = require(`ggit`).tags;
var modifyPkg = require(`modify-pkg-up`);
var npm = require(`npm-utils`);

module.exports = publishGitTag;

function publishGitTag() {
  return tags()
    .then(tags => tags[tags.length - 1])
    .then(latestTag => modifyPkg(pkg => Object.assign(pkg, {version: latestTag.tag})))
    .then(npm.setAuthToken)
    .then(npm.publish)
  ;
}
