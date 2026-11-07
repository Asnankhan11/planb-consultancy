'use strict';
// Compatibility entry point: only synthetic temporary-storage tests, never the historical candidate database.
const {spawnSync}=require('node:child_process');
const result=spawnSync(process.execPath,['--test','tests/backend.test.js'],{cwd:require('node:path').resolve(__dirname,'..'),stdio:'inherit'});
process.exit(result.status ?? 1);
