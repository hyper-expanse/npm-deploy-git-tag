#!/usr/bin/env node

'use strict';

const pkg = require(`../package.json`);
const program = require(`commander`);
const publishGitTag = require(`./index`);

program
  .description(pkg.description)
  .version(pkg.version)
  .parse(process.argv)
;

publishGitTag();
