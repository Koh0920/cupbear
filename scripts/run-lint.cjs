#!/usr/bin/env node
const path = require('node:path');
const fs = require('node:fs');
const { spawnSync } = require('node:child_process');

const pluginSource = path.resolve(__dirname, '..', 'eslint', 'plugins', '@typescript-eslint', 'eslint-plugin');
const pluginTargetRoot = path.resolve(__dirname, '..', 'node_modules', '@typescript-eslint');
const pluginTarget = path.join(pluginTargetRoot, 'eslint-plugin');

if (!fs.existsSync(pluginTarget)) {
  fs.mkdirSync(pluginTargetRoot, { recursive: true });
  copyDir(pluginSource, pluginTarget);
}

const nextBin = require.resolve('next/dist/bin/next');
const result = spawnSync(process.execPath, [nextBin, 'lint'], {
  stdio: 'inherit',
  env: process.env,
});

if (result.error) {
  throw result.error;
}
process.exit(result.status ?? 0);

function copyDir(src, dest) {
  fs.mkdirSync(dest, { recursive: true });
  for (const entry of fs.readdirSync(src, { withFileTypes: true })) {
    const srcPath = path.join(src, entry.name);
    const destPath = path.join(dest, entry.name);
    if (entry.isDirectory()) {
      copyDir(srcPath, destPath);
    } else if (entry.isFile()) {
      fs.copyFileSync(srcPath, destPath);
    }
  }
}
