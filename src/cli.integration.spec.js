'use strict';

const { expect } = require(`chai`);
const fs = require(`fs`);
const path = require('path');
const { afterEach, before, beforeEach, describe, it } = require(`mocha`);
const shell = require(`shelljs`);
const tmp = require(`tmp`);
const nock = require('nock');

shell.config.silent = true;

const preparations = [
  () => fs.writeFileSync(`package.json`, `{ "name": "test", "version": "1.0.0" }`),
  () => {
    shell.exec(`git init`);
    shell.exec(`git config user.email "you@example.com"`);
    shell.exec(`git config user.name "Your Name"`);
  },
  () => shell.exec(`git commit --allow-empty -m "init" --no-gpg-sign`),
  () => shell.exec(`git tag 1.0.1`)
];

const runNPreparations = n => {
  for (let i = 0; i < n; ++i) {
    preparations[i]();
  }
};

describe(`npm-deploy-git-tag CLI`, function () {
  // Setting up our fake project and creating git commits takes longer than the default Mocha timeout.
  this.timeout(20000);

  before(() => {
    // This is not actually used in these tests, since `nock` only works within the same process, while the tests below
    // shell out to a sub process.
    nock.disableNetConnect();
  });

  describe(`when deploying fails`, () => {
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

    it(`returns a non-zero code when the current directory does not contain package.json`, function () {
      const cliResponse = shell.exec(`node ${this.binPath}`);
      expect(cliResponse.code).to.be.a('number').and.to.equal(1);
      expect(cliResponse.stderr).to.have.string(`npm-deploy-git-tag failed for the following reason`);
      expect(cliResponse.stderr).to.have.string(`Error: ENOENT: no such file or directory`);
    });

    it(`returns a non-zero code when called from outside a git repository`, function () {
      runNPreparations(1);
      const cliResponse = shell.exec(`node ${this.binPath}`);
      expect(cliResponse.code).to.be.a('number').and.to.equal(1);
      expect(cliResponse.stderr).to.have.string(`npm-deploy-git-tag failed for the following reason`);
      expect(cliResponse.stderr).to.match(/fatal: not a git repository/i);
    });

    it(`returns a non-zero code when the current branch does not have commits`, function () {
      runNPreparations(2);
      const cliResponse = shell.exec(`node ${this.binPath}`);
      expect(cliResponse.code).to.be.a('number').and.to.equal(1);
      expect(cliResponse.stderr).to.have.string(`npm-deploy-git-tag failed for the following reason`);

      // The "does not have any commits yet" message was introduced in git version 2.5.2, replacing the
      // other text.
      // - https://github.com/git/git/commit/ce113604672fed9b429b1c162b1005794fff6a17
      expect(cliResponse.stderr).to.match(/(bad default revision|does not have any commits yet)/i);
    });

    // Our call to `git-latest-semver-tag` returns an empty string when no valid semver tag exists.
    // Throw an error instead, and handle that in our test case.
    it(`returns a non-zero code when there is no tag with a valid version`, function () {
      runNPreparations(3);
      const cliResponse = shell.exec(`node ${this.binPath}`);
      expect(cliResponse.code).to.be.a('number').and.to.equal(1);
      expect(cliResponse.stderr).to.have.string(`npm-deploy-git-tag failed for the following reason`);
      expect(cliResponse.stderr).to.have.string(`Error: No valid semantic version tag available for deploying.`);
    });

    it(`returns a non-zero code when there is no environment variable NPM_TOKEN`, function () {
      runNPreparations(4);

      const oldToken = process.env.NPM_TOKEN;
      delete process.env.NPM_TOKEN;

      const cliResponse = shell.exec(`node ${this.binPath}`);
      expect(cliResponse.code).to.be.a('number').and.to.equal(1);
      expect(cliResponse.stderr).to.have.string(`npm-deploy-git-tag failed for the following reason`);
      expect(cliResponse.stderr).to.have.string(`Error: Cannot find NPM_TOKEN set in your environment.`);

      process.env.NPM_TOKEN = oldToken;
    });

    it(`returns a non-zero code when npm can't authenticate with the registry`, function () {
      runNPreparations(4);

      const oldToken = process.env.NPM_TOKEN;
      process.env.NPM_TOKEN = `INVALID`;

      const cliResponse = shell.exec(`node ${this.binPath}`);
      expect(cliResponse.code).to.be.a('number').and.to.equal(1);

      /**
       * TO-DO: Can't check against the output because of double printing of stderr by `shelljs`.
       * Please see - https://github.com/shelljs/shelljs/pull/892
       * expect(cliResponse.stderr).to.have.string(`npm-deploy-git-tag failed for the following reason`);
       */

      process.env.NPM_TOKEN = oldToken;
    });
  });

  describe(`when deploying succeeds for un-scoped package`, () => {
    it.skip(`deploys successfully when skipping token`);
  });

  describe(`when deploying succeeds for scoped package`, () => {
    it.skip(`deploys successfully when skipping token`);
  });
});
