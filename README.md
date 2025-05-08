# Vircadia World SDK TypeScript

## Overview
This package provides TypeScript bindings for Vircadia World SDK with support for both browser and Bun environments.

## Install

```bash
bun install @vircadia/world-sdk
```

## Usage

### Browser

```typescript
// Browser
import { 
    // Config
    clientBrowserConfiguration, 
    // Schema -> Communication
    Communication,
    // Vue SDK composable wrapping the core client
    Vue_useVircadia, 
    // Raw core client for any framework
    VircadiaClientCore 
} from '@vircadia/world-sdk/browser';
```

### Bun

```typescript
// Bun
import { 
    // Config
    serverConfiguration,
    // Schema -> Communication
    Communication,
    // Raw core client for Bun
    VircadiaClientCore 
} from '@vircadia/world-sdk/bun';
```

## Build
```bash
# Install dependencies
bun install

# Build for both browser and Bun
bun run build
```

## Publish

```bash
npm publish
```
