#!/usr/bin/env node

'use strict';

const pkg = require(`../package.json`);
const program = require(`commander`);
const publishGitTag = require(`./index`);

program
  .description(pkg.description)
  .version(pkg.version)
  .option('-a, --access <access>', 'published as [public] or [restricted]', /^(public|restricted)$/i, 'restricted')
  .option('-s, --skip-token', 'skip authentication with a token')
  .parse(process.argv)
;

publishGitTag()
  .catch(error => {
    console.error(`npm-publish-git-tag failed for the following reason - ${error}`);
    process.exit(1);
  })
;
