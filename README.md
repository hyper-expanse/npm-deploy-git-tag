# npm-publish-git-tag

[![build status](https://gitlab.com/hyper-expanse/npm-publish-git-tag/badges/master/build.svg)](https://gitlab.com/hyper-expanse/npm-publish-git-tag/commits/master)
[![codecov.io](https://codecov.io/gitlab/hyper-expanse/npm-publish-git-tag/coverage.svg?branch=master)](https://codecov.io/gitlab/hyper-expanse/npm-publish-git-tag?branch=master)

> Publish a package to an `npm`-compatible registry using the latest semantic version git tag of that package.

`npm-publish-git-tag` is designed to automate the process of publishing a package to an `npm`-compatible registry using the latest semantic version git tag from that package's git repository.

Publishing an npm package to an `npm`-compatible registry may include:
* Updating a `package.json` file with a new version number that matches a git tag.
* Writing an npm authentication token to an `.npmrc` file.
* Running `npm` publish.

While `npm-publish-git-tag` can be used locally on your command line, we strongly recommend using `npm-publish-git-tag` within a continuous integration job on platforms such as _GitLab CI_, _Travis CI_, or others.

Furthermore, while this tool uses `npm` for publishing, it can be used to publish projects that use Yarn for managing their dependencies (except `npm` can't use a `.yarnrc` file if found at the root of the project).

By automating these steps `npm-publish-git-tag` alleviates some of the overhead in managing a project, allowing you to quickly and consistently publish enhancements that provide value to your consumers.

This idea, however, is not new. `npm-publish-git-tag` was heavily inspired by the work of [semantic-release](https://www.npmjs.com/package/semantic-release) and [ci-publish](https://www.npmjs.com/package/ci-publish).

## Features

* [&#x2713;] Get latest semantic version tag from current project using [ggit](https://www.npmjs.com/package/ggit).
* [&#x2713;] Write the version number to the project's `package.json` file using [modify-pkg-up](https://www.npmjs.com/package/modify-pkg-up)
* [&#x2713;] Publish package to an `npm`-compatible registry with [npm-utils](https://www.npmjs.com/package/npm-utils).

## Installation

To install the `npm-publish-git-tag` tool for use in your project's release process, please run the following command:

```bash
npm install --save-dev npm-publish-git-tag
```

## Usage

Once installed `npm-publish-git-tag` may be invoked by executing the CLI tool exported by the package. Installed into your project's `node_modules` `bin` directory is the `npm-publish-git-tag` executable. It can be invoked directly by calling `$(npm bin)/npm-publish-git-tag` (`$(yarn bin)` may also be used in place of `npm`). To learn how `npm-publish-git-tag` can be used as part of your project's release process please see the _Continuous Integration and Delivery (CID) Setup_ section below.

First step of `npm-publish-git-tag` is to get the latest git tag for your project and treat it as a semantically valid version number. With the version number in hand, we write the version number to the `version` field within your project's `package.json` file. Writing the version number to your project's `package.json` allows us to publish your package regardless of how you tag, or otherwise, update, your project's version.

Once your project's `package.json` file has been updated, we take the `NPM_TOKEN` environment variable, which should be exposed within your environment as specified in the _Required Environment Settings_ section, and write its value out to the user's global `.npmrc` file.

Lastly, `npm-publish-git-tag` publishes your package to either the authoritative npm registry, or an alternative `npm`-compatible registry (Please see _Publishing Elsewhere Besides Public npm Registry_ to learn how to use an alternative registry).

### Required Environment Settings

For `npm-publish-git-tag` to publish packages to the npm registry an environment variable must be setup within your continuous integration job.

| **Required Token** | **Environment Variable Name** |
| ------------------ | ----------------------------- |
| [npm token](http://blog.npmjs.org/post/118393368555/deploying-with-npm-private-modules) | `NPM_TOKEN` |

### Continuous Integration and Delivery (CID) Setup

Since `npm-publish-git-tag` relies solely on an environment variable, and a package published on the public npm registry, `npm-publish-git-tag` is compatible with all continuous integration platforms; such as _GitLab CI_, _Travis CI_, etc.

However, given the enormous number of CI providers available we will only cover the CI system built into GitLab.

Configuring a GitLab CI job is facilitated through a `.gitlab-ci.yml` configuration file. To publish a package using `npm-publish-git-tag` you will need to create a dedicated job that triggers on a semantic version tag getting pushed to your repository.

In GitLab CI that is possible by creating a job called `publish`, though any name will work. Within the `publish` job we install your project's dependencies, run any build required to transpile your code, and finally, call `npm-publish-git-tag`.

You can see a snippet of a `.gitlab-ci.yml` file with this setup below:

```yaml
publish:
	before_script:
		- npm install
	only:
		- tags
		- triggers
	script:
		- # run your project's build
		- $(npm bin)/npm-publish-git-tag
```

`npm-publish-git-tag` works well with projects like [semantic-release-gitlab](https://www.npmjs.com/package/semantic-release-gitlab). `semantic-release-gitlab` creates a git tag based on unreleased commits, and pushes that tag to GitLab. Assuming the setup above, once the tag has been pushed to GitLab, your project's `publish` job would execute, and `npm-publish-git-tag` would publish your package to your desired `npm`-compatible registry.

Full documentation for GitLab CI is available on the [GitLab CI](http://docs.gitlab.com/ce/ci/yaml/README.html) website.

You may also take a look at our [.gitlab-ci.yml](https://gitlab.com/hyper-expanse/npm-publish-git-tag/blob/master/.gitlab-ci.yml) file as an example.

## Publishing Elsewhere Besides Public npm Registry

It's possible to publish your package to any npm registry, not just the official public registry. When publishing a package `npm-publish-git-tag` uses the built-in `publish` command of npm. Any features supported by `npm publish` are available. For example, you may specify, on a per-project basis, which registry to publish your package to by setting the [publishConfig](https://docs.npmjs.com/misc/registry#i-dont-want-my-package-published-in-the-official-registry-its-private) property in your project's `package.json` file.

Alternative registries may include on-premise solutions such as [Artifactory](https://www.jfrog.com/artifactory/) and [npm enterprise](https://www.npmjs.com/enterprise).

## Debugging

To assist users of the `npm-publish-git-tag` plugin with debugging the behavior of this module we use the [debug](https://www.npmjs.com/package/debug) utility package to print information about the release process to the console. To enable debug message printing, the environment variable `DEBUG`, which is the variable used by the `debug` package, must be set to a value configured by the package containing the debug messages to be printed.

To print debug messages on a unix system set the environment variable `DEBUG` with the name of this package prior to executing a tool that invokes this plugin:

```bash
DEBUG=npm-publish-git-tag [RELEASE TOOL]
```

On the Windows command line you may do:

```bash
set DEBUG=npm-publish-git-tag
[RELEASE TOOL]
```

`npm-publish-git-tag` uses `debug` to print information to the console. You can instruct `npm-publish-git-tag` to print its debugging information by using `npm-publish-git-tag` as the value of the `DEBUG` environment variable.

```bash
DEBUG=npm-publish-git-tag npm-publish-git-tag
```

You may also print debug messages for the underlying HTTP request library, [request](https://www.npmjs.com/package/request), by setting the `NODE_DEBUG` environment variable to `request`, as [shown in their documentation](https://www.npmjs.com/package/request#debugging).

As an example:

```bash
NODE_DEBUG=request npm-publish-git-tag
```

## Contributing

Please read our [contributing](https://gitlab.com/hyper-expanse/npm-publish-git-tag/blob/master/CONTRIBUTING.md) guide on how you can help improve this project.
