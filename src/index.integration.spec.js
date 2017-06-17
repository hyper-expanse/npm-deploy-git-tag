'use strict';

/* eslint-disable no-unused-expressions */

const chai = require(`chai`);
const chaiAsPromised = require(`chai-as-promised`);
const fs = require(`fs`);
const mocha = require(`mocha`);
const proxyquire = require(`proxyquire`);
const shell = require(`shelljs`);
const sinon = require(`sinon`);
const tmp = require(`tmp`);
const nock = require('nock');

chai.use(chaiAsPromised);
const expect = chai.expect;

const after = mocha.after;
const before = mocha.before;
const beforeEach = mocha.beforeEach;
const describe = mocha.describe;
const it = mocha.it;

describe(`npm-publish-git-tag`, function () {
  // Setting up our fake project and creating git commits takes longer than the default Mocha timeout.
  this.timeout(20000);

  before(function () {
    nock.disableNetConnect();
  });

  before(function () {
    // Switch into a temporary directory to isolate the behavior of this tool from
    // the rest of the environment.
    this.cwd = process.cwd();
    this.tmpDir = tmp.dirSync();
    process.chdir(this.tmpDir.name);

    // Empty `package.json` file for our publish pipeline to write a version into.
    fs.writeFileSync(`package.json`, `{ "name": "test", "version": "1.0.0" }`);

    // Do not console print output from tools invoked by `shelljs`.
    shell.config.silent = true;

    // Create git repository and then generate two commits, tagging each commit with a unique
    // semantic version valid tag. The second tag should be the one pulled by the pipeline.
    shell.exec(`git init`);
    shell.exec(`git config user.email "you@example.com"`);
    shell.exec(`git config user.name "Your Name"`);
    shell.exec(`git commit --allow-empty -m "init" --no-gpg-sign`);

    // Create stub for setting the npm auth token.
    // TODO: Need a better way to isolate behavior of `npm.setAuthToken` so that
    // we don't need to mock the entire function. We really do want to verify the expected
    // behavior of `npm.setAuthToken`.
    const setAuthTokenStub = sinon.stub();
    setAuthTokenStub.rejects(); // Default case.
    setAuthTokenStub.withArgs(undefined).resolves();

    // Create stub for publishing an npm package.
    // TODO: Need a better way to isolate behavior of `npm.publish` so that
    // we don't need to mock the entire function. We really do want to verify the expected
    // behavior of `npm.publish`.
    const publishStub = sinon.stub();
    publishStub.rejects(); // Default case.
    publishStub.withArgs({access: 'public'}).resolves();
    publishStub.withArgs({access: 'restricted'}).resolves();

    // Create an instance of `publishGitTag` with the `npm-utils` methods mocked out to
    // prevent interaction with directories and processes outside of this test.
    this.publishGitTag = proxyquire(`./index`, {
      'npm-utils': {
        setAuthToken: setAuthTokenStub,
        publish: publishStub,
      },
    });
  });

  after(function () {
    process.chdir(this.cwd);
  });

  describe(`existing tag`, function () {
    beforeEach(function () {
      shell.exec(`git tag 1.0.1`);
      shell.exec(`git commit --allow-empty -m "change" --no-gpg-sign`);
      shell.exec(`git tag 1.2.1`);
    });

    it(`writes last git tag to 'package.json'`, function () {
      return expect(this.publishGitTag()).to.be.fulfilled
        .then(function () {
          const packageContent = JSON.parse(fs.readFileSync(`package.json`));
          expect(packageContent.name).to.equal(`test`);
          expect(packageContent.version).to.equal(`1.2.1`);
        });
    });
  });

  describe(`publishing patches and minor versions off of a branch`, function () {
    // We want to test the ability to run `npm-publish-git-tag` off of a branch.

    // Occasionally people will encounter the following scenario:

    // Someone has released a new major version of their project. A consumer of that project reports a bug in the
    // earlier major version, and can't, for whatever reason, upgrade to the latest major version at this time. That
    // consumer would greatly benefit if the project could quickly submit a patch against the earlier major version
    // and have `npm-publish-git-tag` automatically publish that version.

    // The owner of the project should be able to create a dedicated branch off of the latest code for the previous
    // major version, push a bug fix to that branch, and after having a new tag created on that branch, have
    // `npm-publish-git-tag` automatically publish the new patch version.

    beforeEach(function () {
      shell.exec(`git tag 1.0.1`);
      shell.exec(`git commit --allow-empty -m "feat(index): major change\n\nBREAKING CHANGE: change" --no-gpg-sign`);

      // Tag a new major version for this test package.
      shell.exec(`git tag 2.0.0`);

      // Checkout the package at an earlier version so that we can release a patch, or bug fix, on top of the code
      // released as part of the version 1.x.x range.
      shell.exec(`git checkout -b fix/package 1.0.1`);

      // Tag a new patch version on top of the created branch.
      shell.exec(`git commit --allow-empty -m "fix(index): remove bug" --no-gpg-sign`);
      shell.exec(`git tag 1.0.2`);
    });

    it(`should publish patch version using latest tag on the current branch`, function () {
      return expect(this.publishGitTag()).to.be.fulfilled
        .then(function () {
          const packageContent = JSON.parse(fs.readFileSync(`package.json`));
          expect(packageContent.name).to.equal(`test`);
          expect(packageContent.version).to.equal(`1.0.2`);
        });
    });
  });
});
