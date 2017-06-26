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

const preparations = [
  () => shell.exec(`git init`, {
    silent: true,
  }),
  () => shell.exec(`git commit --allow-empty -m "init" --no-gpg-sign`, {
    silent: true,
  }),
  () => fs.writeFileSync(`package.json`, `{ "name": "test", "version": "1.0.0" }`),
  () => shell.exec(`git tag 1.0.1`, {
    silent: true,
  }),
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
    nock.disableNetConnect();
  });

  describe(`returns a non-zero code unless the package is successfully published`, function () {
    beforeEach(function () {
      this.binPath = path.resolve('src/cli.js');
      this.cwd = process.cwd();
      this.tmpDir = tmp.dirSync();
      process.chdir(this.tmpDir.name);
    });

    it(`returns a non-zero code when called from outside a git repo`, function () {
      const cliRes = shell.exec(`node ${this.binPath}`, {
        silent: true,
      });
      expect(cliRes.code).to.be.a('number').and.not.to.equal(0);
    });

    it(`returns a non-zero code when the current branch does not have commits`, function () {
      runNPreparations(1);
      const cliRes = shell.exec(`node ${this.binPath}`, {
        silent: true,
      });
      expect(cliRes.code).to.be.a('number').and.not.to.equal(0);
    });

    it(`returns a non-zero code when the current directory does not contain package.json`, function () {
      runNPreparations(2);
      const cliRes = shell.exec(`node ${this.binPath}`, {
        silent: true,
      });
      expect(cliRes.code).to.be.a('number').and.not.to.equal(0);
    });

    it(`returns a non-zero code when there is no env var NPM_TOKEN`, function () {
      runNPreparations(3);
      const cliRes = shell.exec(`node ${this.binPath}`, {
        silent: true,
      });
      expect(cliRes.code).to.be.a('number').and.not.to.equal(0);
    });

    it(`returns a non-zero code when there is no tag with a valid version`, function () {
      runNPreparations(3);
      const cliRes = shell.exec(`NPM_TOKEN=123 node ${this.binPath}`, {
        silent: true,
      });
      expect(cliRes.code).to.be.a('number').and.not.to.equal(0);
    });

    it(`returns a non-zero code when npm publish fails, e.g. when NPM_TOKEN is not valid`, function () {
      runNPreparations(4);
      const cliRes = shell.exec(`NPM_TOKEN=123 node ${this.binPath}`, {
        silent: true,
      });
      expect(cliRes.code).to.be.a('number').and.not.to.equal(0);
    });

    // TODO find a way to mock a successful npm-publish and expect a 0 code

    afterEach(function () {
      process.chdir(this.cwd);
      shell.exec(`rm ~/.npmrc`, {silent: true});
    });
  });
});
