'use strict';

const chai = require(`chai`);
const fs = require(`fs`);
const path = require('path');
const mocha = require(`mocha`);
const shell = require(`shelljs`);
const tmp = require(`tmp`);
const nock = require('nock');

const expect = chai.expect;

const afterEach = mocha.afterEach;
const before = mocha.before;
const beforeEach = mocha.beforeEach;
const describe = mocha.describe;
const it = mocha.it;

shell.config.silent = true;

const preparations = [
  () => {
    shell.exec(`git init`);
    shell.exec(`git config user.email "you@example.com"`);
    shell.exec(`git config user.name "Your Name"`);
  },
  () => shell.exec(`git commit --allow-empty -m "init" --no-gpg-sign`),
  () => shell.exec(`git tag 1.0.1`),
  () => fs.writeFileSync(`package.json`, `{ "name": "test", "version": "1.0.0" }`),
];

const runNPreparations = n => {
  for (let i = 0; i < n; ++i) {
    preparations[i]();
  }
};

describe(`npm-publish-git-tag CLI`, function () {
  // Setting up our fake project and creating git commits takes longer than the default Mocha timeout.
  this.timeout(20000);

  before(function () {
    // This is not actually used in these tests, since `nock` only works within the same process, while the tests below
    // shell out to a sub process.
    nock.disableNetConnect();
  });

  describe(`when publishing fails`, function () {
    beforeEach(function () {
      this.binPath = path.resolve('src/cli.js');
      this.cwd = process.cwd();
      this.tmpDir = tmp.dirSync();
      process.chdir(this.tmpDir.name);
      fs.writeFileSync(`.npmrc`, ``);
    });

    afterEach(function () {
      process.chdir(this.cwd);
    });

    it(`returns a non-zero code when called from outside a git repo`, function () {
      const cliRes = shell.exec(`node ${this.binPath}`);
      expect(cliRes.code).to.be.a('number').and.not.to.equal(0);

      // When a git directory does not exist, the entire process exits, before any of our error handling. This is
      // likely because one of our require calls is causing another module to look for the `.git` directory.
      // TODO: Follow up upstream.
      /*
        path /tmp/tmp-688SO5Ej6wcknl
        /app/node_modules/ggit/src/git-folder.js:12
                throw new Error('Cannot find file ' + gitDirLocation);
                ^

        Error: Cannot find file /tmp/tmp-688SO5Ej6wcknl/.git
            at getGitFolder (/app/node_modules/ggit/src/git-folder.js:12:15)
            at Object.<anonymous> (/app/node_modules/ggit/src/commit-message.js:4:39)
            at Module._compile (module.js:409:26)
            at Module.replacementCompile (/app/node_modules/nyc/node_modules/append-transform/index.js:58:13)
            at Module.replacementCompile (/app/node_modules/nyc/node_modules/append-transform/index.js:58:13)
            at module.exports (/app/node_modules/nyc/node_modules/default-require-extensions/js.js:8:9)
            at /app/node_modules/nyc/node_modules/append-transform/index.js:62:4
            at /app/node_modules/nyc/node_modules/append-transform/index.js:62:4
            at Object.<anonymous> (/app/node_modules/nyc/node_modules/append-transform/index.js:62:4)
            at Module.load (module.js:343:32)
            at Function.Module._load (module.js:300:12)
            at Module.require (module.js:353:17)
            at require (internal/module.js:12:17)
            at Object.<anonymous> (/app/node_modules/ggit/index.js:21:17)
            at Module._compile (module.js:409:26)
            at Module.replacementCompile (/app/node_modules/nyc/node_modules/append-transform/index.js:58:13)
            at Module.replacementCompile (/app/node_modules/nyc/node_modules/append-transform/index.js:58:13)
            at module.exports (/app/node_modules/nyc/node_modules/default-require-extensions/js.js:8:9)
            at /app/node_modules/nyc/node_modules/append-transform/index.js:62:4
            at /app/node_modules/nyc/node_modules/append-transform/index.js:62:4
            at Object.<anonymous> (/app/node_modules/nyc/node_modules/append-transform/index.js:62:4)
            at Module.load (module.js:343:32)
      */
      // expect(cliRes.stderr).to.have.string(`npm-publish-git-tag failed for the following reason`);
    });

    it(`returns a non-zero code when the current branch does not have commits`, function () {
      runNPreparations(1);
      const cliRes = shell.exec(`node ${this.binPath}`);
      expect(cliRes.code).to.be.a('number').and.not.to.equal(0);
      expect(cliRes.stderr).to.have.string(`npm-publish-git-tag failed for the following reason`);
    });

    // Our call to `latestSemverTag` returns an empty string when no valid semver tag exists.
    // TODO: Throw an error instead, and handle that in our test case.
    it.skip(`returns a non-zero code when there is no tag with a valid version`, function () {
      runNPreparations(2);
      const cliRes = shell.exec(`node ${this.binPath}`);
      expect(cliRes.code).to.be.a('number').and.not.to.equal(0);
      expect(cliRes.stderr).to.have.string(`npm-publish-git-tag failed for the following reason`);
    });

    it(`returns a non-zero code when the current directory does not contain package.json`, function () {
      runNPreparations(3);
      const cliRes = shell.exec(`node ${this.binPath}`);
      expect(cliRes.code).to.be.a('number').and.not.to.equal(0);
      expect(cliRes.stderr).to.have.string(`npm-publish-git-tag failed for the following reason`);
    });

    it(`returns a non-zero code when there is no environment variable NPM_TOKEN`, function () {
      runNPreparations(4);
      const cliRes = shell.exec(`node ${this.binPath}`);
      expect(cliRes.code).to.be.a('number').and.not.to.equal(0);
      expect(cliRes.stderr).to.have.string(`npm-publish-git-tag failed for the following reason`);
    });
  });

  describe.skip(`when publishing succeeds for un-scoped package`);

  describe.skip(`when publishing succeeds for scoped package`);
});
