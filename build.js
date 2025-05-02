#!/usr/bin/env bun

import { spawnSync } from 'node:child_process';
import fs from 'node:fs';

// Ensure dist directory exists
if (!fs.existsSync('./dist')) {
    fs.mkdirSync('./dist', { recursive: true });
}

// Clean previous build
if (fs.existsSync('./dist')) {
    fs.rmSync('./dist', { recursive: true, force: true });
}

// Build types
console.log('Building types...');
spawnSync('tsc', ['--build', 'tsconfig.json'], { stdio: 'inherit' });

// Run browser build
console.log('Building browser version...');
await import('./build.browser.js');

// Run bun build
console.log('Building bun version...');
await import('./build.bun.js');

console.log('Build completed successfully!');
