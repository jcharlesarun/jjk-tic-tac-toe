const fs = require('node:fs');
const path = require('node:path');
const { spawnSync } = require('node:child_process');

const root = path.resolve(__dirname, '..');
fs.mkdirSync(path.join(root, 'coverage'), { recursive: true });
for (const file of ['lcov.info','index.html','summary.json']) fs.rmSync(path.join(root,'coverage',file), {force:true});
const args = [
  '--test', '--experimental-test-coverage',
  '--test-coverage-include=rules.js',
  '--test-coverage-include=game.js',
  '--test-coverage-include=characters.js',
  '--test-coverage-lines=95',
  '--test-coverage-functions=95',
  '--test-coverage-branches=90',
  '--test-reporter=spec', '--test-reporter-destination=stdout',
  '--test-reporter=lcov', '--test-reporter-destination=coverage/lcov.info',
  'tests/rules.test.cjs', 'game.test.cjs'
];
const result = spawnSync(process.execPath, args, { cwd: root, stdio: 'inherit' });
if (result.error) throw result.error;
const passed = require('./coverage-report.cjs').writeReport(root);
process.exitCode = result.status === 0 && passed ? 0 : 1;
