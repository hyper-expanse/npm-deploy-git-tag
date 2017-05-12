# npm-publish-git-tag

[![build status](https://gitlab.com/hyper-expanse/npm-publish-git-tag/badges/master/build.svg)](https://gitlab.com/hyper-expanse/npm-publish-git-tag/commits/master)
[![codecov.io](https://codecov.io/gitlab/hyper-expanse/npm-publish-git-tag/coverage.svg?branch=master)](https://codecov.io/gitlab/hyper-expanse/npm-publish-git-tag?branch=master)

> Publish to an `npm`-compatible registry using the latest git tag from that package's repository.

Publishing a package to an `npm`-compatible registry may include:
* Updating a `package.json` file with a new version number that matches a git tag.
* Writing an authentication token to an `.npmrc` file.
* Running `npm` publish.

By automating these steps `npm-publish-git-tag` alleviates some of the overhead in managing a project, allowing you to quickly and consistently publish enhancements that provide value to your consumers.

This idea, however, is not new. `npm-publish-git-tag` was heavily inspired by the work of [ci-publish](https://www.npmjs.com/package/ci-publish).

## Features

* [&#x2713;] Get latest tag from current project using [ggit](https://www.npmjs.com/package/ggit).
* [&#x2713;] Write the version number to the project's `package.json` file using [modify-pkg](https://www.npmjs.com/package/write-pkg)
* [&#x2713;] Publish package to an `npm`-compatible registry with [npm-utils](https://www.npmjs.com/package/npm-utils).

## Installation

To install the `npm-publish-git-tag` tool for use in your project's publish process please run the following command:

```bash
yarn add --dev npm-publish-git-tag
```

If you are using the `npm` package manager:

```bash
npm install --save-dev npm-publish-git-tag
```

## Usage

Setup the environment variable described in the _Required Environment Variable_ section.

Then call `npm-publish-git-tag` from within your project's top folder:

```bash
$(yarn bin)/npm-publish-git-tag
```

If you're using the `npm` package manager:

```bash
$(npm bin)/npm-publish-git-tag
```

To learn how `npm-publish-git-tag` can be used to automatically publish your project when new changes are pushed to your repository, which we highly recommend, please see the _Continuous Integration and Delivery (CID) Setup_ section below.

### How the Publish Happens

First step of `npm-publish-git-tag` is to get the latest git tag on the current branch for your project and treat it as a [semantically valid version number](http://semver.org/). With the version number in hand, we write the version number to the `version` field within your project's `package.json` file. Writing the version number to your project's `package.json` allows us to publish your package regardless of how you tag, or otherwise, update, your project's version.

Once your project's `package.json` file has been updated, we take the `NPM_TOKEN` environment variable, which should be exposed within your environment as specified in the _Required Environment Variable_ section, and write its value out to the user's global `.npmrc` file.

Lastly, `npm-publish-git-tag` publishes your package to either the authoritative npm registry, or an alternative `npm`-compatible registry (Please see _Publishing Elsewhere Besides Public npm Registry_ to learn how to use an alternative registry).

### Required Environment Variable

For `npm-publish-git-tag` to publish a package to an `npm`-compatible registry an [npm token](http://blog.npmjs.org/post/118393368555/deploying-with-npm-private-modules) must be setup within your environment.

**Environment variable name** - `NPM_TOKEN`

The account associated with the npm token must own, or co-own, the package on the `npm`-compatible registry for the publishing task to succeed. It will also succeed if the package does not already exist on the `npm`-compatible registry.

### Continuous Integration and Delivery (CID) Setup

Since `npm-publish-git-tag` relies on an npm authentication token, and a package published to the public npm registry, `npm-publish-git-tag` works on any Git-based continuous integration platforms; such as _GitLab CI_, _Travis CI_, _CircleCI_ etc.

However, given the enormous number of CI providers available, we will only cover the CI system built into GitLab.

Configuring a GitLab CI job is facilitated through a `.gitlab-ci.yml` configuration file kept at the root of your project. To publish a package using `npm-publish-git-tag` you will need to create a dedicated job that executes only after a new git tag has been pushed to your repository.

That can be done with GitLab CI by creating a job called `publish`, though any name will work. Within the `publish` job install your project's dependencies, run any build required to transpile your code, and finally, call `npm-publish-git-tag`.

You can see a snippet of a `.gitlab-ci.yml` file below with this setup:

```yaml
publish:
	before_script:
		- yarn install --freeze-lockfile
	image: node:6
	only:
		- tags
	script:
		- # build step, if any
		- $(yarn bin)/npm-publish-git-tag
```

`npm-publish-git-tag` works well with tools like [semantic-release-gitlab](https://www.npmjs.com/package/semantic-release-gitlab). `semantic-release-gitlab` creates a git tag based on unreleased commits and pushes that tag to GitLab. Assuming the setup above, once the tag has been pushed to GitLab, your project's `publish` job would execute, and `npm-publish-git-tag` would publish your package to your desired `npm`-compatible registry.

Full documentation for GitLab CI is available on the [GitLab CI](http://docs.gitlab.com/ce/ci/yaml/README.html) site.

You may also take a look at our [.gitlab-ci.yml](https://gitlab.com/hyper-expanse/npm-publish-git-tag/blob/master/.gitlab-ci.yml) file as an example.

## Publishing Elsewhere Besides Public npm Registry

It's possible to publish your package to any `npm`-compatible registry, not just the official public registry. When publishing a package `npm-publish-git-tag` uses the built-in `publish` command of npm. Any features supported by `npm publish` are available. For example, you may specify, on a per-project basis, which registry to publish your package to by setting the [publishConfig](https://docs.npmjs.com/misc/registry#i-dont-want-my-package-published-in-the-official-registry-its-private) property in your project's `package.json` file.

Alternative registries may include on-premise solutions such as [Artifactory](https://www.jfrog.com/artifactory/) and [npm enterprise](https://www.npmjs.com/enterprise).

## Debugging

To assist users of `npm-publish-git-tag` with debugging the behavior of this module we use the [debug](https://www.npmjs.com/package/debug) utility package to print information about the publish process to the console. To enable debug message printing, the environment variable `DEBUG`, which is the variable used by the `debug` package, must be set to a value configured by the package containing the debug messages to be printed.

To print debug messages on a unix system set the environment variable `DEBUG` with the name of this package prior to executing `npm-publish-git-tag`:

```bash
DEBUG=npm-publish-git-tag npm-publish-git-tag
```

On the Windows command line you may do:

```bash
set DEBUG=npm-publish-git-tag
npm-publish-git-tag
```

`npm-publish-git-tag` uses numerous other npm packages and many of those use the `debug` utility package as well. For example, to print the debug messages from [npm-utils](https://www.npmjs.com/package/npm-utils) you may assign `npm-publish-git-tag` and `npm-utils` to the `DEBUG` environment variable like so:

```bash
DEBUG=npm-publish-git-tag,npm-utils npm-publish-git-tag
```

You may also print debug messages for the underlying HTTP request library, [request](https://www.npmjs.com/package/request), by setting the `NODE_DEBUG` environment variable to `request`, as [shown in their documentation](https://www.npmjs.com/package/request#debugging).

As an example:

```bash
NODE_DEBUG=request npm-publish-git-tag
```

## Node Support Policy

We only support [Long-Term Support](https://github.com/nodejs/LTS) versions of Node.

We specifically limit our support to LTS versions of Node, not because this package won't work on other versions, but because we have a limited amount of time, and supporting LTS offers the greatest return on that investment.

It's possible this package will work correctly on newer versions of Node. It may even be possible to use this package on older versions of Node, though that's more unlikely as we'll make every effort to take advantage of features available in the oldest LTS version we support.

As each Node LTS version reaches its end-of-life we will remove that version from the `node` `engines` property of our package's `package.json` file. Removing a Node version is considered a breaking change and will entail the publishing of a new major version of this package. We will not accept any requests to support an end-of-life version of Node. Any merge requests or issues supporting an end-of-life version of Node will be closed.

We will accept code that allows this package to run on newer, non-LTS, versions of Node. Furthermore, we will attempt to ensure our own changes work on the latest version of Node. To help in that commitment, our continuous integration setup runs against all LTS versions of Node in addition the most recent Node release; called _current_.

JavaScript package managers should allow you to install this package with any version of Node, with, at most, a warning if your version of Node does not fall within the range specified by our `node` `engines` property. If you encounter issues installing this package, please report the issue to your package manager.

## Contributing

Please read our [contributing guide](https://gitlab.com/hyper-expanse/npm-publish-git-tag/blob/master/CONTRIBUTING.md) to see how you may contribute to this project.
