'use strict';

/* eslint-disable no-unused-expressions */

const chai = require('chai');
const fs = require('fs');
const { afterEach, beforeEach, describe, it } = require('mocha');
const shell = require('shelljs');
const sinon = require('sinon');
const sinonChai = require('sinon-chai');
const tmp = require('tmp');

const { deployGitTag } = require('../');

chai.use(sinonChai);
const { expect } = chai;

shell.config.silent = true;

describe('npm-deploy-git-tag', function () {
  // Setting up our fake project and creating git commits takes longer than the default Mocha timeout.
  this.timeout(20000);

  beforeEach(function () {
    // Switch into a temporary directory to isolate the behavior of this tool from
    // the rest of the environment.
    this.cwd = process.cwd();
    this.tmpDir = tmp.dirSync();
    process.chdir(this.tmpDir.name);

    // Default `package.json` file for our publish pipeline to write a version into.
    fs.writeFileSync('package.json', '{ "name": "test", "version": "0.0.0" }');

    // Empty `.npmrc` configuration file which our publish pipeline will augment with authentication token placeholder.
    fs.writeFileSync('.npmrc', '');

    // Setup our test git repository that we'll use in future tests.
    shell.exec('git init');
    shell.exec('git config user.email "you@example.com"');
    shell.exec('git config user.name "Your Name"');
    shell.exec('git commit --allow-empty -m "init" --no-gpg-sign');

    // Create stub for publishing an npm package as we don't want to actually publish a package
    // as part of our integration tests.
    this.execStub = sinon.stub();
    this.execStub.rejects(); // Simple default case. We will setup expected behavior later.

    this.wrapped = options => deployGitTag({ exec: this.execStub })(options);
  });

  afterEach(function () {
    process.chdir(this.cwd);
  });

  it('fails if there are no semantic version tags available', async function () {
    try {
      await this.wrapped({ token: 'token' });
    } catch (error) {
      expect(error.message).to.equal('No valid semantic version tag available for deploying.');
      return;
    }

    throw new Error();
  });

  describe('existing tag', () => {
    beforeEach(() => {
      shell.exec('git tag 1.0.0');
    });

    it('errors out if the publish fails', async function () {
      this.execStub.withArgs('npm publish').returns({ code: 1, stderr: 'Failed' });

      try {
        await this.wrapped({ token: 'token' });
      } catch (error) {
        expect(error.message).to.equal('Failed');
        return;
      }

      throw new Error();
    });

    it('writes last git tag to \'package.json\'', async function () {
      this.execStub.withArgs('npm publish').returns({ code: 0 });

      await this.wrapped({ token: 'token' });
      const packageContent = JSON.parse(fs.readFileSync('package.json'));

      expect(packageContent.name).to.equal('test');
      expect(packageContent.version).to.equal('1.0.0');
      expect(this.execStub).to.have.been.calledOnce;
    });

    it('augments \'.npmrc\' with authentication placeholder', async function () {
      this.execStub.withArgs('npm publish').returns({ code: 0 });

      await this.wrapped({ token: 'token' });
      const npmrcContent = fs.readFileSync('.npmrc');

      expect(npmrcContent.toString()).to.contain(':_authToken=${NPM_TOKEN}\n'); // eslint-disable-line no-template-curly-in-string
      expect(this.execStub).to.have.been.calledOnce;
    });

    describe('with a trailing commit', () => {
      beforeEach(() => {
        shell.exec('git commit --allow-empty -m "feat(index): add enhancement" --no-gpg-sign');
      });

      /**
       * TODO: This particular case should fail. We should not attempt to publish a commit with
       * a previous commit's tag.
       */
      it('writes last git tag to \'package.json\' but publishes current commit', async function () {
        this.execStub.withArgs('npm publish').returns({ code: 0 });

        await this.wrapped({ token: 'token' });
        const packageContent = JSON.parse(fs.readFileSync('package.json'));

        expect(packageContent.name).to.equal('test');
        expect(packageContent.version).to.equal('1.0.0');
        expect(this.execStub).to.have.been.calledOnce;
      });
    });

    describe('with a second tag', () => {
      beforeEach(() => {
        shell.exec('git commit --allow-empty -m "feat(index): add enhancement" --no-gpg-sign');
        shell.exec('git tag 1.1.0');
      });

      it('writes tag pointing at the current commit to \'package.json\'', async function () {
        this.execStub.withArgs('npm publish').returns({ code: 0 });

        await this.wrapped({ token: 'token' });
        const packageContent = JSON.parse(fs.readFileSync('package.json'));

        expect(packageContent.name).to.equal('test');
        expect(packageContent.version).to.equal('1.1.0');
        expect(this.execStub).to.have.been.calledOnce;
      });
    });

    it('can set access level for deployment\'', async function () {
      this.execStub.withArgs('npm publish --access restricted').returns({ code: 0 });

      await this.wrapped({ access: 'restricted', token: 'token' });

      expect(this.execStub).to.have.been.calledOnce;
    });

    it('can set distribution tag for deployment\'', async function () {
      this.execStub.withArgs('npm publish --tag next').returns({ code: 0 });

      await this.wrapped({ tag: 'next', token: 'token' });

      expect(this.execStub).to.have.been.calledOnce;
    });

    it('does not augment \'.npmrc\' with authentication placeholder if a token is not provided', async function () {
      this.execStub.withArgs('npm publish').returns({ code: 0 });

      await this.wrapped();
      const npmrcContent = fs.readFileSync('.npmrc');

      expect(npmrcContent.toString()).to.equal('');
      expect(this.execStub).to.have.been.calledOnce;
    });
  });

  describe('publishing patches and minor versions off of a branch', () => {
    // We want to test the ability to run `npm-deploy-git-tag` off of a branch.

    // Occasionally people will encounter the following scenario:

    // Someone has released a new major version of their project. A consumer of that project reports a bug in the
    // earlier major version, and can't, for whatever reason, upgrade to the latest major version at this time. That
    // consumer would greatly benefit if the project could quickly submit a patch against the earlier major version
    // and have `npm-deploy-git-tag` automatically publish that version.

    // The owner of the project should be able to create a dedicated branch off of the latest code for the previous
    // major version, push a bug fix to that branch, and after having a new tag created on that branch, have
    // `npm-deploy-git-tag` automatically publish the new patch version.

    beforeEach(() => {
      shell.exec('git tag 1.0.1');
      shell.exec('git commit --allow-empty -m "feat(index): major change\n\nBREAKING CHANGE: change" --no-gpg-sign');

      // Tag a new major version for this test package.
      shell.exec('git tag 2.0.0');

      // Checkout the package at an earlier version so that we can release a patch, or bug fix, on top of the code
      // released as part of the version 1.x.x range.
      shell.exec('git checkout -b fix/package 1.0.1');

      // Tag a new patch version on top of the created branch.
      shell.exec('git commit --allow-empty -m "fix(index): remove bug" --no-gpg-sign');
      shell.exec('git tag 1.0.2');
    });

    it('should publish patch version using latest tag on the current branch', async function () {
      this.execStub.withArgs('npm publish').returns({ code: 0 });

      await this.wrapped({ token: 'token' });
      const packageContent = JSON.parse(fs.readFileSync('package.json'));

      expect(packageContent.name).to.equal('test');
      expect(packageContent.version).to.equal('1.0.2');
      expect(this.execStub).to.have.been.calledOnce;
    });
  });
});
