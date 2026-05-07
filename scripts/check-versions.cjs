#!/usr/bin/env node
const fs = require('fs');
const path = require('path');

const projectDir = path.resolve(__dirname, '..');
const packageJson = JSON.parse(fs.readFileSync(path.join(projectDir, 'package.json'), 'utf8'));
const manifestJson = JSON.parse(fs.readFileSync(path.join(projectDir, 'extension', 'manifest.json'), 'utf8'));

if (packageJson.version !== manifestJson.version) {
  process.stderr.write(
    `Version mismatch: package.json=${packageJson.version} extension/manifest.json=${manifestJson.version}\n`
  );
  process.exit(1);
}

process.stdout.write(`Version check OK: ${packageJson.version}\n`);
