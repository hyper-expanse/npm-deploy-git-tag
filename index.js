'use strict';

const program = require(`commander`);

program
  .description(`something`)
  .option('-a, --access <access>', 'published as [public] or [restricted]', /^(public|restricted)$/i, 'restricted')
  .parse(process.argv)
;

console.log(`access`, program.access);
