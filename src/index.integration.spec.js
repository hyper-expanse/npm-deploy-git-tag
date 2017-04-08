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

chai.use(chaiAsPromised);
const expect = chai.expect;

const after = mocha.after;
const before = mocha.before;
const describe = mocha.describe;
const it = mocha.it;

describe(`npm-publish-git-tag`, function () {
  before(function () {
    // Switch into a temporary directory to isolate the behavior of this tool from
    // the rest of the environment.
    this.cwd = process.cwd();
    this.tmpDir = tmp.dirSync();
    process.chdir(this.tmpDir.name);

    // Empty `package.json` file for our publish pipeline to write a version into.
    fs.writeFileSync(`package.json`, `{ "name": "test" }`);

    // Do not console print output from tools invoked by `shelljs`.
    shell.config.silent = true;

    // Create git repository and then generate two commits, tagging each commit with a unique
    // semantic version valid tag. The second tag should be the one pulled by the pipeline.
    shell.exec(`git init`);
    shell.exec(`git commit --allow-empty -m "init" --no-gpg-sign`);
    shell.exec(`git tag 1.0.1`);
    shell.exec(`git commit --allow-empty -m "change" --no-gpg-sign`);
    shell.exec(`git tag 1.2.1`);

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
    publishStub.withArgs(undefined).resolves();

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

  it(`writes last git tag to 'package.json'`, function () {
    return expect(this.publishGitTag()).to.be.fulfilled
      .then(function () {
        const packageContent = JSON.parse(fs.readFileSync(`package.json`));
        expect(packageContent.version).to.equal(`1.2.1`);
      });
  });
});
