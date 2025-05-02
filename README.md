# Vircadia World SDK TypeScript

## Overview
This package provides TypeScript bindings for Vircadia World SDK with support for both browser and Bun environments.

## Structure
- Browser-specific code is in files ending with `.browser.ts`
- Bun-specific code is in files ending with `.bun.ts`
- Common code is in regular `.ts` files

## Build
```bash
# Install dependencies
npm install

# Build for both browser and Bun
npm run build

# Development mode (watch for changes)
npm run dev
```

## Configuration
The package uses TypeScript project references to manage the browser and Bun builds:
- `tsconfig.json` - Base configuration shared by both builds
- `tsconfig.browser.json` - Browser-specific configuration
- `tsconfig.bun.json` - Bun-specific configuration

## Output
- Browser build: `./dist/browser/`
- Bun build: `./dist/bun/`
- Type definitions: `./dist/types/`

## Usage
```typescript
// Browser
import { createVircadiaClient } from '@vircadia/world-sdk-ts';

// Bun
import { createVircadiaServer } from '@vircadia/world-sdk-ts/bun';
``` 