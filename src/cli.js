#!/usr/bin/env node

'use strict';

const isScoped = require(`is-scoped`);
const pkg = require(`../package.json`);
const program = require(`commander`);
const npmDeployGitTag = require(`../`);
const readPkg = require(`read-pkg`);

program
  .description(pkg.description)
  .version(pkg.version)
  .option(`-a, --access <access>`, `deploy as [public] or [restricted]`, /^(public|restricted)$/i, `restricted`)
  .option(`-s, --skip-token`, `skip the authentication step`)
  .option(`-t, --tag`, `npm distribution tag to point at the deployed package`)
  .parse(process.argv);

(async () => {
  try {
    const { name } = await readPkg();
    const scoped = isScoped(name);
    await npmDeployGitTag({ access: scoped ? program.access : `public`, skipToken: program.skipToken, tag: program.tag });
  } catch (error) {
    console.error(`npm-deploy-git-tag failed for the following reason - ${error}`);
    process.exit(1);
  }
})();
