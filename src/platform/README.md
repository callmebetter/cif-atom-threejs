# Platform SDK

This directory contains the platform abstraction layer that allows the application to run on both Electron (desktop) and web platforms with a single codebase.

## Structure

- [types.ts](types.ts) - Defines the channel mappings and platform strategy interface
- [sdk.ts](sdk.ts) - Main entry point with safeInvoke function and convenience methods
- [strategy/](strategy/) - Platform-specific implementations:
  - [electron.ts](strategy/electron.ts) - Electron implementation using IPC
  - [web.ts](strategy/web.ts) - Web implementation using fetch API
  - [index.ts](strategy/index.ts) - Strategy selector

## Usage

Instead of directly calling `window.electronAPI`, use the platform SDK:

```typescript
// Old way (direct electronAPI usage)
const result = await window.electronAPI.readFile(filePath)

// New way (using platform SDK)
import { fileOperations } from '@/platform/sdk'
const result = await fileOperations.readFile(filePath)
```

## Adding New Channels

1. Add the channel definition to [types.ts](types.ts) in the `ChannelMap` type
2. Add a convenience method in [sdk.ts](sdk.ts) if needed
3. The implementation will automatically route to the correct platform strategy

## Benefits

- Zero platform-specific code in business logic
- Easy to add new platforms (just add a new strategy)
- Type-safe channel communication
- Automatic fallback to web implementation when electronAPI is not available
- Centralized error handling