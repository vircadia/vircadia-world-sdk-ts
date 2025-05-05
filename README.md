# Vircadia World SDK TypeScript

## Overview
This package provides TypeScript bindings for Vircadia World SDK with support for both browser and Bun environments.

## Usage

```bash
bun install @vircadia/world-sdk
```

```typescript
// Browser
import { VircadiaConfig_BROWSER_CLIENT, Vue_useVircadia } from '@vircadia/world-sdk/browser';

// Bun
import { VircadiaConfig_SERVER } from '@vircadia/world-sdk/bun';
``` 

## Build
```bash
# Install dependencies
bun install

# Build for both browser and Bun
bun run build
```
