#!/usr/bin/env node

'use strict';

const isScoped = require(`is-scoped`);
const pkg = require(`../package.json`);
const program = require(`commander`);
const publishGitTag = require(`./index`);
const readPkg = require(`read-pkg`);

program
  .description(pkg.description)
  .version(pkg.version)
  .option('-a, --access <access>', 'published as [public] or [restricted]', /^(public|restricted)$/i, 'restricted')
  .parse(process.argv);
readPkg()
  .then(pkg => isScoped(pkg.name))

  // You can not restrict an un-scoped package as all un-scoped packages must be published publicly.
  .then(scoped => publishGitTag({access: scoped ? program.access : `public`}))
  .catch(error => {
    console.error(`npm-publish-git-tag failed for the following reason - ${error}`);
    process.exit(1);
  });

