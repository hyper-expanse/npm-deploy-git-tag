#!/usr/bin/env node

'use strict';

const isScoped = require('is-scoped');
const pkg = require('../package.json');
const program = require('commander');
const npmDeployGitTag = require('../');
const readPkg = require('read-pkg');

program
  .description(pkg.description)
  .version(pkg.version)
  .option('-a, --access <access>', 'deploy as [public] or [restricted]', optionProcessing(/^(public|restricted)$/i), 'restricted')
  .option('-t, --tag <tag>', 'npm distribution tag to point at the deployed package')
  .option('--token <token>', 'authentication token for publishing to the package registry')
  .parse(process.argv);

(async () => {
  try {
    const { name } = await readPkg();
    const scoped = isScoped(name);
    await npmDeployGitTag({ access: scoped ? program.access : 'public', tag: program.tag, token: program.token });
  } catch (error) {
    console.error(`npm-deploy-git-tag failed for the following reason - ${error}`);
    process.exit(1);
  }
})();

function optionProcessing (expression) {
  return (value, previous) => {
    const match = expression.exec(value);
    return match ? match[0] : previous;
  };
}
