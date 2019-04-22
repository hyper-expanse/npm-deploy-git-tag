# @hutson/npm-deploy-git-tag

> Deploy a package to an `npm`-compatible registry using the latest git tag from that package's repository.

Deploying a package to an `npm`-compatible registry may include:
* Updating a `package.json` file with a new version number (One that matches an existing git tag).
* Writing an authentication token to an `.npmrc` file.
* Running `npm publish`.

By automating these steps `@hutson/npm-deploy-git-tag` alleviates some of the overhead in managing a project, allowing you to quickly and consistently deploy enhancements that provide value to your consumers.

## Table of Contents
<!-- START doctoc generated TOC please keep comment here to allow auto update -->
<!-- DON'T EDIT THIS SECTION, INSTEAD RE-RUN doctoc TO UPDATE -->


- [Features](#features)
- [Installation](#installation)
- [Usage](#usage)
  - [CLI Options](#cli-options)
  - [How the Publish Happens](#how-the-publish-happens)
  - [Required Environment Variable](#required-environment-variable)
  - [Continuous Integration and Delivery (CID) Setup](#continuous-integration-and-delivery-cid-setup)
- [Publishing Elsewhere Besides Public npm Registry](#publishing-elsewhere-besides-public-npm-registry)
- [Debugging](#debugging)
- [Node Support Policy](#node-support-policy)
- [Contributing](#contributing)

<!-- END doctoc generated TOC please keep comment here to allow auto update -->

## Features

* [x] Get latest tag from current project using [git-latest-semver-tag](https://www.npmjs.com/package/git-latest-semver-tag).
* [x] Write the version number to the project's `package.json` file using [read-pkg](https://www.npmjs.com/package/read-pkg) and [write-pkg](https://www.npmjs.com/package/write-pkg).
* [x] Deploy package to an `npm`-compatible registry with [set-npm-auth-token-for-ci](https://www.npmjs.com/package/set-npm-auth-token-for-ci).

## Installation

To install the `@hutson/npm-deploy-git-tag` tool for use in your project's deploy process please run the following command:

```bash
yarn add [--dev] @hutson/npm-deploy-git-tag
```

## Usage

Setup the environment variable described in the _Required Environment Variable_ section.

There are two ways to use `@hutson/npm-deploy-git-tag`, either as a CLI tool, or programmatically.

To learn how `@hutson/npm-deploy-git-tag` can be used to automatically deploy your project after you've pushed new changes to your repository, please see the _Continuous Integration and Delivery (CID) Setup_ section below.

**CLI Tool**

Call `@hutson/npm-deploy-git-tag` from within your project's top folder:

```bash
$(yarn bin)/npm-deploy-git-tag
```

**Programmatically**

```javascript
const npmDeployGitTag = require(`@hutson/npm-deploy-git-tag`);

const config = {
	/**
	 * Options are the camelCase form of their respective CLI flag.
	 */

	/**
	 * The `--skip-token` option can be set like so:
	*/
	skipToken: true,

	/**
	 * The `--access` option can be set like so:
	 */
	access: `restricted`,
};

try {
	const result = await npmDeployGitTag(config);
	/* Package successfully deployed to an npm registry. */
} catch (error) {
	/* Do any exception handling here. */
}
```

### CLI Options

The following CLI options are supported and can be passed to `@hutson/npm-deploy-git-tag`:

**[--help]**

Help on using the CLI.

```bash
$(yarn bin)/npm-deploy-git-tag --help
```

**[--access <public|restricted>]** - Documentation available on [npm website](https://docs.npmjs.com/cli/publish).

Deploying a scoped package as a public package requires that you set `--access` to `public`.

```bash
$(yarn bin)/npm-deploy-git-tag --access public
```

If you attempt to deploy a scoped package as `restricted`, but you do not have a paid account with Npm Inc., you will receive an error similar to the following:

```bash
npm ERR! publish Failed PUT 402
npm ERR! code E402
npm ERR! "You must sign up for private packages" : @scope/example-package
```

**[--skip-token]**

Allows you to deploy an npm package without requiring you to set an `NPM_TOKEN` environment variable containing your npm authentication token.

```bash
$(yarn bin)/npm-deploy-git-tag --skip-token
```

You may already have your `.npmrc` configuration file setup with the proper authentication for your npm registry, or your npm registry may not require authentication for deploying (such as local, offline, registries commonly used for testing).

### How the Deploy Happens

First step of `@hutson/npm-deploy-git-tag` is to get the latest git tag on the current branch for your project and treat it as a [semantically valid version number](http://semver.org/). With the version number in hand, we write the version number to the `version` field within your project's `package.json` file. Writing the version number to your project's `package.json` allows us to deploy your package regardless of how you tag, or otherwise, update, your project's version.

Once your project's `package.json` file has been updated, we take the `NPM_TOKEN` environment variable, which should be exposed within your environment as specified in the _Required Environment Variable_ section, and write its value out to the user's global `.npmrc` file.

Lastly, `@hutson/npm-deploy-git-tag` deploys your package to either the authoritative npm registry, or an alternative `npm`-compatible registry (Please see _Publishing Elsewhere Besides Public npm Registry_ to learn how to use an alternative registry).

### Required Environment Variable

For `@hutson/npm-deploy-git-tag` to deploy a package to an `npm`-compatible registry an [npm token](http://blog.npmjs.org/post/118393368555/deploying-with-npm-private-modules) must be setup within your environment.

**Environment variable name** - `NPM_TOKEN`

The account associated with the npm token must own, or co-own, the package on the `npm`-compatible registry for the deploy task to succeed. It will also succeed if the package does not already exist on the `npm`-compatible registry.

### Continuous Integration and Delivery (CID) Setup

Since `@hutson/npm-deploy-git-tag` relies on an npm authentication token, and a package deployed to the public npm registry, `@hutson/npm-deploy-git-tag` works on any Git-based continuous integration platforms; such as _GitLab CI_, _Travis CI_, _CircleCI_ etc.

However, given the enormous number of CI providers available, we will only cover the CI system built into GitLab.

Configuring a GitLab CI job is facilitated through a `.gitlab-ci.yml` configuration file kept at the root of your project. To deploy a package using `@hutson/npm-deploy-git-tag` you will need to create a dedicated job that executes only after a new git tag has been pushed to your repository.

That can be done with GitLab CI by creating a job called `deploy`, though any name will work. Within the `deploy` job install your project's dependencies, run any build required to transpile your code, and finally, call `@hutson/npm-deploy-git-tag`.

You can see a snippet of a `.gitlab-ci.yml` file below with this setup:

```yaml
deploy:
	before_script:
		- yarn install --frozen-lockfile
	image: node:8
	only:
		- tags
	script:
		- $(yarn bin)/npm-deploy-git-tag
```

`@hutson/npm-deploy-git-tag` works well with tools like [semantic-release-gitlab](https://www.npmjs.com/package/semantic-release-gitlab). `semantic-release-gitlab` creates a git tag based on unreleased commits and pushes that tag to GitLab. Assuming the setup above, once the tag has been pushed to GitLab, your project's `deploy` job would execute, and `@hutson/npm-deploy-git-tag` would deploy your package to your desired `npm`-compatible registry.

Full documentation for GitLab CI is available on the [GitLab CI](http://docs.gitlab.com/ce/ci/yaml/README.html) site.

You may also take a look at our [.gitlab-ci.yml](https://gitlab.com/hyper-expanse/open-source/@hutson/npm-deploy-git-tag/blob/master/.gitlab-ci.yml) file as an example.

## Deploying Elsewhere Besides Public npm Registry

It's possible to deploy your package to any `npm`-compatible registry, not just the official public registry. When deploying a package `@hutson/npm-deploy-git-tag` uses the built-in `publish` command of npm. Any features supported by `npm publish` are available. For example, you may specify, on a per-project basis, which registry to deploy your package to by setting the [publishConfig](https://docs.npmjs.com/misc/registry#i-dont-want-my-package-published-in-the-official-registry-its-private) property in your project's `package.json` file.

Alternative registries may include on-premise solutions such as [Artifactory](https://www.jfrog.com/artifactory/) and [npm enterprise](https://www.npmjs.com/enterprise).

## Professional Support

[Professional support for `@hutson/semantic-delivery-gitlab` is available with a Tidelift Subscription](https://tidelift.com/subscription/pkg/npm--hutson-npm-deploy-git-tag?utm_source=npm--hutson-npm-deploy-git-tag&utm_medium=referral&utm_campaign=readme).

Tidelift helps make open source sustainable for maintainers while giving companies assurances about security, maintenance, and licensing for their dependencies.

## Debugging

To assist users of `@hutson/npm-deploy-git-tag` with debugging the behavior of this module we use the [debug](https://www.npmjs.com/package/debug) utility package to print information about the deploy process to the console. To enable debug message printing, the environment variable `DEBUG`, which is the variable used by the `debug` package, must be set to a value configured by the package containing the debug messages to be printed.

To print debug messages on a unix system set the environment variable `DEBUG` with the name of this package prior to executing `@hutson/npm-deploy-git-tag`:

```bash
DEBUG=npm-deploy-git-tag npm-deploy-git-tag
```

On the Windows command line you may do:

```bash
set DEBUG=npm-deploy-git-tag
npm-deploy-git-tag
```

## Node Support Policy

We only support [Long-Term Support](https://github.com/nodejs/LTS) versions of Node.

We specifically limit our support to LTS versions of Node, not because this package won't work on other versions, but because we have a limited amount of time, and supporting LTS offers the greatest return on that investment.

It's possible this package will work correctly on newer versions of Node. It may even be possible to use this package on older versions of Node, though that's more unlikely as we'll make every effort to take advantage of features available in the oldest LTS version we support.

As each Node LTS version reaches its end-of-life we will remove that version from the `node` `engines` property of our package's `package.json` file. Removing a Node version is considered a breaking change and will entail the publishing of a new major version of this package. We will not accept any requests to support an end-of-life version of Node. Any merge requests or issues supporting an end-of-life version of Node will be closed.

We will accept code that allows this package to run on newer, non-LTS, versions of Node. Furthermore, we will attempt to ensure our own changes work on the latest version of Node. To help in that commitment, our continuous integration setup runs against all LTS versions of Node in addition the most recent Node release; called _current_.

JavaScript package managers should allow you to install this package with any version of Node, with, at most, a warning if your version of Node does not fall within the range specified by our `node` `engines` property. If you encounter issues installing this package, please report the issue to your package manager.

## Contributing

Please read our [contributing guide](https://gitlab.com/hyper-expanse/open-source/npm-deploy-git-tag/blob/master/CONTRIBUTING.md) to see how you may contribute to this project.
